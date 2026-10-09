/** Campaign victory paths (audit E4). Rules live in src/engine/systems/campaignVictory.ts. */
export type VictoryPath = 'mandate' | 'economic' | 'diplomatic';

export interface CampaignProgress {
  /** Elections the player's government has won during this campaign. */
  reelections: number;
  /** The player's electionDaysRemaining at the previous check; a jump upwards means an election was won. */
  lastElectionDays: number;
  /** The player's GDP ($B) when tracking began; the economic path is measured against it. */
  startGdp: number;
  /** Day tracking began: the first campaign day for new games, the load day for older saves. */
  startDay: number;
  /** Day from which each path's conditions have held without interruption. */
  holdingSince: Partial<Record<VictoryPath, number>>;
  /** Set once a path completes. */
  achieved?: { path: VictoryPath; day: number };
  /** True after the player chose to keep playing past the victory. */
  sandbox?: boolean;
}
