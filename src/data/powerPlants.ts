import type { PlantKind } from "../domain/energy";
// Authored simulation values: power units/day, treasury in billions. Not real plant quotations.
export const POWER_PLANTS: Record<
  PlantKind,
  {
    label: string;
    cost: number;
    days: number;
    output: number;
    upkeep: number;
    fuel?: "coal" | "oil" | "uranium";
    fuelUse: number;
    tech?: string;
    description: string;
  }
> = {
  coal: {
    label: "Coal Power Station",
    cost: 0.8,
    days: 60,
    output: 0.6,
    upkeep: 0.00008,
    fuel: "coal",
    fuelUse: 0.2,
    description:
      "Reliable generation while coal supplies and operating funds last.",
  },
  oil: {
    label: "Oil Power Station",
    cost: 0.65,
    days: 45,
    output: 0.5,
    upkeep: 0.0001,
    fuel: "oil",
    fuelUse: 0.12,
    description:
      "Fast to commission, but competes with refineries and military oil reserves.",
  },
  solar: {
    label: "Solar Farm",
    cost: 0.6,
    days: 40,
    output: 0.32,
    upkeep: 0.00002,
    fuelUse: 0,
    description: "Fuel-free generation with a predictable day/night cycle.",
  },
  wind: {
    label: "Wind Farm",
    cost: 0.75,
    days: 50,
    output: 0.4,
    upkeep: 0.00003,
    fuelUse: 0,
    description: "Fuel-free generation varies with the simulated wind cycle.",
  },
  hydro: {
    label: "Hydroelectric Station",
    cost: 1.8,
    days: 120,
    output: 0.8,
    upkeep: 0.00005,
    fuelUse: 0,
    tech: "energy-grid",
    description:
      "Generation follows national water potential and seasonal water availability.",
  },
  nuclear: {
    label: "Civil Nuclear Power Station",
    cost: 6,
    days: 365,
    output: 2.4,
    upkeep: 0.0003,
    fuel: "uranium",
    fuelUse: 0.003,
    tech: "energy-nuclear",
    description:
      "High continuous output; requires civil nuclear research and a small daily uranium supply.",
  },
};
export const PLANT_KINDS = Object.keys(POWER_PLANTS) as PlantKind[];
