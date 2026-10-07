export type LeaderStyle='civilian'|'military'|'aviator'|'worker';
export interface AvatarPreset {id:string;label:string;category:LeaderStyle;tile:number;}
export const LEADER_STYLES:Array<{id:LeaderStyle;label:string;turkish:string;description:string}>=[
 {id:'civilian',label:'Civilian',turkish:'Sivil / Demokrat',description:'Tailored suits and civilian leadership'},
 {id:'military',label:'Military',turkish:'Askerî',description:'Army dress uniforms'},
 {id:'aviator',label:'Air Force',turkish:'Havacı',description:'Air force dress uniforms'},
 {id:'worker',label:'Labour',turkish:'İşçi',description:'Workwear and industrial leadership'},
];
export const AVATAR_PRESETS:AvatarPreset[]=[
 {id:'avatar-01',label:'Executive',category:'civilian',tile:0},
 {id:'avatar-02',label:'Reformer',category:'civilian',tile:1},
 {id:'avatar-03',label:'Diplomat',category:'civilian',tile:2},
 {id:'avatar-04',label:'Governor',category:'civilian',tile:3},
 {id:'avatar-05',label:'Chancellor',category:'civilian',tile:4},
 {id:'avatar-06',label:'Commander',category:'military',tile:0},
 {id:'avatar-07',label:'Strategist',category:'military',tile:1},
 {id:'avatar-08',label:'General',category:'military',tile:2},
 {id:'avatar-09',label:'Marshal',category:'military',tile:3},
 {id:'avatar-10',label:'Veteran',category:'military',tile:4},
 {id:'avatar-11',label:'Air Commander',category:'aviator',tile:0},
 {id:'avatar-12',label:'Flight Director',category:'aviator',tile:1},
 {id:'avatar-13',label:'Aviator',category:'aviator',tile:2},
 {id:'avatar-14',label:'Air Marshal',category:'aviator',tile:3},
 {id:'avatar-15',label:'Wing Commander',category:'aviator',tile:4},
 {id:'avatar-16',label:'Labour Leader',category:'worker',tile:0},
 {id:'avatar-17',label:'Organizer',category:'worker',tile:1},
 {id:'avatar-18',label:'Industrialist',category:'worker',tile:2},
 {id:'avatar-19',label:'Engineer',category:'worker',tile:3},
 {id:'avatar-20',label:'Union Leader',category:'worker',tile:4},
];
export const avatarPreset=(id:string)=>AVATAR_PRESETS.find(a=>a.id===id)??AVATAR_PRESETS[0];
