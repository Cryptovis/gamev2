import type {FacilityKind} from '../../domain/industrial';

/** Original isometric building drawings for the factory modal: flat colours, no external images. Three variants by facility kind. */
export type FacilityArtVariant='mine'|'works'|'plant';
export function facilityArtVariant(kind:FacilityKind):FacilityArtVariant{
 if(kind==='civil_factory')return 'plant';
 return kind==='waterworks'||kind.endsWith('_mine')?'mine':'works';
}
type Tone={top:string;left:string;right:string};
/** An isometric box whose base diamond is centred on (x,y): half-width a, height h. */
function Box({x,y,a,h,tone}:{x:number;y:number;a:number;h:number;tone:Tone}){
 const b=a/2,pts=(p:number[][])=>p.map(q=>q.join(',')).join(' ');
 return <g>
  <polygon points={pts([[x-a,y],[x,y+b],[x,y+b-h],[x-a,y-h]])} fill={tone.left}/>
  <polygon points={pts([[x,y+b],[x+a,y],[x+a,y-h],[x,y+b-h]])} fill={tone.right}/>
  <polygon points={pts([[x,y-b-h],[x+a,y-h],[x,y+b-h],[x-a,y-h]])} fill={tone.top}/>
 </g>;
}
const STONE:Tone={top:'#d7cdb6',left:'#a89b80',right:'#8c7f66'};
const WOOD:Tone={top:'#c79a62',left:'#98703f',right:'#7b5830'};
const BRICK:Tone={top:'#d98a62',left:'#b4623f',right:'#964e30'};
const STEEL:Tone={top:'#b9c7d3',left:'#8197a8',right:'#667c8d'};
const GLASS:Tone={top:'#cfe0ec',left:'#6f94b3',right:'#58799a'};
const DARK:Tone={top:'#59636d',left:'#424b54',right:'#333b43'};

export function FacilityArt({kind,size=160,className=''}:{kind:FacilityKind;size?:number;className?:string}){
 const variant=facilityArtVariant(kind);
 return <svg className={`factory-art ${className}`} data-variant={variant} width={size} height={size} viewBox="0 0 160 160" aria-hidden="true" focusable="false">
  <ellipse cx="80" cy="126" rx="70" ry="26" fill="#000" opacity=".12"/>
  <polygon points="80,96 150,126 80,156 10,126" fill="#9bbf7e"/>
  <polygon points="80,96 150,126 80,156 10,126" fill="none" stroke="#6f9757" strokeWidth="2"/>
  {variant==='mine'&&<g>
   <Box x={56} y={122} a={26} h={20} tone={STONE}/>
   <polygon points="30,118 54,70 80,118" fill="#7d725d"/><polygon points="54,70 80,118 66,118" fill="#665c4a"/>
   <Box x={104} y={128} a={16} h={18} tone={WOOD}/>
   <path d="M88 118 L104 62 M120 118 L104 62" stroke="#3b3f45" strokeWidth="4" fill="none" strokeLinecap="round"/>
   <path d="M92 100 H116" stroke="#3b3f45" strokeWidth="3"/>
   <circle cx="104" cy="60" r="11" fill="#c9ced3" stroke="#3b3f45" strokeWidth="3"/><circle cx="104" cy="60" r="3" fill="#3b3f45"/>
   <polygon points="48,138 62,134 76,138 62,146" fill="#3b3f45"/>
  </g>}
  {variant==='works'&&<g>
   <Box x={72} y={128} a={38} h={30} tone={BRICK}/>
   {[0,1,2].map(i=><polygon key={i} points={`${40+i*24},${88-i*0} ${40+i*24},${70} ${64+i*24},${88}`} fill="#7c8791" transform={`translate(${i*0},${i*12})`}/>)}
   <Box x={116} y={98} a={10} h={44} tone={DARK}/>
   <circle cx="116" cy="40" r="7" fill="#e8ebee" opacity=".9"/><circle cx="124" cy="28" r="9" fill="#e8ebee" opacity=".7"/><circle cx="134" cy="14" r="10" fill="#e8ebee" opacity=".45"/>
   <polygon points="52,132 66,139 66,122 52,115" fill="#6b3a26"/>
   {[0,1,2].map(i=><polygon key={i} points={`${82+i*10},${130+i*4.4} ${88+i*10},${133+i*4.4} ${88+i*10},${123+i*4.4} ${82+i*10},${120+i*4.4}`} fill="#f3d98b"/>)}
  </g>}
  {variant==='plant'&&<g>
   <Box x={62} y={130} a={34} h={20} tone={STEEL}/>
   <Box x={76} y={102} a={20} h={44} tone={GLASS}/>
   <Box x={114} y={124} a={16} h={26} tone={STONE}/>
   {[0,1,2,3].map(i=><g key={i}><polygon points={`${58},${94-i*9} ${72},${101-i*9} ${72},${96-i*9} ${58},${89-i*9}`} fill="#eaf3fa" opacity=".8"/></g>)}
   {[0,1].map(i=><polygon key={i} points={`${108+i*8},${122+i*4} ${114+i*8},${125+i*4} ${114+i*8},${117+i*4} ${108+i*8},${114+i*4}`} fill="#f3d98b"/>)}
   <rect x="74" y="38" width="3" height="22" fill="#59636d"/><polygon points="77,38 92,43 77,48" fill="#d0533e"/>
  </g>}
 </svg>;
}
