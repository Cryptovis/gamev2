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
 'Create profile':['Profil oluştur','Crear perfil','创建档案','Создать профиль'],
 'Account':['Hesap','Cuenta','账户','Аккаунт'],
 'Playing as guest':['Misafir olarak oynuyorsunuz','Jugando como invitado','以访客身份游戏','Гостевой режим'],
 'Sign out':['Çıkış yap','Cerrar sesión','退出登录','Выйти'],
 'Saves are stored per profile on this device':['Kayıtlar bu cihazda profil bazında saklanır','Las partidas se guardan por perfil en este dispositivo','存档按档案保存在本设备上','Сохранения хранятся отдельно для каждого профиля на этом устройстве'],
 'Choose a nation and begin':['Bir ulus seç ve başla','Elige una nación y empieza','选择国家并开始','Выберите государство и начните'],
 'Replay defining moments in history':['Tarihin belirleyici anlarını yeniden oyna','Revive los momentos decisivos de la historia','重温历史上的决定性时刻','Переиграйте судьбоносные моменты истории'],
 'Your profile, sign-in and saves':['Profilin, girişin ve kayıtların','Tu perfil, acceso y partidas','你的档案、登录与存档','Ваш профиль, вход и сохранения'],
 'Hydrating simulation and save state…':['Simülasyon ve kayıt durumu yükleniyor…','Cargando la simulación y el estado guardado…','正在载入模拟与存档状态…','Загрузка симуляции и состояния сохранения…'],
 'Pre-decoding vector graphics…':['Vektör grafikler önceden çözülüyor…','Decodificando gráficos vectoriales…','正在预解码矢量图形…','Предварительная обработка векторной графики…'],
 'Verifying intelligence indexes and dictionaries…':['İstihbarat dizinleri ve sözlükler doğrulanıyor…','Verificando índices de inteligencia y diccionarios…','正在校验情报索引与词典…','Проверка разведывательных индексов и словарей…'],
 'Preparing executive workspace and audio…':['Yürütme çalışma alanı ve ses hazırlanıyor…','Preparando el espacio ejecutivo y el audio…','正在准备执行工作区与音频…','Подготовка рабочего пространства и звука…'],
 'Handing over command…':['Komuta devrediliyor…','Entregando el mando…','正在移交指挥权…','Передача командования…'],
 'Loading progress':['Yükleme ilerlemesi','Progreso de carga','加载进度','Ход загрузки'],
 // Hotfix 1.5: setup nation identity chips and the arms transfer subheader.
 'Sovereign Stance':['Egemen Duruş','Postura Soberana','主权立场','Суверенная Позиция'],
 'Dominant Faith':['Baskın İnanç','Fe Dominante','主要信仰','Преобладающая Вера'],
 'Manage sovereign military hardware aid, defense transfers and arms embargo compliance.':['Egemen askeri donanım yardımını, savunma devirlerini ve silah ambargosuna uyumu yönetin.','Gestione la ayuda soberana de material militar, las transferencias de defensa y el cumplimiento de los embargos de armas.','管理主权军事装备援助、国防转让以及对武器禁运的遵守。','Управляйте суверенной помощью военной техникой, оборонными поставками и соблюдением оружейных эмбарго.'],
};

/**
 * English strings the landing UI also uses that already have reviewed rows in older catalogs. They are not redefined
 * here: a second definition would either trip the shadowed-key test or silently change wording elsewhere in the game.
 */
export const LANDING_REUSED_KEYS:readonly string[]=['New campaign','Settings','Language','Sign in','Close','Day'];
