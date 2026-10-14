import {describe,it,expect} from 'vitest';
import {version} from '../../package.json';
import {makeInitialState} from '../data/initialState';
import {tickGame} from '../engine/tick';
import {launchIntelOperation,processIntelOperations} from '../engine/systems/espionage';
import {snapshotGame} from '../persistence/snapshot';
import {migrateSave} from '../persistence/migrations';
import {translateText} from '../i18n/localeText';
import {UI_CATALOG_097} from '../i18n/uiCatalog097';

describe('0.97 release contract',()=>{
 it('publishes version 0.97.0 on frozen schema 17',()=>{
  expect(version).toBe('0.97.0');expect(makeInitialState().schemaVersion).toBe(17);
 });
 it('replays the same seeded simulation and retains its seed/countries through schema 17 save loading',()=>{
  let a=makeInitialState();a.eventCooldownUntil=10000;a.advisorCooldownUntil=10000;
  a=launchIntelOperation(a,'gather_intelligence','FRA');a={...a,day:6};
  let b=structuredClone(a);const seed=a.simulationSeed;
  a=processIntelOperations(a);b=processIntelOperations(b);expect(a.simulationSeed).not.toBe(seed);
  for(let day=0;day<3;day++){a=tickGame(a);b=tickGame(b);expect(snapshotGame(a)).toEqual(snapshotGame(b));}
  expect(a.day).toBeGreaterThan(1);expect(a.simulationSeed).toBe(b.simulationSeed);
  const saved=JSON.parse(JSON.stringify(snapshotGame(a))),loaded=migrateSave(saved)!;
  expect(loaded.schemaVersion).toBe(17);expect(loaded.simulationSeed).toBe(a.simulationSeed);expect(loaded.countries).toEqual(saved.countries);
 });
 it.each(['en','tr','es','zh','ru'] as const)('provides tax-action and live approval copy in %s',language=>{
  const index=['tr','es','zh','ru'].indexOf(language);
  for(const [key,translations] of Object.entries(UI_CATALOG_097))expect(translateText(language,key)).toBe(language==='en'?key:translations[index]);
 });
});
