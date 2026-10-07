export type Pan = {x:number;y:number};
export const CAMERA_LIMITS = {flat:{min:1,max:12},globe:{min:.72,max:6}};
export const DEFAULT_ZOOM_SENSITIVITY = .65;
export function clampSensitivity(value:number){return Number.isFinite(value)?Math.max(.3,Math.min(1.5,value)):DEFAULT_ZOOM_SENSITIVITY;}
// Wheel modes are pixels, lines or pages. Bound individual notches without discarding
// small trackpad movements; proportional zoom behaves consistently at every scale.
export function wheelZoomFactor(delta:number,mode:number,sensitivity:number){
 if(!Number.isFinite(delta))return 1;
 const pixels=delta*(mode===1?16:mode===2?700:1);
 return Math.exp(-Math.max(-100,Math.min(100,pixels))*.0018*clampSensitivity(sensitivity));
}
export function clampZoom(value:number,flat:boolean){const limit=CAMERA_LIMITS[flat?'flat':'globe'];return Math.max(limit.min,Math.min(limit.max,value));}
export function boundPan(pan:Pan,zoom:number):Pan{
 const x=600*(zoom-1)+80,y=350*(zoom-1)+50;
 return {x:Math.max(-x,Math.min(x,pan.x)),y:Math.max(-y,Math.min(y,pan.y))};
}
export function zoomAtPoint(pan:Pan,from:number,to:number,point:[number,number]):Pan{
 const ratio=to/from;
 return {x:point[0]-600-(point[0]-600-pan.x)*ratio,y:point[1]-350-(point[1]-350-pan.y)*ratio};
}
export function readZoomSensitivity(){try{return clampSensitivity(Number(localStorage.getItem('alpyx-map-zoom')??DEFAULT_ZOOM_SENSITIVITY));}catch{return DEFAULT_ZOOM_SENSITIVITY;}}
