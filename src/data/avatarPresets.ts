export interface AvatarPreset { id:string; label:string; skin:string; hair:string; jacket:string; shirt:string; style:0|1|2|3|4; glasses?:boolean; }
export const AVATAR_PRESETS:AvatarPreset[]=[
{id:'avatar-01',label:'Executive',skin:'#f0c7a5',hair:'#2d211c',jacket:'#24384c',shirt:'#dce7ed',style:0},
{id:'avatar-02',label:'Diplomat',skin:'#d9a67f',hair:'#1f1c1a',jacket:'#4a2f36',shirt:'#efe6da',style:1,glasses:true},
{id:'avatar-03',label:'Strategist',skin:'#8d593d',hair:'#161313',jacket:'#203b35',shirt:'#d5d8d1',style:2},
{id:'avatar-04',label:'Commander',skin:'#6d412f',hair:'#2a201c',jacket:'#3d3c48',shirt:'#d8dce4',style:3},
{id:'avatar-05',label:'Reformer',skin:'#f1d0b1',hair:'#8a5e3a',jacket:'#31536a',shirt:'#f0e8dc',style:4},
{id:'avatar-06',label:'Technocrat',skin:'#c18463',hair:'#32211d',jacket:'#344a58',shirt:'#dce8e9',style:0,glasses:true},
{id:'avatar-07',label:'Minister',skin:'#5b3629',hair:'#111111',jacket:'#273d51',shirt:'#e7ddd2',style:1},
{id:'avatar-08',label:'Envoy',skin:'#e7b98f',hair:'#4a2b20',jacket:'#5a394a',shirt:'#efe8df',style:2},
{id:'avatar-09',label:'Marshal',skin:'#b97958',hair:'#221a18',jacket:'#39472f',shirt:'#dfe6d6',style:3},
{id:'avatar-10',label:'Economist',skin:'#f3cfb0',hair:'#7b533a',jacket:'#463d5b',shirt:'#f0ece4',style:4,glasses:true},
{id:'avatar-11',label:'Director',skin:'#70442f',hair:'#151312',jacket:'#223b45',shirt:'#e1e9e8',style:0},
{id:'avatar-12',label:'Governor',skin:'#c98f6d',hair:'#5b3427',jacket:'#53413c',shirt:'#eee2d6',style:1},
{id:'avatar-13',label:'Analyst',skin:'#f0bea2',hair:'#1e1715',jacket:'#284a5b',shirt:'#dfe9ed',style:2,glasses:true},
{id:'avatar-14',label:'General',skin:'#87563f',hair:'#25201d',jacket:'#48513a',shirt:'#e0e5d8',style:3},
{id:'avatar-15',label:'Chancellor',skin:'#d5a081',hair:'#a56b3f',jacket:'#3e3550',shirt:'#eee8df',style:4},
{id:'avatar-16',label:'Consul',skin:'#5c392c',hair:'#24201f',jacket:'#2f4a59',shirt:'#e1e8e6',style:0,glasses:true},
{id:'avatar-17',label:'Premier',skin:'#e9c19d',hair:'#46312b',jacket:'#5b3c3f',shirt:'#efe6dc',style:1},
{id:'avatar-18',label:'Planner',skin:'#a86e50',hair:'#1d1716',jacket:'#2d4f44',shirt:'#dce6df',style:2},
{id:'avatar-19',label:'Chair',skin:'#754732',hair:'#181515',jacket:'#40455b',shirt:'#e2e5ed',style:3,glasses:true},
{id:'avatar-20',label:'President',skin:'#f1c9a8',hair:'#6b4935',jacket:'#31506a',shirt:'#f0e9e0',style:4},
];
export const avatarPreset=(id:string)=>AVATAR_PRESETS.find(a=>a.id===id)??AVATAR_PRESETS[0];
