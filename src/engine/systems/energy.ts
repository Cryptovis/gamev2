import { canUnlockTechnology, unlockTechnology } from "./technology";
import type { GameState, CountryState } from "../../domain/game";
import type { NationalEnergy, PlantKind } from "../../domain/energy";
import { POWER_PLANTS, PLANT_KINDS } from "../../data/powerPlants";
import { FACILITIES } from "../../data/industrialCatalog";
import { EQUIPMENT_CATALOG } from "../../data/equipmentCatalog";
import { activeCountries } from "../../domain/sovereignty";
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export function createEnergy(c: CountryState): NationalEnergy {
  const capacity = c.industry.powerCapacity,
    units = Math.max(0, capacity * 0.018);
  // Migrate generic capacity once: existing plants retain approximately the old daily generation.
  const coal = Math.floor((units * 0.45) / 0.6),
    oil = Math.floor((units * 0.3) / 0.5);
  return {
    plants: { coal, oil, solar: 0, wind: 0, hydro: 0, nuclear: 0 },
    enabled: Object.fromEntries(
      PLANT_KINDS.map((k) => [k, true]),
    ) as NationalEnergy["enabled"],
    projects: [],
    legacyCapacity: Math.max(0, capacity - (coal * 0.6 + oil * 0.5) / 0.018),
    lastGeneration: units * (c.industry.utilization / 100),
    lastDemand: 0,
    lastCoverage: 100,
    outageDays: 0,
    lastCosts: 0,
    lastFuel: {},
    bottlenecks: {},
  };
}
export function energyFor(s: GameState, id: string) {
  return s.world.energy?.[id] ?? createEnergy(s.countries[id]);
}
export function energyDemand(s: GameState, id: string, current?: CountryState) {
  const c = current ?? s.countries[id],
    util = c.industry.utilization / 100;
  const civilian =
    c.industry.factories * 0.012 * util +
    (c.demographics.population / 1e6) * 0.004;
  const industrial = s.industrialEconomy[id];
  const factories = industrial
    ? Object.entries(FACILITIES).reduce(
        (sum, [k, d]) =>
          sum +
          (industrial.enabled[k as keyof typeof FACILITIES]
            ? industrial.facilities[k as keyof typeof FACILITIES] * d.power
            : 0),
        0,
      )
    : 0;
  const military = s.production[id]
    ? Object.values(s.production[id].lines).reduce(
        (sum, l) =>
          sum + l.factories * EQUIPMENT_CATALOG[l.equipment].inputs.electricity,
        0,
      )
    : 0;
  return { civilian, total: civilian + factories + military };
}
export function plantYield(s: GameState, id: string, kind: PlantKind) {
  const d = POWER_PLANTS[kind],
    cycle = (s.day % 30) / 30;
  const factor =
    kind === "solar"
      ? 0.8 + 0.2 * Math.sin(cycle * Math.PI * 2)
      : kind === "wind"
        ? 0.7 + 0.3 * Math.cos(cycle * Math.PI * 2)
        : kind === "hydro"
          ? clamp(
              (s.industrialEconomy[id]?.potential.water ?? 1) *
                (0.85 + 0.15 * Math.cos(cycle * Math.PI * 2)),
              0.1,
              1.6,
            )
          : 1;
  return (
    d.output *
    factor *
    (s.countries[id].technology.unlocked.includes("energy-grid") ? 1.22 : 1)
  );
}
export function canBuildPlant(s: GameState, id: string, kind: PlantKind) {
  const c = s.countries[id],
    d = POWER_PLANTS[kind],
    e = c && energyFor(s, id);
  return Boolean(
    c &&
    d &&
    !c.annexedBy &&
    c.economy.treasury >= d.cost &&
    e!.projects.length < 3 &&
    (!d.tech || c.technology.unlocked.includes(d.tech)) &&
    (kind !== "hydro" ||
      (s.industrialEconomy[id]?.potential.water ?? 1) >= 0.5),
  );
}
export function buildPlant(
  s: GameState,
  id: string,
  kind: PlantKind,
): GameState {
  if (!canBuildPlant(s, id, kind)) return s;
  const c = s.countries[id],
    e = energyFor(s, id),
    d = POWER_PLANTS[kind];
  let serial = e.projects.length;
  while (e.projects.some((p) => p.id === `power-${id}-${s.day}-${serial}`))
    serial++;
  const project = {
    id: `power-${id}-${s.day}-${serial}`,
    kind,
    readyDay: s.day + d.days,
  };
  return {
    ...s,
    countries: {
      ...s.countries,
      [id]: {
        ...c,
        economy: { ...c.economy, treasury: c.economy.treasury - d.cost },
      },
    },
    world: {
      ...s.world,
      energy: {
        ...s.world.energy,
        [id]: { ...e, projects: [...e.projects, project] },
      },
    },
    sitrep: [
      `ENERGY // ${d.label} commissioned; ready Day ${project.readyDay}.`,
      ...s.sitrep,
    ].slice(0, 12),
  };
}
export function togglePlant(
  s: GameState,
  id: string,
  kind: PlantKind,
): GameState {
  const e = energyFor(s, id);
  return {
    ...s,
    world: {
      ...s.world,
      energy: {
        ...s.world.energy,
        [id]: { ...e, enabled: { ...e.enabled, [kind]: !e.enabled[kind] } },
      },
    },
  };
}
export function powerProjectRefund(
  s: GameState,
  id: string,
  projectId: string,
) {
  const project = energyFor(s, id).projects.find((p) => p.id === projectId);
  if (!project || project.readyDay <= s.day) return 0;
  const d = POWER_PLANTS[project.kind];
  return d.cost * 0.8 * clamp((project.readyDay - s.day) / d.days, 0, 1);
}
export function cancelPowerProject(
  s: GameState,
  id: string,
  projectId: string,
): GameState {
  const refund = powerProjectRefund(s, id, projectId);
  if (refund <= 0) return s;
  const c = s.countries[id],
    e = energyFor(s, id);
  return {
    ...s,
    countries: {
      ...s.countries,
      [id]: {
        ...c,
        economy: { ...c.economy, treasury: c.economy.treasury + refund },
      },
    },
    world: {
      ...s.world,
      energy: {
        ...s.world.energy,
        [id]: { ...e, projects: e.projects.filter((p) => p.id !== projectId) },
      },
    },
    sitrep: [
      `ENERGY // Construction cancelled; $${refund.toFixed(3)}B refunded.`,
      ...s.sitrep,
    ].slice(0, 12),
  };
}
export function processEnergy(s: GameState): GameState {
  const countries = { ...s.countries },
    industrialEconomy = { ...s.industrialEconomy },
    energy = { ...s.world.energy };
  const notices: string[] = [];
  for (const source of activeCountries(s.countries)) {
    const id = source.id,
      old = energyFor(s, id),
      plants = { ...old.plants };
    let c = {
      ...source,
      resources: { ...source.resources },
      processedResources: { ...source.processedResources },
      economy: { ...source.economy },
      politics: { ...source.politics },
    };
    const industry = industrialEconomy[id],
      stock = { ...industry.stock };
    for (const p of old.projects.filter((x) => x.readyDay <= s.day)) {
      plants[p.kind]++;
      c.industry = {
        ...c.industry,
        powerCapacity:
          c.industry.powerCapacity + POWER_PLANTS[p.kind].output / 0.018,
      };
      if (id === s.playerCountryId)
        notices.push(
          `ENERGY // ${POWER_PLANTS[p.kind].label} is now operational.`,
        );
    }
    // Existing generic infrastructure investments still add generation; new plants are already in powerCapacity.
    const namedCapacity = PLANT_KINDS.reduce(
        (sum, k) => sum + (plants[k] * POWER_PLANTS[k].output) / 0.018,
        0,
      ),
      legacyCapacity = Math.max(0, c.industry.powerCapacity - namedCapacity);
    let generation =
        legacyCapacity *
        0.018 *
        (c.industry.utilization / 100) *
        (c.technology.unlocked.includes("energy-grid") ? 1.22 : 1),
      cost = 0;
    const fuels: NationalEnergy["lastFuel"] = {},
      bottlenecks: NationalEnergy["bottlenecks"] = {};
    for (const kind of PLANT_KINDS) {
      const count = plants[kind],
        d = POWER_PLANTS[kind];
      if (!count || !old.enabled[kind]) continue;
      let ratio = 1;
      const fuel = d.fuel,
        need = d.fuelUse * count,
        available =
          fuel === "coal" ? stock.coal : fuel ? c.resources[fuel] : Infinity;
      if (need > 0 && available < need) {
        ratio = clamp(available / need, 0, 1);
        bottlenecks[kind] = "Fuel shortage";
      }
      const operating = d.upkeep * count;
      if (
        operating > 0 &&
        Math.max(0, c.economy.treasury) / operating < ratio
      ) {
        ratio = clamp(c.economy.treasury / operating, 0, 1);
        bottlenecks[kind] = "Operating budget shortage";
      }
      if (fuel) {
        const used = need * ratio;
        fuels[fuel] = (fuels[fuel] ?? 0) + used;
        if (fuel === "coal") stock.coal = Math.max(0, stock.coal - used);
        else c.resources[fuel] = Math.max(0, c.resources[fuel] - used);
      }
      cost += operating * ratio;
      c.economy.treasury -= operating * ratio;
      generation += plantYield(s, id, kind) * count * ratio;
    }
    const demand = energyDemand(s, id, c),
      available = c.processedResources.electricity + generation,
      coverage =
        demand.total > 0
          ? clamp((available / demand.total) * 100, 0, 100)
          : 100;
    c.processedResources.electricity = Math.max(
      0,
      Math.min(1500, available - demand.civilian),
    );
    const outageDays = coverage < 95 ? old.outageDays + 1 : 0,
      shortfall = (100 - coverage) / 100;
    if (shortfall > 0) {
      c.politics.approval = clamp(
        c.politics.approval - 0.2 * shortfall,
        0,
        100,
      );
      c.politics.stability = clamp(
        c.politics.stability - 0.08 * shortfall,
        0,
        100,
      );
      c.economy.productivity = clamp(
        c.economy.productivity - 0.04 * shortfall,
        10,
        100,
      );
    }
    if (
      id === s.playerCountryId &&
      coverage < 95 &&
      (old.outageDays === 0 || outageDays % 7 === 0)
    )
      notices.push(
        `ENERGY // Grid coverage ${coverage.toFixed(0)}%. Check fuel, operating funds and power capacity.`,
      );
    countries[id] = c;
    industrialEconomy[id] = { ...industry, stock };
    energy[id] = {
      ...old,
      plants,
      legacyCapacity,
      projects: old.projects.filter((p) => p.readyDay > s.day),
      lastGeneration: generation,
      lastDemand: demand.total,
      lastCoverage: coverage,
      outageDays,
      lastCosts: cost,
      lastFuel: fuels,
      bottlenecks,
    };
  }
  return {
    ...s,
    countries,
    industrialEconomy,
    world: { ...s.world, energy },
    sitrep: [...notices, ...s.sitrep].slice(0, 12),
  };
}
export function processEnergyAI(s: GameState): GameState {
  if (s.day % 14 !== 0) return s;
  let n = s;
  for (const c of activeCountries(s.countries)) {
    if (
      c.id === s.playerCountryId ||
      (c.controllerCountryId && c.controllerCountryId !== c.id)
    )
      continue;
    const e = energyFor(n, c.id);
    if (
      e.projects.length ||
      e.lastGeneration >= e.lastDemand * 1.1 ||
      c.economy.treasury < 3
    )
      continue;
    // Prefer affordable, locally supportable generation, and pursue civil nuclear research only when eligible.
    const candidates: PlantKind[] = [];
    if (
      c.technology.unlocked.includes("energy-nuclear") &&
      c.resources.uranium > 0.1
    )
      candidates.push("nuclear");
    if ((n.industrialEconomy[c.id]?.potential.water ?? 0) >= 1.5)
      candidates.push("hydro");
    if ((n.industrialEconomy[c.id]?.stock.coal ?? 0) > 20)
      candidates.push("coal");
    if (c.resourceProduction.oil > 0.2) candidates.push("oil");
    candidates.push("solar", "wind");
    const tech = ["energy-grid", "energy-nuclear"].find((id) =>
      canUnlockTechnology(n.countries[c.id], id),
    );
    if (tech) {
      const reports = n.sitrep;
      n = unlockTechnology(n, c.id, tech);
      n = { ...n, sitrep: reports };
    }
    const kind = candidates.find((k) => canBuildPlant(n, c.id, k));
    if (kind) {
      const reports = n.sitrep;
      n = buildPlant(n, c.id, kind);
      n = { ...n, sitrep: reports };
    }
  }
  return n;
}
