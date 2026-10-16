import type {GameLanguage} from '../../../domain/game';
import {useGameStore} from '../../../store/gameStore';
import {ensureGuestSession,demoOwner,hasDemoSession} from '../../../session/demoAccounts';
import {peekMostRecentSaveSummary,type SaveSummaryState} from '../../../persistence/saveSummary';
import type {HeroSession} from '../../landing/heroAction';
import type {PreloadStage} from '../../loading/preloadPipeline';
import {buildPreloadStages,defaultPreloadServices} from '../../loading/preloadStages';

/** What the demo session looks like to the landing screen. */
export type LandingSession=(NonNullable<HeroSession>&{username:string})|null;

/**
 * Everything LandingShell needs from outside React: the demo session, the save peek and the store. Passing a different
 * set lets tests run the shell without IndexedDB or a real campaign. The defaults are the real implementations.
 */
export interface LandingShellDeps {
  readSession():LandingSession;
  ensureGuest():void;
  peekSummary():Promise<SaveSummaryState>;
  /** Clears any campaign in memory and keeps the chosen language, as the old "Start a new game" button did. */
  resetCampaign(language:GameLanguage):void;
  loadLatest():Promise<boolean>;
  /** The loading screen's stages for a new or a continued campaign. */
  buildPreloadStages(intent:'new'|'continue'):PreloadStage[];
  /** How long the finished 100% stays on screen before the game appears. */
  handoffMs:number;
  setLanguage(next:GameLanguage):void;
}

export const defaultLandingDeps:LandingShellDeps={
  readSession:()=>{
    if(!hasDemoSession())return null;
    const username=demoOwner();
    return {kind:username==='guest'?'guest':'profile',username};
  },
  ensureGuest:()=>{ensureGuestSession();},
  peekSummary:()=>peekMostRecentSaveSummary(),
  resetCampaign:language=>{
    useGameStore.getState().resetGame();
    useGameStore.setState(s=>({playerProfile:{...s.playerProfile,language}}));
  },
  loadLatest:()=>useGameStore.getState().loadLatest(),
  buildPreloadStages:intent=>buildPreloadStages(intent,defaultPreloadServices(()=>useGameStore.getState().loadLatest())),
  handoffMs:320,
  setLanguage:next=>useGameStore.setState(s=>({playerProfile:{...s.playerProfile,language:next}})),
};
