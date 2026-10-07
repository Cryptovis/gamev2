import type { GameState } from "../../domain/game";
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
export function startProgram(state: GameState, kind: ProgramKind): GameState {
  const d = PROGRAMS[kind],
    c = state.countries[state.playerCountryId],
    programs = state.world.programs ?? [];
  if (
    !d ||
    c.economy.treasury < d.cost ||
    programs.some((p) => p.kind === kind && p.status === "active")
  )
    return state;
  return {
    ...state,
    countries: {
      ...state.countries,
      [c.id]: {
        ...c,
        economy: { ...c.economy, treasury: c.economy.treasury - d.cost },
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
        },
        ...programs,
      ].slice(0, 40),
    },
  };
}
export function processPrograms(state: GameState): GameState {
  let c = state.countries[state.playerCountryId];
  const notices: string[] = [];
  const programs = (state.world.programs ?? []).map((p) => {
    if (p.status !== "active" || p.readyDay > state.day) return p;
    if (p.kind === "jobs")
      c = {
        ...c,
        economy: {
          ...c.economy,
          unemployment: Math.max(0, c.economy.unemployment - 1),
        },
        politics: {
          ...c.politics,
          approval: Math.min(100, c.politics.approval + 1),
        },
      };
    if (p.kind === "education")
      c = {
        ...c,
        economy: {
          ...c.economy,
          productivity: Math.min(150, c.economy.productivity + 1),
        },
        technology: {
          ...c.technology,
          researchPoints: c.technology.researchPoints + 12,
        },
      };
    if (p.kind === "health")
      c = {
        ...c,
        society: {
          ...c.society,
          cohesion: Math.min(100, c.society.cohesion + 2),
        },
        politics: {
          ...c.politics,
          stability: Math.min(100, c.politics.stability + 1),
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
