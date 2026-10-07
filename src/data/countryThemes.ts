export interface CountryTheme { primary:string; secondary:string; accent:string; }
const group=(codes:string,theme:CountryTheme)=>({codes:new Set(codes.split(' ')),theme});
const groups=[
 group('TR TN CH ID SG JP PL AT CA DK GE LV MC PE BH', {primary:'#c62836',secondary:'#f4f4f0',accent:'#ef6570'}),
 group('US GB FR RU NL CZ SK SI RS HR LU AU NZ IS NO CL CU PR DO PY CR PA', {primary:'#285a8d',secondary:'#f2f4f7',accent:'#c94f5e'}),
 group('BR JM LT UA KZ BA BB', {primary:'#d9b744',secondary:'#2f7a52',accent:'#4d88b6'}),
 group('DE BE UG AO PG', {primary:'#1f2329',secondary:'#d1aa3c',accent:'#c64a4d'}),
 group('IT MX IR BG HU TJ BI MG', {primary:'#2e7b55',secondary:'#f2f2eb',accent:'#c94c55'}),
 group('ES CN VN KG MK ME AL MA', {primary:'#c63831',secondary:'#e0b640',accent:'#e95d46'}),
 group('IN IE CI NE', {primary:'#db7c32',secondary:'#f3f0e7',accent:'#2d8a5f'}),
 group('SA PK NG DZ MR TM BD', {primary:'#2d7650',secondary:'#f0f2ec',accent:'#4ea879'}),
 group('SE FI GR IL AR HN SV GT NI', {primary:'#2f679a',secondary:'#eef2f5',accent:'#e1bd4e'}),
 group('ZA KE SS SD YE SY IQ JO AE KW EG LY', {primary:'#365f48',secondary:'#c94a4f',accent:'#d3b24f'}),
];
const fallbacks:CountryTheme[]=[
 {primary:'#3e7795',secondary:'#e9eef1',accent:'#62b7d0'},
 {primary:'#876047',secondary:'#efe8dd',accent:'#c79356'},
 {primary:'#586d4b',secondary:'#e8eadf',accent:'#8aaa6a'},
 {primary:'#725c82',secondary:'#ece7ef',accent:'#9d7db0'},
 {primary:'#8a4e58',secondary:'#eee5e7',accent:'#c46b79'},
];
export function countryThemeFor(iso2:string):CountryTheme{
 const code=iso2.toUpperCase();
 for(const item of groups)if(item.codes.has(code))return item.theme;
 let h=0;for(const c of code)h=(h*31+c.charCodeAt(0))>>>0;
 return fallbacks[h%fallbacks.length];
}
export function flagEmoji(iso2:string){return iso2.toUpperCase().replace(/[A-Z]/g,c=>String.fromCodePoint(127397+c.charCodeAt(0)));}
