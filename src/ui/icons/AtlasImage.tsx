import {useState,type CSSProperties} from 'react';
// Shared raster atlases avoid decoding a nested data image for every SVG instance.
// A failed request keeps the semantic wrapper and never shows a browser broken-image icon.
export function AtlasImage({src,style}:{src:string;style:CSSProperties}) {
 const [failed,setFailed]=useState(false);
 return failed?<span className="atlas-fallback" aria-hidden="true" style={{position:'absolute',inset:0,display:'grid',placeItems:'center',color:'#f2ce7c',fontSize:24}}>◆</span>:<img alt="" aria-hidden="true" src={src} style={style} onError={()=>setFailed(true)}/>;
}
