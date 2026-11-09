// Official WN95HL Draft Pick Value Chart (by overall pick number).
// Used by the Draft Capital tab and the Trade Machine.
// Picks beyond the end of the chart are worth the floor value.

export const DRAFT_PICK_VALUE_CHART: readonly number[] = [
  200, 190, 181, 173, 166, 159, 153, 147, 141, 136, // 1-10
  131, 127, 123, 119, 115, 112, 109, 106, 103, 100, // 11-20
  98, 96, 94, 92, 90, 88, 86, 84, 82, 80,           // 21-30
  92, 90, 88, 86, 84, 82, 80, 78, 76, 74,           // 31-40
  72, 70, 68, 66, 64, 62, 61, 60, 59, 58,           // 41-50
  57, 56, 55, 54, 53, 52, 51, 50, 50, 50            // 51-60
];

export const DRAFT_PICK_VALUE_FLOOR = 50;

// Estimated value when only the round is known (exact slot not yet set):
// uses a mid-round slot from the chart.
const ROUND_ESTIMATE_PICK: Record<number, number> = { 1: 15, 2: 45 };

/** Value of a pick by its overall pick number (1-based). */
export function getDraftPickValue(overallPick?: number | null): number {
  const n = Number(overallPick);
  if (!Number.isFinite(n) || n < 1) return DRAFT_PICK_VALUE_FLOOR;
  return DRAFT_PICK_VALUE_CHART[Math.floor(n) - 1] ?? DRAFT_PICK_VALUE_FLOOR;
}

/** Value of a pick when the overall number may be unknown; falls back to a mid-round estimate. */
export function getDraftPickValueOrEstimate(overallPick?: number | null, round?: number | null): number {
  const n = Number(overallPick);
  if (Number.isFinite(n) && n >= 1) return getDraftPickValue(n);
  const est = ROUND_ESTIMATE_PICK[Number(round)];
  return est ? getDraftPickValue(est) : DRAFT_PICK_VALUE_FLOOR;
}
