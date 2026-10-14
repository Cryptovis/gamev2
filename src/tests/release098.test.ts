import {describe,it,expect} from 'vitest';
import {version} from '../../package.json';
import {makeInitialState} from '../data/initialState';
import {tickGame} from '../engine/tick';
import {launchIntelOperation,processIntelOperations} from '../engine/systems/espionage';
import {snapshotGame} from '../persistence/snapshot';
import {migrateSave} from '../persistence/migrations';
import {translateText} from '../i18n/localeText';
import {UI_CATALOG_0905} from '../i18n/uiCatalog0905';
import {UI_CATALOG_098} from '../i18n/uiCatalog098';
import {formatCulturalIdentity} from '../presentation/culturalIdentityLabel';

describe('0.98 release contract',()=>{
 it('publishes 0.99.0 on schema 18',()=>{
  expect(version).toBe('0.99.0');expect(makeInitialState().schemaVersion).toBe(18);
 });
 it('replays seeded operations and ticks identically through schema 18 save loading',()=>{
  let a=makeInitialState();a.eventCooldownUntil=10000;a.advisorCooldownUntil=10000;
  a=launchIntelOperation(a,'gather_intelligence','FRA');a={...a,day:6};
  let b=structuredClone(a);const seed=a.simulationSeed;
  a=processIntelOperations(a);b=processIntelOperations(b);expect(a.simulationSeed).not.toBe(seed);
  for(let day=0;day<3;day++){a=tickGame(a);b=tickGame(b);expect(snapshotGame(a)).toEqual(snapshotGame(b));}
  const saved=JSON.parse(JSON.stringify(snapshotGame(a))),loaded=migrateSave(saved)!;
  expect(loaded.schemaVersion).toBe(18);expect(loaded.simulationSeed).toBe(a.simulationSeed);expect(loaded.countries).toEqual(saved.countries);
 });
 it.each(['en','tr','es','zh','ru'] as const)('localizes national power and cultural identities in %s',language=>{
  const index=['tr','es','zh','ru'].indexOf(language);
  expect(translateText(language,'Region')).toBe(language==='en'?'Region':UI_CATALOG_098.Region[index]);
  expect(translateText(language,'National power')).toBe(language==='en'?'Power':UI_CATALOG_0905['National power'][index]);
  const state=makeInitialState(),before=snapshotGame(state);
  for(const value of ['orthodox_christianity','pluralist',undefined]){
   const translated=translateText(language,value?.replaceAll('_',' ')||'Unknown').toLocaleLowerCase(language);
   const label=formatCulturalIdentity(value,language);
   expect(label.toLocaleLowerCase(language)).toBe(translated);
   expect(label).not.toContain('_');
  }
  expect(snapshotGame(state)).toEqual(before);
 });
 it('title-cases English identities and preserves Turkish dotted capital I',()=>{
  expect(formatCulturalIdentity('orthodox_christianity','en')).toBe('Orthodox Christianity');
  expect(formatCulturalIdentity('pluralist','en')).toBe('Pluralist');
  expect(formatCulturalIdentity('istanbul','tr')).toBe('İstanbul');
 });
});
