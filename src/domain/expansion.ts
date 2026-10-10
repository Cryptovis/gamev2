export interface IntegrationProject { targetId:string;controllerId:string;startedDay:number;endsDay:number;status:'active'|'failed'|'completed';reason?:string; }
export interface CivicPreparation { language:number;ideology:number;lastActionDay:number; }
export type CreditTerm=90|180|365|730|1095;
export interface CreditHistory { bonus:number;defaults:number;lastRewardDay?:number; }
export interface CreditApplication { id:string;offerId:string;actorId:string;borrowerId:string;lenderId:string;principal:number;apr:number;days:CreditTerm;createdDay:number;decisionDay:number;status:'pending'|'approved'|'rejected';reason?:string;loanId?:string; }
export interface CreditOffer { id:string;countryId:string;kind:'lend'|'borrow';principal:number;apr:number;days:90|180|365;extendedDays?:730|1095;targetCountryId?:string;emergency?:boolean;expiresDay:number;status:'open'|'matched'|'cancelled'|'expired'; }
export interface SovereignLoan { id:string;lenderId:string;borrowerId:string;principal:number;apr:number;startedDay:number;dueDay:number;outstanding:number;status:'active'|'arrears'|'paid';interestBooked?:boolean;paidDay?:number;earlyRepaid?:boolean;defaultRecorded?:boolean; }
export interface ExpansionState { creditApplications?:CreditApplication[];creditHistory?:Record<string,CreditHistory>;integrations:Record<string,IntegrationProject>;preparation:Record<string,CivicPreparation>;creditOffers:CreditOffer[];loans:SovereignLoan[];forcedTaxes:Record<string,number>;victories:Array<{warId:string;day:number;quote:number;read:boolean}>; }
