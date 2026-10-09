import type { BattlefieldTerrain, CasualtySnapshot } from './game';

export type TacticalSide = 'attacker' | 'defender';
export type TacticalRole = 'infantry' | 'armor' | 'artillery';
export type TacticalOrderKind = 'move' | 'defend' | 'flank' | 'recon' | 'reserve' | 'bombard';
export interface TacticalUnit {
  /** `${side}-${role}-${n}` for v2 battles; `${side}-${role}` for battles migrated from 0.83/0.84 saves. */
  id: string;
  side: TacticalSide;
  role: TacticalRole;
  cell: number;
  allocated: number;
  remaining: number;
  prepared?: boolean;
}
export interface TacticalOrder { unitId: string; kind: TacticalOrderKind; target?: number }

/**
 * One step of a resolved round, in resolution order. Playback and animation read these records;
 * they never reroll combat (HD War roadmap: rendering must not decide outcomes).
 */
export type TacticalActionKind = 'move' | 'blocked' | 'defend' | 'reserve' | 'recon' | 'bombard' | 'casualties' | 'lost' | 'capture' | 'contest';
export interface TacticalAction {
  kind: TacticalActionKind;
  side: TacticalSide;
  unitId?: string;
  from?: number;
  to?: number;
  target?: number;
  hit?: boolean;
  amount?: number;
  objective?: number;
}

export interface TacticalRoundEvent {
  round: number;
  day: number;
  playerSide: TacticalSide;
  orders: TacticalOrder[];
  enemyOrders: TacticalOrder[];
  attackerLosses: CasualtySnapshot;
  defenderLosses: CasualtySnapshot;
  attackerFuel: number;
  defenderFuel: number;
  progressBefore: number;
  progressAfter: number;
  units: TacticalUnit[];
  beforeUnits: TacticalUnit[];
  /** Holder of each objective after the round, aligned with `TacticalBattle.objectives`; null = empty or contested. */
  objectives: (TacticalSide | null)[];
  revealed: Record<TacticalSide, number[]>;
  actions: TacticalAction[];
}

/** HD War v2 (0.85): sized grid, seeded mirrored terrain and several objectives. Schema 17. */
export interface TacticalBattle {
  version: 2;
  width: number;
  height: number;
  /** Battle-local seed used for terrain generation; independent of the world RNG stream. */
  seed: number;
  startedDay: number;
  round: number;
  terrain: BattlefieldTerrain[];
  objectives: number[];
  initialUnits: TacticalUnit[];
  units: TacticalUnit[];
  revealed: Record<TacticalSide, number[]>;
  events: TacticalRoundEvent[];
}
