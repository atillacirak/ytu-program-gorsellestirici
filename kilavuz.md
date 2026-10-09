# YTÜ Dostun - Geliştirici & Dağıtım Kılavuzu

Bu kılavuz, projenin güncel teknik durumunu, mimarisini, Git iş akışını ve AWS (Amazon EC2) sunucusunda canlıya alma (deployment) süreçlerini özetler.

---

## 1. Sitenin Güncel Hali ve Modülleri

YTÜ Dostun; YTÜ öğrencilerinin ders programlarını, notlarını, ortak boş saatlerini ve devamsızlıklarını güvenle yönettiği modern, modüler ve yüksek performanslı bir platformdur.

### 📌 Modüller ve Sayfalar
1. **Ders Programı Görselleştirici (`/`):**
   - USIS PDF veya hazırlık programını A4 formatında modern bir haftalık çizelgeye dönüştürür.
   - **Tembel Yükleme (Lazy Load):** Binlerce satırlık hazırlık JSON verisi (`prepSchedules.json`) sadece ihtiyaç duyulduğunda istemciye dinamik indirilir; ilk açılış hızı maksimize edilmiştir.
   - **Modüler Mimari:** Devasa `page.tsx`, 4 bağımsız bileşene bölünmüştür (`UploadScreen`, `ScheduleTable`, `CourseSummaryTable`, `EditCourseModal`).
   - **Kalıcı Yerel Hafıza (LocalStorage):** Kullanıcının yüklediği program, aldığı ders notları, hoca/şube/not filtreleri, yazı tipi boyutu ve görünüm modu `useLocalStorageState` kancasıyla tarayıcıda saklanır. Sayfa yenilendiğinde (F5) veya kapatılıp açıldığında her şey anında geri yüklenir.
   - **Modüller Arası Tek Tıkla Aktarım:**
     - 🟢 **Devamsızlığa Gönder:** Programdaki dersleri günleriyle ve Teori/Lab ayrımıyla tek tıkla `/devamsizlik` sayfasına aktarır (0 ms ağ gecikmesi).
     - 🟣 **AGNO'ya Gönder:** Dersleri tek tıkla `/agno` sayfasına aktarır ve kredileri otomatik veritabanından eşler.
   - PNG indirme (metadata gömülü) ve doğrudan yazdırma desteği.

2. **Ortak Boş Saatler (`/ortak`):**
   - Arkadaş gruplarının PDF veya fotoğraflarını yükleyerek ortak boş zamanlarını bulduğu sistem.
   - **Yüksek Performans:** O(N³) hücre hesaplamaları tek bir `useMemo` ve O(1) erişimli `busyMap` hash haritasına optimize edilmiştir.
   - Özel URL'i (`/ortak`) ile doğrudan erişilebilir.

3. **Devamsızlık Takibi (`/devamsizlik`):**
   - İnteraktif aylık takvim arayüzü ile gün bazlı yoklama kaydı (Gittim / Devamsız / Tatil).
   - Laboratuvar ve uygulama dersleri için frekans desteği (2 haftada bir vb. dersler için otomatik hafta hesaplama).
   - Çift yönlü senkronize limit & yüzde girdileri (Limit yazıldığında yüzde, yüzde yazıldığında limit anında hesaplanır).
   - Teori ve Lab dersleri için çakışmasız benzersiz ID mimarisi.

4. **AGNO Hesaplayıcı (`/agno`):**
   - USIS transkriptinden veya ders programından dersleri çekip gelecek dönem not senaryoları üretme.
   - Ders kodlarına göre SQLite tabanından otomatik kredi tamamlama.

5. **İstatistikler (`/stats`):**
   - Upstash Redis tabanlı anlık sayaçlar.
   - Dönemsel yüzdelik değişim trendleri (+/- % oranları).
   - Saf Tailwind CSS ile yazılmış, hafif ve gerçek zamanlı ziyaretçi aktivite bar grafiği.

---

## 2. Mimari ve Bileşen Düzeni

```
frontend/src/
├── app/
│   ├── page.tsx               # Ana Görselleştirici (Modüler & useLocalStorageState)
│   ├── ortak/page.tsx         # Ortak Boş Saatler Sayfası
│   ├── devamsizlik/page.tsx   # Devamsızlık Takibi ve Aylık Takvim
│   ├── agno/page.tsx          # AGNO / Not Hesaplayıcı
│   └── stats/page.tsx         # İstatistikler, Trend Yüzdeleri & Grafik
├── components/
│   ├── UploadScreen.tsx       # Belge yükleme ve Hazırlık sınıfı seçim ekranı
│   ├── ScheduleToolbar.tsx    # Üst yönetim paneli, filtreler ve aktarım araçları
│   ├── ScheduleTable.tsx      # A4 Çizelge tablosu ve ders hücreleri
│   ├── CourseSummaryTable.tsx # Ders listesi ve derslik özet tablosu
│   ├── EditCourseModal.tsx    # Ders düzenleme ve not ekleme modalı
│   ├── CompareView.tsx        # Ortak boş saatler matrisi ve kartları
│   └── Header.tsx             # Genel üst navigasyon çubuğu
├── hooks/
│   └── useLocalStorageState.ts# Tarayıcı hafızasını reaktif yöneten özel hook
└── utils/
    ├── pngMetadata.ts         # PNG görsellerine program JSON'u gömme/çıkarma
    └── instructors.ts         # Hoca adları ve kısaltma eşleştiricisi
```

---

## 3. Versiyon Kontrolü (Git)

Kodlar GitHub üzerindeki `main` branch'inde toplanır.

```bash
# Değişiklikleri ekle ve pushla
git add .
git commit -m "feat: Açıklayıcı commit mesajı"
git push origin main
```

---

## 4. Amazon (AWS) Sunucusunda Canlıya Alma (Deployment)

Sunucu Bilgileri:
- **IP:** `63.186.15.196` (veya `ytudostun.com`)
- **Kullanıcı:** `ubuntu`
- **SSH Anahtarı:** `kiribot-key.pem`
- **Proje Dizini:** `~/ytu-dostun`
- **Servis Yöneticisi:** `PM2` (`ytu-frontend`, `ytu-backend`, `kiribot`)

### Hızlı Dağıtım Komutu (Tek Satır):
Yerel terminalinizden doğrudan sunucuya göndermek için:

```powershell
ssh -o StrictHostKeyChecking=no -i "C:\Projeler\kiribot-key.pem" ubuntu@63.186.15.196 "cd ~/ytu-dostun && git pull origin main && rm -rf frontend/.next/cache && rm -rf ~/.npm/_cacache && cd frontend && npm install && npm run build && pm2 restart all && cd ../backend && source venv/bin/activate && pip install -r requirements.txt && pm2 restart ytu-backend"
```

### Sunucu İçinden Manuel Dağıtım:
```bash
# 1. Sunucuya bağlan
ssh -i "kiribot-key.pem" ubuntu@63.186.15.196

# 2. Kodları çek
cd ~/ytu-dostun
git pull origin main

# 3. Frontend derle ve PM2 restart
cd frontend
npm install
npm run build
pm2 restart ytu-frontend

# 4. Backend güncelle ve yeniden başlat
cd ../backend
source venv/bin/activate
pip install -r requirements.txt
pm2 restart ytu-backend
```
