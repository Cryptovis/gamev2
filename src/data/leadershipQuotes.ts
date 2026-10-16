import type {GameLanguage} from '../domain/game';
import {LEADERSHIP_AUTHORS,type LeadershipAuthor,type LeadershipAuthorId} from './leadershipAuthors';
import {selectLeadershipQuote,type QuoteContext} from './leadershipQuoteSelection';
import {localized,type LocalizedText,type QuoteCategory,type QuoteProvenance} from './leadershipTypes';

export {QUOTE_CATEGORIES} from './leadershipTypes';
export type {LocalizedText,QuoteCategory,QuoteEra,QuoteProvenance,QuoteRights} from './leadershipTypes';

// Original sayings / excerpts; other languages are our translations. No quote ships as reviewed until a person has
// checked its source and all five wordings (see provenance.reviewed).
export interface LeadershipQuote {
 id:string;
 /** Canonical Latin-script author name. Kept for existing readers; the localized form is LEADERSHIP_AUTHORS[authorId]. */
 author:string;
 authorId:LeadershipAuthorId;
 /** The four original quotes keep their https source URL. Newer entries carry a short citation here and the full one in provenance. */
 source:string;
 /** Title of the work or occasion, in each language. */
 sourceTitle:LocalizedText;
 /** Year or range as displayed, language neutral. */
 year:string;
 category:QuoteCategory;
 /** Always includes category. Drives context-aware selection. */
 tags:readonly QuoteCategory[];
 text:Record<GameLanguage,string>;
 provenance:QuoteProvenance;
}

/** Opening and closing marks for each language's typographic convention. */
export const QUOTE_GLYPHS:Record<GameLanguage,{open:string;close:string}>={
 en:{open:'“',close:'”'},
 tr:{open:'“',close:'”'},
 es:{open:'«',close:'»'},
 ru:{open:'«',close:'»'},
 zh:{open:'“',close:'”'},
};

interface QuoteInput {
 id:string;
 authorId:LeadershipAuthorId;
 source:string;
 sourceTitle:LocalizedText;
 year:string;
 category:QuoteCategory;
 /** Further categories besides the primary one. */
 also?:readonly QuoteCategory[];
 text:LocalizedText;
 provenance:QuoteProvenance;
}
/** Derives author and tags so they cannot drift from the author catalog or the primary category. */
function quote(input:QuoteInput):LeadershipQuote {
 const {also=[],...rest}=input;
 return {...rest,author:LEADERSHIP_AUTHORS[input.authorId].name.en,tags:[...new Set<QuoteCategory>([input.category,...also])]};
}

export const LEADERSHIP_QUOTES:readonly LeadershipQuote[]=[
 // The four original quotes come first, with their ids, source URLs and wording unchanged.
 quote({
  id:'ataturk-peace',authorId:'ataturk',
  source:'https://www.mfa.gov.tr/synopsis-of-the-turkish-foreign-policy.en.mfa',
  sourceTitle:localized('Principle of Turkish foreign policy','Türk dış politikasının ilkesi','Principio de la política exterior turca','土耳其外交政策原则','Принцип внешней политики Турции'),
  year:'c. 1931',category:'diplomacy',also:['war_and_peace'],
  text:{en:'Peace at home, peace in the world.',tr:'Yurtta barış, dünyada barış.',es:'Paz en casa, paz en el mundo.',zh:'国内和平，世界和平。',ru:'Мир в стране, мир во всём мире.'},
  provenance:{originalLanguage:'tr',citation:'Ministry of Foreign Affairs of Türkiye, Synopsis of the Turkish Foreign Policy',reviewed:false,rights:'public_domain',note:'Original wording is "Yurtta sulh, cihanda sulh"; the date is the one usually given for its first use and should be confirmed.'},
 }),
 quote({
  id:'ataturk-sovereignty',authorId:'ataturk',
  source:'https://mardin.ktb.gov.tr/TR-185183/milli-egemenlik.html',
  sourceTitle:localized('Principle of national sovereignty','Milli egemenlik ilkesi','Principio de soberanía nacional','国家主权原则','Принцип национального суверенитета'),
  year:'1921',category:'statecraft',also:['liberty'],
  text:{en:'Sovereignty belongs unconditionally to the nation.',tr:'Egemenlik kayıtsız ve şartsız milletindir.',es:'La soberanía pertenece sin condiciones a la nación.',zh:'主权无条件属于人民。',ru:'Суверенитет безусловно принадлежит народу.'},
  provenance:{originalLanguage:'tr',citation:'Principle of national sovereignty, enshrined in the 1921 Constitution (Teşkilât-ı Esasiye); Ministry of Culture and Tourism page',reviewed:false,rights:'public_domain'},
 }),
 quote({
  id:'lincoln-people',authorId:'lincoln',
  source:'https://www.nps.gov/linc/learn/historyculture/gettysburgaddress.htm',
  sourceTitle:localized('Gettysburg Address','Gettysburg Söylevi','Discurso de Gettysburg','葛底斯堡演说','Геттисбергская речь'),
  year:'1863',category:'liberty',also:['statecraft'],
  text:{en:'Government of the people, by the people, for the people shall not perish from the earth.',tr:'Halkın, halk tarafından, halk için yönetimi yeryüzünden silinmeyecektir.',es:'El gobierno del pueblo, por el pueblo y para el pueblo no desaparecerá de la Tierra.',zh:'民有、民治、民享的政府不会从地球上消失。',ru:'Правление народа, волей народа и для народа не исчезнет с лица земли.'},
  provenance:{originalLanguage:'en',citation:'Gettysburg Address, 19 November 1863 (National Park Service text)',reviewed:false,rights:'public_domain',note:'Shortened from the original, which reads "that government of the people, by the people, for the people, shall not perish from the earth."'},
 }),
 quote({
  id:'mandela-education',authorId:'mandela',
  source:'https://www.nelsonmandela.org/nm100-education',
  sourceTitle:localized('Launch of the Mindset Network','Mindset Network lansman konuşması','Lanzamiento de Mindset Network','Mindset Network 启动仪式演讲','Запуск Mindset Network'),
  year:'2003',category:'wisdom',also:['liberty'],
  text:{en:'Education is the most powerful weapon which you can use to change the world.',tr:'Eğitim, dünyayı değiştirmek için kullanabileceğiniz en güçlü silahtır.',es:'La educación es el arma más poderosa que puedes usar para cambiar el mundo.',zh:'教育是你可以用来改变世界的最强大的武器。',ru:'Образование — самое мощное оружие, с помощью которого можно изменить мир.'},
  provenance:{originalLanguage:'en',citation:'Nelson Mandela, launch of the Mindset Network, Johannesburg, 16 July 2003',reviewed:false,rights:'short_quotation'},
 }),

 quote({
  id:'marcus-be-such',authorId:'marcus_aurelius',
  source:'Meditations, X.16',
  sourceTitle:localized('Meditations','Kendime Düşünceler','Meditaciones','沉思录','Размышления'),
  year:'c. 170–180',category:'wisdom',also:['statecraft'],
  text:localized(
   'No longer talk at all about the kind of man that a good man ought to be, but be such.',
   'İyi bir insanın nasıl olması gerektiğini konuşmayı artık bırak; öyle biri ol.',
   'No sigas hablando de cómo debe ser un hombre bueno: sé uno.',
   '不要再空谈好人应当是什么样子，去做一个那样的人。',
   'Довольно рассуждать о том, каким должен быть хороший человек, — будь им.'),
  provenance:{originalLanguage:'grc',citation:'Meditations X.16, after George Long (1862)',reviewed:false,rights:'public_domain',note:'English adapted from the public-domain Long translation.'},
 }),
 quote({
  id:'suntzu-without-fighting',authorId:'sun_tzu',
  source:'The Art of War, III',
  sourceTitle:localized('The Art of War','Savaş Sanatı','El arte de la guerra','孙子兵法·谋攻篇','Искусство войны'),
  year:'c. 5th century BCE',category:'war_and_peace',also:['wisdom'],
  text:localized(
   'Supreme excellence consists in breaking the enemy\'s resistance without fighting.',
   'En yüksek ustalık, düşmanın direncini savaşmadan kırmaktır.',
   'La excelencia suprema consiste en quebrar la resistencia del enemigo sin combatir.',
   '不战而屈人之兵，善之善者也。',
   'Высшее искусство — сломить сопротивление врага, не вступая в бой.'),
  provenance:{originalLanguage:'zh',citation:'Sunzi bingfa, ch. 3 (Mou Gong), tr. Lionel Giles (1910)',reviewed:false,rights:'public_domain'},
 }),
 quote({
  id:'lincoln-house-divided',authorId:'lincoln',
  source:'"House Divided" speech, Springfield, Illinois, 16 June 1858',
  sourceTitle:localized('House Divided speech','Bölünmüş Ev konuşması','Discurso de la casa dividida','“分裂之家”演说','Речь «Дом разделённый»'),
  year:'1858',category:'statecraft',
  text:localized(
   'A house divided against itself cannot stand.',
   'Kendi içinde bölünmüş bir ev ayakta duramaz.',
   'Una casa dividida contra sí misma no puede mantenerse en pie.',
   '一座自相分裂的房子是站立不住的。',
   'Дом, разделившийся сам в себе, не устоит.'),
  provenance:{originalLanguage:'en',citation:'Lincoln, speech at the Illinois Republican State Convention, Springfield, 16 June 1858',reviewed:false,rights:'public_domain'},
 }),
 quote({
  id:'churchill-jaw-jaw',authorId:'churchill',
  source:'Remarks at the White House, 26 June 1954',
  sourceTitle:localized('Remarks at the White House','Beyaz Saray\'daki konuşma','Palabras en la Casa Blanca','白宫讲话','Выступление в Белом доме'),
  year:'1954',category:'diplomacy',also:['war_and_peace'],
  text:localized(
   'To jaw-jaw is always better than to war-war.',
   'Konuşup durmak, savaşıp durmaktan her zaman iyidir.',
   'Siempre es mejor parlamentar que guerrear.',
   '唇枪舌剑，总胜过真刀真枪。',
   'Говорить всегда лучше, чем воевать.'),
  provenance:{originalLanguage:'en',citation:'Churchill, remarks at a White House luncheon, Washington, 26 June 1954',reviewed:false,rights:'short_quotation'},
 }),
 quote({
  id:'churchill-end-of-beginning',authorId:'churchill',
  source:'Mansion House speech, London, 10 November 1942',
  sourceTitle:localized('Mansion House speech','Mansion House konuşması','Discurso de Mansion House','市长官邸演说','Речь в Мэншн-хаус'),
  year:'1942',category:'war_and_peace',
  text:localized(
   'Now this is not the end. It is not even the beginning of the end. But it is, perhaps, the end of the beginning.',
   'Bu son değil. Sonun başlangıcı bile değil. Ama belki de başlangıcın sonu.',
   'Esto no es el final. Ni siquiera es el principio del final. Pero es, quizás, el final del principio.',
   '这不是结束，甚至不是结束的开始，但或许是开始的结束。',
   'Это не конец. Это даже не начало конца. Но, возможно, это конец начала.'),
  provenance:{originalLanguage:'en',citation:'Churchill, Lord Mayor\'s Luncheon, Mansion House, London, 10 November 1942',reviewed:false,rights:'short_quotation'},
 }),
 quote({
  id:'machiavelli-feared',authorId:'machiavelli',
  source:'The Prince, XVII',
  sourceTitle:localized('The Prince','Hükümdar','El príncipe','君主论','Государь'),
  year:'1513',category:'statecraft',
  text:localized(
   'It is much safer to be feared than loved, when, of the two, either must be dispensed with.',
   'İkisinden birinden vazgeçmek gerekiyorsa, korkulmak sevilmekten çok daha güvenlidir.',
   'Es mucho más seguro ser temido que amado, cuando hay que prescindir de una de las dos cosas.',
   '如果二者必须舍弃其一，那么被人畏惧远比受人爱戴安全。',
   'Если уж приходится выбирать, гораздо надёжнее внушать страх, чем быть любимым.'),
  provenance:{originalLanguage:'it',citation:'Il Principe, ch. XVII, tr. W. K. Marriott (1908)',reviewed:false,rights:'public_domain',note:'Spoken as a hard choice, not a recommendation; the same chapter prefers being both loved and feared.'},
 }),
 quote({
  id:'bismarck-art-of-possible',authorId:'bismarck',
  source:'Conversation with Friedrich Meyer von Waldeck, 11 August 1867',
  sourceTitle:localized('Conversation, 1867','Bir sohbetten, 1867','Conversación, 1867','1867年谈话','Из беседы, 1867'),
  year:'1867',category:'statecraft',also:['diplomacy'],
  text:localized(
   'Politics is the art of the possible.',
   'Siyaset, mümkün olanın sanatıdır.',
   'La política es el arte de lo posible.',
   '政治是可能性的艺术。',
   'Политика — искусство возможного.'),
  provenance:{originalLanguage:'de',citation:'"Die Politik ist die Lehre vom Möglichen", conversation with Meyer von Waldeck, 11 August 1867',reviewed:false,rights:'public_domain',note:'The German says Lehre (doctrine or science) of the possible; "art" is the standard English rendering.'},
 }),
 quote({
  id:'ashoka-concord',authorId:'ashoka',
  source:'Rock Edict XII',
  sourceTitle:localized('Rock Edict XII','XII. Kaya Fermanı','Edicto de la Roca XII','第十二摩崖法敕','XII наскальный эдикт'),
  year:'c. 250 BCE',category:'diplomacy',also:['wisdom'],
  text:localized(
   'Concord alone is commendable: that all should listen to, and respect, one another\'s teachings.',
   'Övgüye değer olan yalnızca uyumdur: herkesin birbirinin öğretisini dinlemesi ve ona saygı göstermesi.',
   'Solo la concordia es digna de elogio: que todos escuchen y respeten las enseñanzas de los demás.',
   '唯有和睦值得称颂：人人都应倾听并尊重彼此的教诲。',
   'Похвально лишь согласие: чтобы все слушали и уважали учения друг друга.'),
  provenance:{originalLanguage:'pra',citation:'Major Rock Edict XII ("samavāyo eva sādhu")',reviewed:false,rights:'public_domain',note:'English adapted from public-domain renderings.'},
 }),
 quote({
  id:'pericles-democracy',authorId:'pericles',
  source:'Funeral Oration, in Thucydides, History of the Peloponnesian War, II.37',
  sourceTitle:localized('Funeral Oration','Cenaze Söylevi','Discurso fúnebre','阵亡将士葬礼演说','Надгробная речь'),
  year:'431 BCE',category:'liberty',also:['statecraft'],
  text:localized(
   'Our constitution is called a democracy because power is in the hands not of a few but of the many.',
   'Yönetimimize demokrasi denir, çünkü güç birkaç kişinin değil, çoğunluğun elindedir.',
   'Nuestro régimen se llama democracia porque el poder no está en manos de unos pocos, sino de la mayoría.',
   '我们的政体被称为民主政体，因为权力不在少数人手中，而在多数人手中。',
   'Наш строй называется демократией, ибо власть принадлежит не немногим, а большинству.'),
  provenance:{originalLanguage:'grc',citation:'Thucydides II.37, English adapted from Crawley (1874) and Jowett (1881)',reviewed:false,rights:'public_domain',note:'Speech as reported by Thucydides, not a verbatim record.'},
 }),
 quote({
  id:'confucius-pole-star',authorId:'confucius',
  source:'Analects, II.1',
  sourceTitle:localized('The Analects','Konuşmalar','Analectas','论语·为政','Беседы и суждения'),
  year:'c. 5th century BCE',category:'statecraft',also:['wisdom'],
  text:localized(
   'He who exercises government by means of his virtue may be compared to the north polar star, which keeps its place and all the stars turn towards it.',
   'Erdemiyle yöneten, Kutup Yıldızı\'na benzer: o yerinde durur, bütün yıldızlar ona yönelir.',
   'Quien gobierna mediante la virtud es como la estrella polar: permanece en su lugar y todas las estrellas se vuelven hacia ella.',
   '为政以德，譬如北辰，居其所而众星共之。',
   'Правящий посредством добродетели подобен Полярной звезде: она пребывает на своём месте, а все звёзды обращаются к ней.'),
  provenance:{originalLanguage:'zh',citation:'Lunyu 2.1, tr. James Legge (1861)',reviewed:false,rights:'public_domain'},
 }),
 quote({
  id:'confucius-trust',authorId:'confucius',
  source:'Analects, XII.7',
  sourceTitle:localized('The Analects','Konuşmalar','Analectas','论语·颜渊','Беседы и суждения'),
  year:'c. 5th century BCE',category:'statecraft',
  text:localized(
   'If the people have no faith in their rulers, there is no standing for the state.',
   'Halkın yöneticilerine güveni yoksa devlet ayakta kalamaz.',
   'Si el pueblo no confía en sus gobernantes, el Estado no puede sostenerse.',
   '民无信不立。',
   'Без доверия народа государству не устоять.'),
  provenance:{originalLanguage:'zh',citation:'Lunyu 12.7, tr. James Legge (1861)',reviewed:false,rights:'public_domain'},
 }),
 quote({
  id:'degaulle-idea-of-france',authorId:'de_gaulle',
  source:'War Memoirs, vol. I, opening line (1954)',
  sourceTitle:localized('War Memoirs','Savaş Anıları','Memorias de guerra','战争回忆录','Военные мемуары'),
  year:'1954',category:'statecraft',also:['liberty'],
  text:localized(
   'All my life I have had a certain idea of France.',
   'Hayatım boyunca Fransa\'ya dair belli bir fikrim oldu.',
   'Toda mi vida me he forjado una cierta idea de Francia.',
   '我一生都对法兰西怀有一种特定的理念。',
   'Всю жизнь у меня было определённое представление о Франции.'),
  provenance:{originalLanguage:'fr',citation:'Mémoires de guerre, t. I, L\'Appel (1954): "Toute ma vie, je me suis fait une certaine idée de la France."',reviewed:false,rights:'short_quotation'},
 }),
 quote({
  id:'mandela-ideal',authorId:'mandela',
  source:'Statement from the dock, Rivonia Trial, 20 April 1964',
  sourceTitle:localized('Statement at the Rivonia Trial','Rivonia Davası savunması','Declaración en el juicio de Rivonia','里沃尼亚审判陈词','Речь на процессе в Ривонии'),
  year:'1964',category:'liberty',
  text:localized(
   'I have cherished the ideal of a democratic and free society in which all persons live together in harmony and with equal opportunities.',
   'Tüm insanların uyum içinde ve eşit fırsatlarla bir arada yaşadığı demokratik ve özgür bir toplum idealini hep yüreğimde taşıdım.',
   'He acariciado el ideal de una sociedad democrática y libre en la que todas las personas vivan juntas en armonía y con igualdad de oportunidades.',
   '我一直珍视一个民主、自由社会的理想，在这个社会里，人人和睦相处，机会均等。',
   'Я лелеял идеал демократического и свободного общества, в котором все люди живут вместе в гармонии и с равными возможностями.'),
  provenance:{originalLanguage:'en',citation:'Mandela, statement from the dock, Pretoria Supreme Court, 20 April 1964',reviewed:false,rights:'short_quotation'},
 }),
 quote({
  id:'smith-butcher',authorId:'adam_smith',
  source:'The Wealth of Nations, I.2',
  sourceTitle:localized('The Wealth of Nations','Milletlerin Zenginliği','La riqueza de las naciones','国富论','Богатство народов'),
  year:'1776',category:'economics',
  text:localized(
   'It is not from the benevolence of the butcher, the brewer, or the baker that we expect our dinner, but from their regard to their own interest.',
   'Akşam yemeğimizi kasabın, biracının ya da fırıncının iyiliğinden değil, onların kendi çıkarlarını gözetmesinden bekleriz.',
   'No es de la benevolencia del carnicero, del cervecero o del panadero de donde esperamos nuestra cena, sino del cuidado que ponen en su propio interés.',
   '我们期待的晚餐，并非出自屠夫、酿酒师或面包师的仁慈，而是出于他们对自身利益的关切。',
   'Мы ждём своего обеда не от благосклонности мясника, пивовара или пекаря, а от их заботы о собственной выгоде.'),
  provenance:{originalLanguage:'en',citation:'An Inquiry into the Nature and Causes of the Wealth of Nations, Book I, ch. 2',reviewed:false,rights:'public_domain'},
 }),
 quote({
  id:'ibnkhaldun-injustice',authorId:'ibn_khaldun',
  source:'The Muqaddimah',
  sourceTitle:localized('The Muqaddimah','Mukaddime','Al-Muqaddima','历史绪论','Мукаддима'),
  year:'1377',category:'economics',also:['statecraft'],
  text:localized(
   'Injustice leads civilization to ruin.',
   'Zulüm, umranın harap olmasına yol açar.',
   'La injusticia lleva la civilización a la ruina.',
   '不公导致文明的毁灭。',
   'Несправедливость ведёт цивилизацию к гибели.'),
  provenance:{originalLanguage:'ar',citation:'Muqaddimah, chapter on injustice and the ruin of civilization (al-ẓulm muʾdhin bi-kharāb al-ʿumrān)',reviewed:false,rights:'public_domain',note:'A chapter-heading idea rendered in our own words; check the chapter reference before release.'},
 }),
 quote({
  id:'thucydides-melian',authorId:'thucydides',
  source:'History of the Peloponnesian War, V.89 (Melian Dialogue)',
  sourceTitle:localized('History of the Peloponnesian War','Peloponnesos Savaşı','Historia de la guerra del Peloponeso','伯罗奔尼撒战争史','История Пелопоннесской войны'),
  year:'416 BCE',category:'war_and_peace',also:['diplomacy'],
  text:localized(
   'The strong do what they can and the weak suffer what they must.',
   'Güçlü olan yapabileceğini yapar, zayıf olan da katlanması gerekene katlanır.',
   'Los fuertes hacen lo que pueden y los débiles sufren lo que deben.',
   '强者为其所能为，弱者受其所必受。',
   'Сильные делают то, что могут, а слабые терпят то, что должны.'),
  provenance:{originalLanguage:'grc',citation:'Thucydides V.89, tr. Richard Crawley (1874)',reviewed:false,rights:'public_domain',note:'Spoken by the Athenian envoys; a warning about power, not an endorsement.'},
 }),
 quote({
  id:'clausewitz-continuation',authorId:'clausewitz',
  source:'On War, I.1.24',
  sourceTitle:localized('On War','Savaş Üzerine','De la guerra','战争论','О войне'),
  year:'1832',category:'war_and_peace',also:['statecraft'],
  text:localized(
   'War is merely the continuation of policy by other means.',
   'Savaş, politikanın başka araçlarla sürdürülmesinden başka bir şey değildir.',
   'La guerra no es más que la continuación de la política por otros medios.',
   '战争无非是政治通过另一种手段的继续。',
   'Война есть не что иное, как продолжение политики иными средствами.'),
  provenance:{originalLanguage:'de',citation:'Vom Kriege, Book I, ch. 1, section 24',reviewed:false,rights:'public_domain'},
 }),
 quote({
  id:'kautilya-happiness',authorId:'kautilya',
  source:'Arthashastra, I.19',
  sourceTitle:localized('Arthashastra','Arthaşastra','Arthashastra','政事论','Артхашастра'),
  year:'c. 3rd century BCE',category:'statecraft',also:['economics'],
  text:localized(
   'In the happiness of his subjects lies the happiness of the king; in their welfare, his welfare.',
   'Hükümdarın mutluluğu tebaasının mutluluğunda, iyiliği de onların iyiliğindedir.',
   'En la felicidad de sus súbditos reside la felicidad del rey; en el bienestar de ellos, el suyo propio.',
   '臣民之乐即君王之乐，臣民之福即君王之福。',
   'В счастье подданных — счастье царя, в их благе — его благо.'),
  provenance:{originalLanguage:'sa',citation:'Arthashastra 1.19.34, tr. R. Shamasastry (1915)',reviewed:false,rights:'public_domain'},
 }),
 quote({
  id:'bolivar-perfect-government',authorId:'bolivar',
  source:'Angostura Address, 15 February 1819',
  sourceTitle:localized('Angostura Address','Angostura Söylevi','Discurso de Angostura','安戈斯图拉演说','Ангостурская речь'),
  year:'1819',category:'statecraft',also:['liberty'],
  text:localized(
   'The most perfect system of government is the one that produces the greatest possible happiness, the greatest social security and the greatest political stability.',
   'En kusursuz yönetim sistemi, mümkün olan en büyük mutluluğu, en büyük toplumsal güvenliği ve en büyük siyasi istikrarı sağlayandır.',
   'El sistema de gobierno más perfecto es aquel que produce mayor suma de felicidad posible, mayor suma de seguridad social y mayor suma de estabilidad política.',
   '最完美的政体，是能够带来最大可能的幸福、最大的社会安全和最大的政治稳定的政体。',
   'Самая совершенная система правления та, что приносит наибольшее возможное счастье, наибольшую общественную безопасность и наибольшую политическую стабильность.'),
  provenance:{originalLanguage:'es',citation:'Discurso ante el Congreso de Angostura, 15 February 1819',reviewed:false,rights:'public_domain'},
 }),
 quote({
  id:'laozi-small-fish',authorId:'laozi',
  source:'Tao Te Ching, 60',
  sourceTitle:localized('Tao Te Ching','Tao Te Ching','Tao Te King','道德经·第六十章','Дао дэ цзин'),
  year:'c. 4th century BCE',category:'statecraft',also:['wisdom'],
  text:localized(
   'Governing a great state is like cooking a small fish.',
   'Büyük bir devleti yönetmek, küçük bir balık pişirmeye benzer.',
   'Gobernar un gran Estado es como cocinar un pez pequeño.',
   '治大国若烹小鲜。',
   'Управлять большим государством — что готовить маленькую рыбку.'),
  provenance:{originalLanguage:'zh',citation:'Daodejing, ch. 60',reviewed:false,rights:'public_domain',note:'Meaning: govern with a light hand; constant stirring breaks the fish apart.'},
 }),
 quote({
  id:'franklin-liberty-safety',authorId:'franklin',
  source:'Reply to the Governor, Pennsylvania Assembly, 11 November 1755',
  sourceTitle:localized('Reply to the Governor','Valiye Yanıt','Respuesta al gobernador','致总督的答复','Ответ губернатору'),
  year:'1755',category:'liberty',
  text:localized(
   'Those who would give up essential Liberty, to purchase a little temporary Safety, deserve neither Liberty nor Safety.',
   'Biraz geçici güvenlik satın almak için temel özgürlükten vazgeçenler ne özgürlüğü ne de güvenliği hak eder.',
   'Quienes renunciarían a una libertad esencial para comprar un poco de seguridad temporal no merecen ni libertad ni seguridad.',
   '那些为换取一点暂时的安全而放弃基本自由的人，既不配享有自由，也不配享有安全。',
   'Те, кто готов поступиться основополагающей свободой ради толики временной безопасности, не заслуживают ни свободы, ни безопасности.'),
  provenance:{originalLanguage:'en',citation:'Pennsylvania Assembly, Reply to the Governor, 11 November 1755 (drafted by Franklin)',reviewed:false,rights:'public_domain'},
 }),
 quote({
  id:'montesquieu-commerce',authorId:'montesquieu',
  source:'The Spirit of the Laws, XX.2',
  sourceTitle:localized('The Spirit of the Laws','Kanunların Ruhu','Del espíritu de las leyes','论法的精神','О духе законов'),
  year:'1748',category:'economics',also:['diplomacy'],
  text:localized(
   'The natural effect of commerce is to bring about peace.',
   'Ticaretin doğal sonucu, barışa yöneltmesidir.',
   'El efecto natural del comercio es conducir a la paz.',
   '贸易的自然效果是导向和平。',
   'Естественное действие торговли — склонять к миру.'),
  provenance:{originalLanguage:'fr',citation:'De l\'esprit des lois, XX.2: "L\'effet naturel du commerce est de porter à la paix."',reviewed:false,rights:'public_domain'},
 }),
 quote({
  id:'stolypin-twenty-years',authorId:'stolypin',
  source:'Interview with the newspaper Volga, 1909',
  sourceTitle:localized('Interview, 1909','Röportaj, 1909','Entrevista, 1909','1909年访谈','Интервью, 1909'),
  year:'1909',category:'statecraft',also:['economics'],
  text:localized(
   'Give the state twenty years of peace, at home and abroad, and you will not recognize present-day Russia.',
   'Devlete içte ve dışta yirmi yıl huzur verin, bugünkü Rusya\'yı tanıyamazsınız.',
   'Den al Estado veinte años de paz, interior y exterior, y no reconocerán la Rusia de hoy.',
   '给国家二十年内外安宁，你们将认不出今天的俄国。',
   'Дайте государству двадцать лет покоя, внутреннего и внешнего, и вы не узнаете нынешней России.'),
  provenance:{originalLanguage:'ru',citation:'Stolypin, interview in the newspaper Volga, 1909',reviewed:false,rights:'short_quotation',note:'Widely quoted; the exact venue and wording are the least certain of the corpus and need a source check before release.'},
 }),
 quote({
  id:'washington-good-faith',authorId:'washington',
  source:'Farewell Address, 1796',
  sourceTitle:localized('Farewell Address','Veda Söylevi','Discurso de despedida','告别演说','Прощальное обращение'),
  year:'1796',category:'diplomacy',
  text:localized(
   'Observe good faith and justice towards all nations; cultivate peace and harmony with all.',
   'Bütün milletlere karşı iyi niyet ve adaleti gözetin; herkesle barışı ve uyumu geliştirin.',
   'Observad buena fe y justicia hacia todas las naciones; cultivad la paz y la armonía con todas.',
   '对所有国家恪守诚信与正义，与所有国家培育和平与和睦。',
   'Соблюдайте добросовестность и справедливость в отношении всех народов; развивайте мир и согласие со всеми.'),
  provenance:{originalLanguage:'en',citation:'Washington\'s Farewell Address, published 19 September 1796',reviewed:false,rights:'public_domain'},
 }),
];

/** Localized name, role and era of a quote's author. */
export function quoteAuthor(entry:LeadershipQuote):LeadershipAuthor {
 return LEADERSHIP_AUTHORS[entry.authorId];
}

export function pickLeadershipQuote(roll:number):LeadershipQuote {
 const bounded=Number.isFinite(roll)?Math.max(0,Math.min(1,roll)):0;
 return LEADERSHIP_QUOTES[Math.min(LEADERSHIP_QUOTES.length-1,Math.floor(bounded*LEADERSHIP_QUOTES.length))];
}

/**
 * Presentation-only randomness; avoid an immediate repeat across wizard openings.
 * The roll comes from the caller. The context defaults to the setup wizard, which favours statecraft and liberty.
 */
export function nextLeadershipQuote(roll:number,previousId?:string|null,context:QuoteContext={screen:'setup'}):LeadershipQuote {
 return selectLeadershipQuote(LEADERSHIP_QUOTES,context,roll,previousId?[previousId]:[]);
}
