import type {GameCommand} from '../../domain/commands';
import {activeCountries} from '../../domain/sovereignty';
import {createLiving} from './livingEconomy';
import {createGovernance} from './governance';
import type { CountryState, GameState, ReligionType } from "../../domain/game";
import type {
  InstitutionId,
  VoteChoice,
  WorldState,
  WorldBallot,
} from "../../domain/world";
import { relationFor, changeRelations } from "./diplomacy";
import { BASE_COST_B, scaledCostB } from "./policyPressure";
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
function roll(seed: number, key: string) {
  let h = seed >>> 0;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}
export const INSTITUTIONS = {
  un: {
    name: "United Nations",
    short: "UN",
    description:
      "Game assembly: one member, one vote; decisions close after 5 days.",
    benefit: "+0.03 influence/day",
    cost: 5,
  },
  who: {
    name: "World Health Organization",
    short: "WHO",
    description:
      "Game health partnership: improve domestic cohesion through cooperation.",
    benefit: "+0.02 cohesion/day",
    cost: 6,
  },
  security: {
    name: "Security Council",
    short: "SC",
    description: "Game security forum; unlocks a stronger diplomatic voice.",
    benefit: "+0.05 influence/day",
    cost: 10,
  },
};
export function createWorld(
  countries: Record<string, CountryState>,
  playerId: string,
): WorldState {
  const ids = Object.keys(countries).filter((id) => id !== playerId);
  return {governance:createGovernance(countries),living:createLiving(countries),
    members: {
      un: ids,
      who: ids.filter((id) => countries[id].politics.stability >= 40),
      security: ids
        .sort(
          (a, b) =>
            countries[b].diplomacy.reputation -
            countries[a].diplomacy.reputation,
        )
        .slice(0, 15),
    },
    ballots: [],
    missions: [],
    religiousShares: Object.fromEntries(
      Object.values(countries).map((c) => [
        c.id,
        c.society.dominantReligion === "unaffiliated"
          ? { unaffiliated: 75, folk_or_mixed: 25 }
          : c.society.dominantReligion === "folk_or_mixed"
            ? { folk_or_mixed: 80, unaffiliated: 20 }
            : {
                [c.society.dominantReligion]: 70,
                unaffiliated: 20,
                folk_or_mixed: 10,
              },
      ]),
    ),
    tutorial: { active: false, step: 0, completed: false },
    lastAiProposalDay: 0,
  };
}
export function membershipRequirements(state: GameState, id: InstitutionId, actorId=state.playerCountryId) {
  const c = state.countries[actorId],
    inf = state.council.influenceByCountry[c.id] ?? 0;
  const checks = [
    { label: "Stability ≥ 45", met: c.politics.stability >= 45 },
    { label: "Reputation ≥ 35", met: c.diplomacy.reputation >= 35 },
    {
      label: "No active wars or sanctions",
      met:
        !c.globalSanctions &&
        !Object.values(state.wars).some(
          (w) =>
            w.status === "active" &&
            (w.attackerId === c.id || w.defenderId === c.id),
        ),
    },
  ];
  if (id === "who")
    checks.push({
      label: "Social Resilience researched",
      met: c.technology.unlocked.includes("soc-resilience"),
    });
  if (id === "security")
    checks.push(
      {
        label: "Assembly membership",
        met: state.world.members.un.includes(c.id),
      },
      {
        label: "Diplomatic Leadership researched",
        met: c.technology.unlocked.includes("soc-diplomatic-leadership"),
      },
      { label: "Influence ≥ 50", met: inf >= 50 },
      {
        label: "Three embassies",
        met:
          Object.values(state.embassies).filter(
            (e) => e.countryA === c.id || e.countryB === c.id,
          ).length >= 3,
      },
    );
  checks.push({
    label: `Influence fee: ${INSTITUTIONS[id].cost}`,
    met: inf >= INSTITUTIONS[id].cost,
  });
  return checks;
}
function castAiVotes(state: GameState, b: WorldBallot) {
  const voters = state.world.members[b.institution];
  const votes = { ...b.votes };
  for (const id of voters) {
    if (id === state.playerCountryId) continue;
    const c = state.countries[id],
      rel = relationFor(c, b.proposerId),
      targetRel = relationFor(c, b.targetId);
    const proposer = state.countries[b.proposerId];
    const inf = state.council.influenceByCountry[b.proposerId] ?? 20;
    const leadership = proposer.technology.unlocked.includes(
      "soc-diplomatic-leadership",
    )
      ? 8
      : 0;
    const inclination =
      b.kind === "membership"
        ? 50 +
          rel.score * 0.4 +
          (proposer.diplomacy.reputation - 40) * 0.35 +
          inf * 0.12 +
          leadership
        : 15 +
          rel.score * 0.3 -
          targetRel.score * 0.4 +
          (targetRel.status === "war" ? 35 : 0) +
          leadership;
    const threshold = clamp(inclination, 5, 95);
    const n = roll(state.simulationSeed, b.id + id) * 100;
    votes[id] = n < threshold ? "yes" : n > 92 ? "abstain" : "no";
  }
  return { ...b, votes };
}
function addBallot(
  state: GameState,
  kind: WorldBallot["kind"],
  institution: InstitutionId,
  targetId: string,
  proposerId = state.playerCountryId,
): GameState {
  const b: WorldBallot = {
    id: `${kind}-${institution}-${proposerId}-${targetId}-${state.day}`,
    kind,
    institution,
    proposerId,
    targetId,
    openedDay: state.day,
    closesDay: state.day + 5,
    votes: {},
    status: "open",
  };
  return {
    ...state,
    world: {
      ...state.world,
      ballots: [castAiVotes(state, b), ...state.world.ballots].slice(0, 60),
    },
  };
}
type WorldProposalCommand = Extract<GameCommand,{type:'world/membership'|'world/attackProposal'}>;
export const ATTACK_PROPOSAL_COST=8;

/** The player dispatcher and AI use the same actor-aware proposal validator and executor. */
export function validateWorldProposal(state:GameState,command:WorldProposalCommand,actorId=state.playerCountryId):boolean {
  const actor=state.countries[actorId];
  if(!actor||actor.annexedBy)return false;
  const influence=state.council.influenceByCountry[actorId]??0;
  if(!Number.isFinite(influence))return false;
  if(command.type==='world/membership'){
    if(!Object.hasOwn(INSTITUTIONS,command.id)||state.world.members[command.id].includes(actorId)
      ||membershipRequirements(state,command.id,actorId).some(c=>!c.met)
      ||state.world.ballots.some(b=>b.kind==='membership'&&b.institution===command.id&&b.proposerId===actorId&&b.status==='open'))return false;
    const last=state.world.ballots.find(b=>b.kind==='membership'&&b.institution===command.id&&b.proposerId===actorId);
    return !last||state.day>=last.closesDay+30;
  }
  const target=state.countries[command.id];
  return !!target&&!target.annexedBy&&command.id!==actorId&&state.world.members.un.includes(actorId)
    && influence>=ATTACK_PROPOSAL_COST
    && !state.world.ballots.some(b=>b.kind==='attack'&&b.proposerId===actorId&&b.targetId===command.id&&b.status==='open');
}
export function executeWorldProposal(state:GameState,command:WorldProposalCommand,actorId=state.playerCountryId):GameState {
  if(!validateWorldProposal(state,command,actorId))return state;
  const membership=command.type==='world/membership';
  const institution=membership?command.id:'un';
  const cost=membership?INSTITUTIONS[command.id].cost:ATTACK_PROPOSAL_COST;
  const influence=state.council.influenceByCountry[actorId]??0;
  return addBallot({...state,council:{...state.council,influenceByCountry:{...state.council.influenceByCountry,[actorId]:influence-cost}}},
    membership?'membership':'attack',institution,membership?actorId:command.id,actorId);
}
export function applyMembership(state:GameState,id:InstitutionId):GameState {
  return executeWorldProposal(state,{type:'world/membership',id});
}
export function proposeAttack(state:GameState,targetId:string):GameState {
  return executeWorldProposal(state,{type:'world/attackProposal',id:targetId});
}
export function voteWorld(
  state: GameState,
  id: string,
  choice: VoteChoice,
): GameState {
  const b = state.world.ballots.find((b) => b.id === id);
  if (
    !b ||
    b.status !== "open" ||
    state.day >= b.closesDay ||
    !state.world.members[b.institution].includes(state.playerCountryId)
  )
    return state;
  return {
    ...state,
    world: {
      ...state.world,
      ballots: state.world.ballots.map((item) =>
        item.id === id
          ? {
              ...item,
              votes: { ...item.votes, [state.playerCountryId]: choice },
            }
          : item,
      ),
    },
  };
}
export function ballotCount(b: WorldBallot) {
  const values = Object.values(b.votes);
  return {
    yes: values.filter((v) => v === "yes").length,
    no: values.filter((v) => v === "no").length,
    abstain: values.filter((v) => v === "abstain").length,
  };
}
/** Pure preview shared with command execution; inspecting an action never consumes RNG. */
export function previewOutreach(state:GameState,targetId:string) {
  const player=state.countries[state.playerCountryId],target=state.countries[targetId];
  const cost=scaledCostB(player,BASE_COST_B.worldOutreach);
  const coolingDown=state.world.missions.some(m=>m.targetId===targetId&&(m.status==='active'||state.day<m.endsDay+60));
  const relation=target?relationFor(player,targetId).score:0;
  const allowed=!!target&&!target.annexedBy&&targetId!==player.id&&player.economy.treasury>=cost&&relation>=0&&!coolingDown;
  const chance=target?clamp(0.25+relation*0.003+(state.culturalInfluence[targetId]??0)*0.002,0.15,0.75):0;
  return {allowed,cost,chance,treasuryAfter:player.economy.treasury-cost};
}
export function startOutreach(state:GameState,targetId:string,religion:ReligionType):GameState {
  const {allowed,cost,chance}=previewOutreach(state,targetId);
  if(!allowed)return state;
  const player=state.countries[state.playerCountryId];
  return {
    ...state,
    countries: {
      ...state.countries,
      [player.id]: {
        ...player,
        economy: { ...player.economy, treasury: player.economy.treasury - cost },
      },
    },
    world: {
      ...state.world,
      missions: [
        {
          id: `outreach-${targetId}-${state.day}`,
          targetId,
          religion,
          startedDay: state.day,
          endsDay: state.day + 30,
          chance,
          status: "active" as const,
          effect: 0,
        },
        ...state.world.missions,
      ].slice(0, 100),
    },
  };
}
export function processWorldInstitutions(state: GameState): GameState {
  let next = state;
  const world = {
    ...state.world,
    members: { ...state.world.members },
    religiousShares: { ...state.world.religiousShares },
  };
  const notices: string[] = [];
  world.ballots = world.ballots.map((b) => {
    if (b.status !== "open" || b.closesDay > state.day) return b;
    const { yes, no } = ballotCount(b);
    const passed = yes > no && yes > 0 && !state.countries[b.proposerId]?.annexedBy && !state.countries[b.targetId]?.annexedBy;
    if (passed && b.kind === "membership")
      world.members[b.institution] = Array.from(
        new Set([...world.members[b.institution], b.proposerId]),
      );
    notices.push(
      `WORLD // ${INSTITUTIONS[b.institution].short} ${b.kind} vote: ${yes} yes / ${no} no — ${passed ? "PASSED" : "REJECTED"}.`,
    );
    return { ...b, status: passed ? "passed" : "rejected" };
  });
  world.missions = world.missions.map((m) => {
    if (m.status !== "active" || m.endsDay > state.day) return m;
    const success = roll(state.simulationSeed, m.id) < m.chance;
    const shares = { ...(world.religiousShares[m.targetId] ?? {}) };
    let effect = 0;
    if (success) {
      const old = shares[m.religion] ?? 0;
      effect = Math.min(
        0.1 + roll(state.simulationSeed, m.id + "effect") * 0.4,
        100 - old,
      );
      for (const key of Object.keys(shares) as ReligionType[])
        if (key !== m.religion)
          shares[key] =
            ((shares[key] ?? 0) * (100 - old - effect)) /
            Math.max(0.001, 100 - old);
      shares[m.religion] = old + effect;
      world.religiousShares[m.targetId] = shares;
    }
    notices.push(
      `OUTREACH // ${state.countries[m.targetId].name}: ${success ? `+${effect.toFixed(2)} percentage points` : "no measurable change"}.`,
    );
    return { ...m, status: success ? "success" : "failed", effect };
  });
  const influenceByCountry={...next.council.influenceByCountry},countries={...next.countries};
  for(const country of activeCountries(next.countries)){
    const bonus=(world.members.un.includes(country.id)?0.03:0)
      +(world.members.security.includes(country.id)?0.05:0)
      +(country.technology.unlocked.includes('soc-public-diplomacy')?0.04:0);
    if(bonus)influenceByCountry[country.id]=Math.min(100,(influenceByCountry[country.id]??0)+bonus);
    if(world.members.who.includes(country.id))countries[country.id]={...country,society:{...country.society,cohesion:Math.min(100,country.society.cohesion+0.02)}};
  }
  next={...next,world,countries,council:{...next.council,influenceByCountry},sitrep:[...notices,...next.sitrep].slice(0,12)};
  if (state.day % 30 === 0 && world.lastAiProposalDay !== state.day) {
    const conflict = Object.values(state.wars).find(
      (w) =>
        w.status === "active" &&
        w.attackerId !== state.playerCountryId &&
        validateWorldProposal(next,{type:'world/attackProposal',id:w.defenderId},w.attackerId) &&
        !world.ballots.some(
          (b) =>
            b.kind === "attack" &&
            b.proposerId === w.attackerId &&
            b.targetId === w.defenderId,
        ),
    );
    if(conflict)next=executeWorldProposal(next,{type:'world/attackProposal',id:conflict.defenderId},conflict.attackerId);
    next = { ...next, world: { ...next.world, lastAiProposalDay: state.day } };
  }
  for (const b of next.world.ballots) {
    if (
      b.kind === "attack" &&
      b.status === "rejected" &&
      !b.condemned &&
      Object.values(next.wars).some(
        (w) =>
          w.status === "active" &&
          w.attackerId === b.proposerId &&
          w.defenderId === b.targetId,
      ) &&
      next.world.ballots.find(
        (x) =>
          x.kind === "attack" &&
          x.proposerId === b.proposerId &&
          x.targetId === b.targetId &&
          x.status !== "open",
      )?.id === b.id
    )
      next = condemnBallot(next, b);
  }
  return next;
}
function condemnBallot(state: GameState, b: WorldBallot): GameState {
  let next = state;
  const attackerId = b.proposerId,
    targetId = b.targetId;
  for (const c of activeCountries(next.countries)) {
    if (c.id === attackerId) continue;
    if (
      b.votes[c.id] === "no" ||
      c.id === targetId ||
      relationFor(c, targetId).treaties.includes("alliance")
    )
      next = changeRelations(next, attackerId, c.id, -20);
  }
  const c = next.countries[attackerId];
  return {
    ...next,
    countries: {
      ...next.countries,
      [attackerId]: {
        ...c,
        diplomacy: {
          ...c.diplomacy,
          reputation: Math.max(0, c.diplomacy.reputation - 10),
        },
      },
    },
    world: {
      ...next.world,
      ballots: next.world.ballots.map((x) =>
        x.id === b.id ? { ...x, condemned: true } : x,
      ),
    },
    sitrep: [
      `WORLD // ${c.name} attacked despite a rejected resolution: condemnation, -10 reputation, -20 relations with opposing states and target allies.`,
      ...next.sitrep,
    ].slice(0, 12),
  };
}
export function applyWarCondemnation(
  before: GameState,
  after: GameState,
  attackerId: string,
  targetId: string,
): GameState {
  if (
    after === before ||
    !Object.values(after.wars).some(
      (w) =>
        w.status === "active" &&
        w.attackerId === attackerId &&
        w.defenderId === targetId &&
        !before.wars[w.id],
    )
  )
    return after;
  const b = before.world.ballots.find(
    (b) =>
      b.kind === "attack" &&
      b.proposerId === attackerId &&
      b.targetId === targetId &&
      b.status !== "open",
  );
  return b?.status === "rejected" && !b.condemned
    ? condemnBallot(after, b)
    : after;
}
