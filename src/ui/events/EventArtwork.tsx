import type { EventKind } from '../../domain/game';

const palette:Record<EventKind,{a:string;b:string;accent:string}> = {
 food_crisis:{a:'#4d5231',b:'#111a15',accent:'#c9b35f'},
 inflation_shock:{a:'#5a3d34',b:'#141015',accent:'#d47764'},
 war_weariness:{a:'#41484f',b:'#0f151b',accent:'#c55d61'},
 corruption_scandal:{a:'#524035',b:'#10151a',accent:'#d0a05f'},
 fuel_crisis:{a:'#4b3729',b:'#11151a',accent:'#dd9b4c'},
 intelligence_breach:{a:'#263f4b',b:'#0d141c',accent:'#61b3ce'},
};

function Scene({kind}:{kind:EventKind}){
 const p=palette[kind];
 if(kind==='food_crisis') return <><path d="M70 430c70-48 120-35 180-5 57 28 126 10 205-28v210H70Z" fill={p.a}/><path d="M145 520c20-76 42-130 71-188M194 512c16-62 36-113 65-165M300 520c-9-70-8-130 7-191M350 518c4-64 18-117 44-163" stroke={p.accent} strokeOpacity=".62" strokeWidth="8" strokeLinecap="round"/><path d="M205 356l-37-29M228 405l-45-26M307 354l36-33M313 418l46-25" stroke={p.accent} strokeOpacity=".46" strokeWidth="7" strokeLinecap="round"/></>;
 if(kind==='inflation_shock') return <><path d="M90 505 160 420l72 43 72-138 88 54 92-171" fill="none" stroke={p.accent} strokeWidth="15" strokeLinejoin="round"/><path d="m458 208 27 8-16 24" fill="none" stroke={p.accent} strokeWidth="11" strokeLinecap="round"/><g opacity=".45" fill="none" stroke="#e6e9e9" strokeWidth="3"><circle cx="175" cy="258" r="72"/><circle cx="175" cy="258" r="52"/></g><text x="175" y="283" textAnchor="middle" fontSize="75" fontWeight="800" fill="#eef0ec" opacity=".65">%</text></>;
 if(kind==='war_weariness') return <><path d="M80 532h410" stroke={p.accent} strokeOpacity=".32" strokeWidth="3"/><path d="M142 503c13-79 39-135 88-177 18-15 29-39 30-67h56c2 29 13 52 31 67 49 42 76 98 89 177H142Z" fill={p.a}/><path d="M185 398h205M201 443h175" stroke="#dae2e7" strokeOpacity=".18" strokeWidth="5"/><path d="M251 258c5-44 20-75 37-96 18 21 32 52 37 96" fill="none" stroke={p.accent} strokeWidth="12" strokeLinecap="round"/></>;
 if(kind==='corruption_scandal') return <><rect x="96" y="176" width="360" height="300" rx="14" fill={p.a} opacity=".7"/><path d="M130 245h292M130 302h292M130 359h215" stroke="#e6ecef" strokeOpacity=".18" strokeWidth="8" strokeLinecap="round"/><circle cx="376" cy="384" r="74" fill="#0c141a" stroke={p.accent} strokeWidth="8"/><text x="376" y="411" textAnchor="middle" fontSize="92" fontWeight="800" fill={p.accent}>§</text><path d="M119 178l58-45 48 45M350 176l45-45 42 45" stroke={p.accent} strokeOpacity=".6" strokeWidth="8"/></>;
 if(kind==='fuel_crisis') return <><path d="M185 160h180v335H185Z" fill={p.a} opacity=".8"/><path d="M218 208h114v88H218Z" fill="#101a20" stroke={p.accent} strokeOpacity=".7" strokeWidth="5"/><path d="M365 230c75 19 50 103 86 122 33 18 57-10 57-46v-54l-43-39" fill="none" stroke={p.accent} strokeWidth="12" strokeLinecap="round"/><path d="M220 350h110M220 392h110" stroke="#e9e3d9" strokeOpacity=".22" strokeWidth="7"/><path d="M274 210c-26 35-36 52-36 71a36 36 0 0 0 72 0c0-19-10-36-36-71Z" fill={p.accent} opacity=".72"/></>;
 return <><path d="M90 332s78-126 190-126 190 126 190 126-78 126-190 126S90 332 90 332Z" fill={p.a} opacity=".74" stroke={p.accent} strokeWidth="8"/><circle cx="280" cy="332" r="76" fill="#08131b" stroke={p.accent} strokeWidth="8"/><circle cx="280" cy="332" r="27" fill={p.accent}/><path d="M112 158h150M298 158h146M112 505h105M338 505h106" stroke="#dce8ed" strokeOpacity=".18" strokeWidth="7" strokeLinecap="round"/></>;
}

export function EventArtwork({kind}:{kind:EventKind}){
 const p=palette[kind];
 return <svg className="event-illustration" viewBox="0 0 560 700" role="img" aria-label={kind.replaceAll('_',' ')}>
  <defs>
   <linearGradient id={`event-bg-${kind}`} x1="0" x2="1" y1="0" y2="1"><stop stopColor={p.a}/><stop offset=".5" stopColor={p.b}/><stop offset="1" stopColor="#03080d"/></linearGradient>
   <radialGradient id={`event-glow-${kind}`}><stop stopColor={p.accent} stopOpacity=".24"/><stop offset="1" stopColor={p.accent} stopOpacity="0"/></radialGradient>
   <pattern id={`event-grid-${kind}`} width="34" height="34" patternUnits="userSpaceOnUse"><path d="M34 0H0v34" fill="none" stroke="#fff" strokeOpacity=".035"/></pattern>
  </defs>
  <rect width="560" height="700" fill={`url(#event-bg-${kind})`}/>
  <circle cx="280" cy="330" r="250" fill={`url(#event-glow-${kind})`}/>
  <rect width="560" height="700" fill={`url(#event-grid-${kind})`}/>
  <Scene kind={kind}/>
  <path d="M70 574h420M70 594h290" stroke="#e5edf1" strokeOpacity=".12" strokeWidth="4"/>
 </svg>;
}
