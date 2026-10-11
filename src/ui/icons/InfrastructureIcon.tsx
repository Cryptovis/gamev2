import type { InfrastructureAsset } from '../../domain/game';

/** Small repo-native transport illustrations; no network assets or generated labels. */
export function InfrastructureIcon({asset}:{asset:InfrastructureAsset}) {
 return <svg className="infrastructure-art" data-asset={asset} width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
  <rect x="1" y="1" width="46" height="46" rx="12" fill="#183a47" stroke="#72949a"/>
  <g stroke="#e7c77c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
   {asset==='roads'&&<><path d="M13 38 19 10h10l6 28" fill="#305361"/><path d="M24 13v5m0 6v5m0 6v3" stroke="#eef1df"/></>}
   {asset==='rail'&&<><path d="m14 38 6-28m14 28-6-28M19 14h10m-11 6h12m-14 7h16m-18 8h20"/><rect x="18" y="10" width="12" height="15" rx="4" fill="#305361"/><path d="M21 14h6m-6 7h1m4 0h1" stroke="#eef1df"/></>}
   {asset==='ports'&&<><path d="M12 29h25l-5 8H17z" fill="#305361"/><path d="M17 29V12h17m-13 0v17m13-17v11l-3 3M9 39q4-4 8 0t8 0t8 0t8 0"/><path d="M25 25h5v4h-5z" stroke="#eef1df"/></>}
   {asset==='hubs'&&<><path d="m10 21 14-11 14 11v16H10z" fill="#305361"/><path d="M19 37V24h10v13M9 21h30"/><path d="M14 26h2m-2 6h2m16-6h2m-2 6h2" stroke="#eef1df"/></>}
  </g>
 </svg>;
}
