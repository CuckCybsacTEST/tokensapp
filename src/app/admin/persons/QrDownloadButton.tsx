"use client";

import QRCode from "qrcode";
import { useState } from "react";

export default function QrDownloadButton({ data, fileName }: { data: string; fileName: string }) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    try {
      setBusy(true);
      const url = await QRCode.toDataURL(data, { width: 512, margin: 1 });
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert(`No se pudo generar el QR: ${String((e as any)?.message || e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60 text-gray-900 dark:text-gray-100"
      title="Descargar QR (PNG)"
    >
      {busy ? "Generando…" : "Descargar QR"}
    </button>
  );
}
