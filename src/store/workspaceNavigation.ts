import type { FacilityKind, IndustrialGood } from '../domain/industrial';

export type CountryTab = 'overview' | 'policies' | 'economy' | 'trade' | 'production' | 'diplomacy' | 'military' | 'intel' | 'cabinet' | 'technology' | 'world' | 'war';
export type WorkspaceDestination =
  | { kind: 'country-hub'; countryId: string }
  | { kind: 'country-info'; countryId: string }
  | { kind: 'country-panel'; countryId: string; tab: CountryTab }
  | { kind: 'operational-assessment'; targetCountryId: string }
  | { kind: 'fuel-help'; targetCountryId: string }
  | { kind: 'factory'; focusedFactory: FacilityKind }
  | { kind: 'market'; tab: 'open' | 'contracts'; focusedGood?: IndustrialGood }
  | { kind: 'diplomatic-inbox'; tab: 'offers' | 'correspondence'; countryId?: string }
  | { kind: 'news'; filter: 'all' | 'wars' | 'diplomacy' | 'trade' };
/** UI-only context. Never serialized into GameState or used to authorize an engine command. */
export type WorkspaceIntent = WorkspaceDestination & { returnTo?: WorkspaceDestination };
export interface WorkspaceNavigation {
  panel: string;
  countryId: string;
  nonce: number;
  intent?: WorkspaceIntent;
}
export function countryPanelNavigation(navigation: WorkspaceNavigation | null | undefined) {
  if (navigation?.intent) return navigation.intent.kind === 'country-panel' || navigation.intent.kind === 'factory';
  return !!navigation && ['overview','policies','economy','trade','production','diplomacy','military','intel','cabinet','technology','world','war'].includes(navigation.panel);
}
export interface WorkspaceFrame {
  selectedCountryId: string | null;
  activeTool: string | null;
  warWindowId: string | null;
  navigation: WorkspaceNavigation | null;
}

/** Adapt semantic destinations to the existing country/tool/trail machinery, not a second router. */
export function intentFrame(intent: WorkspaceIntent, playerCountryId: string, nonce: number): WorkspaceFrame {
  let selectedCountryId: string | null = null, activeTool: string | null = null;
  let countryId = playerCountryId, panel: string = intent.kind;
  switch (intent.kind) {
    case 'country-hub': case 'country-info':
      selectedCountryId = countryId = intent.countryId; break;
    case 'country-panel':
      selectedCountryId = countryId = intent.countryId; panel = intent.tab; break;
    case 'operational-assessment':
      selectedCountryId = countryId = intent.targetCountryId; break;
    case 'fuel-help': activeTool = 'help'; countryId = intent.targetCountryId; break;
    case 'factory': selectedCountryId = playerCountryId; panel = 'production'; break;
    case 'market': activeTool = 'market'; break;
    case 'diplomatic-inbox':
      activeTool = intent.tab === 'offers' ? 'desk' : 'diplomacy'; countryId = intent.countryId ?? playerCountryId; break;
    case 'news': activeTool = 'sitrep'; break;
  }
  return { selectedCountryId, activeTool, warWindowId: null, navigation: { panel, countryId, nonce, intent } };
}
export function intentCountry(intent: WorkspaceDestination): string | undefined {
  return 'targetCountryId' in intent ? intent.targetCountryId : 'countryId' in intent ? intent.countryId : undefined;
}
export function sameDestination(intent: WorkspaceIntent | undefined, destination: WorkspaceDestination) {
  if (!intent) return false;
  const { returnTo, ...current } = intent;
  const entries=Object.entries(current);
  return entries.length===Object.keys(destination).length&&entries.every(([key,value])=>Reflect.get(destination,key)===value);
}
const countryLayer = (frame: Partial<WorkspaceFrame>) => {
  const kind = frame.navigation?.intent?.kind;
  return kind === 'operational-assessment' || kind === 'country-info' || kind === 'country-hub' ? kind : 'country-panel';
};
export const marketTool = (tool: string | null) => !!tool && ['market', 'exchange', 'credit'].includes(tool);
export function workspaceParent(state: WorkspaceFrame & { workspaceTrail: WorkspaceFrame[] }, next: Partial<WorkspaceFrame>, remember = true) {
  const sameLayer = countryLayer(next) === countryLayer(state);
  const same = next.activeTool === state.activeTool && next.selectedCountryId === state.selectedCountryId && next.warWindowId === state.warWindowId && sameLayer;
  const sameCountry = !!next.selectedCountryId && !!state.selectedCountryId && !next.activeTool && !next.warWindowId && sameLayer;
  const sameMarket = marketTool(next.activeTool ?? null) && marketTool(state.activeTool);
  return !remember ? [] : same || sameMarket || sameCountry ? state.workspaceTrail : state.activeTool || state.selectedCountryId || state.warWindowId
    ? [...state.workspaceTrail, { selectedCountryId: state.selectedCountryId, activeTool: state.activeTool, warWindowId: state.warWindowId, navigation: state.navigation }].slice(-16)
    : state.workspaceTrail;
}

/** National sections share a frame while their selected country changes. */
export function workspaceVisible(owner:Pick<WorkspaceFrame,'activeTool'|'selectedCountryId'|'warWindowId'> & Partial<Pick<WorkspaceFrame,'navigation'>>,current:Pick<WorkspaceFrame,'activeTool'|'selectedCountryId'|'warWindowId'> & Partial<Pick<WorkspaceFrame,'navigation'>>) {
  const countryFrame=!!owner.selectedCountryId&&!!current.selectedCountryId&&!owner.activeTool&&!current.activeTool&&!owner.warWindowId&&!current.warWindowId&&countryLayer(owner)===countryLayer(current);
  return countryFrame || (marketTool(owner.activeTool)&&marketTool(current.activeTool)) ||
    (owner.activeTool===current.activeTool&&owner.selectedCountryId===current.selectedCountryId&&owner.warWindowId===current.warWindowId&&countryLayer(owner)===countryLayer(current));
}
