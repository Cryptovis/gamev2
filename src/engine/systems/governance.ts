import {activeCountries} from '../../domain/sovereignty';
import type { GameState, CountryState } from "../../domain/game";
import type {
  CampusKind,
  GovernanceState,
  NationalAcademy,
  Occupation,
} from "../../domain/governance";
import { nextRandom } from "../rng";
import { changeRelations, addTreaty } from "./diplomacy";
import { normalizedMinistryShare } from "./ministries";
import { BASE_COST_B, scaledCostB } from "./policyPressure";
const clamp = (n: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, n));
export const CAMPUSES = {
  university: {
    title: "University",
    cost: 5,
    days: 30,
    upkeep: 0.002,
    bonus: 0.0005,
  },
  institute: {
    title: "Research Institute",
    cost: 7,
    days: 40,
    upkeep: 0.003,
    bonus: 0.0006,
  },
  academy: {
    title: "Military Academy",
    cost: 6,
    days: 30,
    upkeep: 0.002,
    bonus: 0.005,
  },
};
export const CANDIDATES = [
  {
    id: "civic",
    name: "Civic reformer",
    offer: "Trade partnership",
    treaty: "trade" as const,
  },
  {
    id: "pragmatic",
    name: "Independent pragmatist",
    offer: "Non-aggression pact",
    treaty: "nonAggression" as const,
  },
  {
    id: "security",
    name: "Security coalition",
    offer: "Defense alliance",
    treaty: "alliance" as const,
  },
];
export const governance = (s: GameState): GovernanceState =>
  s.world.governance ?? {
    academies: {},
    occupations: {},
    campaigns: [],
    foreignLeaders: {},
  };
export function createGovernance(
  countries: Record<string, CountryState>,
): GovernanceState {
  return {
    academies: Object.fromEntries(
      Object.values(countries).map((c) => [
        c.id,
        {
          buildings: { university: 0, institute: 0, academy: 0 },
          projects: [],
          pilots: Math.min(
            c.military.fighters + c.military.bombers,
            Math.floor(c.military.personnel * 0.05),
          ),
          training: [],
          lastUpkeep: 0,
          funded: true,
        },
      ]),
    ),
    occupations: {},
    campaigns: [],
    foreignLeaders: {},
  };
}
export function applyPilotCasualties(
  s: GameState,
  id: string,
  lost: number,
): GameState {
  const g = governance(s),
    a = academyFor(s, id);
  return update(s, {
    ...g,
    academies: {
      ...g.academies,
      [id]: { ...a, pilots: Math.max(0, a.pilots - Math.ceil(lost * 0.35)) },
    },
  });
}
export function academyFor(s: GameState, id: string): NationalAcademy {
  return (
    governance(s).academies[id] ?? {
      buildings: { university: 0, institute: 0, academy: 0 },
      projects: [],
      pilots:
        s.countries[id].military.fighters + s.countries[id].military.bombers,
      training: [],
      lastUpkeep: 0,
      funded: true,
    }
  );
}
function update(s: GameState, g: GovernanceState): GameState {
  return { ...s, world: { ...s.world, governance: g } };
}
function note(s: GameState, line: string) {
  return { ...s, sitrep: [line, ...s.sitrep].slice(0, 12) };
}
export function campusPreview(s:GameState,kind:CampusKind){
 const c=s.countries[s.playerCountryId],a=academyFor(s,c.id),d=CAMPUSES[kind];
 if(!d)return {techReady:false,allowed:false,cost:0,completionDay:s.day,monthlyUpkeep:0,treasuryAfter:c.economy.treasury};
 const techReady=kind==='institute'?c.technology.unlocked.includes('edu-laboratories'):kind==='academy'?c.technology.unlocked.includes('mil-command'):true;
 return {techReady,allowed:!!d&&techReady&&c.economy.treasury>=d.cost&&a.projects.length<4,cost:d.cost,completionDay:s.day+d.days,monthlyUpkeep:d.upkeep*30,treasuryAfter:c.economy.treasury-d.cost};
}
export function pilotTrainingPreview(s:GameState,count:number){
 const c=s.countries[s.playerCountryId],a=academyFor(s,c.id);
 const rate=1+a.buildings.academy*.005+(c.technology.unlocked.includes('mil-flight-school')?.1:0);
 const committed=a.pilots+a.training.reduce((n,t)=>n+t.count,0),cost=count*.0001;
 return {allowed:Number.isInteger(count)&&count>=1&&count<=1000&&c.economy.treasury>=cost&&committed+count<=Math.floor(c.military.personnel*.05),cost,days:Math.ceil(30/rate),monthlyWages:count*.0000002*30,pilotsAfter:committed+count};
}
export function academySummary(s:GameState,id:string){
 const a=academyFor(s,id);
 return {researchBonusPercent:a.buildings.university*CAMPUSES.university.bonus*100+a.buildings.institute*CAMPUSES.institute.bonus*100,monthlyUpkeep:a.lastUpkeep*30};
}
export function buildCampus(s: GameState, kind: CampusKind): GameState {
  const d = CAMPUSES[kind],
    c = s.countries[s.playerCountryId],
    a = academyFor(s, c.id),
    g = governance(s);
  if(!campusPreview(s,kind).allowed)return s;
  return note(
    update(
      {
        ...s,
        countries: {
          ...s.countries,
          [c.id]: {
            ...c,
            economy: { ...c.economy, treasury: c.economy.treasury - d.cost },
          },
        },
      },
      {
        ...g,
        academies: {
          ...g.academies,
          [c.id]: {
            ...a,
            projects: [
              ...a.projects,
              {
                id: `${kind}-${s.day}-${a.projects.length}`,
                kind,
                readyDay: s.day + d.days,
              },
            ],
          },
        },
      },
    ),
    `INVESTMENT // ${d.title} construction started.`,
  );
}
export function hirePilots(s: GameState, count: number): GameState {
  const c=s.countries[s.playerCountryId],a=academyFor(s,c.id),g=governance(s),view=pilotTrainingPreview(s,count),cost=view.cost;
  if(!view.allowed)return s;
  return note(
    update(
      {
        ...s,
        countries: {
          ...s.countries,
          [c.id]: {
            ...c,
            economy: { ...c.economy, treasury: c.economy.treasury - cost },
          },
        },
      },
      {
        ...g,
        academies: {
          ...g.academies,
          [c.id]: {
            ...a,
            training: [
              ...a.training,
              {
                id: `pilots-${s.day}-${a.training.length}`,
                count,
                readyDay: s.day + view.days,
              },
            ],
          },
        },
      },
    ),
    `TRAINING // ${count} pilots enrolled.`,
  );
}
export function pilotCoverage(s: GameState, id: string) {
  const c = s.countries[id],
    needed = c.military.fighters + c.military.bombers;
  const a = academyFor(s, id);
  return (needed ? Math.min(1, a.pilots / needed) : 1) * (a.funded ? 1 : 0.5);
}
export function occupationFor(s: GameState, id: string): Occupation | null {
  const c = s.countries[id];
  if (!c?.controllerCountryId) return null;
  const stored = governance(s).occupations[id];
  // A record whose election already resolved belongs to an occupation that ended (audit D10).
  return stored?.controllerId === c.controllerCountryId && !stored.election?.resolved
    ? stored
    : {
        controllerId: c.controllerCountryId,
        unrest: 35,
        policy: "civil",
        lastActionDay: -10,
      };
}
export type OccupationAction =
  "relief" | "suppress" | "election" | "transfer" | "support" | "accept";
export function manageOccupation(
  s: GameState,
  id: string,
  action: OccupationAction,
  value?: string,
): GameState {
  const c = s.countries[id],
    p = s.countries[s.playerCountryId],
    o = occupationFor(s, id),
    g = governance(s);
  if (!c || !o || o.controllerId !== p.id) return s;
  let next = s,
    changed = { ...o };
  const activeWar = Object.values(s.wars).some(
    (w) =>
      w.status === "active" && (w.attackerId === id || w.defenderId === id),
  );
  if (action === "transfer") {
    if (
      activeWar ||
      !value ||
      !s.countries[value] ||
      value === id ||
      value === p.id ||
      s.countries[value].controllerCountryId
    )
      return s;
    return note(
      update(
        {
          ...s,
          countries: {
            ...s.countries,
            [id]: { ...c, controllerCountryId: value },
          },
        },
        {
          ...g,
          occupations: {
            ...g.occupations,
            [id]: {
              ...o,
              controllerId: value,
              unrest: clamp(o.unrest + 10),
              election: undefined,
            },
          },
        },
      ),
      `GOVERNANCE // Control of ${c.name} transferred to ${s.countries[value].name}.`,
    );
  }
  if (action === "relief") {
    if (
      s.day - o.lastActionDay < 7 ||
      p.economy.treasury < 1 ||
      p.resources.food < 20 ||
      p.resources.oil < 5
    )
      return s;
    next = {
      ...s,
      countries: {
        ...s.countries,
        [p.id]: {
          ...p,
          economy: { ...p.economy, treasury: p.economy.treasury - 1 },
          resources: {
            ...p.resources,
            food: p.resources.food - 20,
            oil: p.resources.oil - 5,
          },
        },
        [id]: {
          ...c,
          resources: {
            ...c.resources,
            food: c.resources.food + 20,
            oil: c.resources.oil + 5,
          },
          politics: {
            ...c.politics,
            stability: clamp(c.politics.stability + 3),
          },
        },
      },
    };
    changed = {
      ...o,
      unrest: clamp(o.unrest - 12),
      policy: "civil",
      lastActionDay: s.day,
    };
  }
  if (action === "suppress") {
    if (
      s.day - o.lastActionDay < 7 ||
      p.economy.treasury < 2 ||
      p.military.personnel < 10000 ||
      p.military.readiness < 30
    )
      return s;
    next = {
      ...s,
      countries: {
        ...s.countries,
        [p.id]: {
          ...p,
          economy: { ...p.economy, treasury: p.economy.treasury - 2 },
          military: {
            ...p.military,
            readiness: clamp(p.military.readiness - 5),
          },
          diplomacy: {
            ...p.diplomacy,
            reputation: clamp(p.diplomacy.reputation - 5),
          },
        },
        [id]: {
          ...c,
          society: { ...c.society, cohesion: clamp(c.society.cohesion - 5) },
        },
      },
    };
    changed = {
      ...o,
      unrest: clamp(o.unrest - 20),
      policy: "military",
      lastActionDay: s.day,
    };
  }
  if (action === "election") {
    if (activeWar || o.election || p.economy.treasury < 3) return s;
    next = {
      ...s,
      countries: {
        ...s.countries,
        [p.id]: {
          ...p,
          economy: { ...p.economy, treasury: p.economy.treasury - 3 },
        },
      },
    };
    changed = {
      ...o,
      election: {
        endsDay: s.day + 21,
        supported: null,
        resolved: false,
        offerAccepted: false,
      },
      unrest: clamp(o.unrest - 8),
    };
  }
  if (action === "support") {
    if (
      !o.election ||
      o.election.resolved ||
      !CANDIDATES.some((x) => x.id === value) ||
      p.economy.treasury < 1 ||
      o.election.supported === value
    )
      return s;
    next = {
      ...s,
      countries: {
        ...s.countries,
        [p.id]: {
          ...p,
          economy: { ...p.economy, treasury: p.economy.treasury - 1 },
        },
      },
    };
    changed = { ...o, election: { ...o.election, supported: value! } };
  }
  if (
    action === "accept" ||
    !["relief", "suppress", "election", "support"].includes(action)
  )
    return s;
  return note(
    update(next, { ...g, occupations: { ...g.occupations, [id]: changed } }),
    `GOVERNANCE // ${action} policy applied in ${c.name}.`,
  );
}
export function acceptElectionOffer(s: GameState, id: string): GameState {
  const g = governance(s),
    o = g.occupations[id],
    e = o?.election,
    candidate = CANDIDATES.find((c) => c.id === e?.winner);
  if (
    !e?.resolved ||
    e.offerAccepted ||
    !candidate ||
    s.countries[id]?.controllerCountryId ||
    o.controllerId !== s.playerCountryId ||
    Object.values(s.wars).some(
      (w) => w.status === "active" && [w.attackerId, w.defenderId].includes(id),
    )
  )
    return s;
  return update(addTreaty(s, s.playerCountryId, id, candidate.treaty), {
    ...g,
    occupations: {
      ...g.occupations,
      [id]: { ...o, election: { ...e, offerAccepted: true } },
    },
  });
}
export function politicalChance(s: GameState, id: string) {
  const c = s.countries[id],
    p = s.countries[s.playerCountryId];
  if (
    !c ||
    id === p.id ||
    c.controllerCountryId ||
    c.politics.approval >= 40 ||
    c.politics.stability >= 50
  )
    return 0;
  const weak = (c.military.readiness + c.military.logistics) / 2 < 50,
    pressure = c.society.influencePressure.ideology;
  if (!weak && pressure < 30) return 0;
  return (
    clamp(
      (40 - c.politics.approval) * 0.5 +
        (50 - c.politics.stability) * 0.5 +
        p.intelligence.networkStrength * 0.25 +
        pressure * 0.2 -
        c.intelligence.counterIntelligence * 0.2,
      10,
      65,
    ) / 100
  );
}
export function fundPoliticalCampaign(s: GameState, id: string): GameState {
  const chance = politicalChance(s, id),
    g = governance(s),
    p = s.countries[s.playerCountryId],
    cost = scaledCostB(p, BASE_COST_B.politicalCampaign);
  if (
    !chance ||
    p.economy.treasury < cost ||
    g.campaigns.some(
      (x) =>
        x.targetId === id && (x.status === "active" || s.day < x.endsDay + 90),
    )
  )
    return s;
  return note(
    update(
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
        ...g,
        campaigns: [
          {
            id: `political-${id}-${s.day}`,
            targetId: id,
            endsDay: s.day + 30,
            status: "active" as const,
            chance,
          },
          ...g.campaigns,
        ].slice(0, 100),
      },
    ),
    `POLITICAL // Civil opposition campaign funded in ${s.countries[id].name}.`,
  );
}
export function processGovernance(s: GameState): GameState {
  const g = governance(s);
  let next = s;
  const academies = {
      ...g.academies,
      [s.playerCountryId]: academyFor(s, s.playerCountryId),
    },
    occupations = { ...g.occupations },
    foreignLeaders = { ...g.foreignLeaders };
  for (const [id, a] of Object.entries(academies)) {
    let c = next.countries[id];
    if (!c || c.annexedBy) continue;
    const buildings = { ...a.buildings },
      projects = a.projects.filter((p) => {
        if (p.readyDay > next.day) return true;
        buildings[p.kind]++;
        return false;
      }),
      training = a.training.filter((t) => t.readyDay > next.day),
      trained = a.training
        .filter((t) => t.readyDay <= next.day)
        .reduce((n, t) => n + t.count, 0);
    const upkeep =
        buildings.university * 0.002 +
        buildings.institute * 0.003 +
        buildings.academy * 0.002 +
        (a.pilots + trained) * 0.0000002,
      funded = c.economy.treasury >= upkeep,
      bonus = funded
        ? buildings.university * 0.0005 + buildings.institute * 0.0006
        : 0;
    const dailyResearch =
      0.018 +
      normalizedMinistryShare(c, "science") *
        c.ministries.efficiency.science *
        0.018;
    c = {
      ...c,
      economy: {
        ...c.economy,
        treasury: Math.max(0, c.economy.treasury - upkeep),
      },
      technology: {
        ...c.technology,
        researchPoints:
          c.technology.researchPoints +
          dailyResearch *
            (bonus +
              (c.technology.unlocked.includes("edu-foundation") ? 0.05 : 0) +
              (c.technology.unlocked.includes("edu-laboratories") ? 0.03 : 0)),
      },
    };
    academies[id] = {
      ...a,
      buildings,
      projects,
      training,
      pilots: Math.min(
        Math.floor(c.military.personnel * 0.05),
        a.pilots + trained,
      ),
      lastUpkeep: upkeep,
      funded,
    };
    next = { ...next, countries: { ...next.countries, [id]: c } };
  }
  // Occupation records end with control (audit D10); only a pending post-election offer outlives it.
  for (const [id, o] of Object.entries(occupations))
    if (!next.countries[id]?.controllerCountryId && !(o.election?.resolved && !o.election.offerAccepted))
      delete occupations[id];
  for (const c of activeCountries(next.countries)) {
    let o = occupationFor(
      { ...next, world: { ...next.world, governance: { ...g, occupations } } },
      c.id,
    );
    if (!o) continue;
    const shortage =
        c.resources.food < 10 ||
        c.resources.oil < 3 ||
        (next.industrialEconomy[c.id]?.stock.water ?? 100) < 5,
      delta =
        (shortage ? 1.3 : 0) +
        (c.politics.stability < 35 ? 0.6 : 0) +
        (c.politics.approval < 30 ? 0.3 : 0) +
        (o.policy === "military" ? 0.12 : -0.18);
    o = { ...o, unrest: clamp(o.unrest + delta) };
    if (o.election && !o.election.resolved && o.election.endsDay <= next.day) {
      let scores: CANDIDATES_SCORE[] = [];
      for (const candidate of CANDIDATES) {
        const rng = nextRandom(next.simulationSeed);
        next = { ...next, simulationSeed: rng.seed };
        scores.push({
          id: candidate.id,
          value: rng.value + (candidate.id === o.election.supported ? 0.35 : 0),
        });
      }
      const winner = scores.sort((a, b) => b.value - a.value)[0].id;
      o = {
        ...o,
        unrest: 0,
        election: { ...o.election, resolved: true, winner },
      };
      foreignLeaders[c.id] = CANDIDATES.find((x) => x.id === winner)!.name;
      next = changeRelations(
        {
          ...next,
          countries: {
            ...next.countries,
            [c.id]: {
              ...next.countries[c.id],
              controllerCountryId: null,
              politics: {
                ...c.politics,
                approval: 58,
                stability: clamp(c.politics.stability + 15),
                regime: "democracy",
                electionDaysRemaining: 1460,
              },
            },
          },
        },
        o.controllerId,
        c.id,
        winner === o.election?.supported ? 20 : 8,
      );
      next = note(
        next,
        `ELECTION // ${c.name} independent government elected: ${foreignLeaders[c.id]}.`,
      );
    } else if (o.unrest >= 95) {
      const rng = nextRandom(next.simulationSeed);
      next = { ...next, simulationSeed: rng.seed };
      if (rng.value < 0.12) {
        next = changeRelations(
          {
            ...next,
            countries: {
              ...next.countries,
              [c.id]: {
                ...c,
                controllerCountryId: null,
                politics: { ...c.politics, stability: 25 },
              },
            },
          },
          o.controllerId,
          c.id,
          -35,
        );
        next = note(next, `REBELLION // ${c.name} regained independence.`);
        delete occupations[c.id];
        continue;
      }
    }
    occupations[c.id] = o;
  }
  const campaigns = g.campaigns.map((campaign) => {
    if (campaign.status !== "active" || campaign.endsDay > next.day)
      return campaign;
    const rng = nextRandom(next.simulationSeed);
    next = { ...next, simulationSeed: rng.seed };
    const success =
        politicalChance(next, campaign.targetId) > 0 &&
        rng.value < campaign.chance,
      c = next.countries[campaign.targetId];
    if (success) {
      foreignLeaders[c.id] = "Reform coalition";
      next = changeRelations(
        {
          ...next,
          countries: {
            ...next.countries,
            [c.id]: {
              ...c,
              politics: {
                ...c.politics,
                approval: 50,
                stability: clamp(c.politics.stability + 10),
              },
            },
          },
        },
        next.playerCountryId,
        c.id,
        12,
      );
    } else next = changeRelations(next, next.playerCountryId, c.id, -10);
    next = note(
      next,
      `POLITICAL // ${c.name} campaign ${success ? "succeeded" : "failed"}.`,
    );
    return {
      ...campaign,
      status: success ? ("success" as const) : ("failed" as const),
    };
  });
  return update(next, { academies, occupations, campaigns, foreignLeaders });
}
type CANDIDATES_SCORE = { id: string; value: number };
