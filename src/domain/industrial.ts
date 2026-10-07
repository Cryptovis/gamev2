export type IndustrialGood = 'water'|'coal'|'copper'|'silicon'|'aluminum'|'rare_earths'|'rubber'|'armor_plate'|'engines'|'electronics'|'steel'|'fuel'|'tanks';
export type Mineral = 'coal'|'copper'|'silicon'|'aluminum'|'rare_earths';
export type FacilityKind = 'waterworks'|'coal_mine'|'copper_mine'|'silicon_mine'|'bauxite_mine'|'rare_earth_mine'|'rubber_plant'|'armor_mill'|'engine_works'|'electronics_works'|'civil_factory';
export interface NationalIndustrialEconomy {
 stock:Record<IndustrialGood,number>;
 facilities:Record<FacilityKind,number>;
 enabled:Record<FacilityKind,boolean>;
 deposits:Record<Mineral,number>;
 potential:Record<Mineral|'water'|'rubber',number>;
 lastOutput:Partial<Record<IndustrialGood,number>>;
 lastCosts:number;
 lastTradeBalance:number;
 bottlenecks:Partial<Record<FacilityKind,string>>;
 projects:Array<{id:string;kind:FacilityKind;readyDay:number}>;
}
export interface IndustrialContract {
 id:string;sellerId:string;buyerId:string;good:IndustrialGood;quantity:number;price:number;
 nextDeliveryDay:number;expiresDay:number;active:boolean;missedDeliveries:number;
}
export interface DiplomaticMessage {
 id:string;senderId:string;day:number;kind:'birthday'|'achievement';tone:'warm'|'rival';text:string;read:boolean;
}
export interface LeadershipState {
 campaignStartDate:string;
 lastBirthdayYear:number|null;
 celebrationUntilDay:number;
 lastAchievementDay:number;
 baselineGdp:number;
 messages:DiplomaticMessage[];
}
