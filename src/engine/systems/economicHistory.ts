import type { GameState } from '../../domain/game';

export interface EconomicPoint { day: number; gdp: number; treasury: number; inflation: number; treasuryChange: number }
export interface EconomicHistory { countryId: string; points: EconomicPoint[] }
export const HISTORY_DAYS = 180;
export function recordEconomicHistory(state: GameState): GameState {
  const country = state.countries[state.playerCountryId];
  if (!country) return state;
  const old = state.world.economicHistory;
  const points = old?.countryId === country.id ? old.points : [];
  const previous = points.filter(p => p.day < state.day).at(-1);
  const point = { day: state.day, gdp: country.economy.gdp, treasury: country.economy.treasury, inflation: country.economy.inflation, treasuryChange: previous ? country.economy.treasury - previous.treasury : 0 };
  return { ...state, world: { ...state.world, economicHistory: { countryId: country.id, points: [...points.filter(p => p.day < state.day), point].slice(-HISTORY_DAYS) } } };
}
