import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { countryPanelNavigation } from '../../store/workspaceNavigation';
import { CountryPanel } from './CountryPanel';
import { TargetCountryModal } from './TargetCountryModal';
import { workspaceForSelection } from './targetCountryHub';

/**
 * Phase 6.1: the player's own nation keeps the full country panel; another nation opens the diplomatic hub first.
 * "Full Dossier" (UI state only, never saved) switches that country to the full panel until the selection closes;
 * choosing another country from the full panel's own country list keeps the full panel. Map and ranking clicks open the hub.
 */
export function CountryWorkspace({ selectedCountryId }: { selectedCountryId: string }) {
  const playerCountryId = useGameStore((s) => s.playerCountryId);
  const liveSelection = useGameStore((s) => s.selectedCountryId);
  const navigation = useGameStore((s) => s.navigation);
  // Returning to the map unmounts this component (App renders it only while a country is selected or kept in the
  // workspace trail), so the dossier choice ends there and selecting the country again opens its hub.
  const [dossierFor, setDossierFor] = useState<string | null>(null);
  const view = workspaceForSelection({ playerCountryId, selectedCountryId: liveSelection, navigation }, selectedCountryId, dossierFor);
  const assessmentParent = useGameStore(s => [...s.workspaceTrail].reverse().find(f => f.navigation?.intent?.kind === 'operational-assessment')?.selectedCountryId);
  const hubId = view === 'hub' ? selectedCountryId : assessmentParent;
  const panelParent = useGameStore(s => s.workspaceTrail.some(f => f.selectedCountryId === selectedCountryId && countryPanelNavigation(f.navigation)));
  const retainPanel = navigation?.intent?.kind === 'operational-assessment' && (dossierFor === selectedCountryId || panelParent);
  // Keep the assessment mounted when a player-owned factory replaces its country selection.
  // Its lifecycle/scroll ownership is suspended until the exact parent frame returns.
  return <>
    {(view === 'panel' || retainPanel) && <CountryPanel onBrowse={setDossierFor} suspended={view !== 'panel'} />}
    {hubId && <TargetCountryModal key={hubId} countryId={hubId} onOpenDossier={() => setDossierFor(hubId)} />}
  </>;
}
