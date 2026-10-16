import {INTERNATIONAL_HINTS} from '../panels/international/hints';
import type {TacticalHintSpec} from './types';

/**
 * Window hints migrated from static footnotes. `bodyKey` and `extraKeys` are the original English
 * footnote strings, already translated in tr/es/zh/ru; titles reuse existing translated labels.
 * Ids are stable and never reused for different content.
 */
export const WAR_TACTICAL_HINT:TacticalHintSpec={
  id:'war.tactical',titleKey:'Tactical guide',
  bodyKey:'Objectives are held only while no enemy is adjacent.',
  extraKeys:['Capturing the depot improves combat power. Hidden enemy positions require recon. Both sides execute orders simultaneously.','Offensive orders burn operational fuel. Holding positions burns a smaller sustainment share, for both sides, and never prevents defending.'],
};
export const WAR_TASK_GROUPS_HINT:TacticalHintSpec={
  id:'war.taskGroups',titleKey:'Task groups',
  bodyKey:'Assign aircraft and warships to missions. Only assigned forces fight in this war; new groups need 1–3 days to reach the front.',
  extraKeys:['Enemy assignments are not visible; you see only their effect on your front.'],
};
export const DIPLOMACY_RULES_HINT:TacticalHintSpec={
  id:'diplomacy.rules',titleKey:'Relations',
  bodyKey:"Trade and aid improve bilateral trust over time. Embassies accelerate diplomatic access and commercial trust. Cooperation with a state's hostile rival can reduce your standing with that rival. Below 10/100, relations are openly hostile.",
};
export const SUPPLY_INVESTMENT_HINT:TacticalHintSpec={
  id:'supply.investment',titleKey:'Infrastructure',
  bodyKey:'Infrastructure consumes daily maintenance. Underfunded networks degrade slowly; AI states also invest in weak transport links during monthly strategic reviews.',
};
export const DESK_PROPOSALS_HINT:TacticalHintSpec={
  id:'desk.proposals',titleKey:'Pending proposals',
  bodyKey:'Proposals expire on their last day. Declining is free; accepting shares the setup fee with the sender.',
};
export const PRODUCTION_DOCTRINE_HINT:TacticalHintSpec={
  id:'production.doctrine',titleKey:'Production & Equipment',
  bodyKey:'Factories build reserves continuously. Low steel, fuel, electricity or treasury throttles output and erodes line efficiency. Healthy strategic reserves improve combat sustainment; deployed equipment reinforces the active military.',
};
export const RESOURCES_SHORTAGE_HINT:TacticalHintSpec={
  id:'resources.shortage',titleKey:'Respond to shortages',
  bodyKey:'Shortage management is connected directly to diplomacy and trade. Trade pacts unlock imports; embassies can reduce bilateral friction.',
};
export const SOVEREIGN_CREDIT_HINT:TacticalHintSpec={
  id:'credit.rules',titleKey:'Sovereign Credit & Monetary Fund',
  bodyKey:'Applications are assessed after three game days. Funds arrive only on approval; relations, rating and lender cash are checked again.',
  extraKeys:['Low treasury can unlock a larger three-year rescue offer at a higher interest rate.'],
};
export const RANKING_HINTS={
  military:{id:'rankings.military',titleKey:'Military ranking',bodyKey:'Sorted by current military power; readiness and equipment change the score.'},
  financial:{id:'rankings.financial',titleKey:'Financial ranking',bodyKey:'Sorted by GDP. Credit ratings reflect simulated finances and repayment history.'},
  diplomacy:{id:'rankings.diplomacy',titleKey:'Diplomacy ranking',bodyKey:'Score combines reputation (60%), council influence (30%) and up to 10 allied partners.'},
} satisfies Record<string,TacticalHintSpec>;

export const ALL_HINTS:readonly TacticalHintSpec[]=[
  ...Object.values(INTERNATIONAL_HINTS),
  WAR_TACTICAL_HINT,WAR_TASK_GROUPS_HINT,DIPLOMACY_RULES_HINT,SUPPLY_INVESTMENT_HINT,DESK_PROPOSALS_HINT,
  PRODUCTION_DOCTRINE_HINT,RESOURCES_SHORTAGE_HINT,SOVEREIGN_CREDIT_HINT,...Object.values(RANKING_HINTS),
];
