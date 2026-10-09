# YTÜ Görselleştirici - Geliştirici & Dağıtım Kılavuzu

Bu kılavuz, projenin güncel teknik durumunu, Git iş akışını ve Amazon (AWS) sunucusunda canlıya alma (deployment) süreçlerini özetler.

---

## 1. Sitenin Güncel Hali (Mimari)

Proje, gereksiz sosyal özelliklerden (WhatsApp grupları vb.) tamamen arındırılmış, "yalın ve amaca hizmet eden" (lean) bir Ders Programı Görselleştirici olarak çalışmaktadır.

- **Frontend (Arayüz):** 
  - `Next.js` (React) ve `Tailwind CSS` kullanılmıştır. 
  - Ders programı dışa aktarımı için `html-to-image` kütüphanesi kullanılır.
  - Ders tablosunda ders kodlarının yanına **YTÜ Hocalar (ytuhocalar.com.tr)** platformuna yönlendiren `MessageCircle` butonu eklenmiştir.
  - Başlatma komutu: `npm run dev`

- **Backend (Sunucu):** 
  - `FastAPI` (Python) üzerine kuruludur.
  - Öğrencilerin yüklediği USIS PDF'lerini ayrıştırır (parse eder).
  - Hoca isimlerini kendi içindeki `courses.db` (SQLite) veritabanından çekerek programla eşleştirir.
  - Başlatma komutu: `python -m uvicorn main:app --reload`

---

## 2. Versiyon Kontrolü ve Push İşlemleri (Git)

Geliştirme süreci Github üzerinden yönetilmektedir. Aktif ve kararlı kod **`main`** branch'inde (dalında) tutulur.

**Yerelde (Local) yapılan bir değişikliği Github'a göndermek için:**

```bash
# 1. Yapılan tüm değişiklikleri ekle
git add .

# 2. Değişiklikleri açıklayıcı bir mesajla kaydet
git commit -m "YTU Hocalar butonu eklendi, 20:00 satiri kaldirildi"

# 3. Değişiklikleri Github'daki main branch'ine yolla
git push origin main
```

*(Not: Deneysel veya büyük özellikler eklerken `git checkout -b feature/yeni-ozellik` ile yeni bir branch açılması tavsiye edilir.)*

---

## 3. Amazon (AWS) Sunucusunda Aktif Etme (Deployment)

Projenin Github'a pushlanan güncel kodlarının AWS (EC2) sunucusuna çekilip canlıya alınması için standart adımlar şunlardır:

### Adım 3.1: Sunucuya Bağlanma
Terminalinizden AWS sunucunuza (EC2 instance) SSH ile bağlanın:
```bash
ssh -i "sertifikaniz.pem" ubuntu@ec2-ip-adresiniz.compute.amazonaws.com
```

### Adım 3.2: Güncel Kodu Sunucuya Çekme
Sunucudaki proje klasörüne gidin ve Github'daki en son kodları (main branch'ten) çekin:
```bash
cd /var/www/ytu-gorsellestirici  # Veya projeniz sunucuda hangi klasördeyse
git pull origin main
```

### Adım 3.3: Backend'i Güncelleme ve Yeniden Başlatma
Eğer backend (Python) tarafında bir değişiklik yaptıysanız veya yeni kütüphane eklediyseniz:
```bash
cd backend
source venv/bin/activate  # Sanal ortamı aktif edin (varsa)
pip install -r requirements.txt  # Yeni kütüphane varsa kurun
sudo systemctl restart fastapi-backend  # Veya Gunicorn/Uvicorn servisini yeniden başlatın
```

### Adım 3.4: Frontend'i Güncelleme ve Yeniden Başlatma
Eğer frontend (Next.js) tarafında bir değişiklik yaptıysanız:
```bash
cd ../frontend
npm install  # Yeni bir paket (örn: lucide-react) eklendiyse
npm run build  # Next.js projesini production için derle
pm2 restart frontend  # Veya frontend uygulamanızı yöneten servis (PM2 vb.) ile yeniden başlatın
```

### Özet Canlıya Alma Akışı
Her şeyi tek bir satırda hızlıca güncellemek için sunucuda şu komut zincirini kullanabilirsiniz:
`git pull && cd frontend && npm run build && pm2 restart all && sudo systemctl restart fastapi-backend`

---
*Bu doküman, sistemin en son "yalın" (Görselleştirici Odaklı) vizyonuna göre oluşturulmuştur.*
