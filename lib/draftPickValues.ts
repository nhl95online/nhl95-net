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

export interface TradedPickOwnership {
  currentOwnerAbbr: string;
  origAbbr: string;
  year: number;
  round: number;
  tradeId: any;
}

/**
 * Parses traded future draft picks from `league_trades` chronologically by `trade id`.
 * Key format: `${year}-${round}-${ORIG_TEAM_ABBR}` -> latest owner info.
 */
export function buildTradedPickOwnersMap(tradesRows: any[]): Map<string, TradedPickOwnership> {
  const map = new Map<string, TradedPickOwnership>();
  const sortedTrades = [...(tradesRows || [])].sort(
    (a, b) => (Number(a['trade id']) || 0) - (Number(b['trade id']) || 0)
  );

  const processSide = (senderAbbrRaw: any, receiverAbbrRaw: any, assetsStrRaw: any, tradeId: any) => {
    const sender = String(senderAbbrRaw || '').trim().toUpperCase();
    const receiver = String(receiverAbbrRaw || '').trim().toUpperCase();
    const assetsStr = String(assetsStrRaw || '');
    if (!sender || !receiver || !assetsStr || assetsStr === 'NULL') return;

    const items = assetsStr
      .split(/[,;\n]+/)
      .map(s => s.trim())
      .filter(Boolean);

    items.forEach(item => {
      const lower = item.toLowerCase();
      const isPick =
        lower.includes('rdpk') ||
        lower.includes('round') ||
        lower.includes('pick') ||
        /\b(19\d\d|20\d\d)\s+(1st|2nd|3rd|4th|5th)\b/i.test(item);
      if (!isPick) return;

      const yrMatch = item.match(/\b(19\d\d|20\d\d)\b/);
      if (!yrMatch) return;
      const yr = parseInt(yrMatch[1], 10);

      let rd = 0;
      if (lower.includes('1st')) rd = 1;
      else if (lower.includes('2nd')) rd = 2;
      else if (lower.includes('3rd')) rd = 3;
      else if (lower.includes('4th')) rd = 4;
      else if (lower.includes('5th')) rd = 5;
      if (!rd) return;

      let origAbbr = sender;
      const fromMatch = item.match(/from\s*([A-Za-z]{2,4})/i);
      if (fromMatch) {
        origAbbr = fromMatch[1].toUpperCase();
      } else {
        const ownKey = `${yr}-${rd}-${sender}`;
        const existingOwn = map.get(ownKey);
        if (existingOwn && existingOwn.currentOwnerAbbr !== sender) {
          for (const [, val] of map.entries()) {
            if (val.year === yr && val.round === rd && val.currentOwnerAbbr === sender) {
              origAbbr = val.origAbbr;
              break;
            }
          }
        }
      }

      map.set(`${yr}-${rd}-${origAbbr}`, {
        currentOwnerAbbr: receiver,
        origAbbr,
        year: yr,
        round: rd,
        tradeId
      });
    });
  };

  sortedTrades.forEach(t => {
    processSide(t.team, t.team_1, t.trade, t['trade id']);
    processSide(t.team_1, t.team, t.trade_1, t['trade id']);
  });

  return map;
}

/** Sorts team IDs by standings: best record first (highest PTS, W, GD, GF). */
export function sortTeamsBestFirst(teamIds: number[], standingByTeam: Map<number, any>): number[] {
  const num = (v: any) => Number(v) || 0;
  return [...teamIds].sort((a, b) => {
    const sa = standingByTeam.get(a);
    const sb = standingByTeam.get(b);
    return (
      (num(sb?.pts) - num(sa?.pts)) ||
      (num(sb?.w) - num(sa?.w)) ||
      (num(sb?.gd) - num(sa?.gd)) ||
      (num(sb?.gf) - num(sa?.gf)) ||
      (a - b)
    );
  });
}
