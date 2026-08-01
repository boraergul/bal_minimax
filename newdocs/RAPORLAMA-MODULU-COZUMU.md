# RAPORLAMA MODÜLÜ ÇÖZÜMÜ

**Versiyon:** 1.0.0  
**Tarih:** 2026-07-29  
**Durum:** Tasarım Taslak  
**Modül:** Raporlama  
**Etki Alanı:** Kurumsal Raporlama, Dashboard, Schedule, Export

---

## 1. Header

| Alan | Değer |
|------|-------|
| Doküman No | SOL-RAP-001 |
| Başlık | Raporlama Modülü Teknik Çözüm Dokümanı |
| Proje | Kuru Meyve-Bal ERP Sistemi |
| Yazarlar | Çözüm Mimar ekibi |
| Onay | Beklemede |

---

## 2. Mevcut Durum

### 2.1 Genel Bakış
Mevcut sistemde raporlama altyapısı minimal düzeydedir. Kullanıcılar manuel olarak Excel çıktıları üretmekte, merkezi bir raporlama platformu bulunmamaktadır. Dashboard veya otomatik rapor yetenekleri yoktur.

### 2.2 Tespit Edilen Sorunlar
- **Eksik KPI Takibi:** Satış, stok, kar marjı gibi temel KPI'lar manuel hesaplanıyor, günlük bazda bile zorlanıyor.
- **Rapor Erişim Zorluğu:** Raporlar e-posta veya dosya paylaşımı ile dağıtılıyor, versiyon karmaşası yaşanıyor.
- **Zamanlı Raporlama Yok:** Haftalık/aylık özet raporları manuel tetikleniyor, unutulma riski yüksek.
- **Export Sınırlılığı:** Sadece CSV export mevcut, PDF ve görsel formatlar desteklenmiyor.
- **Tekrar Eden Emek:** Aynı raporlar farklı kullanıcılar tarafından defalarca oluşturuluyor.

### 2.3 Mevcut Teknoloji
- Veritabanı: PostgreSQL 15
- API: REST (mevcut)
- Raporlama: Manuel SQL sorguları, Excel yardımcı sütunları

---

## 3. Tasarım Hedefleri

### 3.1 Stratejik Hedefler
| # | Hedef | Ölçüt |
|---|-------|-------|
| H-1 | Merkezi raporlama platformu oluşturmak | Tüm raporlar tek arayüzden erişilebilir |
| H-2 | Gerçek zamanlı KPI dashboard'u kurmak | Sayfa yüklendiğinde veriler < 2 saniyede gelsin |
| H-3 | Zamanlı rapor dağıtımı sağlamak | Haftalık/aylık raporlar otomatik e-posta ile gönderilsin |
| H-4 | Çoklu export formatı sunmak | PDF, Excel, CSV, JSON export mevcut olsun |
| H-5 | Self-service raporlama sağlamak | Teknik bilgi gerektirmeden rapor oluşturulabilsin |

### 3.2 Fonksiyonel Kapsam
- **Dashboard:** KPI kartları, grafikler (çizgi, bar, pasta), filtreleme paneli
- **Rapor Tasarımcısı:** Sürükle-bırak ile rapor oluşturma, alan seçimi, gruplama
- **Zamanlı Görevler:** Cron tabanlı rapor oluşturma ve dağıtım
- **Export Motoru:** PDF (JasperReports/PDFMake), Excel (Apache POI), CSV, JSON
- **Yetkilendirme:** Rapor bazında görüntüleme/çalıştırma yetkisi

### 3.3 Kapsam Dışı
- Tam iş zekası (BI) suite entegrasyonu (faz-2)
- Gerçek zamanlı akış (streaming) raporları
- Mobil native uygulama

---

## 4. DB Gereksinimleri

### 4.1 Tablo: `report_definitions`
```sql
CREATE TABLE report_definitions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(64) UNIQUE NOT NULL,
    name            VARCHAR(256) NOT NULL,
    description     TEXT,
    category        VARCHAR(64) NOT NULL,       -- 'SALES', 'INVENTORY', 'FINANCE', 'HR'
    query_template  TEXT NOT NULL,               -- Parametreli SQL veya view adı
    parameters      JSONB DEFAULT '{}',          -- Parametre şeması
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE,
    is_cached       BOOLEAN DEFAULT FALSE,       -- Önbellek aktif mi?
    cache_ttl_min   INTEGER DEFAULT 15          -- Önbellek yaşam süresi (dk)
);

CREATE INDEX idx_report_def_category ON report_definitions(category);
CREATE INDEX idx_report_def_active   ON report_definitions(is_active);
```

### 4.2 Tablo: `report_schedules`
```sql
CREATE TABLE report_schedules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id       UUID REFERENCES report_definitions(id) ON DELETE CASCADE,
    cron_expr       VARCHAR(64) NOT NULL,        -- "0 8 * * 1" = her Pazartesi 08:00
    timezone        VARCHAR(64) DEFAULT 'Europe/Istanbul',
    recipients      JSONB NOT NULL,              -- [{type: 'email', address: '...'}]
    format          VARCHAR(16) NOT NULL,        -- 'PDF', 'XLSX', 'CSV', 'JSON'
    is_active       BOOLEAN DEFAULT TRUE,
    last_run_at     TIMESTAMPTZ,
    last_status     VARCHAR(32),                 -- 'SUCCESS', 'FAILED'
    last_error      TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sched_report ON report_schedules(report_id);
CREATE INDEX idx_sched_active ON report_schedules(is_active);
```

### 4.3 Tablo: `report_execution_log`
```sql
CREATE TABLE report_execution_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id     UUID REFERENCES report_schedules(id),
    report_id       UUID REFERENCES report_definitions(id),
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    status          VARCHAR(32) NOT NULL,        -- 'RUNNING', 'SUCCESS', 'FAILED', 'TIMEOUT'
    row_count       INTEGER,
    file_size_bytes BIGINT,
    error_msg       TEXT,
    triggered_by    VARCHAR(32),                 -- 'SCHEDULE', 'MANUAL', 'API'
    params_used     JSONB
);
```

### 4.4 Tablo: `dashboard_kpis`
```sql
CREATE TABLE dashboard_kpis (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(64) UNIQUE NOT NULL,
    name            VARCHAR(256) NOT NULL,
    description     TEXT,
    data_source     VARCHAR(256) NOT NULL,      -- View veya fonksiyon adı
    refresh_interval_min INTEGER DEFAULT 15,
    format_mask     VARCHAR(32),                -- '#,##0', '₺#,##0.00', '0.00%'
    trend_enabled   BOOLEAN DEFAULT TRUE,
    alert_threshold JSONB,                      -- {"min": 1000, "max": 50000, "warn": 2000}
    display_order   INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE
);
```

### 4.5 Tablo: `dashboard_widgets`
```sql
CREATE TABLE dashboard_widgets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_code  VARCHAR(64) NOT NULL,
    widget_type     VARCHAR(32) NOT NULL,        -- 'KPI_CARD', 'LINE_CHART', 'BAR_CHART', 'PIE_CHART', 'TABLE'
    title           VARCHAR(256),
    data_query      TEXT,
    config          JSONB DEFAULT '{}',         -- {xField, yField, groupBy, limit}
    position_x      INTEGER DEFAULT 0,
    position_y      INTEGER DEFAULT 0,
    width_units     INTEGER DEFAULT 4,           -- Grid genişliği (1-12)
    height_units    INTEGER DEFAULT 3,
    display_order   INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE
);
```

### 4.6 Tablo: `report_favorites`
```sql
CREATE TABLE report_favorites (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    report_id       UUID REFERENCES report_definitions(id) ON DELETE CASCADE,
    default_params  JSONB DEFAULT '{}',
    display_order   INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, report_id)
);
```

---

## 5. API Endpoints

### 5.1 Rapor Yönetimi

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/reports` | Rapor tanımlarını listele |
| GET | `/api/v1/reports/{id}` | Rapor detayı getir |
| POST | `/api/v1/reports` | Yeni rapor tanımı oluştur |
| PUT | `/api/v1/reports/{id}` | Rapor tanımı güncelle |
| DELETE | `/api/v1/reports/{id}` | Rapor tanımı sil (soft delete) |
| GET | `/api/v1/reports/{id}/execute` | Raporu çalıştır (async) |
| GET | `/api/v1/reports/{id}/execute/sync` | Raporu senkron çalıştır |
| GET | `/api/v1/reports/categories` | Rapor kategorilerini listele |

### 5.2 Dashboard API

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/dashboard` | Kullanıcının dashboard'unu getir |
| GET | `/api/v1/dashboard/kpis` | Tüm KPI'ları getir |
| GET | `/api/v1/dashboard/kpis/{code}` | Tekil KPI verisi |
| GET | `/api/v1/dashboard/widgets` | Dashboard widget'larını listele |
| POST | `/api/v1/dashboard/widgets` | Widget ekle |
| PUT | `/api/v1/dashboard/widgets/{id}` | Widget güncelle |
| DELETE | `/api/v1/dashboard/widgets/{id}` | Widget sil |
| PUT | `/api/v1/dashboard/layout` | Dashboard layout'unu kaydet |

### 5.3 Schedule API

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/schedules` | Zamanlı raporları listele |
| GET | `/api/v1/schedules/{id}` | Schedule detayı |
| POST | `/api/v1/schedules` | Zamanlı rapor oluştur |
| PUT | `/api/v1/schedules/{id}` | Zamanlı rapor güncelle |
| DELETE | `/api/v1/schedules/{id}` | Zamanlı rapor sil |
| POST | `/api/v1/schedules/{id}/run` | Hemen çalıştır |
| GET | `/api/v1/schedules/{id}/history` | Çalışma geçmişi |

### 5.4 Export API

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/export/{reportId}` | Raporu export et (query: format, params) |
| POST | `/api/v1/export/batch` | Toplu export isteği oluştur |
| GET | `/api/v1/export/jobs/{jobId}` | Export işi durumunu kontrol et |
| GET | `/api/v1/export/jobs/{jobId}/download` | Export dosyasını indir |

### 5.5 Endpoint Detayları

#### POST `/api/v1/reports/{id}/execute`
**Request:**
```json
{
  "params": {
    "date_from": "2026-01-01",
    "date_to": "2026-07-29",
    "warehouse_id": "uuid",
    "region": "Marmara"
  },
  "format": "XLSX",
  "async": true
}
```
**Response (async):**
```json
{
  "job_id": "uuid",
  "status": "QUEUED",
  "estimated_time_sec": 30,
  "status_url": "/api/v1/export/jobs/{job_id}"
}
```

#### GET `/api/v1/dashboard/kpis`
**Response:**
```json
{
  "kpis": [
    {
      "code": "SALES_TODAY",
      "name": "Bugünkü Satış",
      "value": 125430.50,
      "formatted": "₺125,430.50",
      "trend": "+12.5%",
      "trend_direction": "up",
      "last_updated": "2026-07-29T14:32:00Z",
      "alert": null
    },
    {
      "code": "STOCK_ALERT",
      "name": "Kritik Stok",
      "value": 23,
      "formatted": "23 ürün",
      "trend": "+3",
      "trend_direction": "down",
      "last_updated": "2026-07-29T14:30:00Z",
      "alert": {"level": "WARN", "message": "23 ürün kritik stok seviyesinde"}
    }
  ]
}
```

---

## 6. İş Kuralları

### 6.1 Genel Kurallar
| Kural | Açıklama |
|-------|----------|
| IK-01 | Tüm raporlar en az bir kategori ile ilişkilendirilmelidir |
| IK-02 | Rapor çalıştırma yetkisi, rapor tanımında tanımlanan görüntüleme yetkisinden ayrıdır |
| IK-03 | Async raporlar 5 dakika超时 süresine tabidir |
| IK-04 | Export dosyaları 7 gün sonra otomatik silinir |
| IK-05 | Her kullanıcı kendi favorilerini yönetebilir |
| IK-06 | Sistem raporları (id < 1000) sadece admin silebilir |

### 6.2 KPI ve Dashboard Kuralları
| Kural | Açıklama |
|-------|----------|
| DK-01 | KPI değerleri arka planda periyodik olarak yenilenir, dashboard sayfası her açıldığında fresh veri çekmez |
| DK-02 | Kritik eşik (alert) aşıldığında dashboard'da görsel uyarı (kırmızı border, ikon) gösterilir |
| DK-03 | Trend hesaplaması: (bu_dönem - geçen_dönem) / geçen_dönem * 100 |
| DK-04 | Widget pozisyonları grid sistemine göre (12 kolon) hesaplanır |
| DK-05 | KPI cache süresi default 15 dakikadır, kritik KPI'lar için 5 dakikaya düşürülebilir |

### 6.3 Schedule Kuralları
| Kural | Açıklama |
|-------|----------|
| SK-01 | Cron ifadesi validasyonu server tarafında yapılır (JavaScript cron-parser) |
| SK-02 | Schedule silindiğinde gelecekteki tüm tetiklemeler iptal edilir |
| SK-03 | Başarısız schedule tekrar deneme: 3 kere, 15 dakika aralıklarla |
| SK-04 | Aynı rapor için aynı anda sadece 1 schedule çalışabilir |
| SK-05 | Schedule logları 90 gün saklanır |

### 6.4 Export Kuralları
| Kural | Açıklama |
|-------|----------|
| EK-01 | PDF export: A4 boyut, Türkçe font desteği (DejaVu Sans), header/footer |
| EK-02 | Excel export: Frozen row (başlık), auto-filter, column width auto-fit |
| EK-03 | CSV export: UTF-8 BOM, virgül ayracı, tırnak karakterleri escaped |
| EK-04 | JSON export: Pretty-print 2 space indent |
| EK-05 | Batch export: Maksimum 10 rapor tek seferde |
| EK-06 | Export dosya boyutu > 50MB ise sıkıştırılmış (zip) olarak sunulur |

---

## 7. Durum Makinesi

### 7.1 Rapor Tanımı Durumları
```
[DRAFT] ---publish---> [ACTIVE] ---deactivate---> [INACTIVE]
                         |                           |
                         +---delete (soft)------------+
```

| Durum | Açıklama |
|-------|----------|
| DRAFT | Rapor tanımlandı ama kullanıma açılmadı |
| ACTIVE | Kullanıma açık, çalıştırılabilir |
| INACTIVE | Pasif, geçmişte kullanılmış ama şu an kapalı |

### 7.2 Rapor Çalıştırma Durumları
```
[PENDING] ---> [RUNNING] ---> [SUCCESS]
                   |              |
                   +--retry(3x)--+
                   |
                   +---> [FAILED]
                   |
                   +---> [TIMEOUT] (5dk)
```

| Durum | Açıklama |
|-------|----------|
| PENDING | Kuyrukta bekliyor |
| RUNNING | Çalışıyor |
| SUCCESS | Tamamlandı, dosya hazır |
| FAILED | Hata oluştu, tüm denemeler başarısız |
| TIMEOUT | 5 dakika aşıldı |

### 7.3 Schedule Durumları
```
[ACTIVE] ---pause---> [PAUSED] ---resume---> [ACTIVE]
    |                                        |
    +------------delete----------------------+
```

| Durum | Açıklama |
|-------|----------|
| ACTIVE | Tetikleme aktif |
| PAUSED | Geçici olarak durduruldu |
| DELETED | Tamamen silindi (fizsel) |

---

## 8. Acceptance Criteria

### 8.1 Dashboard ve KPI
- [ ] AC-01: Kullanıcı dashboard'a girdiğinde en az 6 KPI kartı görüntülenir
- [ ] AC-02: KPI kartında değer, trend (yüzde ve yön), son güncelleme zamanı gösterilir
- [ ] AC-03: Kritik eşik aşımında kart kırmızı kenarlık ve uyarı ikonu gösterir
- [ ] AC-04: Dashboard widget'ları sürükle-bırak ile yeniden konumlandırilebilir
- [ ] AC-05: Dashboard layout'u kullanıcı bazında persist edilir
- [ ] AC-06: KPI verileri sayfa yüklendiğinde < 2 saniyede gösterilir (cache'li)

### 8.2 Rapor Çalıştırma
- [ ] AC-07: Kullanıcı rapor çalıştırdığında parametre validasyonu yapılır
- [ ] AC-08: Async çalıştırma seçildiğinde job_id döner, durumu sorgulanabilir
- [ ] AC-09: Rapor çalıştırma 5 dakika içinde tamamlanmazsa timeout olur
- [ ] AC-10: Başarısız rapor en fazla 3 kez retry edilir

### 8.3 Zamanlı Raporlar (Schedule)
- [ ] AC-11: Kullanıcı cron ifadesi girerek schedule oluşturabilir
- [ ] AC-12: Schedule tetiklendiğinde tüm alıcılara e-posta gönderilir
- [ ] AC-13: Schedule geçmişi (son_run_at, status, row_count) görüntülenebilir
- [ ] AC-14: Schedule duraklatıldığında tetikleme yapılmaz, devam ettirilince kaldığı yerden devam eder

### 8.4 Export
- [ ] AC-15: PDF export Türkçe karakterleri doğru gösterir
- [ ] AC-16: Excel export açıldığında başlık satırı frozen'dır
- [ ] AC-17: CSV export UTF-8 BOM ile başlar
- [ ] AC-18: 50MB üzeri dosyalar zip olarak sunulur
- [ ] AC-19: Export dosyaları 7 gün sonra otomatik silinir

### 8.5 Yetkilendirme
- [ ] AC-20: Rapor tanımı görüntüleme yetkisi kullanıcı rolüne göre kontrol edilir
- [ ] AC-21: Kullanıcı sadece kendi favorilerini görebilir/düzenleyebilir
- [ ] AC-22: Admin olmayan kullanıcı sistem raporlarını silemez

### 8.6 Performans
- [ ] AC-23: Dashboard KPI fetch < 500ms (cache hit)
- [ ] AC-24: Basit rapor (tek tablo) < 3 saniyede tamamlanır
- [ ] AC-25: Kompleks rapor (join x5) < 30 saniyede tamamlanır

---

## 9. Teknik Notlar

### 9.1 Önerilen Teknolojiler
- **Backend:** Node.js/Express veya Python/FastAPI
- **Job Queue:** Bull (Redis-backed) veya Celery (Redis)
- **PDF:** PDFMake veya Puppeteer (headless Chrome)
- **Excel:** Apache POI veya ExcelJS
- **Cron:** node-cron veya sistem cron
- **Cache:** Redis (KPI değerleri, rapor sonuçları)
- **Scheduling:** Quartz.NET (veya node-cron)

### 9.2 Güvenlik
- Tüm API'ler JWT ile korunur
- Rapor SQL injection korumalı (parametreli sorgular)
- Büyük export dosyaları signed URL ile sunulur (15 dk geçerli)

### 9.3 Ölçeklendirme
- 100 eşzamanlı kullanıcı hedefi (faz-1)
- Rapor worker'ları ayrı container'da (auto-scale)
- Read replica kullanımı rapor sorguları için
