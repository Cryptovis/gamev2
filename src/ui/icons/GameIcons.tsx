import type { ReactNode } from 'react';
import type { ReligionType, TradeResource } from '../../domain/game';

type IconProps = { size?: number; className?: string };

const Svg = ({ size = 18, className, children, viewBox = '0 0 24 24' }: IconProps & { children: ReactNode; viewBox?: string }) => (
  <svg className={className} width={size} height={size} viewBox={viewBox} fill="none" aria-hidden="true">{children}</svg>
);

export function TreasuryIcon(props: IconProps) {
  return <Svg {...props}><path d="M4 8h16v11H4z" stroke="currentColor" strokeWidth="1.6"/><path d="M7 8V5h10v3M8 13h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></Svg>;
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
export function PersonnelIcon(props: IconProps) {
  return <Svg {...props}><circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M6 20c.5-4 2.5-6 6-6s5.5 2 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></Svg>;
}
export function TankIcon(props: IconProps) {
  return <Svg {...props}><path d="M5 11h11l2 3H7l-2-3Z" stroke="currentColor" strokeWidth="1.5"/><path d="M9 11V8h5l2 3M14 8l5-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 17h10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></Svg>;
}
export function JetIcon(props: IconProps) {
  return <Svg {...props}><path d="m3 13 8-2 3-7 2 1-1 6 6 2v2l-6-.3-3 5-1.5-.5.5-5.2-8-.5V13Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></Svg>;
}
export function ShipIcon(props: IconProps) {
  return <Svg {...props}><path d="M4 15h16l-3 4H7l-3-4Z" stroke="currentColor" strokeWidth="1.6"/><path d="M9 15V7h5v8M14 10h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></Svg>;
}
export function ArtilleryIcon(props: IconProps) {
  return <Svg {...props}><circle cx="8" cy="17" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="m10 15 8-9M13 10l5 2M11 16h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></Svg>;
}
export function IndustryIcon(props: IconProps) {
  return <Svg {...props}><path d="M4 20V9l5 3V8l5 3V5h3v15H4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M7 16h2M12 16h2M17 16h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></Svg>;
}

export function ResourceIcon({ resource, ...props }: IconProps & { resource: TradeResource | 'uranium' }) {
  if (resource === 'food') return <FoodIcon {...props}/>;
  if (resource === 'oil') return <OilIcon {...props}/>;
  if (resource === 'iron') return <IronIcon {...props}/>;
  return <UraniumIcon {...props}/>;
}

const RELIGION_SYMBOL: Record<ReligionType, string> = {
  christianity: '✝', catholic_christianity: '✝', orthodox_christianity: '☦', protestant_christianity: '✝',
  islam: '☪', hinduism: 'ॐ', buddhism: '☸', judaism: '✡', unaffiliated: '◌', folk_or_mixed: '✦',
};
export function ReligionGlyph({ religion, size = 18 }: { religion: ReligionType; size?: number }) {
  return <span className="religion-glyph" style={{ fontSize: size }} aria-hidden="true">{RELIGION_SYMBOL[religion]}</span>;
}

export function FuelIcon(props: IconProps) {
  return <Svg {...props}><path d="M7 4h8v16H7z" stroke="currentColor" strokeWidth="1.6"/><path d="M9 7h4M15 8l3 2v7a1.5 1.5 0 0 0 3 0v-5l-2-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></Svg>;
}
export function SteelIcon(props: IconProps) {
  return <Svg {...props}><path d="M5 7h14l-2 4H7L5 7Zm2 6h10l-2 4H9l-2-4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M4 20h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></Svg>;
}
export function PowerIcon(props: IconProps) {
  return <Svg {...props}><path d="m13 2-6 11h5l-1 9 6-12h-5l1-8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></Svg>;
}
export function ResearchIcon(props: IconProps) {
  return <Svg {...props}><circle cx="10" cy="10" r="5" stroke="currentColor" strokeWidth="1.6"/><path d="m14 14 5 5M8 10h4M10 8v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></Svg>;
}
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
