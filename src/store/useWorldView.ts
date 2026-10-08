import {useShallow} from 'zustand/react/shallow';
import {useGameStore} from './gameStore';
// Simulation panels do not rerender for unrelated camera controls, receipts or save messages.
// Keep the full GameState contract, plus stable actions and workspace selection.
export function useWorldView() {
 return useGameStore(useShallow(s=>{
  const {actionReceipt,navigation,mapZoomSensitivity,mapLabelScale,mapProjection,mapControlCommand,saveMessage,...worldView}=s;
  return worldView;
 }));
}
