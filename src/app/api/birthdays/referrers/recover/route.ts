import { NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { getPublicBaseUrl } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { buildReferrerLink, normalizeReferrerDni, normalizeReferrerWhatsapp } from "@/lib/birthdays/referrers";

const RecoverReferrerSchema = z.object({
  dni: z.string().min(8).max(20),
  whatsapp: z.string().min(9).max(20),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RecoverReferrerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("INVALID_BODY", "Datos inválidos", parsed.error.flatten(), 400);
    }

    const dniNormalized = normalizeReferrerDni(parsed.data.dni);
    const whatsappNormalized = normalizeReferrerWhatsapp(parsed.data.whatsapp);

    if (!/^\d{8}$/.test(dniNormalized)) {
      return apiError("INVALID_DNI", "El DNI debe tener exactamente 8 dígitos.", undefined, 400);
    }

    if (!/^\d{9}$/.test(whatsappNormalized)) {
      return apiError("INVALID_WHATSAPP", "El WhatsApp debe tener exactamente 9 dígitos.", undefined, 400);
    }

    const referrer = await prisma.birthdayReferrer.findFirst({
      where: {
        dniNormalized,
        whatsappNormalized,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        active: true,
        approvalStatus: true,
      },
    });

    if (!referrer) {
      return apiError("NOT_FOUND", "No encontramos un referido con esos datos.", undefined, 404);
    }

    const systemConfig = await prisma.systemConfig.findUnique({ where: { id: 1 } }).catch(() => null);
    const commissionAmount = Number(systemConfig?.birthdayReferrerCommissionAmount ?? 10);
    const link = buildReferrerLink(getPublicBaseUrl(req.url), referrer.slug);

    return apiOk({
      referrer: {
        ...referrer,
        commissionAmount,
        link,
      },
    });
  } catch (error) {
    console.error("Error recovering birthday referrer:", error);
    return apiError("RECOVER_REFERRER_ERROR", "No se pudo recuperar el link del referido.", undefined, 500);
  }
}