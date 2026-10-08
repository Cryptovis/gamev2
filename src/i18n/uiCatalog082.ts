const rows:Record<string,string>={
 'Command completed':'Karar uygulandı','Close review':'İncelemeyi kapat','NEWS':'HABERLER','NEWS //':'HABERLER //','News Archive':'Haber Arşivi','Map and help tools':'Harita ve yardım araçları',
 'Return to your nation':'Ülkene dön','My nation':'Ülkem','Buy / supply options':'Satın al','All resources':'Tüm kaynaklar',
 'Research capacity / day':'Günlük araştırma kapasitesi','Research progress':'Araştırma ilerlemesi','RESEARCH IN PROGRESS':'ARAŞTIRMA SÜRÜYOR','Estimated duration':'Tahmini süre',
 'One national team runs one project at a time. Universities and institutes increase research capacity. Points are paid once; capabilities unlock on completion.':'Ulusal ekip aynı anda bir proje yürütür. Üniversiteler ve araştırma enstitüleri kapasiteyi artırır. Puan bir kez ödenir; teknoloji tamamlanınca açılır.',
 'Cancel research / refund':'Araştırmayı iptal et / iade','Cancel research?':'Araştırma iptal edilsin mi?',
 'Research points are paid upfront. Cancellation refunds 80% of unfinished work; completed research cannot be cancelled.':'Araştırma puanı başta ödenir. İptalde tamamlanmamış kısmın %80’i iade edilir; bitmiş araştırma iptal edilemez.',
 'Command already applied':'İşlem zaten uygulandı','This command has already been applied.':'Bu işlem daha önce uygulandı.',
 'Check budget, stock, prerequisites, access or an existing order.':'Bütçeyi, stokları, ön koşulları, erişimi ve mevcut siparişleri kontrol et.',
 'No compatible save found':'Yüklenebilir kayıt bulunamadı','Autosave failed; retrying':'Otomatik kayıt başarısız; yeniden deneniyor',
 'Save failed; try again':'Kayıt başarısız; yeniden dene','Save could not be loaded':'Kayıt yüklenemedi','Saved campaign':'Kampanya kaydedildi',
 'Load previous progress':'Önceki ilerlemeyi yükle','Research projects take several campaign days. One national team can run one project; campuses increase its capacity. Review duration and cost before confirming.':'Araştırma projeleri birkaç oyun günü sürer. Ulusal ekip bir proje yürütür; kampüsler kapasiteyi artırır. Onaylamadan önce süre ve maliyeti incele.',
 'Keep the game running to finish research; the tutorial pauses time.':'Araştırmanın bitmesi için oyun zamanını ilerlet; rehber zamanı duraklatır.',
};
export const UI_CATALOG_082=Object.fromEntries(Object.entries(rows).map(([key,tr])=>[key,[tr,key,key,key]]));
