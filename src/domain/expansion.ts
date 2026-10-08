export interface IntegrationProject { targetId:string;controllerId:string;startedDay:number;endsDay:number;status:'active'|'failed'|'completed';reason?:string; }
export interface CivicPreparation { language:number;ideology:number;lastActionDay:number; }
export interface CreditOffer { id:string;countryId:string;kind:'lend'|'borrow';principal:number;apr:number;days:90|180|365;expiresDay:number;status:'open'|'matched'|'cancelled'|'expired'; }
export interface SovereignLoan { id:string;lenderId:string;borrowerId:string;principal:number;apr:number;startedDay:number;dueDay:number;outstanding:number;status:'active'|'arrears'|'paid';interestBooked?:boolean; }
export interface ExpansionState { integrations:Record<string,IntegrationProject>;preparation:Record<string,CivicPreparation>;creditOffers:CreditOffer[];loans:SovereignLoan[];forcedTaxes:Record<string,number>;victories:Array<{warId:string;day:number;quote:number;read:boolean}>; }
