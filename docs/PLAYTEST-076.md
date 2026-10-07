# 0.76 — Decisions & World Institutions

Bu geliştirme dalı, 0.75 üzerine kuruludur. Ana hedef: oyuncunun hangi işlemi yaptığını, maliyetini ve sonucunu anlayabilmesi; dünya ilişkilerinin görünür ve kaydedilebilir mekaniklere dönüşmesi.

## Uygulanan paket

1. **Fabrika incelemesi:** Build işlemi onay ekranı açar. Yatırım, mevcut/kalan bütçe, tamamlanma günü, mevcut/yeni tahmini kapasite, son gerçek üretim, günlük işletme bedeli, elektrik ve malzeme ihtiyacı gösterilir. Onaydan önce bütçe ve inşaat kuyruğu değişmez. Gereksinimler işlem anında tekrar kontrol edilir.
2. **İnşaat iptali:** Tamamlanmamış projeler iptal edilebilir. Geri ödeme = yatırım bedeli × kalan inşa süresi oranı × %80. Onay ekranı kesin tutarı gösterir. Tamamlanmış tesisler geri alınmaz; aynı proje ikinci kez ödeme üretmez.
3. **Tedarik danışmanı:** Ticaret paktı ve sözleşme ayrı inceleme adımlarıdır. Süre seçiminde aylık teslimat, birim fiyat, tahmini aylık ödeme, ilk teslimat ve bitiş günü görünür. Pakt bedeli onayda ödenir; sözleşme ödemesi teslimatta gerçekleşir. Tekrarlanan aktif sözleşmeler engellenir.
4. **Sonuç pencereleri:** Fabrika, ticaret, diplomatik kararlar, altyapı, teknoloji, ekipman konuşlandırma ve diğer önemli komutlar görünür sonuç verir. Kaydırıcılar bu pencereleri üretmez. Gelecek sevkiyatlar iptal edilebilir; gerçekleşmiş alışverişler geriye sarılmaz.
5. **Kaynak ve araç sanatı:** 25 karelik üretilmiş görsel atlası; dört temel kaynak, 13 sanayi ürünü, tank, uçak, topçu, gemi, ekipman, lojistik, fabrika, enerji ve elçilik görselleri. Market, Supply ve üretim/ordu ekranlarında kullanılır. [Görsel üretim notları](../public/assets/command/ARTWORK.md).
6. **Düşük ilişki açıklaması:** Low Relations okunur ve tıklanabilir. İlişki eşiği, mevcut puan ve pakt bütçesi açıklanır. Diplomasiye doğrudan geçiş sağlanır; görev, yardım ve elçilik önerilir.
7. **Harita:** NASA yüzeyi standart SVG image katmanına taşındı ve veri içeren yerel SVG varlığıyla dağıtıldı. Küre ve düz projeksiyon desteklenir. Yükleme başarısızsa ülke arazi desenleri kalır ve hata mesajı görünür. Relations modu gerçek ikili ilişki puanını yeşil/nötr/kırmızı tonlarda gösterir.
8. **10 adımlı eğitim:** Yeni kampanyalarda başlar, ilgili ekranları açar; bütçe, harita, sanayi, teknoloji, market, supply, diplomasi, ordu ve dünya mekaniklerini anlatır. Türkçe/İngilizce metin, geri/ileri/atla seçenekleri ve HELP ile tekrar oynatma vardır. Oyun zamanı eğitimde durur. Eski kayıtlarda otomatik açılmaz.
9. **Kurumlar:** United Nations, WHO ve Security Council için oyunlaştırılmış üyelik koşulları, nüfuz bedeli, beş günlük başvuru oylaması ve üyelik faydaları vardır. WHO Social Resilience araştırması; Security Council ayrıca assembly üyeliği, Diplomatic Leadership, 50 nüfuz ve üç elçilik gerektirir. Oyuna özel rozetler kullanılır; resmî amblemler eklenmedi.
10. **Oylama ve nüfuz:** Üyeler birer oy kullanır. Yes > No ve en az bir Yes varsa öneri geçer; çekimserler sayım dışıdır. Oyuncu oyunu kapanışa kadar değiştirebilir. AI desteği ilişkiler, itibar, nüfuz ve araştırmadan etkilenir. Public Diplomacy günlük +0.04 nüfuz verir; Diplomatic Leadership oy desteğini geliştirir. Başvurusu reddedilen ülke kapanıştan 30 gün sonra tekrar deneyebilir.
11. **Saldırı tartışmaları:** Assembly üyeleri 8 nüfuzla saldırı önerisi sunabilir. Oylama savaş başlatmaz. Reddedilen öneriye rağmen saldırı, ek -10 itibar ve karşı çıkan ülkeler/hedef müttefikleriyle -20 ilişki doğurur. Oylama sürerken saldırı başladıysa ret kapanışta aynı sonucu uygular. Bazı AI ülkeleri mevcut çatışmaları için de destek arar.
12. **Gönüllü dinî faaliyetler:** Yabancı ülkede $2B maliyetli, 30 günlük faaliyet; ilişkiler ve kültürel nüfuz başarı olasılığını etkiler. Başarı kesin değildir. Başarı 0.1–0.5 yüzde puanı kaydırır; toplam %100 korunur. Başarısızlık sıfır değişikliktir. Aynı hedefte tamamlanma sonrası 60 gün beklenir. Başlangıç dağılımları oyun tahminleridir.

## Sınırlar ve denge

Kapasite tahmini yeterli hammadde, elektrik ve nakit varsayar; gerçekleşen üretim darboğazlardan etkilenir. Maliyetler oyun içi milyar birimindedir. Kurum üyelikleri, oy kuralları ve güvenlik forumu gerçek kuruluşların usullerinin kopyası değildir. Başlangıçta oyuncu üyelik yolunu oynar; AI ülkelerin hazır üyelikleri bulunur. Dinî faaliyetler gönüllü toplumsal değişim olarak modellenmiştir.

## Kayıt uyumluluğu

Şema 14. Şema 12 → 13 → 14 ve 13 → 14 taşınır. Eski ülke, bütçe, üretim, altyapı ve sözleşmeler korunur. Yeni kurum/oy/dağılım/eğitim verileri kaydedilir. Geçici inceleme pencereleri ve komut sonuçları kayda eklenmez.

## Kontroller

- 133 test / 33 dosya; `npm run check` başarılı.
- Üretim derlemesi başarılı. Önceden var olan büyük bundle uyarısı devam eder.
- Chromium: on adımlı eğitim, yatırım öncesi değişmez bütçe, onay/iptal/geri ödeme, pakt/sözleşme, Geographic küre/düz, Relations renkleri, engel açıklamasından diplomasiye geçiş, kurum başvurusu, 13 market görseli ve dar ekranda inceleme penceresi doğrulandı. Konsol/runtime hatası yok.

## Çalıştırma

Vite sürecini Ctrl+C ile durdur, ardından:

```bash
git fetch origin
git checkout dev/decisions-world-076
npm ci
npm run dev -- --force
```

`git switch` veya `git stash` desteği kısıtlı olan terminal ortamlarında yukarıdaki checkout akışı kullanılır. Git yerel değişiklik nedeniyle durursa kaynakları yedeklemeden silme veya kısmi dosya checkout denemesi yapma. Tarayıcı oyun kayıtları kaynak dosyalarından ayrı saklanır; preview adresini değiştirmek farklı bir kayıt alanı açabilir.
