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
