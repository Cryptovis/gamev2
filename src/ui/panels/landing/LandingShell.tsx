import {useCallback,useEffect,useReducer,useRef,useState,type ComponentType} from 'react';
import {version} from '../../../../package.json';
import {useGameStore} from '../../../store/gameStore';
import {useAppearance} from '../../../presentation/appearance';
import {translateText} from '../../../i18n/localeText';
import {SAVE_SUMMARY_LOADING,type SaveSummaryState} from '../../../persistence/saveSummary';
import {LeadershipWisdomWidget} from '../../components/LeadershipWisdomWidget';
import {useAmbiencePreference} from '../../hooks/useAmbiencePreference';
import {useDocumentTheme} from '../../hooks/useDocumentTheme';
import {useGamePreloader} from '../../hooks/useGamePreloader';
import {resolveHeroAction,sessionKindOf} from '../../landing/heroAction';
import {INITIAL_LANDING_STATE,landingReducer,type LoadFailureReason} from '../../landing/landingMachine';
import {CampaignSetup} from '../CampaignSetup';
import {CommandMenu} from './CommandMenu';
import {GameLoadingScreen} from './GameLoadingScreen';
import {HeroBrand} from './HeroBrand';
import {LandingBackdrop} from './LandingBackdrop';
import {defaultLandingDeps,type LandingSession,type LandingShellDeps} from './landingDeps';
import {ProfileDrawer,type ProfileTab} from './ProfileDrawer';
import {ReleaseNotesModal} from './ReleaseNotesModal';
import {SaveGameCard} from './SaveGameCard';
import {UtilityDock} from './UtilityDock';

export interface SetupSlotProps {onReturnToMenu():void;/** The shell shows its own loading screen, so the wizard starts the campaign as soon as it is confirmed. */startImmediately:boolean;}
export interface LandingShellProps {
  /** Told whether the game itself (not the entry flow) is on screen, so the app can start or stop its clock. */
  onPlaying(playing:boolean):void;
  /** For tests: replaces the session, save and store access. */
  deps?:LandingShellDeps;
  /** For tests: replaces the setup wizard. */
  Setup?:ComponentType<SetupSlotProps>;
}

/**
 * Owns the entry flow: landing, setup, loading and the hand-off to the game. The reducer decides where each event goes;
 * this component runs the side effects (session, save lookup, store reset and load) and renders the current screen.
 */
export function LandingShell({onPlaying,deps=defaultLandingDeps,Setup=CampaignSetup}:LandingShellProps) {
  const language=useGameStore(s=>s.playerProfile.language);
  const setupComplete=useGameStore(s=>s.playerProfile.setupComplete);
  const [state,dispatch]=useReducer(landingReducer,INITIAL_LANDING_STATE);
  const [session,setSession]=useState<LandingSession>(null);
  const [summary,setSummary]=useState<SaveSummaryState>(SAVE_SUMMARY_LOADING);
  const [loadError,setLoadError]=useState<LoadFailureReason|null>(null);
  const [profileTab,setProfileTab]=useState<ProfileTab>('signIn');
  const theme=useDocumentTheme();
  const preference=useAppearance(s=>s.preference);
  const setPreference=useAppearance(s=>s.setPreference);
  const ambience=useAmbiencePreference();
  const t=(text:string)=>translateText(language,text);

  // Only the newest save lookup may update the card, so a slow answer for a profile that was just left cannot overwrite it.
  const lookup=useRef(0);
  const refreshSummary=useCallback(()=>{
    const mine=++lookup.current;
    setSummary(SAVE_SUMMARY_LOADING);
    deps.peekSummary().then(next=>{if(lookup.current===mine)setSummary(next);});
  },[deps]);

  // Boot: the session and the save lookup run together. Nothing is set if the shell is gone before they finish.
  useEffect(()=>{
    let alive=true;
    const mine=++lookup.current;
    Promise.all([Promise.resolve(deps.readSession()),deps.peekSummary()]).then(([found,peeked])=>{
      if(!alive)return;
      setSession(found);
      if(lookup.current===mine)setSummary(peeked);
      dispatch({type:'BOOT_RESOLVED',hasActiveGame:useGameStore.getState().playerProfile.setupComplete});
    });
    return ()=>{alive=false;};
  },[deps]);

  // Back on the landing screen from setup, a load or the game: look at the saves again.
  const previousScreen=useRef(state.screen);
  useEffect(()=>{
    if(state.screen==='landing'&&previousScreen.current!=='booting'&&previousScreen.current!=='landing'){setSession(deps.readSession());refreshSummary();}
    previousScreen.current=state.screen;
  },[state.screen,deps,refreshSummary]);

  // The setup wizard commits by completing the profile in the store; "New campaign" inside the game resets it again.
  useEffect(()=>{
    if(state.screen==='setup'&&setupComplete)dispatch({type:'SETUP_COMMITTED'});
    if(state.screen==='game'&&!setupComplete)dispatch({type:'RETURN_TO_MENU'});
  },[state.screen,setupComplete]);

  useEffect(()=>{onPlaying(state.screen==='game');},[state.screen,onPlaying]);
  useEffect(()=>{if(state.screen!=='game')useGameStore.getState().setSpeed(0);},[state.screen]);

  // Loading. The preloader does the real work; the percentage on screen is whatever it has reached.
  const [handoff,setHandoff]=useState(false);
  const loading=state.screen==='loading'&&!state.error;
  const {stage}=useGamePreloader({
    enabled:loading&&!handoff,runKey:state.intent??'new',
    buildStages:()=>deps.buildPreloadStages(state.intent==='continue'?'continue':'new'),
    onProgress:percent=>dispatch({type:'PRELOAD_PROGRESS',percent}),
    onComplete:()=>setHandoff(true),
    onFail:reason=>dispatch({type:'LOAD_FAILED',reason}),
  });
  useEffect(()=>{
    if(!handoff)return;
    if(!loading){setHandoff(false);return;}
    const timer=setTimeout(()=>{setHandoff(false);dispatch({type:'LOAD_OK'});},deps.handoffMs);
    return ()=>clearTimeout(timer);
  },[handoff,loading,deps.handoffMs]);
  useEffect(()=>{if(state.error)setLoadError(state.error);},[state.error]);
  useEffect(()=>{if(state.screen==='game')setLoadError(null);},[state.screen]);

  const startNew=(event:'PLAY_NOW'|'NEW_CAMPAIGN')=>{
    deps.ensureGuest();
    setSession(deps.readSession());
    setLoadError(null);
    deps.resetCampaign(language);
    dispatch({type:event});
  };
  const heroAction=resolveHeroAction(session,summary);
  const kind=sessionKindOf(session);
  const profileName=session?.kind==='profile'?session.username:undefined;

  const openProfile=()=>{setProfileTab(kind==='profile'?'account':'signIn');dispatch({type:'OPEN_PROFILE'});};
  const afterSessionChange=(tab:ProfileTab)=>{setSession(deps.readSession());setProfileTab(tab);refreshSummary();};

  if(state.screen==='booting')return <div className="landing094" data-testid="landing-root" data-screen="booting" lang={language} aria-busy="true"><LandingBackdrop/></div>;
  if(state.screen==='game')return null;
  if(state.screen==='setup')return <Setup onReturnToMenu={()=>dispatch({type:'SETUP_CANCELLED'})} startImmediately/>;

  if(state.screen==='loading')return <GameLoadingScreen
    language={language} percent={handoff?100:state.progress} stage={handoff?'handoff':stage} error={state.error}
    onReturnToMenu={()=>dispatch({type:'RETURN_TO_MENU'})}/>;

  return <div className="landing094" data-testid="landing-root" data-screen="landing" lang={language}>
    <LandingBackdrop/>
    <UtilityDock
      language={language} onLanguageChange={deps.setLanguage}
      theme={theme} onToggleTheme={()=>setPreference(theme==='dark'?'light':'dark')}
      muted={ambience.muted} audioAvailable={ambience.audioAvailable} onToggleMuted={ambience.toggleMuted}
      version={version} onOpenReleaseNotes={()=>dispatch({type:'OPEN_RELEASE_NOTES'})}
      sessionKind={kind} profileName={profileName} onOpenDossier={openProfile}/>
    <main className="l94-stage" aria-labelledby="landing-title">
      <section className="l94-hero">
        <HeroBrand language={language} version={version}/>
        <CommandMenu
          language={language} heroAction={heroAction} busy={false}
          onPlayNow={()=>startNew('PLAY_NOW')} onNewCampaign={()=>startNew('NEW_CAMPAIGN')}
          onContinue={()=>{deps.ensureGuest();setLoadError(null);dispatch({type:'CONTINUE'});}} onOpenDossier={openProfile}/>
        <LeadershipWisdomWidget variant="hero" context={{screen:'landing'}}/>
      </section>
      <aside className="l94-side">
        <SaveGameCard language={language} state={summary} loadError={loadError} busy={false} onContinue={()=>{deps.ensureGuest();setLoadError(null);dispatch({type:'CONTINUE'});}}/>
      </aside>
    </main>
    <div className="l94-footer"><span>{t('Saves are stored per profile on this device')}</span></div>
    <ProfileDrawer
      language={language} open={state.overlay==='profile'} tab={profileTab} sessionKind={kind} profileName={profileName}
      onTabChange={setProfileTab} onSignedIn={()=>afterSessionChange('account')} onSignedOut={()=>afterSessionChange('signIn')}
      onClose={()=>dispatch({type:'CLOSE_OVERLAY'})}/>
    <ReleaseNotesModal language={language} open={state.overlay==='releaseNotes'} onClose={()=>dispatch({type:'CLOSE_OVERLAY'})}/>
  </div>;
}
