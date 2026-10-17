import {useState} from 'react';
import {useGameStore} from '../../store/gameStore';
import {useWorldView} from '../../store/useWorldView';
import {ExecutiveWorkspaceShell} from '../windows/ExecutiveWorkspaceShell';
import {warPlanningView} from './targetBriefing';
import {WarPlanningBrief} from './TargetSubviews';
import {StrategicDecisionModal} from './StrategicDecisionModal';
import {strategicDecisionSpec} from '../../engine/systems/strategicDecision';
import type {StrategicDecisionSpec} from '../../domain/interaction';

/** The sole assessment renderer for every pre-war launcher, including active-war alternatives. */
export function OperationalAssessmentModal({countryId,active}:{countryId:string;active:boolean}){
 const state=useWorldView(),[pending,setPending]=useState<StrategicDecisionSpec|null>(null);
 const view=warPlanningView(state,countryId),target=state.countries[countryId],player=state.countries[state.playerCountryId];
 if(!view||!target||!player)return null;
 return <><ExecutiveWorkspaceShell id="operational-assessment-window" title="Operational Assessment" kicker="NATIONAL SECURITY COUNCIL" active={active} hideHeader={true} onClose={state.closeWorkspace}>
  <WarPlanningBrief view={view} country={target} player={player} avatarId={state.playerProfile.avatarId} day={state.day} language={state.playerProfile.language}
   onFuelHelp={()=>state.routeWorkspace({kind:'fuel-help',targetCountryId:countryId})} onOpenWar={()=>{if(view.activeWarId)state.openWarWindow(view.activeWarId);}}
   onDeclare={()=>{const spec=strategicDecisionSpec(useGameStore.getState(),'declare_war',countryId);if(spec)setPending(spec);}}/>
 </ExecutiveWorkspaceShell>
 {pending&&active&&<StrategicDecisionModal spec={pending} onCancel={()=>setPending(null)} onConfirm={()=>{useGameStore.getState().declareWar(countryId);setPending(null);}}/>}</>;
}
