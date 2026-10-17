// Phase 9.5 stage 2: the world's shipping lanes as a graph of open-water waypoints, plus an offshore anchorage for the
// major trading nations. A cargo route is the shortest path through the graph between the two countries' anchorages, so
// ships thread real straits and canals (Dover, Gibraltar, Suez, Bab-el-Mandeb, Hormuz, Malacca, Panama, the Cape) instead of
// cutting across land. Presentation data only; hand-placed and checked against the bundled country outlines
// (src/tests/seaLanes.test.ts reads them in the e2e-free unit run through the `checkLanes` helper in tests).
export type LonLat = [number, number];

export const NODES: Record<string, LonLat> = {
  // North-west Europe, Baltic, Arctic
  ENGC: [1.1, 50.6], CHANW: [-5.8, 49.3], NSEA: [3.8, 54.8], NORSEA: [4.5, 62.0], BARENTS: [34.0, 71.0],
  SKAG: [9.5, 57.8], KATT: [11.2, 56.6], BELT: [11.0, 55.2], BALTS: [14.0, 54.9], BALTC: [18.5, 56.5], GOFW: [22.0, 59.3], GOF: [25.6, 59.8],
  // Iberia and the western Mediterranean
  BISC: [-6.0, 46.5], IBERW: [-10.5, 41.0], CSV: [-10.0, 36.8], MORW: [-11.0, 32.5], GIB: [-5.7, 35.95], ALB: [-1.5, 36.2], BALE: [4.0, 39.0], LIGU: [7.5, 42.8], TYRR: [12.0, 39.5], SICI: [12.0, 37.2],
  // Central and eastern Mediterranean, Aegean, Black Sea
  MALTA: [15.5, 35.2], IONI: [18.0, 37.0], CRETS: [24.0, 34.2], LEVANT: [32.5, 33.6], CYPE: [35.2, 35.0], EMED: [28.0, 34.2], AEGS: [26.0, 36.4], AEGN: [25.4, 39.3], DARD: [26.2, 40.05], MARM: [28.5, 40.8], BOSP: [29.1, 41.3],
  BLKW: [29.0, 43.5], BLACK: [33.0, 43.2], BLKE: [38.0, 43.6],
  // Suez, Red Sea, Arabian Sea, Gulf
  SUEZN: [32.4, 31.6], SUEZS: [33.4, 28.0], REDN: [34.5, 27.0], REDC: [38.5, 20.5], BAB: [43.4, 12.7], ADEN: [47.0, 12.0], ARAB: [60.0, 17.0], HORM: [57.2, 25.8], GULF: [51.5, 27.4], SOMA: [54.0, 10.0],
  // Indian Ocean and South-East Asia
  INDW: [70.0, 15.5], INDS: [77.5, 6.5], SLKS: [80.5, 5.2], SLKE: [83.5, 7.0], BENG: [87.0, 13.0], ANDM: [94.0, 9.0], MALN: [97.0, 6.0], MALAC: [101.0, 2.7], SING: [104.2, 1.1], GOTH: [101.0, 9.5], SCS: [111.0, 8.0],
  TONK: [107.6, 18.8], PHLS: [117.0, 13.0], JAVA: [110.0, -5.0], LOMB: [115.7, -8.7], INDC: [75.0, -5.0], MASC: [60.0, -20.0], IOS: [90.0, -20.0], SIND: [60.0, -38.0],
  // East Asia and the western Pacific
  TAIW: [119.0, 21.0], EAST: [125.0, 27.0], YELL: [123.5, 36.0], YELLN: [120.5, 38.5], KORS: [129.9, 33.9], JSEA: [134.0, 39.5], JAPS: [136.0, 31.5], JAPE: [143.0, 36.0], PHIL: [134.0, 22.0], WPAC: [158.0, 26.0],
  // Australasia
  AUSW: [112.0, -30.0], AUSS: [130.0, -37.0], BASS: [146.5, -39.2], AUSE: [154.0, -33.5], NZ: [178.0, -37.0], TIMOR: [127.0, -11.5],
  // Pacific coast of the Americas
  HAW: [-153.0, 23.0], MIDP: [-178.0, 25.0], PAC_E: [-128.0, 34.0], CALS: [-119.0, 33.2], PNW: [-127.0, 47.0], MEXP: [-106.0, 17.0], PANAP: [-79.5, 8.5], PACS: [-84.0, 2.0], PERU: [-83.0, -6.0], CHIL: [-75.0, -33.0], HORN: [-68.0, -56.8],
  // Atlantic and the Caribbean
  NATW: [-60.0, 40.0], NATC: [-40.0, 43.0], USEC: [-72.0, 38.5], SARG: [-55.0, 28.0], FLA: [-79.3, 25.3], KEYW: [-82.0, 23.8], GOMW: [-94.0, 27.0], GOME: [-88.0, 25.5], YUC: [-85.9, 21.7],
  ANEG: [-64.0, 19.0], CARE: [-63.0, 14.5], CARC: [-72.0, 14.5], CARS: [-77.5, 16.5], CARW: [-84.0, 18.0], PANAA: [-79.9, 9.7],
  BRAZ: [-33.0, -8.0], BRAZS: [-46.0, -25.5], PLATA: [-55.5, -35.5], SATL: [-45.0, -33.0], SATE: [-5.0, -20.0],
  // Africa
  AFRW: [-18.0, 12.0], AFRN: [-19.0, 23.0], GOG: [3.0, 3.0], ANGO: [10.0, -12.0], CAPE: [18.5, -35.5], SAFE: [33.0, -35.0], MOZ: [40.0, -20.0], ZANZ: [41.0, -6.0],
  GALI: [-10.0, 43.5], CORSC: [10.3, 42.6], LIGUN: [9.4, 43.7], FLAN: [-79.7, 28.5], GUARD: [52.5, 13.0], VNME: [112.0, 14.0], HAINS: [110.0, 17.5], TSTR: [119.6, 24.4], TN: [122.2, 26.0], SHAN: [123.2, 37.8], KORSW: [126.0, 32.3], AUSSW: [114.0, -35.5], NZN: [173.5, -33.5],
  BAJA: [-117.5, 28.5], CABO: [-109.5, 22.0], CAMP: [-92.0, 10.5], CAMS: [-84.0, 5.0], PANAS: [-79.2, 6.5], CHILS: [-76.5, -42.0], CHILP: [-77.5, -52.0], DRAKE: [-75.0, -57.0],
  ATLN: [-40.0, 6.0], ATLE: [-31.0, -3.0], BRAZM: [-36.0, -18.5], BRAZR: [-40.0, -24.5], BRAZSS: [-47.0, -31.0], FALK: [-50.0, -47.0], FALKS: [-62.0, -57.5],
  GUIN: [-17.0, 8.5], LIBE: [-13.5, 4.5], CIVO: [-6.0, 3.5], NAMI: [9.0, -24.0], MOZN: [42.5, -14.0], MADS: [47.0, -27.5], NORN: [6.0, 68.0], NCAP: [26.0, 72.2],
};

/** Open-water legs. Straits and canals narrower than the bundled outline resolution are listed in NARROW and exempt from the land check. */
export const EDGES: [string, string][] = [
  ['ENGC', 'CHANW'], ['ENGC', 'NSEA'], ['NSEA', 'SKAG'], ['NSEA', 'NORSEA'], ['SKAG', 'KATT'], ['KATT', 'BELT'], ['BELT', 'BALTS'], ['BALTS', 'BALTC'], ['BALTC', 'GOFW'], ['GOFW', 'GOF'],
  ['CHANW', 'BISC'], ['IBERW', 'CSV'], ['CSV', 'MORW'], ['CSV', 'GIB'], ['GIB', 'ALB'], ['ALB', 'BALE'], ['BALE', 'LIGU'], ['BALE', 'SICI'], ['TYRR', 'SICI'], ['SICI', 'MALTA'],
  ['MALTA', 'IONI'], ['MALTA', 'CRETS'], ['IONI', 'CRETS'], ['CRETS', 'LEVANT'], ['CRETS', 'EMED'], ['EMED', 'LEVANT'], ['EMED', 'AEGS'], ['AEGS', 'AEGN'], ['AEGN', 'DARD'], ['DARD', 'MARM'], ['MARM', 'BOSP'], ['BOSP', 'BLKW'], ['BLKW', 'BLACK'], ['BLACK', 'BLKE'], ['LEVANT', 'CYPE'], ['LEVANT', 'SUEZN'],
  ['SUEZN', 'SUEZS'], ['SUEZS', 'REDN'], ['REDN', 'REDC'], ['REDC', 'BAB'], ['BAB', 'ADEN'], ['ADEN', 'ARAB'], ['ARAB', 'HORM'], ['HORM', 'GULF'], ['ARAB', 'INDW'], ['SOMA', 'INDS'], ['INDW', 'INDS'], ['INDS', 'SLKS'], ['SLKS', 'SLKE'], ['SLKE', 'BENG'], ['BENG', 'ANDM'], ['ANDM', 'MALN'], ['MALN', 'MALAC'],
  ['MALAC', 'SING'], ['SING', 'GOTH'], ['SING', 'SCS'], ['SCS', 'PHLS'], ['JAVA', 'SING'], ['JAVA', 'LOMB'], ['PHLS', 'TAIW'], ['TAIW', 'PHIL'], ['EAST', 'YELL'], ['KORS', 'JSEA'], ['EAST', 'JAPS'], ['JAPS', 'JAPE'], ['PHIL', 'JAPS'], ['PHIL', 'WPAC'], ['JAPE', 'WPAC'],
  ['LOMB', 'IOS'], ['IOS', 'INDC'], ['INDC', 'INDS'], ['INDC', 'MASC'], ['MASC', 'SIND'], ['IOS', 'AUSW'], ['AUSS', 'BASS'], ['BASS', 'AUSE'], ['LOMB', 'TIMOR'], ['AUSW', 'SIND'],
  ['WPAC', 'MIDP'], ['MIDP', 'HAW'], ['HAW', 'PAC_E'], ['PAC_E', 'CALS'], ['PAC_E', 'PNW'], ['HAW', 'MEXP'], ['PACS', 'PERU'], ['PERU', 'CHIL'], ['NZ', 'HAW'],
  ['PANAA', 'PANAP'], ['PANAA', 'CARS'], ['CARS', 'CARC'], ['CARC', 'CARE'], ['CARE', 'ANEG'], ['ANEG', 'SARG'], ['SARG', 'NATC'], ['SARG', 'USEC'], ['USEC', 'NATW'], ['NATW', 'NATC'], ['NATC', 'BISC'], ['NATC', 'CHANW'], ['USEC', 'FLAN'], ['FLAN', 'FLA'], ['KEYW', 'GOME'], ['GOME', 'GOMW'], ['GOME', 'YUC'], ['YUC', 'CARW'], ['CARW', 'CARS'],
  ['SARG', 'BRAZ'], ['PLATA', 'SATL'], ['SATL', 'CAPE'], ['SATL', 'SATE'], ['BRAZ', 'SATE'], ['SATE', 'ANGO'], ['SATE', 'CAPE'],
  ['IBERW', 'NATC'], ['MORW', 'AFRN'], ['AFRW', 'BRAZ'], ['AFRW', 'SARG'], ['GOG', 'ANGO'], ['CAPE', 'SAFE'], ['SAFE', 'MOZ'], ['ZANZ', 'SOMA'], ['ZANZ', 'INDC'], ['SAFE', 'SIND'], ['SAFE', 'AUSW'],
  ['AFRN', 'IBERW'],
 ['BISC','GALI'],['GALI','IBERW'],['LIGU','LIGUN'],['LIGUN','CORSC'],['CORSC','TYRR'],['ADEN','GUARD'],['GUARD','SOMA'],['SCS','VNME'],['VNME','HAINS'],['HAINS','TONK'],['TAIW','TSTR'],['TSTR','TN'],['TN','EAST'],['YELL','SHAN'],['SHAN','YELLN'],['YELL','KORSW'],['KORSW','KORS'],['AUSW','AUSSW'],['AUSSW','AUSS'],['AUSE','NZN'],['NZN','NZ'],['CALS','BAJA'],['BAJA','CABO'],['CABO','MEXP'],['MEXP','CAMP'],['CAMP','CAMS'],['CAMS','PANAS'],['PANAS','PANAP'],['PANAS','PACS'],['CHIL','CHILS'],['CHILS','CHILP'],['CHILP','DRAKE'],['DRAKE','HORN'],['FLA','KEYW'],['CARE','ATLN'],['ATLN','ATLE'],['ATLE','BRAZ'],['BRAZ','BRAZM'],['BRAZM','BRAZR'],['BRAZR','BRAZS'],['BRAZS','BRAZSS'],['BRAZSS','PLATA'],['SATL','FALK'],['FALK','FALKS'],['FALKS','HORN'],['AFRN','AFRW'],['AFRW','GUIN'],['GUIN','LIBE'],['LIBE','CIVO'],['CIVO','GOG'],['ANGO','NAMI'],['NAMI','CAPE'],['MOZ','MOZN'],['MOZN','ZANZ'],['SAFE','MADS'],['MADS','MASC'],['NORSEA','NORN'],['NORN','NCAP'],['NCAP','BARENTS'],
];
export const NARROW = new Set(['ENGC-NSEA', 'ENGC-CHANW', 'BELT-BALTS', 'KATT-BELT', 'SKAG-KATT', 'CSV-GIB', 'GIB-ALB', 'SUEZN-SUEZS', 'SUEZS-REDN', 'LEVANT-SUEZN', 'REDC-BAB', 'BAB-ADEN', 'ARAB-HORM', 'HORM-GULF', 'MALN-MALAC', 'MALAC-SING', 'SING-GOTH', 'SING-SCS', 'JAVA-SING', 'JAVA-LOMB', 'LOMB-IOS', 'LOMB-TIMOR', 'PANAA-PANAP', 'EMED-AEGS', 'AEGS-AEGN', 'AEGN-DARD', 'DARD-MARM', 'MARM-BOSP', 'BOSP-BLKW', 'SLKS-SLKE', 'INDS-SLKS', 'BASS-AUSE', 'AUSS-BASS', 'GOFW-GOF']);

/** Offshore anchorage [lon, lat, entry node] of a country's main ports (nearest to the partner is used). */
export const PORTS: Record<string, [number, number, string][]> = {
  USA: [[-73.5, 40.2, 'USEC'], [-94.4, 28.8, 'GOMW'], [-118.6, 33.4, 'CALS']],
  CAN: [[-62.8, 43.9, 'NATW'], [-125.0, 48.5, 'PNW']],
  MEX: [[-95.5, 19.2, 'GOMW'], [-105.0, 18.2, 'MEXP']],
  BRA: [[-46.0, -24.6, 'BRAZS'], [-34.0, -8.0, 'BRAZ']], ARG: [[-56.0, -35.2, 'PLATA']], CHL: [[-72.5, -33.0, 'CHIL']], PER: [[-77.5, -12.2, 'PERU']],
  COL: [[-75.8, 10.9, 'CARC']], VEN: [[-68.0, 11.2, 'CARC']], PAN: [[-79.9, 9.7, 'PANAA']],
  GBR: [[-1.0, 50.2, 'CHANW']], NLD: [[3.4, 52.0, 'NSEA']], BEL: [[2.8, 51.6, 'ENGC']], DEU: [[7.5, 54.2, 'NSEA']], FRA: [[-0.3, 49.7, 'ENGC'], [5.2, 43.1, 'LIGU']],
  ESP: [[0.4, 39.2, 'BALE'], [-9.6, 42.2, 'IBERW']], PRT: [[-9.5, 38.6, 'IBERW']], ITA: [[8.9, 44.1, 'LIGU'], [14.2, 40.5, 'TYRR']], GRC: [[24.0, 37.5, 'AEGS']],
  NOR: [[3.5, 60.5, 'NORSEA']], SWE: [[11.3, 57.6, 'SKAG']], DNK: [[11.0, 56.8, 'KATT']], POL: [[19.2, 54.8, 'BALTC']], FIN: [[25.2, 59.9, 'GOF']], EST: [[24.7, 59.7, 'GOF']],
  RUS: [[28.0, 59.9, 'GOF'], [37.6, 44.5, 'BLKE'], [132.0, 42.7, 'JSEA'], [33.5, 70.0, 'BARENTS']],
  UKR: [[31.2, 46.2, 'BLACK']], ROU: [[29.3, 44.1, 'BLKW']], BGR: [[28.4, 43.2, 'BLKW']], GEO: [[41.4, 41.7, 'BLKE']], TUR: [[29.1, 41.3, 'BOSP'], [34.8, 36.3, 'CYPE']],
  MAR: [[-8.2, 33.7, 'MORW']], DZA: [[3.0, 37.1, 'BALE']], TUN: [[10.5, 37.5, 'SICI']], LBY: [[13.2, 33.2, 'MALTA']], EGY: [[29.8, 31.5, 'LEVANT']],
  ISR: [[34.8, 32.9, 'LEVANT']], LBN: [[35.4, 33.9, 'LEVANT']], SAU: [[38.8, 21.5, 'REDC'], [50.5, 27.0, 'GULF']], IRN: [[57.0, 26.5, 'HORM']], IRQ: [[49.5, 29.4, 'GULF']], KWT: [[48.6, 29.3, 'GULF']],
  ARE: [[55.0, 25.4, 'GULF']], OMN: [[54.2, 16.5, 'ARAB']], YEM: [[45.0, 12.7, 'ADEN']], DJI: [[43.4, 11.8, 'ADEN']], SDN: [[37.5, 19.6, 'REDC']],
  PAK: [[66.8, 24.5, 'INDW']], IND: [[72.6, 18.9, 'INDW'], [80.6, 13.1, 'BENG']], LKA: [[79.7, 6.9, 'SLKS']], BGD: [[91.8, 22.0, 'BENG']], MMR: [[96.3, 16.0, 'ANDM']],
  THA: [[100.8, 12.8, 'GOTH']], MYS: [[100.9, 3.0, 'MALAC']], SGP: [[104.0, 1.2, 'SING']], IDN: [[106.9, -5.8, 'JAVA']], VNM: [[107.5, 10.2, 'SCS'], [107.0, 20.2, 'TONK']], PHL: [[119.8, 14.4, 'PHLS']],
  CHN: [[122.5, 31.0, 'EAST'], [114.4, 22.0, 'TAIW'], [118.8, 38.7, 'YELLN']], TWN: [[120.0, 22.4, 'TAIW']], KOR: [[129.3, 35.0, 'KORS']], JPN: [[140.4, 34.6, 'JAPE'], [135.2, 33.6, 'JAPS']],
  AUS: [[151.6, -33.9, 'AUSE'], [115.4, -32.0, 'AUSW'], [144.6, -38.3, 'BASS']], NZL: [[177.2, -37.5, 'NZ']],
  ZAF: [[31.3, -29.9, 'SAFE'], [18.2, -33.8, 'CAPE']], NGA: [[3.4, 6.2, 'GOG']], GHA: [[0.0, 5.2, 'GOG']], CIV: [[-4.0, 5.0, 'GOG']], SEN: [[-17.6, 14.6, 'AFRW']], AGO: [[12.8, -9.0, 'ANGO']],
  KEN: [[40.0, -4.2, 'ZANZ']], TZA: [[39.6, -6.8, 'ZANZ']], MOZ: [[33.0, -26.0, 'SAFE']],
};

// ---------- routing ----------
const RAD = Math.PI / 180;
export function gcDeg(a: LonLat, b: LonLat): number {
  const [l1, p1, l2, p2] = [a[0] * RAD, a[1] * RAD, b[0] * RAD, b[1] * RAD];
  const c = Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(l1 - l2);
  return Math.acos(Math.max(-1, Math.min(1, c))) / RAD;
}
const adjacency = new Map<string, { to: string; w: number }[]>();
for (const [a, b] of EDGES) {
  const w = gcDeg(NODES[a], NODES[b]);
  (adjacency.get(a) ?? adjacency.set(a, []).get(a)!).push({ to: b, w });
  (adjacency.get(b) ?? adjacency.set(b, []).get(b)!).push({ to: a, w });
}

/** Shortest node path (Dijkstra; the graph has under a hundred nodes) or null when disconnected. */
export function nodePath(from: string, to: string): string[] | null {
  if (from === to) return [from];
  const dist = new Map<string, number>([[from, 0]]), prev = new Map<string, string>(), done = new Set<string>();
  for (;;) {
    let u: string | null = null, best = Infinity;
    for (const [k, d] of dist) if (!done.has(k) && d < best) { best = d; u = k; }
    if (u === null) return null;
    if (u === to) break;
    done.add(u);
    for (const { to: v, w } of adjacency.get(u) ?? []) if (best + w < (dist.get(v) ?? Infinity)) { dist.set(v, best + w); prev.set(v, u); }
  }
  const out = [to];
  while (out[0] !== from) out.unshift(prev.get(out[0])!);
  return out;
}

export interface SeaRoute { points: LonLat[]; /** degrees of arc */ length: number; from: string; to: string }
const routeCache = new Map<string, SeaRoute | null>();
/** Sea route between two countries, or null when either has no listed port or no water path exists (the caller then flies the cargo). */
export function seaRoute(a: string, b: string): SeaRoute | null {
  const key = a < b ? `${a}|${b}` : `${b}|${a}`;
  const hit = routeCache.get(key);
  if (hit !== undefined) return orient(hit, a);
  const pa = PORTS[a], pb = PORTS[b];
  let best: SeaRoute | null = null;
  if (pa && pb && a !== b) {
    const [lo, hi] = a < b ? [a, b] : [b, a];
    for (const x of PORTS[lo]) for (const y of PORTS[hi]) {
      const path = nodePath(x[2], y[2]);
      if (!path) continue;
      const points: LonLat[] = [[x[0], x[1]], ...path.map((n) => NODES[n]), [y[0], y[1]]];
      let length = 0;
      for (let i = 0; i < points.length - 1; i++) length += gcDeg(points[i], points[i + 1]);
      if (!best || length < best.length) best = { points, length, from: lo, to: hi };
    }
  }
  routeCache.set(key, best);
  return orient(best, a);
}
function orient(route: SeaRoute | null, from: string): SeaRoute | null {
  if (!route) return null;
  return route.from === from ? route : { points: [...route.points].reverse(), length: route.length, from, to: route.from };
}
