import {translateText} from '../../i18n/localeText';
import type {EstimateBand} from '../../engine/systems/operationalVisibility';
export function estimateText(value:number|EstimateBand|null,language:string){
 if(value===null)return translateText(language,'Unknown');
 const format=(n:number)=>new Intl.NumberFormat(language,{maximumFractionDigits:0}).format(n);
 if(typeof value==='number')return format(value);
 return value.max===null?`${format(value.min)}+`:`${format(value.min)}–${format(value.max)}`;
}
