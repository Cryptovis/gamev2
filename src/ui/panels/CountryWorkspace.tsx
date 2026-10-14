import {useState} from 'react';
import {useGameStore} from '../../store/gameStore';
import {countryPanelNavigation,type WorkspaceFrame} from '../../store/workspaceNavigation';
import {CountryPanel} from './CountryPanel';
import {TargetCountryModal} from './TargetCountryModal';
import {OperationalAssessmentModal} from './OperationalAssessmentModal';
import {workspaceForSelection} from './targetCountryHub';

/** One active primary surface. Retained source frames keep their local tabs, scroll and portal ownership. */
export function CountryWorkspace({selectedCountryId}:{selectedCountryId:string}){
 const playerCountryId=useGameStore(s=>s.playerCountryId),liveSelection=useGameStore(s=>s.selectedCountryId),navigation=useGameStore(s=>s.navigation);
 const trail=useGameStore(s=>s.workspaceTrail),activeTool=useGameStore(s=>s.activeTool),warWindowId=useGameStore(s=>s.warWindowId);
 const [dossierFor,setDossierFor]=useState<string|null>(null);
 const current:WorkspaceFrame={selectedCountryId:liveSelection,activeTool,warWindowId,navigation};
 const frames=[...trail,current],assessment=[...frames].reverse().find(frame=>frame.navigation?.intent?.kind==='operational-assessment');
 const activeAssessment=navigation?.intent?.kind==='operational-assessment'&&!!liveSelection&&!activeTool&&!warWindowId;
 const isPanel=(frame:WorkspaceFrame)=>!!frame.selectedCountryId&&!frame.activeTool&&!frame.warWindowId&&!['country-hub','country-info','operational-assessment'].includes(frame.navigation?.intent?.kind??'')&&(frame.selectedCountryId===playerCountryId||countryPanelNavigation(frame.navigation)||dossierFor===frame.selectedCountryId);
 const view=workspaceForSelection({playerCountryId,selectedCountryId:liveSelection,navigation},selectedCountryId,dossierFor);
 const hub=[...frames].reverse().find(frame=>frame.selectedCountryId&&frame.selectedCountryId!==playerCountryId&&!frame.activeTool&&!frame.warWindowId&&!isPanel(frame)&&frame.navigation?.intent?.kind!=='operational-assessment');
 return <>
  {frames.map((frame,index)=>isPanel(frame)?<CountryPanel key={`panel-${index}`} countryId={frame.selectedCountryId!} navigationFrame={frame.navigation} suspended={index!==trail.length||view!=='panel'||activeAssessment} onBrowse={setDossierFor}/>:null)}
  {hub?.selectedCountryId&&<TargetCountryModal key={hub.selectedCountryId} countryId={hub.selectedCountryId} mode={hub.navigation?.intent?.kind==='country-info'?'info':'hub'} active={hub===current&&!activeAssessment}/>}
  {assessment?.selectedCountryId&&<OperationalAssessmentModal key={assessment.selectedCountryId} countryId={assessment.selectedCountryId} active={activeAssessment&&liveSelection===assessment.selectedCountryId}/>}
 </>;
}
