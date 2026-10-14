import 'fake-indexeddb/auto';
import {describe,it,expect,beforeEach} from 'vitest';
import {makeInitialState} from '../data/initialState';
import {migrateOrganizations17To18,migrateSave,canLoadSave} from '../persistence/migrations';
import {snapshotGame} from '../persistence/snapshot';
import {saveGame,loadSave} from '../persistence/saveGame';
import {db} from '../persistence/database';
import {proposeAttack,startOutreach,processWorldInstitutions} from '../engine/systems/worldInstitutions';
import {processCouncilSanctions} from '../engine/systems/council';
import {tickGame} from '../engine/tick';
import {ORGANIZATION_IDS,P5_COUNTRY_IDS,type LegacySanctionEffect} from '../domain/organizations';
import type {GameState} from '../domain/game';

function freeze<T>(x:T):T {if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;}
function legacy(version=17):GameState {
  const s=snapshotGame(makeInitialState());s.schemaVersion=version;
  delete (s.world as Partial<typeof s.world>).organizations;
  const partial=s as Partial<GameState>;
  if(version===12){delete partial.industrialEconomy;delete partial.industrialContracts;delete partial.leadership;}
  if(version<=13)delete partial.world;
  else if(version===14){delete s.world.campaignId;delete s.world.commandIds;delete s.world.journal;}
  if(version>=14&&version<=15)delete s.world.economicHistory;
  return s;
}
describe('controlled Schema 18 migration',()=>{
  it.each([12,13,14,15,16,17])('migrates a genuine Schema %s shape without losing simulation state',version=>{
    const old=legacy(version),before=structuredClone(old),loaded=migrateSave(freeze(old))!;
    expect(loaded).not.toBeNull();expect(loaded.schemaVersion).toBe(18);expect(loaded.countries).toEqual(before.countries);
    expect(loaded.simulationSeed).toBe(before.simulationSeed);expect(old).toEqual(before);
    expect(Object.keys(loaded.world.organizations.byId).sort()).toEqual([...ORGANIZATION_IDS].sort());
    expect(canLoadSave(loaded)).toBe(true);expect(migrateSave(loaded)).toBe(loaded);
  });
  it('fills absent legacy industrial defaults once and remains idempotent afterwards',()=>{
    const s=legacy();delete (s.industrialEconomy.TUR as Partial<typeof s.industrialEconomy.TUR>).stock;
    const loaded=migrateSave(s)!;expect(loaded).not.toBeNull();expect(loaded.industrialEconomy.TUR.stock).toBeDefined();
    expect(migrateSave(loaded)).toBe(loaded);
  });
  it('is pure, deterministic and reference-idempotent at the adapter boundary',()=>{
    const old=legacy();old.countries.IRN.globalSanctions=true;old.countries.IRN.globalSanctionsUntil=91;
    const before=structuredClone(old),first=migrateOrganizations17To18(freeze(old));
    expect(first).toEqual(migrateOrganizations17To18(old));expect(old).toEqual(before);
    expect(first.simulationSeed).toBe(old.simulationSeed);expect(migrateOrganizations17To18(first)).toBe(first);
    expect(migrateSave(migrateSave(old))).toEqual(migrateSave(old));
  });
  it('maps legacy UN/security membership without promoting arbitrary legacy members to P5',()=>{
    const s=legacy();s.world.members.un=['USA','TUR'];s.world.members.security=['TUR','GRC'];
    const loaded=migrateSave(s)!,un=loaded.world.organizations.byId.un;
    expect(loaded.world.members).toEqual(s.world.members);expect(un.memberships.TUR.tier).toBe('Member');expect(un.memberships.GRC.tier).toBe('Member');
    for(const id of P5_COUNTRY_IDS)expect(un.memberships[id].tier).toBe('PermanentCouncil');
    expect(un.bodies.legacySecurity.memberIds).toEqual(['TUR','GRC']);expect(un.bodies.securityCouncil.memberIds).toHaveLength(7);
    expect(un.bodies.securityCouncil.votingRule).toMatchObject({kind:'securityCouncil',minimumYes:9,procedural:false});
  });
  it('keeps overflow legacy security seats in their body while capping the new council at 15',()=>{
    const s=legacy();s.world.members.security=Object.keys(s.countries).filter(id=>!P5_COUNTRY_IDS.some(p=>p===id)).slice(0,15);
    const un=migrateSave(s)!.world.organizations.byId.un;
    expect(un.bodies.securityCouncil.memberIds).toHaveLength(15);expect(un.bodies.legacySecurity.memberIds).toEqual(s.world.members.security);
    for(const id of s.world.members.security)expect(un.memberships[id]).toBeDefined();
  });
  it('retains WHO ballots, pending votes, outreach, journal and all existing world containers',()=>{
    let s=makeInitialState();s.world.members.un.push('TUR');s.countries.TUR.diplomacy.relations.GRC.score=50;
    s=proposeAttack(s,'GRC');s=startOutreach(s,'GRC','islam');s.world.journal=[{id:'old',day:1,message:'preserved',kind:'legacy'}];
    s=snapshotGame(s);s.schemaVersion=17;delete (s.world as Partial<typeof s.world>).organizations;
    s.world.ballots.push({...s.world.ballots[0],id:'who-ballot',kind:'membership',institution:'who',targetId:'TUR'});
    const {organizations:unused,...world}=s.world;
    const loaded=migrateSave(s)!;const {organizations,...loadedWorld}=loaded.world;
    expect(loadedWorld).toEqual(world);expect(organizations.resolutions).toEqual({});
    const legacyResult=processWorldInstitutions({...s,day:6}),migratedResult=processWorldInstitutions({...loaded,day:6});
    expect(migratedResult.world.ballots).toEqual(legacyResult.world.ballots);expect(migratedResult.countries).toEqual(legacyResult.countries);
  });
  it('creates stable legacy sanction snapshots with exact expiry and deterministic missing-expiry defaults',()=>{
    const s=legacy();s.day=10;s.countries.IRN.globalSanctions=true;s.countries.IRN.globalSanctionsUntil=100;
    s.countries.RUS.globalSanctions=true;
    const loaded=migrateSave(s)!,effects=loaded.world.organizations.effects;
    expect(effects['legacy-sanctions:IRN']).toEqual({id:'legacy-sanctions:IRN',kind:'legacySanctions',issuer:'legacyCouncil',targetId:'IRN',startsDay:10,endsDay:100,status:'active'});
    expect((effects['legacy-sanctions:RUS'] as LegacySanctionEffect).endsDay).toBe(375);
    expect(loaded.countries).toEqual(s.countries);expect(migrateSave(loaded)!.world.organizations.effects).toEqual(effects);
    expect(processCouncilSanctions({...loaded,day:100}).countries.IRN.globalSanctions).toBe(false);
  });
  it('preserves overdue sanction expiry without creating an invalid date interval',()=>{
    const s=legacy();s.day=10;s.countries.IRN.globalSanctions=true;s.countries.IRN.globalSanctionsUntil=5;
    const loaded=migrateSave(s)!;expect(loaded.world.organizations.effects['legacy-sanctions:IRN']).toMatchObject({startsDay:5,endsDay:5});
  });
  it('rejects corrupt legacy input instead of fabricating missing institutions or invalid expiries',()=>{
    const s=legacy();delete (s.world.members as Partial<typeof s.world.members>).un;
    expect(migrateOrganizations17To18(s)).toBe(s);expect(migrateSave(s)).toBeNull();
    const invalid=legacy();invalid.countries.IRN.globalSanctions=true;invalid.countries.IRN.globalSanctionsUntil=NaN;
    expect(migrateSave(invalid)).toBeNull();
  });
  it('suspends an annexed country in new rosters without transferring its P5 identity to an occupier',()=>{
    const s=legacy();s.countries.FRA.annexedBy='TUR';const un=migrateSave(s)!.world.organizations.byId.un;
    expect(un.memberships.FRA.status).toBe('suspended');expect(un.memberships.FRA.tier).toBe('PermanentCouncil');expect(un.memberships.TUR?.tier).not.toBe('PermanentCouncil');
  });
  it('keeps the seeded simulation identical after a Schema 18 JSON snapshot roundtrip',()=>{
    const s=migrateSave(legacy())!;s.eventCooldownUntil=10000;s.advisorCooldownUntil=10000;
    const loaded=migrateSave(JSON.parse(JSON.stringify(snapshotGame(s))))!;
    expect(snapshotGame(tickGame(s))).toEqual(snapshotGame(tickGame(loaded)));
  });
});

describe('Schema 18 persistence roundtrip',()=>{
  beforeEach(async()=>{await db.saves.clear();});
  it('writes Schema 18 envelopes and resumes migrated organizations with all legacy fields',async()=>{
    const state=migrateSave(legacy())!;const record=await saveGame(state,'schema18','Schema 18','guest');
    expect(record.schemaVersion).toBe(18);expect(record.state.world.organizations).toEqual(state.world.organizations);
    expect(await loadSave(record.id)).toEqual(state);
  });
  it('refuses malformed organization data before replacing a valid save',async()=>{
    const state=migrateSave(legacy())!;await saveGame(state,'protected18','good','guest');
    const bad=snapshotGame(state);bad.world.organizations.byId.un.availableFundsB=NaN;
    await expect(saveGame(bad,'protected18','bad','guest')).rejects.toThrow('invalid save');expect(await loadSave('protected18')).toEqual(state);
  });
});
