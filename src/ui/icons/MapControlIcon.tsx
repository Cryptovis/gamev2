/** Established 24px stroked vector vocabulary; inherits the active semantic ink. */
export function MapControlIcon({kind,size=24}:{kind:string;size?:number}){
 const paths:Record<string,string>={
  political:'M3 10h18M5 10v10m5-10v10m4-10v10m5-10v10M3 20h18M12 3l9 5H3Z',
  relations:'m3 10 4-4 5 2 5-2 4 4-5 8-4-3-3 2-5-7Zm5 0 4-2 4 4-4 3',
  diplomacy:'M5 4h12v15H5ZM8 7h6M8 10h6m-6 3 2 2 3-3M3 19h16',
  resources:'M3 7h7v13H3ZM3 10h7M3 17h7m3-9 4-5 4 5-4 6Z',
  military:'m4 3 13 14-2 2L3 5Zm16 0L7 17l2 2L21 5ZM3 17l4 4m10-4 4 4',
  religion:'M3 5q5-2 9 1 4-3 9-1v14q-5-2-9 1-4-3-9-1ZM12 6v14m4-11v6m-2-3h4',
  ideology:'M12 3v18M5 21h14M4 7h16M6 7l-3 7h6Zm12 0-3 7h6Z',
  globe:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM2 12h20M12 2q8 10 0 20-8-10 0-20',
  flat:'M2 6l7-3 6 3 7-3v15l-7 3-6-3-7 3ZM9 3v15m6-12v15',
  geographic:'m2 19 6-13 4 7 4-10 6 16Zm4-9 2 2 2-2m4-2 2 2 2-2',
  zoomIn:'M12 4v16M4 12h16',zoomOut:'M4 12h16',home:'M12 22s8-8 8-13A8 8 0 0 0 4 9c0 5 8 13 8 13Zm0-17a4 4 0 1 0 0 8 4 4 0 0 0 0-8',reset:'M4 9a8 8 0 1 1 1 9M4 3v6h6'};
 return <svg className="map-control-icon" data-vector={kind} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]??paths.geographic}/></svg>;
}
