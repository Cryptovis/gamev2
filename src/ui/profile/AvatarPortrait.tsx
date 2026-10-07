import {avatarPreset} from '../../data/avatarPresets';
export function AvatarPortrait({id,size=58}:{id:string;size?:number}){
 const a=avatarPreset(id);
 return <div className="avatar-portrait portrait-generated" role="img" aria-label={a.label} data-style={a.category} style={{width:size,height:Math.round(size*1.16),backgroundImage:`url(/assets/leaders/${a.category}-atlas.svg)`,backgroundPosition:`${a.tile*25}% 26%`}}/>;
}
