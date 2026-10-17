import type {GameLanguage} from '../../domain/game';

/**
 * Tab and status-box wording for National Command. Written out per language because the shared catalogs hold wrong rows for
 * several of these words (for example TREASURY reads as "treaty" in Chinese and "sobriety" in Russian, and Session reads
 * as a legislative session in Spanish and Russian).
 */
export type MenuTab='profile'|'history'|'settings'|'audio'|'session';
export interface MenuWording {tabs:Record<MenuTab,string>;day:string;speed:string;treasury:string;gdp:string;paused:string;}

export const MENU_WORDING:Record<GameLanguage,MenuWording>={
  en:{tabs:{profile:'Profile',history:'Campaign',settings:'Settings',audio:'Sound',session:'Session'},day:'Days in Office',speed:'Simulation Speed',treasury:'Treasury',gdp:'GDP',paused:'Paused'},
  tr:{tabs:{profile:'Profil',history:'Kampanya',settings:'Ayarlar',audio:'Ses',session:'Oturum'},day:'Görevde Geçen Gün',speed:'Simülasyon Hızı',treasury:'Hazine',gdp:'GSYH',paused:'Duraklatıldı'},
  es:{tabs:{profile:'Perfil',history:'Campaña',settings:'Ajustes',audio:'Sonido',session:'Sesión'},day:'Días en el Cargo',speed:'Velocidad de Simulación',treasury:'Tesoro',gdp:'PIB',paused:'En pausa'},
  zh:{tabs:{profile:'档案',history:'战役',settings:'设置',audio:'声音',session:'会话'},day:'执政天数',speed:'模拟速度',treasury:'国库',gdp:'国内生产总值',paused:'已暂停'},
  ru:{tabs:{profile:'Профиль',history:'Кампания',settings:'Настройки',audio:'Звук',session:'Сессия'},day:'Дней в Должности',speed:'Скорость симуляции',treasury:'Казна',gdp:'ВВП',paused:'Пауза'},
};
