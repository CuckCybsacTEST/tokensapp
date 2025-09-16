/*
  Genera dos imágenes QR globales para pósters:
    - public/posters/in.png  -> {"kind":"GLOBAL","mode":"IN","v":1}
    - public/posters/out.png -> {"kind":"GLOBAL","mode":"OUT","v":1}
*/

import fs from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function generateOne(mode: 'IN' | 'OUT', filePath: string) {
  const payload = { kind: 'GLOBAL' as const, mode, v: 1 };
  const text = JSON.stringify(payload);
  const opts = {
    type: 'png' as const,
    errorCorrectionLevel: 'M' as const,
    width: 1024,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  };
  await QRCode.toFile(filePath, text, opts as any);
}

async function main() {
  const postersDir = path.resolve(process.cwd(), 'public', 'posters');
  await ensureDir(postersDir);
  const inPath = path.join(postersDir, 'in.png');
  const outPath = path.join(postersDir, 'out.png');

  await generateOne('IN', inPath);
  await generateOne('OUT', outPath);

  // eslint-disable-next-line no-console
  console.log('Posters generados:', { in: inPath, out: outPath });
}

main().catch((err) => {
  console.error('Error generando posters:', err);
  process.exit(1);
});
