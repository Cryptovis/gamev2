import type { GameState, CountryState } from "../../domain/game";
import { expansion, updateExpansion } from "./sovereignCredit";
import { occupationFor, governance, academyFor } from "./governance";
import { living, withLiving } from "./livingEconomy";
import { populationForecast } from "./population";
import { simulateResources } from "./resources";
const clamp = (n: number) => Math.max(0, Math.min(100, n));
export function integrationRequirements(s: GameState, id: string) {
  const c = s.countries[id],
    p = s.countries[s.playerCountryId],
    o = occupationFor(s, id),
    prep = expansion(s).preparation[id];
  if (!c) return [];
  const religion =
      s.world.religiousShares[id]?.[p.society.dominantReligion] ??
      (c.society.dominantReligion === p.society.dominantReligion ? 70 : 0),
    welfare = populationForecast(c, simulateResources(c)).welfare;
  return [
    {
      label: "Player-controlled territory",
      value: c.controllerCountryId === p.id && !c.annexedBy ? 100 : 0,
      min: 100,
    },
    {
      label: "No active war or transition election",
      value:
        !Object.values(s.wars).some(
          (w) =>
            w.status === "active" && [w.attackerId, w.defenderId].includes(id),
        ) && !o?.election
          ? 100
          : 0,
      min: 100,
    },
    { label: "Public wellbeing", value: welfare, min: 90 },
    { label: "Public approval", value: c.politics.approval, min: 90 },
    { label: "Civil stability", value: c.politics.stability, min: 75 },
    { label: "Shared religion", value: religion, min: 60 },
    {
      label: "Civic ideology alignment",
      value:
        c.society.ideology === p.society.ideology ? 100 : (prep?.ideology ?? 0),
      min: 80,
    },
    {
      label: "Language education coverage",
      value: prep?.language ?? 0,
      min: 75,
    },
    { label: "Low unrest", value: 100 - (o?.unrest ?? 100), min: 85 },
  ];
}
export const integrationCost = (s: GameState, id: string) =>
  Math.max(0.5, (s.countries[id].demographics.population / 1e6) * 0.05);
export function prepareIntegration(
  s: GameState,
  id: string,
  kind: "language" | "ideology" | "services",
): GameState {
  const c = s.countries[id],
    p = s.countries[s.playerCountryId],
    e = expansion(s),
    old = e.preparation[id] ?? { language: 0, ideology: 0, lastActionDay: -14 },
    cost = 0.25;
  if (
    !c ||
    c.annexedBy ||
    c.controllerCountryId !== p.id ||
    !["language", "ideology", "services"].includes(kind) ||
    s.day - old.lastActionDay < 7 ||
    p.economy.treasury < cost ||
    e.integrations[id]?.status === "active"
  )
    return s;
  const prep = {
    ...old,
    lastActionDay: s.day,
    [kind]:
      kind === "language"
        ? clamp(old.language + 15)
        : kind === "ideology"
          ? clamp(old.ideology + 15)
          : undefined,
  };
  let n = {
    ...s,
    countries: {
      ...s.countries,
      [p.id]: {
        ...p,
        economy: { ...p.economy, treasury: p.economy.treasury - cost },
      },
      [id]:
        kind === "services"
          ? {
              ...c,
              demographics: {
                ...c.demographics,
                publicServicesBoost: Math.min(
                  12,
                  (c.demographics.publicServicesBoost ?? 0) + 2,
                ),
              },
              economy: {
                ...c.economy,
                taxRate: Math.min(18, c.economy.taxRate),
              },
              politics: {
                ...c.politics,
                approval: clamp(c.politics.approval + 5),
                stability: clamp(c.politics.stability + 2),
              },
            }
          : c,
    },
  };
  const g = governance(n),
    o = occupationFor(n, id)!;
  n = {
    ...n,
    world: {
      ...n.world,
      governance: {
        ...g,
        occupations: {
          ...g.occupations,
          [id]: {
            ...o,
            unrest: Math.max(0, o.unrest - (kind === "services" ? 6 : 2)),
          },
        },
      },
    },
  };
  return updateExpansion(n, {
    ...e,
    preparation: {
      ...e.preparation,
      [id]: {
        language: prep.language ?? 0,
        ideology: prep.ideology ?? 0,
        lastActionDay: prep.lastActionDay,
      },
    },
  });
}
export function beginIntegration(s: GameState, id: string): GameState {
  const e = expansion(s),
    p = s.countries[s.playerCountryId],
    cost = integrationCost(s, id);
  if (
    !s.countries[id] ||
    e.integrations[id]?.status === "active" ||
    e.integrations[id]?.status === "completed" ||
    integrationRequirements(s, id).some((r) => r.value < r.min) ||
    p.economy.treasury < cost
  )
    return s;
  return updateExpansion(
    {
      ...s,
      countries: {
        ...s.countries,
        [p.id]: {
          ...p,
          economy: { ...p.economy, treasury: p.economy.treasury - cost },
        },
      },
    },
    {
      ...e,
      integrations: {
        ...e.integrations,
        [id]: {
          targetId: id,
          controllerId: p.id,
          startedDay: s.day,
          endsDay: s.day + 90,
          status: "active",
        },
      },
    },
  );
}
function sum<T extends object>(a: T, b: T): T {
  return Object.fromEntries(
    Object.keys(a).map((k) => [
      k,
      (a as Record<string, number>)[k] +
        ((b as Record<string, number>)[k] ?? 0),
    ]),
  ) as T;
}
function zero<T extends object>(a: T): T {
  return Object.fromEntries(Object.keys(a).map((k) => [k, 0])) as T;
}
export function consolidateTerritory(
  s: GameState,
  id: string,
  owner: string,
): GameState {
  const c = s.countries[id],
    p = s.countries[owner];
  if (!c || !p || c.annexedBy || c.controllerCountryId !== owner) return s;
  const pop = p.demographics.population + c.demographics.population,
    weight = (a: number, b: number) =>
      (a * p.demographics.population + b * c.demographics.population) /
      Math.max(1, pop);
  const merged: CountryState = {
    ...p,
    demographics: {
      ...p.demographics,
      population: pop,
      publicServicesBoost: weight(
        p.demographics.publicServicesBoost ?? 0,
        c.demographics.publicServicesBoost ?? 0,
      ),
      workforce: p.demographics.workforce + c.demographics.workforce,
      growthRate: weight(p.demographics.growthRate, c.demographics.growthRate),
      baseGrowthRate: weight(
        p.demographics.baseGrowthRate ?? p.demographics.growthRate,
        c.demographics.baseGrowthRate ?? c.demographics.growthRate,
      ),
    },
    economy: {
      ...p.economy,
      gdp: p.economy.gdp + c.economy.gdp,
      treasury: p.economy.treasury + c.economy.treasury,
      debt: p.economy.debt + c.economy.debt,
    },
    resources: sum(p.resources, c.resources),
    resourceProduction: sum(p.resourceProduction, c.resourceProduction),
    processedResources: sum(p.processedResources, c.processedResources),
    industry: {
      ...p.industry,
      factories: p.industry.factories + c.industry.factories,
      refineries: p.industry.refineries + c.industry.refineries,
      mines: p.industry.mines + c.industry.mines,
      powerCapacity: p.industry.powerCapacity + c.industry.powerCapacity,
    },
    military: {
      ...p.military,
      personnel: p.military.personnel + c.military.personnel,
      tanks: p.military.tanks + c.military.tanks,
      artillery: p.military.artillery + c.military.artillery,
      fighters: p.military.fighters + c.military.fighters,
      bombers: p.military.bombers + c.military.bombers,
      warships: p.military.warships + c.military.warships,
    },
    technology: {
      researchPoints: p.technology.researchPoints + c.technology.researchPoints,
      unlocked: [
        ...new Set([...p.technology.unlocked, ...c.technology.unlocked]),
      ],
    },
  };
  const retired: CountryState = {
    ...c,
    annexedBy: owner,
    controllerCountryId: null,
    demographics: {
      ...c.demographics,
      population: 0,
      workforce: 0,
      growthRate: 0,
      netMigration: 0,
    },
    economy: { ...c.economy, treasury: 0, gdp: 0, debt: 0 },
    resources: zero(c.resources),
    resourceProduction: zero(c.resourceProduction),
    processedResources: zero(c.processedResources),
    industry: {
      ...c.industry,
      factories: 0,
      refineries: 0,
      mines: 0,
      powerCapacity: 0,
    },
    military: {
      ...c.military,
      personnel: 0,
      tanks: 0,
      artillery: 0,
      fighters: 0,
      bombers: 0,
      warships: 0,
    },
    technology: { ...c.technology, researchPoints: 0 },
  };
  let n: GameState = {
    ...s,
    countries: { ...s.countries, [owner]: merged, [id]: retired },
    selectedCountryId: s.selectedCountryId === id ? owner : s.selectedCountryId,
  };
  const ip = s.industrialEconomy[owner],
    ic = s.industrialEconomy[id];
  if (ip && ic)
    n = {
      ...n,
      industrialEconomy: {
        ...n.industrialEconomy,
        [owner]: {
          ...ip,
          stock: sum(ip.stock, ic.stock),
          facilities: sum(ip.facilities, ic.facilities),
          deposits: sum(ip.deposits, ic.deposits),
          potential: sum(ip.potential, ic.potential),
          enabled: Object.fromEntries(
            Object.keys(ip.enabled).map((k) => [
              k,
              ip.enabled[k as keyof typeof ip.enabled] ||
                ic.enabled[k as keyof typeof ic.enabled],
            ]),
          ) as typeof ip.enabled,
          projects: [
            ...ip.projects,
            ...ic.projects.map((x) => ({ ...x, id: `${id}-${x.id}` })),
          ],
        },
        [id]: {
          ...ic,
          stock: zero(ic.stock),
          facilities: zero(ic.facilities),
          projects: [],
          deposits: zero(ic.deposits),
        },
      },
    };
  const pp = s.production[owner],
    pc = s.production[id];
  if (pp && pc)
    n = {
      ...n,
      production: {
        ...n.production,
        [owner]: {
          ...pp,
          stockpile: sum(pp.stockpile, pc.stockpile),
          lines: Object.fromEntries(
            Object.keys(pp.lines).map((k) => [
              k,
              {
                ...pp.lines[k as keyof typeof pp.lines],
                factories:
                  pp.lines[k as keyof typeof pp.lines].factories +
                  pc.lines[k as keyof typeof pc.lines].factories,
              },
            ]),
          ) as typeof pp.lines,
        },
        [id]: {
          ...pc,
          stockpile: zero(pc.stockpile),
          lines: Object.fromEntries(
            Object.keys(pc.lines).map((k) => [
              k,
              { ...pc.lines[k as keyof typeof pc.lines], factories: 0 },
            ]),
          ) as typeof pc.lines,
        },
      },
    };
  const inf = s.infrastructure[owner],
    t = s.infrastructure[id];
  if (inf && t)
    n = {
      ...n,
      infrastructure: {
        ...n.infrastructure,
        [owner]: {
          ...inf,
          roads: inf.roads + t.roads,
          rail: inf.rail + t.rail,
          ports: inf.ports + t.ports,
          hubs: inf.hubs + t.hubs,
        },
        [id]: { ...t, roads: 0, rail: 0, ports: 0, hubs: 0 },
      },
    };
  const g = governance(n),
    a = academyFor(n, owner),
    b = academyFor(n, id),
    occupations = { ...g.occupations };
  delete occupations[id];
  n = {
    ...n,
    world: {
      ...n.world,
      governance: {
        ...g,
        occupations,
        academies: {
          ...g.academies,
          [owner]: {
            ...a,
            buildings: sum(a.buildings, b.buildings),
            projects: [...a.projects, ...b.projects],
            pilots: a.pilots + b.pilots,
            training: [...a.training, ...b.training],
          },
          [id]: {
            ...b,
            buildings: zero(b.buildings),
            projects: [],
            training: [],
            pilots: 0,
          },
        },
      },
      members: Object.fromEntries(
        Object.entries(n.world.members).map(([k, v]) => [
          k,
          v.filter((x) => x !== id),
        ]),
      ) as typeof n.world.members,
    },
  };
  const remap = (x: string) => (x === id ? owner : x);
  const lv = living(n);
  n = withLiving(n, {
    ...lv,
    bankGold: {
      ...lv.bankGold,
      [owner]: {
        ...lv.bankGold[owner],
        tonnes: lv.bankGold[owner].tonnes + lv.bankGold[id].tonnes,
      },
      [id]: { ...lv.bankGold[id], tonnes: 0 },
    },
    listings: lv.listings.map((x) => ({ ...x, sellerId: remap(x.sellerId) })),
  });
  n = {
    ...n,
    tradeDeals: Object.fromEntries(
      Object.entries(n.tradeDeals).map(([k, v]) => [
        k,
        {
          ...v,
          buyerId: remap(v.buyerId),
          sellerId: remap(v.sellerId),
          active: v.active && remap(v.buyerId) !== remap(v.sellerId),
        },
      ]),
    ),
    industrialContracts: Object.fromEntries(
      Object.entries(n.industrialContracts).map(([k, v]) => [
        k,
        {
          ...v,
          buyerId: remap(v.buyerId),
          sellerId: remap(v.sellerId),
          active: v.active && remap(v.buyerId) !== remap(v.sellerId),
        },
      ]),
    ),
    blocs: Object.fromEntries(
      Object.entries(n.blocs).map(([k, v]) => [
        k,
        {
          ...v,
          leaderId: remap(v.leaderId),
          memberIds: [...new Set(v.memberIds.map(remap))],
        },
      ]),
    ),
  };
  const inheritedEmbassies: typeof n.embassies = {};
  for (const mission of Object.values(n.embassies)) {
    const a = remap(mission.countryA),
      b = remap(mission.countryB);
    if (a === b) continue;
    const key = [a, b].sort().join("::");
    if (
      !inheritedEmbassies[key] ||
      inheritedEmbassies[key].level < mission.level
    )
      inheritedEmbassies[key] = {
        ...mission,
        id: key,
        countryA: a,
        countryB: b,
      };
  }
  n = {
    ...n,
    embassies: inheritedEmbassies,
    countries: Object.fromEntries(
      Object.entries(n.countries).map(([key, country]) => [
        key,
        country.controllerCountryId === id
          ? { ...country, controllerCountryId: owner }
          : country,
      ]),
    ),
  };
  n = {
    ...n,
    intelOperations: Object.fromEntries(
      Object.entries(n.intelOperations).map(([key, op]) => {
        if (op.status !== "active") return [key, op];
        const sourceCountryId = remap(op.sourceCountryId),
          targetCountryId = remap(op.targetCountryId);
        return [
          key,
          {
            ...op,
            sourceCountryId,
            targetCountryId,
            status:
              sourceCountryId === targetCountryId
                ? ("failed" as const)
                : op.status,
          },
        ];
      }),
    ),
    world: {
      ...n.world,
      missions: n.world.missions.map((m) =>
        m.status === "active" && m.targetId === id
          ? { ...m, targetId: owner }
          : m,
      ),
      ballots: n.world.ballots.map((b) =>
        b.status === "open" && (b.proposerId === id || b.targetId === id)
          ? { ...b, status: "rejected" as const }
          : b,
      ),
    },
  };
  const currentGovernance = governance(n);
  n = {
    ...n,
    world: {
      ...n.world,
      governance: {
        ...currentGovernance,
        occupations: Object.fromEntries(
          Object.entries(currentGovernance.occupations).map(([key, o]) => [
            key,
            o.controllerId === id ? { ...o, controllerId: owner } : o,
          ]),
        ),
      },
    },
  };
  const e = expansion(n);
  let transferredTax = e.forcedTaxes[id];
  const forcedTaxes = { ...e.forcedTaxes };
  delete forcedTaxes[id];
  if (transferredTax !== undefined && forcedTaxes[owner] === undefined)
    forcedTaxes[owner] = p.economy.taxRate;
  const offers = e.creditOffers.map((x) => ({
    ...x,
    countryId: remap(x.countryId),
  }));
  const loans = e.loans.map((x) => ({
    ...x,
    borrowerId: remap(x.borrowerId),
    lenderId: remap(x.lenderId),
  }));
  for (const loan of loans)
    if (loan.borrowerId === loan.lenderId && loan.status !== "paid") {
      const booked = loan.interestBooked ? loan.outstanding : loan.principal;
      n = {
        ...n,
        countries: {
          ...n.countries,
          [owner]: {
            ...n.countries[owner],
            economy: {
              ...n.countries[owner].economy,
              debt: Math.max(0, n.countries[owner].economy.debt - booked),
            },
          },
        },
      };
      loan.outstanding = 0;
      loan.status = "paid";
    }
  return updateExpansion(n, { ...e, forcedTaxes, creditOffers: offers, loans });
}
export function processIntegration(s: GameState): GameState {
  let n = s;
  for (const x of Object.values(expansion(s).integrations)) {
    if (x.status !== "active") continue;
    const c = n.countries[x.targetId],
      well = c ? populationForecast(c, simulateResources(c)).welfare : 0;
    const failed = !c || c.controllerCountryId !== x.controllerId || well < 80;
    if (!failed && n.day < x.endsDay) continue;
    if (!failed) n = consolidateTerritory(n, x.targetId, x.controllerId);
    const e = expansion(n);
    n = updateExpansion(n, {
      ...e,
      integrations: {
        ...e.integrations,
        [x.targetId]: {
          ...x,
          status: failed ? "failed" : "completed",
          reason: failed
            ? "Control lost or public wellbeing fell below 80%."
            : undefined,
        },
      },
    });
    n = withLiving(n, {
      ...living(n),
      notice: {
        title: failed ? "Integration failed" : "Integration completed",
        summary: failed
          ? "Control was lost or public wellbeing fell below 80%. The upfront investment is not refunded."
          : "The territory is now part of your country. Population, armed forces, factories, reserves, vault gold and sovereign liabilities were transferred.",
      },
    });
  }
  return n;
}
