/**
 * 9.9 cloud lineage: which cloud revision a save descends from. It is written only when a campaign is pulled from, or
 * sealed for, the cloud, and it travels inside the save so another device (or a save file carried by hand) can tell
 * whether it is behind. It never affects the simulation.
 */
export interface SaveLineage {
  /** The cloud revision this save was sealed as, or pulled from. */
  baseRevision: number;
  /** The device that wrote that revision. */
  deviceId: string;
  /** The campaign day of that revision. */
  syncedDay: number;
}
