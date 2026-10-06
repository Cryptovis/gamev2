import { describe,expect,it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { strategicDecisionSpec } from '../engine/systems/strategicDecision';

describe('strategic decision previews',()=>{
 it('describes trade pact cost and bilateral consequence before execution',()=>{
  const state=makeInitialState();
  const spec=strategicDecisionSpec(state,'trade_pact','GRC');
  expect(spec).not.toBeNull();
  expect(spec?.impacts.some(x=>x.value==='-$5B')).toBe(true);
  expect(spec?.warnings.length).toBeGreaterThan(0);
 });

 it('warns that embargoes cancel active bilateral trade access',()=>{
  const state=makeInitialState();
  const spec=strategicDecisionSpec(state,'embargo','GRC');
  expect(spec?.warnings.join(' ').toLowerCase()).toContain('trade');
  expect(spec?.tone).toBe('danger');
 });

 it('treats war declaration as a dangerous irreversible-style decision',()=>{
  const state=makeInitialState();
  const spec=strategicDecisionSpec(state,'declare_war','GRC');
  expect(spec?.tone).toBe('danger');
  expect(spec?.impacts.some(x=>x.label==='Reputation'&&x.value==='-8')).toBe(true);
 });
});
