# 🎓 YTÜ Dostun (Yıldız Teknik Üniversitesi Öğrenci Destek Platformu)

YTÜ öğrencilerinin haftalık ders programlarını görselleştirmesi, arkadaş gruplarıyla kampüs müsaitliklerini canlı senkronize etmesi, ortak boş saatleri bulması, devamsızlık takibi yapması, AGNO hesaplaması ve 4 yıllık mezuniyet planlaması gerçekleştirmesini sağlayan hepsi bir arada açık web platformudur.

🌐 **Canlı Site:** [https://ytudostun.com](https://ytudostun.com)

---

## 🚀 Öne Çıkan Modüller & Özellikler

1. **Ders Programı Görselleştirici (`/`):**
   - **Yeni OBS Çıktısı Uyumlu:** `OBS > Ders Programı > Detay Yazdır > Hedef: PDF Olarak Kaydet` (`std_time_table.aspx`) ve eski USIS çıktısını destekleyen hibrit ayrıştırıcı motoru.
   - **Katı PDF Doğrulama:** Geçersiz ve sahte belgelerin anında elenmesi, sıfır uydurma ders.
   - **PNG tEXt Chunk Metadata:** İndirilen PNG'lerin içine program verisi gömülür; yeniden yüklendiğinde 0 ms gecikmeyle geri yüklenir.
   - **Laboratuvar Tespiti:** Sınıfında veya dersinde `LAB` geçen derslere otomatik zarif erlenmayer ikonu rozeti.

2. **Çoklu Arkadaş Lobisi ("Uygun Musun?") (`/uygun-musun`):**
   - 6 haneli kodla oda kurma veya katılma.
   - **Grup Nabzı:** Grupta kimin derste, kimin müsait veya online derste olduğunu canlı sayaçlarla görme.
   - **Çoklu Paralel Çizelge:** Tüm arkadaşların haftalık çizelgelerini alt alta senkronize izleme.
   - **Masa Başı QR Kod Kartı & Tek Tıkla Paylaşım:** `navigator.share` ile yerel WhatsApp/Instagram paylaşımı.
   - **Web Push Bildirimleri:** Erken çıkışlarda ve grup çağrılarında (Broadcast Ping) kilit ekranı bildirimleri.

3. **Cihazlar Arası Senkronizasyon (Device Sync):**
   - **Hızlı Aktarım (QR & 6 Haneli Kod):** WhatsApp Web tarzı 5 dakika ömürlü tek seferlik transfer kodu ve dinamik SVG QR kod ile bilgisayardan telefona anında program aktarımı.
   - **Kalıcı Bulut Yedekleme:** Öğrenci Numarası ve 4 haneli PIN ile bulutta şifreli yedekleme ve geri yükleme.

4. **Ortak Boş Saatler (`/ortak`):**
   - Birden fazla programı üst üste bindirerek tüm grubun ortak boşluklarını renkli ısı matrisiyle tespit etme ($O(1)$ erişimli `busyMap`).

5. **Devamsızlık Takibi (`/devamsizlik`):**
   - Aylık takvim, 2 haftada bir yapılan laboratuvar döngüleri, resmi tatiller ve otomatik yüzde/saat hesaplama.

6. **AGNO Hesaplayıcı & Simülatör (`/agno`):**
   - Transkript PDF'inden AGNO ve krediyi okuma, gelecek dönemler için harf notu senaryoları simüle etme.

7. **Akademik Planlama & Mezuniyet Simülatörü (`/planlama`):**
   - 11 Fakülte, 63 Lisans Programının tam Bologna müfredatı, ön koşul denetimi, 42 AKTS sınırı ve vektörel A4 PDF çıktısı.

---

## 🛠️ Mimari ve Teknolojiler

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide Icons, Next-PWA, Web Push API
- **Backend:** FastAPI (Python 3.10+), Uvicorn, pdfplumber, SQLite3 (WAL modu)
- **Veri Katmanı:** SQLite3 (`ytu_courses.db`, `uygun_musun.db`), Upstash Redis REST API
- **Sunucu & Dağıtım:** AWS EC2 (Ubuntu 22.04 LTS), PM2, Nginx Reverse Proxy (SSL)

---

## 📚 Dokümantasyon

- [KILAVUZ.md](./KILAVUZ.md) — Master Sistem, Mimari, Dizin Haritası ve Dağıtım Protokolü Kılavuzu.
- [FEATURE_PLAN.md](./FEATURE_PLAN.md) — Sürüm bazlı özellik planı, yol haritası ve teknik mimari.
- [changelog.md](./changelog.md) — Sürüm değişiklik geçmişi.
