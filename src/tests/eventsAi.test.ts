import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { maybeTriggerEvent, resolveEvent } from '../engine/systems/events';
import { processCountryAI } from '../engine/systems/ai';

describe('event engine',()=>{
  it('triggers a condition-based food event',()=>{const state=makeInitialState();state.day=20;state.eventCooldownUntil=0;state.countries.TUR.resources.food=20;const next=maybeTriggerEvent(state);expect(next.activeEvent?.kind).toBe('food_crisis');expect(next.speed).toBe(0);});
  it('resolves an event through a deterministic option',()=>{const state=makeInitialState();state.day=20;state.eventCooldownUntil=0;state.countries.TUR.resources.food=20;const eventState=maybeTriggerEvent(state);const next=resolveEvent(eventState,'imports');expect(next.activeEvent).toBeNull();expect(next.countries.TUR.resources.food).toBeGreaterThan(20);});
});

describe('country AI',()=>{
  it('runs a weekly policy cycle without mutating the player identity',()=>{const state=makeInitialState();state.day=8;const next=processCountryAI(state);expect(next.lastAiDay).toBe(8);expect(next.playerCountryId).toBe('TUR');expect(next.simulationSeed).not.toBe(state.simulationSeed);});
});
