import {useEffect,useState,type FormEvent} from 'react';
import type {GameLanguage} from '../../../domain/game';
import {translateText} from '../../../i18n/localeText';
import {leaveDemoSession,loginDemoAccount,mathChallenge,registerDemoAccount} from '../../../session/demoAccounts';
import {ManagedDialog} from '../../windows/ManagedDialog';
import type {SessionKind} from '../../landing/heroAction';
import {AppleLogo,FacebookLogo,GoogleLogo} from './landingIcons';

export type ProfileTab='signIn'|'register'|'account';

export interface ProfileDrawerProps {
  language:GameLanguage;
  open:boolean;
  tab:ProfileTab;
  sessionKind:SessionKind;
  profileName?:string;
  onTabChange(tab:ProfileTab):void;
  /** Called after a successful sign-in or registration; the shell then re-reads the saves for the new profile. */
  onSignedIn():void;
  onSignedOut():void;
  onClose():void;
}

/**
 * Sign-in and registration form, moved here from the old entry screen with its behaviour unchanged. Only registration
 * shows the math question; it is created when the form is registered for, so the sign-in tab and guest play never run it.
 * The "play without an account" button is gone from the form because guest play is now the landing screen's main action.
 */
function CredentialForm({mode,language,onDone}:{mode:'signIn'|'register';language:GameLanguage;onDone():void}) {
  const t=(text:string)=>translateText(language,text);
  const [username,setUsername]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[answer,setAnswer]=useState('');
  const [challenge,setChallenge]=useState(()=>mode==='register'?mathChallenge():null);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const register=mode==='register';

  const submit=async(event:FormEvent)=>{
    event.preventDefault();
    if(busy)return;
    setBusy(true);setError('');
    try{
      if(register&&Number(answer)!==challenge?.answer){setChallenge(mathChallenge());setAnswer('');throw Error('The answer is not correct. Try the new question.');}
      if(register)await registerDemoAccount(username,email,password);else await loginDemoAccount(username,password);
      setPassword('');
      onDone();
    }catch(failure){
      setError(failure instanceof Error?failure.message:'Could not save your demo account.');
    }finally{setBusy(false);}
  };

  return <form className="l94-form" onSubmit={submit}>
    <label className="l94-field"><span>{t('Username')}</span><input name="username" autoFocus autoComplete="username" required maxLength={24} value={username} onChange={e=>setUsername(e.target.value)}/></label>
    {register&&<label className="l94-field"><span>{t('Email')}</span><input name="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>}
    <label className="l94-field"><span>{t('Password')}</span><input name="password" type="password" autoComplete={register?'new-password':'current-password'} required maxLength={128} minLength={register?8:undefined} value={password} onChange={e=>setPassword(e.target.value)}/></label>
    {register&&challenge&&<label className="l94-field"><span>{t('Math check')}</span><span className="l94-math" data-testid="math-question">{challenge.question} = ?</span><input name="answer" inputMode="numeric" required value={answer} onChange={e=>setAnswer(e.target.value)}/></label>}
    <button className="l94-cta l94-cta--card" type="submit" data-testid="profile-submit" disabled={busy}>{t(busy?'Please wait…':register?'Create account':'Sign in')}</button>
    {error&&<p className="l94-error" role="alert">{t(error)}</p>}
    <p className="l94-note">{t('Demo accounts and saves stay on this device. Online sign-in and email checks are not connected yet. The math question is a demo check, not bot protection.')}</p>
  </form>;
}

const SOCIAL=[{id:'google',label:'Continue with Google',Logo:GoogleLogo},{id:'apple',label:'Continue with Apple',Logo:AppleLogo},{id:'facebook',label:'Continue with Facebook',Logo:FacebookLogo}] as const;

/**
 * Google, Apple and Facebook buttons. Online sign-in is not connected yet, so each one only raises a polite
 * "Coming soon" notice (a status region, announced to screen readers, gone after a few seconds).
 */
function SocialSignIn({language}:{language:GameLanguage}) {
  const t=(text:string)=>translateText(language,text);
  const [notice,setNotice]=useState<string|null>(null);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(null),3200);return ()=>clearTimeout(timer);},[notice]);
  return <section className="l94-social" aria-label={t('Or sign in with')} data-testid="social-signin">
    <p className="l94-social-title">{t('Or sign in with')}</p>
    <div className="l94-social-buttons">
      {SOCIAL.map(({id,label,Logo})=><button key={id} type="button" className="l94-social-btn" data-testid={`social-${id}`} data-provider={id} onClick={()=>setNotice(id)}><Logo/><span>{t(label)}</span></button>)}
    </div>
    <p className="l94-toast" role="status" data-testid="social-toast" data-visible={notice?'true':'false'}>{notice?t('Coming soon'):''}</p>
  </section>;
}

/** Right-hand drawer for the commander dossier. Focus, Escape and stacking come from ManagedDialog, as for every other dialog. */
export function ProfileDrawer({language,open,tab,sessionKind,profileName,onTabChange,onSignedIn,onSignedOut,onClose}:ProfileDrawerProps) {
  if(!open)return null;
  const t=(text:string)=>translateText(language,text);
  const signedIn=sessionKind==='profile';
  // A stale "account" tab for someone who is not signed in falls back to sign-in, and the reverse.
  const active:ProfileTab=signedIn?'account':tab==='register'?'register':'signIn';
  const tabs:{id:ProfileTab;label:string;testId:string}[]=signedIn
    ?[{id:'account',label:'Account',testId:'profile-tab-account'}]
    :[{id:'signIn',label:'Sign in',testId:'profile-tab-signin'},{id:'register',label:'Create profile',testId:'profile-tab-register'}];
  const signOut=()=>{leaveDemoSession();onSignedOut();};

  return <div className="l94-drawer-layer">
    <div className="l94-drawer-scrim" data-testid="profile-scrim" onMouseDown={onClose}/>
    <ManagedDialog className="l94-drawer" label={t('Player Profile')} onClose={onClose} testId="profile-drawer">
      <header>
        <h2>{t('Player Profile')}</h2>
        <button type="button" className="lw-btn" data-testid="profile-close" onClick={onClose}>{t('Close')}</button>
      </header>
      <div className="l94-tabs" role="tablist" aria-label={t('Player Profile')}>
        {tabs.map(entry=><button key={entry.id} type="button" role="tab" className="l94-tab" id={`profile-tab-${entry.id}`} aria-selected={active===entry.id} aria-controls="profile-panel" data-testid={entry.testId} onClick={()=>onTabChange(entry.id)}>{t(entry.label)}</button>)}
      </div>
      <div className="l94-drawer-body" role="tabpanel" id="profile-panel" aria-labelledby={`profile-tab-${active}`}>
        {active==='account'
          ?<>
            <p className="l94-card-title">{profileName??''}</p>
            <p className="l94-note">{t('Saves are stored per profile on this device')}</p>
            <button type="button" className="l94-cta l94-cta--card" data-testid="profile-signout" onClick={signOut}>{t('Sign out')}</button>
          </>
          :<><CredentialForm key={active} mode={active} language={language} onDone={onSignedIn}/><SocialSignIn language={language}/></>}
      </div>
    </ManagedDialog>
  </div>;
}
