import type { CountryState, GameState, InfrastructureAsset, NationalInfrastructureState } from '../../domain/game';

const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const LANDLOCKED=new Set(['AND','AUT','BLR','BOL','BWA','BFA','BDI','CAF','TCD','CZE','ETH','HUN','KAZ','KGZ','LAO','LSO','LIE','LUX','MKD','MWI','MLI','MDA','MNG','NPL','NER','PRY','RWA','SMR','SRB','SVK','SSD','SWZ','CHE','TJK','TKM','UGA','UZB','VAT','ZMB','ZWE','AFG','ARM','AZE','BTN']);

function economicBase(country:CountryState){
  return clamp(country.economy.gdp/22 + country.industry.factories*1.4 + country.industry.utilization*.35 + country.military.logistics*.3,12,100);
}

export function createInitialInfrastructure(country:CountryState):NationalInfrastructureState{
  const base=economicBase(country);
  const roads=clamp(base*.88 + country.economy.productivity*.18,10,96);
  const rail=clamp(base*.72 + country.industry.factories*.45,5,94);
  const ports=LANDLOCKED.has(country.id)?0:clamp(base*.62 + country.economy.gdp/40,8,92);
  const hubs=clamp(base*.58 + country.military.logistics*.25,6,92);
  const maintenance=(roads+rail+hubs+ports*.7)*0.00022;
  const throughput=clamp(roads*.28+rail*.28+hubs*.24+ports*.08+country.industry.utilization*.12,5,100);
  const scores:{id:NationalInfrastructureState['bottleneck'];value:number}[]=[
    {id:'roads',value:roads},{id:'rail',value:rail},{id:'hubs',value:hubs},
    ...(LANDLOCKED.has(country.id)?[]:[{id:'ports' as const,value:ports}]),
  ];
  const weakest=scores.sort((a,b)=>a.value-b.value)[0];
  return {roads,rail,ports,hubs,maintenance,throughput,bottleneck:weakest.value<38?weakest.id:'none',lastInvestmentDay:0};
}

export function createInitialInfrastructureMap(countries:Record<string,CountryState>){
  return Object.fromEntries(Object.values(countries).map(country=>[country.id,createInitialInfrastructure(country)]));
}

function calculateState(country:CountryState,infra:NationalInfrastructureState):NationalInfrastructureState{
  const powerFactor=clamp(country.processedResources.electricity/70,0,1);
  const fuelFactor=clamp(country.processedResources.fuel/35,0,1);
  const transport=infra.roads*.28+infra.rail*.30+infra.hubs*.24+infra.ports*.08;
  const throughput=clamp(transport+powerFactor*6+fuelFactor*4,4,100);
  const candidates:{id:NationalInfrastructureState['bottleneck'];value:number}[]=[
    {id:'roads',value:infra.roads},{id:'rail',value:infra.rail},{id:'hubs',value:infra.hubs},
    ...(infra.ports<=0?[]:[{id:'ports' as const,value:infra.ports}]),
    {id:'power',value:powerFactor*100},{id:'fuel',value:fuelFactor*100},
  ];
  const weakest=candidates.sort((a,b)=>a.value-b.value)[0];
  const maintenance=(infra.roads+infra.rail+infra.hubs+infra.ports*.7)*0.00022;
  return {...infra,maintenance,throughput,bottleneck:weakest.value<45?weakest.id:'none'};
}

export function processInfrastructure(state:GameState):GameState{
  const countries={...state.countries};
  const infrastructure={...state.infrastructure};
  for(const country of Object.values(state.countries)){
    const infra=calculateState(country,infrastructure[country.id]??createInitialInfrastructure(country));
    const canMaintain=country.economy.treasury>=infra.maintenance;
    const degradation=canMaintain?0:.04;
    infrastructure[country.id]=calculateState(country,{
      ...infra,
      roads:clamp(infra.roads-degradation,0,100),
      rail:clamp(infra.rail-degradation,0,100),
      ports:infra.ports<=0?0:clamp(infra.ports-degradation*.6,0,100),
      hubs:clamp(infra.hubs-degradation,0,100),
    });
    countries[country.id]={...country,economy:{...country.economy,treasury:country.economy.treasury-(canMaintain?infra.maintenance:0)}};
  }
  return {...state,countries,infrastructure};
}

const INVESTMENT:Record<InfrastructureAsset,{cost:number,gain:number,label:string}>={
  roads:{cost:4,gain:5,label:'Road Network'},
  rail:{cost:6,gain:5,label:'Rail Network'},
  ports:{cost:8,gain:5,label:'Port Capacity'},
  hubs:{cost:5,gain:5,label:'Supply Hubs'},
};

export function investInfrastructure(state:GameState,countryId:string,asset:InfrastructureAsset):GameState{
  const country=state.countries[countryId],infra=state.infrastructure[countryId];
  if(!country||!infra)return state;
  const rule=INVESTMENT[asset];
  if(asset==='ports'&&infra.ports<=0)return state;
  if(country.economy.treasury<rule.cost)return state;
  const nextInfra=calculateState(country,{...infra,[asset]:clamp(infra[asset]+rule.gain,0,100),lastInvestmentDay:state.day});
  return {
    ...state,
    countries:{...state.countries,[countryId]:{...country,economy:{...country.economy,treasury:country.economy.treasury-rule.cost}}},
    infrastructure:{...state.infrastructure,[countryId]:nextInfra},
    sitrep:[`INFRASTRUCTURE // ${rule.label} investment completed in ${country.name}. -$${rule.cost}B.`,...state.sitrep].slice(0,12),
  };
}

export function processInfrastructureAI(state:GameState):GameState{
  if(state.day%30!==0)return state;
  let next=state;
  for(const country of Object.values(state.countries)){
    if(country.id===state.playerCountryId)continue;
    const infra=next.infrastructure[country.id];
    const current=next.countries[country.id];
    if(!infra||!current||current.economy.treasury<10)continue;
    const options:(InfrastructureAsset)[]=['roads','rail','hubs',...(infra.ports>0?['ports' as const]:[])];
    const target=options.sort((a,b)=>infra[a]-infra[b])[0];
    if(infra[target]<72){const before=next.sitrep;const invested=investInfrastructure(next,country.id,target);next={...invested,sitrep:before};}
  }
  return next;
}

export function infrastructureInvestmentRule(asset:InfrastructureAsset){return INVESTMENT[asset];}
