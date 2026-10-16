// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {ProfileDrawer,type ProfileDrawerProps} from '../ui/panels/landing/ProfileDrawer';
import {demoOwner,enterDemoSession,hasDemoSession,leaveDemoSession,loginDemoAccount,registerDemoAccount} from '../session/demoAccounts';
import {UI_CATALOG_LANDING} from '../i18n/uiCatalogLanding';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let host:HTMLDivElement,root:Root;
beforeEach(()=>{localStorage.clear();sessionStorage.clear();host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>{root.unmount();});host.remove();vi.restoreAllMocks?.();});

const props=(extra:Partial<ProfileDrawerProps>={}):ProfileDrawerProps=>({language:'en',open:true,tab:'signIn',sessionKind:'none',onTabChange:vi.fn(),onSignedIn:vi.fn(),onSignedOut:vi.fn(),onClose:vi.fn(),...extra});
const show=async(p:ProfileDrawerProps)=>{await act(async()=>{root.render(createElement(ProfileDrawer,p));});};
const byId=(id:string)=>host.querySelector(`[data-testid="${id}"]`) as HTMLElement|null;
const field=(name:string)=>host.querySelector(`[name="${name}"]`) as HTMLInputElement;
const click=async(id:string)=>{await act(async()=>{byId(id)!.click();});};
// React tracks input values itself, so a plain assignment is not seen: use the native setter and fire an input event.
const type=async(name:string,value:string)=>{await act(async()=>{const input=field(name);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});};
// Hashing a password takes a moment, so wait until the form has finished (its button is enabled again) instead of for a fixed time.
const submit=async()=>{
 await act(async()=>{(host.querySelector('form') as HTMLFormElement).requestSubmit();});
 for(let waited=0;waited<5000&&(byId('profile-submit') as HTMLButtonElement|null)?.disabled;waited+=20)await act(async()=>{await new Promise(resolve=>setTimeout(resolve,20));});
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0));});
};
const alertText=()=>host.querySelector('[role="alert"]')?.textContent??null;

describe('ProfileDrawer structure',()=>{
 it('renders nothing while closed',async()=>{await show(props({open:false}));expect(host.innerHTML).toBe('');});
 it('is a modal dialog labelled by its title, with the test ids from the blueprint',async()=>{
  await show(props());
  const dialog=byId('profile-drawer')!;
  expect(dialog.getAttribute('role')).toBe('dialog');expect(dialog.getAttribute('aria-modal')).toBe('true');expect(dialog.getAttribute('aria-label')).toBe('Commander dossier');
  expect(dialog.querySelector('h2')!.textContent).toBe('Commander dossier');
  for(const id of ['profile-tab-signin','profile-tab-register','profile-close','profile-scrim'])expect(byId(id),id).not.toBeNull();
 });
 it('offers Sign in and Create profile to someone who is not signed in, and Account only to a profile',async()=>{
  for(const sessionKind of ['none','guest'] as const){await show(props({sessionKind}));expect(byId('profile-tab-account'),sessionKind).toBeNull();expect(byId('profile-tab-signin')!.textContent).toBe('Sign in');expect(byId('profile-tab-register')!.textContent).toBe('Create profile');}
  await show(props({sessionKind:'profile',profileName:'alper',tab:'account'}));
  expect(byId('profile-tab-signin')).toBeNull();expect(byId('profile-tab-register')).toBeNull();expect(byId('profile-tab-account')!.textContent).toBe('Account');
 });
 it('marks the selected tab and reports a tab change',async()=>{
  const p=props({tab:'register'});await show(p);
  expect(byId('profile-tab-register')!.getAttribute('aria-selected')).toBe('true');expect(byId('profile-tab-signin')!.getAttribute('aria-selected')).toBe('false');
  await click('profile-tab-signin');expect(p.onTabChange).toHaveBeenCalledWith('signIn');
 });
 it('falls back to sign-in when asked for the account tab without a profile',async()=>{
  await show(props({tab:'account',sessionKind:'guest'}));
  expect(byId('profile-tab-signin')!.getAttribute('aria-selected')).toBe('true');expect(field('username')).not.toBeNull();
 });
 it('focuses the first field when it opens',async()=>{await show(props());expect(document.activeElement).toBe(field('username'));});
 it('has no play-without-an-account button, because guest play is the landing screen\'s main action',async()=>{
  for(const tab of ['signIn','register'] as const){await show(props({tab}));expect(host.textContent!.toLowerCase().includes('without an account'),tab).toBe(false);expect(host.querySelector('[data-entry="demo"]')).toBeNull();}
 });
});

describe('ProfileDrawer dismissal',()=>{
 it('closes from the close button, the backdrop and Escape',async()=>{
  const p=props();await show(p);
  await click('profile-close');expect(p.onClose).toHaveBeenCalledTimes(1);
  await act(async()=>{byId('profile-scrim')!.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));});expect(p.onClose).toHaveBeenCalledTimes(2);
  await act(async()=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));});expect(p.onClose).toHaveBeenCalledTimes(3);
 });
 it('does not close when the press starts inside the drawer',async()=>{
  const p=props();await show(p);
  await act(async()=>{field('username').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));});
  expect(p.onClose).not.toHaveBeenCalled();
 });
});

describe('ProfileDrawer sign-in',()=>{
 it('never runs the math challenge on the sign-in tab, so guest and sign-in paths need no puzzle',async()=>{
  const random=vi.spyOn(crypto,'getRandomValues');
  await show(props({tab:'signIn'}));
  expect(byId('math-question')).toBeNull();expect(field('answer')).toBeNull();expect(field('email')).toBeNull();
  expect(random).not.toHaveBeenCalled();
 });
 it('signs in to an existing profile and reports it',async()=>{
  await registerDemoAccount('alper','alper@example.test','secret123');leaveDemoSession();
  const p=props();await show(p);
  await type('username',' ALPER ');await type('password','secret123');await submit();
  expect(p.onSignedIn).toHaveBeenCalledTimes(1);expect(demoOwner()).toBe('alper');expect(alertText()).toBeNull();
 });
 it('shows the error and does not report a sign-in for a wrong password',async()=>{
  await registerDemoAccount('alper','alper@example.test','secret123');leaveDemoSession();
  const p=props();await show(p);
  await type('username','alper');await type('password','wrongpass');await submit();
  expect(alertText()).toBe('Username or password is incorrect.');expect(p.onSignedIn).not.toHaveBeenCalled();expect(hasDemoSession()).toBe(false);
 });
 it('stays usable after a failed attempt',async()=>{
  const p=props();await show(p);
  await type('username','nobody');await type('password','whatever1');await submit();
  expect((byId('profile-submit') as HTMLButtonElement).disabled).toBe(false);
 });
});

describe('ProfileDrawer registration',()=>{
 const answerFor=()=>{const [a,b]=byId('math-question')!.textContent!.match(/\d+/g)!.map(Number);return a+b;};
 it('shows the math question, the email field and a stronger password rule on the Create profile tab',async()=>{
  const random=vi.spyOn(crypto,'getRandomValues');
  await show(props({tab:'register'}));
  expect(byId('math-question')!.textContent).toMatch(/^\d \+ \d = \?$/);expect(field('email')).not.toBeNull();expect(field('password').minLength).toBe(8);
  expect(random).toHaveBeenCalled();
 });
 it('creates the profile and reports it when the answer is right',async()=>{
  const p=props({tab:'register'});await show(p);
  await type('username','demoalper');await type('email','alper@example.test');await type('password','testpass123');await type('answer',String(answerFor()));await submit();
  expect(p.onSignedIn).toHaveBeenCalledTimes(1);expect(demoOwner()).toBe('demoalper');
  expect(localStorage.getItem('trp-demo-accounts-v1')).not.toContain('testpass123');
 });
 it('rejects a wrong answer, asks a new question and creates nothing',async()=>{
  const p=props({tab:'register'});await show(p);
  await type('username','demoalper');await type('email','alper@example.test');await type('password','testpass123');await type('answer',String(answerFor()+1));await submit();
  expect(alertText()).toBe('The answer is not correct. Try the new question.');expect(p.onSignedIn).not.toHaveBeenCalled();
  expect(localStorage.getItem('trp-demo-accounts-v1')).toBeNull();expect(field('answer').value).toBe('');
 });
 it('reports a duplicate username',async()=>{
  await registerDemoAccount('alper','a@example.test','secret123');leaveDemoSession();
  const p=props({tab:'register'});await show(p);
  await type('username','ALPER');await type('email','b@example.test');await type('password','secret123');await type('answer',String(answerFor()));await submit();
  expect(alertText()).toContain('already used');expect(p.onSignedIn).not.toHaveBeenCalled();
 });
});

describe('ProfileDrawer account tab',()=>{
 it('shows the profile name and the per-profile saves note',async()=>{
  await show(props({sessionKind:'profile',profileName:'alper',tab:'account'}));
  expect(byId('profile-drawer')!.textContent).toContain('alper');expect(byId('profile-drawer')!.textContent).toContain('Saves are stored per profile on this device');
 });
 it('signs out: ends the demo session and tells the shell',async()=>{
  enterDemoSession('alper');
  const p=props({sessionKind:'profile',profileName:'alper',tab:'account'});await show(p);
  await click('profile-signout');
  expect(hasDemoSession()).toBe(false);expect(demoOwner()).toBe('guest');expect(p.onSignedOut).toHaveBeenCalledTimes(1);
 });
 it('can sign in again after signing out',async()=>{
  await registerDemoAccount('alper','a@example.test','secret123');leaveDemoSession();
  await loginDemoAccount('alper','secret123');expect(demoOwner()).toBe('alper');
 });
});

describe('ProfileDrawer language',()=>{
 it('translates tabs, labels, buttons and the saves note',async()=>{
  await show(props({language:'tr'}));
  expect(byId('profile-drawer')!.getAttribute('aria-label')).toBe(UI_CATALOG_LANDING['Commander dossier'][0]);
  expect(byId('profile-tab-register')!.textContent).toBe(UI_CATALOG_LANDING['Create profile'][0]);
  await show(props({language:'zh',sessionKind:'profile',profileName:'alper',tab:'account'}));
  expect(byId('profile-signout')!.textContent).toBe(UI_CATALOG_LANDING['Sign out'][2]);
  expect(byId('profile-drawer')!.textContent).toContain(UI_CATALOG_LANDING['Saves are stored per profile on this device'][2]);
 });
 it('switches language while open without losing what was typed',async()=>{
  await show(props());await type('username','alper');
  await show(props({language:'es'}));
  expect(field('username').value).toBe('alper');expect(byId('profile-tab-signin')!.textContent).not.toBe('Sign in');
 });
});
