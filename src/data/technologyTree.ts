import type { TechnologyCategory } from '../domain/game';

export interface TechnologyNode {
  id: string;
  category: TechnologyCategory;
  name: string;
  description: string;
  cost: number;
  prerequisites: string[];
  tier: 1 | 2 | 3;
}

export const TECHNOLOGY_TREE: TechnologyNode[] = [
 {id:'edu-foundation',category:'education',name:'Public Education',description:'Raises daily research generation by 5%.',cost:22,prerequisites:[],tier:1},
 {id:'edu-laboratories',category:'education',name:'Research Laboratories',description:'Raises daily research generation by another 3% and unlocks research institutes.',cost:37,prerequisites:['edu-foundation'],tier:2},
 {id:'mil-flight-school',category:'military',name:'Flight Instruction',description:'Speeds pilot training by 10%.',cost:45,prerequisites:['mil-command'],tier:2},
 {id:'soc-public-diplomacy',category:'diplomacy',name:'Public Diplomacy',description:'Adds 0.04 diplomatic influence per day.',cost:28,prerequisites:[],tier:1},
 {id:'soc-diplomatic-leadership',category:'diplomacy',name:'Diplomatic Leadership',description:'Improves international vote support and unlocks Security Council eligibility.',cost:48,prerequisites:['soc-public-diplomacy','soc-resilience'],tier:2},
  {id:'energy-water',category:'energy',name:'Water Treatment & Storage',description:'Unlocks new waterworks to produce and export clean water.',cost:20,prerequisites:[],tier:1},
  {id:'ind-extraction',category:'industry',name:'Precision Mineral Extraction',description:'Unlocks rare-earth mining and advanced deposit extraction.',cost:32,prerequisites:[],tier:1},
  {id:'ind-engines',category:'industry',name:'Engine Manufacturing',description:'Unlocks engine works: steel + copper + aluminum + rubber.',cost:40,prerequisites:['ind-metallurgy'],tier:2},
  {id:'ind-electronics',category:'industry',name:'Industrial Electronics',description:'Unlocks electronics works: copper + silicon + rare earths.',cost:42,prerequisites:['ind-extraction'],tier:2},
  {id:'mil-armor-assembly',category:'military',name:'Armored Vehicle Assembly',description:'Enables tank output using two armor plates, one engine and one electronics module per vehicle. Components may be imported.',cost:55,prerequisites:['mil-command','ind-metallurgy'],tier:3},

  { id:'econ-logistics', category:'economy', name:'Integrated Logistics', description:'Cuts economic friction and improves national distribution.', cost:24, prerequisites:[], tier:1 },
  { id:'econ-digital', category:'economy', name:'Digital Administration', description:'Raises tax efficiency and institutional productivity.', cost:38, prerequisites:['econ-logistics'], tier:2 },
  { id:'ind-refining', category:'industry', name:'High-Efficiency Refining', description:'Improves crude oil to fuel conversion.', cost:28, prerequisites:[], tier:1 },
  { id:'ind-metallurgy', category:'industry', name:'Advanced Metallurgy', description:'Improves iron to steel conversion and heavy industry.', cost:34, prerequisites:[], tier:1 },
  { id:'ind-automation', category:'industry', name:'Industrial Automation', description:'Raises factory utilization and steel throughput.', cost:48, prerequisites:['ind-metallurgy'], tier:2 },
  { id:'mil-command', category:'military', name:'Networked Command', description:'Improves readiness and battlefield coordination.', cost:35, prerequisites:[], tier:1 },
  { id:'mil-precision', category:'military', name:'Precision Munitions', description:'Improves combat effectiveness and reduces operational waste.', cost:50, prerequisites:['mil-command'], tier:2 },
  { id:'intel-sigint', category:'intelligence', name:'SIGINT Fusion', description:'Improves intelligence confidence and network reach.', cost:30, prerequisites:[], tier:1 },
  { id:'intel-counter', category:'intelligence', name:'Counterintelligence Doctrine', description:'Improves defensive intelligence and regime resilience.', cost:38, prerequisites:['intel-sigint'], tier:2 },
  { id:'energy-grid', category:'energy', name:'Grid Modernization', description:'Improves electricity reserve generation.', cost:30, prerequisites:[], tier:1 },
  { id:'energy-nuclear', category:'energy', name:'Civil Nuclear Infrastructure', description:'Unlocks efficient uranium use and strategic energy resilience.', cost:55, prerequisites:['energy-grid'], tier:2 },
  { id:'soc-resilience', category:'society', name:'Social Resilience', description:'Raises cohesion and reduces political shock from crises.', cost:30, prerequisites:[], tier:1 },
];

export const technologyById = Object.fromEntries(TECHNOLOGY_TREE.map((node)=>[node.id,node]));
