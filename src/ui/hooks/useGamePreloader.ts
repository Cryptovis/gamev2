import {useEffect,useRef,useState} from 'react';
import type {LoadFailureReason} from '../landing/landingMachine';
import {runPreload,type PreloadStage,type PreloadStageId} from '../loading/preloadPipeline';

export interface UseGamePreloaderOptions {
  /** Runs while true. Turning it off, or changing `runKey`, cancels the run in progress and ignores its result. */
  enabled:boolean;
  runKey:string;
  buildStages():PreloadStage[];
  onProgress(percent:number):void;
  onComplete(warnings:string[]):void;
  onFail(reason:LoadFailureReason):void;
}

/** Runs the preload stages once per `runKey` and reports progress, the end of the run, or the reason it failed. Returns the stage in progress. */
export function useGamePreloader(options:UseGamePreloaderOptions):{stage:PreloadStageId|null} {
  const {enabled,runKey}=options;
  const latest=useRef(options);
  latest.current=options;
  const [stage,setStage]=useState<PreloadStageId|null>(null);
  useEffect(()=>{
    if(!enabled){setStage(null);return;}
    let cancelled=false;
    runPreload(latest.current.buildStages(),progress=>{setStage(progress.stage);latest.current.onProgress(progress.percent);},()=>cancelled)
      .then(result=>{
        if(cancelled||!result)return;
        if(result.ok)latest.current.onComplete(result.warnings);else latest.current.onFail(result.reason);
      });
    return ()=>{cancelled=true;};
  },[enabled,runKey]);
  return {stage};
}
