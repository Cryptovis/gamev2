export type StrategicActionKind =
  | 'diplomatic_mission'
  | 'embassy'
  | 'trade_pact'
  | 'non_aggression'
  | 'alliance'
  | 'embargo'
  | 'strategic_bloc'
  | 'treasury_aid'
  | 'resource_aid'
  | 'declare_war';

export function canAutoApprove(kind: StrategicActionKind): boolean {
  return kind === 'diplomatic_mission' || kind === 'embassy' || kind === 'trade_pact' || kind === 'non_aggression';
}

export function shouldConfirmAction(kind: StrategicActionKind, skips: Partial<Record<StrategicActionKind, boolean>>): boolean {
  return !canAutoApprove(kind) || !skips[kind];
}

export type StrategicDecisionTone='positive'|'neutral'|'warning'|'danger';

export interface StrategicDecisionImpact {
  label:string;
  value:string;
  tone?:StrategicDecisionTone;
}

export interface StrategicDecisionSpec {
  allowed?:boolean;
  blockReason?:string;
  kind:StrategicActionKind;
  title:string;
  kicker:string;
  summary:string;
  confirmLabel:string;
  targetCountryId:string;
  impacts:StrategicDecisionImpact[];
  warnings:string[];
  tone?:StrategicDecisionTone;
}
