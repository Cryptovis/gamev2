import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
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
  const navigationCountry = useGameStore((s) => s.navigation?.countryId ?? null);
  // Returning to the map unmounts this component (App renders it only while a country is selected or kept in the
  // workspace trail), so the dossier choice ends there and selecting the country again opens its hub.
  const [dossierFor, setDossierFor] = useState<string | null>(null);
  const view = workspaceForSelection({ playerCountryId, selectedCountryId: liveSelection, navigation: navigationCountry ? { countryId: navigationCountry } : null }, selectedCountryId, dossierFor);
  if (view === 'none') return null;
  if (view === 'panel') return <CountryPanel onBrowse={setDossierFor} />;
  return <TargetCountryModal key={selectedCountryId} countryId={selectedCountryId} onOpenDossier={() => setDossierFor(selectedCountryId)} />;
}
