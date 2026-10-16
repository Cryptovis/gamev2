import type {GameLanguage} from '../domain/game';

export interface ReleaseNote {
  /** Package version this entry describes, without a leading "v". */
  version:string;
  /** ISO date, only when the release has one on record. Omitted rather than guessed. */
  date?:string;
  highlights:Record<GameLanguage,readonly string[]>;
}

/** Newest first. Static copy: no network, no build step. Every entry needs the same number of highlights in all five languages. */
export const RELEASE_NOTES:readonly ReleaseNote[]=[
  {
    version:'1.0.0',
    highlights:{
      en:[
        'New landing screen: play now without an account, or continue your latest campaign from one card.',
        'Leadership wisdom: quotes from leaders and thinkers, shown in your language while you prepare a campaign and while the game loads.',
        'International Affairs hub: organization rosters and standing, resolutions and voting, financial facilities, commodities and trade, and sanctions in one workspace.',
        'Light and Dark themes on every new screen, in all five languages.',
      ],
      tr:[
        'Yeni açılış ekranı: hesap açmadan hemen oynayın ya da son kampanyanıza tek karttan devam edin.',
        'Liderlik sözleri: lider ve düşünürlerden alıntılar, kampanyayı hazırlarken ve oyun yüklenirken kendi dilinizde gösterilir.',
        'Uluslararası İlişkiler merkezi: kuruluş üyelikleri ve konum, kararlar ve oylama, mali imkânlar, emtia ve ticaret ile yaptırımlar tek çalışma alanında.',
        'Her yeni ekranda Açık ve Koyu tema, beş dilin tamamında.',
      ],
      es:[
        'Nueva pantalla de inicio: juega ahora sin cuenta o continúa tu última campaña desde una sola tarjeta.',
        'Sabiduría de líderes: citas de líderes y pensadores, en tu idioma, mientras preparas la campaña y mientras carga el juego.',
        'Centro de Asuntos Internacionales: miembros y posición de las organizaciones, resoluciones y votaciones, instrumentos financieros, materias primas y comercio, y sanciones en un solo espacio de trabajo.',
        'Temas claro y oscuro en cada pantalla nueva, en los cinco idiomas.',
      ],
      zh:[
        '全新启动画面：无需账户即可立即开始，或通过一张卡片继续最近的战役。',
        '领袖智慧：在准备战役和游戏加载时，以你的语言展示各位领袖与思想家的名言。',
        '国际事务中心：在同一个工作区内查看组织成员与地位、决议与表决、金融工具、大宗商品与贸易以及制裁。',
        '每个新界面都支持浅色与深色主题，并提供五种语言。',
      ],
      ru:[
        'Новый стартовый экран: играйте сразу, без аккаунта, или продолжайте последнюю кампанию с одной карточки.',
        'Мудрость лидеров: цитаты лидеров и мыслителей на вашем языке во время подготовки кампании и загрузки игры.',
        'Центр международных отношений: состав и положение организаций, резолюции и голосования, финансовые механизмы, сырьё и торговля, а также санкции в одном рабочем пространстве.',
        'Светлая и тёмная темы на каждом новом экране, на всех пяти языках.',
      ],
    },
  },
];

/** The entries the modal shows: the newest few. */
export const latestReleaseNotes=(limit=3):readonly ReleaseNote[]=>RELEASE_NOTES.slice(0,Math.max(0,limit));
