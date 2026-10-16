import {describe,it,expect} from 'vitest';
import {resolveHeroAction,sessionKindOf} from '../ui/landing/heroAction';
import type {SaveSummaryState} from '../persistence/saveSummary';

const ready:SaveSummaryState={status:'ready',summary:{slotId:'s',countryId:'USA',countryName:'United States',iso2:'US',leaderName:'Ada',campaignDay:3,campaignDateIso:'2026-01-03',savedAt:1}};
const states:Record<string,SaveSummaryState>={loading:{status:'loading'},none:{status:'none'},corrupt:{status:'unreadable',reason:'corrupt'},incompatible:{status:'unreadable',reason:'incompatible_version'}};

describe('resolveHeroAction',()=>{
 it('continues whenever a loadable save exists, for every kind of session',()=>{
  for(const session of [null,{kind:'guest' as const},{kind:'profile' as const}])expect(resolveHeroAction(session,ready)).toBe('continue');
 });
 it('plays now as a guest when there is no session or a guest session and no loadable save',()=>{
  for(const session of [null,{kind:'guest' as const}])for(const [label,summary] of Object.entries(states))expect(resolveHeroAction(session,summary),label).toBe('play_now');
 });
 it('starts a new campaign for a signed-in profile with no loadable save',()=>{
  for(const [label,summary] of Object.entries(states))expect(resolveHeroAction({kind:'profile'},summary),label).toBe('new_campaign');
 });
});

describe('sessionKindOf',()=>{
 it('names the three session kinds the landing UI shows',()=>{
  expect(sessionKindOf(null)).toBe('none');
  expect(sessionKindOf({kind:'guest'})).toBe('guest');
  expect(sessionKindOf({kind:'profile'})).toBe('profile');
 });
});
