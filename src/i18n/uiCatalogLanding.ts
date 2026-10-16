/**
 * Phase 9.4 landing screen, utility dock, commander dossier and leadership wisdom widget: tr, es, zh, ru.
 * English keys are the canonical copy. Keys carry no {0} placeholders on purpose: a template key is matched against
 * every string in the game, so "Day {0}" or "Saved {0}" would rewrite unrelated text. The save card builds those labels
 * in code from the existing "Day" entry and Intl formatting.
 */
export const UI_CATALOG_LANDING:Record<string,[string,string,string,string]>={
 'Grand Strategy':['Büyük Strateji','Gran estrategia','大战略','Глобальная стратегия'],
 'Play now':['Hemen oyna','Jugar ahora','立即开始','Играть сейчас'],
 'No account needed':['Hesap gerekmez','No necesitas cuenta','无需账户','Аккаунт не нужен'],
 'Continue campaign':['Kampanyaya devam et','Continuar campaña','继续战役','Продолжить кампанию'],
 'Main menu':['Ana menü','Menú principal','主菜单','Главное меню'],
 'Historical scenarios':['Tarihî senaryolar','Escenarios históricos','历史剧本','Исторические сценарии'],
 'Coming soon':['Yakında','Próximamente','敬请期待','Скоро'],
 'Commander dossier':['Komutan dosyası','Expediente del comandante','指挥官档案','Досье командующего'],
 'Last campaign':['Son kampanya','Última campaña','最近的战役','Последняя кампания'],
 'Last saved':['Son kayıt','Último guardado','上次保存','Последнее сохранение'],
 'No saved campaign yet':['Henüz kayıtlı kampanya yok','Aún no hay campañas guardadas','暂无存档','Сохранённых кампаний пока нет'],
 'This save could not be read':['Bu kayıt okunamadı','No se pudo leer esta partida','无法读取该存档','Не удалось прочитать это сохранение'],
 'This save is from an incompatible version':['Bu kayıt uyumsuz bir sürüme ait','Esta partida es de una versión incompatible','该存档来自不兼容的版本','Это сохранение из несовместимой версии'],
 'The campaign could not be loaded':['Kampanya yüklenemedi','No se pudo cargar la campaña','无法加载战役','Не удалось загрузить кампанию'],
 'Switch to dark theme':['Koyu temaya geç','Cambiar a tema oscuro','切换到深色主题','Включить тёмную тему'],
 'Switch to light theme':['Açık temaya geç','Cambiar a tema claro','切换到浅色主题','Включить светлую тему'],
 'Mute ambience':['Ortam sesini kapat','Silenciar ambiente','关闭环境音','Выключить фоновый звук'],
 'Play ambience':['Ortam sesini aç','Activar ambiente','开启环境音','Включить фоновый звук'],
 'Ambience coming soon':['Ortam sesi yakında','Ambiente próximamente','环境音即将推出','Фоновый звук скоро появится'],
 'Release notes':['Sürüm notları','Notas de la versión','更新说明','Примечания к выпуску'],
 'Next quote':['Sonraki söz','Siguiente cita','下一条名言','Следующая цитата'],
 'Pause quotes':['Sözleri duraklat','Pausar citas','暂停轮播','Приостановить цитаты'],
 'Resume quotes':['Sözleri sürdür','Reanudar citas','继续轮播','Возобновить цитаты'],
 'Create profile':['Profil oluştur','Crear perfil','创建档案','Создать профиль'],
 'Account':['Hesap','Cuenta','账户','Аккаунт'],
 'Playing as guest':['Misafir olarak oynuyorsunuz','Jugando como invitado','以访客身份游戏','Гостевой режим'],
 'Sign out':['Çıkış yap','Cerrar sesión','退出登录','Выйти'],
 'Saves are stored per profile on this device':['Kayıtlar bu cihazda profil bazında saklanır','Las partidas se guardan por perfil en este dispositivo','存档按档案保存在本设备上','Сохранения хранятся отдельно для каждого профиля на этом устройстве'],
};

/**
 * English strings the landing UI also uses that already have reviewed rows in older catalogs. They are not redefined
 * here: a second definition would either trip the shadowed-key test or silently change wording elsewhere in the game.
 */
export const LANDING_REUSED_KEYS:readonly string[]=['New campaign','Settings','Language','Sign in','Close','Day'];
