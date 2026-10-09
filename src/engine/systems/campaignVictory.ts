import type { CampaignProgress, VictoryPath } from '../../domain/campaign';
import type { CountryState, GameState } from '../../domain/game';
import { blocForCountry } from './blocs';

// Campaign victory (audit E4). Three paths; the first one completed wins the campaign. Pure functions of GameState.
// Progress is tracked in world.campaign (optional; older saves start tracking on load) and exposed to the UI
// through campaignVictoryProgress so the interface never re-implements the rules.

/** Mandate: democracies and republics must win this many elections. */
export const MANDATE_ELECTIONS = 2;
/** Mandate for other regimes: days in power with stability at or above MANDATE_STABILITY (8 years). */
export const MANDATE_DAYS = 2920;
export const MANDATE_STABILITY = 60;
/** Economic leadership: GDP at least this multiple of the GDP at the campaign start (about 3.5% a year over 6–7 years)... */
export const ECONOMIC_GDP_GROWTH = 1.25;
/** ...with approval and inflation in range... */
export const ECONOMIC_MIN_APPROVAL = 50;
export const ECONOMIC_MAX_INFLATION = 10;
/** Diplomatic leadership: allied partners (alliance treaties, or members of a bloc the player leads)... */
export const DIPLOMATIC_PARTNERS = 4;
/** ...with reputation at least this and no active war. */
export const DIPLOMATIC_MIN_REPUTATION = 70;
/** Days the economic or diplomatic conditions must hold without a break. */
export const VICTORY_HOLD_DAYS = 180;
/** No victory before this campaign day, so an early spike cannot end the game. */
export const VICTORY_EARLIEST_DAY = 730;

const DEMOCRATIC = ['democracy', 'republic'];
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export interface VictoryRequirement { label: string; current: number; target: number; comparison: 'atLeast' | 'atMost'; met: boolean; }
export interface VictoryPathProgress {
  path: VictoryPath;
  title: string;
  summary: string;
  requirements: VictoryRequirement[];
  /** Days the conditions have held (economic/diplomatic); undefined for the mandate path. */
  heldDays?: number;
  /** 0..1 overall progress for a progress bar. */
  progress: number;
  complete: boolean;
}

/** Allied partners counted for the diplomatic path: alliance treaties plus other members of a bloc the player leads. */
export function alliedPartners(state: GameState, player: CountryState): number {
  const partners = new Set(Object.entries(player.diplomacy.relations).filter(([id, r]) => r.treaties.includes('alliance') && state.countries[id] && !state.countries[id].annexedBy).map(([id]) => id));
  const bloc = blocForCountry(state, player.id);
  if (bloc && bloc.leaderId === player.id) for (const id of bloc.memberIds) if (id !== player.id && state.countries[id] && !state.countries[id].annexedBy) partners.add(id);
  return partners.size;
}

const atWar = (state: GameState, id: string) => Object.values(state.wars).some((w) => w.status === 'active' && (w.attackerId === id || w.defenderId === id));

/** Fresh tracking record; also used for saves that predate 0.88. */
export function initialCampaignProgress(state: GameState): CampaignProgress {
  const player = state.countries[state.playerCountryId];
  return { reelections: 0, lastElectionDays: player?.politics.electionDaysRemaining ?? 0, startGdp: Math.max(0, player?.economy.gdp ?? 0), startDay: state.day, holdingSince: {} };
}

export function campaignProgress(state: GameState): CampaignProgress {
  return state.world.campaign ?? initialCampaignProgress(state);
}

function conditionsHold(state: GameState, record: CampaignProgress, path: 'economic' | 'diplomatic'): boolean {
  return pathProgress(state, record, path).requirements.every((r) => r.met);
}

function pathProgress(state: GameState, record: CampaignProgress, path: VictoryPath): VictoryPathProgress {
  const player = state.countries[state.playerCountryId];
  const req = (label: string, current: number, target: number, comparison: VictoryRequirement['comparison'] = 'atLeast'): VictoryRequirement =>
    ({ label, current, target, comparison, met: comparison === 'atLeast' ? current >= target : current <= target });
  const ratio = (r: VictoryRequirement) => r.met ? 1 : r.comparison === 'atLeast' ? clamp01(r.target ? r.current / r.target : 0) : clamp01(r.current ? r.target / r.current : 1);
  const tooEarly = state.day < VICTORY_EARLIEST_DAY;

  if (path === 'mandate') {
    const democratic = DEMOCRATIC.includes(player.politics.regime);
    if (democratic) {
      const term = clamp01(1 - player.politics.electionDaysRemaining / 1460);
      const requirements = [req('Elections won', record.reelections, MANDATE_ELECTIONS)];
      const complete = record.reelections >= MANDATE_ELECTIONS;
      return { path, title: 'Enduring Mandate', summary: 'Win two elections in a row.', requirements, progress: complete ? 1 : clamp01((record.reelections + term) / MANDATE_ELECTIONS), complete };
    }
    const requirements = [req('Days in power', state.day - record.startDay, MANDATE_DAYS), req('Stability', player.politics.stability, MANDATE_STABILITY)];
    const complete = requirements.every((r) => r.met);
    return { path, title: 'Enduring Mandate', summary: 'Stay in power for eight years with stability of at least 60.', requirements, progress: complete ? 1 : ratio(requirements[0]) * (requirements[1].met ? 1 : 0.9), complete };
  }

  const since = record.holdingSince[path];
  const heldDays = since === undefined ? 0 : state.day - since;
  const requirements = path === 'economic'
    ? [
        req('GDP growth', Number((record.startGdp > 0 ? player.economy.gdp / record.startGdp : 0).toFixed(3)), ECONOMIC_GDP_GROWTH),
        req('Approval', player.politics.approval, ECONOMIC_MIN_APPROVAL),
        req('Inflation', player.economy.inflation, ECONOMIC_MAX_INFLATION, 'atMost'),
      ]
    : [
        req('Allied partners', alliedPartners(state, player), DIPLOMATIC_PARTNERS),
        req('Reputation', player.diplomacy.reputation, DIPLOMATIC_MIN_REPUTATION),
        req('Active wars', atWar(state, player.id) ? 1 : 0, 0, 'atMost'),
      ];
  const growth = requirements[0];
  const growthProgress = path === 'economic' ? clamp01((growth.current - 1) / (ECONOMIC_GDP_GROWTH - 1)) : ratio(growth);
  const conditions = (growthProgress + requirements.slice(1).reduce((sum, r) => sum + ratio(r), 0)) / requirements.length;
  const allMet = requirements.every((r) => r.met);
  const complete = allMet && heldDays >= VICTORY_HOLD_DAYS && !tooEarly;
  const progress = complete ? 1 : conditions * 0.8 + (allMet ? clamp01(heldDays / VICTORY_HOLD_DAYS) * 0.2 : 0);
  const summary = path === 'economic'
    ? 'Grow GDP by 25% with approval of at least 50 and inflation of at most 10%, for 180 days.'
    : 'Hold four allied partners with reputation of at least 70 and no active war, for 180 days.';
  return { path, title: path === 'economic' ? 'Economic Leadership' : 'Regional Leadership', summary, requirements, heldDays, progress, complete };
}

/** Progress on every victory path, for the Goals rail and the victory overlay. */
export function campaignVictoryProgress(state: GameState): VictoryPathProgress[] {
  if (!state.countries[state.playerCountryId]) return [];
  const record = campaignProgress(state);
  return (['mandate', 'economic', 'diplomatic'] as const).map((path) => pathProgress(state, record, path));
}

/** Daily update: counts won elections, tracks how long conditions hold and ends the campaign in victory. */
export function processCampaignVictory(state: GameState): GameState {
  const player = state.countries[state.playerCountryId];
  if (state.campaignStatus !== 'active' || !player) return state;
  const previous = campaignProgress(state);
  if (previous.achieved) return state;

  const electionWon = DEMOCRATIC.includes(player.politics.regime) && player.politics.electionDaysRemaining > previous.lastElectionDays;
  const record: CampaignProgress = { ...previous, reelections: previous.reelections + (electionWon ? 1 : 0), lastElectionDays: player.politics.electionDaysRemaining, holdingSince: { ...previous.holdingSince } };
  for (const path of ['economic', 'diplomatic'] as const) {
    if (!conditionsHold(state, record, path)) delete record.holdingSince[path];
    else record.holdingSince[path] ??= state.day;
  }
  const won = (['mandate', 'economic', 'diplomatic'] as const).find((path) => pathProgress(state, record, path).complete);
  const tracked: GameState = { ...state, world: { ...state.world, campaign: won ? { ...record, achieved: { path: won, day: state.day } } : record } };
  if (!won) return tracked;
  const title = pathProgress(state, record, won).title;
  return { ...tracked, campaignStatus: 'won', speed: 0, sitrep: [`CAMPAIGN VICTORY // ${title} achieved on day ${state.day}.`, ...state.sitrep].slice(0, 12) };
}

/** After a victory, the player may keep playing: the campaign becomes a sandbox and no further victory is awarded. */
export function continueAfterVictory(state: GameState): GameState {
  const record = state.world.campaign;
  if (state.campaignStatus !== 'won' || !record?.achieved) return state;
  return { ...state, campaignStatus: 'active', speed: 0, world: { ...state.world, campaign: { ...record, sandbox: true } }, sitrep: ['CAMPAIGN // Sandbox play continues after victory.', ...state.sitrep].slice(0, 12) };
}

export function achievedVictory(state: GameState): VictoryPathProgress | undefined {
  const achieved = state.world.campaign?.achieved;
  return achieved ? campaignVictoryProgress(state).find((p) => p.path === achieved.path) : undefined;
}
