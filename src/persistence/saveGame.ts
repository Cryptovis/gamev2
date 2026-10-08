import type { GameState } from '../domain/game';
import { db, type SaveRecord } from './database';

import { snapshotGame } from './snapshot';
import { migrateSave } from './migrations';
export async function saveGame(state: GameState, id = 'manual', name = 'Manual Save') {
  const record: SaveRecord = { id, name, updatedAt: Date.now(), schemaVersion: state.schemaVersion, state: snapshotGame(state) };
  await db.saves.put(record);
  return record;
}

export async function loadSave(id: string) {
  const record = await db.saves.get(id);
  return migrateSave(record?.state);
}

export async function loadMostRecentSave() {
  const records = await db.saves.orderBy('updatedAt').reverse().toArray();
  return selectMostRecentCompatibleSave(records);
}

export async function listSaves() {
  return db.saves.orderBy('updatedAt').reverse().toArray();
}

export function selectMostRecentCompatibleSave(records:Pick<SaveRecord,'state'>[]) {
 for(const record of records){const state=migrateSave(record.state);if(state)return state;}
 return null;
}
