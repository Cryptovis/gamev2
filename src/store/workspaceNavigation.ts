export interface WorkspaceFrame {
  selectedCountryId: string | null;
  activeTool: string | null;
  warWindowId: string | null;
  navigation: { panel: string; countryId: string; nonce: number } | null;
}
export const marketTool = (tool: string | null) => !!tool && ['market', 'exchange', 'credit'].includes(tool);
export function workspaceParent(state: WorkspaceFrame & { workspaceTrail: WorkspaceFrame[] }, next: Partial<WorkspaceFrame>, remember = true) {
  const same = next.activeTool === state.activeTool && next.selectedCountryId === state.selectedCountryId && next.warWindowId === state.warWindowId;
  const sameCountry = !!next.selectedCountryId && !!state.selectedCountryId && !next.activeTool && !next.warWindowId;
  const sameMarket = marketTool(next.activeTool ?? null) && marketTool(state.activeTool);
  return !remember ? [] : same || sameMarket || sameCountry ? state.workspaceTrail : state.activeTool || state.selectedCountryId || state.warWindowId
    ? [...state.workspaceTrail, { selectedCountryId: state.selectedCountryId, activeTool: state.activeTool, warWindowId: state.warWindowId, navigation: state.navigation }].slice(-16)
    : state.workspaceTrail;
}

/** National sections share a frame while their selected country changes. */
export function workspaceVisible(owner:Pick<WorkspaceFrame,'activeTool'|'selectedCountryId'|'warWindowId'>,current:Pick<WorkspaceFrame,'activeTool'|'selectedCountryId'|'warWindowId'>) {
  const countryFrame=!!owner.selectedCountryId&&!!current.selectedCountryId&&!owner.activeTool&&!current.activeTool&&!owner.warWindowId&&!current.warWindowId;
  return countryFrame || (marketTool(owner.activeTool)&&marketTool(current.activeTool)) ||
    (owner.activeTool===current.activeTool&&owner.selectedCountryId===current.selectedCountryId&&owner.warWindowId===current.warWindowId);
}
