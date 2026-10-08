// Limited current reported values: World Gold Council, 6 October 2026,
// "Central banks continue summer spree in August" (holdings at 31 August).
// Other profiles explicitly use game estimates; no missing report is treated as zero.
export const REPORTED_GOLD:Record<string,number>={CHN:2387,POL:648,UZB:439,KAZ:377,CZE:86,RUS:2271,JOR:75};
export const GOLD_SOURCE='https://www.gold.org/goldhub/gold-focus/2026/10/central-bank-gold-statistics-central-banks-continue-summer-spree-august';
// Producer potential is a game coefficient, not reported tonnage. Leading gold
// countries follow USGS MCS 2026; silver Mexico production is reported 6,300 t.
export const GOLD_PRODUCERS:Record<string,number>={CHN:3,RUS:2.9,AUS:2.8,CAN:2.1,USA:1.8,GHA:1.2,ZAF:1.1,PER:1,MEX:1,UZB:1,IDN:.8,BRA:.8,MLI:.6,TUR:.5,KAZ:.6,TZA:.5};
export const SILVER_PRODUCERS:Record<string,number>={MEX:3,CHN:1.8,PER:1.5,CHL:1,POL:1,AUS:.9,RUS:.9,BOL:.8,USA:.8,ARG:.6,IND:.5,CAN:.4};
