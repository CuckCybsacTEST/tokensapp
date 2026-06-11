import { createHmac, randomBytes } from "crypto";

import { getPublicBaseUrl } from "@/lib/config";

export const CURRENT_MUNDIAL2026_SIGNATURE_VERSION = 1;

function getMundial2026Secret(): string {
  const explicit = process.env.MUNDIAL2026_QR_SECRET?.trim();
  if (explicit) return explicit;

  const fallback = process.env.TOKEN_SECRET?.trim();
  if (fallback) return fallback;

  if (process.env.NODE_ENV === "development") {
    return "mundial2026_dev_secret";
  }

  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILD_PHASE === "1" ||
    process.env.BUILDING === "1"
  ) {
    return "mundial2026_build_secret";
  }

  throw new Error("Missing MUNDIAL2026_QR_SECRET or TOKEN_SECRET");
}

function buildPredictionMessage(version: number, predictionId: string, qrCode: string): string {
  return `${version}|${predictionId}|${qrCode}`;
}

export function generateMundial2026QrCode(): string {
  return `M26_${randomBytes(8).toString("hex").toUpperCase()}`;
}

export function signMundial2026Prediction(
  predictionId: string,
  qrCode: string,
  version: number = CURRENT_MUNDIAL2026_SIGNATURE_VERSION
): string {
  const secret = getMundial2026Secret();
  const message = buildPredictionMessage(version, predictionId, qrCode);
  return createHmac("sha256", secret).update(message).digest("base64url");
}

export function verifyMundial2026PredictionSignature(
  predictionId: string,
  qrCode: string,
  signature: string,
  version: number = CURRENT_MUNDIAL2026_SIGNATURE_VERSION
): boolean {
  const expected = signMundial2026Prediction(predictionId, qrCode, version);
  return expected === signature;
}

export function buildMundial2026PredictionQrPayload(args: {
  predictionId: string;
  qrCode: string;
  signature: string;
  signatureVersion?: number;
  urlOrReq?: string | URL;
}): string {
  const baseUrl = getPublicBaseUrl(args.urlOrReq);
  const url = new URL(`/mundial2026/jugada/${encodeURIComponent(args.qrCode)}`, baseUrl);
  url.searchParams.set("pid", args.predictionId);
  url.searchParams.set("sig", args.signature);
  url.searchParams.set("v", String(args.signatureVersion ?? CURRENT_MUNDIAL2026_SIGNATURE_VERSION));
  return url.toString();
}