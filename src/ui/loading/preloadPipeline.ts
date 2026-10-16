import type {LoadFailureReason} from '../landing/landingMachine';

// The loading screen's progress comes from real work, run in a fixed order. Each stage owns a fixed slice of the bar
// and reports how far through its own work it is, so the same inputs always give the same percentages. Nothing here
// waits on a timer, touches the engine or draws random numbers.

export type PreloadStageId='hydrate'|'graphics'|'indexes'|'workspace';
export const PRELOAD_STAGE_ORDER:readonly PreloadStageId[]=['hydrate','graphics','indexes','workspace'];
/** Percent range per stage. The last stage stops at 99: 100 is shown only once the hand-off has happened. */
export const STAGE_RANGE:Readonly<Record<PreloadStageId,readonly [number,number]>>={hydrate:[0,25],graphics:[25,55],indexes:[55,80],workspace:[80,99]};

export function percentAt(stage:PreloadStageId,fraction:number):number {
  const [from,to]=STAGE_RANGE[stage];
  const f=Number.isFinite(fraction)?Math.min(1,Math.max(0,fraction)):0;
  return Math.floor(from+(to-from)*f);
}

export type StageOutcome={ok:true;warnings?:readonly string[]}|{ok:false;reason:LoadFailureReason};
export interface PreloadStage {
  id:PreloadStageId;
  /** Does the work. `report` takes how far through this stage it is, from 0 to 1. */
  run(report:(fraction:number)=>void):Promise<StageOutcome>;
}
export interface PreloadProgress {stage:PreloadStageId;percent:number;}
export type PreloadResult={ok:true;warnings:string[]}|{ok:false;reason:LoadFailureReason;stage:PreloadStageId};

/**
 * Runs the stages in the order given. Only an `ok:false` outcome stops the run, and a thrown error counts as one only for
 * the hydrate stage (no campaign, nothing to start). Elsewhere it becomes a warning, because a missing picture or a slow
 * font must not keep the player out of a campaign that loaded fine. Progress never goes backwards. Returns null if
 * `cancelled` turned true, so a screen that went away never receives a result.
 */
export async function runPreload(stages:readonly PreloadStage[],onProgress:(progress:PreloadProgress)=>void,cancelled:()=>boolean=()=>false):Promise<PreloadResult|null> {
  const warnings:string[]=[];
  let last=-1;
  const emit=(stage:PreloadStageId,percent:number)=>{if(cancelled())return;if(percent>last){last=percent;onProgress({stage,percent});}else if(percent===last)onProgress({stage,percent});};
  for(const stage of stages){
    if(cancelled())return null;
    emit(stage.id,percentAt(stage.id,0));
    let outcome:StageOutcome;
    try{outcome=await stage.run(fraction=>emit(stage.id,percentAt(stage.id,fraction)));}
    catch{outcome=stage.id==='hydrate'?{ok:false,reason:'unknown'}:{ok:true,warnings:[`${stage.id} stage failed`]};}
    if(cancelled())return null;
    if(!outcome.ok)return {ok:false,reason:outcome.reason,stage:stage.id};
    warnings.push(...(outcome.warnings??[]));
    emit(stage.id,percentAt(stage.id,1));
  }
  return {ok:true,warnings};
}
