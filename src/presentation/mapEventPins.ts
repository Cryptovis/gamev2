import { create } from 'zustand';

export const useMapEventPins = create<{ enabled: boolean; setEnabled: (enabled: boolean) => void }>((set) => ({
  enabled: true,
  setEnabled: (enabled) => set({ enabled }),
}));
