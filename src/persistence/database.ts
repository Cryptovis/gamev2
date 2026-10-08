import Dexie, { type EntityTable } from 'dexie';
import type { GameState } from '../domain/game';

export interface SaveRecord {
  id: string;
  name: string;
  owner?:string;
  updatedAt: number;
  schemaVersion: number;
  state: GameState;
}

class AlpyxDatabase extends Dexie {
  saves!: EntityTable<SaveRecord, 'id'>;

  constructor() {
    super('alpyx-global-command');
    this.version(1).stores({ saves: 'id, updatedAt' });
  }
}

export const db = new AlpyxDatabase();
