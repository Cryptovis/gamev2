// Pure state machine for the entry flow. It holds no timers, storage or engine access; the shell feeds it events and
// renders the state. Events that make no sense on the current screen are ignored, and the same state object is returned
// so a subscriber can skip the re-render.

export type LandingScreen='booting'|'landing'|'setup'|'loading'|'game';
export type LandingOverlay='profile'|'releaseNotes'|null;
export type LoadIntent='new'|'continue';
export type LoadFailureReason='missing'|'corrupt'|'incompatible_version'|'unknown';

export interface LandingState {
  screen:LandingScreen;
  overlay:LandingOverlay;
  /** Set while screen is 'loading'. */
  intent:LoadIntent|null;
  /** 0 to 100. Never goes backwards while loading, and reaches 100 only through LOAD_OK. */
  progress:number;
  error:LoadFailureReason|null;
}

export type LandingEvent=
  |{type:'BOOT_RESOLVED';hasActiveGame?:boolean}
  |{type:'PLAY_NOW'}
  |{type:'NEW_CAMPAIGN'}
  |{type:'CONTINUE'}
  |{type:'START_PRELOAD'}
  |{type:'PRELOAD_PROGRESS';percent:number}
  |{type:'LOAD_OK'}
  |{type:'LOAD_FAILED';reason?:LoadFailureReason}
  |{type:'SETUP_CANCELLED'}
  |{type:'SETUP_COMMITTED'}
  |{type:'RETURN_TO_MENU'}
  |{type:'OPEN_PROFILE'}
  |{type:'OPEN_RELEASE_NOTES'}
  |{type:'CLOSE_OVERLAY'};

export const INITIAL_LANDING_STATE:LandingState={screen:'booting',overlay:null,intent:null,progress:0,error:null};

const at=(screen:LandingScreen,patch:Partial<LandingState>={}):LandingState=>({screen,overlay:null,intent:null,progress:0,error:null,...patch});
const clampPercent=(value:number)=>Number.isFinite(value)?Math.min(99,Math.max(0,value)):0;

export function landingReducer(state:LandingState,event:LandingEvent):LandingState {
  switch(event.type){
    case 'BOOT_RESOLVED':
      if(state.screen!=='booting')return state;
      return event.hasActiveGame?at('game',{progress:100}):at('landing');
    case 'PLAY_NOW':
    case 'NEW_CAMPAIGN':
      return state.screen==='landing'?at('setup'):state;
    case 'CONTINUE':
      return state.screen==='landing'?at('loading',{intent:'continue'}):state;
    case 'SETUP_COMMITTED':
      return state.screen==='setup'?at('loading',{intent:'new'}):state;
    case 'SETUP_CANCELLED':
      return state.screen==='setup'?at('landing'):state;
    case 'START_PRELOAD':
      // Restarts a load, which is how the error screen offers a retry.
      return state.screen==='loading'?at('loading',{intent:state.intent}):state;
    case 'PRELOAD_PROGRESS': {
      if(state.screen!=='loading'||state.error)return state;
      const next=Math.max(state.progress,clampPercent(event.percent));
      return next===state.progress?state:{...state,progress:next};
    }
    case 'LOAD_OK':
      return state.screen==='loading'&&!state.error?at('game',{progress:100}):state;
    case 'LOAD_FAILED':
      return state.screen==='loading'?{...state,error:event.reason??'unknown'}:state;
    case 'RETURN_TO_MENU':
      return state.screen==='landing'||state.screen==='booting'?state:at('landing');
    case 'OPEN_PROFILE':
      return state.screen==='landing'&&state.overlay===null?{...state,overlay:'profile'}:state;
    case 'OPEN_RELEASE_NOTES':
      return state.screen==='landing'&&state.overlay===null?{...state,overlay:'releaseNotes'}:state;
    case 'CLOSE_OVERLAY':
      return state.overlay===null?state:{...state,overlay:null};
  }
}

/** Maps the screen names used before 9.4 (login, register, hub) onto the new ones. Anything unknown opens the landing screen. */
export function normalizeLegacyScreen(value:unknown):LandingScreen {
  switch(value){
    case 'booting':case 'landing':case 'setup':case 'loading':case 'game':return value;
    case 'login':case 'register':case 'hub':return 'landing';
    default:return 'landing';
  }
}
