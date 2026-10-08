import {useEffect,useSyncExternalStore,type CSSProperties} from 'react';
import {imageRequest} from './reliableImage';
export function AtlasImage({src,style}:{src:string;style:CSSProperties}) {
 const request=imageRequest(src),snapshot=useSyncExternalStore(listener=>{request.listeners.add(listener);return()=>{request.listeners.delete(listener);};},()=>request.snapshot);
 useEffect(()=>request.start(),[request]);
 return snapshot.status==='ready'?<img alt="" aria-hidden="true" src={snapshot.url} style={style} onError={()=>request.failed()}/>:<span className={`atlas-fallback ${snapshot.status==='loading'?'atlas-loading':''}`} aria-hidden="true" style={{position:'absolute',inset:0,display:'grid',placeItems:'center',color:'#f2ce7c',fontSize:24}}>◆</span>;
}
