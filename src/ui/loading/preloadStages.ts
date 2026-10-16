import {audio,type AudioState} from '../../audio/audioService';
import {LANGUAGE_OPTIONS} from '../../i18n/gameI18n';
import {translateText} from '../../i18n/localeText';
import {useGameStore} from '../../store/gameStore';
import type {LoadFailureReason} from '../landing/landingMachine';
import type {PreloadStage} from './preloadPipeline';

/** Pictures the first screen of a campaign draws. Decoding them now keeps the workspace from popping in. */
export const PRELOAD_ASSETS:readonly string[]=[
  '/assets/command/campaign-cover.webp','/assets/command/administration-atlas-078.svg','/assets/command/civic-atlas-079.webp',
  '/assets/command/navigation-atlas.webp','/assets/command/resource-atlas.webp',
  '/assets/visual-pack-1/ministry-economy.svg','/assets/visual-pack-1/ministry-defense.svg','/assets/visual-pack-1/ministry-science.svg',
  '/assets/visual-pack-1/ministry-intelligence.svg','/assets/visual-pack-1/ministry-interior.svg','/assets/visual-pack-1/ministry-society.svg',
  '/assets/leaders/civilian-atlas.webp','/assets/leaders/military-atlas.webp','/assets/leaders/aviator-atlas.webp','/assets/leaders/worker-atlas.webp',
];

/** English strings the loading and landing screens depend on. Every language must answer each of them with text. */
export const DICTIONARY_PROBE_KEYS:readonly string[]=[
  'Play now','Continue campaign','Main menu','Player Profile','Release notes','Loading command…','Handing over command…','The campaign could not be loaded',
];

export type StateInspection={ok:true}|{ok:false;reason:LoadFailureReason};
export interface PreloadServices {
  loadLatest():Promise<boolean>;
  /** Cheap structural check of the campaign in memory. It does not run the simulation. */
  inspectState():StateInspection;
  assets:readonly string[];
  decodeAsset(url:string):Promise<void>;
  languages:readonly string[];
  translate(language:string,key:string):string;
  countryCount():number;
  fontsReady():Promise<void>;
  audioState():AudioState;
  /** Gives the browser a turn between steps so the percentage can repaint. */
  yieldToBrowser():Promise<void>;
}

const withTimeout=<T,>(work:Promise<T>,ms:number,label:string):Promise<T>=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error(`${label} timed out`)),ms);
  work.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
});

export function inspectLoadedState(state:{countries?:Record<string,unknown>;playerCountryId?:string;day?:number}):StateInspection {
  const countries=state.countries;
  if(!countries||Object.keys(countries).length===0)return {ok:false,reason:'corrupt'};
  if(!state.playerCountryId||!(state.playerCountryId in countries))return {ok:false,reason:'corrupt'};
  if(typeof state.day!=='number'||!Number.isFinite(state.day)||state.day<0)return {ok:false,reason:'corrupt'};
  return {ok:true};
}

export function buildPreloadStages(intent:'new'|'continue',services:PreloadServices):PreloadStage[] {
  const hydrate:PreloadStage={id:'hydrate',async run(report){
    if(intent==='continue'){
      let loaded=false;
      try{loaded=await services.loadLatest();}catch{return {ok:false,reason:'unknown'};}
      if(!loaded)return {ok:false,reason:'missing'};
    }
    report(.6);
    await services.yieldToBrowser();
    const inspected=services.inspectState();
    return inspected.ok?{ok:true}:inspected;
  }};
  const graphics:PreloadStage={id:'graphics',async run(report){
    const warnings:string[]=[];
    let done=0;
    const total=Math.max(1,services.assets.length);
    await Promise.all(services.assets.map(async url=>{
      try{await withTimeout(services.decodeAsset(url),5000,url);}catch{warnings.push(`could not decode ${url}`);}
      done+=1;report(done/total);
    }));
    return {ok:true,warnings};
  }};
  const indexes:PreloadStage={id:'indexes',async run(report){
    const warnings:string[]=[];
    const count=Math.max(1,services.languages.length);
    for(let i=0;i<services.languages.length;i++){
      const language=services.languages[i];
      for(const key of DICTIONARY_PROBE_KEYS){
        const text=services.translate(language,key);
        if(typeof text!=='string'||text.trim()==='')warnings.push(`${language}: empty text for "${key}"`);
        else if(language!=='en'&&text===key)warnings.push(`${language}: "${key}" is not translated`);
      }
      report((i+1)/count*.85);
      await services.yieldToBrowser();
    }
    if(services.countryCount()<=0)warnings.push('country index is empty');
    return {ok:true,warnings};
  }};
  const workspace:PreloadStage={id:'workspace',async run(report){
    const warnings:string[]=[];
    try{await withTimeout(services.fontsReady(),1500,'fonts');}catch{warnings.push('fonts were not ready in time');}
    report(.6);
    if(services.audioState()==='unavailable')warnings.push('audio is unavailable');
    report(1);
    return {ok:true,warnings};
  }};
  return [hydrate,graphics,indexes,workspace];
}

const decodeInBrowser=(url:string):Promise<void>=>{
  if(typeof Image==='undefined')return Promise.resolve();
  const image=new Image();
  image.src=url;
  return typeof image.decode==='function'?image.decode():new Promise((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error(url));});
};

export const defaultPreloadServices=(loadLatest:()=>Promise<boolean>):PreloadServices=>({
  loadLatest,
  inspectState:()=>inspectLoadedState(useGameStore.getState()),
  assets:PRELOAD_ASSETS,
  decodeAsset:decodeInBrowser,
  languages:LANGUAGE_OPTIONS.map(option=>option.id),
  translate:(language,key)=>translateText(language as never,key),
  countryCount:()=>Object.keys(useGameStore.getState().countries).length,
  fontsReady:()=>typeof document!=='undefined'&&document.fonts?.ready?document.fonts.ready.then(()=>undefined):Promise.resolve(),
  audioState:()=>audio.state(),
  yieldToBrowser:()=>new Promise(resolve=>setTimeout(resolve,0)),
});
