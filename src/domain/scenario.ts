// Phase 10.0: which historical-style scenario a campaign started from. The scenario only shapes the opening state;
// once the campaign runs, the ordinary simulation owns everything. `world.scenario` is optional: saves without it load.

export const SCENARIO_IDS = ['modern-2026', 'resource-crisis', 'regional-conflicts'] as const;
export type ScenarioId = typeof SCENARIO_IDS[number];

export interface WorldScenario {
  id: ScenarioId;
  /** Campaign day the opening state was built on (always 1 for a fresh campaign). */
  startedDay: number;
}

export const isScenarioId = (value: unknown): value is ScenarioId => typeof value === 'string' && (SCENARIO_IDS as readonly string[]).includes(value);
