// Phase 9.5 stage 2: screen-space view model for active wars: front bands, troop-density chevrons and combat-effect anchors.
import type { CountryState, WarState } from '../domain/game';
import { countryThemeFor } from '../data/countryThemes';
import { frontGeometry, linesToPath, pointsAlong, projectLines, troopLevels, underAssault, type LonLat, type Ring } from './frontlines';

export interface WarFront {
  id: string; mine: boolean; kind: 'border' | 'beachhead'; attackerId: string; defenderId: string;
  attackerColor: string; defenderColor: string;
  /** SVG path data of the front in screen space. */
  path: string;
  /** Chevron path data per side. */
  attackerPips: string; defenderPips: string;
  levels: { attacker: number; defender: number };
  /** Effect anchors, empty unless the war is under assault. */
  fx: { x: number; y: number; delay: number; size: number }[];
}
export interface FrontInput {
  wars: Record<string, WarState>; countries: Record<string, CountryState>; playerCountryId: string; day: number;
  rings: Record<string, Ring[]>;
  project: (p: LonLat) => [number, number] | null;
  anchors: Record<string, LonLat>;
  maxWars?: number; maxFx?: number;
}
export const CHEVRON_SPACING = 26, MAX_MARKERS = 10;

/** Two belligerents must never share a colour; if their national themes collide, the defender takes its accent. */
export function belligerentColors(attacker: Pick<CountryState, 'iso2'> | undefined, defender: Pick<CountryState, 'iso2'> | undefined): [string, string] {
  const a = countryThemeFor(attacker?.iso2 ?? 'XX'), d = countryThemeFor(defender?.iso2 ?? 'YY');
  return [a.primary, d.primary.toLowerCase() === a.primary.toLowerCase() ? d.accent : d.primary];
}

const chevron = (x: number, y: number, dx: number, dy: number) => {
  // Tip at (x, y) pointing along (dx, dy); the wings trail back along the opposite direction.
  const tx = -dy, ty = dx, bx = x - dx * 3.4, by = y - dy * 3.4;
  return `M${(bx + tx * 4).toFixed(1)} ${(by + ty * 4).toFixed(1)}L${x.toFixed(1)} ${y.toFixed(1)}L${(bx - tx * 4).toFixed(1)} ${(by - ty * 4).toFixed(1)}`;
};

/** Markers along the front at a steady screen spacing, with the unit tangent and a normal pointing toward `toward`. */
export function markersAlong(lines: [number, number][][], toward: [number, number] | null, spacing = CHEVRON_SPACING, max = MAX_MARKERS) {
  const out: { x: number; y: number; nx: number; ny: number }[] = [];
  let travelled = 0, next = spacing / 2;
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, ay] = line[i], [bx, by] = line[i + 1], len = Math.hypot(bx - ax, by - ay);
      if (len < 0.01) continue;
      const tx = (bx - ax) / len, ty = (by - ay) / len;
      while (next <= travelled + len && out.length < max) {
        const d = next - travelled, x = ax + tx * d, y = ay + ty * d;
        let nx = -ty, ny = tx;
        if (toward && (toward[0] - x) * nx + (toward[1] - y) * ny < 0) { nx = -nx; ny = -ny; }
        out.push({ x, y, nx, ny });
        next += spacing;
      }
      travelled += len;
    }
  }
  return out;
}

export function warFronts(input: FrontInput): WarFront[] {
  const { wars, countries, playerCountryId, day, rings, project, anchors } = input;
  const list = Object.values(wars)
    .filter((w) => w.status === 'active' && countries[w.attackerId] && countries[w.defenderId])
    .map((w) => ({ w, mine: w.attackerId === playerCountryId || w.defenderId === playerCountryId }))
    .sort((a, b) => Number(b.mine) - Number(a.mine) || a.w.id.localeCompare(b.w.id))
    .slice(0, input.maxWars ?? 12);
  const fxBudget = { left: input.maxFx ?? 18 };
  const out: WarFront[] = [];
  for (const { w, mine } of list) {
    const geometry = frontGeometry(w.attackerId, w.defenderId, rings);
    if (!geometry) continue;
    const screen = projectLines(geometry.lines, project);
    if (!screen.length) continue;
    const a = countries[w.attackerId], d = countries[w.defenderId];
    const levels = troopLevels(a.military.personnel, d.military.personnel);
    const pa = anchors[w.attackerId] ? project(anchors[w.attackerId]) : null;
    const markers = markersAlong(screen, pa);
    let atk = '', def = '';
    for (const m of markers) {
      for (let i = 0; i < levels.attacker; i++) atk += chevron(m.x + m.nx * (6 + 4.2 * i), m.y + m.ny * (6 + 4.2 * i), -m.nx, -m.ny);
      for (let i = 0; i < levels.defender; i++) def += chevron(m.x - m.nx * (6 + 4.2 * i), m.y - m.ny * (6 + 4.2 * i), m.nx, m.ny);
    }
    const wanted = underAssault(w, day) ? (mine ? 3 : 1) : 0, n = Math.min(wanted, fxBudget.left);
    fxBudget.left -= n;
    const fx = pointsAlong(screen, n, w.id).map((p, i) => ({ x: p.x, y: p.y, delay: i * 0.7, size: mine ? 1.15 : 0.9 }));
    const [ca, cd] = belligerentColors(a, d);
    out.push({ id: w.id, mine, kind: geometry.kind, attackerId: w.attackerId, defenderId: w.defenderId, attackerColor: ca, defenderColor: cd, path: linesToPath(screen), attackerPips: atk, defenderPips: def, levels, fx });
  }
  return out;
}
