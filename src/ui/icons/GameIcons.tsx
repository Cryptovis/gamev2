import {LocaleText} from '../../i18n/localeText';
import {AssetThumbnail} from './AssetThumbnail';
import type { ReactNode } from 'react';
import type { ReligionType, TradeResource } from '../../domain/game';

type IconProps = { size?: number; className?: string };

const Svg = ({ size = 18, className, children, viewBox = '0 0 24 24' }: IconProps & { children: ReactNode; viewBox?: string }) => (
  <svg className={className} width={size} height={size} viewBox={viewBox} fill="none" aria-hidden="true"><LocaleText value={children}/></svg>
);

export function TreasuryIcon(props: IconProps) {
  return <Svg {...props}><path d="M4 8h16v11H4z" stroke="currentColor" strokeWidth="1.6"/><path d="M7 8V5h10v3M8 13h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></Svg>;
}
/** One neutral scripture symbol; the nation's religion is stated in text. */
export function SacredScriptureIcon(props: IconProps) {
  return <Svg {...props}><path d="M12 6C9 4 5.5 4 3 5v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-2.5-1-6-1-9 1Z" fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 6v14M6 9l3 .5M6 12l3 .5M15 9.5l3-.5M15 12.5l3-.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></Svg>;
}
export function FoodIcon(props: IconProps) {
  return <Svg {...props}><path d="M12 20V8M12 11c-3.5 0-5.5-2-6-5 3.5 0 5.5 2 6 5Zm0 4c3.5 0 5.5-2 6-5-3.5 0-5.5 2-6 5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></Svg>;
}
export function OilIcon(props: IconProps) {
  return <Svg {...props}><path d="M12 3s5 6 5 10a5 5 0 0 1-10 0c0-4 5-10 5-10Z" stroke="currentColor" strokeWidth="1.6"/><path d="M9.5 14.5c.6 1.5 2 2.2 3.6 1.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></Svg>;
}
export function IronIcon(props: IconProps) {
  return <Svg {...props}><path d="M5 8h14l-2 10H7L5 8Z" stroke="currentColor" strokeWidth="1.6"/><path d="M8 8 10 4h4l2 4M9 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></Svg>;
}
export function UraniumIcon(props: IconProps) {
  return <Svg {...props}><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 10c-1.2-3.6.2-5.6 2-6.6M10.3 13c-3.7.8-5.4-.9-6-2.8M13.7 13c2.5 2.8 1.9 5.1.7 6.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></Svg>;
}
export function ApprovalIcon(props: IconProps) {
  return <Svg {...props}><path d="M7 20v-8H4l3-7h4v5h5.6a2 2 0 0 1 1.9 2.6l-1.7 5.5A2.7 2.7 0 0 1 14.2 20H7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></Svg>;
}
export function PersonnelIcon({size=18}:IconProps) {return <AssetThumbnail asset="infantry_equipment" size={size>=18?Math.max(size,32):size}/>;}
export function TankIcon({size=18}:IconProps) {return <AssetThumbnail asset="tanks" size={size>=18?Math.max(size,32):size}/>;}
export function JetIcon({size=18}:IconProps) {return <AssetThumbnail asset="fighters" size={size>=18?Math.max(size,32):size}/>;}
export function ShipIcon({size=18}:IconProps) {return <AssetThumbnail asset="naval" size={size>=18?Math.max(size,32):size}/>;}
export function ArtilleryIcon({size=18}:IconProps) {return <AssetThumbnail asset="artillery" size={size>=18?Math.max(size,32):size}/>;}
export function IndustryIcon(props: IconProps) {
  return <Svg {...props}><path d="M4 20V9l5 3V8l5 3V5h3v15H4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M7 16h2M12 16h2M17 16h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></Svg>;
}

export function ResourceIcon({resource,size=18}:IconProps&{resource:TradeResource}){return <AssetThumbnail asset={resource} size={size>=18?Math.max(size,40):size}/>;}

const RELIGION_SYMBOL: Record<ReligionType, string> = {
  christianity: '✝', catholic_christianity: '✝', orthodox_christianity: '☦', protestant_christianity: '✝',
  islam: '☪', hinduism: 'ॐ', buddhism: '☸', judaism: '✡', unaffiliated: '◌', folk_or_mixed: '✦',
};
export function ReligionGlyph({ religion, size = 18 }: { religion: ReligionType; size?: number }) {
  return <span className="religion-glyph" style={{ fontSize: size }} aria-hidden="true"><LocaleText value={RELIGION_SYMBOL[religion]}/></span>;
}

export function FuelIcon({size=18}:IconProps) {return <AssetThumbnail asset="fuel" size={size>=18?Math.max(size,32):size}/>;}
export function SteelIcon({size=18}:IconProps) {return <AssetThumbnail asset="steel" size={size>=18?Math.max(size,32):size}/>;}
export function PowerIcon({size=18}:IconProps) {return <AssetThumbnail asset="electricity" size={size>=18?Math.max(size,32):size}/>;}
export function ResearchIcon({size=18}:IconProps) {return <AssetThumbnail asset="electronics" size={size>=18?Math.max(size,32):size}/>;}
export function CabinetIcon(props: IconProps) {
  return <Svg {...props}><path d="M4 20h16M6 17V9h12v8M8 9V6h8v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M9 12h2v3H9zM13 12h2v3h-2z" stroke="currentColor" strokeWidth="1.4"/></Svg>;
}
export function CouncilIcon(props: IconProps) {
  return <Svg {...props}><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M7.5 16c.7-2.6 2.2-4 4.5-4s3.8 1.4 4.5 4M4.5 10.5h3M16.5 10.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></Svg>;
}
export function BlocIcon(props: IconProps) {
  return <Svg {...props}><path d="M12 3 4 7v5c0 4.5 3.2 7.6 8 9 4.8-1.4 8-4.5 8-9V7l-8-4Z" stroke="currentColor" strokeWidth="1.6"/><path d="m8 12 2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></Svg>;
}
export function IntelligenceIcon(props: IconProps) {
  return <Svg {...props}><path d="M3 12s3-5 9-5 9 5 9 5-3 5-9 5-9-5-9-5Z" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5"/></Svg>;
}
export function InteriorIcon(props: IconProps) {
  return <Svg {...props}><path d="M12 3 5 6v5c0 4 2.5 7 7 9 4.5-2 7-5 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.6"/><path d="M9 11h6M12 8v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></Svg>;
}
export function SocietyIcon(props: IconProps) {
  return <Svg {...props}><circle cx="8" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4"/><circle cx="16" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M3.5 19c.5-3.4 2-5 4.5-5 1.4 0 2.5.5 3.2 1.4M20.5 19c-.5-3.4-2-5-4.5-5-1.4 0-2.5.5-3.2 1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></Svg>;
}

export function DiplomacyIcon(props: IconProps) {
  return <Svg {...props}><path d="M4 9 9 5l3 2 3-2 5 4-5 7-3-2-3 2-5-7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="m8 9 3 2 2-2 3 2M10 16l2 2 2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></Svg>;
}
export function EmbassyIcon(props: IconProps) {
  return <Svg {...props}><path d="M4 20h16M6 17V9h12v8M5 9l7-5 7 5M9 17v-5h6v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 4V2m0 0 4 1.5L16 5V2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></Svg>;
}
export function WarIcon(props: IconProps) {
  return <Svg {...props}><path d="m5 4 14 16M19 4 5 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="m4 3 4 1-3 3-1-4Zm16 0-4 1 3 3 1-4ZM3 20l4-1-3-3-1 4Zm18 0-4-1 3-3 1 4Z" fill="currentColor"/></Svg>;
}
export function EconomyIcon(props: IconProps) {
  return <Svg {...props}><path d="M4 19h16M6 16v-5h3v5m3 0V7h3v9m3 0V4h2v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="m5 8 4-3 4 2 6-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></Svg>;
}
export function WorldIcon(props: IconProps) {
  return <Svg {...props}><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6"/><path d="M4 12h16M12 4c2.5 2.2 3.8 4.9 3.8 8S14.5 17.8 12 20M12 4C9.5 6.2 8.2 8.9 8.2 12s1.3 5.8 3.8 8" stroke="currentColor" strokeWidth="1.3"/></Svg>;
}
export function OverviewIcon(props: IconProps) {
  return <Svg {...props}><path d="M4 5h7v6H4zM13 5h7v4h-7zM4 13h7v6H4zM13 11h7v8h-7z" stroke="currentColor" strokeWidth="1.5"/></Svg>;
}
