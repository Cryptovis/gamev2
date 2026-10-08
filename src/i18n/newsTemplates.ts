// Keep stored messages language-independent. Translate at render time, including historical reports.
export const NEWS_TEMPLATES: Record<string, string> = {
 "DIPLOMACY // Trade pact with {0} at risk: relations below 20/100. Restore at least 20/100 within 14 days.":"DİPLOMASİ // {0} ile ticaret anlaşması riskte: ilişki 20/100 altında. 14 gün içinde en az 20/100 seviyesine çıkar.",
 "DIPLOMACY // Trade pact with {0} ended after 14 days below 20/100. Bilateral shipments cancelled.":"DİPLOMASİ // {0} ile ticaret anlaşması, 14 gün boyunca 20/100 altında kalınca sona erdi. İkili sevkiyatlar iptal edildi.",
 "Saved Day {0}":"Gün {0} kaydedildi",
 "Loaded Day {0}":"Gün {0} kaydı yüklendi",
 "RESEARCH // {0} started by {1}; estimated {2} days.":"ARAŞTIRMA // {1}, {0} projesini başlattı; tahmini süre {2} gün.",
 "RESEARCH // Project cancelled; {0} RP refunded.":"ARAŞTIRMA // Proje iptal edildi; {0} araştırma puanı iade edildi.",

  "ENERGY // Construction cancelled; ${0}B refunded.":
    "ENERJİ // İnşaat iptal edildi; {0} milyar $ iade edildi.",

  "REVIEW BUILD ${0}B": "YATIRIMI İNCELE {0} milyar $",
  "Research {0}": "Araştırma: {0}",
  "The Real President {0} online.": "The Real President {0} hazır.",
  "The Real President {0} — economy, people and diplomacy.":
    "The Real President {0} — ekonomi, halk ve diplomasi.",
  "STOCK {0}": "STOK {0}",

  "ADVISOR // Supplier can no longer support the proposed {0} contract.":
    "DANIŞMAN // Tedarikçi önerilen {0} sözleşmesini artık karşılayamıyor.",
  "ADVISOR // Trade pact with {0} could not be completed.":
    "DANIŞMAN // {0} ile ticaret anlaşması tamamlanamadı.",
  "AI TRADE // {0} secured {1} imports from {2}.":
    "ÜLKE TİCARETİ // {0}, {2} üzerinden {1} ithalatını güvenceye aldı.",
  "Autosave · Day {0}": "Otomatik kayıt · Gün {0}",
  "Autosaved Day {0}": "Gün {0} otomatik kaydedildi",
  "BIRTHDAY // {0}: {1}.": "DOĞUM GÜNÜ // {0}: {1}.",
  "BLOC // {0} formed with {1}.": "BLOK // {1} ile {0} kuruldu.",
  "BLOC // {0} joined {1}.": "BLOK // {0}, {1} oluşumuna katıldı.",
  "BLOC // {0} requires an alliance and +60 relations.":
    "BLOK // {0} için ittifak ve en az +60 ilişki gerekir.",
  "CABINET // {0} allocation set to {1}%.":
    "KABİNE // {0} payı %{1} olarak ayarlandı.",
  "CAMPAIGN LOST // The government lost the election with {0}% approval.":
    "YÖNETİM SONA ERDİ // Hükümet %{0} halk desteğiyle seçimi kaybetti.",
  "COUNCIL // {0} — {1}.": "KONSEY // {0} — {1}.",
  "Congratulations on {0}. A respectable result — {1} is aiming higher. Consider that a friendly challenge.":
    "{0} için tebrikler. Saygın bir sonuç; {1} daha yükseği hedefliyor. Bunu dostça bir meydan okuma sayın.",
  "Covert influence networks expanded inside {0}.":
    "{0} içindeki gizli etki ağları genişledi.",
  "DEFEAT // {0} offensive collapsed under battlefield exhaustion.":
    "YENİLGİ // {0} saldırısı cephedeki yıpranma nedeniyle çöktü.",
  "DIPLOMACY // Embargo {0} {1}.": "DİPLOMASİ // Ambargo {0} {1}.",
  "DIPLOMACY // Humanitarian {0} shipment sent to {1} ({2} units).":
    "DİPLOMASİ // {1} ülkesine insani {0} yardımı gönderildi ({2} birim).",
  "DIPLOMACY // No {0} package is available for aid.":
    "DİPLOMASİ // Yardım için yeterli {0} paketi yok.",
  "DIPLOMACY // Non-aggression pact signed with {0}.":
    "DİPLOMASİ // {0} ile saldırmazlık anlaşması imzalandı.",
  "DIPLOMACY // Relations with {0} improved (+{1}).":
    "DİPLOMASİ // {0} ile ilişkiler gelişti (+{1}).",
  "DIPLOMACY // Strategic alliance signed with {0}.":
    "DİPLOMASİ // {0} ile stratejik ittifak imzalandı.",
  "DIPLOMACY // Treasury gift requires {0}B.":
    "DİPLOMASİ // Mali yardım için {0} milyar $ gerekir.",
  "DIPLOMACY // {0} and {1} entered a strategic alliance.":
    "DİPLOMASİ // {0} ve {1} stratejik ittifak kurdu.",
  "DIPLOMACY // {0} and {1} opened reciprocal embassies.":
    "DİPLOMASİ // {0} ve {1} karşılıklı büyükelçilik açtı.",
  "DIPLOMACY // {0} and {1} signed a non-aggression pact.":
    "DİPLOMASİ // {0} ve {1} saldırmazlık anlaşması imzaladı.",
  "DIPLOMACY // {0} and {1} signed a trade pact.":
    "DİPLOMASİ // {0} ve {1} ticaret anlaşması imzaladı.",
  "DIPLOMACY // {0} cannot receive the proposed financial gesture.":
    "DİPLOMASİ // {0} önerilen mali yardımı alamıyor.",
  "DIPLOMACY // {0} requires relations of at least +25 for a non-aggression pact.":
    "DİPLOMASİ // {0} ile saldırmazlık anlaşması için en az +25 ilişki gerekir.",
  "DIPLOMACY // {0} requires relations of at least +60 for an alliance.":
    "DİPLOMASİ // {0} ile ittifak için en az +60 ilişki gerekir.",
  "DIPLOMACY // {0}B goodwill grant sent to {1}. Bilateral relations improved.":
    "DİPLOMASİ // {1} ülkesine {0} milyar $ yardım gönderildi. İkili ilişkiler gelişti.",
  "DIPLOMATIC OFFER // {0}: {1} proposal received.":
    "DİPLOMATİK TEKLİF // {0}: {1} teklifi alındı.",
  "Day {0}: monthly strategic review completed.":
    "Gün {0}: aylık stratejik değerlendirme tamamlandı.",
  "Day {0}: oil reserve warning — military readiness is at risk.":
    "Gün {0}: petrol rezervi uyarısı; askerî hazırlık risk altında.",
  "Day {0}: strategic food reserves are critically low.":
    "Gün {0}: stratejik gıda rezervleri kritik düzeyde.",
  "ELECTION // {0} government re-elected with {1}% approval.":
    "SEÇİM // {0} hükümeti %{1} halk desteğiyle yeniden seçildi.",
  "ELECTION // {0} independent government elected: {1}.":
    "SEÇİM // {0} bağımsız hükümeti seçildi: {1}.",
  "ENERGY // Grid coverage {0}%. Check fuel, operating funds and power capacity.":
    "ENERJİ // Elektrik ihtiyacının %{0} kadarı karşılanıyor. Yakıtı, işletme bütçesini ve kapasiteyi kontrol et.",
  "ENERGY // {0} commissioned; ready Day {1}.":
    "ENERJİ // {0} inşaatı başladı; tamamlanacağı gün: {1}.",
  "ENERGY // {0} is now operational.": "ENERJİ // {0} üretime başladı.",
  "EVENT RESOLVED // {0}": "OLAY SONUÇLANDI // {0}",
  "Fuel {0}d · Steel {1}d": "Yakıt {0} gün · Çelik {1} gün",
  "GOVERNANCE // Control of {0} transferred to {1}.":
    "YÖNETİM // {0} kontrolü {1} ülkesine devredildi.",
  "GOVERNANCE // {0} policy applied in {1}.":
    "YÖNETİM // {1} bölgesinde {0} politikası uygulandı.",
  "Happy birthday, {0}. Enjoy your celebrations; {1} intends to set the pace this year.":
    "Doğum gününüz kutlu olsun, {0}. Kutlamanın tadını çıkarın; bu yıl liderliği {1} hedefliyor.",
  "INDUSTRY // Construction cancelled; ${0}B refunded.":
    "SANAYİ // İnşaat iptal edildi; {0} milyar $ iade edildi.",
  "INDUSTRY // {0} commissioned; ready Day {1}.":
    "SANAYİ // {0} inşaatı başladı; tamamlanacağı gün: {1}.",
  "INFRASTRUCTURE // {0} investment completed in {1}. -${2}B.":
    "ALTYAPI // {1} ülkesinde {0} yatırımı tamamlandı. -{2} milyar $.",
  "INTEL // An identical operation is already active in {0}.":
    "İSTİHBARAT // {0} ülkesinde aynı operasyon zaten sürüyor.",
  "INTEL // Operation requires ${0}B.":
    "İSTİHBARAT // Operasyon için {0} milyar $ gerekir.",
  "INTEL // {0} launched against {1}.":
    "İSTİHBARAT // {1} hedefine karşı {0} başlatıldı.",
  "INVESTMENT // {0} construction started.": "YATIRIM // {0} inşaatı başladı.",
  "Industrial sabotage disrupted production in {0}.":
    "Sanayi sabotajı {0} üretimini aksattı.",
  "Influence fee: {0}": "Etki puanı bedeli: {0}",
  "Infrastructure {0}%": "Altyapı %{0}",
  "Intelligence picture on {0} improved.":
    "{0} hakkında istihbarat bilgisi gelişti.",
  "MARKET // {0} {1} {2}; ${3}B settled.":
    "PAZAR // {0} {1} {2}; {3} milyar $ ödendi.",
  "MARKET // {0}-year {1} supply contract agreed; monthly delivery {2} units.":
    "PAZAR // {0} yıllık {1} tedarik sözleşmesi yapıldı; aylık {2} birim.",
  "Manual Save · Day {0}": "Manuel kayıt · Gün {0}",
  "Mobilization ordered · {0} theatre · supply {1}%.":
    "Seferberlik emri verildi · {0} cephesi · tedarik %{1}.",
  "OUTREACH // {0}: {1}.": "FAALİYET // {0}: {1}.",
  "Operation compromised by {0} counter-intelligence.":
    "Operasyon {0} karşı istihbaratı tarafından açığa çıkarıldı.",
  "POLITICAL // Civil opposition campaign funded in {0}.":
    "SİYASET // {0} ülkesinde sivil muhalefet kampanyası finanse edildi.",
  "POLITICAL // {0} campaign {1}.": "SİYASET // {0} kampanyası {1}.",
  "PRODUCTION // {0} deployed to active forces in {1}.":
    "ÜRETİM // {0}, {1} ülkesindeki aktif kuvvetlere konuşlandırıldı.",
  "PROGRAM // {0} completed.": "PROGRAM // {0} tamamlandı.",
  "REBELLION // {0} regained independence.":
    "İSYAN // {0} bağımsızlığını yeniden kazandı.",
  "Road {0} · Rail {1} · Hubs {2}": "Yol {0} · Demiryolu {1} · Merkez {2}",
  "SUPPLY CONTRACT // {0} delivery {1}.":
    "TEDARİK SÖZLEŞMESİ // {0} teslimatı {1}.",
  "TECH // {0} unlocked by {1}.":
    "ARAŞTIRMA // {1}, {0} araştırmasını tamamladı.",
  "TRADE // A trade pact with {0} is required.":
    "TİCARET // {0} ile ticaret anlaşması gerekir.",
  "TRADE // Long-term {0} contract expired.":
    "TİCARET // Uzun vadeli {0} sözleşmesi sona erdi.",
  "TRADE // Monthly {0} delivery from {1}: {2} units for ${3}B.":
    "TİCARET // {1} üzerinden aylık {0} teslimatı: {3} milyar $ karşılığında {2} birim.",
  "TRADE // {0} contract cancelled.": "TİCARET // {0} sözleşmesi iptal edildi.",
  "TRADE // {0} has no safe export surplus of {1}. Seek another supplier or change the strategic situation.":
    "TİCARET // {0} ülkesinin güvenle ihraç edebileceği {1} fazlası yok. Başka bir tedarikçi bul veya stratejik koşulları değiştir.",
  "TRADE // {0} import contract signed with {1} at ${2}/unit.":
    "TİCARET // {1} ile birimi {2} $ üzerinden {0} ithalat sözleşmesi imzalandı.",
  "TRADE // {0} ↔ {1} {2} delivery delayed — supply or liquidity unavailable.":
    "TİCARET // {0} ↔ {1} {2} teslimatı gecikti; stok veya nakit yetersiz.",
  "TRADE // {0}-year {1} contract opened with {2}.":
    "TİCARET // {2} ile {0} yıllık {1} sözleşmesi açıldı.",
  "TRADE // {0}-year {1} contract signed with {2}; monthly delivery, locked unit price ${3}.":
    "TİCARET // {2} ile {0} yıllık {1} sözleşmesi imzalandı; aylık teslimat, sabit birim fiyat {3} $.",
  "TRAINING // {0} pilots enrolled.": "EĞİTİM // {0} pilot eğitime alındı.",
  "VICTORY // {0} is now under {1} control.":
    "ZAFER // {0} artık {1} kontrolünde.",
  "WAR // Auto assault {0}.": "SAVAŞ // Otomatik saldırı {0}.",
  "WAR // Conflict with {0} is already active.":
    "SAVAŞ // {0} ile çatışma zaten sürüyor.",
  "WAR // {0} declared war on {1}.":
    "SAVAŞ // {0}, {1} ülkesine savaş ilan etti.",
  "WORLD // {0} attacked despite a rejected resolution: condemnation, -10 reputation, -20 relations with opposing states and target allies.":
    "DÜNYA // {0} ret kararına rağmen saldırdı: kınama, -10 itibar, karşı çıkan devletler ve hedefin müttefikleriyle -20 ilişki.",
  "WORLD // {0} {1} vote: {2} yes / {3} no — {4}.":
    "DÜNYA // {0} {1} oylaması: {2} evet / {3} hayır — {4}.",
  "{0} Strategic Compact": "{0} Stratejik Birliği",
  "{0} assumed national command of {1}.": "{0}, {1} yönetimini devraldı.",
  "{0} command established.": "{0} yönetimi kuruldu.",
  "{0} congratulates your government on {1}. Your progress strengthens our confidence in this partnership.":
    "{0}, hükümetinizi {1} için tebrik ediyor. İlerlemeniz ortaklığımıza duyduğumuz güveni artırıyor.",
  "{0} days · ready D{1}": "{0} gün · tamamlanma günü {1}",
  "{0} factories · {1} refineries": "{0} fabrika · {1} rafineri",
  "{0} on {1}: {2}% support": "{1} konusunda {0}: %{2} destek",
  "{0} proposes a bilateral trade framework and lower-friction commercial access.":
    "{0}, ikili ticaret çerçevesi ve daha kolay ticari erişim öneriyor.",
  "{0} proposes opening reciprocal embassies to deepen political, commercial and diplomatic access.":
    "{0}, siyasi, ticari ve diplomatik erişimi geliştirmek için karşılıklı büyükelçilik açmayı öneriyor.",
  "{0} reserves are falling. {1} has export capacity and an active trade pact. Consider locking a long-term contract.":
    "{0} rezervleri azalıyor. {1} ihracat kapasitesine ve aktif ticaret anlaşmasına sahip. Uzun vadeli sözleşmeyi değerlendirebilirsin.",
  "{0} reserves are falling. {1} is the strongest friendly supplier candidate. A trade pact is required first.":
    "{0} rezervleri azalıyor. {1} en güçlü dost tedarikçi adayı. Önce ticaret anlaşması gerekir.",
  "{0} selected — live simulation data loaded.":
    "{0} seçildi; güncel simülasyon verileri yüklendi.",
  "{0} sends warm birthday wishes to {1}. May our partnership prosper in the year ahead.":
    "{0}, {1} için içten doğum günü dileklerini iletiyor. Ortaklığımızın yeni yılda güçlenmesini diliyoruz.",
  "{0} {1} assault: {2}{3} front | supply {4}%/{5}% | reserves {6}/{7} | air {8}{9} | losses {10} / {11}{12}":
    "{0} {1} saldırısı: {2}{3} cephe | tedarik %{4}/%{5} | rezervler {6}/{7} | hava {8}{9} | kayıplar {10} / {11}{12}",
  "{0} · demand {1}": "{0} · ihtiyaç {1}",
  "+{0} percentage points": "+{0} yüzde puan",
};
const patterns = Object.entries(NEWS_TEMPLATES).map(([en, tr]) => ({
  tr,
  pattern: new RegExp(
    "^" +
      en
        .split(/(\{\d+\})/)
        .map((part) =>
          /^\{\d+\}$/.test(part)
            ? "([\\s\\S]+?)"
            : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        )
        .join("") +
      "$",
  ),
}));
export function translateNews(text: string, slot: (value: string) => string) {
  for (const row of patterns) {
    const m = text.match(row.pattern);
    if (m)
      return row.tr.replace(/\{(\d+)\}/g, (_, n) => slot(m[Number(n) + 1]));
  }
  return null;
}
