/*
  Minimal smoke script:
  - Busca una persona activa en la DB
  - Genera payload firmado localmente
  - Ejecuta curl.exe para POST /api/scanner/scan
*/

import { prisma } from "@/lib/prisma";
import { CURRENT_SIGNATURE_VERSION, signPersonPayload } from "@/lib/signing";
import { spawnSync } from "node:child_process";

async function main() {
  const secret = process.env.TOKEN_SECRET || "";
  if (!secret) {
    console.error("TOKEN_SECRET no está definido. Configura la variable de entorno antes de correr el smoke test.");
    process.exit(2);
  }

  // Tomar la primera persona activa
  const rows: any[] = await prisma.$queryRawUnsafe(`SELECT id, code, name FROM Person WHERE active=1 ORDER BY createdAt ASC LIMIT 1`);
  const person = rows && rows[0];
  if (!person || !person.id) {
    console.error("No hay personas activas en la DB. Ejecuta el seed primero: npm run seed");
    process.exit(2);
  }

  const ts = new Date().toISOString();
  const v = CURRENT_SIGNATURE_VERSION;
  const sig = signPersonPayload(secret, person.id, ts, v);
  const body = {
    payload: { pid: person.id, ts, v, sig },
    type: "IN",
    deviceId: "fixture-device",
  };

  const json = JSON.stringify(body);
  const url = process.env.SMOKE_URL || "http://localhost:3000/api/scanner/scan";

  // Ejecutar curl.exe para evitar alias de PowerShell
  const args = [
    "-s",
    "-o",
    "-", // cuerpo a stdout
    "-w",
    "\nHTTP %{http_code}\n",
    "-H",
    "Content-Type: application/json",
    "-X",
    "POST",
    "--data",
    json,
    url,
  ];
  const res = spawnSync("curl.exe", args, { stdio: "inherit" });
  if (res.error) {
    console.error("Error ejecutando curl.exe:", res.error.message);
    console.error("Asegúrate de tener curl instalado y en PATH. En Windows 10+ suele venir por defecto.");
    process.exit(1);
  }
}

main().finally(() => prisma.$disconnect());
