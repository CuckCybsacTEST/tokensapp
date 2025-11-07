#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

async function main() {
  const id = process.argv[2];
  const maybeUrl = process.argv[3];
  if (!id) {
    console.error('Uso: tsx scripts/inspect-token.ts <tokenId> [DATABASE_URL]');
    process.exit(1);
  }
  if (maybeUrl && /postgresql:\/\//.test(maybeUrl)) {
    process.env.DATABASE_URL = maybeUrl;
  }
  const prisma = new PrismaClient();
  try {
    const token: any = await prisma.token.findUnique({
      where: { id },
      include: { prize: true, batch: true },
    });
    if (!token) {
      console.log(JSON.stringify({ error: 'NOT_FOUND', id }, null, 2));
      return;
    }
    function inferType(t: any): 'singleHour' | 'singleDay' | 'byDays' {
      // singleHour si tiene validFrom explícito
      if (t.validFrom) return 'singleHour';
      // Heurística singleDay: expiresAt cae dentro de ~1 día del functionalDate (20h..26h margen)
      if (t.batch?.functionalDate) {
        const exp = new Date(t.expiresAt);
        const fd = new Date(t.batch.functionalDate);
        const diff = exp.getTime() - fd.getTime();
        if (diff > 20 * 3600_000 && diff < 26 * 3600_000) return 'singleDay';
      }
      return 'byDays';
    }

    const tipoInferido = inferType(token);
    const now = Date.now();

    // Estado más granular teniendo en cuenta disabled
    let state: string;
    if (now > token.expiresAt.getTime()) state = 'EXPIRED';
    else if (token.redeemedAt) state = 'REDEEMED';
    else if (token.validFrom && now < new Date(token.validFrom).getTime()) state = 'PENDING_WINDOW';
    else if (token.disabled) state = 'DISABLED';
    else state = 'ACTIVE';

    // Diagnósticos: casos donde esperábamos singleHour pero salió byDays
    const diagnostics: Record<string, any> = {};
    if (!token.validFrom) {
      // ¿El batch parecía describir una ventana horaria?
      const desc: string = token.batch?.description || '';
      const hintWindow = /(hora|ventana|window|hour)/i.test(desc);
      if (hintWindow) diagnostics.possibleWindowBatch = true;
      // Diferencia entre expiresAt y createdAt (minutos)
      diagnostics.expiresMinutesFromCreate = Math.round((token.expiresAt.getTime() - token.createdAt.getTime()) / 60000);
      // Si disabled=true sin validFrom puede ser: future singleDay, future singleHour falló post-proceso, o disable manual.
      if (token.disabled) diagnostics.disabledWithoutValidFrom = true;
    }
    if (token.batch?.functionalDate) {
      const diffFuncMs = token.expiresAt.getTime() - new Date(token.batch.functionalDate).getTime();
      diagnostics.diffFunctionalHours = +(diffFuncMs / 3600000).toFixed(2);
    }

    // Si tipoInferido es byDays pero la expiración es < 12h quizá era singleHour fallido.
    const ttlMinutes = Math.round((token.expiresAt.getTime() - token.createdAt.getTime()) / 60000);
    if (tipoInferido === 'byDays' && ttlMinutes <= 720) {
      diagnostics.suspectSingleHour = true;
      diagnostics.ttlMinutes = ttlMinutes;
    }

    const result = {
      id: token.id,
      prize: token.prize ? { id: token.prize.id, label: token.prize.label } : null,
      batch: token.batch ? {
        id: token.batch.id,
        description: token.batch.description,
        functionalDate: token.batch.functionalDate,
        createdAt: token.batch.createdAt,
      } : null,
      validFrom: token.validFrom,
      expiresAt: token.expiresAt,
      disabled: token.disabled,
      redeemedAt: token.redeemedAt,
      createdAt: token.createdAt,
      tipo: tipoInferido,
      state,
      signatureVersion: (token as any).signatureVersion,
      diagnostics: Object.keys(diagnostics).length ? diagnostics : undefined,
    };
    console.log(JSON.stringify(result, null, 2));
  } catch (e: any) {
    console.error('ERROR', e?.message || e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
