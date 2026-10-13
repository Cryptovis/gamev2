import { CAPITAL_POSITIONS } from '../data/capitalPositions';
import { MICROSTATE_POINTS } from '../data/microstates';
import type { CountryState } from '../domain/game';
import { relationFor } from '../engine/systems/diplomacy';

/**
 * playtest.17 (Phase 6.3): which capital pins to draw on the map. Pure view model: reads the state, never changes it.
 * Positions are screen positions (viewBox 1200×700) from the map's own projector.
 */
export type CapitalRole = 'player' | 'selected' | 'ally' | 'enemy' | 'partner' | 'other';
export interface CapitalPin { id: string; x: number; y: number; scale: number; priority: number; role: CapitalRole }

export interface CapitalPinInput {
  countries: Record<string, CountryState>;
  playerCountryId: string;
  selectedCountryId: string | null;
  hovered: string | null;
  /** Screen position of a [lon, lat], or null when it is on the far side of the globe. Pass WorldMap's flightProjector. */
  project: (lonLat: [number, number]) => [number, number] | null;
  zoom: number;
  flat: boolean;
  /** Ids of countries the player has an embassy with (from connectionIndex); the relation record alone does not carry embassies. */
  embassyPartners?: ReadonlySet<string>;
  /** Default 48. */
  maxPins?: number;
}

const W = 1200, H = 700, MARGIN = 12, MIN_GAP = 18;
const PRIORITY = { player: 1000, selected: 900, hovered: 800, enemy: 600, ally: 500, partner: 400 };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Population (persons) → a priority strictly below the partner tier, still increasing with population. */
const populationPriority = (persons: number) => { const m = Math.max(0, persons) / 1e6; return 399 * m / (m + 400); };

export function capitalPinScale(zoom: number) { return clamp(0.8 + 0.15 * zoom, 0.8, 1.4); }

export function capitalPins(input: CapitalPinInput): CapitalPin[] {
  const { countries, playerCountryId, selectedCountryId, hovered, project, zoom, flat, embassyPartners } = input;
  const maxPins = input.maxPins ?? 48;
  const showOthers = zoom >= (flat ? 1.8 : 1.4);
  const player = countries[playerCountryId];
  const scale = capitalPinScale(zoom);
  const candidates: Array<CapitalPin & { forced: boolean }> = [];

  for (const [id, lonLat] of Object.entries(CAPITAL_POSITIONS)) {
    const country = countries[id];
    // Annexed or occupied countries have no capital of their own to show; microstates already have a map marker.
    if (!country || country.annexedBy || country.controllerCountryId || id in MICROSTATE_POINTS) continue;
    const forced = id === playerCountryId || id === selectedCountryId || id === hovered;
    const relation = player && id !== playerCountryId ? relationFor(player, id) : null;
    const role: CapitalRole = id === playerCountryId ? 'player'
      : id === selectedCountryId ? 'selected'
      : relation?.status === 'war' ? 'enemy'
      : relation?.treaties.includes('alliance') ? 'ally'
      : relation && (relation.treaties.length > 0 || embassyPartners?.has(id)) ? 'partner'
      : 'other';
    if (!forced && role === 'other' && !showOthers) continue;

    const point = project(lonLat);
    if (!point || !point.every(Number.isFinite)) continue;
    const [x, y] = point;
    if (x < -MARGIN || x > W + MARGIN || y < -MARGIN || y > H + MARGIN) continue;

    const priority = id === playerCountryId ? PRIORITY.player
      : id === selectedCountryId ? PRIORITY.selected
      : id === hovered ? PRIORITY.hovered
      : role === 'other' ? populationPriority(country.demographics.population)
      : PRIORITY[role];
    candidates.push({ id, x, y, scale, priority, role, forced });
  }

  // Highest priority first; the id breaks ties so the order (and the pins that survive) is deterministic.
  candidates.sort((a, b) => b.priority - a.priority || (a.id < b.id ? -1 : 1));
  const kept: Array<CapitalPin & { forced: boolean }> = [];
  for (const pin of candidates.slice(0, Math.max(0, maxPins))) {
    // The player's, selected and hovered capitals are never dropped; everything else yields to a nearer, higher-priority pin.
    if (!pin.forced && kept.some((other) => Math.hypot(other.x - pin.x, other.y - pin.y) < MIN_GAP)) continue;
    kept.push(pin);
  }
  return kept.map(({ forced: _forced, ...pin }) => pin);
}
