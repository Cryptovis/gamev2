// 0.89 track I: diplomatic jets and cargo aircraft on the world map.
// Order: [tr, es, zh, ru]. Keys with {n} are matched as templates by translateText.
export const UI_CATALOG_089_I: Record<string, string[]> = {
  // ── Flight labels (Flight.label) ──
  "Diplomatic mission": ["Diplomatik heyet", "Misión diplomática", "外交使团", "Дипломатическая миссия"],
  "Embassy proposal": ["Büyükelçilik teklifi", "Propuesta de embajada", "设立使馆提议", "Предложение об открытии посольства"],
  "Trade pact proposal": ["Ticaret anlaşması teklifi", "Propuesta de pacto comercial", "贸易协定提议", "Предложение торгового пакта"],
  "Embassy delegation": ["Büyükelçilik heyeti", "Delegación de embajada", "使馆代表团", "Посольская делегация"],
  "Trade pact delegation": ["Ticaret anlaşması heyeti", "Delegación del pacto comercial", "贸易协定代表团", "Делегация по торговому пакту"],
  "Non-aggression talks": ["Saldırmazlık görüşmeleri", "Negociaciones de no agresión", "互不侵犯会谈", "Переговоры о ненападении"],
  "Alliance summit": ["İttifak zirvesi", "Cumbre de alianza", "同盟峰会", "Союзный саммит"],
  "Bloc summit": ["Blok zirvesi", "Cumbre del bloque", "集团峰会", "Саммит блока"],
  "Treasury grant": ["Hazine hibesi", "Subvención del tesoro", "财政赠款", "Казначейский грант"],
  "Incoming proposal": ["Gelen teklif", "Propuesta entrante", "收到的提议", "Входящее предложение"],
  "Trade cargo": ["Ticari kargo", "Carga comercial", "贸易货运", "Торговый груз"],
  "Supply contract cargo": ["Tedarik sözleşmesi kargosu", "Carga del contrato de suministro", "供应合同货运", "Груз по контракту поставок"],
  "Exchange purchase": ["Borsa alımı", "Compra en la bolsa", "交易所采购", "Покупка на бирже"],
  "Aid shipment": ["Yardım sevkiyatı", "Envío de ayuda", "援助货运", "Гуманитарная поставка"],

  // ── Map layer and "In transit" list ──
  "In transit": ["Yolda", "En tránsito", "运输途中", "В пути"],
  "Flights in transit": ["Yoldaki uçuşlar", "Vuelos en tránsito", "飞行中的航班", "Рейсы в пути"],
  "Arrives today": ["Bugün varır", "Llega hoy", "今日抵达", "Прибывает сегодня"],
  "Arrives tomorrow": ["Yarın varır", "Llega mañana", "明日抵达", "Прибывает завтра"],
  "Arrives in {0} days": ["{0} gün içinde varır", "Llega en {0} días", "{0} 天后抵达", "Прибудет через {0} дн."],
  "Arrives day {0}": ["Varış: {0}. gün", "Llegada: día {0}", "第 {0} 天抵达", "Прибытие: день {0}"],

  // ── Diplomatic mission dialog ──
  "Delegation arrives in": ["Heyetin varışı", "La delegación llega en", "代表团抵达时间", "Делегация прибудет через"],
  "The goodwill applies when the delegation lands.": ["İyi niyet etkisi heyet indiğinde uygulanır.", "La buena voluntad se aplica cuando aterriza la delegación.", "代表团落地后，好感度才会生效。", "Эффект доброй воли наступает после прибытия делегации."],

  // ── News lines ──
  "DIPLOMACY // Delegation departed for {0}: relations +{1} on arrival (day {2}).": ["DİPLOMASİ // Heyet {0} için yola çıktı: varışta ilişkiler +{1} ({2}. gün).", "DIPLOMACIA // La delegación partió hacia {0}: relaciones +{1} a su llegada (día {2}).", "外交 // 代表团已启程前往{0}：抵达后关系 +{1}（第 {2} 天）。", "ДИПЛОМАТИЯ // Делегация вылетела в {0}: отношения +{1} по прибытии (день {2})."],
  "DIPLOMACY // Delegation arrived in {0}: relations +{1}.": ["DİPLOMASİ // Heyet {0} ülkesine ulaştı: ilişkiler +{1}.", "DIPLOMACIA // La delegación llegó a {0}: relaciones +{1}.", "外交 // 代表团已抵达{0}：关系 +{1}。", "ДИПЛОМАТИЯ // Делегация прибыла в {0}: отношения +{1}."],
};
