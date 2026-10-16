// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {version} from '../../package.json';
import {RELEASE_NOTES,latestReleaseNotes} from '../data/releaseNotes';
import {ReleaseNotesModal} from '../ui/panels/landing/ReleaseNotesModal';
import {UI_CATALOG_LANDING} from '../i18n/uiCatalogLanding';
import type {GameLanguage} from '../domain/game';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const LANGUAGES:GameLanguage[]=['en','tr','es','zh','ru'];

describe('RELEASE_NOTES data',()=>{
 it('describes the version this build ships, newest first',()=>{
  expect(RELEASE_NOTES.length).toBeGreaterThan(0);
  expect(RELEASE_NOTES[0].version).toBe(version);
 });
 it('has the same number of non-empty highlights in all five languages',()=>{
  for(const note of RELEASE_NOTES){
   const counts=LANGUAGES.map(language=>note.highlights[language].length);
   expect(counts[0],note.version).toBeGreaterThan(0);
   expect(new Set(counts).size,`${note.version} ${counts}`).toBe(1);
   for(const language of LANGUAGES)for(const line of note.highlights[language]){expect(line.trim().length,`${note.version} ${language}`).toBeGreaterThan(10);expect(line,`${note.version} ${language}`).toBe(line.trim());}
  }
 });
 it('does not repeat English text in the other languages',()=>{
  for(const note of RELEASE_NOTES)note.highlights.en.forEach((english,index)=>{
   for(const language of LANGUAGES.slice(1))expect(note.highlights[language][index],`${note.version} ${language} #${index}`).not.toBe(english);
  });
 });
 it('uses ISO dates when it has one and lists each version once',()=>{
  for(const note of RELEASE_NOTES)if(note.date)expect(note.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(new Set(RELEASE_NOTES.map(note=>note.version)).size).toBe(RELEASE_NOTES.length);
 });
 it('shows at most the requested number of entries',()=>{
  expect(latestReleaseNotes()).toHaveLength(Math.min(3,RELEASE_NOTES.length));
  expect(latestReleaseNotes(1)).toHaveLength(1);
  expect(latestReleaseNotes(0)).toHaveLength(0);
  expect(latestReleaseNotes(-4)).toHaveLength(0);
 });
});

describe('ReleaseNotesModal',()=>{
 let host:HTMLDivElement,root:Root;
 beforeEach(()=>{host=document.createElement('div');document.body.append(host);root=createRoot(host);});
 afterEach(async()=>{await act(async()=>{root.unmount();});host.remove();});
 const show=async(props:{language?:GameLanguage;open?:boolean;onClose?:()=>void}={})=>{await act(async()=>{root.render(createElement(ReleaseNotesModal,{language:props.language??'en',open:props.open??true,onClose:props.onClose??(()=>{})}));});};
 const byId=(id:string)=>host.querySelector(`[data-testid="${id}"]`) as HTMLElement|null;

 it('renders nothing while closed',async()=>{await show({open:false});expect(host.innerHTML).toBe('');});
 it('is a modal dialog titled Release notes with a close button',async()=>{
  await show();
  const dialog=byId('release-notes-modal')!;
  expect(dialog.getAttribute('role')).toBe('dialog');expect(dialog.getAttribute('aria-modal')).toBe('true');expect(dialog.getAttribute('aria-label')).toBe('Release notes');
  expect(dialog.querySelector('h2')!.textContent).toBe('Release notes');expect(byId('release-notes-close')!.textContent).toBe('Close');
 });
 it('lists the version and its highlights in the current language',async()=>{
  for(const language of LANGUAGES){
   await show({language});
   const body=byId('release-notes-modal')!;
   expect(body.textContent,language).toContain(`v${RELEASE_NOTES[0].version}`);
   expect([...body.querySelectorAll('li')].map(li=>li.textContent),language).toEqual([...RELEASE_NOTES[0].highlights[language]]);
  }
 });
 it('translates its title and close button',async()=>{
  await show({language:'tr'});
  expect(byId('release-notes-modal')!.querySelector('h2')!.textContent).toBe(UI_CATALOG_LANDING['Release notes'][0]);
 });
 it('closes from the button, the backdrop and Escape, but not from a press inside the dialog',async()=>{
  const onClose=vi.fn();await show({onClose});
  await act(async()=>{byId('release-notes-close')!.click();});expect(onClose).toHaveBeenCalledTimes(1);
  await act(async()=>{byId('release-notes-modal')!.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));});expect(onClose).toHaveBeenCalledTimes(1);
  await act(async()=>{byId('release-notes-scrim')!.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));});expect(onClose).toHaveBeenCalledTimes(2);
  await act(async()=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));});expect(onClose).toHaveBeenCalledTimes(3);
 });
 it('puts focus on the close button when it opens',async()=>{await show();expect(document.activeElement).toBe(byId('release-notes-close'));});
});
