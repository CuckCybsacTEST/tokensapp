// Shared batch-related TypeScript interfaces
// Keeping this minimal to avoid circular deps; extend cautiously.
export interface PrizeRequest {
  prizeId: string;
  count: number;
  /** Optional per-prize expiration; falls back to global expirationDays if omitted */
  expirationDays?: number;
}

// Snapshot de emisión usado para manifest/meta y logs cuando se consume stock.
export interface PrizeEmissionSnapshot {
  prizeId: string;
  emitted: number; // cantidad de tokens emitidos (stock consumido)
}

// Meta incluida en manifest.json para lotes auto y estáticos
export interface BatchManifestMeta {
  mode: "auto" | "static";
  expirationDays: number | null;
  aggregatedPrizeCount: number;
  totalTokens: number;
  qrMode: "lazy" | "eager" | "none";
  // prizeEmittedTotals se devuelve fuera (en generateBatchCore) pero algunas capas pueden fusionarlo si desean persistirlo en manifest
}
