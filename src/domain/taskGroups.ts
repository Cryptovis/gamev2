/**
 * Phase 4 (0.90.0-playtest.13): air and naval task groups. A war side assigns aircraft and warships to missions;
 * only assigned, ready forces take part in that war. Saved inside `WarState.taskGroups` (optional, schema 17):
 * wars saved without it keep the earlier fixed-share rule.
 */
export type AirMission = 'airSuperiority' | 'closeAirSupport' | 'interdiction';
export type NavalMission = 'convoyEscort' | 'blockade' | 'shoreSupport';
export type TaskMission = AirMission | NavalMission;
export type TaskAsset = 'fighters' | 'bombers' | 'warships';
export type TaskSide = 'attacker' | 'defender';

export interface TaskGroup {
  id: string;
  side: TaskSide;
  mission: TaskMission;
  asset: TaskAsset;
  /** Whole aircraft or ships. */
  count: number;
  /** First campaign day on which the group flies or sails; earlier it is preparing and has no effect. */
  readyDay: number;
  /** Country whose capital the group operates from (own territory, an occupied country or an ally). */
  baseId: string;
}

export const TASK_MISSIONS: readonly TaskMission[] = ['airSuperiority', 'closeAirSupport', 'interdiction', 'convoyEscort', 'blockade', 'shoreSupport'];
export const TASK_ASSETS: readonly TaskAsset[] = ['fighters', 'bombers', 'warships'];
/** Which forces can fly or sail each mission. Most air forces have no bombers, so fighters fly strike missions too. */
export const MISSION_ASSETS: Record<TaskMission, readonly TaskAsset[]> = {
  airSuperiority: ['fighters'],
  closeAirSupport: ['fighters', 'bombers'],
  interdiction: ['fighters', 'bombers'],
  convoyEscort: ['warships'],
  blockade: ['warships'],
  shoreSupport: ['warships'],
};
