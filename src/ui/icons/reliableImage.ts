export interface ImageSnapshot {url:string;status:'loading'|'ready'|'failed';attempt:number}
class ImageRequest {
 snapshot:ImageSnapshot;listeners=new Set<()=>void>();started=false;cycle=0;timer:ReturnType<typeof setTimeout>|undefined;image:HTMLImageElement|undefined;deadline:ReturnType<typeof setTimeout>|undefined;
 constructor(readonly src:string){this.snapshot={url:src,status:'loading',attempt:0};}
 publish(snapshot:ImageSnapshot){this.snapshot=snapshot;for(const listener of this.listeners)listener();}
 start(){if(this.snapshot.status==='failed'){this.retry();return;}if(this.started)return;this.started=true;this.load();}
 load(){const parts=[...(this.cycle?[`image-cycle=${this.cycle}`]:[]),...(this.snapshot.attempt?[`retry=${this.snapshot.attempt}`]:[])];const url=this.src+(parts.length?`${this.src.includes('?')?'&':'?'}${parts.join('&')}`:'');this.publish({...this.snapshot,url,status:'loading'});clearTimeout(this.deadline);const image=new Image();this.image=image;image.onload=()=>{if(this.image===image){clearTimeout(this.deadline);this.publish({...this.snapshot,status:'ready'});}};image.onerror=()=>{if(this.image===image)this.failed();};this.deadline=setTimeout(()=>{if(this.image===image)this.failed();},8000);image.src=url;}
 failed(){clearTimeout(this.deadline);if(this.snapshot.status==='failed'||this.timer)return;if(this.snapshot.attempt>=3){this.publish({...this.snapshot,status:'failed'});return;}const attempt=this.snapshot.attempt+1;this.publish({...this.snapshot,attempt,status:'loading'});this.timer=setTimeout(()=>{this.timer=undefined;this.load();},[500,1500,4000][attempt-1]);}
 retry(){if(this.snapshot.status!=='failed')return;this.cycle++;this.publish({url:this.src,status:'loading',attempt:0});this.load();}
}
const requests=new Map<string,ImageRequest>();
export function imageRequest(src:string){let request=requests.get(src);if(!request){request=new ImageRequest(src);requests.set(src,request);}return request;}
export function retryFailedImages(){for(const request of requests.values())request.retry();}
if(typeof window!=='undefined'){window.addEventListener('online',retryFailedImages);window.addEventListener('focus',retryFailedImages);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')retryFailedImages();});}
