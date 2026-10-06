import { useEffect, useRef } from 'react';
import { saveGame } from '../persistence/saveGame';
import { useGameStore } from '../store/gameStore';

export function useAutosave() {
  const day = useGameStore((state) => state.day);
  const campaignStatus = useGameStore((state) => state.campaignStatus);
  const lastSavedDay = useRef(0);

  useEffect(() => {
    if (campaignStatus !== 'active' || day < 5 || day % 5 !== 0 || lastSavedDay.current === day) return;
    lastSavedDay.current = day;
    const state = useGameStore.getState();
    void saveGame(state, 'autosave', `Autosave · Day ${day}`).then(() => {
      useGameStore.getState().setSaveMessage(`Autosaved Day ${day}`);
    }).catch(() => {
      useGameStore.getState().setSaveMessage('Autosave failed');
    });
  }, [campaignStatus, day]);
}
