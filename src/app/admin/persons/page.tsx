import { prisma } from "@/lib/prisma";
import { signPersonPayload, CURRENT_SIGNATURE_VERSION } from "@/lib/signing";
import QrDownloadButton from "./QrDownloadButton";
import NewPersonForm from "./NewPersonForm";

export const dynamic = "force-dynamic"; // always fresh

function toBase64UrlJson(obj: any): string {
  const s = JSON.stringify(obj);
  // Convert to base64url
  const b64 = Buffer.from(s, "utf8").toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return b64;
}

export default async function AdminPersonsPage() {
  const secret = process.env.TOKEN_SECRET || "";
  const secretMissing = !secret;

  // Simple list of persons (first 200)
  const persons: Array<{ id: string; code: string; name: string; active: boolean }> = await prisma.$queryRawUnsafe(
    `SELECT id, code, name, active FROM Person ORDER BY createdAt ASC LIMIT 200`
  );

  const items = persons.map((p) => {
    let payloadEncoded: string | null = null;
    let fileName = `${p.code}-qr.png`;
    if (!secretMissing) {
      const ts = new Date().toISOString();
      const v = CURRENT_SIGNATURE_VERSION;
      const sig = signPersonPayload(secret, p.id, ts, v);
      const payload = { pid: p.id, ts, v, sig };
      payloadEncoded = toBase64UrlJson(payload);
    }
    return { person: p, payloadEncoded, fileName };
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Personas</h1>
      </div>

      {secretMissing && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-yellow-800">
          Falta configurar TOKEN_SECRET para firmar los QR. Podrás crear personas igualmente, pero no descargar QR hasta configurarlo.
        </div>
      )}

      <NewPersonForm />

      <div className="overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
  <div className="overflow-x-auto">
  <table className="min-w-[900px] w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs text-gray-600">
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ person, payloadEncoded, fileName }) => (
              <tr key={person.id} className="border-b last:border-0">
                <td className="px-3 py-2 font-mono text-gray-900">{person.code}</td>
                <td className="px-3 py-2 text-gray-800">{person.name}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${person.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                    {person.active ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {payloadEncoded ? (
                    <QrDownloadButton data={payloadEncoded} fileName={fileName} />
                  ) : (
                    <span className="text-xs text-gray-500">Configurar TOKEN_SECRET</span>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-gray-500">Sin personas</td>
              </tr>
            )}
          </tbody>
  </table>
  </div>
      </div>

      <p className="text-xs text-gray-500">Se generan códigos con el payload firmado en base64url (no contiene datos sensibles).</p>
    </div>
  );
}
