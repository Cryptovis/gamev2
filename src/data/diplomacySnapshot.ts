import type {CountryState,TreatyType} from '../domain/game';
/** Offline contemporary scenario, reviewed 2026-10-11. Scores are game estimates, not official ratings. */
export const DIPLOMACY_SOURCES={
 nato:'https://www.nato.int/en/about-us/organization/nato-member-countries',
 eu:'https://www.consilium.europa.eu/en/resources/publications/european-union-map/',
 shusha:'https://president.az/en/articles/view/52122',
 ots:'https://www.mfa.gov.tr/turk-konseyi-en.en.mfa',
 asean:'https://eastasiasummit.asean.org/eas-participating-country',
 sadc:'https://www.sadc.int/member-states',
 japan:'https://www.mofa.go.jp/region/n-america/us/q&a/ref/1.html',
 gcc:'https://www.eeas.europa.eu/eeas/gulf-cooperation-council-gcc-and-eu_en',
 mercosur:'https://www.consilium.europa.eu/en/policies/eu-mercosur-agreements-explained/',
 eac:'https://www.eac.int/eac-partner-states',
 caricom:'https://caricom.org/member-states-and-associate-members/',
 australia:'https://www.dfat.gov.au/geo/united-states-of-america/united-states-of-america-country-brief',
 chinaRussia:'https://www.mfa.gov.cn/eng/xw/wjbxw/202607/t20260719_11985892.html',
 korea:'https://www.mofa.go.kr/eng/wpge/m_4904/contents.do',
 chinaPakistan:'https://www.mofa.gov.pk/china',
 congo:'https://childrenandarmedconflict.un.org/en/democratic-republic-congo',
 taiwan:'https://en.mofa.gov.tw/News_Content.aspx?n=1328&s=122718&sms=273',
 iran:'https://spcommreports.ohchr.org/TmSearch/SearchCode?code=%3B+IRN+13%2F2026',
 palestine:'https://searchlibrary.ohchr.org/record/35380',
 ukraine:'https://press.un.org/en/2026/gadis3765.doc.htm',
};
interface Group {source:keyof typeof DIPLOMACY_SOURCES;members:string[];score:number;treaties:TreatyType[]}
export const DIPLOMACY_GROUPS:Group[]=[
 {source:'nato',members:'ALB BEL BGR CAN HRV CZE DNK EST FIN FRA DEU GRC HUN ISL ITA LVA LTU LUX MNE NLD MKD NOR POL PRT ROU SVK SVN ESP SWE TUR GBR USA'.split(' '),score:70,treaties:['alliance']},
 {source:'eu',members:'AUT BEL BGR HRV CYP CZE DNK EST FIN FRA DEU GRC HUN IRL ITA LVA LTU LUX MLT NLD POL PRT ROU SVK SVN ESP SWE'.split(' '),score:45,treaties:['trade']},
 {source:'ots',members:'TUR AZE KAZ KGZ UZB'.split(' '),score:40,treaties:[]},
 {source:'asean',members:'BRN KHM IDN LAO MYS MMR PHL SGP THA TLS VNM'.split(' '),score:20,treaties:[]},
 {source:'gcc',members:'BHR KWT OMN QAT SAU ARE'.split(' '),score:25,treaties:[]},
 {source:'mercosur',members:'ARG BOL BRA PRY URY'.split(' '),score:25,treaties:[]},
 {source:'eac',members:'BDI COD KEN RWA SOM SSD UGA TZA'.split(' '),score:8,treaties:[]},
 {source:'caricom',members:'ATG BHS BRB BLZ DMA GRD GUY HTI JAM KNA LCA VCT SUR TTO'.split(' '),score:20,treaties:[]},
 {source:'sadc',members:'AGO BWA COM COD SWZ LSO MDG MWI MUS MOZ NAM SYC ZAF TZA ZMB ZWE'.split(' '),score:15,treaties:[]},
];
export const DIPLOMACY_PAIRS=[
 {a:'TUR',b:'AZE',score:90,treaties:['alliance'] as TreatyType[],source:'shusha'},
 {a:'USA',b:'JPN',score:80,treaties:['alliance'] as TreatyType[],source:'japan'},
 {a:'USA',b:'AUS',score:80,treaties:['alliance','trade'] as TreatyType[],source:'australia'},
 {a:'CHN',b:'RUS',score:60,treaties:[] as TreatyType[],source:'chinaRussia'},
 {a:'USA',b:'KOR',score:80,treaties:['alliance','trade'] as TreatyType[],source:'korea'},
 {a:'CHN',b:'PAK',score:60,treaties:[] as TreatyType[],source:'chinaPakistan'},
 {a:'COD',b:'RWA',score:-60,treaties:[] as TreatyType[],source:'congo'},
 {a:'CHN',b:'TWN',score:-65,treaties:[] as TreatyType[],source:'taiwan'},
 {a:'USA',b:'IRN',score:-65,treaties:[] as TreatyType[],source:'iran'},
 {a:'ISR',b:'IRN',score:-80,treaties:[] as TreatyType[],source:'iran'},
 {a:'ISR',b:'PSE',score:-80,treaties:[] as TreatyType[],source:'palestine'},
 {a:'RUS',b:'UKR',score:-95,treaties:[] as TreatyType[],source:'ukraine'},
];
export function applyDiplomacySnapshot(countries:Record<string,CountryState>){
 const set=(a:string,b:string,score:number,treaties:TreatyType[],merge=false)=>{
  if(a===b||!countries[a]||!countries[b])return;
  const old=countries[a].diplomacy.relations[b];
  const value=merge?Math.max(old?.score??-100,score):score;
  const agreements=merge?[...new Set([...(old?.treaties??[]),...treaties])]:[...treaties];
  const status=value>=65?'ally':value>=20?'friendly':value<=-50?'hostile':'neutral';
  countries[a].diplomacy.relations[b]={score:value,status,treaties:[...agreements],sanctions:false};
  countries[b].diplomacy.relations[a]={score:value,status,treaties:[...agreements],sanctions:false};
 };
 for(const group of DIPLOMACY_GROUPS)for(let i=0;i<group.members.length;i++)for(let j=i+1;j<group.members.length;j++)set(group.members[i],group.members[j],group.score,group.treaties,true);
 for(const pair of DIPLOMACY_PAIRS)set(pair.a,pair.b,pair.score,pair.treaties);
 // Preserve the established introductory trade route; this trade pact is a gameplay abstraction.
 set('TUR','BGR',70,['alliance','trade']);
 return countries;
}
