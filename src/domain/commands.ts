import type { CouncilResolutionType, GameSpeed, IntelOperationType, MinistryKey, TradeResource } from './game';

export type GameCommand =
  | { type: 'time/advanceDay' }
  | { type: 'clock/setSpeed'; speed: GameSpeed }
  | { type: 'economy/setTaxRate'; rate: number }
  | { type: 'diplomacy/improveRelations'; targetCountryId: string }
  | { type: 'diplomacy/giftTreasury'; targetCountryId: string; amountB: 1 | 5 | 10 }
  | { type: 'diplomacy/giftResource'; targetCountryId: string; resource: TradeResource }
  | { type: 'diplomacy/signTradePact'; targetCountryId: string }
  | { type: 'diplomacy/signNonAggression'; targetCountryId: string }
  | { type: 'diplomacy/signAlliance'; targetCountryId: string }
  | { type: 'diplomacy/toggleEmbargo'; targetCountryId: string }
  | { type: 'diplomacy/formBloc'; targetCountryId: string }
  | { type: 'diplomacy/inviteToBloc'; targetCountryId: string }
  | { type: 'trade/createImport'; targetCountryId: string; resource: TradeResource }
  | { type: 'trade/cancel'; dealId: string }
  | { type: 'military/declareWar'; targetCountryId: string }
  | { type: 'military/assault'; warId: string }
  | { type: 'military/setAutoAssault'; warId: string; enabled: boolean }
  | { type: 'military/withdraw'; warId: string }
  | { type: 'development/economicResearch' }
  | { type: 'development/militaryResearch' }
  | { type: 'development/intelligenceResearch' }
  | { type: 'society/religiousOutreach' }
  | { type: 'society/civicCampaign' }
  | { type: 'ministry/setAllocation'; ministry: MinistryKey; value: number }
  | { type: 'technology/unlock'; technologyId: string }
  | { type: 'council/propose'; resolutionType: CouncilResolutionType; targetCountryId: string }
  | { type: 'intelligence/launch'; operationType: IntelOperationType; targetCountryId: string }
  | { type: 'event/resolve'; optionId: string };
