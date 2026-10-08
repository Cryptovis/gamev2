import type { BattlefieldTerrain, CasualtySnapshot } from './game';

export type TacticalSide = 'attacker' | 'defender';
export type TacticalRole = 'infantry' | 'armor' | 'artillery';
export type TacticalOrderKind = 'move' | 'defend' | 'flank' | 'recon' | 'reserve' | 'bombard';
export interface TacticalUnit {
  id: string;
  side: TacticalSide;
  role: TacticalRole;
  cell: number;
  allocated: number;
  remaining: number;
  prepared?: boolean;
}
export interface TacticalOrder { unitId: string; kind: TacticalOrderKind; target?: number }
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
  objective: TacticalSide | null;
  revealed: Record<TacticalSide, number[]>;
}
export interface TacticalBattle {
  version: 1;
  size: 6;
  startedDay: number;
  round: number;
  terrain: BattlefieldTerrain[];
  objectiveCell: number;
  initialUnits: TacticalUnit[];
  units: TacticalUnit[];
  revealed: Record<TacticalSide, number[]>;
  events: TacticalRoundEvent[];
}
