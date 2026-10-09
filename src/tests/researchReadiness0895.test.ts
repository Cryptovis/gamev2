import {describe,it,expect} from 'vitest';
import {makeInitialState} from '../data/initialState';
import {researchPreview,researchProjectPreview,researchRefund,unlockTechnology,cancelResearch} from '../engine/systems/technology';
import {warDeclarationStatus,warDeclarationReason,WAR_FUEL_MESSAGE} from '../engine/systems/warRules';
import {UI_CATALOG_089_K} from '../i18n/uiCatalog089K';
import {translateText} from '../i18n/localeText';
import {TECHNOLOGY_TREE} from '../data/technologyTree';
describe('research eligibility and progress previews',()=>{
 it('shows exact points shortfall and missing prerequisites without mutating the state',()=>{
  const s=makeInitialState(),n=TECHNOLOGY_TREE.find(n=>n.prerequisites.length)!;
  s.countries.TUR.technology.researchPoints=3.25;
  const before=JSON.stringify(s),v=researchPreview(s,'TUR',n.id)!;
  expect(v.allowed).toBe(false);expect(v.missingPoints).toBe(n.cost-3.25);expect(v.missingPrerequisites).toEqual(n.prerequisites);expect(v.reason).toBe('Complete the required discoveries first.');expect(JSON.stringify(s)).toBe(before);
 });
 it('eligibility at exact cost matches the command and an active project blocks the next one',()=>{
  let s=makeInitialState();const n=TECHNOLOGY_TREE.find(n=>!n.prerequisites.length)!;s.countries.TUR.technology.researchPoints=n.cost;
  expect(researchPreview(s,'TUR',n.id)!.allowed).toBe(true);s=unlockTechnology(s,'TUR',n.id);
  expect(s.countries.TUR.technology.researchPoints).toBe(0);expect(researchPreview(s,'TUR',n.id)!.reason).toBe('Finish or cancel the current project first.');expect(researchProjectPreview(s,'TUR')!.remainingDays).toBe(researchPreview(s,'TUR',n.id)!.duration);
 });
 it('refund preview matches the cancellation at partial and complete progress',()=>{
  let s=makeInitialState();const n=TECHNOLOGY_TREE.find(n=>!n.prerequisites.length)!;s.countries.TUR.technology.researchPoints=100;s=unlockTechnology(s,'TUR',n.id);
  const p=s.countries.TUR.technology.project!;p.workDone=p.requiredWork/2;
  const before=s.countries.TUR.technology.researchPoints,v=researchProjectPreview(s,'TUR')!;
  expect(v.progress).toBe(50);expect(v.refund).toBeCloseTo(n.cost*.4);expect(cancelResearch(s,'TUR').countries.TUR.technology.researchPoints).toBeCloseTo(before+v.refund);
  expect(researchRefund({...p,workDone:p.requiredWork+1})).toBe(0);
 });
});
it('reports fuel and occupied-target failures using command eligibility',()=>{
 const s=makeInitialState();s.countries.TUR.processedResources.fuel=0;
 expect(warDeclarationReason(warDeclarationStatus(s,'TUR','GRC'))).toBe(WAR_FUEL_MESSAGE);
 s.countries.GRC.controllerCountryId='BGR';expect(warDeclarationReason(warDeclarationStatus(s,'TUR','GRC'))).toContain('foreign control');
});
it('all new research and blocker messages have translations in every supported language',()=>{
 for(const key of Object.keys(UI_CATALOG_089_K))for(const lang of ['tr','es','zh','ru'] as const)expect(translateText(lang,key)).not.toBe(key);
});

it('technology names and country-specific war titles use the reviewed wording',()=>{
 for(const n of TECHNOLOGY_TREE)for(const lang of ['tr','es','zh','ru'] as const)expect(translateText(lang,n.name)).not.toBe(n.name);
 expect(translateText('tr','High-Efficiency Refining')).toBe('Verimli Rafinaj');
 expect(translateText('tr','Declare War on Greece')).toBe('Yunanistan ülkesine savaş aç');
});
