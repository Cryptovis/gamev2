import {useEffect,useRef,useState} from 'react';
import type {GeoProjection} from 'd3-geo';
let texture:ImageData|null=null;
let loading:Promise<ImageData>|null=null;
function loadTexture(){
 if(texture)return Promise.resolve(texture);
 if(!loading)loading=new Promise<ImageData>((resolve,reject)=>{
  const image=new Image();image.onload=()=>{const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');if(!ctx){reject(new Error('Canvas unavailable'));return;}ctx.drawImage(image,0,0);texture=ctx.getImageData(0,0,c.width,c.height);resolve(texture);};image.onerror=()=>{loading=null;reject(new Error('Geographic imagery unavailable'));};image.src='/assets/geography/blue-marble.jpg';
 });
 return loading;
}
export function GeographicSurface({projection,flat,pan,zoom}:{projection:GeoProjection;flat:boolean;pan:{x:number;y:number};zoom:number}){
 const ref=useRef<HTMLCanvasElement>(null),[source,setSource]=useState<ImageData|null>(texture);
 useEffect(()=>{let alive=true;loadTexture().then(s=>{if(alive)setSource(s)}).catch(()=>{});return ()=>{alive=false};},[]);
 useEffect(()=>{
  if(!source||!projection.invert)return;
  const canvas=ref.current,ctx=canvas?.getContext('2d');if(!canvas||!ctx)return;
  const width=600,height=350;canvas.width=width;canvas.height=height;
  const output=ctx.createImageData(width,height),pixels=output.data,src=source.data;
  const scale=projection.scale(),center=projection.translate();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   let sx=(x+.5)*2,sy=(y+.5)*2;
   if(flat){sx=600+(sx-pan.x-600)/zoom;sy=350+(sy-pan.y-350)/zoom;}
   else if(Math.hypot(sx-center[0],sy-center[1])>scale)continue;
   const geo=projection.invert([sx,sy]);if(!geo||!geo.every(Number.isFinite)||Math.abs(geo[0])>180||Math.abs(geo[1])>90)continue;
   const check=projection(geo);if(!check||Math.hypot(check[0]-sx,check[1]-sy)>1)continue;
   const tx=Math.max(0,Math.min(source.width-1,Math.floor((geo[0]+180)/360*source.width))),ty=Math.max(0,Math.min(source.height-1,Math.floor((90-geo[1])/180*source.height)));
   const from=(ty*source.width+tx)*4,to=(y*width+x)*4;
   const shade=flat?.91:.76+.18*Math.sqrt(Math.max(0,1-((sx-center[0])**2+(sy-center[1])**2)/scale**2));
   pixels[to]=src[from]*shade;pixels[to+1]=src[from+1]*shade;pixels[to+2]=src[from+2]*shade;pixels[to+3]=255;
  }
  ctx.putImageData(output,0,0);
 },[source,projection,flat,pan.x,pan.y,zoom]);
 return <foreignObject x="0" y="0" width="1200" height="700" pointerEvents="none"><canvas ref={ref} className="geographic-surface" aria-label="NASA Blue Marble geographic surface"/></foreignObject>;
}
