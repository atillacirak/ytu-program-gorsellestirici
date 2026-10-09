# Changelog (Değişiklik Günlüğü)

Bu belgede **YTÜ Dostun** projesine yapılan tüm sürüm güncellemeleri, mimari iyileştirmeler ve hata düzeltmeleri kronolojik olarak listelenmektedir.

---

## [v2.2.0] - 2026-10-10

### ✨ Yeni Özellikler & Geliştirmeler
- **Tam Veri ve Ayar Kalıcılığı (LocalStorage):**
  - Program verisi (`visualizerData`), eklenen ders notları (`courseNotes`), hoca/şube/not görünüm filtreleri, yazı tipi ailesi, boyutu, çizelge modu ve renk modu `useLocalStorageState` kancası ile tarayıcı hafızasına bağlandı.
  - Sayfa yenilendiğinde (F5) veya tarayıcı kapatılıp açıldığında kullanıcının programı ve tüm ayarları sıfırlanmadan anında geri yüklenir.
  - İstemci tarafı hidrasyonu sırasında `UploadScreen`'in anlık yanıp sönmesi (flicker) engellendi.
  - Kullanıcının programı kolayca sıfırlayabilmesi için üst çubuğa kırmızı **"Kaldır"** (🗑️) butonu eklendi.
- **Modüller Arası Tek Tıkla Aktarım:**
  - 🟢 **Devamsızlığa Gönder Butonu:** Programdaki tüm dersleri, haftalık günlerini ve Teori/Lab ayrımlarını otomatik ayıklayıp devamsızlık modülüne aktarır ve `/devamsizlik` sayfasına yönlendirir (0 ms ağ gecikmesi).
  - 🟣 **AGNO'ya Gönder Butonu:** Programdaki dersleri paketleyip `/agno` sayfasına aktarır. AGNO sayfası bu dersleri alır almaz SQLite veritabanından kredilerini otomatik olarak tamamlar.
- **Yönetim Çubuğu (Toolbar) Yeniden Tasarımı:**
  - Önceki sürümlerden kalan mükerrer butonlar ve `justify-between` kaynaklı devasa boşluklar temizlendi.
  - 2 satırlı, dengeli ve ferah bir kontrol paneli oluşturuldu (Satır 1: Başlık & Eylemler; Satır 2: Görünümler & Filtreler).

### 🐛 Hata Düzeltmeleri
- **Devamsızlık Key Çakışması (`same key: kt51oml...`):** Aynı ders koduna sahip Teori ve Lab derslerinin devamsızlığa aktarılırken aynı ID'yi alması sorunu çözüldü (`usedIds` takip kümesi eklendi). Ayrıca devamsızlık sayfası yüklenirken eski bozuk verileri otomatik onaran deduplication yapısı kuruldu.

---

## [v2.1.0] - 2026-10-10

### 🏗️ Aşama 2 Mimari Refactor (Komponent Parçalama)
- **`page.tsx`'in Bölünmesi:** 1800+ satırlık devasa ana sayfa dosyası 850 satıra düşürüldü ve 4 bağımsız bileşene ayrıldı:
  - `UploadScreen.tsx`: PDF yükleme ve hazırlık sınıfı seçim ekranı.
  - `ScheduleTable.tsx`: A4 ders programı matrisi ve görsel hücreleri.
  - `CourseSummaryTable.tsx`: Ders listesi ve derslik özet tablosu.
  - `EditCourseModal.tsx`: Ders bilgilerini düzenleme ve not ekleme modalı.
- **Özel Kanca (`useLocalStorageState.ts`):** Tekrarlayan tüm `try/catch` ve `localStorage` çağrıları tek bir tip-güvenli (type-safe) React hook'u haline getirildi.
- **Tembel Yükleme (Lazy Loading):** `prepSchedules.json` statik import'tan çıkarılarak dinamik `import()` içine alındı. Sayfa ilk açılış hızı ve bundle boyutu ciddi oranda iyileştirildi.

### 📊 İstatistikler (`/stats`) Sayfası İyileştirmeleri
- **Yüzdelik Değişim Trendleri:** Ziyaret ve program oluşturma sayıları için bir önceki döneme (24 saat, 7 gün vb.) kıyasla % kaç arttığı veya azaldığı hesaplanarak yeşil/kırmızı trend oklarıyla gösterildi.
- **Aktivite Grafiği:** Harici ağır bir grafik kütüphanesi eklemeden, tamamen Tailwind CSS ile yazılmış saatlik/günlük ziyaretçi dağılım sütun grafiği eklendi.
- **Backend Redis Pipeline Optimizasyonu:** `stats_db.py` içinde önceki dönem verileri ve zaman damgalı olaylar tek bir Redis pipeline'ında çekilecek şekilde güncellendi.

---

## [v2.0.0] - 2026-10-09

### ⚡ Aşama 1 Performans Refactor & Kritik Düzeltmeler
- **Ortak Boş Saatler (`CompareView`) O(N³) Optimizasyonu:** Tablodaki her hücrede çalışan pahalı hesaplama döngüsü kaldırıldı; tüm öğrenciler için tek seferde O(1) erişimli `busyMap` hash haritası çıkarılıp `useMemo` içine alındı.
- **Özel Rota:** Ortak saatler özelliği `?tab=compare` parametresinden çıkarılıp doğrudan bağımsız `/ortak` rotasına taşındı.
- **Next.js 16 Derleme Hatası Çözümü:** `Header.tsx` içindeki `useSearchParams()` çağrısının statik sayfalarda (`/404`) derlemeyi durdurması sorunu, parametre bağımlılığı kaldırılarak çözüldü.

### 📅 Devamsızlık Takibi Yenilikleri
- **İnteraktif Aylık Takvim:** Hafta bazlı sayacın yanına tıklanabilir aylık yoklama takvimi eklendi.
- **Lab / Uygulama Frekans Desteği:** 2 haftada bir yapılan dersler için otomatik hafta hesaplama ve takvimde ders olmayan günleri pasifize etme özelliği getirildi.
- **Çift Yönlü Senkronize Limit Girişi:** Yüzde ve gün limiti girişleri çift taraflı birbirini güncelleyecek şekilde bağlandı.
- **Otomatik Lab Tespiti:** Yüklenen PDF veya fotoğraflardaki Lab/Uygulama dersleri otomatik tespit edilerek ayrı ders kartı olarak bölündü.
