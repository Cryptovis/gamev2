export interface ImageSnapshot {url:string;status:'loading'|'ready'|'failed';attempt:number}
class ImageRequest {
 snapshot:ImageSnapshot;listeners=new Set<()=>void>();started=false;timer:ReturnType<typeof setTimeout>|undefined;image:HTMLImageElement|undefined;
 constructor(readonly src:string){this.snapshot={url:src,status:'loading',attempt:0};}
 publish(snapshot:ImageSnapshot){this.snapshot=snapshot;for(const listener of this.listeners)listener();}
 start(){if(this.started)return;this.started=true;this.load();}
 load(){const url=this.snapshot.attempt?`${this.src}${this.src.includes('?')?'&':'?'}retry=${this.snapshot.attempt}`:this.src;this.publish({...this.snapshot,url,status:'loading'});const image=new Image();this.image=image;image.onload=()=>{if(this.image===image)this.publish({...this.snapshot,status:'ready'});};image.onerror=()=>this.failed();image.src=url;}
 failed(){if(this.snapshot.status==='failed'||this.timer)return;if(this.snapshot.attempt>=3){this.publish({...this.snapshot,status:'failed'});return;}const attempt=this.snapshot.attempt+1;this.publish({...this.snapshot,attempt,status:'loading'});this.timer=setTimeout(()=>{this.timer=undefined;this.load();},[500,1500,4000][attempt-1]);}
 retry(){if(this.snapshot.status!=='failed')return;this.publish({url:this.src,status:'loading',attempt:0});this.load();}
}
const requests=new Map<string,ImageRequest>();
export function imageRequest(src:string){let request=requests.get(src);if(!request){request=new ImageRequest(src);requests.set(src,request);}return request;}
export function retryFailedImages(){for(const request of requests.values())request.retry();}
if(typeof window!=='undefined'){window.addEventListener('online',retryFailedImages);window.addEventListener('focus',retryFailedImages);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')retryFailedImages();});}
