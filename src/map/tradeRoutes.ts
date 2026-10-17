// Phase 9.5 stage 2: trade lanes as geometry. Pure view model: reads trade deals, supply contracts and diplomatic relations,
// never changes them. Bulk goods sail the sea lanes (seaLanes.ts); high-value goods, and trade between countries without a
// listed port, fly as air corridors. A route between countries under sanctions is drawn dashed red with an interception marker.
import type { CountryState, TradeDeal } from '../domain/game';
import type { IndustrialContract } from '../domain/industrial';
import { greatCircleArc } from './flightPath';
import { hash01, projectLines, linesToPath, type LonLat } from './frontlines';
import { seaRoute } from './seaLanes';
import { smoothRiver } from './riverData';

export type RouteMode = 'sea' | 'air';
export interface TradeRoute {
  id: string; mode: RouteMode; from: string; to: string; mine: boolean; sanctioned: boolean;
  /** Screen polylines (visible runs). */
  runs: [number, number][][];
  /** Cumulative length at the start of each run, and the total, in pixels. */
  starts: number[]; total: number;
  path: string;
  /** Where the interception marker sits (route midpoint) when sanctioned. */
  marker: [number, number] | null;
  /** How many vessels or aircraft travel the lane. */
  carriers: number;
  /** Stable 0..1 phase offset so lanes do not pulse in step. */
  phase: number;
}

export const AIR_GOODS = new Set(['uranium', 'gold', 'silver', 'silicon', 'rare_earths', 'electronics', 'engines']);
export interface TradeInput {
  tradeDeals: Record<string, TradeDeal>; contracts: Record<string, IndustrialContract>; countries: Record<string, CountryState>;
  playerCountryId: string;
  anchors: Record<string, LonLat>;
  project: (p: LonLat) => [number, number] | null;
  /** Pixel step that counts as a wrap-around on a flat map. */
  jump?: number;
  maxRoutes?: number; maxSanctionOnly?: number;
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** True when either government has sanctions recorded against the other. */
export function sanctioned(countries: Record<string, CountryState>, a: string, b: string): boolean {
  return Boolean(countries[a]?.diplomacy?.relations?.[b]?.sanctions || countries[b]?.diplomacy?.relations?.[a]?.sanctions);
}

/** The unordered country pairs with an active deal, split by what travels between them. */
export function tradePairs(deals: Record<string, TradeDeal>, contracts: Record<string, IndustrialContract>) {
  const pairs = new Map<string, { from: string; to: string; bulk: boolean; precious: boolean }>();
  const note = (seller: string, buyer: string, good: string) => {
    if (seller === buyer) return;
    const key = pairKey(seller, buyer), entry = pairs.get(key) ?? { from: seller, to: buyer, bulk: false, precious: false };
    if (AIR_GOODS.has(good)) entry.precious = true; else entry.bulk = true;
    pairs.set(key, entry);
  };
  for (const d of Object.values(deals)) if (d.active) note(d.sellerId, d.buyerId, d.resource);
  for (const c of Object.values(contracts)) if (c.active) note(c.sellerId, c.buyerId, c.good);
  return pairs;
}

const lift = (points: LonLat[], amount: number): LonLat[] => {
  // Bow the arc sideways in lon/lat so it reads as a curved corridor rather than a chord.
  if (points.length < 3) return points;
  const a = points[0], b = points[points.length - 1], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  return points.map((p, i) => { const t = i / (points.length - 1), k = Math.sin(Math.PI * t) * amount * len; return [p[0] + nx * k, p[1] + ny * k] as LonLat; });
};

function measure(runs: [number, number][][]) {
  const starts: number[] = [];
  let total = 0;
  for (const run of runs) { starts.push(total); for (let i = 0; i < run.length - 1; i++) total += Math.hypot(run[i + 1][0] - run[i][0], run[i + 1][1] - run[i][1]); }
  return { starts, total };
}
/** Point and heading (degrees, 0 = right) at distance `d` along the visible runs. */
export function pointAt(route: Pick<TradeRoute, 'runs' | 'starts' | 'total'>, d: number): { x: number; y: number; heading: number } | null {
  if (route.total <= 0) return null;
  let at = ((d % route.total) + route.total) % route.total;
  for (let r = 0; r < route.runs.length; r++) {
    const run = route.runs[r];
    for (let i = 0; i < run.length - 1; i++) {
      const len = Math.hypot(run[i + 1][0] - run[i][0], run[i + 1][1] - run[i][1]);
      if (at <= len) { const t = len ? at / len : 0; return { x: run[i][0] + (run[i + 1][0] - run[i][0]) * t, y: run[i][1] + (run[i + 1][1] - run[i][1]) * t, heading: Math.atan2(run[i + 1][1] - run[i][1], run[i + 1][0] - run[i][0]) * 180 / Math.PI }; }
      at -= len;
    }
  }
  return null;
}

export function tradeRoutes(input: TradeInput): TradeRoute[] {
  const { countries, playerCountryId, anchors, project } = input, jump = input.jump ?? Infinity;
  const candidates: { key: string; from: string; to: string; mode: RouteMode; sanctioned: boolean; mine: boolean }[] = [];
  const pairs = tradePairs(input.tradeDeals, input.contracts);
  for (const [key, p] of pairs) {
    if (!countries[p.from] || !countries[p.to]) continue;
    const mine = p.from === playerCountryId || p.to === playerCountryId, bad = sanctioned(countries, p.from, p.to);
    const sea = p.bulk && seaRoute(p.from, p.to);
    if (sea) candidates.push({ key: `${key}:sea`, from: p.from, to: p.to, mode: 'sea', sanctioned: bad, mine });
    if (p.precious || !sea) candidates.push({ key: `${key}:air`, from: p.from, to: p.to, mode: 'air', sanctioned: bad, mine });
  }
  // Sanctions with no deal still matter to the player: show the blocked corridor for those that involve them.
  let sanctionOnly = 0;
  const player = countries[playerCountryId];
  if (player) for (const other of Object.keys(player.diplomacy?.relations ?? {}).sort()) {
    if (sanctionOnly >= (input.maxSanctionOnly ?? 8)) break;
    if (!countries[other] || pairs.has(pairKey(playerCountryId, other)) || !sanctioned(countries, playerCountryId, other)) continue;
    candidates.push({ key: `${pairKey(playerCountryId, other)}:air`, from: playerCountryId, to: other, mode: 'air', sanctioned: true, mine: true });
    sanctionOnly++;
  }
  candidates.sort((a, b) => Number(b.mine) - Number(a.mine) || Number(b.sanctioned) - Number(a.sanctioned) || a.key.localeCompare(b.key));
  const out: TradeRoute[] = [];
  for (const c of candidates.slice(0, input.maxRoutes ?? 32)) {
    let geo: LonLat[] | null = null;
    if (c.mode === 'sea') geo = smoothRiver(seaRoute(c.from, c.to)!.points, 3);
    else { const a = anchors[c.from], b = anchors[c.to]; if (a && b) geo = lift(greatCircleArc(a, b, 48), 0.07); }
    if (!geo) continue;
    const runs = projectLines([geo], project, jump);
    if (!runs.length) continue;
    const { starts, total } = measure(runs), mid = pointAt({ runs, starts, total }, total / 2);
    out.push({ id: c.key, mode: c.mode, from: c.from, to: c.to, mine: c.mine, sanctioned: c.sanctioned, runs, starts, total, path: linesToPath(runs), marker: c.sanctioned && mid ? [mid.x, mid.y] : null, carriers: c.sanctioned ? 0 : c.mine ? 2 : 1, phase: hash01(c.key) });
  }
  return out;
}
