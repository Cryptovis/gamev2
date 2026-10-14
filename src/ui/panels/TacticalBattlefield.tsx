import {tacticalDraftPreview} from '../../engine/systems/tacticalDraft';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { TacticalAction, TacticalBattle, TacticalOrder, TacticalOrderKind, TacticalPlanKind, TacticalUnit } from '../../domain/tactical';
import { COMMAND_BUDGET, ORDER_COST, ORDER_FUEL, cellColumn, cellCount, cellRow, objectiveHolders, playerSide, sectorName, tacticalCommandStatus, tacticalRoundFuel, unitNumber, validateTacticalOrders, visibleCells } from '../../engine/systems/tactical';
import { useGameStore } from '../../store/gameStore';
import {useWorldView} from '../../store/useWorldView';
import { LocaleText, translateLive } from '../../i18n/localeText';
import { AssetThumbnail } from '../icons/AssetThumbnail';
import { PLAYBACK_SPEEDS, PLAYBACK_STEP_MS, actionCell, playbackAction, playbackFrames, playbackUnits } from '../../engine/systems/tacticalPlayback';
import { ReviewDialog } from './ReviewDialog';
import { BattleFxLayer, RoundSummaryStrip } from './BattleFxLayer';
import { effectAt, shouldSummarize, summarizeRound } from '../../presentation/battleEffects';
import { useAudioSettings } from '../../audio/audioSettings';
import { audio } from '../../audio/audioService';

const names:Record<TacticalOrderKind,string>={move:'Advance',defend:'Defend',flank:'Flank',recon:'Recon',reserve:'Hold reserves',bombard:'Bombard'};
const descriptions:Record<TacticalOrderKind,string>={move:'Move into a visible empty sector. Infantry and artillery move one sector; armor moves two.',defend:'Reduce losses. Forest, mountain and urban cover improve defensive power.',flank:'Move up to two sectors with an attack bonus, but expose the unit to greater losses.',recon:'Reveal sectors near the target for the next planning round.',reserve:'Reduce losses this round and prepare an offensive bonus for the next round.',bombard:'Artillery targets a visible enemy within three sectors, increasing enemy losses.'};
/** Phase 3: the player's standing plan (auto mode or unanswered defence). The opponent's plan is never shown. */
const PLAN_LABELS:Record<TacticalPlanKind,string>={recon:'Reconnoitre',seize:'Seize objective',flank:'Flank objective',secure:'Secure objective',withdraw:'Withdraw to cover'};
const asset=(role:string)=>role==='infantry'?'infantry_equipment':role==='armor'?'tanks':'artillery';
/** "Infantry 2" — role in the player's language plus the group number. */
function unitLabel(u:TacticalUnit|undefined):string{if(!u)return '';const n=unitNumber(u);return `${translateLive(u.role)}${n?' '+n:''}`;}
/** One line of the recorded round timeline (0.85 action log). */
/** Board effect glyph for a playback step. */
function fxSymbol(a:TacticalAction):string{
  switch(a.kind){case 'move':return '➜';case 'blocked':return '⨯';case 'bombard':return a.hit?'✹':'○';case 'recon':return '◎';case 'defend':return '⛨';case 'reserve':return '◇';case 'casualties':return `−${(a.amount??0).toLocaleString()}`;case 'lost':return '✖';case 'capture':return '◆';case 'contest':return '◇';}
}
function actionLine(b:TacticalBattle,a:TacticalAction,units:TacticalUnit[]):string{
  const who=unitLabel(units.find(u=>u.id===a.unitId)),at=(c?:number)=>c===undefined?'':sectorName(b,c);
  switch(a.kind){
    case 'move':return `${who}: ${at(a.from)} → ${at(a.to)}`;
    case 'blocked':return `${who}: ${at(a.from)} ⨯ ${at(a.to)} · ${translateLive('Blocked')}`;
    case 'bombard':return `${who}: ✹ ${at(a.target)} · ${translateLive(a.hit?'Hit':'Miss')}`;
    case 'recon':return `${who}: ◎ ${at(a.target)}`;
    case 'defend':return `${who}: ${translateLive('Defend')}`;
    case 'reserve':return `${who}: ${translateLive('Hold reserves')}`;
    case 'casualties':return `${who}: −${(a.amount??0).toLocaleString()}`;
    case 'lost':return `${who}: ${translateLive('Group lost')}`;
    case 'capture':return `◆ ${at(a.objective)} · ${translateLive('Captured')}`;
    case 'contest':return `◆ ${at(a.objective)} · ${translateLive('Contested')}`;
  }
}
export function TacticalBattlefield({warId,onReturn}:{warId:string;onReturn:()=>void}) {
  const s=useWorldView(),w=s.wars[warId],b=w.tactical!,side=playerSide(s,w);
  const [selected,setSelected]=useState(b.units.find(u=>u.side===side&&u.remaining>0)?.id??''),[kind,setKind]=useState<TacticalOrderKind>('move'),[target,setTarget]=useState<number|undefined>(),[orders,setOrders]=useState<TacticalOrder[]>([]),[review,setReview]=useState<'orders'|'handoff'|'result'|'withdraw'|'blocked'|null>(w.lastCombatDay===s.day&&b.events.length?'result':null),[replay,setReplay]=useState(false),[focused,setFocused]=useState(0),[replayRound,setReplayRound]=useState(b.events.at(-1)?.round??1),[step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1);
  const board=useRef<HTMLDivElement>(null);
  const [guide,setGuide]=useState(()=>{try{return localStorage.getItem('trp-tactical-guide-v1')==='done'?-1:0;}catch{return 0;}});
  const finishGuide=()=>{setGuide(-1);try{localStorage.setItem('trp-tactical-guide-v1','done');}catch{/* optional UI preference */}};
  // Phase 5: effects and sounds come only from the recorded round; summarised at 4× playback, the 5× clock, low effects or reduced motion.
  const lowEffects=useAudioSettings(a=>a.lowEffects),reducedMotion=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const summarized=shouldSummarize({playbackSpeed:speed,campaignSpeed:s.speed,lowEffects,reducedMotion});
  useEffect(()=>{setOrders([]);setTarget(undefined);setReplay(false);},[b.round]);
  const eventIndex=b.events.findIndex(e=>e.round===replayRound);
  const last=replay?(b.events[eventIndex]??b.events.at(-1)):b.events.at(-1);
  const before=last?.beforeUnits??b.initialUnits;
  const frames=last?playbackFrames(last):1,done=step>=frames;
  const shown=replay&&last?playbackUnits(last,step):b.units;
  const current=replay&&last?playbackAction(last,step):undefined,fxCell=current?actionCell(current,shown):undefined;
  const recordedVision=done?last?.revealed:eventIndex>0?b.events[eventIndex-1].revealed:{attacker:[],defender:[]};
  const holders=objectiveHolders(b,shown);
  const live=visibleCells({...b,units:shown,revealed:replay?recordedVision??b.revealed:b.revealed},side),unit=b.units.find(u=>u.id===selected);
  // 0.86 playback: step through the recorded action timeline. Reduced motion jumps straight to the result.
  const startReplay=(round:number)=>{const ev=b.events.find(e=>e.round===round),reduce=summarized;setReplay(true);setReplayRound(round);setStep(reduce&&ev?playbackFrames(ev):0);setPlaying(!reduce);};
  const effect=replay&&last&&!summarized&&step>0?effectAt(warId,last,step,playbackUnits(last,step-1)):null,summary=last?summarizeRound(warId,last):null;
  useEffect(()=>{if(effect&&playing)for(const cue of effect.sounds)audio.play(cue,`${effect.id}:${cue}`);},[effect?.id,playing]);
  useEffect(()=>{if(replay&&summarized&&summary)for(const cue of summary.sounds)audio.play(cue,`${summary.id}:${cue}`);},[replay,summarized,summary?.id]);
  useEffect(()=>{if(!replay||!playing)return;if(done){setPlaying(false);return;}const timer=setTimeout(()=>setStep(n=>n+1),PLAYBACK_STEP_MS/speed);return ()=>clearTimeout(timer);},[replay,playing,step,done,speed,replayRound]);
  const proposed:TacticalOrder={unitId:selected,kind,...(['move','flank','recon','bombard'].includes(kind)?{target}:{})};
  const preview=useMemo(()=>tacticalDraftPreview(s,warId,orders,proposed,b.round)!,[b,w.status,w.lastCombatDay,s.day,s.countries,s.playerCountryId,selected,kind,target,orders]);
  const draft=preview.orders;
  const draftReasons=preview.reasons,commitReasons=tacticalCommandStatus(s,warId,b.round,orders);
  // Phase 3: shown fuel includes sustainment for holding; only offensive and per-order fuel must be in reserve.
  const points=orders.reduce((n,o)=>n+ORDER_COST[o.kind],0),fuel=tacticalRoundFuel(s,w,side,orders),active=w.status==='active',standing=b.plans?.[side];
  const [receiptRound,setReceiptRound]=useState(b.round);
  const nextTurn=()=>{
    const before=useGameStore.getState();
    if(before.wars[warId]?.status!=='active'){s.closeWorkspace();return;}
    if(before.wars[warId].lastCombatDay===before.day)s.dispatch({type:'time/advanceDay'});
    const after=useGameStore.getState();
    if(after.day===before.day&&before.wars[warId].lastCombatDay===before.day||tacticalCommandStatus(after,warId,after.wars[warId].tactical!.round,[]).length){setReview('blocked');return;}
    setOrders([]);setTarget(undefined);setReplay(false);setReview(null);
  };
  const submit=()=>{
    const before=useGameStore.getState().wars[warId]?.tactical?.round;
    s.commitTactical(w.id,receiptRound,orders,`tactical:${w.id}:${receiptRound}`);
    const after=useGameStore.getState();
    if(after.wars[warId]?.tactical?.round!==before){after.showReceipt(null);setReview('result');}
    else setReview(null);
  };
  return <div className="tactical-experience" data-testid="tactical-battlefield">
    <div className="tactical-heading"><div><small><LocaleText value="TACTICAL COMMAND"/></small><h3><LocaleText value="Secure the supply depots"/></h3><p><LocaleText value="Each token is an allocated force group. Terrain, supply and national strength still matter."/></p></div><button onClick={onReturn}><LocaleText value="Return to war command"/></button></div>
    <button className="tactical-guide-replay" onClick={()=>setGuide(0)}><LocaleText value="Replay tactical guide"/></button>
    {guide>=0&&<aside className="tactical-onboarding" aria-label={translateLive('Tactical guide')} data-step={guide}><strong>{guide+1}/3</strong><p><LocaleText value={['Select your force group. Enemy positions outside vision remain hidden.','Choose an available action, then select its sector. Arrow keys move across the grid.','Queue drafts, review the complete CP and fuel cost, then confirm one simultaneous round.'][guide]}/></p><button onClick={finishGuide}><LocaleText value="Skip"/></button><button onClick={()=>guide===2?finishGuide():setGuide(guide+1)}><LocaleText value={guide===2?'Finish':'Next'}/></button></aside>}
    <div className="tactical-flow-banner" role="status"><div><strong><LocaleText value={w.lastCombatDay===s.day?'Round complete':'Your planning turn'}/></strong><p><LocaleText value={w.lastCombatDay===s.day?'See the results, then start your next turn or withdraw.':'Choose a group, choose an order and queue it. Finish your plan to let the opponent respond.'}/></p></div>{w.lastCombatDay===s.day?<button className="tactical-flow-results" onClick={()=>setReview('result')}><LocaleText value="View round results"/></button>:<button disabled={commitReasons.length>0||replay} onClick={()=>{setReceiptRound(b.round);setReview('orders');}}><LocaleText value="Finish plan"/></button>}</div>
    <div className="tactical-summary"><span><LocaleText value="Round"/> <b>{b.round+1}</b></span><span><LocaleText value="Command points"/> <b>{points}/{COMMAND_BUDGET}</b></span><span><LocaleText value="Planned fuel"/> <b>{fuel.toFixed(1)}</b></span><span><LocaleText value="Fuel reserve"/> <b>{s.countries[s.playerCountryId].processedResources.fuel.toFixed(1)}</b></span><span><LocaleText value="Front progress"/> <b>{w.progress.toFixed(1)}</b></span>{standing&&<span data-testid="standing-plan"><LocaleText value="Standing plan"/> <b><LocaleText value={PLAN_LABELS[standing.kind]}/> · {sectorName(b,standing.objective)}</b></span>}</div>
    <div className="tactical-layout">
      <div>
        <div className="tactical-board" ref={board} role="group" aria-label={translateLive('Tactical battlefield')} style={{'--cols':b.width,'--rows':b.height} as CSSProperties}>
          {b.terrain.map((terrain,cell)=>{
            const friendly=shown.find(u=>u.cell===cell&&u.side===side&&u.remaining>0),enemy=shown.find(u=>u.cell===cell&&u.side!==side&&u.remaining>0&&live.has(cell));
            return <button key={cell} data-cell={cell} tabIndex={focused===cell?0:-1} className={`tactical-cell terrain-${terrain} ${live.has(cell)?'':'fogged'} ${target===cell?'targeted':''} ${orders.some(o=>o.target===cell)?'ordered':''} ${friendly?.id===selected?'selected':''}`} aria-label={`${sectorName(b,cell)} · ${translateLive(live.has(cell)?terrain:'Unseen sector')}${friendly||enemy?' · '+translateLive((friendly??enemy)!.role):''}`} aria-pressed={target===cell} disabled={replay} onFocus={()=>setFocused(cell)} onClick={()=>{if(friendly)setSelected(friendly.id);else setTarget(cell);}} onKeyDown={e=>{const delta=({ArrowRight:1,ArrowLeft:-1,ArrowDown:b.width,ArrowUp:-b.width} as Record<string,number>)[e.key];if(delta!==undefined){e.preventDefault();const next=Math.min(cellCount(b)-1,Math.max(0,cell+delta));setFocused(next);board.current?.querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)?.focus();}}}><small>{sectorName(b,cell)}</small>{b.objectives.includes(cell)&&<span className={`tactical-depot ${holders[b.objectives.indexOf(cell)]===side?'held-friendly':holders[b.objectives.indexOf(cell)]?'held-enemy':''}`} aria-label={translateLive('Supply depot')}>◆</span>}</button>;
          })}
          {shown.filter(u=>u.remaining>0&&(u.side===side||live.has(u.cell))).map(u=><div key={u.id} className={`tactical-token ${u.side===side?'friendly':'enemy'} ${selected===u.id?'selected':''}`} style={{left:`${cellColumn(b,u.cell)*100/b.width}%`,top:`${cellRow(b,u.cell)*100/b.height}%`}} aria-hidden="true"><AssetThumbnail asset={asset(u.role)} size={36}/><span>{Math.round(u.remaining/Math.max(1,u.allocated)*100)}%</span></div>)}
          {current&&fxCell!==undefined&&<div key={`${replayRound}-${step}`} className={`tactical-fx fx-${current.kind}${current.hit===false?' fx-miss':''} ${current.side===side?'friendly':'enemy'}`} style={{left:`${cellColumn(b,fxCell)*100/b.width}%`,top:`${cellRow(b,fxCell)*100/b.height}%`}} aria-hidden="true">{fxSymbol(current)}</div>}
          {!summarized&&<BattleFxLayer board={b} effect={effect} side={side}/>}
        </div>
        {summarized&&summary&&<RoundSummaryStrip summary={summary} side={side}/>}
        <div className="tactical-legend"><span><i className="friendly"/><LocaleText value="Your forces"/></span><span><i className="enemy"/><LocaleText value="Visible enemy"/></span><span>◆ <LocaleText value="Supply depot"/></span></div>
        <p className="tactical-note"><LocaleText value="Objectives are held only while no enemy is adjacent."/></p>
        <p className="tactical-note"><LocaleText value="Capturing the depot improves combat power. Hidden enemy positions require recon. Both sides execute orders simultaneously."/></p>
        <p className="tactical-note"><LocaleText value="Offensive orders burn operational fuel. Holding positions burns a smaller sustainment share, for both sides, and never prevents defending."/></p>
      </div>
      <div className="tactical-orders">
        <h4><LocaleText value="Select a force group"/></h4><div className="tactical-unit-list">{b.units.filter(u=>u.side===side).map(u=><button key={u.id} aria-pressed={u.id===selected} disabled={!active||u.remaining<=0||replay} onClick={()=>{setSelected(u.id);setTarget(undefined);}} data-unit={u.id}><AssetThumbnail asset={asset(u.role)} size={28}/><span>{unitLabel(u)}<small>{u.remaining.toLocaleString(s.playerProfile.language)} / {u.allocated.toLocaleString(s.playerProfile.language)}{u.prepared?' · '+translateLive('Prepared'):''}</small></span></button>)}</div>
        <div className="tactical-order-types">{(Object.keys(names) as TacticalOrderKind[]).map(action=><button key={action} aria-pressed={kind===action} disabled={!active||replay||!preview.actions[action].allowed} title={translateLive(preview.actions[action].reason??descriptions[action])} onClick={()=>{setKind(action);setTarget(undefined);}} data-order-kind={action}><LocaleText value={names[action]}/><small>{ORDER_COST[action]} <LocaleText value="CP"/> · {ORDER_FUEL[action]} <LocaleText value="fuel"/></small></button>)}</div>
        {Object.values(preview.actions).some(action=>!action.allowed)&&<details className="unavailable-order-reasons"><summary><LocaleText value="Unavailable orders"/></summary><ul>{(Object.keys(names) as TacticalOrderKind[]).filter(action=>!preview.actions[action].allowed).map(action=><li key={action}><strong><LocaleText value={names[action]}/></strong>: <LocaleText value={preview.actions[action].reason??'Unavailable'}/></li>)}</ul></details>}
        <p><LocaleText value={descriptions[kind]}/></p><p><LocaleText value="Target sector"/>: {target===undefined?'—':sectorName(b,target)}</p>
        {active&&!replay&&<><section className="tactical-sector-card" aria-label={translateLive('Draft order review')}><strong>{unitLabel(unit)} · <LocaleText value={names[kind]}/>{target!==undefined?' · '+sectorName(b,target):''}</strong><p><LocaleText value="Queued plan including this order"/>: {preview.points}/{preview.budget} <LocaleText value="CP"/> · {preview.fuel.toLocaleString(s.playerProfile.language,{maximumFractionDigits:1})} <LocaleText value="fuel"/></p><button className="tactical-queue" disabled={draftReasons.length>0||w.lastCombatDay===s.day} onClick={()=>{setOrders(draft);if(draft.reduce((n,o)=>n+ORDER_COST[o.kind],0)===COMMAND_BUDGET){setReceiptRound(b.round);setReview('orders');}}}><LocaleText value="Queue order"/></button><button className="tactical-draft-cancel" onClick={()=>{setTarget(undefined);setSelected('');}}><LocaleText value="Cancel draft"/></button></section><div role="status" className="tactical-feedback">{draftReasons.map(reason=><p key={reason}><LocaleText value={reason}/></p>)}</div></>}
        <ol className="tactical-plan">{orders.map(o=><li key={o.unitId}><span>{unitLabel(b.units.find(u=>u.id===o.unitId))} · <LocaleText value={names[o.kind]}/>{o.target!==undefined?' → '+sectorName(b,o.target):''}</span><button aria-label={translateLive('Remove order')} onClick={()=>setOrders(orders.filter(x=>x.unitId!==o.unitId))}>×</button></li>)}</ol>
        <button className="tactical-commit" disabled={!active||replay||commitReasons.length>0} onClick={()=>{setReceiptRound(b.round);setReview('orders');}}><LocaleText value={orders.length?'Review combat orders':'Review hold orders'}/></button>
        <div role="status" className="tactical-feedback">{commitReasons.map(reason=><p key={reason}><LocaleText value={reason}/></p>)}</div>
        {active&&w.lastCombatDay===s.day&&<button className="tactical-next-day" onClick={nextTurn}><LocaleText value="Start next turn"/></button>}
        {active&&<button onClick={()=>setReview('withdraw')}><LocaleText value="Withdraw"/></button>}
      </div>
    </div>
    {last&&<section className="tactical-round-result" aria-live="polite"><div><h4><LocaleText value="Last resolved round"/> {last.round}</h4><button aria-pressed={replay} onClick={()=>{if(replay){setReplay(false);setPlaying(false);}else startReplay(b.events.at(-1)!.round);}}><LocaleText value={replay?'Return to live orders':'Replay recorded result'}/></button></div>{replay&&<div className="tactical-replay-controls"><label><LocaleText value="Replay round"/><select aria-label={translateLive('Replay round')} value={replayRound} onChange={e=>startReplay(Number(e.target.value))}>{b.events.map(e=><option key={e.round} value={e.round}>{e.round} · {translateLive('Day')} {e.day}</option>)}</select></label><div className="tactical-playback" role="group" aria-label={translateLive('Playback')}><button aria-label={translateLive('Previous step')} disabled={step<=0} onClick={()=>{setPlaying(false);setStep(n=>Math.max(0,n-1));}}>⏮</button><button className="tactical-play" onClick={()=>{if(done){setStep(0);setPlaying(true);}else setPlaying(!playing);}}>{playing?'⏸':'▶'} <LocaleText value={playing?'Pause':'Play'}/></button><button aria-label={translateLive('Next step')} disabled={done} onClick={()=>{setPlaying(false);setStep(n=>Math.min(frames,n+1));}}>⏭</button><button aria-label={translateLive('Playback speed')} onClick={()=>setSpeed(PLAYBACK_SPEEDS[(PLAYBACK_SPEEDS.indexOf(speed)+1)%PLAYBACK_SPEEDS.length])}>{speed}×</button><button disabled={done} onClick={()=>{setPlaying(false);setStep(frames);}}><LocaleText value="Skip to result"/></button></div><div className="tactical-playback-caption" aria-live="polite"><span><LocaleText value="Step"/> {Math.min(step,frames)}/{frames}</span>{current&&last&&<strong>{actionLine(b,current,[...last.beforeUnits,...last.units])}</strong>}</div></div>}<p><LocaleText value="Personnel lost"/>: {side==='attacker'?last.attackerLosses.personnel:last.defenderLosses.personnel} · <LocaleText value="Fuel spent"/>: {(side==='attacker'?last.attackerFuel:last.defenderFuel).toFixed(1)} · <LocaleText value="Front change"/>: {((last.progressAfter-last.progressBefore)*(side==='attacker'?1:-1)).toFixed(1)}</p><p><LocaleText value="Recorded results do not reroll combat or apply losses again."/></p>{last.actions.length>0&&<details className="tactical-action-log"><summary><LocaleText value="Round log"/></summary><ol>{last.actions.map((a,i)=><li key={i} aria-current={replay&&step===i+1?'step':undefined} className={`action-${a.kind} ${a.side===side?'friendly':'enemy'} ${replay&&step===i+1?'current':''}`}>{actionLine(b,a,[...last.beforeUnits,...last.units])}</li>)}</ol></details>}</section>}
    {!active&&<p className="tactical-outcome" role="status"><LocaleText value="Battle concluded"/>: <LocaleText value={w.status}/></p>}
    {review==='orders'&&<ReviewDialog title="Commit tactical orders" summary="These orders spend the displayed fuel and resolve one combat round. The opponent acts simultaneously. Casualties and front changes apply to the campaign immediately." metrics={[["Command points",`${points}/${COMMAND_BUDGET}`],["Fuel spent",fuel.toFixed(1)],["Round",String(receiptRound+1)]]} warnings={['One combat round per campaign day.','Uncommitted orders remain a draft.']} allowed={commitReasons.length===0} onCancel={()=>setReview(null)} onConfirm={()=>setReview('handoff')}/>}
    {review==='handoff'&&<ReviewDialog visual="military" title="Your plan is complete" summary="Your planning is finished. Let the opponent respond. Both plans resolve together, so neither side gets a free first strike." confirmLabel="Let the opponent play" onCancel={()=>setReview(null)} onConfirm={submit}/>}
    {review==='result'&&last&&<ReviewDialog visual="military" title={active?'Round complete':'Battle concluded'} summary="Both plans have resolved. Review the losses, fuel and front change. Choose your next step." metrics={[["Round",String(last.round)],["Your personnel lost",String(side==='attacker'?last.attackerLosses.personnel:last.defenderLosses.personnel)],["Opponent personnel lost",String(side==='attacker'?last.defenderLosses.personnel:last.attackerLosses.personnel)],["Fuel spent",(side==='attacker'?last.attackerFuel:last.defenderFuel).toFixed(1)],["Front change",((last.progressAfter-last.progressBefore)*(side==='attacker'?1:-1)).toFixed(1)],["Opponent orders",last.enemyOrders.map(o=>translateLive(names[o.kind])).join(' · ')]]} warnings={active?['Starting the next turn advances one campaign day. National decisions may need your attention.']:[]} confirmLabel="Start next turn" onCancel={()=>setReview(null)} onConfirm={active?nextTurn:undefined} actions={[{label:'Replay recorded result',onClick:()=>{setReview(null);startReplay(last.round);}},...(active?[{label:'Withdraw',onClick:()=>setReview('withdraw')}]:[]),{label:'Return to map',onClick:s.closeWorkspace}]}/>}
    {review==='blocked'&&<ReviewDialog title="National decision needs attention" summary="Time cannot advance while a national decision is waiting. Open the campaign decision, resolve it, then return to the battlefield." confirmLabel="Open campaign decision" onCancel={()=>setReview(null)} onConfirm={()=>{setReview(null);s.closeWorkspace();}}/>}
    {review==='withdraw'&&<ReviewDialog title="Withdraw from the battlefield" summary={side==='attacker'?'The offensive ends and a ceasefire is established. Surviving forces remain in your national army.':'Withdrawing as the defender concedes control of the country to the attacker. Losing your home country ends the campaign.'} onCancel={()=>setReview(null)} onConfirm={()=>{s.withdraw(w.id);setReview(null);}}/>}
  </div>;
}
