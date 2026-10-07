import {LocaleText,translateLive} from '../i18n/localeText';
import {useEffect,useRef,useState} from 'react';
import type {GeoProjection} from 'd3-geo';
let texture:ImageData|null=null;
let loading:Promise<ImageData>|null=null;
function loadTexture(){
 if(texture)return Promise.resolve(texture);
 if(!loading)loading=new Promise<ImageData>((resolve,reject)=>{
  const image=new Image();image.onload=()=>{const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');if(!ctx){reject(new Error('Canvas unavailable'));return;}ctx.drawImage(image,0,0);texture=ctx.getImageData(0,0,c.width,c.height);resolve(texture);};image.onerror=()=>{loading=null;reject(new Error('Geographic imagery unavailable'));};image.src='/assets/geography/blue-marble-surface.svg';
 });
 return loading;
}
export function GeographicSurface({projection,flat,pan,zoom,onReady}:{projection:GeoProjection;flat:boolean;pan:{x:number;y:number};zoom:number;onReady:()=>void}){
 const ref=useRef<HTMLCanvasElement|null>(null),[raster,setRaster]=useState<string|null>(null),[failed,setFailed]=useState(false),[source,setSource]=useState<ImageData|null>(texture);
 useEffect(()=>{let alive=true;loadTexture().then(s=>{if(alive)setSource(s)}).catch(()=>{if(alive)setFailed(true)});return ()=>{alive=false};},[]);
 useEffect(()=>{
  if(!source||!projection.invert)return;
  const canvas=ref.current??(ref.current=document.createElement('canvas')),ctx=canvas.getContext('2d');if(!canvas||!ctx)return;
  const width=1200,height=700;canvas.width=width;canvas.height=height;
  const output=ctx.createImageData(width,height),pixels=output.data,src=source.data;
  const scale=projection.scale(),center=projection.translate();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   let sx=x+.5,sy=y+.5;
   if(flat){sx=600+(sx-pan.x-600)/zoom;sy=350+(sy-pan.y-350)/zoom;}
   else if(Math.hypot(sx-center[0],sy-center[1])>scale)continue;
   const geo=projection.invert([sx,sy]);if(!geo||!geo.every(Number.isFinite)||Math.abs(geo[0])>180||Math.abs(geo[1])>90)continue;
   const check=projection(geo);if(!check||Math.hypot(check[0]-sx,check[1]-sy)>1)continue;
   const fx=(geo[0]+180)/360*source.width-.5,fy=Math.max(0,Math.min(source.height-1,(90-geo[1])/180*source.height-.5));
   const x0=(Math.floor(fx)+source.width)%source.width,x1=(x0+1)%source.width,y0=Math.floor(fy),y1=Math.min(source.height-1,y0+1),dx=fx-Math.floor(fx),dy=fy-y0,to=(y*width+x)*4;
   const sample=(channel:number)=>(src[(y0*source.width+x0)*4+channel]*(1-dx)+src[(y0*source.width+x1)*4+channel]*dx)*(1-dy)+(src[(y1*source.width+x0)*4+channel]*(1-dx)+src[(y1*source.width+x1)*4+channel]*dx)*dy;
   const shade=flat?.91:.76+.18*Math.sqrt(Math.max(0,1-((sx-center[0])**2+(sy-center[1])**2)/scale**2));
   pixels[to]=sample(0)*shade;pixels[to+1]=sample(1)*shade;pixels[to+2]=sample(2)*shade;pixels[to+3]=255;
  }
  ctx.putImageData(output,0,0);setRaster(canvas.toDataURL('image/webp',.9));onReady();
 },[source,projection,flat,pan.x,pan.y,zoom]);
 return raster?<image x="0" y="0" width="1200" height="700" href={raster} pointerEvents="none" aria-label={translateLive("NASA Blue Marble geographic surface")}/>:<text x="600" y="670" textAnchor="middle" fill="#f5d38d" fontSize="12"><LocaleText value={failed?'Satellite texture unavailable · terrain fallback active':'Loading satellite surface…'}/></text>;
}
