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
 'Player Profile':['Oyuncu Profili','Perfil de Jugador','玩家档案','Профиль Игрока'],
 'This panel manages sovereign defense materiel transfers to bilateral partners and ensures compliance with multilateral arms embargoes.':['Bu panel, ikili ortaklara yapılan egemen savunma malzemesi devirlerini yönetir ve çok taraflı silah ambargolarına uyumu sağlar.','Este panel gestiona las transferencias soberanas de material de defensa a socios bilaterales y garantiza el cumplimiento de los embargos multilaterales de armas.','本面板管理向双边伙伴转让的主权国防物资，并确保遵守多边武器禁运。','Эта панель управляет суверенными поставками оборонных материалов двусторонним партнёрам и обеспечивает соблюдение многосторонних оружейных эмбарго.'],
 'Continue with Last Saved Campaign':['Son Kaydedilen Kampanyayla Devam Et','Continuar con la última campaña guardada','继续上次保存的战役','Продолжить последнюю сохранённую кампанию'],
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
 'Manage profile, cloud sync and saves':['Profili, bulut eşitlemeyi ve kayıtları yönetin','Gestiona el perfil, la sincronización en la nube y las partidas','管理档案、云同步和存档','Управляйте профилем, облачной синхронизацией и сохранениями'],
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
 // Hotfix 1.6
 'All rights reserved.':['Tüm hakları saklıdır.','Todos los derechos reservados.','保留所有权利。','Все права защищены.'],
 'Continue with Google':['Google ile devam et','Continuar con Google','使用 Google 继续','Продолжить через Google'],
 'Continue with Apple':['Apple ile devam et','Continuar con Apple','使用 Apple 继续','Продолжить через Apple'],
 'Continue with Facebook':['Facebook ile devam et','Continuar con Facebook','使用 Facebook 继续','Продолжить через Facebook'],
 'Or sign in with':['Veya şununla giriş yap','O inicia sesión con','或使用以下方式登录','Или войдите через'],
 'Intelligence Briefing':['İstihbarat Brifingi','Informe de Inteligencia','情报简报','Разведывательная Сводка'],
 'Target Nation':['Hedef Ülke','Nación Objetivo','目标国家','Целевая Страна'],
 'Operation Type':['Operasyon Türü','Tipo de Operación','行动类型','Тип Операции'],
 'Risk Level':['Risk Düzeyi','Nivel de Riesgo','风险等级','Уровень Риска'],
 'Estimated Intel Yield':['Tahmini İstihbarat Kazancı','Rendimiento Estimado de Inteligencia','预计情报收益','Ожидаемая Разведывательная Отдача'],
 'Budget Cost':['Bütçe Maliyeti','Costo Presupuestario','预算成本','Бюджетные Затраты'],
 'Low':['Düşük','Bajo','低','Низкий'],
 'Results arrive when the operation completes. Review them in the Executive Desk.':['Sonuçlar operasyon tamamlandığında gelir. Başkanlık Masası\'nda inceleyin.','Los resultados llegan cuando la operación termina. Revíselos en el Despacho presidencial.','行动完成后将送达结果，请在总统政务台查看。','Результаты поступят по завершении операции. Изучите их в Кабинете президента.'],
 'Relations score':['İlişki Puanı','Puntuación de Relaciones','关系评分','Оценка Отношений'],
 'Trade eligibility':['Ticaret Uygunluğu','Elegibilidad Comercial','贸易资格','Право на Торговлю'],
 'Acceptance chance':['Kabul İhtimali','Probabilidad de Aceptación','接受概率','Шанс Принятия'],
 'Eligible':['Uygun','Elegible','符合条件','Допущено'],
 'Points needed':['Gereken Puan','Puntos necesarios','所需点数','Нужно очков'],
};

/**
 * English strings the landing UI also uses that already have reviewed rows in older catalogs. They are not redefined
 * here: a second definition would either trip the shadowed-key test or silently change wording elsewhere in the game.
 */
export const LANDING_REUSED_KEYS:readonly string[]=['New campaign','Settings','Language','Sign in','Close','Day'];
