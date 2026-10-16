import {localized,type LocalizedText,type QuoteEra} from './leadershipTypes';

export type LeadershipAuthorId=
  |'marcus_aurelius'|'sun_tzu'|'ataturk'|'lincoln'|'churchill'|'machiavelli'
  |'bismarck'|'ashoka'|'pericles'|'confucius'|'de_gaulle'|'mandela'
  |'adam_smith'|'ibn_khaldun'|'thucydides'|'clausewitz'|'kautilya'|'bolivar'
  |'laozi'|'franklin'|'montesquieu'|'stolypin'|'washington';

export interface LeadershipAuthor {
  id:LeadershipAuthorId;
  /** Name as written in each language (Konfüçyüs, 孔子, Конфуций). */
  name:LocalizedText;
  /** Title or role shown under the name, e.g. "Roman Emperor & Stoic Philosopher". */
  role:LocalizedText;
  era:QuoteEra;
  /** Language-neutral display span, e.g. "121–180" or "c. 544–496 BCE". */
  lifespan:string;
}

const author=(id:LeadershipAuthorId,era:QuoteEra,lifespan:string,name:LocalizedText,role:LocalizedText):LeadershipAuthor=>({id,era,lifespan,name,role});
/** For names spelled identically in en, tr and es; only the zh and ru forms differ. */
const sameName=(name:string,zh:string,ru:string)=>localized(name,name,name,zh,ru);

export const LEADERSHIP_AUTHORS:Readonly<Record<LeadershipAuthorId,LeadershipAuthor>>={
  marcus_aurelius:author('marcus_aurelius','antiquity','121–180',
    localized('Marcus Aurelius','Marcus Aurelius','Marco Aurelio','马可·奥勒留','Марк Аврелий'),
    localized('Roman Emperor & Stoic Philosopher','Roma İmparatoru ve Stoacı Filozof','Emperador romano y filósofo estoico','罗马皇帝、斯多葛派哲学家','Римский император и философ-стоик')),
  sun_tzu:author('sun_tzu','antiquity','c. 544–496 BCE',
    localized('Sun Tzu','Sun Tzu','Sun Tzu','孙子','Сунь-цзы'),
    localized('General & Military Strategist','General ve Askerî Strateji Ustası','General y estratega militar','春秋时期军事家','Полководец и военный стратег')),
  ataturk:author('ataturk','modern','1881–1938',
    sameName('Mustafa Kemal Atatürk','穆斯塔法·凯末尔·阿塔图尔克','Мустафа Кемаль Ататюрк'),
    localized('Founder of the Republic of Türkiye','Türkiye Cumhuriyeti\'nin Kurucusu','Fundador de la República de Turquía','土耳其共和国缔造者','Основатель Турецкой Республики')),
  lincoln:author('lincoln','modern','1809–1865',
    sameName('Abraham Lincoln','亚伯拉罕·林肯','Авраам Линкольн'),
    localized('16th President of the United States','ABD\'nin 16. Başkanı','16.º presidente de los Estados Unidos','美国第十六任总统','16-й президент США')),
  churchill:author('churchill','contemporary','1874–1965',
    sameName('Winston Churchill','温斯顿·丘吉尔','Уинстон Черчилль'),
    localized('Prime Minister of the United Kingdom','Birleşik Krallık Başbakanı','Primer ministro del Reino Unido','英国首相','Премьер-министр Великобритании')),
  machiavelli:author('machiavelli','early_modern','1469–1527',
    localized('Niccolò Machiavelli','Niccolò Machiavelli','Nicolás Maquiavelo','尼科洛·马基雅维利','Никколо Макиавелли'),
    localized('Florentine Diplomat & Political Philosopher','Floransalı Diplomat ve Siyaset Felsefecisi','Diplomático florentino y filósofo político','佛罗伦萨外交家、政治哲学家','Флорентийский дипломат и политический мыслитель')),
  bismarck:author('bismarck','modern','1815–1898',
    sameName('Otto von Bismarck','奥托·冯·俾斯麦','Отто фон Бисмарк'),
    localized('Chancellor of the German Empire','Alman İmparatorluğu Şansölyesi','Canciller del Imperio alemán','德意志帝国宰相','Канцлер Германской империи')),
  ashoka:author('ashoka','antiquity','c. 304–232 BCE',
    localized('Ashoka','Ashoka','Asoka','阿育王','Ашока'),
    localized('Emperor of the Maurya Empire','Maurya İmparatoru','Emperador del Imperio maurya','孔雀王朝君主','Император державы Маурьев')),
  pericles:author('pericles','antiquity','c. 495–429 BCE',
    localized('Pericles','Perikles','Pericles','伯里克利','Перикл'),
    localized('Athenian Statesman & General','Atinalı Devlet Adamı ve Komutan','Estadista y general ateniense','雅典政治家、将军','Афинский государственный деятель и стратег')),
  confucius:author('confucius','antiquity','551–479 BCE',
    localized('Confucius','Konfüçyüs','Confucio','孔子','Конфуций'),
    localized('Philosopher & Teacher of Statecraft','Filozof ve Devlet Yönetimi Öğretmeni','Filósofo y maestro del arte de gobernar','思想家、教育家','Философ и учитель искусства управления')),
  de_gaulle:author('de_gaulle','contemporary','1890–1970',
    sameName('Charles de Gaulle','夏尔·戴高乐','Шарль де Голль'),
    localized('Leader of Free France & President of the Republic','Özgür Fransa Lideri ve Cumhurbaşkanı','Líder de la Francia Libre y presidente de la República','自由法国领袖、法兰西共和国总统','Лидер «Свободной Франции» и президент республики')),
  mandela:author('mandela','contemporary','1918–2013',
    sameName('Nelson Mandela','纳尔逊·曼德拉','Нельсон Мандела'),
    localized('President of South Africa','Güney Afrika Cumhurbaşkanı','Presidente de Sudáfrica','南非总统','Президент ЮАР')),
  adam_smith:author('adam_smith','early_modern','1723–1790',
    sameName('Adam Smith','亚当·斯密','Адам Смит'),
    localized('Political Economist & Moral Philosopher','Ekonomi Politikçi ve Ahlak Filozofu','Economista político y filósofo moral','政治经济学家、道德哲学家','Политэконом и философ-моралист')),
  ibn_khaldun:author('ibn_khaldun','medieval','1332–1406',
    localized('Ibn Khaldun','İbn Haldun','Ibn Jaldún','伊本·赫勒敦','Ибн Хальдун'),
    localized('Historian & Statesman of the Maghreb','Mağripli Tarihçi ve Devlet Adamı','Historiador y estadista magrebí','马格里布历史学家、政治家','Историк и государственный деятель Магриба')),
  thucydides:author('thucydides','antiquity','c. 460–400 BCE',
    localized('Thucydides','Thukydides','Tucídides','修昔底德','Фукидид'),
    localized('Athenian General & Historian','Atinalı Komutan ve Tarihçi','General e historiador ateniense','雅典将军、历史学家','Афинский стратег и историк')),
  clausewitz:author('clausewitz','modern','1780–1831',
    sameName('Carl von Clausewitz','卡尔·冯·克劳塞维茨','Карл фон Клаузевиц'),
    localized('Prussian General & Military Theorist','Prusyalı General ve Askerî Kuramcı','General prusiano y teórico militar','普鲁士将军、军事理论家','Прусский генерал и военный теоретик')),
  kautilya:author('kautilya','antiquity','c. 4th century BCE',
    localized('Kautilya','Kautilya','Kautilya','考底利耶','Каутилья'),
    localized('Mauryan Chancellor & Political Theorist','Maurya Veziri ve Siyaset Kuramcısı','Canciller maurya y teórico político','孔雀王朝谋臣、政治理论家','Советник Маурьев и теоретик государства')),
  bolivar:author('bolivar','modern','1783–1830',
    sameName('Simón Bolívar','西蒙·玻利瓦尔','Симон Боливар'),
    localized('Liberator of South America','Güney Amerika\'nın Kurtarıcısı','Libertador de Sudamérica','南美解放者','Освободитель Южной Америки')),
  laozi:author('laozi','antiquity','c. 6th century BCE',
    localized('Laozi','Lao Tzu','Lao-Tse','老子','Лао-цзы'),
    localized('Daoist Philosopher','Taocu Filozof','Filósofo taoísta','道家哲学家','Философ-даос')),
  franklin:author('franklin','early_modern','1706–1790',
    sameName('Benjamin Franklin','本杰明·富兰克林','Бенджамин Франклин'),
    localized('American Statesman & Diplomat','Amerikalı Devlet Adamı ve Diplomat','Estadista y diplomático estadounidense','美国政治家、外交家','Американский государственный деятель и дипломат')),
  montesquieu:author('montesquieu','early_modern','1689–1755',
    sameName('Montesquieu','孟德斯鸠','Монтескьё'),
    localized('Political Philosopher of the Enlightenment','Aydınlanma Çağı Siyaset Felsefecisi','Filósofo político de la Ilustración','启蒙时代政治哲学家','Политический философ эпохи Просвещения')),
  stolypin:author('stolypin','modern','1862–1911',
    localized('Pyotr Stolypin','Pyotr Stolıpin','Piotr Stolypin','彼得·斯托雷平','Пётр Столыпин'),
    localized('Prime Minister of the Russian Empire','Rus İmparatorluğu Başbakanı','Primer ministro del Imperio ruso','俄罗斯帝国大臣会议主席','Председатель Совета министров Российской империи')),
  washington:author('washington','early_modern','1732–1799',
    sameName('George Washington','乔治·华盛顿','Джордж Вашингтон'),
    localized('1st President of the United States','ABD\'nin 1. Başkanı','Primer presidente de los Estados Unidos','美国第一任总统','1-й президент США')),
};
