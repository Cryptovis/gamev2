import {LocaleText} from '../../i18n/localeText';
import { useGameStore } from '../../store/gameStore';
import { achievedVictory } from '../../engine/systems/campaignVictory';
export function CampaignOverlay(){
  const status=useGameStore((s)=>s.campaignStatus);
  const reset=useGameStore((s)=>s.resetGame);
  const dispatch=useGameStore((s)=>s.dispatch);
  const victoryDay=useGameStore((s)=>s.world.campaign?.achieved?.day);
  if(status==='active')return null;
  if(status==='won'){
    const victory=achievedVictory(useGameStore.getState());
    return <div className="event-backdrop"><section className="event-modal campaign-victory">
      <div className="panel-kicker"><LocaleText value={"CAMPAIGN VICTORY"}/></div>
      <h2><LocaleText value={victory?.title??'Victory'}/></h2>
      <p><LocaleText value={victory?.summary??''}/></p>
      {victoryDay!==undefined&&<p><LocaleText value={`Achieved on day ${victoryDay}.`}/></p>}
      <p><LocaleText value={"You can keep governing in sandbox mode; no further victory is awarded, but elections and crises still apply."}/></p>
      <button className="restart-button" onClick={()=>dispatch({type:'campaign/continue'})}><LocaleText value={"CONTINUE IN SANDBOX"}/></button>
      <button className="restart-button" onClick={reset}><LocaleText value={"START NEW CAMPAIGN"}/></button>
    </section></div>;
  }
  return <div className="event-backdrop"><section className="event-modal"><div className="panel-kicker"><LocaleText value={"CAMPAIGN ENDED"}/></div><h2><LocaleText value={"Government Removed From Office"}/></h2><p><LocaleText value={"Your administration failed to retain power. The campaign is over, but the simulation remains deterministic and restartable."}/></p><button className="restart-button" onClick={reset}><LocaleText value={"START NEW CAMPAIGN"}/></button></section></div>;
}
