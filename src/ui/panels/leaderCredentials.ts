import type {GameLanguage} from '../../domain/game';

/**
 * Wording for the read-only leader credentials in National Command. These labels are kept in one table (not in the shared
 * catalogs) because the shared catalog already maps the single word "Ideology" to a different term in Chinese.
 */
export interface CredentialWording {title:string;name:string;citizenship:string;birth:string;ideology:string;perk:string;notRecorded:string;permanent:string;}

export const CREDENTIAL_WORDING:Record<GameLanguage,CredentialWording>={
  en:{title:'Presidential Credentials',name:'Leader Name',citizenship:'Citizenship',birth:'Date of Birth',ideology:'Ideology',perk:'Starting Perk',notRecorded:'Not recorded',permanent:'Credentials are permanent once a campaign has started.'},
  tr:{title:'Başkanlık Kimlik Bilgileri',name:'Lider Adı',citizenship:'Vatandaşlık',birth:'Doğum Tarihi',ideology:'İdeoloji',perk:'Başlangıç Avantajı',notRecorded:'Kayıtlı değil',permanent:'Kampanya başladıktan sonra kimlik bilgileri değiştirilemez.'},
  es:{title:'Credenciales Presidenciales',name:'Nombre del Líder',citizenship:'Ciudadanía',birth:'Fecha de Nacimiento',ideology:'Ideología',perk:'Ventaja Inicial',notRecorded:'Sin registrar',permanent:'Las credenciales son permanentes una vez iniciada la campaña.'},
  zh:{title:'总统档案',name:'领袖姓名',citizenship:'国籍',birth:'出生日期',ideology:'意识形态',perk:'初始特质',notRecorded:'未记录',permanent:'战役开始后，档案信息不可更改。'},
  ru:{title:'Президентское досье',name:'Имя лидера',citizenship:'Гражданство',birth:'Дата рождения',ideology:'Идеология',perk:'Начальное преимущество',notRecorded:'Не указано',permanent:'После начала кампании данные нельзя изменить.'},
};
