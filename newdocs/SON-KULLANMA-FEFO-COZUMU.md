# Son Kullanma + FEFO Yönetimi Çözüm Tasarımı

**Versiyon:** 1.0  
**Tarih:** 2026-07-29  
**Durum:** TASLAK — Mimari kararları kapatıldı; uygulama onayı bekleniyor  
**İlgili Boşluk:** GAP-Analiz 1.2.5 — "Son Kullanma Yönetimi Yüzeysel" (Orta Düzey)

---

## 1. Mevcut Durum

### 1.1 Mevcut Sistem Davranışı

GAP raporu (§1.2.5) tespitlerine göre mevcut durum:

| Eksiklik | Mevcut Davranış | Risk |
|----------|----------------|------|
| Son kullanma tarihi geçmiş lotların otomatik işlemi yok | Süresi geçen lotlar `AKTIF` durumunda kalır, manuel müdahale gerektirir | Gıda güvenliği ihlali, yasal risk |
| Son kullanma yaklaşan uyarı eşiği dinamik değil | Eşik sistem ayarı olarak sabit gün sayısı; ürün bazlı değil | Bazı ürünler yanlış uyarı verir |
| FEFO ile FIFO öncelik sırası belirsiz | SRS'de hem FIFO hem FEFO geçiyor; hangisinin önce geldiği tanımsız | İzlenebilirlik zinciri belirsizliği |

### 1.2 İlgili Mevcut Veritabanı Yapıları

**`stok_karti` tablosu — ilgili alanlar:**

| Alan | Tip | Açıklama |
|------|-----|----------|
| `stok_id` | UUID | PK |
| `son_kullanma` | DATE | Lot son kullanma tarihi |
| `durum` | VARCHAR(20) | `AKTIF`, `BITTI`, `IPTAL`, `KALITE_KONTROL`, `DEPO_DISI`, `RET` |
| `uretim_tarihi` | DATE | Üretim tarihi |
| `giris_tarihi` | TIMESTAMP | Stoka giriş tarihi |

**`stok_hareketleri` tablosu — ilgili alanlar:**

| Alan | Tip | Açıklama |
|------|-----|----------|
| `fifo_ihlal_edildi` | BOOLEAN | FIFO kuralı ihlal edildi mi? |
| `fifo_ihlal_nedeni` | TEXT | İhlal nedeni (manuel onay vb.) |

**Mevcut durum enum değerleri (`stok_karti.durum`):**
`AKTIF` → stok mevcut ve kullanılabilir  
`BITTI` → lot tamamen tükendi  
`IPTAL` → manuel iptal edilmiş  
`KALITE_KONTROL` → kalite kontrolde  
`DEPO_DISI` → fiziksel olarak depodan çıkmış (satılmış/transfer)  
`RET` → kalite kontrol reddetmiş

> **Tamamlanan durum genişletmesi:** `SON_KULLANIM_GECDI`, `SON_KULLANIM_RISKLI` ve `SON_KULLANIM_ISLEM_GECICI` kanonik değerleri veri sözlüğüne eklenmiştir.

---

## 2. Önerilen Çözüm

### 2.1 Temel Strateji

**FEFO + FIFO Hibrit Kuralı:**

```
Öncelik 1 (En Yüksek): SON_KULLANIM_GECDI → Bloke; çıkışa seçilmez
Öncelik 2: SON_KULLANIM_RISKLI (eşik günü içinde) → Zorunlu FEFO
Öncelik 3: Normal stok (son kullanım > eşik) → FIFO (giriş sırası)
```

**Temel ilkeler:**
1. **Son kullanma tarihi geçmiş lotlar** — kesinlikle satışa/üretime verilemez. Otomatik `SON_KULLANIM_GECDI` durumuna geçer ve işlem bekler.
2. **Son kullanma yaklaşan lotlar** — FEFO öncelikli; sistem uyarı verir ama bloklamaz (yönetici onayı ile satılabilir).
3. **Normal lotlar** — FIFO (stoka giriş sırası) ile çıkış yapılır.
4. **Üretim çıkışı** — her zaman mevcut en eski lot(lar)dan yapılır (FEFO-FIFO hibriti).

### 2.2 Yeni Stok Durumları

`stok_karti.durum` enum değerlerine eklenir:

| Yeni Değer | Açıklama | Otomatik Tetiklenir mi? |
|------------|----------|------------------------|
| `SON_KULLANIM_GECDI` | Son kullanma tarihi geçmiş lot | ✓ (scheduled job) |
| `SON_KULLANIM_RISKLI` | Son kullanma uyarı eşiğine yaklaşmış (≤ `SKT_uyari_gun` gün) | ✓ (scheduled job) |
| `SON_KULLANIM_ISLEM_GECICI` | Geçmiş lot için işlem bekleniyor (imha/indirim/devir) | ✗ (manuel) |

> Mevcut `AKTIF`, `BITTI`, `IPTAL`, `KALITE_KONTROL`, `DEPO_DISI`, `RET` değerleri korunur.

### 2.3 Otomatik Son Kullanma İşleme Akışı

```
┌─────────────────────────────────────────────────────────────┐
│  SCHEDULED JOB: skt_kontrol_job (her 24 saat, 02:00'de)    │
│  Cron: 0 2 * * *                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        Günlük SKT kontrolü başlar
        (son_kullanma < CURRENT_DATE) → SON_KULLANIM_GECDI
        (son_kullanma <= CURRENT_DATE + SKT_UYARI_GUN) → SON_KULLANIM_RISKLI
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
   Geçmiş lot bulundu           Riskli lot bulundu
   (durum değişikliği)         (uyarı oluşturulur,
   Bildirim gönderilir          stok durumu değişmez)
          │
          ▼
   Yönetici işlem bekler:
   [İmha Et] / [İndirimli Satış] / [Depodan Çıkar] / [Devir]
          │
   ┌──────┴──────────────────┐
   │  İşlem seçimi           │
   ├─────────────────────────┤
   │ İmha Et → SON_KULLANIM_GECDI olarak işaretlenir,  │
   │           stok_karti.miktar = 0, fire kaydı oluşur  │
   │ İndirimli Satış → %X indirimli satış onayı gerek   │
   │ Depodan Çıkar → DEPO_DISI durumu + manuel açıklama │
   │ Devir → Başka ürüne/devlete devir kaydı             │
   └─────────────────────────┘
```

### 2.4 FEFO Öncelik Sırası — Lot Seçim Algoritması

Stok çıkışında (satış veya üretim) lot seçim sırası:

```python
def lot_secim_sirasi(urun_id, miktar):
    """
    Dönüş: Ordered list of (stok_id, lot_no, mevcut_miktar)
    Sıralama önceliği:
      1. SON_KULLANIM_GECDI → seçilemez (bloke)
      2. SON_KULLANIM_RISKLI → FEFO ile (skla_date ASC)
      3. Normal AKTIF → FIFO ile (giris_tarihi ASC)
    """
    # Not: sorgu 3 ayrı parça olarak çalışır, UNION ALL ile birleştirilir
    # Önce riskliler (FEFO), sonra normal (FIFO)
```

**SQL mantığı (satış çıkışı için):**

```sql
-- Önce SON_KULLANIM_GECDI olmayan, son kullanma tarihine göre FEFO
WITH uygun_lotlar AS (
    SELECT
        sk.stok_id,
        sk.lot_no,
        sk.miktar,
        sk.son_kullanma,
        sk.giris_tarihi,
        sk.durum,
        CASE
            WHEN sk.durum = 'SON_KULLANIM_RISKLI' THEN 1  -- FEFO öncelik
            WHEN sk.durum = 'AKTIF' THEN 2                -- FIFO sonra
            ELSE 99                                         -- GECDI vs. diğerleri seçilemez
        END AS oncelik_grubu
    FROM stok_karti sk
    WHERE sk.urun_id = :urun_id
      AND sk.durum NOT IN ('SON_KULLANIM_GECDI', 'BITTI', 'IPTAL', 'DEPO_DISI', 'RET')
      AND sk.miktar > 0
)
SELECT *
FROM uygun_lotlar
ORDER BY oncelik_grubu ASC,
         CASE WHEN oncelik_grubu = 1 THEN son_kullanma END ASC,   -- FEFO
         CASE WHEN oncelik_grubu = 2 THEN giris_tarihi END ASC;   -- FIFO
```

---

## 3. Veritabanı Değişiklikleri

### 3.1 Tablo: `stok_karti` — Yeni Durum Değerleri

```sql
-- Mevcut durum enum'ına yeni değerler eklenir (PostgreSQL)
ALTER TYPE stok_durumu_enum ADD VALUE IF NOT EXISTS 'SON_KULLANIM_GECDI';
ALTER TYPE stok_durumu_enum ADD VALUE IF NOT EXISTS 'SON_KULLANIM_RISKLI';
ALTER TYPE stok_durumu_enum ADD VALUE IF NOT EXISTS 'SON_KULLANIM_ISLEM_GECICI';
```

> PostgreSQL ENUM'a `ADD VALUE` migration için `ALTER TYPE ... ADD VALUE` kullanılır.
> Bu bir breaking change sayılmaz — mevcut kodlar yeni değerleri görmezden gelir.

### 3.2 Tablo: `skt_islem_tipi` — Yeni Enum

```sql
CREATE TYPE skt_islem_tipi AS ENUM (
    'IMHA',
    'INDIRIMLI_SATIS',
    'DEPO_DISI_CIKIS',
    'DEVIR'
);
```

### 3.3 Tablo: `skt_islemleri` — Yeni Tablo (Eklenmeli)

```sql
CREATE TABLE skt_islemleri (
    islem_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    stok_id           UUID        NOT NULL REFERENCES stok_karti(stok_id),
    islem_tipi        skt_islem_tipi NOT NULL,
    islem_tarihi      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    onceki_durum      VARCHAR(20) NOT NULL,
    yeni_durum        VARCHAR(20) NOT NULL,
    miktar_islem      DECIMAL(15,3),         -- İmha ise 0, kısmi ise miktar
    indirim_orani     DECIMAL(5,2),          -- İndirimli satış ise %
    aciklama          TEXT,
    onay_ust_kullanici_id  UUID    REFERENCES kullanicilar(kullanici_id),
    olusturma_tarihi  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    olusturan_kullanici_id UUID   NOT NULL REFERENCES kullanicilar(kullanici_id)
);

COMMENT ON TABLE skt_islemleri IS 'Son kullanma tarihi geçmiş lotların otomatik işlem kaydı';
CREATE INDEX idx_skt_islemleri_stok_id ON skt_islemleri(stok_id);
CREATE INDEX idx_skt_islemleri_islem_tipi ON skt_islemleri(islem_tipi);
```

### 3.4 Tablo: `skt_uyari_esikleri` — Yeni Tablo (Eklenmeli)

Ürün bazlı dinamik SKT uyarı eşiklerini saklar. Boş satır = sistem varsayılanını kullan.

```sql
CREATE TABLE skt_uyari_esikleri (
    esik_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    urun_id       UUID        NOT NULL REFERENCES urunler(urun_id),
    uyari_gun     INTEGER     NOT NULL,  -- Son kullanmadan kaç gün önce uyarı
    uyari_seviyesi VARCHAR(10) NOT NULL DEFAULT 'RISKLI',
    -- 'RISKLI' = SON_KULLANIM_RISKLI durumu,  'BILGI' = sadece bildirim
    aktif         BOOLEAN     NOT NULL DEFAULT TRUE,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT skt_uyari_esikleri_urun_unique EXCLUDE (urun_id WITH =) WHERE (aktif = TRUE)
);

COMMENT ON TABLE skt_uyari_esikleri IS 'Ürün bazlı dinamik SKT uyarı gün eşikleri. Boş = sistem varsayılanı (30 gün) kullanılır.';
```

### 3.5 Tablo: `sistem_ayarlari` — Yeni Satır (Eklenmeli)

Mevcut `sistem_ayarlari` tablosuna yeni ayar satırı:

```sql
-- Sistem varsayılan SKT uyarı gün sayısı (ürün bazlı tanım yoksa kullanılır)
INSERT INTO sistem_ayarlari (ayar_adi, deger, veri_tipi, kategori, aciklama)
VALUES
    ('SKT_UYARI_GUN', '30', 'INTEGER', 'GENEL',
     'Son kullanma tarihinden kaç gün önce uyarı başlatılacağı (varsayılan)');
```

### 3.6 Tablo: `stok_hareketleri` — Yeni Alanlar

```sql
ALTER TABLE stok_hareketleri
    ADD COLUMN son_kullanim_tarihi DATE GENERATED ALWAYS AS (NULL) STORED;  -- placeholder, aslında stok_karti'den çekilir
    -- NOT: Bu alan physical olarak eklenmez; raporlama için VIEW oluşturulur.
```

> Hareket tablosuna fiziksel alan eklenmez. `son_kullanma` bilgisi raporlama sırasında `stok_karti` ile JOIN edilerek alınır.

### 3.7 Yeni İndeksler

```sql
-- FEFO lot seçimi için kritik indeks (urun_id + durum + son_kullanma)
CREATE INDEX idx_stok_karti_fefo
    ON stok_karti(urun_id, durum, son_kullanma ASC)
    WHERE durum NOT IN ('SON_KULLANIM_GECDI', 'BITTI', 'IPTAL', 'DEPO_DISI', 'RET');

-- FIFO lot seçimi için kritik indeks (urun_id + durum + giris_tarihi)
CREATE INDEX idx_stok_karti_fifo
    ON stok_karti(urun_id, durum, giris_tarihi ASC)
    WHERE durum = 'AKTIF';

-- SKT geçmiş lotların hızlı tespiti için
CREATE INDEX idx_stok_karti_skt_gecmis
    ON stok_karti(son_kullanma)
    WHERE durum NOT IN ('SON_KULLANIM_GECDI', 'SON_KULLANIM_RISKLI', 'BITTI', 'IPTAL', 'DEPO_DISI', 'RET');
```

---

## 4. API Endpoint Tasarımı

### 4.1 FEFO Öncelikli Lot Önerisi

**Endpoint:** `GET /api/v1/stok/skt/lot-onerisi`

**Query Parameters:**

| Param | Tip | Zorunlu | Açıklama |
|-------|-----|---------|----------|
| `urun_id` | UUID | ✓ | Ürün ID |
| `miktar` | DECIMAL | ✓ | İstenen miktar |
| `hareket_tipi` | string | ✓ | `SATIS_CIKIS`, `URETIM_CIKIS`, `TRANSFER`, `SON_KULLANIM_CIKIS` |

**Response (200 OK):**

```json
{
  "oneri_id": "uuid",
  "urun_id": "uuid",
  "toplam_miktar": 50.0,
  "kullanilabilir_miktar": 50.0,
  "lot_onerileri": [
    {
      "sira": 1,
      "stok_id": "uuid",
      "lot_no": "LOT-20260601-001",
      "mevcut_miktar": 20.0,
      "son_kullanma": "2026-08-15",
      "durum": "SON_KULLANIM_RISKLI",
      "oncelik_nedeni": "FEFO: son kullanma yaklaşıyor",
      "kullanimal_miktar": 20.0
    },
    {
      "sira": 2,
      "stok_id": "uuid",
      "lot_no": "LOT-20260610-002",
      "mevcut_miktar": 30.0,
      "son_kullanma": "2026-09-01",
      "durum": "AKTIF",
      "oncelik_nedeni": "FIFO: giriş sırası",
      "kullanimal_miktar": 30.0
    }
  ],
  "fifo_ihlal_edildi": false,
  "uyarilar": []
}
```

**Uyarı örneği (FIFO ihlal varsa):**

```json
{
  "oneri_id": "uuid",
  "fifo_ihlal_edildi": true,
  "uyarilar": [
    {
      "kod": "FEFO_UYARI",
      "mesaj": "Son kullanma tarihi yaklaşan lotlar öncelikli olarak seçildi (FEFO kuralı).",
      "seviye": "UYARI"
    }
  ]
}
```

### 4.2 Son Kullanma Durumu Raporu

**Endpoint:** `GET /api/v1/stok/skt/rapor`

**Query Parameters:**

| Param | Tip | Zorunlu | Açıklama |
|-------|-----|---------|----------|
| `durum` | string | Hayır | `HEPSİ`, `GECDI`, `RISKLI` (varsayılan: `HEPSİ`) |
| `urun_id` | UUID | Hayır | Filtrele: belirli ürün |
| `son_kullanma_baslangic` | DATE | Hayır | Filtrele: son kullanma ≥ bu tarih |
| `son_kullanma_bitis` | DATE | Hayır | Filtrele: son kullanma ≤ bu tarih |

**Response (200 OK):**

```json
{
  "ozet": {
    "toplam_lot_sayisi": 15,
    "toplam_miktar_kg": 450.0,
    "gecen_lot_sayisi": 2,
    "riskli_lot_sayisi": 5,
    "normal_lot_sayisi": 8
  },
  "lotlar": [
    {
      "stok_id": "uuid",
      "lot_no": "LOT-20260601-001",
      "urun_ad": "Kurutulmuş Kayısı",
      "miktar": 20.0,
      "birim": "kg",
      "son_kullanma": "2026-07-01",
      "durum": "SON_KULLANIM_GECDI",
      "giris_tarihi": "2026-06-01",
      "skd_gun": -28,
      "tedarikci_ad": "ABC Gıda Ltd."
    }
  ]
}
```

### 4.3 SKT İşlem Oluşturma (Geçmiş Lot İşleme)

**Endpoint:** `POST /api/v1/stok/skt/islemler`

**Request Body:**

```json
{
  "stok_id": "uuid",
  "islem_tipi": "IMHA",
  "miktar_islem": 0.0,
  "aciklama": "Gıda güvenliği mevzuatı gereği imha edildi.",
  "indirim_orani": null
}
```

**İndirimli satış için:**

```json
{
  "stok_id": "uuid",
  "islem_tipi": "INDIRIMLI_SATIS",
  "indirim_orani": 50.0,
  "aciklama": "Son kullanma 15 gün içinde, %50 indirimle satışa sunulacak."
}
```

**Response (201 Created):**

```json
{
  "islem_id": "uuid",
  "stok_id": "uuid",
  "islem_tipi": "IMHA",
  "onceki_durum": "SON_KULLANIM_GECDI",
  "yeni_durum": "SON_KULLANIM_ISLEM_GECICI",
  "tarih": "2026-07-29T14:30:00Z",
  "aciklama": "Gıda güvenliği mevzuatı gereği imha edildi.",
  "stok_guncelleme": {
    "yeni_miktar": 0.0,
    "yeni_durum": "SON_KULLANIM_ISLEM_GECICI"
  },
  "hareket_kaydi": {
    "hareket_id": "uuid",
    "hareket_tipi": "SON_KULLANIM_CIKIS"
  }
}
```

### 4.4 SKT Eşik Tanımlama (Ürün Bazlı Uyarı)

**Endpoint:** `POST /api/v1/stok/skt/esik`

```json
{
  "urun_id": "uuid",
  "uyari_gun": 45,
  "uyari_seviyesi": "RISKLI"
}
```

**Response (201):**

```json
{
  "esik_id": "uuid",
  "urun_id": "uuid",
  "urun_ad": "Kurutulmuş Kayısı",
  "uyari_gun": 45,
  "uyari_seviyesi": "RISKLI",
  "sistem_varsayilani": 30,
  "aktif": true
}
```

### 4.5 Lot Detayında FEFO Bilgisi

**Endpoint:** `GET /api/v1/stok/{stok_id}`

Mevcut yanıta ek olarak dönülen alanlar:

```json
{
  "stok_id": "uuid",
  "lot_no": "LOT-20260601-001",
  "son_kullanma": "2026-08-15",
  "durum": "SON_KULLANIM_RISKLI",
  "fefo_bilgisi": {
    "sira": 2,
    "toplam_uygun_stok": 150.0,
    "sira_yuzdesi": "1.3%",
    "kalan_gun": 17,
    "oncelik_aciklamasi": "FEFO: Son kullanma tarihi yaklaşıyor, öncelikli tüketilmeli"
  }
}
```

---

## 5. İş Akışı

### 5.1 Satış Çıkışı — FEFO/FIFO Öncelik Akışı

```
Satış emri başlatılır
       │
       ▼
GET /api/v1/stok/skt/lot-onerisi?urun_id=X&miktar=Y&hareket_tipi=SATIS_CIKIS
       │
       ▼
Sistem otomatik FEFO/FIFO sıralı lot listesi döner
       │
       ├─ Yeterli stok var → Lot önerisi kabul edilir
       │       │
       │       ▼
       │   POST /api/v1/stok/cikis
       │   (stok hareketi oluşur, fifo_ihlal_edildi=false)
       │
       └─ Yeterli stok yok → "Yetersiz stok" hatası
               (Son kullanımı geçmiş lot varsa uyarı ile bildirilir)
```

### 5.2 Üretim Çıkışı — Hammadde Lot Seçimi

```
Üretim emri oluşturulur
       │
       ▼
Sistem otomatik olarak FEFO-FIFO hibrit lot seçimi yapar
(Hammadde stok kontrolü — en eski lot önce kullanılır)
       │
       ▼
Üretim emri onaylanır
       │
       ▼
URETIM_CIKIS hareketleri oluşur
(stok_karti.miktar düşer, kaynak_lot_no kaydedilir)
```

### 5.3 Son Kullanma Tarihi Geçmiş Lot — Otomatik İşlem

```
SCHEDULED JOB (02:00 her gün)
       │
       ▼
SELECT * FROM stok_karti
WHERE durum NOT IN ('SON_KULLANIM_GECDI', ...)
  AND son_kullanma < CURRENT_DATE
  AND miktar > 0
       │
       ▼
Her lot için:
  1. durum → 'SON_KULLANIM_GECDI' güncellenir
  2. Bildirim oluşturulur ( bildirim_tablo )
  3. Audit log yazılır
       │
       ▼
Depo sorumlusu / Yönetici e-posta + sistem bildirimi alır
       │
       ▼
Yönetici aksiyon seçer:
  IMHA / İNDIRIMLI SATIŞ / DEPO DIŞI ÇIKIŞ / DEVIR
       │
       ▼
POST /api/v1/stok/skt/islemler
  → Stok durumu güncellenir
  → Stok hareketi oluşur (SON_KULLANIM_CIKIS)
  → İmha kaydı oluşur
```

### 5.4 Son Kullanma Yaklaşan Lot — Riskli Uyarı

```
SCHEDULED JOB (02:00 her gün)
       │
       ▼
--urun_id başına tanımlı eşik veya sistem varsayılanı (SKT_UYARI_GUN=30)
SELECT * FROM stok_karti
WHERE durum = 'AKTIF'
  AND son_kullanma <= CURRENT_DATE + SKT_UYARI_GUN
  AND son_kullanma > CURRENT_DATE
  AND miktar > 0
       │
       ▼
Her lot için:
  durum → 'SON_KULLANIM_RISKLI' güncellenir
  Bildirim oluşur
       │
       ▼
Depo sorumlusu uyarı görür
  (Dashboard widget + e-posta)
       │
       ▼
Lot satışa/üretime sunulur ama FEFO öncelikli olarak
önce riskli lotlardan çıkış yapılır.
```

---

## 6. Önemli Tasarım Kararları ve Gerekçeleri

| Karar | Gerekçe |
|-------|---------|
| `SON_KULLANIM_GECDI` durumu lotu bloklamaz, sadece işlem bekletir | Yasal olarak ürünün imhası veya devri için yönetici onayı zorunludur; otomatik imha hukuki risk oluşturur |
| SKT eşiği ürün bazlı tanımlanabilir, sistem varsayılanı 30 gündür | Farklı ürünlerin raf ömrü çok farklıdır; bal (2 yıl) vs. taze kurutulmuş meyve (6 ay) |
| FEFO önceliği son kullanma tarihine göredir, FIFO giriş tarihine göredir | Gıda güvenliği mevzuatı (Türk Gıda Kodeksi) son kullanma tarihini öncelikli kılar |
| `SON_KULLANIM_CIKIS` yeni hareket tipi olarak eklenir | İmha/indirim/devir çıkışlarını normal satış çıkışından ayırt etmek için |
| İndirimli satış için yönetici onayı zorunludur | Fiyat kararları yetki matrisi dışında bırakılmamalı |
| Job her 24 saatte çalışır (02:00) | Gece sessiz dönemde çalışır, günlük operasyonu etkilemez |

---

## 7. Etkilenen Mevcut Tablolar — Özet

| Tablo | Değişiklik Türü | Açıklama |
|-------|----------------|----------|
| `stok_karti` | ENUM değer ekleme | `SON_KULLANIM_GECDI`, `SON_KULLANIM_RISKLI`, `SON_KULLANIM_ISLEM_GECICI` |
| `stok_karti` | İndeks ekleme | `idx_stok_karti_fefo`, `idx_stok_karti_fifo`, `idx_stok_karti_skt_gecmis` |
| `stok_hareketleri` | Hareket tipi ekleme | `SON_KULLANIM_CIKIS` (enum değer) |
| `sistem_ayarlari` | Satır ekleme | `SKT_UYARI_GUN` varsayılan ayar |
| `skt_islemleri` | **Yeni tablo** | Son kullanma işlem kayıtları |
| `skt_uyari_esikleri` | **Yeni tablo** | Ürün bazlı SKT eşik tanımları |

---

## 8. Kapatılan Yetki ve Operasyon Kararları

1. **İmha:** `DEPO_SORUMLUSU` talep eder, farklı kullanıcı olan `YONETICI` onaylar (maker-checker). Kritik SKT ihlali yalnız `ADMIN` onayıyla geçer.
2. **İndirimli satış:** `YONETICI` onayı zorunludur; üst sınır `SKT_INDIRIM_UST_SINIR` sistem ayarından okunur.
3. **Rapor erişimi:** `DEPO_SORUMLUSU` okur, `YONETICI` ve `ADMIN` okur/aktarır.
4. **Bildirim:** Sistem içi bildirim zorunlu, e-posta varsayılan; SMS yalnız kritik ADMIN onayı bekleyen kayıtlarda kullanılır.
5. **Harici bildirim:** TBS entegrasyonu bu sürümde kapsam dışıdır; gerekli kayıt dışa aktarım raporuyla sağlanır.
6. **FEFO ihlali:** `DEPO_SORUMLUSU` gerekçeli talep açar, `YONETICI` onaylar; SKT < 3 gün veya miktar > %25 ise yalnız `ADMIN` onaylayabilir. Talep eden kendi talebini onaylayamaz.
