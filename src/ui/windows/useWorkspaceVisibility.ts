import {useRef} from 'react';
import {useGameStore} from '../../store/gameStore';
import {marketTool} from '../../store/workspaceNavigation';
/** Keep parent controls mounted, but release their focus/Escape ownership while a child is open. */
export function useWorkspaceVisibility() {
  const tool = useGameStore(s => s.activeTool);
  const country = useGameStore(s => s.selectedCountryId);
  const war = useGameStore(s => s.warWindowId);
  const owner = useRef({tool, country, war});
  return (marketTool(tool) && marketTool(owner.current.tool)) ||
    (tool === owner.current.tool && country === owner.current.country && war === owner.current.war);
}
