# Stok Düzeltme Onay Workflow'ü — Çözüm Tasarımı
## 1.1.4 Kritik Boşluk Kapatma

**Versiyon:** 1.1  
**Tarih:** 2026-07-29  
**Durum:** TASLAK — Uygulama Öncesi Onay Gerekli  
**İlişkili Dokümanlar:** SRS-Kurutulmus-Meyve-Bal-ERP.md (§2.7, §3.4), DB-Design-Kurutulmus-Meyve-Bal-ERP.md, URETIMLIK_HAZIRLIK_GAP-ANALIZI-RAPORU.md (§1.1.4)

---

## 1. Mevcut Durum Analizi

### 1.1 SRS Tanımı (§2.7 Stok Düzeltme Süreci)

SRS mevcut durumu şöyle tanımlıyor:

```
Düzeltme Nedenleri:
  - Sayım Farkı      → Fiziksel sayım ile sistem farkı
  - Fire/Zarar       → Üretim sırasında oluşan fire
  - Çalışma          → Hırsızlık veya kayıp
  - Birim Değişikliği → Ölçü birimi değişikliği

Düzeltme Kuralları:
  - Pozitif ve negatif düzeltme yapılabilir
  - Kritik düzeltmeler (+/- %10 üzeri) yönetici onayı gerektirir
  - Tüm düzeltmeler denetim günlüğüne kaydedilir
  - Düzeltme nedeni zorunlu alandır
```

### 1.2 DB Tasarımındaki Karşılık

`stok_hareketleri` tablosunda `DUZELTME` hareket tipi mevcuttur:

| Alan | Tip | Açıklama |
|------|-----|----------|
| `hareket_id` | UUID | PK |
| `stok_id` | UUID | FK → stok_karti |
| `hareket_tipi` | VARCHAR(30) | GIRIS, URETIM_GIRIS, URETIM_CIKIS, SATIS_CIKIS, IADE, **DUZELTME**, TRANSFER |
| `miktar` | DECIMAL(15,3) | Hareket miktarı |
| `onceki_miktar` | DECIMAL(15,3) | Hareket öncesi miktar |
| `sonraki_miktar` | DECIMAL(15,3) | Hareket sonrası miktar |
| `referans_tipi` | VARCHAR(30) | SATIS, URETIM, TEDARIK, **DUZELTME** |
| `aciklama` | TEXT | Düzeltme açıklaması |
| `olusturan_kullanici_id` | UUID | Düzeltmeyi talep eden kullanıcı |

### 1.3 Tespit Edilen Boşluklar (GAP §1.1.4)

| # | Boşluk | Risk |
|---|--------|------|
| 1 | **Onay yetkisi tanımsız** — yönetici onayı denildiği zaman hangi rol veya kullanıcı onaylayacak? Sadece ADMIN rolü mü? Birden fazla yönetici varsa ilk uygun kimse mi? | Yüksek |
| 2 | **Onay/reddetme API endpoint'i yok** — düzeltme talebi oluşturulabilir ama onaylanamaz veya reddedilemez | Kritik |
| 3 | **Onay zinciri (approval chain) tanımlanmamış** — %10'u aşan her düzeltme için tek aşama mı, çok aşamalı mı? | Orta |
| 4 | **Stok güncelleme engeli yok** — kritik düzeltme, onay beklerken stok güncellenmemeli. Mevcut tasarımda böyle bir mekanizma yok | Kritik |
| 5 | **Eşik değeri yapılandırılabilir değil** — %10 sabit kodlanmış, sistem ayarı değil | Orta |
| 6 | **Düzeltme nedeni dışında belgeleme yok** — onay sürecinde ek kanıt/belge yüketimi desteklenmiyor | Düşük |
| 7 | **Onay süresi zaman aşımı yok** — bekleyen düzeltmeler sonsuza kadar açık kalabilir | Düşük |
| 8 | **Ret gerekçesi zorunlu değil** — reddedilen düzeltmeler için ret nedeni loglanmıyor | Düşük |

---

## 2. Önerilen Çözüm: Stok Düzeltme Onay Workflow'ü

### 2.1 Temel Prensipler

1. **İki aşamalı commit** — Düzeltme oluşturulur ama onaylanmadıkça stok **güncellenmez**
2. **Maker-checker yetkisi** — talebi `DEPO_SORUMLUSU` oluşturur, farklı bir kullanıcı olan `YONETICI` onaylar; kritik SKT etkili düzeltmelerde yalnız `ADMIN` onay verir
3. **Miktar-oranına dayalı kritiklik** — düzeltme oranı = `|miktar| / onceki_miktar * 100`
4. **Tek aşamalı onay** — mevcut aşamada tek onay yeterli; çok aşamalı onay gelecek aşamada eklenebilir
5. **Denetim izlenebilirliği** — her state geçişi timestamp + kullanıcı ile loglanır

### 2.2 Durum Makinesi (State Machine)

```
                    ┌─────────────────────────────┐
                    │       OLUŞTURULDU           │
                    │  (Düzeltme talebi açıldı)   │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │ (kritik mi?)       │                    │
         [EVET]                   │                  [HAYIR]
              │                    │                    │
              ▼                    │                    ▼
  ┌───────────────────┐            │         ┌───────────────────┐
  │ BEKLEMEDE_ONAY    │            │         │     ONAYLANDI    │
  │ (Admin onayı bekliyor)         │         │ (Otomatik onay —  │
  └───────┬─────────┘            │         │  %10 eşiği aşmıyor)│
          │                      │         └─────────┬─────────┘
          │                      │                   │
    ┌─────┴─────┐                 │                   ▼
    │           │                 │         ┌───────────────────┐
[ONAYLA]    [REDDET]              │         │   STOK GÜNCELLENDİ  │
    │           │                 │         │ (Hareket kaydı oluştu)
    ▼           ▼                 │         └───────────────────┘
┌──────────┐ ┌──────────┐          │
│ONAYLANDI │ │  REDDEDILDI │
└────┬─────┘ └────┬─────┘          │
     ▼            ▼                │
┌──────────────────────┐           │
│   STOK GÜNCELLENDİ   │──────────┘
│ (Hareket kaydı oluştu)│
└──────────────────────┘
```

### 2.3 Kritiklik Eşiği Hesaplama

```
kritiklik_orani = ABS(düzeltme_miktar) / onceki_miktar * 100

Örnekler:
  - onceki_miktar = 100 kg, duzeltme = +15 kg  → 15%  → KRITIK  → onay gerekli
  - onceki_miktar = 100 kg, duzeltme = -9 kg   → 9%   → NORMAL → otomatik onay
  - onceki_miktar = 100 kg, duzeltme = +10 kg  → 10%  → NORMAL → otomatik onay
  - onceki_miktar = 100 kg, duzeltme = +10.1kg → 10.1%→ KRITIK → onay gerekli
```

> **Not:** `onceki_miktar = 0` durumunda (yeni lot, ilk düzeltme) kritiklik oranı hesaplanamaz. Bu durumda düzeltme **kritik** olarak değerlendirilir ve onay gerektirir.

---

## 3. Veritabanı Değişiklikleri

### 3.1 Yeni Tablo: `stok_duzeltme_onay`

```sql
-- Stok düzeltme talebi (kritik ise onay akışı bekler)
CREATE TABLE stok_duzeltme_talepleri (
    talep_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    duzeltme_no             VARCHAR(50) NOT NULL UNIQUE,  -- DUZ-YYYYMMDD-XXX
    stok_id                 UUID NOT NULL REFERENCES stok_karti(stok_id),
    hareket_tipi            VARCHAR(20) NOT NULL DEFAULT 'DUZELTME',

    onceki_miktar           DECIMAL(15,3) NOT NULL,
    duzeltme_miktar         DECIMAL(15,3) NOT NULL,  -- pozitif veya negatif
    sonraki_miktar          DECIMAL(15,3) NOT NULL,
    birim                   VARCHAR(20) NOT NULL,

    kritiklik_orani         DECIMAL(5,2) NOT NULL,  -- %10 üzeri mi?
    kritik_duzeltme         BOOLEAN NOT NULL DEFAULT FALSE,

    durum                   VARCHAR(30) NOT NULL DEFAULT 'OLUSTURULDU'
                             CHECK (durum IN (
                               'OLUSTURULDU', 'BEKLEMEDE_ONAY', 'ONAYLANDI', 'REDDEDILDI', 'STOK_GUNCELLENDI', 'IPTAL'
                             )),

    duzeltme_nedeni         VARCHAR(30) NOT NULL
                             CHECK (duzeltme_nedeni IN (
                               'SAYIM_FARKI', 'FIRE_ZARAR', 'CALISMA', 'BIRIM_DEGISIKLIGI', 'DIGER'
                             )),
    aciklama                TEXT NOT NULL,

    onaylayan_kullanici_id  UUID REFERENCES kullanicilar(kullanici_id),
    ret_nedeni              TEXT,
    ret_tarihi              TIMESTAMP,

    belge_url               VARCHAR(500),

    CONSTRAINT talep_miktar_sifirdan_farkli CHECK (duzeltme_miktar != 0),
    CONSTRAINT talep_sonraki_miktar_negatif_olamaz CHECK (sonraki_miktar >= 0)
);

-- İndeksler
CREATE INDEX idx_onay_stok_id        ON stok_duzeltme_talepleri(stok_id);
CREATE INDEX idx_onay_durum          ON stok_duzeltme_talepleri(durum);
CREATE INDEX idx_onay_kritik         ON stok_duzeltme_talepleri(kritik_duzeltme) WHERE kritik_duzeltme = TRUE;
CREATE INDEX idx_onay_olusturma      ON stok_duzeltme_talepleri(olusturma_tarihi);
CREATE INDEX idx_onay_talep_eden     ON stok_duzeltme_talepleri(olusturan_kullanici_id);

-- Onay kararı ayrı tablo olarak denetim günlüğü sağlar
CREATE TABLE stok_duzeltme_onay_kararlari (
    onay_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    talep_id                UUID NOT NULL REFERENCES stok_duzeltme_talepleri(talep_id),
    onaylayan_kullanici_id  UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    karar                   VARCHAR(20) NOT NULL CHECK (karar IN ('ONAYLADI', 'REDDETTI')),
    gerekce                 TEXT,
    onay_tarihi             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT onay_gerekce_zorunlu CHECK (karar <> 'REDDETTI' OR gerekce IS NOT NULL)
);

CREATE INDEX idx_onay_karar_talep ON stok_duzeltme_onay_kararlari(talep_id);

### 3.2 Sistem Ayarı: `sistem_ayarlari` tablosuna ekleme

```sql
-- Mevcut sistem_ayarlari tablosu kullanılır; kanonik anahtar sütunu ayar_adi'dir.

-- Stok düzeltme onay eşiği ayarı
INSERT INTO sistem_ayarlari (ayar_adi, deger, veri_tipi, kategori, aciklama)
VALUES
    ('STOK_DUZELTME_KRITIK_ESIK', '10', 'INTEGER', 'GENEL',
     'Stok düzeltmelerinde kritik onay eşiği yüzdesi. Bu değerin üzerindeki düzeltmeler yönetici onayı gerektirir.');
```

### 3.3 `stok_hareketleri` tablosuna referans ekleme

```sql
-- duzeltme_onay_id alanı: DUZELTME hareketlerinin hangi talebe ait olduğu
ALTER TABLE stok_hareketleri
    ADD COLUMN duzeltme_onay_id UUID REFERENCES stok_duzeltme_onay_kararlari(onay_id);

CREATE INDEX idx_hareketler_duzeltme_onay ON stok_hareketleri(duzeltme_onay_id)
    WHERE duzeltme_onay_id IS NOT NULL;
```

### 3.4 Migration Script Önerisi

```sql
-- Migration: 014_stok_duzeltme_onay.sql
-- Aşama 1: Yeni tabloları oluştur
CREATE TABLE IF NOT EXISTS stok_duzeltme_talepleri (...);
CREATE TABLE IF NOT EXISTS stok_duzeltme_onay_kararlari (...);
ALTER TABLE stok_hareketleri ADD COLUMN IF NOT EXISTS duzeltme_onay_id UUID REFERENCES stok_duzeltme_onay_kararlari(onay_id);

-- Aşama 2: Mevcut düzeltme hareketlerini yeni tabloya taşıma (geriye dönük uyumluluk)
INSERT INTO stok_duzeltme_talepleri (
    talep_id, duzeltme_no, stok_id, hareket_tipi,
    onceki_miktar, duzeltme_miktar, sonraki_miktar, birim,
    kritiklik_orani, kritik_duzeltme, durum, duzeltme_nedeni,
    aciklama, onaylayan_kullanici_id, ret_nedeni, ret_tarihi,
    olusturma_tarihi, guncelleme_tarihi, silme_tarihi, belge_url
)
SELECT
    gen_random_uuid() AS talep_id,
    'DUZ-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(CAST(RANDOM() * 999 AS TEXT), 3, '0') AS duzeltme_no,
    sh.stok_id,
    'DUZELTME' AS hareket_tipi,
    sh.onceki_miktar,
    sh.miktar,
    sh.sonraki_miktar,
    sk.birim,
    ABS(sh.miktar) / NULLIF(sh.onceki_miktar, 0) * 100 AS kritiklik_orani,
    (ABS(sh.miktar) / NULLIF(sh.onceki_miktar, 0) * 100) > COALESCE(
        (SELECT CAST(deger AS DECIMAL) FROM sistem_ayarlari WHERE ayar_adi = 'STOK_DUZELTME_KRITIK_ESIK' AND silme_tarihi IS NULL), 10
    ) AS kritik_duzeltme,
    'ONAYLANDI' AS durum,
    'GERIYE_DONUK_TASI' AS duzeltme_nedeni,
    sh.aciklama,
    NULL, NULL, NULL,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL,
    NULL
FROM stok_hareketleri sh
JOIN stok_karti sk ON sh.stok_id = sk.stok_id
WHERE sh.hareket_tipi = 'DUZELTME'
  AND sh.duzeltme_onay_id IS NULL;

-- Aşama 3: Geriye dönük taşınan kayıtların hareket tablosunu güncelle
UPDATE stok_hareketleri sh
SET duzeltme_onay_id = o.onay_id
FROM stok_duzeltme_onay_kararlari o
JOIN stok_duzeltme_talepleri t ON o.talep_id = t.talep_id
WHERE sh.hareket_tipi = 'DUZELTME'
  AND sh.stok_id = t.stok_id
  AND sh.onceki_miktar = t.onceki_miktar
  AND sh.miktar IS DISTINCT FROM t.duzeltme_miktar
  AND t.duzeltme_nedeni = 'GERIYE_DONUK_TASI';

-- Aşama 4: Sistem ayarı ekle (yoksa)
INSERT INTO sistem_ayarlari (ayar_adi, deger, veri_tipi, kategori, aciklama)
VALUES ('STOK_DUZELTME_KRITIK_ESIK', '10', 'INTEGER', 'GENEL',
        'Stok düzeltmelerinde kritik onay eşiği yüzdesi.')
ON CONFLICT (ayar_adi) DO NOTHING;
```

---

## 4. API Endpoint Tasarımı

### 4.1 Endpoint Özeti

| Yöntem | Yol | Açıklama | Yetki |
|--------|-----|----------|-------|
| `POST` | `/api/v1/stok-duzeltme/talep` | Yeni düzeltme talebi oluştur | `DEPO_SORUMLUSU`, `ADMIN` |
| `GET` | `/api/v1/stok-duzeltme/talepler` | Tüm talepleri listele (filtrele) | `YONETICI`, `ADMIN` |
| `GET` | `/api/v1/stok-duzeltme/talepler/{id}` | Tek talep detayı | Talep eden veya `ADMIN` |
| `GET` | `/api/v1/stok-duzeltme/bekleyen` | Onay bekleyen talepler | `YONETICI`, `ADMIN` |
| `POST` | `/api/v1/stok-duzeltme/{id}/onayla` | Talebi onayla (maker-checker) | `YONETICI`; kritik SKT ise yalnız `ADMIN` |
| `POST` | `/api/v1/stok-duzeltme/{id}/ret` | Talebi reddet (maker-checker) | `YONETICI`, `ADMIN` |
| `POST` | `/api/v1/stok-duzeltme/{id}/iptal` | Talebi iptal et (talep eden) | Talep eden (kendi talebi) |
| `GET` | `/api/v1/stok-duzeltme/tarihce/{stok_id}` | Bir stok kartının düzeltme tarihçesi | `ADMIN`, `YONETICI`, `DEPO_SORUMLUSU` |

### 4.2 Detaylı Endpoint Spesifikasyonu

#### `POST /api/v1/stok-duzeltme/talep`
**Yeni düzeltme talebi oluşturur.**

Request:
```json
{
  "stok_id": "uuid",
  "duzeltme_miktar": -12.5,
  "duzeltme_nedeni": "SAYIM_FARKI",
  "aciklama": "Periyodik sayımda 12.5 kg eksik tespit edildi"
}
```

Response (201 Created):
```json
{
  "onay_id": "uuid",
  "duzeltme_no": "DUZ-20260729-001",
  "durum": "BEKLEMEDE",
  "kritik_duzeltme": true,
  "kritiklik_orani": 12.5,
  "mesaj": "Kritik düzeltme, yönetici onayı bekliyor."
}
```

**İş Akışı:**
1. `stok_id` ile mevcut miktar alınır (`onceki_miktar`)
2. Kritiklik oranı hesaplanır
3. Eğer `kritik_duzeltme = false` → otomatik onay, stok güncellenir, hareket kaydı oluşturulur
4. Eğer `kritik_duzeltme = true` → `BEKLEMEDE` durumuyla kayıt oluşturulur, stok **güncellenmez**
5. Audit log yazılır

---

#### `GET /api/v1/stok-duzeltme/bekleyen`
**Onay bekleyen kritik düzeltme taleplerini listeler.**

Query params:
- `stok_id` (opsiyonel): Belirli stok kartına ait bekleyen talepler
- `limit` (opsiyonel, default 50)
- `offset` (opsiyonel, default 0)

Response:
```json
{
  "toplam": 3,
  "talepler": [
    {
      "onay_id": "uuid",
      "duzeltme_no": "DUZ-20260729-001",
      "stok_id": "uuid",
      "urun_ad": "Kuru Kayısı",
      "lot_no": "LOT-20260720-001",
      "onceki_miktar": 100.0,
      "duzeltme_miktar": -12.5,
      "kritiklik_orani": 12.5,
      "duzeltme_nedeni": "SAYIM_FARKI",
      "talep_eden_ad": "Ahmet Yılmaz",
      "olusturma_tarihi": "2026-07-29T10:30:00Z"
    }
  ]
}
```

---

#### `POST /api/v1/stok-duzeltme/{id}/onayla`
**Kritik düzeltme talebini onaylar ve stok güncellenir.**

Request:
```json
{
  "aciklama": "Sayım tutanakı ile doğrulandı, onaylanıyor."
}
```

Response (200 OK):
```json
{
  "onay_id": "uuid",
  "durum": "ONAYLANDI",
  "hareket_id": "uuid",
  "stok_guncelleme": {
    "onceki_miktar": 100.0,
    "sonraki_miktar": 87.5
  }
}
```

**İş Akışı:**
1. Talep `BEKLEMEDE` durumunda mı kontrol edilir
2. Onaylayan kullanıcının `YONETICI` (kritik SKT ise `ADMIN`) rolünde olduğu ve talep eden kullanıcıdan farklı olduğu doğrulanır
3. `stok_karti.miktar` güncellenir
4. `stok_hareketleri` kaydı oluşturulur (referans: `duzeltme_onay_id`)
5. Onay tablosu `ONAYLANDI` + `onaylayan_kullanici_id` + timestamp ile güncellenir
6. Audit log yazılır
7. Bildirim gönderilir (talep edene)

---

#### `POST /api/v1/stok-duzeltme/{id}/ret`
**Kritik düzeltme talebini reddeder.**

Request:
```json
{
  "ret_nedeni": "Düşük sayım tutanağı eksik. Lütfen sayım tutanağı ile tekrar talep oluşturun."
}
```

Response (200 OK):
```json
{
  "onay_id": "uuid",
  "durum": "REDDEDILDI",
  "ret_nedeni": "Düşük sayım tutanağı eksik...",
  "ret_tarihi": "2026-07-29T11:00:00Z",
  "mesaj": "Düzeltme talebi reddedildi. Stok değişiklik yapılmadı."
}
```

**İş Akışı:**
1. Talep `BEKLEMEDE` durumunda mı kontrol edilir
2. `ret_nedeni` zorunludur (boş veya null → 400 Bad Request)
3. Onaylayan kullanıcının yetkili rolünde olduğu doğrulanır
4. Talep `REDDEDILDI` durumuna güncellenir
5. Audit log yazılır
6. Bildirim gönderilir (talep edene)

---

#### `POST /api/v1/stok-duzeltme/{id}/iptal`
**Talep eden kullanıcının kendi talebini iptal etmesini sağlar.**

Not: Bu, talebin onaylanmadan veya reddedilmeden önce geri çekilmesidir. Stok zaten güncellenmemiştir (BEKLEMEDE durumundaki kritik talepler için geçerlidir).

---

## 5. İş Akışı Detayı

### 5.1 Akış Diyagramı (Mermaid)

```mermaid
flowchart TD
    A[Depo Sorumlusu: Stok Düzeltme Talebi] --> B{Kritik mi?\n|miktar| / onceki_miktar > %10}

    B -->|Hayır (<= %10)| C[Otomatik Onay]
    C --> D[Stok Güncellenir]
    D --> E[stok_hareketleri\nkaydı oluşur]
    E --> F[Audit Log]

    B -->|Evet (> %10)| G[Durum: BEKLEMEDE]
    G --> H[Bildirim: Yönetici']
    H --> I[Yönetici: İncele & Karar Ver]

    I --> J{Onay veya Ret?}
    J -->|Onayla| K[Durum: ONAYLANDI]
    K --> L[Stok Güncellenir]
    L --> M[stok_hareketleri\n+ duzeltme_onay_id]
    M --> N[Audit Log + Bildirim]
    J -->|Ret| O[Durum: REDDEDILDI\n+ ret_nedeni]
    O --> P[Bildirim: Talep Edene]
    J -->|İptal| Q[Durum: IPTAL]
    Q --> P
```

### 5.2 Roller ve Yetkiler

| Rol | Oluştur | Onayla | Ret | İptal (Kendi) | Görüntüle |
|-----|---------|--------|-----|---------------|-----------|
| `DEPO_SORUMLUSU` | ✓ | ✗ | ✗ | ✓ (kendi) | ✗ (kendi) |
| `ADMIN` | ✓ | ✓ | ✓ | ✓ | ✓ (tümü) |
| `STOK_YONETICISI` | ✗ | ✓ | ✓ | ✗ | ✓ (tümü) |
| `SATIS_SORUMLUSU` | ✗ | ✗ | ✗ | ✗ | ✗ |

### 5.3 Zaman Aşımı Kuralları (Gelecek Aşama)

> Bu madde uygulama sonrası eklenebilir. Şimdilik zaman aşımı yok.

```
Önerilen: 7 gün içinde yanıt alınmayan BEKLEMEDE talepler için:
  - Otomatik hatırlatma bildirimi (3. gün)
  - 7. günde yöneticinin yöneticisine bildirim (opsiyonel)
```

### 5.4 Bildirim Kuralı

| Olay | Kime | Kanal |
|------|------|-------|
| Kritik düzeltme talebi oluştu | ADMIN + STOK_YONETICISI | E-posta, sistem bildirimi |
| Talep onaylandı | Talep eden | Sistem bildirimi |
| Talep reddedildi | Talep eden | Sistem bildirimi |
| Talep iptal edildi | — | Yok |

---

## 6. Audit Log Entegrasyonu

Her işlem için `audit_log` tablosuna aşağıdaki bilgilerle kayıt atılır:

```json
{
  "audit_tip": "STOK_DUZELTME",
  "referans_id": "onay_id (UUID)",
  "referans_tipi": "STOK_DUZELTME_ONAY",
  "aksiyon": "TALEP_OLUSTURULDU | ONAYLANDI | REDDEDILDI | IPTAL_EDILDI",
  "onceki_deger": {
    "durum": "BEKLEMEDE",
    "miktar": 100.0
  },
  "yeni_deger": {
    "durum": "ONAYLANDI",
    "miktar": 87.5
  },
  "ekstra_bilgi": {
    "kritiklik_orani": 12.5,
    "duzeltme_nedeni": "SAYIM_FARKI",
    "ret_nedeni": null
  }
}
```

---

## 7. Kenar Koşullar ve Hata Yönetimi

| Senaryo | Beklenen Davranış |
|---------|-------------------|
| `onceki_miktar = 0` (yeni lot, ilk düzeltme) | Kritik olarak değerlendirilir, onay gerektirir |
| Düzeltme sonucu `sonraki_miktar < 0` | Validasyon hatası: "Miktar negatif olamaz" |
| Onay bekleyen talep üzerine ikinci onay denemesi | 409 Conflict: "Talep zaten onay bekliyor" |
| Onaylanmış talep üzerine onay denemesi | 409 Conflict: "Talep zaten onaylanmış" |
| Ret edilmiş talep üzerine ret denemesi | 409 Conflict: "Talep zaten reddedilmiş" |
| Kullanıcı kendi olmayan talebi iptal etmeye çalışır | 403 Forbidden |
| Yetkisiz kullanıcı (DEPO_SORUMLUSU) onaylamaya çalışır | 403 Forbidden |
| Düzeltme onaylandıktan sonra stok_karti silinirse | DB constraint → hata, işlem geri alınır |
| Eşik değeri `sistem_ayarlari` tablosunda bulunamazsa | Varsayılan %10 kullanılır |

---

## 8. Gelecek Aşama Genişletmeleri

| Özellik | Açıklama | Öncelik |
|---------|----------|---------|
| Çok aşamalı onay | %25 üzeri için 2. yönetici onayı | Orta |
| Belge yükleme | Düzeltme talebine sayım tutanağı, fotoğraf ekleme | Orta |
| Zaman aşımı | 7 gün bekleyen talepler için otomatik hatırlatma | Düşük |
| Toplu düzeltme | Birden fazla lot için toplu düzeltme + toplu onay | Düşük |
| Onay delegasyonu | Yönetici yokken vekil atama | Düşük |

---

## 9. Test Senaryoları

### Birim Testleri

| # | Test | Girdi | Beklenen |
|---|------|-------|----------|
| T1 | Kritik olmayan düzeltme otomatik onaylanır | onceki=100, duzeltme=-9 | durum=ONAYLANDI, stok=91 |
| T2 | %10 exactly → otomatik onay | onceki=100, duzeltme=-10 | durum=ONAYLANDI |
| T3 | %10.01 → kritik, onay bekler | onceki=100, duzeltme=-10.01 | durum=BEKLEMEDE, kritik_duzeltme=TRUE |
| T4 | Pozitif kritik düzeltme | onceki=100, duzeltme=+15 | durum=BEKLEMEDE |
| T5 | Onay sonrası stok doğru güncellenir | onceki=100, duzeltme=-15 → onayla | stok=85, hareket kaydı oluşur |
| T6 | Ret sonrası stok değişmez | onceki=100, duzeltme=-15 → ret | stok=100, hareket kaydı oluşmaz |
| T7 | Ret için gerekçe zorunlu | ret et, ret_nedeni=null | 400 Bad Request |
| T8 | İptal edilen talep tekrar oluşturulabilir | iptal sonrası aynı düzeltme ile yeni talep | Yeni talep oluşur |
| T9 | onceki_miktar=0 durumu | ilk düzeltme (lot henüz 0) | kritik_duzeltme=TRUE |
| T10 | Eşik değeri sistem ayarından okunur | ayar=%15, duzeltme=+12 | NORMAL (otomatik onay) |

### Entegrasyon Testleri

| # | Test | Beklenen |
|---|------|----------|
| I1 | Kritik düzeltme → bekleyen listesi görünür | GET /bekleyen → talep listede |
| I2 | Onay sonrası hareket tablosunda referans doğru | hareket.duzeltme_onay_id = onay.onay_id |
| I3 | Audit log'da tüm state geçişleri mevcut | TALEP_OLUSTURULDU → ONAYLANDI geçişleri |
| I4 | Yetkisiz kullanıcı onaylayamaz | 403 Forbidden |
| I5 | Stok_karti silinirse onay kaydı silinemez (FK) | DB constraint hatası |

---

## 10. Geçiş Planı (Zero-Downtime)

1. **Migration 1:** `stok_duzeltme_onay` tablosu oluştur (boş)
2. **Migration 2:** Geriye dönük mevcut DUZELTME hareketlerini taşı
3. **API deploy:** Yeni endpoint'ler aktif, eski `stok_hareketleri` üzerinden düzeltme **halâ çalışır** (migration 3 henüz yok)
4. **Migration 3:** `stok_hareketleri.hareket_tipi='DUZELTME'` INSERT'i sadece `stok_duzeltme_onay` üzerinden yapılır (application-level constraint)
5. **UI güncelleme:** Düzeltme formu yeni workflow'u kullanır

---

*Bu doküman, GAP analiz raporunda tespit edilen §1.1.4 kritik boşluğu kapatmak için hazırlanmıştır. Uygulamaya geçmeden önce yazılım ekibi, veritabanı ekibi ve ürün sahibi onayı gerektirir.*
