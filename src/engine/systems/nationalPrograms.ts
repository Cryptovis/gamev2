import type { GameState } from "../../domain/game";
import { MAX_PRODUCTIVITY } from "./ministries";
import { actionEffectMultiplier, publicGain, recordActionUse, scaledCostB } from "./policyPressure";
export const PROGRAMS = {
  jobs: {
    title: "Employment Initiative",
    cost: 3,
    days: 14,
    description:
      "Reduce unemployment by 1 percentage point and raise approval by 1.",
  },
  education: {
    title: "Science Scholarships",
    cost: 4,
    days: 21,
    description: "Gain 12 research points and 1 productivity.",
  },
  health: {
    title: "Community Health",
    cost: 3,
    days: 14,
    description: "Gain 2 cohesion and 1 stability.",
  },
};
export type ProgramKind = keyof typeof PROGRAMS;
/** GDP-scaled cost (audit C15) for the given country; `PROGRAMS[kind].cost` is the reference-economy base. */
export function programCost(state: GameState, kind: ProgramKind, countryId = state.playerCountryId): number {
  return scaledCostB(state.countries[countryId], PROGRAMS[kind].cost);
}
/** Dialog preview: scaled cost and the share of the effect left after repeat fatigue. */
export function programPreview(state: GameState, kind: ProgramKind) {
  return { cost: programCost(state, kind), multiplier: actionEffectMultiplier(state, state.playerCountryId, `program/${kind}`) };
}
export function startProgram(state: GameState, kind: ProgramKind): GameState {
  const d = PROGRAMS[kind],
    c = state.countries[state.playerCountryId],
    programs = state.world.programs ?? [];
  if (
    !d ||
    c.economy.treasury < programCost(state, kind) ||
    programs.some((p) => p.kind === kind && p.status === "active")
  )
    return state;
  // Repeat fatigue (audit C4): the completed programme delivers this share of its effect.
  const strength = actionEffectMultiplier(state, c.id, `program/${kind}`);
  return recordActionUse({
    ...state,
    countries: {
      ...state.countries,
      [c.id]: {
        ...c,
        economy: { ...c.economy, treasury: c.economy.treasury - programCost(state, kind) },
      },
    },
    world: {
      ...state.world,
      programs: [
        {
          id: `${kind}-${state.day}`,
          kind,
          readyDay: state.day + d.days,
          status: "active" as const,
          strength,
        },
        ...programs,
      ].slice(0, 40),
    },
  }, c.id, `program/${kind}`);
}
export function processPrograms(state: GameState): GameState {
  let c = state.countries[state.playerCountryId];
  const notices: string[] = [];
  const programs = (state.world.programs ?? []).map((p) => {
    if (p.status !== "active" || p.readyDay > state.day) return p;
    const m = p.strength ?? 1;
    if (p.kind === "jobs")
      c = {
        ...c,
        economy: {
          ...c.economy,
          unemployment: Math.max(0, c.economy.unemployment - 1 * m),
        },
        politics: {
          ...c.politics,
          approval: publicGain(c.politics.approval, 1, m),
        },
      };
    if (p.kind === "education")
      c = {
        ...c,
        economy: {
          ...c.economy,
          productivity: Math.min(MAX_PRODUCTIVITY, c.economy.productivity + 1 * m),
        },
        technology: {
          ...c.technology,
          researchPoints: c.technology.researchPoints + 12 * m,
        },
      };
    if (p.kind === "health")
      c = {
        ...c,
        society: {
          ...c.society,
          cohesion: publicGain(c.society.cohesion, 2, m),
        },
        politics: {
          ...c.politics,
          stability: publicGain(c.politics.stability, 1, m),
        },
      };
    notices.push(`PROGRAM // ${PROGRAMS[p.kind].title} completed.`);
    return { ...p, status: "completed" as const };
  });
  return {
    ...state,
    countries: { ...state.countries, [c.id]: c },
    world: { ...state.world, programs },
    sitrep: [...notices, ...state.sitrep].slice(0, 12),
  };
}
