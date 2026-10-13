/** playtest.19 (Phase 6.5): the small live-change counters in the top HUD. Pure view model: it only formats numbers the engine already produced. */
export type DeltaDirection='up'|'down'|'flat';
export interface LiveDelta{id:'treasury'|'food'|'oil';direction:DeltaDirection;value:number;text:string}

/** Below these a change is shown as flat (no arrow colour) so rounding noise never flashes red or green. */
export const MONEY_EPSILON=0.0005,STOCK_EPSILON=0.005;
export const directionOf=(value:number,epsilon:number):DeltaDirection=>!Number.isFinite(value)||Math.abs(value)<epsilon?'flat':value>0?'up':'down';
export const ARROW:Record<DeltaDirection,string>={up:'▲',down:'▼',flat:'■'};

/** Same digits as `formatCostB`: more decimals for small sums. */
export function moneyDeltaText(billions:number):string{
 const a=Math.abs(billions),digits=a>=100?0:a>=10?1:a>=1?2:3,sign=directionOf(billions,MONEY_EPSILON)==='flat'?'':billions>0?'+':'-';
 return `${sign}$${Number(a.toFixed(digits))}B`;
}
export function stockDeltaText(amount:number):string{
 const a=Math.abs(amount),digits=a>=100?0:a>=10?1:2,sign=directionOf(amount,STOCK_EPSILON)==='flat'?'':amount>0?'+':'-';
 return `${sign}${Number(a.toFixed(digits))}`;
}
export interface LiveDeltaInput{dailyBalance:number;net:{food:number;oil:number}}
export function liveDeltas(input:LiveDeltaInput):LiveDelta[]{
 return [
  {id:'treasury',value:input.dailyBalance,direction:directionOf(input.dailyBalance,MONEY_EPSILON),text:moneyDeltaText(input.dailyBalance)},
  {id:'food',value:input.net.food,direction:directionOf(input.net.food,STOCK_EPSILON),text:stockDeltaText(input.net.food)},
  {id:'oil',value:input.net.oil,direction:directionOf(input.net.oil,STOCK_EPSILON),text:stockDeltaText(input.net.oil)},
 ];
}
