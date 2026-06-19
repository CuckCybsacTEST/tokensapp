import {
  Mundial2026ClaimStatus,
  Mundial2026MatchResult,
  Mundial2026MatchStatus,
  Mundial2026PredictionStatus,
  Mundial2026RedemptionAction,
  Mundial2026RedemptionResult,
  Prisma,
} from "@prisma/client";

import { verifyMundial2026PredictionSignature } from "@/lib/mundial2026/signing";
import { MUNDIAL2026_CLAIM_WINDOW_HOURS } from "@/lib/mundial2026/time";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

type ParsedScanInput = {
  raw: string;
  qrCode: string;
  predictionId?: string;
  signature?: string;
  version?: number;
  hasStructuredPayload: boolean;
};

type RedemptionSnapshot = {
  predictionId: string;
  qrCode: string;
  status: Mundial2026PredictionStatus;
  claimStatus: Mundial2026ClaimStatus;
  availableAt: Date | null;
  claimExpiresAt: Date | null;
  redeemedAt: Date | null;
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    startsAt: Date;
    result: Mundial2026MatchResult | null;
  };
  participant: {
    id: string;
    name: string;
    whatsappNormalized: string;
  };
  assignedPrize: null | {
    id: string;
    label: string;
    description: string | null;
    color: string | null;
  };
  integrity: {
    hasStructuredPayload: boolean;
    signatureChecked: boolean;
    valid: boolean;
  };
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function parseMundial2026ScanInput(scanInput: string): ParsedScanInput {
  const raw = scanInput.trim();
  if (!raw) {
    throw new Error("Debes ingresar un QR o el payload del QR.");
  }

  try {
    const url = new URL(raw, "http://localhost:3000");
    const match = url.pathname.match(/\/mundial2026\/jugada\/([^/?#]+)/i);
    if (match?.[1]) {
      const versionRaw = url.searchParams.get("v");
      const version = versionRaw ? Number(versionRaw) : undefined;
      return {
        raw,
        qrCode: decodeURIComponent(match[1]).trim(),
        predictionId: url.searchParams.get("pid")?.trim() || undefined,
        signature: url.searchParams.get("sig")?.trim() || undefined,
        version: Number.isFinite(version) ? version : undefined,
        hasStructuredPayload: !!(url.searchParams.get("pid") && url.searchParams.get("sig")),
      };
    }
  } catch {
    // Not a URL, continue parsing.
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isPlainObject(parsed) && parsed.type === "mundial2026_prediction" && typeof parsed.qrCode === "string") {
      return {
        raw,
        qrCode: parsed.qrCode.trim(),
        predictionId: typeof parsed.predictionId === "string" ? parsed.predictionId : undefined,
        signature: typeof parsed.signature === "string" ? parsed.signature : undefined,
        version: typeof parsed.v === "number" ? parsed.v : undefined,
        hasStructuredPayload: true,
      };
    }
  } catch {
    // Fallback to plain QR code.
  }

  return {
    raw,
    qrCode: raw,
    hasStructuredPayload: false,
  };
}

function getPredictionInclude() {
  return {
    match: {
      select: {
        id: true,
        homeTeam: true,
        awayTeam: true,
        startsAt: true,
        result: true,
      },
    },
    participant: {
      select: {
        id: true,
        name: true,
        whatsappNormalized: true,
      },
    },
    assignedPrize: {
      select: {
        id: true,
        label: true,
        description: true,
        color: true,
      },
    },
  } satisfies Prisma.Mundial2026PredictionInclude;
}

function buildIntegrity(parsed: ParsedScanInput, prediction: { id: string; qrCode: string }): RedemptionSnapshot["integrity"] {
  if (!parsed.hasStructuredPayload) {
    return {
      hasStructuredPayload: false,
      signatureChecked: false,
      valid: true,
    };
  }

  const valid =
    !!parsed.predictionId &&
    !!parsed.signature &&
    parsed.predictionId === prediction.id &&
    verifyMundial2026PredictionSignature(prediction.id, prediction.qrCode, parsed.signature, parsed.version);

  return {
    hasStructuredPayload: true,
    signatureChecked: true,
    valid,
  };
}

function serializeSnapshot(
  prediction: Prisma.Mundial2026PredictionGetPayload<{ include: ReturnType<typeof getPredictionInclude> }>,
  integrity: RedemptionSnapshot["integrity"]
): RedemptionSnapshot {
  return {
    predictionId: prediction.id,
    qrCode: prediction.qrCode,
    status: prediction.status,
    claimStatus: prediction.claimStatus,
    availableAt: prediction.availableAt,
    claimExpiresAt: prediction.claimExpiresAt,
    redeemedAt: prediction.redeemedAt,
    match: prediction.match,
    participant: prediction.participant,
    assignedPrize: prediction.assignedPrize,
    integrity,
  };
}

export async function getMundial2026RedemptionSnapshot(scanInput: string): Promise<RedemptionSnapshot> {
  const parsed = parseMundial2026ScanInput(scanInput);
  const prediction = await prisma.mundial2026Prediction.findUnique({
    where: { qrCode: parsed.qrCode },
    include: getPredictionInclude(),
  });

  if (!prediction) {
    throw new Error("No se encontró una jugada para ese QR.");
  }

  const integrity = buildIntegrity(parsed, prediction);
  return serializeSnapshot(prediction, integrity);
}

async function createRedemptionLog(
  tx: DbClient,
  args: {
    predictionId: string;
    action: Mundial2026RedemptionAction;
    result: Mundial2026RedemptionResult;
    byUserId?: string;
    device?: string;
    location?: string;
    notes?: string;
  }
) {
  await tx.mundial2026RedemptionLog.create({
    data: {
      predictionId: args.predictionId,
      action: args.action,
      result: args.result,
      byUserId: args.byUserId,
      device: args.device,
      location: args.location,
      notes: args.notes,
    },
  });
}

async function expirePredictionIfNeeded(tx: DbClient, predictionId: string) {
  const updated = await tx.mundial2026Prediction.update({
    where: { id: predictionId },
    data: {
      status: Mundial2026PredictionStatus.EXPIRED,
      claimStatus: Mundial2026ClaimStatus.EXPIRED,
    },
    include: getPredictionInclude(),
  });

  if (updated.assignedPrizeId) {
    await tx.mundial2026Prize.update({
      where: { id: updated.assignedPrizeId },
      data: { stockReserved: { decrement: 1 } },
    });
  }

  return updated;
}

export async function redeemMundial2026Prediction(args: {
  scanInput: string;
  userId: string;
  device?: string;
  location?: string;
  notes?: string;
}) {
  const parsed = parseMundial2026ScanInput(args.scanInput);

  return prisma.$transaction(async (tx) => {
    const prediction = await tx.mundial2026Prediction.findUnique({
      where: { qrCode: parsed.qrCode },
      include: getPredictionInclude(),
    });

    if (!prediction) {
      throw new Error("No se encontró una jugada para ese QR.");
    }

    const integrity = buildIntegrity(parsed, prediction);
    if (!integrity.valid) {
      await createRedemptionLog(tx, {
        predictionId: prediction.id,
        action: Mundial2026RedemptionAction.REDEEM,
        result: Mundial2026RedemptionResult.INVALID,
        byUserId: args.userId,
        device: args.device,
        location: args.location,
        notes: args.notes,
      });
      throw new Error("El payload del QR no coincide con la jugada registrada.");
    }

    const now = new Date();

    if (prediction.claimStatus === Mundial2026ClaimStatus.REDEEMED || prediction.redeemedAt) {
      await createRedemptionLog(tx, {
        predictionId: prediction.id,
        action: Mundial2026RedemptionAction.REDEEM,
        result: Mundial2026RedemptionResult.ALREADY_REDEEMED,
        byUserId: args.userId,
        device: args.device,
        location: args.location,
        notes: args.notes,
      });
      throw new Error("Esta jugada ya fue canjeada.");
    }

    if (prediction.claimExpiresAt && prediction.claimExpiresAt.getTime() <= now.getTime()) {
      const expired = await expirePredictionIfNeeded(tx, prediction.id);
      await createRedemptionLog(tx, {
        predictionId: prediction.id,
        action: Mundial2026RedemptionAction.REDEEM,
        result: Mundial2026RedemptionResult.EXPIRED,
        byUserId: args.userId,
        device: args.device,
        location: args.location,
        notes: args.notes,
      });
      return {
        redeemed: false,
        snapshot: serializeSnapshot(expired, integrity),
      };
    }

    if (prediction.status !== Mundial2026PredictionStatus.WON || prediction.claimStatus !== Mundial2026ClaimStatus.AVAILABLE || !prediction.assignedPrizeId) {
      await createRedemptionLog(tx, {
        predictionId: prediction.id,
        action: Mundial2026RedemptionAction.REDEEM,
        result:
          prediction.status === Mundial2026PredictionStatus.WON
            ? Mundial2026RedemptionResult.BLOCKED
            : Mundial2026RedemptionResult.NOT_WINNER,
        byUserId: args.userId,
        device: args.device,
        location: args.location,
        notes: args.notes,
      });
      throw new Error("La jugada aún no está disponible para canje.");
    }

    const updated = await tx.mundial2026Prediction.update({
      where: { id: prediction.id },
      data: {
        claimStatus: Mundial2026ClaimStatus.REDEEMED,
        redeemedAt: now,
        redeemedByUserId: args.userId,
      },
      include: getPredictionInclude(),
    });

    await tx.mundial2026Prize.update({
      where: { id: prediction.assignedPrizeId },
      data: {
        stockReserved: { decrement: 1 },
        stockClaimed: { increment: 1 },
      },
    });

    await createRedemptionLog(tx, {
      predictionId: prediction.id,
      action: Mundial2026RedemptionAction.REDEEM,
      result: Mundial2026RedemptionResult.OK,
      byUserId: args.userId,
      device: args.device,
      location: args.location,
      notes: args.notes,
    });

    return {
      redeemed: true,
      snapshot: serializeSnapshot(updated, integrity),
    };
  });
}

export async function validateMundial2026Prediction(args: {
  scanInput: string;
  userId?: string;
  device?: string;
  location?: string;
  notes?: string;
}) {
  const parsed = parseMundial2026ScanInput(args.scanInput);

  return prisma.$transaction(async (tx) => {
    const prediction = await tx.mundial2026Prediction.findUnique({
      where: { qrCode: parsed.qrCode },
      include: getPredictionInclude(),
    });

    if (!prediction) {
      throw new Error("No se encontró una jugada para ese QR.");
    }

    const integrity = buildIntegrity(parsed, prediction);
    const now = new Date();
    let current = prediction;
    let result: Mundial2026RedemptionResult = Mundial2026RedemptionResult.OK;

    if (!integrity.valid) {
      result = Mundial2026RedemptionResult.INVALID;
    } else if (prediction.claimStatus === Mundial2026ClaimStatus.REDEEMED || prediction.redeemedAt) {
      result = Mundial2026RedemptionResult.ALREADY_REDEEMED;
    } else if (prediction.claimExpiresAt && prediction.claimExpiresAt.getTime() <= now.getTime()) {
      current = await expirePredictionIfNeeded(tx, prediction.id);
      result = Mundial2026RedemptionResult.EXPIRED;
    } else if (prediction.status !== Mundial2026PredictionStatus.WON || !prediction.assignedPrizeId) {
      result = Mundial2026RedemptionResult.NOT_WINNER;
    } else if (prediction.claimStatus !== Mundial2026ClaimStatus.AVAILABLE) {
      result = Mundial2026RedemptionResult.BLOCKED;
    }

    await createRedemptionLog(tx, {
      predictionId: prediction.id,
      action: Mundial2026RedemptionAction.VALIDATE,
      result,
      byUserId: args.userId,
      device: args.device,
      location: args.location,
      notes: args.notes,
    });

    return {
      valid: result === Mundial2026RedemptionResult.OK,
      result,
      snapshot: serializeSnapshot(current, integrity),
    };
  });
}

export async function settleMundial2026Match(args: {
  matchId: string;
  result: Mundial2026MatchResult;
}) {
  return prisma.$transaction(async (tx) => {
    const match = await tx.mundial2026Match.findUnique({
      where: { id: args.matchId },
      include: {
        matchPrizes: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: {
            prize: true,
          },
        },
        predictions: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!match) {
      throw new Error("Partido no encontrado.");
    }

    if (match.status === Mundial2026MatchStatus.SETTLED) {
      throw new Error("Este partido ya fue liquidado.");
    }

    const now = new Date();
    const winners = args.result === Mundial2026MatchResult.VOID
      ? []
      : match.predictions.filter((prediction) => prediction.pick === args.result);
    const losers = args.result === Mundial2026MatchResult.VOID
      ? []
      : match.predictions.filter((prediction) => prediction.pick !== args.result);

    const assignmentCapacity = match.matchPrizes.flatMap((matchPrize) => {
      const stockTotal = matchPrize.prize.stockTotal ?? 0;
      const availableStock = Math.max(0, stockTotal - matchPrize.prize.stockReserved - matchPrize.prize.stockClaimed);
      const allowedByRule = Math.max(0, Math.min(matchPrize.maxWinners ?? 1, availableStock));
      return Array.from({ length: allowedByRule }, () => matchPrize);
    });

    const assignmentMap = new Map<string, { prizeId: string; claimExpiresAt: Date | null }>();
    winners.forEach((prediction, index) => {
      const slot = assignmentCapacity[index];
      if (!slot) return;
      const claimExpiresAt = new Date(now.getTime() + MUNDIAL2026_CLAIM_WINDOW_HOURS * 60 * 60 * 1000);
      assignmentMap.set(prediction.id, {
        prizeId: slot.prizeId,
        claimExpiresAt,
      });
    });

    await tx.mundial2026Match.update({
      where: { id: match.id },
      data: {
        result: args.result,
        status: Mundial2026MatchStatus.SETTLED,
        settledAt: now,
      },
    });

    await Promise.all(
      match.predictions.map((prediction) => {
        if (args.result === Mundial2026MatchResult.VOID) {
          return tx.mundial2026Prediction.update({
            where: { id: prediction.id },
            data: {
              status: Mundial2026PredictionStatus.VOID,
              claimStatus: Mundial2026ClaimStatus.REJECTED,
              assignedPrizeId: null,
              availableAt: null,
              claimExpiresAt: null,
            },
          });
        }

        const assigned = assignmentMap.get(prediction.id);
        if (assigned) {
          return tx.mundial2026Prediction.update({
            where: { id: prediction.id },
            data: {
              status: Mundial2026PredictionStatus.WON,
              claimStatus: Mundial2026ClaimStatus.AVAILABLE,
              assignedPrizeId: assigned.prizeId,
              availableAt: now,
              claimExpiresAt: assigned.claimExpiresAt,
            },
          });
        }

        if (winners.some((item) => item.id === prediction.id)) {
          return tx.mundial2026Prediction.update({
            where: { id: prediction.id },
            data: {
              status: Mundial2026PredictionStatus.WON,
              claimStatus: Mundial2026ClaimStatus.REJECTED,
              assignedPrizeId: null,
              availableAt: null,
              claimExpiresAt: null,
            },
          });
        }

        return tx.mundial2026Prediction.update({
          where: { id: prediction.id },
          data: {
            status: Mundial2026PredictionStatus.LOST,
            claimStatus: Mundial2026ClaimStatus.REJECTED,
            assignedPrizeId: null,
            availableAt: null,
            claimExpiresAt: null,
          },
        });
      })
    );

    const increments = new Map<string, number>();
    assignmentMap.forEach((value) => {
      increments.set(value.prizeId, (increments.get(value.prizeId) || 0) + 1);
    });

    await Promise.all(
      Array.from(increments.entries()).map(([prizeId, count]) =>
        tx.mundial2026Prize.update({
          where: { id: prizeId },
          data: {
            stockReserved: { increment: count },
          },
        })
      )
    );

    return {
      matchId: match.id,
      result: args.result,
      winners: winners.length,
      losers: losers.length,
      assigned: assignmentMap.size,
      rejectedWinners: Math.max(0, winners.length - assignmentMap.size),
      totalPredictions: match.predictions.length,
    };
  });
}

export async function reassignMundial2026MatchPrizes(args: {
  matchId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const match = await tx.mundial2026Match.findUnique({
      where: { id: args.matchId },
      include: {
        matchPrizes: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: {
            prize: true,
          },
        },
        predictions: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!match) {
      throw new Error("Partido no encontrado.");
    }

    if (match.status !== Mundial2026MatchStatus.SETTLED) {
      throw new Error("Solo se pueden reasignar premios en partidos liquidados.");
    }

    if (!match.result || match.result === Mundial2026MatchResult.VOID) {
      return {
        matchId: match.id,
        winners: 0,
        reassigned: 0,
        remainingRejectedWinners: 0,
        totalPredictions: match.predictions.length,
      };
    }

    const winners = match.predictions.filter((prediction) => prediction.pick === match.result && prediction.status === Mundial2026PredictionStatus.WON);
    const rejectedWinners = winners.filter((prediction) => prediction.claimStatus === Mundial2026ClaimStatus.REJECTED && !prediction.assignedPrizeId);

    const extraCapacity = match.matchPrizes.flatMap((matchPrize) => {
      const maxByRule = matchPrize.maxWinners ?? 1;
      const alreadyAssigned = match.predictions.filter((prediction) => prediction.assignedPrizeId === matchPrize.prizeId).length;
      const remainingByRule = Math.max(0, maxByRule - alreadyAssigned);
      const stockTotal = matchPrize.prize.stockTotal ?? 0;
      const availableStock = Math.max(0, stockTotal - matchPrize.prize.stockReserved - matchPrize.prize.stockClaimed);
      const assignable = Math.max(0, Math.min(remainingByRule, availableStock));
      return Array.from({ length: assignable }, () => matchPrize);
    });

    if (rejectedWinners.length === 0 || extraCapacity.length === 0) {
      return {
        matchId: match.id,
        winners: winners.length,
        reassigned: 0,
        remainingRejectedWinners: rejectedWinners.length,
        totalPredictions: match.predictions.length,
      };
    }

    const now = new Date();
    const reassignmentMap = new Map<string, { prizeId: string; claimExpiresAt: Date | null }>();
    rejectedWinners.forEach((prediction, index) => {
      const slot = extraCapacity[index];
      if (!slot) return;
      const claimExpiresAt = new Date(now.getTime() + MUNDIAL2026_CLAIM_WINDOW_HOURS * 60 * 60 * 1000);
      reassignmentMap.set(prediction.id, {
        prizeId: slot.prizeId,
        claimExpiresAt,
      });
    });

    await Promise.all(
      Array.from(reassignmentMap.entries()).map(([predictionId, assigned]) =>
        tx.mundial2026Prediction.update({
          where: { id: predictionId },
          data: {
            status: Mundial2026PredictionStatus.WON,
            claimStatus: Mundial2026ClaimStatus.AVAILABLE,
            assignedPrizeId: assigned.prizeId,
            availableAt: now,
            claimExpiresAt: assigned.claimExpiresAt,
          },
        })
      )
    );

    const increments = new Map<string, number>();
    reassignmentMap.forEach((value) => {
      increments.set(value.prizeId, (increments.get(value.prizeId) || 0) + 1);
    });

    await Promise.all(
      Array.from(increments.entries()).map(([prizeId, count]) =>
        tx.mundial2026Prize.update({
          where: { id: prizeId },
          data: {
            stockReserved: { increment: count },
          },
        })
      )
    );

    return {
      matchId: match.id,
      winners: winners.length,
      reassigned: reassignmentMap.size,
      remainingRejectedWinners: Math.max(0, rejectedWinners.length - reassignmentMap.size),
      totalPredictions: match.predictions.length,
    };
  });
}
