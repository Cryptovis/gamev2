# Devir notu (yeni konuşma için)

Bu dosya yeni bir konuşmanın ilk okuması içindir. Geçmiş konuşmayı taşımadan kaldığımız yerden devam etmeyi sağlar.

## Durum
- Sürüm: **0.89.0-playtest.1 "Trade & Markets"**
- Dal: `dev/trade-markets-089` (CI yeşil, commit'ler push edildi)
- `main`'e doğrudan push yok. Yeni işler `dev/<name>-0XX` dallarında yapılır.
- Kapsam (0.89): ticaret ortağı seçimi ve ülke TRADE sekmesi, emtia borsası (spread, komisyon, günlük limit, pozisyon limiti, depolama, şoklar), diplomatik jet ve kargo uçakları (harita katmanı, mesafeye göre varış süresi).

## Bekleyen işler
1. **Faz 4 (teknik borç):** tek çeviri kataloğu, CSS katmanları, z-index ölçeği, modal hook, motor önizleme fonksiyonları, harita dokusu, Prettier, docs arşivi, demo hesap hash'i. Kullanıcı onayı bekleniyor.
2. **Oyun testinden gelen denge hotfix'leri:** approval baseline, AI savaş çeşitliliği, demokrasilerde huzursuzluk, borsa fiyat düzeyi tutarlılığı. Kullanıcı geri bildirimi toplanıp tek bir hotfix sürümünde işlenecek.
3. **İsteğe bağlı:** Mac'te `rm -rf node_modules package-lock.json && npm install` ile lock dosyasını yeniden üretmek.

## Ortam notları
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
