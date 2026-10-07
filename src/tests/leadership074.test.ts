import {describe,it,expect} from 'vitest';
import {makeInitialState} from '../data/initialState';
import {gameDate,processLeadership,validBirthDate} from '../engine/systems/leadership';
import {simulateResources} from '../engine/systems/resources';
import {tickGame} from '../engine/tick';

describe('leader identity, annual celebrations and correspondence',()=>{
 it('validates birth dates and advances a stable UTC calendar',()=>{
  expect(validBirthDate('1990-04-02')).toBe(true);expect(validBirthDate('1990-02-30')).toBe(false);expect(validBirthDate('2030-01-01')).toBe(false);
  const s=makeInitialState();expect(gameDate(s)).toBe('2026-01-01');expect(gameDate({...s,day:92})).toBe('2026-04-02');
 });
 it('grants exactly seven production days once per year to a popular leader',()=>{
  const s=makeInitialState();s.playerProfile.birthDate='1990-04-02';s.countries.TUR.politics.approval=80;s.countries.TUR.politics.stability=80;
  const n=processLeadership({...s,day:92});expect(n.leadership.celebrationUntilDay).toBe(99);expect(processLeadership(n).leadership).toEqual(n.leadership);
  for(let d=92;d<99;d++)expect(d<n.leadership.celebrationUntilDay).toBe(true);expect(99<n.leadership.celebrationUntilDay).toBe(false);
  const base=simulateResources(s.countries.TUR),boost=simulateResources(s.countries.TUR,1.12);expect(boost.production.food).toBeCloseTo(base.production.food*1.12);
 });
 it('does not grant production rewards when public support is low',()=>{
  const s=makeInitialState();s.playerProfile.birthDate='1990-04-02';s.countries.TUR.politics.approval=30;expect(processLeadership({...s,day:92}).leadership.celebrationUntilDay).toBe(0);
 });
 it('uses February 28 for leap-day birthdays in non-leap years',()=>{
  const s=makeInitialState();s.playerProfile.birthDate='1992-02-29';const n=processLeadership({...s,day:59});expect(gameDate(n)).toBe('2026-02-28');expect(n.leadership.lastBirthdayYear).toBe(2026);
 });
 it('sends deterministic friendly and rival birthday messages without popups',()=>{
  const s=makeInitialState();s.playerProfile.birthDate='1990-04-02';for(const id of Object.keys(s.countries)){if(id==='TUR')continue;s.countries.TUR.diplomacy.relations[id]={score:id.charCodeAt(0)%2===0?95:-90,status:id.charCodeAt(0)%2===0?'ally':'hostile',treaties:[],sanctions:false};}
  const a=processLeadership({...s,day:92}),b=processLeadership({...s,day:92});expect(a.leadership.messages).toEqual(b.leadership.messages);expect(a.leadership.messages.length).toBeGreaterThan(0);expect(a.activeEvent).toBeNull();expect(a.leadership.messages.length).toBeLessThanOrEqual(5);
 });
 it('recognizes sustained performance and rate-limits achievement correspondence',()=>{
  const s=makeInitialState();s.countries.TUR.economy.gdp*=1.1;s.countries.TUR.politics.approval=80;s.countries.TUR.politics.stability=80;const n=processLeadership({...s,day:90});expect(n.leadership.lastAchievementDay).toBe(90);expect(processLeadership({...n,day:120}).leadership.lastAchievementDay).toBe(90);
 });
 it('runs the complete expanded simulation deterministically and keeps resources nonnegative',()=>{
  const first=makeInitialState(),second=makeInitialState();first.playerProfile.birthDate=second.playerProfile.birthDate='1990-01-02';first.countries.TUR.politics.approval=second.countries.TUR.politics.approval=80;
  let a=first,b=second;for(let i=0;i<35;i++){a={...a,activeEvent:null,activeAdvisor:null};b={...b,activeEvent:null,activeAdvisor:null};a=tickGame(a);b=tickGame(b);}
  expect(a).toEqual(b);for(const n of Object.values(a.industrialEconomy))for(const v of Object.values(n.stock))expect(v).toBeGreaterThanOrEqual(0);
 });
});
