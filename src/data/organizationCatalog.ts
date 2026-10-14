import {DIPLOMACY_GROUPS} from './diplomacySnapshot';
import type {OrganizationId} from '../domain/organizations';

export const ORGANIZATION_CATALOG_VERSION=1;
/** Offline scenario rosters; never fetched or refreshed when loading a campaign. */
const group=(source:'nato'|'eu'|'asean')=>DIPLOMACY_GROUPS.find(g=>g.source===source)!.members;
export const ORGANIZATION_DEFAULT_ROSTERS:Record<OrganizationId,readonly string[]>={
  nato:group('nato'),eu:group('eu'),asean:group('asean'),
  csto:'ARM BLR KAZ KGZ RUS TJK'.split(' '),
  sco:'BLR CHN IND IRN KAZ KGZ PAK RUS TJK UZB'.split(' '),
  opecPlus:'DZA COG GNQ GAB IRN IRQ KWT LBY NGA SAU ARE VEN AZE BHR BRN KAZ MYS MEX OMN RUS SDN SSD'.split(' '),
  g20:'ARG AUS BRA CAN CHN FRA DEU IND IDN ITA JPN KOR MEX RUS SAU ZAF TUR GBR USA'.split(' '),
  oic:'AFG ALB DZA AZE BHR BGD BEN BRN BFA CMR TCD COM CIV DJI EGY GAB GMB GIN GNB GUY IDN IRN IRQ JOR KAZ KWT KGZ LBN LBY MYS MDV MLI MRT MAR MOZ NER NGA OMN PAK PSE QAT SAU SEN SLE SOM SDN SUR SYR TJK TGO TUN TUR TKM UGA ARE UZB YEM'.split(' '),
  bricsPlus:'BRA RUS IND CHN ZAF EGY ETH IRN ARE IDN SAU'.split(' '),
  // Global finance/trade and the private forum start with observer-only scenario
  // participation. Legal membership/quota datasets belong to their activation slice.
  imf:[],worldBank:[],wto:[],wef:[],
  // UN roster comes from the campaign's legacy institutions, never this template.
  un:[],
};
export const ORGANIZATION_ROSTER_SOURCES={
  csto:'https://en.odkb-csto.org/countries/',
  sco:'https://eng.sectsco.org/20250127/1666304.html',
  opecPlus:'https://www.opec.org/pr-detail/585-10-december-2025.html',
  oic:'https://www.oic-oci.org/en/members',
  bricsPlus:'https://brics.br/en/documents/issue-note-brazils-brics-presidency-english.pdf/@@download/file',
};
