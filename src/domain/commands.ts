import type { CouncilResolutionType, EquipmentType, GameSpeed, InfrastructureAsset, IntelOperationType, MinistryKey, TradeResource } from './game';

type LegacyCommand =
  | { type: 'time/advanceDay' }
  | { type: 'clock/setSpeed'; speed: GameSpeed }
  | { type: 'economy/setTaxRate'; rate: number }
  | { type: 'production/setMilitaryShare'; share: number }
  | { type: 'production/setFactories'; equipment: EquipmentType; factories: number }
  | { type: 'production/deploy'; equipment: EquipmentType }
  | { type: 'infrastructure/invest'; asset: InfrastructureAsset }
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

export type ReliableCommand =
 | {type:'energy/build';kind:import('./energy').PlantKind}
 | {type:'energy/toggle';kind:import('./energy').PlantKind}
 | {type:'energy/cancel';id:string}
 | {type:'industry/build';kind:import('./industrial').FacilityKind}
 | {type:'industry/order';partnerId:string;good:import('./industrial').IndustrialGood;quantity:number;direction:'buy'|'sell';years:0|1|3|5|10}
 | {type:'credit/post';kind:'lend'|'borrow';principal:number;apr:number;days:90|180|365}
 | {type:'credit/accept';id:string}
 | {type:'credit/cancel';id:string}
 | {type:'integration/prepare';id:string;kind:'language'|'ideology'|'services'}
 | {type:'integration/begin';id:string}
 | {type:'exchange/post';good:import('./living').ExchangeGood;quantity:number;price:number}
 | {type:'exchange/buy';id:string;quantity:number}
 | {type:'exchange/cancel';id:string}
 | {type:'gold/move';tonnes:number;direction:'release'|'deposit'}
 | {type:'activity/start';kind:import('./living').ActivityKind}
 | {type:'personnel/recruit';count:number}
 | {type:'diplomacy/request';id:string;kind:'embassy'|'trade_pact';years:1|3|5|10}
 | {type:'diplomacy/resolveLetter';id:string;accept:boolean}
 | {type:'campus/build';kind:import('./governance').CampusKind}
 | {type:'pilots/hire';count:number}
 | {type:'occupation/manage';id:string;action:import('../engine/systems/governance').OccupationAction;value?:string}
 | {type:'politics/campaign';id:string}
 | {type:'politics/acceptElection';id:string}
 | {type:'program/start';kind:import('../engine/systems/nationalPrograms').ProgramKind}
 | {type:'construction/cancel';id:string}
 | {type:'world/membership';id:import('./world').InstitutionId}
 | {type:'world/attackProposal';id:string}
 | {type:'world/vote';id:string;choice:import('./world').VoteChoice}
 | {type:'world/outreach';id:string;religion:import('./game').ReligionType}
 | {type:'technology/cancel'}
 | {type:'tactical/start';warId:string}
 | {type:'tactical/commit';warId:string;expectedRound:number;orders:import('./tactical').TacticalOrder[]}
 // 0.87 audit A5: actions that used to write the store directly.
 | {type:'industry/toggleFacility';kind:import('./industrial').FacilityKind}
 | {type:'industry/cancelContract';id:string}
 | {type:'tutorial/set';step:number;active:boolean}
 | {type:'inbox/read';scope:'letters'|'leadership'}
 | {type:'living/dismissNotice'};

export type GameCommand = (LegacyCommand | ReliableCommand) & {commandId?:string};
