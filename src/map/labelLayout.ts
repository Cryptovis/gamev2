export type ScreenLabelCandidate = {
  id:string;
  text:string;
  x:number;
  y:number;
  fontSize:number;
  priority:number;
  force?:boolean;
  className?:string;
  extraHeight?:number;
};

export type ScreenLabel = ScreenLabelCandidate & {
  width:number;
  height:number;
};

const overlaps=(a:ScreenLabel,b:ScreenLabel,padding:number)=>{
  const ax1=a.x-a.width/2-padding, ax2=a.x+a.width/2+padding;
  const ay1=a.y-a.height/2-padding, ay2=a.y+a.height/2+padding;
  const bx1=b.x-b.width/2-padding, bx2=b.x+b.width/2+padding;
  const by1=b.y-b.height/2-padding, by2=b.y+b.height/2+padding;
  return ax1<bx2&&ax2>bx1&&ay1<by2&&ay2>by1;
};

export function approximateLabelBox(candidate:ScreenLabelCandidate):ScreenLabel{
  const width=Math.max(candidate.fontSize*2.2,candidate.text.length*candidate.fontSize*.76);
  const height=candidate.fontSize*1.2+(candidate.extraHeight??0);
  return {...candidate,width,height};
}

export function layoutScreenLabels(
  candidates:ScreenLabelCandidate[],
  viewport:{width:number;height:number},
  options:{padding?:number;maxCount?:number;margin?:number}={},
):ScreenLabel[]{
  const padding=options.padding??5;
  const maxCount=options.maxCount??120;
  const margin=options.margin??8;
  const sorted=[...candidates].sort((a,b)=>
    Number(Boolean(b.force))-Number(Boolean(a.force)) ||
    b.priority-a.priority ||
    a.text.localeCompare(b.text)
  );
  const placed:ScreenLabel[]=[];
  for(const raw of sorted){
    if(placed.length>=maxCount&&!raw.force)continue;
    const candidate=approximateLabelBox(raw);
    if(![candidate.x,candidate.y,candidate.width,candidate.height].every(Number.isFinite))continue;
    if(raw.force&&raw.x>=0&&raw.x<=viewport.width&&raw.y>=0&&raw.y<=viewport.height&&candidate.width<=viewport.width-2*margin){
      candidate.x=Math.max(margin+1+candidate.width/2,Math.min(viewport.width-margin-1-candidate.width/2,candidate.x));
      candidate.y=Math.max(margin+1+candidate.height/2,Math.min(viewport.height-margin-1-candidate.height/2,candidate.y));
    }
    if(candidate.x-candidate.width/2<margin||candidate.x+candidate.width/2>viewport.width-margin)continue;
    if(candidate.y-candidate.height/2<margin||candidate.y+candidate.height/2>viewport.height-margin)continue;
    const collisions=placed.filter(p=>overlaps(candidate,p,padding));
    if(!collisions.length){
      placed.push(candidate);
      continue;
    }
    if(raw.force&&collisions.every(item=>!item.force)){
      for(const item of collisions){
        const index=placed.indexOf(item);
        if(index>=0)placed.splice(index,1);
      }
      placed.push(candidate);
    }
  }
  return placed;
}

export function labelRevealThreshold(zoom:number,flat:boolean){
  if(flat){
    if(zoom>=6)return 36;
    if(zoom>=4)return 90;
    if(zoom>=2.8)return 210;
    if(zoom>=2)return 430;
    if(zoom>=1.35)return 900;
    return 1750;
  }
  if(zoom>=2.7)return 55;
  if(zoom>=2)return 130;
  if(zoom>=1.5)return 320;
  if(zoom>=1.15)return 720;
  return 1450;
}

export function labelFontSize(projectedArea:number,zoom:number){
  const areaBoost=Math.max(0,Math.min(3,Math.log10(Math.max(10,projectedArea))-2));
  const zoomBoost=zoom>=3?1.5:zoom>=2?1:zoom>=1.4?.5:0;
  return Math.max(10.5,Math.min(14.5,10.5+areaBoost+zoomBoost));
}

export function maxCountryLabels(zoom:number,flat:boolean){
  if(flat){
    if(zoom>=6)return 115;
    if(zoom>=4)return 90;
    if(zoom>=2.5)return 68;
    if(zoom>=1.6)return 48;
    return 30;
  }
  if(zoom>=2.5)return 70;
  if(zoom>=1.6)return 48;
  return 32;
}
