import type {GameLanguage} from '../domain/game';

// Original sayings / excerpts; other languages are our translations.
export interface LeadershipQuote {
 id:string;
 author:string;
 source:string;
 text:Record<GameLanguage,string>;
}
export const LEADERSHIP_QUOTES:readonly LeadershipQuote[]=[
 {
  id:'ataturk-peace',author:'Mustafa Kemal Atatürk',
  source:'https://www.mfa.gov.tr/synopsis-of-the-turkish-foreign-policy.en.mfa',
  text:{en:'Peace at home, peace in the world.',tr:'Yurtta barış, dünyada barış.',es:'Paz en casa, paz en el mundo.',zh:'国内和平，世界和平。',ru:'Мир в стране, мир во всём мире.'},
 },
 {
  id:'ataturk-sovereignty',author:'Mustafa Kemal Atatürk',
  source:'https://mardin.ktb.gov.tr/TR-185183/milli-egemenlik.html',
  text:{en:'Sovereignty belongs unconditionally to the nation.',tr:'Egemenlik kayıtsız ve şartsız milletindir.',es:'La soberanía pertenece sin condiciones a la nación.',zh:'主权无条件属于人民。',ru:'Суверенитет безусловно принадлежит народу.'},
 },
 {
  id:'lincoln-people',author:'Abraham Lincoln',
  source:'https://www.nps.gov/linc/learn/historyculture/gettysburgaddress.htm',
  text:{en:'Government of the people, by the people, for the people shall not perish from the earth.',tr:'Halkın, halk tarafından, halk için yönetimi yeryüzünden silinmeyecektir.',es:'El gobierno del pueblo, por el pueblo y para el pueblo no desaparecerá de la Tierra.',zh:'民有、民治、民享的政府不会从地球上消失。',ru:'Правление народа, волей народа и для народа не исчезнет с лица земли.'},
 },
 {
  id:'mandela-education',author:'Nelson Mandela',
  source:'https://www.nelsonmandela.org/nm100-education',
  text:{en:'Education is the most powerful weapon which you can use to change the world.',tr:'Eğitim, dünyayı değiştirmek için kullanabileceğiniz en güçlü silahtır.',es:'La educación es el arma más poderosa que puedes usar para cambiar el mundo.',zh:'教育是你可以用来改变世界的最强大的武器。',ru:'Образование — самое мощное оружие, с помощью которого можно изменить мир.'},
 },
];

export function pickLeadershipQuote(roll:number):LeadershipQuote {
 const bounded=Number.isFinite(roll)?Math.max(0,Math.min(1,roll)):0;
 return LEADERSHIP_QUOTES[Math.min(LEADERSHIP_QUOTES.length-1,Math.floor(bounded*LEADERSHIP_QUOTES.length))];
}

/** Presentation-only randomness; avoid an immediate repeat across wizard openings. */
export function nextLeadershipQuote(roll:number,previousId?:string|null):LeadershipQuote {
 const choices=LEADERSHIP_QUOTES.filter(q=>q.id!==previousId);
 const bounded=Number.isFinite(roll)?Math.max(0,Math.min(1,roll)):0;
 return choices[Math.min(choices.length-1,Math.floor(bounded*choices.length))];
}
