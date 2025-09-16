import JSZip from "jszip";

export interface ParsedZipBatch {
  manifest: any;
  csvLines: string[];
  zip: JSZip;
}

export async function parseBatchZip(buffer: ArrayBuffer): Promise<ParsedZipBatch> {
  const zip = await JSZip.loadAsync(buffer);
  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) throw new Error("manifest.json missing");
  const manifest = JSON.parse(await manifestFile.async("string"));
  const csvFile = zip.file("tokens.csv");
  if (!csvFile) throw new Error("tokens.csv missing");
  const csv = await csvFile.async("string");
  const csvLines = csv.trim().split(/\r?\n/);
  return { manifest, csvLines, zip };
}
