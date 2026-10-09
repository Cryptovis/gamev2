# AlpyX 0.83.0-playtest.3 — Tam Denetim ve Yapılacaklar

> Güncel durum: [0.89 audit ilerleme kaydı](AUDIT-PROGRESS-089.md). Aşağıdaki bulgular 0.83 sürümünün tarihsel denetimidir.

Tarih: 2026-10-09 · Dal: `dev/tactical-command-083` (54ec9e7) · Hazırlayan: Claude

Kapsam: ~32.600 satır kaynak (`src/`), 44 birim testi, 4 e2e testi, `public/` (8,2 MB), CI, kilit dosyası.
Yöntem: kodun tamamı okundu. Motor, 203 ülkeyle 1–4 yıl boyunca arayüzsüz çalıştırıldı (zod taslağıyla, bun ile). Sayısal iddialar bu simülasyonlarla ölçüldü.
Etiketler: **P0** = kayıt kaybı/oyunu kilitleyen hata · **P1** = yanlış oyun davranışı · **P2** = cila/temizlik.

---

## Özet

Mimari sağlam: komut tabanlı motor, tohumlu RNG, şema sürümlü kayıtlar, CI kapısı. Simülasyonda `Math.random` yok, NaN taşan tick bulunmadı, kayıt dosyası 4 yılda yalnızca 1,43 → 1,49 MB büyüdü.

Ama oyun **hiçbir şey yapmadan kaybediliyor** ve dünya 1–2 yıl içinde çöküyor:

- Dünyada günlük petrol tüketimi 246,6, üretim 127,7. 1 yıl sonra 203 ülkenin 186'sı kalıcı petrol kıtlığında; her gün −0,08 onay.
- Çin ve Hindistan 24 günlük gıdayla başlıyor ve ~1 yılda onay 0, istikrar 0 oluyor.
- Altyapı bakımı GSYİH'ya göre ölçeklenmiyor. 1. yılın sonunda 145 ülkenin hazinesi < 1.
- Oyuncu (Türkiye, varsayılan) 1 yılda 56 → 36,8, 2 yılda ~0 onaya düşüyor ve gün 1461 seçimini %0 ile kaybediyor.
- Buna karşın %60 vergi + aktivite spam'i 98,5 onay, 100 istikrar getiriyor. Bu tek baskın strateji.

Savaşta da kritik bir açık var: **hiçbir şey yapmadan beklemek savaşı kazandırıyor** (21 turda, sıfır yakıtla).

---

## A. Kayıt ve oturum

| # | Öncelik | Yer | Sorun | Çözüm |
|---|---|---|---|---|
| A1 | P0 | `persistence/saveGame.ts:7-10`, `useAutosave.ts` | Hesap başına tek `autosave` yuvası var. Yeni kampanya, eskisini 5. günde siliyor. "Mevcut kampanyan silinmez" metni (`PlayerOptionsMenu.tsx:86`) yanlış. | Otomatik kayıt kimliği kampanya başına olsun (`campaignId`). |
| A2 | P0 | `saveGame.ts:9`, `migrations.ts:22` | Kayıt yazılmadan önce doğrulanmıyor. Bozuk durum son sağlam kaydın üstüne yazılabiliyor. Yüklemede hata sessizce yutuluyor. | `put` öncesi `canLoadSave`; başarısızsa yazma ve uyarı ver. |
| A3 | P1 | `autosaveCoordinator.ts:6` | İkinci efekt, ilkinin iptal edilmiş sözünü (promise) devralıyor. StrictMode'da her otomatik kayıt bir kez başarısız oluyor ("Autosave failed; retrying"). | Bekleyen sözü paylaşma; iptal kontrolünü çağırana taşı. |
| A4 | P2 | `useAutosave.ts:9` | Otomatik kayıt yalnızca 5 günde bir yapılıyor, sekme kapanınca kayıt yok. | `pagehide` sırasında yaz. |
| A5 | P1 | `store/gameStore.ts:190-256` | 6+ eylem (tesis aç/kapa, sözleşme iptali, uzun vadeli sözleşme, öğretici, mesaj okundu) durumu doğrudan yazıyor; komut yolunu atlıyor (ARCHITECTURE kural 1). | Her biri için `GameCommand` türü. |
| A6 | P1 | `migrations.ts:12-22` | Adım kaydı yok. v12 altı kayıtlar sessizce düşüyor; son dönüşüm yeniden doğrulanmıyor. | `{from: fn}` tablosu ve son doğrulama. |
| A7 | Düşük | `session/demoAccounts.ts` | PBKDF2-SHA256 210k (OWASP önerisi 600k). E-posta düz metin ve kullanılmıyor. Arayüz zaten "gerçek kimlik doğrulama değil" diyor, bu doğru. | 600k veya SHA-512; e-posta alanını kaldır. |

## B. Savaş ve taktik

| # | Öncelik | Yer | Sorun | Çözüm |
|---|---|---|---|---|
| B1 | P0 | `warfare.ts:34-35` | Savunanın yorgunluğu her tur, hiç saldırı olmasa da +1 artıyor. `dEx>=100` olunca zafer geliyor. Sadece bekleyerek 21 turda, 0 yakıtla zafer. | Taban yorgunluk yalnızca baskı altındaki tarafa yazılsın; saldırısız tur zafer veremesin. |
| B2 | P0 | `warfare.ts:34`, `tactical.ts:110` | Taktik modda cephe neredeyse önemsiz; savaşı tur sayısı (yorgunluk) bitiriyor. Yapay zekâ emirleri ile hiç oynamamak aynı sonucu veriyor. | Yorgunluğu kayba ve baskıya bağla. |
| B3 | P1 | `warfare.ts:35` | "%8 personel" yenilgi kuralı hiçbir zaman çalışmıyor (tur öncesi değere göre ölçülüyor); fiilen yalnızca sabit 5.000 sınırı işliyor. 49 ülke < 5.000 personelle başlıyor, ilk tur kazanılıyor. | Savaş başı personeli `WarState`'te sakla, ona göre ölç. |
| B4 | P1 | `commands.ts:178-191` | Zaten kontrol ettiğin veya ilhak edilmiş ülkeye savaş açılabiliyor. Arayüzden de erişilebilir. | Hedef kontrolü. |
| B5 | P1 | `tactical.ts:37-40,130` | Depoya ilk ulaşan sonsuza kadar tutuyor. Arazi yalnızca bir köşegende ve saldırana yarıyor. | HD War v2 ile simetrik yerleşim ve tohumlu arazi (bkz. E). |
| B6 | P2 | `commands.ts:193` | Klasik saldırı, ulusal karar beklerken de çalışıyor. | Ortak `combatAllowed` koruması. |
| B7 | P2 | `tactical.ts:103` | Iskalayan bombardıman da hedefe ceza veriyor. | Yalnızca isabeti say. |
| B8 | P2 | `warfare.ts` | Otomatik çözüm ile taktik farklı kurallar kullanıyor (5–9 tur vs 21–26 tur). | Otomatik çözümü `sideModifiers` üzerinden geçir. |
| B9 | P1 (gizli) | `commands.ts:243-245` | Yapay zekâ hiç savaş açmadığı için oyuncunun savunan olduğu yol test edilmemiş; savunan geri çekilince ülke el değiştiriyor ve `queueVictory` yok. | Yapay zekâ savaşlarıyla birlikte test et. |

## C. Ekonomi

| # | Öncelik | Yer | Sorun | Çözüm |
|---|---|---|---|---|
| C1 | P1 | `systems/resources.ts:27,52`, `worldCountryCatalog` | Petrol tüketimi üretimin 2 katı; 186/203 ülke kalıcı kıtlıkta. Kıtlık "stok ≤ 10" ile ölçülüyor, ülke büyüklüğünden bağımsız. | Kıtlığı "gün cinsinden rezerv" ile ölç, cezayı şiddete göre ölçekle, tüketimi dengele. |
| C2 | P1 | `resources.ts:25` | Çin ve Hindistan 1 yılda açlıktan çöküyor (ihracat tavanı 5,5/gün yetmiyor). | Gıda üretimini nüfusa ölçekle. |
| C3 | P1 | `infrastructure.ts:80-115` | Bakım GSYİH'dan bağımsız; 139 ülkenin günlük fazlasını aşıyor (mikro devletlerde 28 kat). | Bakımı GSYİH'ya ölçekle. |
| C4 | P1 | `politics.ts:15`, `economy.ts:19-36` | Vergi büyümeyi etkilemiyor, borcun faizi yok, aktiviteler sınırsız tekrar ediliyor. %60 vergi + spam baskın strateji. | Vergi sürtünmesi, azalan getiri, borç faizi. |
| C5 | P1 | `sovereignCredit.ts:311-332` | Temerrütte teminat olarak önce gıda ve petrol alınıyor (%65 değerle); ülke açlığa düşüyor. | Gıda ve petrolü koru, önce sanayi malı al. |
| C6 | P1 | `commands.ts:100-103` | `setTaxRate` NaN kabul ediyor; NaN hazineye yayılıyor ve kayıt doğrulamayı geçemiyor. | Komut sınırında `Number.isFinite`. |
| C7 | P1 | `commands.ts:261` | `changed` karşılaştırması `industrialContracts`/`industrialEconomy`'yi görmüyor; uzun vadeli sipariş "unavailable" dönüyor ve tekrarlanabiliyor. | Karşılaştırmaya ekle. |
| C8 | P1 | `industrialEconomy.ts:46-75` | Her tesis adımı 203 ülkelik haritayı yeniden kopyalıyor: tick'in 85 ms'sinin 51 ms'si. | Ülke başına taslak, tek yazma. |
| C9 | P2 | `livingEconomy.ts:307` | Haftalık yapay zekâ alımı her ilan için tüm dünyayı yeniden hesaplıyor (160–245 ms sıçramalar). | Fiyatı çağrı başına bir kez hesapla. |
| C10 | P1 | `industrialCatalog.ts` vs `trade.ts:6` | İki fiyat tablosu farklı ölçekte. Rafineri değerin %98'ini yok ediyor; madenler bakımlarının 1/30'unu kazanıyor. | Tek ölçek. |
| C11 | P1 | `industrialMarket.ts:373-391` | Yapay zekâ alıcı ihtiyacı olmasa da her satışı kabul ediyor; 10 yıllık sözleşmelerle para pompası oluşuyor. | Talep şartı ve miktar sınırı. |
| C12 | P1 | `industrialEconomy.ts:79-90` | Sivil fabrikalar GSYİH'yı artırmıyor ama yapay zekâ durmadan inşa ediyor (1 yılda 253). | Büyümeye bağla veya yapay zekâyı hedefe bağla. |
| C13 | P2 | `production.ts:105-141` | Boş üretim hattı %100 verime çıkıyor. | Yalnızca atanmış hat verim kazansın. |
| C14 | P2 | `nationalPrograms.ts:254`, `ministries.ts:68` | Verimlilik tavanı 150 ve 100 arasında çelişiyor. | Tek tavan. |
| C15 | P2 | genel | Sabit maliyetler (2–12 B) ABD için bedava, 140 ülke için imkânsız. "İlişki geliştir" sınırsız tekrar ediliyor. | GSYİH yüzdesi ve bekleme süresi. |

## D. Siyaset, olaylar, dünya

| # | Öncelik | Yer | Sorun | Çözüm |
|---|---|---|---|---|
| D1 | P1 | `politics.ts:25`, `ministries.ts:53` | Onay 0'a inerken istikrar 79,7'de kalıyor (istikrarın düşüşü yok). | İstikrarı onay ve meşruiyete göre bir hedefe çek. |
| D2 | P1 | `events.ts:38` | Her zaman yalnızca en yüksek baskılı olay seçiliyor. 5.000 denemede 0 deprem; 4 yılın 18 olayının 13'ü "reform talebi". | Ağırlıklı rastgele seçim ve tür başına bekleme süresi. |
| D3 | P1 | `events.ts:33` | "Savaş yorgunluğu" savaş yokken de tetikleniyor. | Yalnızca aktif savaşta. |
| D4 | P1 | `events.ts:20` | Gıda krizi mutlak eşikle (< 80) ölçülüyor; büyük ülkeler olaysız açlık çekiyor. | Kişi başına / gün cinsinden rezerv. |
| D5 | P2 | `events.ts:62-96` | Bilinmeyen seçenek ikinci seçenek sayılıyor; hazine kontrolü yok. | Seçeneği doğrula. |
| D6 | P1 | `council.ts:31` | Konsey yaptırımları hiç kalkmıyor. Savaş yokken ateşkes tam %55'te geçiyor; insani yardım her zaman geçiyor (itibar çiftliği). | Süre sınırı; ateşkes için savaş şartı. |
| D7 | P1 | `livingEconomyAI.ts:51-73` | Yapay zekâ oyuncuyla onay almadan ticaret anlaşması imzalayabiliyor. | Oyuncuyu tedarikçi listesinden çıkar veya mektupla teklif et. |
| D8 | P1 | `worldDynamics.ts:37`, `commands.ts:136` | Yapay zekâ anlaşmaları bedava ve daha düşük eşikli ("aynı kurallar" ilkesine aykırı). | Tek uygunluk ve maliyet fonksiyonu. |
| D9 | P1 | `strategicGoals.ts:18`, `ai.ts:12` | Yapay zekânın "istikrar" hedefi vergiyi artırıyor; rastgele vergi yürüyüşü buna karşı çalışıyor. 185/203 ülke bu hedefte kilitli. | Hedef ≤ 20; rastgele yürüyüşü kaldır. |
| D10 | P2 | `governance.ts:644-667` | Yeniden işgal edilen ülke eski kayıtla neredeyse isyan halinde başlıyor. | Kontrol bırakılınca işgal kaydını sıfırla. |
| D11 | P2 | `advisor.ts:31` | Enflasyon tavsiyesini kapatınca demir/uranyum danışmanı da susuyor. | Ayrı anahtar. |
| D12 | P2 | `espionage.ts`, `influence.ts`, `diplomacy.ts` | Casusluk başarısı ve yakalanma aynı zardan geliyor; operasyon listesi büyüyor; ittifak, ilişki düşmanlığa dönse de kalıyor. | Ayrı zarlar, budama, eşik altında antlaşma bozulması. |

## E. Oyun derinliği (hata değil, eksik)

1. **Yapay zekâ hiç savaş açmıyor.** Yapay zekâ ilişkileri yalnızca yukarı kayıyor, dünya statik.
2. **Siyaset ince.** Onayın 5 girdisi var; seçim "≥45 mi?" tek kontrolü. Parti, hizip, meclis, medya, darbe yok. 46 otokrasi/monarşi kaybedemiyor.
3. **Olaylar dar.** 11 tür, her biri 2 seçenek ve tek cümle, zincir yok. Yılda ~4,5 olaya karşın ~46 danışman açılır penceresi var.
4. **Kazanma koşulu yok.** `CampaignStatus = 'active' | 'lost'`.
5. **Yapay zekâ yalnızca oyuncuya karşı davranıyor.** Blok, konsey, casusluk kullanmıyor.

## F. HD War hazırlığı

Mevcut taktik katman, büyük bir savaş deneyimi için şu noktalarda kilitli:

- 6×6 tahta her yerde sabit kodlu: motor (`%6`, `36`), arayüz, CSS, zod (`max(35)`, `length(36)`).
- Taraf başına rol başına tek birim; hava ve deniz birimi yok.
- Konum çarpışmayı belirlemiyor: kayıplar ulusal, tahta yalnızca sınırlı katsayılar veriyor.
- Coğrafya yok: `progress` tek bir sayı, arazi ISO listesinden geliyor.
- Tekrar oynatma yalnızca önce/sonra konum tutuyor; animasyon için eylem zaman çizelgesi yok.
- Savaşlar dünya RNG'sini paylaşıyor; ülke başına tek taktik savaş var.

**Önerilen ilk dilim:**

1. B1–B5'i düzelt.
2. `grid.ts` (genişlik/yükseklik soyutlaması).
3. `TacticalBattle v2` + şema 17 göçü.
4. Komşu birimler arası çarpışma (kayıplar birimden ulusala toplanır).
5. `actions[]` olay zaman çizelgesi.
6. Savaş başına RNG akışı.
7. Tohumlu arazi, 10×8 tahta, 2 hedef.
8. SVG/canvas tek bileşen; PixiJS ancak ölçümden sonra.

## G. Arayüz, çeviri, erişilebilirlik, performans

| # | Öncelik | Sorun | Çözüm |
|---|---|---|---|
| G1 | P0 | Entegrasyon onay penceresi (`z 1500`) entegrasyon katmanının (`z 2800`) arkasında açılıyor; oyun duraklıyor ve oyuncu kilitli kalıyor. | Önce katmanı kapat. |
| G2 | P1 | `App.tsx:26` tüm oyuncu ülkesine abone; tüm uygulama ve harita her tick yeniden çiziliyor. 22 bileşen seçicisiz `useGameStore()` kullanıyor. Harita katmanının `key`'i dünya dönüşünü içeriyor; her sürükleme karesinde ~250 yol yeniden oluşuyor. | Dar seçiciler, `memo`, `key` kaldırma. |
| G3 | P1 | Arayüz motor formüllerini kopyalıyor (`SupplyCommandWindow`, `InvestmentWindow`, `WarTheatreModal`, `PopulationPanel`, `TopBar`). | Motor önizleme fonksiyonları. |
| G4 | P1 | Çeviri: 12 kaynak, 222 yinelenen anahtar (133'ü farklı Türkçe). JSON'larda makine çevirisi çöpü var: zh'de "Çin bitki veritabanı", altyazı işaretlemesi; tr'de "Şarap karayoz", "kınama → kahkahalar"; es'de `&amp;`. 78 sabit kodlu İngilizce metin. `VictoryScroll` es/zh/ru oyuncularına Türkçe gösteriyor. | Bariz çöpleri temizle; uzun vadede dil başına tek katalog ve CI kontrolü. |
| G5 | P1 | `<html lang>` hiç güncellenmiyor. Harita klavyeyle kullanılamıyor. Modallarda odak yönetimi yok. | Ortak `useModal`, `lang` güncellemesi, ülke listesi. |
| G6 | P1 | 9 CSS dosyası, 425 `!important`, 47 z-index (21 farklı değer >100). | z-index token ölçeği, `@layer`. |
| G7 | P1 | `public/`'teki ~3,2 MB dosyaya hiç referans yok. SVG'lerin hepsi base64 raster sarmalıyor; `blue-marble-surface.svg` 1,69 MB (WebP ile ~430 KB). | Sil ve dönüştür. |
| G8 | P1 | Tüm diller (~754 KB) ana pakette. | Seçili dili tembel yükle. |
| G9 | P2 | `EconomicTrends` grafiği her tick yok edip yeniden kuruyor; geojson hatasında harita sonsuza kadar "INITIALIZING"de kalıyor. | `chart.update()`, hata durumu. |

## H. Repo ve araçlar

- **H1 (P1):** `package-lock.json` StackBlitz WebContainer'dan geliyor: `lightningcss` → `lightningcss-wasm` takma adı, 72 girişin 46'sında `resolved`/`integrity` yok. CI şimdilik geçiyor ama tedarik zinciri bütünlüğü zayıf. **Çözüm:** Mac'te bir kez `rm -rf node_modules package-lock.json && npm install` ile yeniden üret ve commit et.
- **H2 (P2):** `dist/` `.gitignore`'da ama 8 eski dosya hâlâ takipli. `git rm -r --cached dist`.
- **H3 (P2):** Uzun vadeli değişmez (invariant) testi yok. Yukarıdaki P1 denge sorunlarının hepsi 2 yıllık tek bir simülasyon testinde görünürdü.
- **H4 (P2):** Kod "küçültülmüş" tarzda yazılmış (tek satırda 2.000+ karakter, örn. `warfare.ts:33-37`). Okunabilirlik ve diff incelemesi zor. Prettier'ı kademeli uygula.
- **H5 (P2):** `docs/` altında sürüm başına PLAYTEST/ARTWORK dosyaları birikmiş (28 dosya). `docs/archive/` altına taşı.
- **H6 (P2):** `CLAUDE.md` / ajan kuralları dosyası yok.

---

## Yol haritası

**Faz 1 — Stabilizasyon (`dev/audit-fixes-084`, bu dal):** A1–A4, B1–B4, B6–B7, C1–C3, C5–C9, C13–C14, D1–D7, D9–D11, G1, G2 (kritik kısım), G4 (bariz çöpler, `VictoryScroll`, `lang`), G7 (kullanılmayan dosyalar), G9, H2, H3, H6.
**Faz 2 — Yaşayan dünya ve siyaset:** C4, C10–C12, C15, D8, D12, E1–E5, A5, A6.
**Faz 3 — HD War:** F'deki ilk dilim, B5, B8, B9.
**Faz 4 — Teknik borç:** G3, G5, G6, G8, tek çeviri kataloğu, CSS katmanları, H1 (senin makinende), H4, H5, A7.
