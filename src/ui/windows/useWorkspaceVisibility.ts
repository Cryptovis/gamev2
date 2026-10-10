import {useRef} from 'react';
import {useGameStore} from '../../store/gameStore';
import {workspaceVisible} from '../../store/workspaceNavigation';
/** Keep parent controls mounted, but release their focus/Escape ownership while a child is open. */
export function useWorkspaceVisibility() {
  const tool = useGameStore(s => s.activeTool);
  const country = useGameStore(s => s.selectedCountryId);
  const war = useGameStore(s => s.warWindowId);
  const owner = useRef({activeTool:tool, selectedCountryId:country, warWindowId:war});
  return workspaceVisible(owner.current,{activeTool:tool,selectedCountryId:country,warWindowId:war});
}
