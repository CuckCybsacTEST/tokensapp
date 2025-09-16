/**
 * Selects an element id from a weighted list.
 * Implementation: prefix-sum traversal using a single random integer in [0,total-1].
 *
 * Constraints / Validation:
 * - elements must be a non-empty array
 * - each weight must be a finite number > 0
 * - total weight must be > 0
 *
 * Complexity: O(n) time, O(1) extra space.
 * Suitable for small lists (<= a few hundreds). For very large lists consider
 * building a cumulative array and doing binary search.
 */
export interface WeightedItem {
  id: string;
  weight: number; // expected positive integer (we tolerate positive float but treat as number)
}

export function pickWeighted(elements: WeightedItem[]): string {
  if (!Array.isArray(elements) || elements.length === 0) {
    throw new Error("WEIGHTED_EMPTY");
  }
  let total = 0;
  for (const e of elements) {
    if (!e || typeof e.id !== "string") throw new Error("WEIGHTED_BAD_ID");
    if (typeof e.weight !== "number" || !isFinite(e.weight) || e.weight <= 0) {
      throw new Error("WEIGHTED_BAD_WEIGHT");
    }
    total += e.weight;
  }
  if (total <= 0) throw new Error("WEIGHTED_TOTAL_INVALID");
  // random integer in [0, total-1]
  const r = Math.floor(Math.random() * total);
  let acc = 0;
  for (const e of elements) {
    acc += e.weight;
    if (r < acc) return e.id;
  }
  // Should never happen, but guard against floating point drift
  return elements[elements.length - 1].id;
}

// Small helper for deterministic testing (injectable RNG) if needed later.
export function pickWeightedWithRng(elements: WeightedItem[], rng: () => number): string {
  if (!Array.isArray(elements) || elements.length === 0) {
    throw new Error("WEIGHTED_EMPTY");
  }
  let total = 0;
  for (const e of elements) {
    if (!e || typeof e.id !== "string") throw new Error("WEIGHTED_BAD_ID");
    if (typeof e.weight !== "number" || !isFinite(e.weight) || e.weight <= 0) {
      throw new Error("WEIGHTED_BAD_WEIGHT");
    }
    total += e.weight;
  }
  if (total <= 0) throw new Error("WEIGHTED_TOTAL_INVALID");
  const rFloat = rng();
  if (typeof rFloat !== "number" || rFloat < 0 || rFloat >= 1 || !isFinite(rFloat)) {
    throw new Error("WEIGHTED_BAD_RNG");
  }
  const r = Math.floor(rFloat * total);
  let acc = 0;
  for (const e of elements) {
    acc += e.weight;
    if (r < acc) return e.id;
  }
  return elements[elements.length - 1].id;
}
