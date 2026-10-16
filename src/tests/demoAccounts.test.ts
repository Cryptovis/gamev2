import {describe,it,expect,vi,afterEach} from 'vitest';
import {ensureGuestSession,enterDemoSession,demoOwner,hasDemoSession,mathChallenge} from '../session/demoAccounts';

const storage=()=>{const data=new Map<string,string>();return {getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);},clear:()=>data.clear()};};
afterEach(()=>{vi.unstubAllGlobals();});

describe('ensureGuestSession',()=>{
 it('starts the guest session when the tab has none',()=>{
  vi.stubGlobal('sessionStorage',storage());
  expect(hasDemoSession()).toBe(false);
  expect(ensureGuestSession()).toEqual({username:'guest',kind:'guest'});
  expect(hasDemoSession()).toBe(true);
  expect(demoOwner()).toBe('guest');
 });
 it('is idempotent: repeated calls return the same info and write once',()=>{
  const session=storage();const set=vi.spyOn(session,'setItem');
  vi.stubGlobal('sessionStorage',session);
  const first=ensureGuestSession();const second=ensureGuestSession();const third=ensureGuestSession();
  expect(second).toEqual(first);expect(third).toEqual(first);
  expect(set).toHaveBeenCalledTimes(1);
 });
 it('leaves an existing profile session untouched',()=>{
  const session=storage();const set=vi.spyOn(session,'setItem');
  vi.stubGlobal('sessionStorage',session);
  enterDemoSession('alper');set.mockClear();
  expect(ensureGuestSession()).toEqual({username:'alper',kind:'profile'});
  expect(set).not.toHaveBeenCalled();
  expect(demoOwner()).toBe('alper');
 });
 it('asks for no credentials and never runs the math challenge',()=>{
  vi.stubGlobal('sessionStorage',storage());
  const random=vi.fn((bytes:Uint8Array)=>bytes);
  vi.stubGlobal('crypto',{getRandomValues:random});
  ensureGuestSession();
  expect(random).not.toHaveBeenCalled();
 });
 it('does not throw when storage is blocked and reports a guest',()=>{
  const blocked={getItem:()=>{throw new Error('blocked');},setItem:()=>{throw new Error('blocked');},removeItem:()=>{throw new Error('blocked');}};
  vi.stubGlobal('sessionStorage',blocked);
  expect(()=>ensureGuestSession()).not.toThrow();
  expect(ensureGuestSession()).toEqual({username:'guest',kind:'guest'});
 });
 it('keeps the math challenge available and unchanged for the registration form',()=>{
  const challenge=mathChallenge();
  expect(challenge.question).toMatch(/^[1-9] \+ [1-9]$/);
  const [a,b]=challenge.question.split(' + ').map(Number);
  expect(challenge.answer).toBe(a+b);
 });
});
