export type PlantKind = "coal" | "oil" | "solar" | "wind" | "hydro" | "nuclear";
export interface NationalEnergy {
  plants: Record<PlantKind, number>;
  enabled: Record<PlantKind, boolean>;
  projects: Array<{ id: string; kind: PlantKind; readyDay: number }>;
  legacyCapacity: number;
  lastGeneration: number;
  lastDemand: number;
  lastCoverage: number;
  outageDays: number;
  lastCosts: number;
  lastFuel: Partial<Record<"coal" | "oil" | "uranium", number>>;
  bottlenecks: Partial<Record<PlantKind, string>>;
}
