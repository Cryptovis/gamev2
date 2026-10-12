# Devir notu (yeni konuşma için)

## 0.90.0-playtest.11 — RON Interactive (Claude Opus 5.5)

- Alt bilgi stüdyo kredisi "RON Interactive"; arayüzde AlpyX metni kalmadı. Geçici `measure/*`, `results/*` ve `dev/ron-fluid-0910` dalları Alper'in onayıyla silindi; `Measure` iş akışı gerektiğinde yeni `measure/**` dallarıyla kullanılabilir. Faz 3 Alper'in StackBlitz testinden sonra başlayacak.

## 0.90.0-playtest.10 — Faz 2 + Rule of Nations (Claude Opus 5.5)

- Alper Faz 2 ve Rule of Nations (RON) geçişini onayladı; Faz 3 (çok turlu taktik AI) başlamadı. Şema 17, simülasyon, seeded RNG ve bağımlılıklar değişmedi.
- Ad: başlık, HUD, giriş/kurulum, sihirbaz, Yardım, zafer ve açılış haberleri "Rule of Nations / RON" (çevrilmez, `BrandMark`). Kapak görselindeki eski başlık kırpıldı. Depolama adları (`alpyx-global-command`, `alpyx-map-zoom`, `trp-*`) bilinçli olarak korundu. Alt bilgi playtest.11'de Alper'in kararıyla "RON Interactive" oldu.
- Abonelikler: parametresiz `useGameStore()` kalmadı (test korumalı). Kapılı diyaloglar yalnızca açılış bayrağını izler; küçük paneller gösterdiklerini seçer (`useStoreView`); motor önizlemeli paneller `useWorldView`. 17 senaryoda render −%30, denetlenen 23 panel −%58; React süresi değişmedi. [Kayıt](FLUID-UI-0910.md).
- Geçişler yalnızca opaklık (190/160 ms), azaltılmış harekette kapalı; dönen pencere kaydırma/sekme/odak/konumunu korur (`useScrollMemory`). Tipografi: HTML metni en az 10 px, notlar 11 px, doğal büyük-küçük harf düğme/sekme/başlıklar, telefon HUD ve sekme düzeni.
- Ortam: bu oturumda npm registry ağ politikasıyla kapalıydı; yerel kurulum/test yapılamadı. Tüm doğrulama GitHub Actions'ta: `measure/**` dalları ayrı `Measure` iş akışını (render ölçümü, görsel/tipografi incelemesi, check, odaklı E2E) çalıştırır ve çıktıyı `results/<dal>` dalına yazar. Sürüm kapısı yine `CI`.
- Yerel Git: GitHub HEAD `6dd8a369` üzerinden temiz klon; ayrışmış Codex yerel geçmişi kullanılmadı.

## 0.90.0-playtest.9 — Faz 1 (Codex)

- Alper Faz 1 uygulamasını onayladı; bu izin Faz 2 uygulamasını kapsamıyor. Büyük refactoring ve yeni kütüphane yok.
- Victory/Regime Crisis mevcut ManagedDialog yaşam döngüsüne bağlandı; tutorial etkileşimli kalır. Şema 12–17 roundtrip ve işlem/gün tekrar testleri eklendi. Şema 17 ve engine kuralları değişmedi.
- [QA kanıtları ve ölçüm sınırları](QA-PHASE1-0909.md). 635 birim testi/80 dosya, TypeScript/build ve 12 yeni production tarayıcı senaryosu geçti. Yerel tam koşu ortam kesintisiyle 78 başarılı senaryodan sonra durdu; tam 146 senaryo yayın HEAD CI üzerinde doğrulanacak. Ortam dönüşünde check tekrar geçti.
- Başlangıç GitHub HEAD `cdba582b7aeb319af10af3f2af18699b2923af34`, yerel HEAD `47bdeacdd5012a1557ea27a84f113f47df4f147d`; kaynak ağaçları aynı `1c15b0edbc506d4b68a6456dc34a257c5f6648e6`. Yerel commit zinciri remote zincirine push edilmez; connector commit remote HEAD üzerine kurulur ve expected_sha ile güncellenir.
- Ortam sıfırlanması eski worktree Git metadata dizinini sildi. Tüm tracked dosyalar remote .8 blob hashleriyle karşılaştırıldı: yalnızca 13 amaçlı dosya farklı, eksik dosya yok. Doğrulanmış .8 kaynak ağacından bağımsız yerel mirror kuruldu (yerel temel `0c88ed0`); remote geçmişi yerine geçmez.
- Yerel Chromium bu oturumda mevcut Brotli paketinden `browser-runtime/chromium-0909` olarak yeniden çıkarıldı. Eski dosyanın mevcut olması çalıştığını göstermez.

## 0.90.0-playtest.8 — Codex

- Üst sol HUD içerik kadar geniş; World 940 px, kompakt faaliyetler ve 10 görünür satır. Tüm 203 ülke kaydırmada erişilebilir; sıralama/ülke dönüş durumu ve alt boşluk korunur.
- Supply yeterli genişlikte 3 sütun, ara genişlikte 2, mobilde 1. Dossier 920 px: ayrı hizalı Trade Desk başlığı, ikonlu Society kimliği ve göstergeleri. Supply command 980 px: yol/demiryolu/liman/depo SVG ikonları ve okunur kartlar. Mobil çerçeveler ekran içinde.
- Güç/Teslimat ve görünür Society/Supply çevirileri beş dilde düzeltildi. Şema 17, ekonomi/oyun kuralları ve bağımlılıklar değişmedi; mevcut kayıtlar devam eder.
- 622 unit tests / 79 files, TypeScript and production build passed. All 8 final focused production-browser scenarios passed (2.2m), covering 390/1440/2048 px, five languages, all ranking pages, Supply readability, Society/Infrastructure and parent/review return. The local full run was interrupted at scenario 58 after finding two Supply font-size failures and one mobile bottom-padding failure; these real UI issues were corrected and covered by the final focused run. The full 134-scenario suite runs in exact-head GitHub CI after publication. Final desktop/mobile screenshots inspected; actual StackBlitz testing was not performed. V3 remains conditional on complete playability.
- Başlangıç GitHub HEAD `87b7c22baa8dbb6db9aba28c0d22cb398c21c1fc` (.7), CI 38144692593 completed/success doğrulandı. Yerel mirror geçmişi farklı: native push/force push yapılmaz.

## 0.90.0-playtest.7 — Codex

- Open Market alış/satış sütunları ve bağımsız miktarlar; kaynak/finans/güvenlik/iç politika/diplomasi uyarıları; başlangıç özeti ve boş journal düzeltmesi.
- Kaynaklı çağdaş başlangıç diplomasisi; Türkiye–Azerbaycan 90/ittifak. [Kapsam ve kaynaklar](DIPLOMACY-SNAPSHOT-0907.md). Mevcut kayıtlar korunur; yeni diplomasi başlangıcı yeni oyunda geçerlidir.
- Önceki çalışma ortamı kesintiden sonra .6 görüntüsüne geri döndü: yayınlanmamış ilk .7 değişiklikleri/logları kayboldu. Dört istek yeniden uygulandı; önceki test sonuçları bu çalışma için kullanılmaz.
- Son kodda 621 birim testi/78 dosya (365 gün invariant dahil), TypeScript/build geçti. Tam tarayıcı turu 127/128 (17,1 dk); tek hata eski mobil rail beklentisiydi, düzeltildi. Son mobil Market CSS düzeltmesi dahil etkilenen 9 test yeniden geçti (1,4 dk); 128 benzersiz senaryo doğrulandı. Son görseller incelendi. CI yayın HEAD’i üzerinden kontrol edilir; gerçek StackBlitz testi yapılmadı. Şema 17, bağımlılıklar aynı; V3 kesinleştirilmedi.

## 0.90.0-playtest.6 — Codex

- Kullanıcının seçtiği kapsam: performans ölçümü. 1/366/1096. gün gerçek seeded kayıtlarıyla motor, save, açılış, menü ve kamera ölçümleri; komutlar ve sonuçlar [performans kaydında](PERFORMANCE-0906.md).
- Relations haritası bağlantı indeksi; kapalı tedarik ayrıntılarında ertelenen satırlar. Üç yıllık bağlantı kontrolü ~0,89 → 0,016 ms; genel Supply/açılış hızlanması doğrulanmış değil.
- 610 birim testi/77 dosya, TypeScript/build ve ölçüm koşuları geçti. 118/118 üretim tarayıcı senaryosu geçti (15,6 dk); CI yayın HEAD’i üzerinden ayrıca doğrulanır. Şema 17, denge ve bağımlılıklar korunuyor.

## 0.90.0-playtest.5 — Codex

- Geniş Tech/World/War/Production ve Supply/Market pencereleri; üst menüyü gizleyip kapatınca seçim/konumuyla geri getiren geçici gezinme geçmişi. Overview/Power/Supply ve Tech/World/War ayrı gruplar.
- Cabinet atlas görselleri, kimlik/profil kartları, çerçeveli yan düğmeler; tarih hız kutusunun altında ve ülke düğmesi altın çerçeveli. World faaliyetleri + ilk 20 ülke, kaydırmada devamı.
- World → başka ülkenin War assessment geçişi gizli pencereye takılmaz. İlk CI 113/114 geçti; çift kaydırma olayının iki sayfa yüklemesi yakalandı, düzeltildi ve hızlı olay/sekme değişimi regressioni masaüstü/mobilde geçti.
- Beş dil; şema 17, simülasyon ve bağımlılıklar değişmedi. 607 birim testi/76 dosya, TypeScript/üretim derlemesi geçti. 115 üretim senaryosu doğrulandı: tam turda 111; iki gizli üst menü seçicisi ve portre odak hatası düzeltildi, 12 + 8 + 3 + 11 + 4 odaklı test geçti. Son görüntüler incelendi; gerçek StackBlitz testi yapılmadı.


Bu dosya yeni bir konuşmanın ilk okuması içindir. Geçmiş konuşmayı taşımadan kaldığımız yerden devam etmeyi sağlar.

## Durum
- Sürüm: **0.90.0-playtest.11 "RON Interactive credit"** (playtest.10 Faz 2 üzerine)
- Dal: `dev/clear-command-090`. Kaynak: 0.89.7 (`8322a3f`). Başlangıç GitHub HEAD: `4d3d564d5921dac391a9fc9769e1105f9e47f938` (0.90.4), CI başarılı (38086841276; 600 birim/111 tarayıcı testi). Playtest.5 GitHub HEAD `2adaceba` ve CI 38095471126 completed/success olarak doğrulandı. Playtest.6 GitHub HEAD `44f03ca86aac053e06f15309361a99a1af2cddca`; CI 38119416063 completed/success olarak doğrulandı.
- `main`'e doğrudan push yok. Yeni işler `dev/<name>-0XX` dallarında yapılır.
- 0.90.4 (Codex): menüler başlangıçta yüklenir; Tech → Investments, Military → Pilot training; okunur Supply ve sözleşme boşluğu; sola bitişik üç World sıralaması. Kredi: bayraklar, tüm ülkelerde AAA–D, üç oyun günü başvuru, ilişki/risk retleri, hedefli 3 yıllık can simidi, erken ödeme ve sınırlı kredi geçmişi ödülü. Şema 17 yeni opsiyonel alanlarla korunur; bağımlılıklar değişmez. 600 birim testi/TypeScript/derleme geçti. 111 üretim senaryosu doğrulandı: tam tur 108 geçti, eski seçici/atlas varsayımına takılan 3 test düzeltildikten sonra 3/3 tekrar geçti. Ayrıntılar PLAYTEST-090 kaydında. Gerçek StackBlitz testi yapılmadı.
- Önceki 0.90.3: alış/satış makbuzunda gerçek ödeme, hazine, yoldaki yük ve T+1 satış geliri; 5 sütunlu stok kartları, tek satırlı sözleşme alanları, 2 satırlı ürün seçimi, gereksiz World prices kaldırıldı. Policies vergi onayını ve mevcut bakanlık bütçesi erişimini toplar. 582 test/derleme ve 98 üretim tarayıcı senaryosu geçti; son odaklı kontroller ve sonuçlar [0.90 test kaydında](PLAYTEST-090.md). Üretim dengesi/şema/bağımlılıklar değişmedi.
- Önceki hotfix: borsa review penceresi ve engel açıklaması, Help/Supply/kredi/kontrat için başlangıç yüklemesi, scroll/focus ve rail yerleşimi, bayrak altı ülke kısayolu, güncel ülke adları ve okunur karar/tedarik başlığı. 578 birim testi/derleme ve 6 Vite-dev tarayıcı senaryosu geçti. All 90 production-preview browser scenarios passed (7.7m); final mobile-menu layout rechecked in nine focused scenarios (50.7s).
- 0.90 major içeriği: bölümlere ayrılmış Affairs, ortak motor koşul/maliyet önizlemesi, HUD/ülke menüsü, değişen açılış sözleri, klavye harita kontrolü; doğrulanan savaş/konsey/seçim düzeltmeleri. [0.90 test kaydı](PLAYTEST-090.md) ve [Antigravity değerlendirmesi](QA-RECONCILIATION-090.md). Market/resim kurtarma önceki sürümde mevcut; tekrar yapılmadı.
- Kapsam (0.89): ticaret ortağı seçimi ve ülke TRADE sekmesi, emtia borsası (spread, komisyon, günlük limit, pozisyon limiti, depolama, şoklar), diplomatik jet ve kargo uçakları (harita katmanı, mesafeye göre varış süresi).

## Bekleyen işler
- Performans ilk ölçüm dilimi 0.90.6’da hazır: StackBlitz/mobil, Supply spike CPU profili, coğrafi raster ve yoğun uçuş/savaş kayıtları ayrı takip kapsamı. [Sonuçlar](PERFORMANCE-0906.md).
1. **Faz 4 (teknik borç):** tek çeviri kataloğu, CSS katmanları, z-index ölçeği, modal hook, motor önizleme fonksiyonları, harita dokusu, Prettier, docs arşivi, demo hesap hash'i. Araştırma önizlemesi/iade hesabı 0.89.0-playtest.5’te birleştirildi. 0.89.0-playtest.6 ortak pencere yönetimi, katman değişkenleri ve panel indirme kurtarmasını ekledi; kalan kapsam ve kanıtlar: [audit ilerleme kaydı](AUDIT-PROGRESS-089.md).
2. **Oyun testinden gelen denge hotfix'leri:** approval baseline, AI savaş çeşitliliği, demokrasilerde huzursuzluk, borsa fiyat düzeyi tutarlılığı. Kullanıcı geri bildirimi toplanıp tek bir hotfix sürümünde işlenecek.
3. **Bağımlılık/lock bakımı:** package-lock değişiklikleri kaynağı ve bağımlılık grafiği incelenmeden yayınlanmamalı. StackBlitz yerel değişiklikleri korunmalı; temiz kurulum için mevcut lock ile `npm ci` kullanılır.

## Ortam notları
- Codex 0.90.6 yerel Chromium: `/workspace/scratch/0add3a506d52/browser-runtime/chromium-0906`. Eski yürütülebilir dosya başlatılamadı; mevcut Brotli paketinden temiz kopya çıkarıldı. Ölçümler ve 118 senaryo bu kopyayla geçti. Yol geçicidir; yeni oturumda önce kullanılabilirliğini doğrula.
- Aşağıdaki 403/stub notları önceki Claude ortamına aittir. Codex ortamında `npm ci --ignore-scripts`, TypeScript/build ve yerel Chromium ile Playwright çalışıyor; bu kısıtları başka ortamlara genelleme.
- Sandbox'ta `npm install` 403 veriyor. Testler `bun test src/tests/<dosya>` ile yerelde çalıştırılır.
- `tsc` ve Playwright yalnızca CI'da (`.github/workflows/ci.yml`) çalışır. CI log indirme 403 veriyor. Hata okumak için `gh api repos/.../check-runs/<id>/annotations` kullanılır.
- Bilinen yerel stub hataları (CI'da yok): "rejects nonfinite, unordered and future history", "produces transparent space and correctly sampled globe pixels", "selects a country from a point inside its polygon", `react/jsx-runtime`.
- Şema sürümü: 17. Yeni opsiyonel alan şema artırmadan eklenebilir, ama `src/persistence/validation*.ts` hem var hem yok durumunu kabul etmeli.

## Token tasarrufu kuralları (bu konuşmada öğrenildi)
- Tek kapsamlı iş per tur. Büyük "hepsini yap" istekleri parçalanır.
- Ajan (Agent) yalnızca birden fazla bağımsız alan aynı anda taranacaksa kullanılır. Tek dosya veya tek hata için `Grep` ve satır aralıklı `Read` yeterli.
- Dosyalar tamamen okunmaz. Önce `Grep -n` ile yer bulunur, sonra o bölüm okunur.
- CI logları ve büyük test çıktıları tamamen çekilmez. Sadece hata satırları alınır.
- Doküman güncellemeleri (CHANGELOG, PLAYTEST, README, ROADMAP) kısa tutulur ve sürüm sonunda tek seferde yapılır.
- Hotfix'ler biriktirilir, her küçük düzeltme için ayrı bir tam tur açılmaz.
- Her iş sonunda kısa bir "sonraki adım" önerisi verilir.

## Yeni konuşmada ilk adım
Bu dosyayı oku, `git status` ve son commit'e bak, kullanıcıya bekleyen işlerden hangisiyle devam edeceğini sor.

## Hazırlanan giriş/kurulum hotfix'i (Codex, 2026-10-09)
- Eksik dil import'u düzeltildi; kurulumdaki dil seçici geri getirildi.
- Mobil kurulum kartı ekran yüksekliğiyle sınırlandı; alt gezinme düğmeleri görünür kalıyor.
- Menü numaraları ve geri oku, düğmelerin erişilebilir adlarına eklenmiyor.
- Kurulum testi son onay adımını, sabit kart yüksekliğini ve onay düğmesinin ekranda kalmasını kontrol ediyor.
- Doğrulama: 530 birim testi, TypeScript/üretim derlemesi ve 5 hedefli Playwright testi geçti (giriş: 1440/390 px; kurulum: 1440/1280/390 px). Mobil son onay ekranı görsel olarak kontrol edildi.
- Kullanıcı Codex'e commit/push için sürekli yetki verdi; önceki "yalnızca istediğimde commit" kısıtı Codex için geçerli değil. Remote CI sonucu ayrıca kontrol edilmeli.

## 0.89.0-playtest.2 giriş/kurulum düzeni (Codex)
- Kullanıcının son tercihine göre dil seçimi yalnızca ilk giriş ekranında; sonraki ekranlar seçilen dili koruyor. Önceki dil seçiciyi geri getirme kararı bu tercihle değişti.
- Ortak kart ölçüleri, kapak görseli, tema ve kompakt son özet. GDP/hazine dilin sayı biçimiyle kısaltılıyor.
- Bir önceki hotfix ve kullanıcı yetkisi geçerli: Codex gerekli commit/push işlemlerini ek onay beklemeden yapabilir.

- Doğrulama: 532 birim testi, TypeScript/üretim derlemesi ve 22 hedefli tarayıcı testi geçti. Beş dilde 1440×900, 1280×720 ve 390×844 son özet kaydırmadan sığıyor.

## 0.89.0-playtest.3 (Codex)
- Portre kartlarının içinden taşan sabit genişlik düzeltildi; gölge yumuşatıldı.
- İlk profil adımına kutusuz alıntı eklendi: dört kaynaklı söz, beş dil; her kurulum açılışında UI rastgele seçer, yazarken/geri dönerken değişmez. `src/data/leadershipQuotes.ts` kaynakları ve çevirileri içerir. Oyun RNG/simülasyonu etkilenmez.

- Doğrulama: 534 birim testi; Node 22 para düzeltmesi sonrası ilgili 4 test yeniden geçti. Build ve 17 tarayıcı testi geçti.

## 0.89.0-playtest.4 (Codex)
- Satın alma incelemesinden 1/3/5/10 yıllık aylık tedarik anlaşması açılır. İlişki >40/100, pakt, stok ve ilk aylık ödeme bütçesi şart; motor önizlemesi ve tüm yaratma yolları aynı kuralları kullanır. Aynı tedarikçinin günlük akışı değiştirilir; aktif sözleşme tekrarlanamaz.
- Savaş açmak için oyuncu/AI ortak 14 günlük işlenmiş yakıt şartı. İncelemede stok/gereken/eksik miktar görünür. Ham petrol tek başına yeterli değildir.
- Auto assault 5×, saniyede bir gün. Yakıt/petrol önerileri savaş sırasında popup açıp zamanı durdurmaz; eski kayıttaki bu öneriler auto yeniden açılınca temizlenir. Diğer ulusal kararlar durdurabilir; uzun savaşlarda yakıt bitebilir ve savaş gücü azalır.
- React.lazy geçici fetch hatalarını en fazla iki kez yeniden dener; aynı kaynaktaki bilinen panel için tarayıcı başarısız URL önbelleği aşılır. Kod hataları maskelenmez, otomatik reload yok.
- Yeni metinler beş dilde. Şema 17; mevcut kayıtlar uyumlu. Doğrulama: 548 birim testi (365 gün invariant dahil), TypeScript/üretim build ve 52 tarayıcı senaryosu yerelde geçti. Mobil sözleşme özeti iki sütun; eylemler kaydırırken görünür. Son UI düzenlemesi sonrası ilgili 5 tarayıcı ve 19 birim/çeviri testi tekrar geçti; mobil görüntü incelendi. CI push sonrasında ayrıca izlenmeli.
