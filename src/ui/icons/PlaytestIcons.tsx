import type {ReactNode} from 'react';

const base={viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.7,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true,focusable:false} as const;

/** Alliance seal: a shield bearing two clasped hands. Distinct from the WORLD globe. */
export function AllianceCrestIcon({size=34}:{size?:number}){
  return <svg {...base} width={size} height={size} className="alliance-crest-icon">
    <path d="M12 2.5 19.5 5v6.2c0 4.6-3.1 8.4-7.5 10.3-4.4-1.9-7.5-5.7-7.5-10.3V5z"/>
    <path d="M7.4 12.2 10 10l2 1.4 2.2-1.6 2.4 2.4M8.4 13.6l2 1.8 1.7-1.2 1.7 1.4 2-1.8"/>
  </svg>;
}

export type NewsBadgeKind='election'|'war'|'diplomacy'|'economy';
const BADGES:Record<NewsBadgeKind,ReactNode>={
  election:<><path d="M4 12h16v8H4z"/><path d="M9 12V9.5M15 7.5l-3 4 5-2z"/><path d="M9.5 16h5"/></>,
  war:<><path d="m5 4 9 9M19 4l-9 9"/><path d="m3.5 18 3-3M20.5 18l-3-3M8.5 14.5l1.5 1.5M15.5 14.5 14 16"/></>,
  diplomacy:<><path d="m3 11 4-3 3 1 3-1 4 3-3.5 4.5a2 2 0 0 1-3 .2l-.5-.7"/><path d="M7 8 3 11M17 8l4 3M10 16l2 2M12 14l2 2"/></>,
  economy:<><circle cx="12" cy="12" r="8"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.7-2.5 1.8 0 2.5 5 1.3 5 3.9 0 1.1-1.1 1.8-2.5 1.8-1.1 0-2-.4-2.6-1.2M12 6.5V8M12 16v1.5"/></>,
};
/** Thematic glyph for a news toast, so the event type reads at a glance. */
export function NewsBadgeIcon({kind}:{kind:NewsBadgeKind}){
  return <svg {...base} width={20} height={20} className={`news-badge-icon news-badge-${kind}`} data-news-badge={kind}>{BADGES[kind]}</svg>;
}

const CAMPUS:Record<'university'|'institute'|'academy',ReactNode>={
  university:<><path d="M3 9.5 12 4l9 5.5M4.5 9.5h15"/><path d="M6.5 11v6M10 11v6M14 11v6M17.5 11v6M4 19h16M3 21h18"/></>,
  institute:<><path d="M5 20V9l7-5 7 5v11M3 20h18"/><path d="M9 20v-5h6v5M12 9v3M10.5 10.5h3"/></>,
  academy:<><path d="M3 12 12 5l9 7M5 12v8h14v-8"/><path d="M9 20v-4h6v4M12 8.5v2.5"/></>,
};
/** Architectural glyph for a development campus card. */
export function CampusIcon({kind}:{kind:'university'|'institute'|'academy'}){
  return <svg {...base} width={44} height={44} className="campus-icon" data-campus={kind}>{CAMPUS[kind]}</svg>;
}

/** Fighter jet silhouette for the aircraft crew coverage tile. */
export function JetIcon({size=28}:{size?:number}){
  return <svg {...base} width={size} height={size} className="jet-icon"><path d="M12 2.5c.9 0 1.5 1 1.5 2.4V9l7 4.5V16l-7-2-.5 4 2 1.5V22l-3-.8-3 .8v-.5l2-1.5-.5-4-7 2v-2.5L10.5 9V4.9c0-1.4.6-2.4 1.5-2.4z"/></svg>;
}
