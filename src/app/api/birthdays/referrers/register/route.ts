import { NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { getPublicBaseUrl } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import {
  buildReferrerLink,
  isLikelyValidReferrerName,
  nextTermsVersion,
  normalizePersonName,
  normalizeReferrerDni,
  normalizeReferrerWhatsapp,
  slugifyReferrerName,
} from "@/lib/birthdays/referrers";

const RegisterReferrerSchema = z.object({
  firstName: z.string().min(2).max(60),
  lastName: z.string().min(2).max(80),
  dni: z.string().min(8).max(20),
  whatsapp: z.string().min(9).max(20),
  termsAccepted: z.boolean(),
});

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function buildUniqueSlug(base: string, dni: string) {
  const fallback = `referidor-${dni.slice(-4)}`;
  const normalizedBase = base || fallback;
  const candidates = [normalizedBase, `${normalizedBase}-${dni.slice(-4)}`];

  for (const candidate of candidates) {
    const existing = await prisma.birthdayReferrer.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
  }

  let suffix = 1;
  while (suffix < 1000) {
    const candidate = `${normalizedBase}-${dni.slice(-4)}-${suffix}`;
    const existing = await prisma.birthdayReferrer.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    suffix += 1;
  }

  throw new Error("UNABLE_TO_GENERATE_SLUG");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterReferrerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("INVALID_BODY", "Datos inválidos", parsed.error.flatten(), 400);
    }

    if (!parsed.data.termsAccepted) {
      return apiError("TERMS_REQUIRED", "Debes aceptar el contrato para registrarte.", undefined, 400);
    }

    const firstName = normalizePersonName(parsed.data.firstName);
    const lastName = normalizePersonName(parsed.data.lastName);
    const dniNormalized = normalizeReferrerDni(parsed.data.dni);
    const whatsappNormalized = normalizeReferrerWhatsapp(parsed.data.whatsapp);

    if (!isLikelyValidReferrerName(firstName, lastName)) {
      return apiError("INVALID_NAME", "Ingresa nombres y apellidos válidos.", undefined, 400);
    }

    if (!/^\d{8}$/.test(dniNormalized)) {
      return apiError("INVALID_DNI", "El DNI debe tener exactamente 8 dígitos.", undefined, 400);
    }

    if (!/^\d{9}$/.test(whatsappNormalized)) {
      return apiError("INVALID_WHATSAPP", "El WhatsApp debe tener exactamente 9 dígitos.", undefined, 400);
    }

    const existingByDni = await prisma.birthdayReferrer.findUnique({
      where: { dniNormalized },
      select: { id: true, slug: true, approvalStatus: true, active: true },
    });

    if (existingByDni) {
      return apiError("DNI_EXISTS", "Ya existe un registro con ese DNI.", {
        approvalStatus: existingByDni.approvalStatus,
      }, 409);
    }

    const slug = await buildUniqueSlug(slugifyReferrerName(`${firstName} ${lastName}`), dniNormalized);
    const systemConfig = await prisma.systemConfig.findUnique({ where: { id: 1 } }).catch(() => null);
    const commissionAmount = Number(systemConfig?.birthdayReferrerCommissionAmount ?? 10);
    const fullName = `${firstName} ${lastName}`;
    const termsVersion = nextTermsVersion();

    const referrer = await prisma.birthdayReferrer.create({
      data: {
        name: fullName,
        firstName,
        lastName,
        slug,
        code: generateCode(),
        dni: dniNormalized,
        dniNormalized,
        phone: whatsappNormalized,
        whatsapp: whatsappNormalized,
        whatsappNormalized,
        commissionAmount,
        approvalStatus: "PENDING",
        active: false,
        termsAcceptedAt: new Date(),
        termsVersion,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        approvalStatus: true,
        active: true,
      },
    });

    const publicBaseUrl = getPublicBaseUrl(req.url);
    const link = buildReferrerLink(publicBaseUrl, referrer.slug);

    return apiOk(
      {
        referrer: {
          ...referrer,
          commissionAmount,
          termsVersion,
          link,
        },
      },
      201
    );
  } catch (error) {
    console.error("Error registering birthday referrer:", error);
    return apiError("REGISTER_REFERRER_ERROR", "No se pudo registrar el referido.", undefined, 500);
  }
}
