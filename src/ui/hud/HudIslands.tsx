import type {ReactNode} from 'react';
export function LeaderCapsule({children}:{children:ReactNode}){
 return <div className="leader-brand leader-capsule">{children}</div>;
}
export function MetricsIsland({children,label}:{children:ReactNode;label:string}){
 return <div className="metrics governance-metrics metrics-island" data-guide="top-metrics" aria-label={label}>{children}</div>;
}
