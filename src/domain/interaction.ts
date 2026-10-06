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

export type StrategicDecisionTone='positive'|'neutral'|'warning'|'danger';

export interface StrategicDecisionImpact {
  label:string;
  value:string;
  tone?:StrategicDecisionTone;
}

export interface StrategicDecisionSpec {
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
