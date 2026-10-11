type TradeConnection={buyerId:string;sellerId:string;active:boolean};
type EmbassyConnection={countryA:string;countryB:string};

/** Build once per ledger change, rather than scan every ledger for every polygon. */
export function connectionIndex(
 playerId:string,
 trades:Record<string,TradeConnection>,
 contracts:Record<string,TradeConnection>,
 embassies:Record<string,EmbassyConnection>,
) {
 const tradePartners=new Set<string>(),embassyPartners=new Set<string>();
 for(const ledger of [trades,contracts])for(const deal of Object.values(ledger)){
  if(!deal.active)continue;
  if(deal.buyerId===playerId)tradePartners.add(deal.sellerId);
  if(deal.sellerId===playerId)tradePartners.add(deal.buyerId);
 }
 for(const embassy of Object.values(embassies)){
  if(embassy.countryA===playerId)embassyPartners.add(embassy.countryB);
  if(embassy.countryB===playerId)embassyPartners.add(embassy.countryA);
 }
 return {tradePartners,embassyPartners};
}
