// Phase 10.0: the scenario the player picked on the landing screen, waiting for the setup wizard to start it. It is a
// presentation hand-off, not game state: it lives in memory only and is cleared when the campaign starts or the player
// goes back to the menu, so a stale choice can never leak into a later campaign.

import { useSyncExternalStore } from 'react';
import { isScenarioId, type ScenarioId } from '../domain/scenario';

export interface PendingScenario { scenarioId: ScenarioId; countryId: string | null }

let pending: PendingScenario | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export const readPendingScenario = (): PendingScenario | null => pending;

export function setPendingScenario(next: PendingScenario | null) {
  const clean = next && isScenarioId(next.scenarioId) ? { scenarioId: next.scenarioId, countryId: next.countryId } : null;
  if (clean === pending || (clean && pending && clean.scenarioId === pending.scenarioId && clean.countryId === pending.countryId)) return;
  pending = clean;
  emit();
}

export const clearPendingScenario = () => setPendingScenario(null);

function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }

export const usePendingScenario = (): PendingScenario | null => useSyncExternalStore(subscribe, readPendingScenario, readPendingScenario);
