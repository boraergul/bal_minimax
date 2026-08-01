# Kalite Kontrol Süreci Tasarım Çözümü
## 1.1.2 Kritik Boşluk — Kalite Kontrol Süreci Tanımsız

**Versiyon:** 1.0
**Tarih:** 2026-07-29
**Durum:** TASLAK — Uygulama Öncesi Onay Gerekir
**İlgili Dokümanlar:** SRS-Kurutulmus-Meyve-Bal-ERP.md, DB-Design-Kurutulmus-Meyve-Bal-ERP.md, URETIMLIK_HAZIRLIK_GAP-ANALIZI-RAPORU.md, FONKSIYONEL-EKSIKLIK-DETAYLARI.md

---

## 1. Mevcut Durum Analizi

### 1.1 DB Tasarımında Mevcut Alanlar

`stok_karti` tablosunda kalite kontrol ile ilgili mevcut alanlar:

| Alan | Tip | Açıklama |
|------|-----|----------|
| `durum` | VARCHAR(20) | `AKTIF`, `BITTI`, `IPTAL`, `KALITE_KONTROL`, `DEPO_DISI`, `RET` |
| `kalite_kontrol_edildi` | BOOLEAN | Kalite kontrolü yapıldı mı? (P0) |
| `kalite_kontrol_tarihi` | TIMESTAMP | Kalite kontrol tarihi (P1) |
| `kalite_notu` | INTEGER (1-5) | Giriş kalite kontrol puanı (P0) |

`uretim_emri` tablosunda:
| Alan | Tip | Açıklama |
|------|-----|----------|
| `kalite_kontrol_onayi` | BOOLEAN | Üretim kalite onayı |
| `kalite_kontrol_eden_id` | UUID | Kontrol eden kullanıcı |

### 1.2 SRS'de Mevcut Olan

SRS Bölüm 3.4.5 "Kalite Kontrol Workflow" altında:
- 6 adımlı süreç tanımlı (Numune Alma → Fiziksel Kontrol → Laboratuvar Testi → Puanlama → Onay/Red → Stok Kaydı)
- Hammadde ve mamul için ret kriterleri ağırlıkları tanımlı
- `kalite_id`, `lot_id`, `kontrol_tipi`, `sonuc` (UYGUN/SINIRDA/UYGUNSIZ) alanları belirtilmiş
- Koşullu onay (3.0–3.9 puan) ve yönetici onayı gerekliliği mevcut

### 1.3 Kritik Boşluklar

| # | Boşluk | Öncelik |
|---|--------|---------|
| 1 | Kalite kontrol **workflow'ü tanımsız** — hangi adımda ne olur, UI akışı yok | 🔴 Kritik |
| 2 | `stok_karti.durum='RET'` **nasıl tetiklenir**? Trigger/API yok | 🔴 Kritik |
| 3 | Kalite kontrol **API endpoint'leri yok** — onay/reddetme için HTTP API mevcut değil | 🔴 Kritik |
| 4 | Ret kriterleri belirsiz — kabul/reddetme eşikleri tanımsız | 🔴 Kritik |
| 5 | `kalite_kontrol` tablosu **yok** — sonuçlar nereye yazılacak? | 🔴 Kritik |
| 6 | Kalite kontrol **onay/ret iş akışı** (workflow state machine) tanımsız | 🔴 Kritik |
| 7 | Koşullu onay (KISMEN_KABUL) sonrası stok durumu ne olacak? | 🟡 Yüksek |
| 8 | Ret edilen ürünün imha/iade kararı nasıl kaydedilecek? | 🟡 Yüksek |

---

## 2. Önerilen İş Akışı (Workflow)

```
                    ┌─────────────────────────────┐
                    │   STOK GİRİŞİ (Mal Kabul)   │
                    │  stok_karti.durum =         │
                    │  KALITE_KONTROL             │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │  Kalite Kontrol Kaydı Oluştur│
                    │  durum = BEKLIYOR           │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │  FİZİKSEL KONTROL           │
                    │  Görsel, ambalaj, etiket,   │
                    │  son kullanma tarihi        │
                    └──────────────┬──────────────┘
                                   │
                         ┌─────────┴─────────┐
                         │ Laboratuvar       │
                         │ gerekli mi?       │
                         └─────────┬─────────┘
                            ┌──────┴──────┐
                            │ Evet         │ Hayır
                            ▼              ▼
              ┌──────────────────┐    ┌──────────────────┐
              │ Laboratuvar       │    │ Puanlama         │
              │ Sonuçları Gir     │───▶│ (Fiziksel +      │
              └──────────────────┘    │  Lab ağırlıklı)   │
                                     └────────┬─────────┘
                                              │
                                              ▼
                              ┌───────────────────────────┐
                              │  Sonuç Belirle            │
                              │  (Sistem otomatik)        │
                              └────────────┬──────────────┘
                                           │
                          ┌────────────────┼────────────────┐
                          ▼                ▼                ▼
                   ┌───────────┐    ┌───────────┐    ┌───────────┐
                   │ puan ≥ 4.0│    │3.0≤puan<4.0│    │ puan < 3.0│
                   │ KABUL     │    │KISMEN_KABUL│    │ RET       │
                   └─────┬─────┘    └──────┬─────┘    └─────┬─────┘
                         │                 │                │
                         ▼                 ▼                ▼
               ┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
               │ stok_karti.durum │ │ Yönetici     │ │ stok_karti.  │
               │ = 'AKTIF'       │ │ Onayı Bekler │ │ durum='RET'   │
               │ kalite_kontrol  │ │ (opsiyonel)  │ │ ret_nedeni    │
               │ _edildi=TRUE    │ └──────┬───────┘ │ kaydedilir   │
               └──────────────────┘        │         └──────────────┘
                                          ▼
                                ┌──────────────────┐
                                │ Yönetici Onay/Ret│
                                └────────┬─────────┘
                                         │
                              ┌──────────┴──────────┐
                              ▼                      ▼
                    ┌──────────────┐       ┌──────────────┐
                    │ KABUL      │       │ RET           │
                    │ stok.durum=  │       │ stok.durum=   │
                    │ 'AKTIF'      │       │ 'RET'         │
                    └──────────────┘       └──────────────┘
```

### 2.1 State Machine: `kalite_kontrol.durum`

```
BEKLIYOR ──▶ KONTROL_EDILIYOR ──▶ KABUL ──▶ [stok.durum = AKTIF]
                                  ├──▶ KISMEN_KABUL ──▶ YONETICI_ONAYI ──▶ KABUL ──▶ [stok.durum = AKTIF]
                                  │                                          └──▶ RET ──▶ [stok.durum = RET]
                                  └──▶ RET ──▶ [stok.durum = RET]
```

### 2.2 Tetikleyiciler

| Olay | Tetikleyen | Otomatik Davranış |
|------|-----------|-------------------|
| Hammadde girişi | Stok hareketi (`GIRIS`) | `stok_karti.durum = KALITE_KONTROL`, `kalite_kontrol` kaydı oluşur |
| Üretim tamamlanması | `uretim_emri.durum = TAMAMLANDI` | Mamul lot için `kalite_kontrol` kaydı oluşur |
| İade mal kabulü | Stok hareketi (`IADE`) | `stok_karti.durum = KALITE_KONTROL`, `kontrol_turu = IADE` |
| Kalite kontrol sonucu `RET` | `kalite_kontrol.durum = RET` güncelleme | PostgreSQL trigger: `stok_karti.durum = RET` |
| Kalite kontrol sonucu `KABUL` | `kalite_kontrol.durum = KABUL` güncelleme | PostgreSQL trigger: `stok_karti.durum = AKTIF`, `kalite_kontrol_edildi = TRUE` |

---

## 3. Ret Kriterleri

### 3.1 Otomatik Ret (Sistem Seviyesinde Kontrol Edilecek)

Aşağıdaki koşullardan **herhangi biri** sağlanırsa sonuç `RET` olur:

```
☐ son_kullanma_tarihi < CURRENT_DATE          → RET: "SKT_GECMIS"
☐ ambalaj_durumu = 'ZAYIF'                     → RET: "AMBAALAJ_HASAR"
☐ gorsel_kontrol = FALSE                        → RET: "GORSEL_UYGUN_DEGIL"
☐ etiket_okunakli = FALSE                       → RET: "ETIKET_OKUNAMIYOR"
☐ nem_orani > MAX_NEM_ORANI (ürüne göre)       → RET: "NEM_ORANI_YUKSEK"
☐ laboratuvar_sonuclari.ph < MIN_PH            → RET: "PH_DUSUK"
☐ laboratuvar_sonuclari.ph > MAX_PH            → RET: "PH_YUKSEK"
```

### 3.2 Ürün Kategorisine Göre Eşik Değerleri

| Kategori | Parametre | Min | Max | Birim |
|----------|-----------|-----|-----|-------|
| MEYVE (kurutulmuş) | Nem Oranı | — | 15 | % |
| MEYVE (kurutulmuş) | pH | 3.0 | 4.5 | — |
| BAL | Nem Oranı | — | 18 | % |
| BAL | Diastaz Sayısı | 8 | — | — |
| BAL | HMF | — | 40 | mg/kg |
| BAL | pH | 3.5 | 4.5 | — |

### 3.3 Manuel Değerlendirme Eşiği

| Puan Aralığı | Sonuç | Açıklama |
|-------------|-------|---------|
| 4.0 – 5.0 | `KABUL` | Doğrudan kabul |
| 3.0 – 3.9 | `KISMEN_KABUL` | Yönetici onayı gerekir |
| < 3.0 | `RET` | Doğrudan ret |

---

## 4. Veritabanı Değişiklikleri

### 4.1 Yeni Tablo: `kalite_kontrol`

```sql
CREATE TABLE kalite_kontrol (
    kalite_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stok_id            UUID NOT NULL REFERENCES stok_karti(stok_id),
    uretim_emri_id     UUID REFERENCES uretim_emri(uretim_id),  -- üretim ise
    kontrol_tipi       VARCHAR(30) NOT NULL,  -- GIRIS_KONTROL | URETIM | SEVK | IADE | PERIYODIK | SIPARIS_KONTROL
    kontrol_turu       VARCHAR(20),  -- geriye dönük: kontrol_tipi ile eşleşir (legacy alan)
    kontrol_eden_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    kontrol_tarihi      TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Durum makinesi
    durum               VARCHAR(20) NOT NULL DEFAULT 'BEKLIYOR',
    -- BEKLIYOR | KONTROL_EDILIYOR | KABUL | KISMEN_KABUL | RET

    -- Ölçüm sonucu (DB-Design kanonik enum; durum ile karıştırılmaz)
    sonuc VARCHAR(20) CHECK (sonuc IS NULL OR sonuc IN ('UYGUN', 'SINIRDA', 'UYGUNSIZ')),

    -- Fiziksel kontrol sonuçları
    gorsel_kontrol      BOOLEAN,         -- görsel olarak uygun mu?
    ambalaj_durumu      VARCHAR(10),     -- IYI | ORTA | ZAYIF
    etiket_okunakli     BOOLEAN,
    son_kullanma_tarihi DATE,

    -- Laboratuvar sonuçları (JSONB — esneklik için)
    laboratuvar_sonuclari JSONB,  -- {"nem_orani": 12.5, "ph": 4.1, ...}

    -- Puanlama (1-5)
    fiziksel_puan       INTEGER CHECK (fiziksel_puan BETWEEN 1 AND 5),
    laboratuvar_puan    INTEGER CHECK (laboratuvar_puan BETWEEN 1 AND 5),
    genel_puan          INTEGER CHECK (genel_puan BETWEEN 1 AND 5),

    -- Ret bilgisi
    ret_nedeni          TEXT,
    ret_kriterleri      JSONB,  -- ["SKT_GECMIS", "AMBAALAJ_HASAR", ...]

    -- Sonuç açıklaması
    sonuc_aciklamasi    TEXT,

    -- Onay bilgisi (KISMEN_KABUL için)
    onay_durumu         VARCHAR(20),  -- OTOMATIK | YONETICI_ONAYI
    onay_leyen_id       UUID REFERENCES kullanicilar(kullanici_id),
    onay_tarihi         TIMESTAMP,

    -- Zorunlu alanlar
    olusturma_tarihi    TIMESTAMP NOT NULL DEFAULT NOW(),
    guncelleme_tarihi   TIMESTAMP NOT NULL DEFAULT NOW(),
    silme_tarihi        TIMESTAMP,  -- soft delete
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),

    CONSTRAINT kontrol_tarihi_ertle_yapilamaz CHECK (kontrol_tarihi IS NULL OR kontrol_tarihi <= NOW())
);

-- İndeksler
CREATE INDEX idx_kk_stok         ON kalite_kontrol(stok_id);
CREATE INDEX idx_kk_durum        ON kalite_kontrol(durum);
CREATE INDEX idx_kk_tarih        ON kalite_kontrol(kontrol_tarihi);
CREATE INDEX idx_kk_tur          ON kalite_kontrol(kontrol_turu);
CREATE INDEX idx_kk_uretim      ON kalite_kontrol(uretim_id) WHERE uretim_id IS NOT NULL;
```

### 4.2 Trigger: Otomatik Stok Durumu Güncelleme

```sql
CREATE OR REPLACE FUNCTION fn_kk_stok_durum_guncelle()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.durum = 'KABUL' AND OLD.durum != 'KABUL' THEN
        UPDATE stok_karti
        SET durum                 = 'AKTIF',
            kalite_kontrol_edildi = TRUE,
            kalite_kontrol_tarihi = NOW(),
            guncelleme_tarihi     = NOW()
        WHERE stok_id = NEW.stok_id;

    ELSIF NEW.durum = 'RET' AND OLD.durum != 'RET' THEN
        UPDATE stok_karti
        SET durum             = 'RET',
            guncelleme_tarihi = NOW()
        WHERE stok_id = NEW.stok_id;

    ELSIF NEW.durum = 'KISMEN_KABUL' AND OLD.durum != 'KISMEN_KABUL' THEN
        UPDATE stok_karti
        SET durum             = 'KALITE_KONTROL',  -- tekrar beklemeye al
            guncelleme_tarihi = NOW()
        WHERE stok_id = NEW.stok_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kk_stok_durum_guncelle
    AFTER UPDATE ON kalite_kontrol
    FOR EACH ROW
    WHEN (OLD.durum IS DISTINCT FROM NEW.durum)
    EXECUTE FUNCTION fn_kk_stok_durum_guncelle();
```

### 4.3 Mevcut Tablo Güncellemeleri

#### `stok_karti` — ek alanlar

```sql
-- Mevcut 'durum' enum'una RET zaten ekli; ek kontrol:
ALTER TABLE stok_karti
    ADD CONSTRAINT chk_durum_kk
    CHECK (durum IN ('AKTIF','BITTI','IPTAL','KALITE_KONTROL','DEPO_DISI','RET'));

-- KISMEN_KABUL durumu eklenecek mi? Hayır — bu kalite_kontrol tablosundadır.
-- stok_karti.durum RET olur, KISMEN_KABUL ayrı bir tablo state'idir.
```

#### `stok_hareketleri` — yeni hareket tipi

```sql
-- Mevcut hareket tiplerine ek:
-- KALITE_KONTROL_GIRIS  — Kalite kontrole giren lot
-- KALITE_KONTROL_RED    — Kalite kontrolden reddedilen lot
-- (RET durumu zaten DEPO_DISI veya ayrı izlenebilir)
```

### 4.4 Ürün Bazlı Kalite Parametreleri Tablosu (Yeni)

```sql
CREATE TABLE kalite_parametreleri (
    parametre_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    urun_id            UUID REFERENCES urunler(urun_id),
    kategori            VARCHAR(20),  -- MEYVE, BAL — NULL = tümü
    parametre_adi       VARCHAR(100) NOT NULL,  -- nem_orani, ph, diastaz
    birim              VARCHAR(20),   -- %, -, mg/kg
    min_deger          DECIMAL(10,4),
    max_deger          DECIMAL(10,4),
    varsayilan         BOOLEAN DEFAULT FALSE,
    aktif              BOOLEAN DEFAULT TRUE,
    olusturma_tarihi   TIMESTAMP DEFAULT NOW(),
    guncelleme_tarihi  TIMESTAMP DEFAULT NOW()
);

-- Örnek seed verisi:
INSERT INTO kalite_parametreleri (urun_id, parametre_adi, birim, max_deger, varsayilan) VALUES
(NULL, 'nem_orani', '%', 15.0, TRUE),   -- tüm kurutulmuş meyveler için
(NULL, 'ph', '-', 4.5, TRUE),            -- tüm meyveler için
(NULL, 'nem_orani', '%', 18.0, TRUE),   -- bal için
(NULL, 'diastaz', '-', 8.0, FALSE),     -- bal için (min)
(NULL, 'hmf', 'mg/kg', 40.0, TRUE);     -- bal için (max)
```

---

## 5. API Endpoint Tasarımı

### 5.1 Endpoint Listesi

| Yöntem | Path | Açıklama | Yetki |
|--------|------|----------|-------|
| `POST` | `/api/v1/kalite-kontrol` | Yeni kalite kontrol kaydı oluştur | `kalite_kontrol_yaz` |
| `GET` | `/api/v1/kalite-kontrol` | Liste (filtrelenebilir) | `kalite_kontrol_oku` |
| `GET` | `/api/v1/kalite-kontrol/bekleyen` | Bekleyen kontroller | `kalite_kontrol_oku` |
| `GET` | `/api/v1/kalite-kontrol/{kalite_id}` | Tek kalite kontrol detayı | `kalite_kontrol_oku` |
| `PATCH` | `/api/v1/kalite-kontrol/{kalite_id}/kontrol` | Kontrol sonuçlarını gir (fiziksel + lab) | `kalite_kontrol_yaz` |
| `POST` | `/api/v1/kalite-kontrol/{kalite_id}/sonuc` | KABUL/RET/KISMEN_KABUL kararı ver | `kalite_kontrol_yaz` |
| `POST` | `/api/v1/kalite-kontrol/{kalite_id}/onay` | Yönetici onayı (KISMEN_KABUL için) | `kalite_kontrol_yaz` + YÖNETICI |
| `GET` | `/api/v1/kalite-kontrol/rapor/ozet` | Özet rapor | `rapor_oku` |

### 5.2 Endpoint Detayları

#### `POST /api/v1/kalite-kontrol`
Kalite kontrol kaydı oluşturur ve stok kartını `KALITE_KONTROL` durumuna alır.

**Request:**
```json
{
  "stok_id": "uuid",
  "uretim_id": "uuid",          // üretim ise, değilse null
  "kontrol_tipi": "GIRIS_KONTROL"   // GIRIS_KONTROL | URETIM | SEVK | IADE | PERIYODIK | SIPARIS_KONTROL
}
```

**Response (201):**
```json
{
  "kalite_id": "uuid",
  "stok_id": "uuid",
  "durum": "BEKLIYOR",
  "kontrol_tarihi": "2026-07-29T08:00:00Z",
  "stok_durumu": "KALITE_KONTROL"
}
```

**Business Rules:**
- Aynı `stok_id` için `BEKLIYOR` durumunda kayıt varsa hata döner (409 Conflict)
- Stok kartı `durum` değeri `KALITE_KONTROL` olarak güncellenir
- Stok hareketi olarak `KALITE_KONTROL_GIRIS` kaydı oluşur

---

#### `PATCH /api/v1/kalite-kontrol/{kalite_id}/kontrol`
Kontrol sonuçlarını girer (fiziksel muayene ve laboratuvar).

**Request:**
```json
{
  "gorsel_kontrol": true,
  "ambalaj_durumu": "ORTA",
  "etiket_okunakli": true,
  "son_kullanma_tarihi": "2026-12-31",
  "laboratuvar_sonuclari": {
    "nem_orani": 12.5,
    "ph": 4.1
  },
  "fiziksel_puan": 4,
  "laboratuvar_puan": 5
}
```

**Response (200):**
```json
{
  "kalite_id": "uuid",
  "durum": "BEKLIYOR",
  "fiziksel_puan": 4,
  "laboratuvar_puan": 5,
  "sistem_sonuc": "KABUL",       // otomatik hesaplanan
  "sistem_ret_kriterleri": [],   // boşsa ret yok
  "not": "Kontrol sonuçları kaydedildi"
}
```

**Business Rules:**
- Sistem, eşik değerlerine göre otomatik sonuç hesaplar
- Otomatik sonuç `RET` ise kullanıcıya uyarı döner ama `durum` değişmez — `sonuc` endpoint'i beklenir
- `fiziksel_puan` zorunlu, `laboratuvar_puan` opsiyonel (lab yapılmadıysa null)

---

#### `POST /api/v1/kalite-kontrol/{kalite_id}/sonuc`
Kalite kontrol sonucunu kesinleştirir.

**Request:**
```json
{
  "durum": "KABUL",           // KABUL | RET | KISMEN_KABUL
  "ret_nedeni": null,         // RET ise zorunlu
  "ret_kriterleri": [],       // RET ise zorunlu, örn: ["SKT_GECMIS"]
  "sonuc_aciklamasi": "Tüm kontroller başarılı"
}
```

**Response (200):**
```json
{
  "kalite_id": "uuid",
  "durum": "KABUL",
  "stok_id": "uuid",
  "stok_durum": "AKTIF",       // trigger tetiklendi
  "kalite_kontrol_edildi": true,
  "kalite_kontrol_tarihi": "2026-07-29T10:30:00Z"
}
```

**Business Rules:**
- `durum = RET` ise `ret_nedeni` ve `ret_kriterleri` zorunludur
- `durum = RET` → trigger `stok_karti.durum = 'RET'` yapar
- `durum = KABUL` → trigger `stok_karti.durum = 'AKTIF'` ve `kalite_kontrol_edildi = TRUE` yapar
- `durum = KISMEN_KABUL` → `onay_durumu = 'YONETICI_ONAYI'` olarak kaydedilir
- Sonuç geçişleri yalnız `KONTROL_EDILIYOR` durumundan yapılabilir; `BEKLIYOR` kaydı önce kontrole alma adımıyla `KONTROL_EDILIYOR` olur, diğer durumlar 409 döner

---

#### `POST /api/v1/kalite-kontrol/{kalite_id}/onay`
Yönetici onayı — `KISMEN_KABUL` durumundaki kontroller için.

**Request:**
```json
{
  "onaylandi": true,
  "sonuc_aciklamasi": "Düşük puanlı ancak kullanılabilir"
}
```

**Response (200):**
```json
{
  "kalite_id": "uuid",
  "durum": "KABUL",
  "stok_durum": "AKTIF",
  "onay_leyen_id": "uuid",
  "onay_tarihi": "2026-07-29T11:00:00Z"
}
```

**Business Rules:**
- Yalnızca `KISMEN_KABUL` durumundan `onay` veya `ret` endpoint'i çağrılabilir
- `onaylandi = false` → `durum = RET`, `stok.durum = RET`
- `onaylandi = true` → `durum = KABUL`, `stok.durum = AKTIF`
- Yalnızca `ADMIN` veya `KALITE_YONETICI` rolündeki kullanıcılar onay verebilir

---

#### `GET /api/v1/kalite-kontrol/bekleyen`
Bekleyen kalite kontrol kayıtlarını listeler.

**Query Parametreleri:**
| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `tarih` | date | Kontrol tarihi (varsayılan: bugün) |
| `kontrol_tipi` | string | GIRIS_KONTROL, URETIM, SEVK, IADE, PERIYODIK, SIPARIS_KONTROL |
| `stok_tipi` | string | HAMMADDE, MAMUL |
| `sayfa` | int | Sayfa numarası (varsayılan: 1) |
| `sinir` | int | Sayfa başı kayıt (varsayılan: 20, max: 100) |

**Response (200):**
```json
{
  "toplam": 7,
  "sayfa": 1,
  "kayitlar": [
    {
      "kalite_id": "uuid",
      "stok_id": "uuid",
      "lot_no": "LOT-20260729-001",
      "urun_ad": "Kurutulmuş Kayısı",
      "tedarikci_ad": "ABC Gıda Ltd.",
      "kontrol_tipi": "GIRIS_KONTROL",
      "kontrol_tarihi": "2026-07-29T08:00:00Z",
      "durum": "BEKLIYOR",
      "uretim_tarihi": "2026-07-28",
      "miktar": 500.0,
      "birim": "kg"
    }
  ]
}
```

---

#### `GET /api/v1/kalite-kontrol/rapor/ozet`
Kalite kontrol özet raporu döner.

**Query Parametreleri:**
| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `baslangic` | date | Başlangıç tarih |
| `bitis` | date | Bitiş tarih |
| `grup` | string | `tedarikci`, `urun`, `kullanici` |
| `urun_id` | uuid | Ürün bazlı filtre |

**Response (200):**
```json
{
  "baslangic": "2026-07-01",
  "bitis": "2026-07-29",
  "ozet": {
    "toplam_kontrol": 45,
    "kabul": 38,
    "ret": 4,
    "kismen_kabul": 3,
    "ret_orani": 8.9,
    "ortalama_puan": 4.1
  },
  "gruplu": [
    {
      "gruplama": "tedarikci",
      "tedarikci_id": "uuid",
      "tedarikci_ad": "ABC Gıda",
      "toplam_kontrol": 10,
      "ret": 2,
      "ret_orani": 20.0,
      "ortalama_puan": 3.7
    }
  ]
}
```

---

## 6. Rol Bazlı Yetkilendirme

```json
// roller tablosu yetkiler dizisine eklenecek:
KALITE_KONTROL: [
  "kalite_kontrol_oku",
  "kalite_kontrol_yaz"
]
YONETICI: ["*"]  // zaten tüm yetkileri içeriyor
```

```sql
-- Kalite kontrol yazma yetkisi (onay dahil)
INSERT INTO rol_yetkileri (rol_id, yetki) VALUES
  ((SELECT rol_id FROM roller WHERE ad = 'DEPO_SORUMLUSU'), 'kalite_kontrol_yaz'),
  ((SELECT rol_id FROM roller WHERE ad = 'ADMIN'), 'kalite_kontrol_yaz');

-- Kalite kontrol okuma yetkisi
INSERT INTO rol_yetkileri (rol_id, yetki) VALUES
  ((SELECT rol_id FROM roller WHERE ad = 'DEPO_SORUMLUSU'), 'kalite_kontrol_oku'),
  ((SELECT rol_id FROM roller WHERE ad = 'SATIS_SORUMLUSU'), 'kalite_kontrol_oku'),
  ((SELECT rol_id FROM roller WHERE ad = 'ADMIN'), 'kalite_kontrol_oku');
```

---

## 7. SRS Güncelleme Önerileri

SRS dokümanının **3.4.5 Kalite Kontrol Süreci** bölümüne aşağıdaki alt bölümler eklenmeli:

### 3.4.5.6 Tetikleyiciler
```
Kalite kontrol süreci aşağıdaki durumlarda otomatik olarak başlar:
1. Hammadde girişi (mal kabul): Stok giriş hareketi oluştuğunda
2. Üretim tamamlandığında: uretim_emri durumu TAMAMLANDI olduğunda
3. İade kabulü: İade hareketi oluştuğunda
```

### 3.4.5.7 Ret Kriterleri
```
Bir lot aşağıdaki durumlardan herhangi biri gerçekleşirse RET olarak işaretlenir:
1. Son kullanma tarihi geçmiş → SKT_GECMIS
2. Ambalaj hasarlı veya açık → AMBALAJ_HASAR
3. Görsel kontrol uygun değil → GORSEL_UYGUN_DEGIL
4. Etiket okunaklı değil → ETIKET_OKUNAMIYOR
5. Nem oranı ürün limitini aşıyor → NEM_ORANI_YUKSEK
6. pH değeri limit dışında → PH_LİMİT_DISI
```

### 3.4.5.8 Stok Durumu Entegrasyonu
```
Kalite kontrol sonuçları stok kartı durumunu otomatik olarak günceller:
- KABUL → stok_karti.durum = 'AKTIF'
- RET → stok_karti.durum = 'RET'
- KISMEN_KABUL → stok_karti.durum = 'KALITE_KONTROL' (onay bekler)
```

### 3.4.5.9 Kalite Kontrol API
```
/api/v1/kalite-kontrol            POST   Yeni kontrol oluştur
/api/v1/kalite-kontrol            GET    Liste (filtrelenebilir)
/api/v1/kalite-kontrol/bekleyen   GET    Bekleyen kontroller
/api/v1/kalite-kontrol/{id}       GET    Detay
/api/v1/kalite-kontrol/{id}/kontrol PATCH Kontrol sonuçlarını gir
/api/v1/kalite-kontrol/{id}/sonuc POST   Sonuç belirle (KABUL/RET/KISMEN_KABUL)
/api/v1/kalite-kontrol/{id}/onay  POST   Yönetici onayı (KISMEN_KABUL için)
/api/v1/kalite-kontrol/rapor/ozet GET    Özet rapor
```

---

## 8. Uygulama Öncelik Sıralaması

| Sıra | Görev | Tahmini Süre | Bağımlılık |
|------|-------|-------------|------------|
| 1 | `kalite_kontrol` tablosu oluştur + trigger | 1 saat | — |
| 2 | `kalite_parametreleri` tablosu + seed veri | 30 dakika | #1 |
| 3 | `POST /kalite-kontrol` endpoint | 2 saat | #1 |
| 4 | `PATCH /kalite-kontrol/{id}/kontrol` endpoint | 2 saat | #3 |
| 5 | `POST /kalite-kontrol/{id}/sonuc` endpoint | 2 saat | #4 |
| 6 | `GET /kalite-kontrol/bekleyen` endpoint | 1 saat | #3 |
| 7 | `POST /kalite-kontrol/{id}/onay` endpoint | 1 saat | #5 |
| 8 | `GET /kalite-kontrol/rapor/ozet` endpoint | 1 saat | #3 |
| 9 | Ret kriteri validasyon servis fonksiyonu | 2 saat | #4 |
| 10 | SRS dokümanı güncelleme | 1 saat | #1–#9 |

**Toplam tahmini süre:** ~13.5 saat (2 iş günü)

---

## 9. Açık Konular (Karar Bekleyen)

| # | Soru | Seçenekler |
|---|------|-----------|
| 1 | KISMEN_KABUL → yönetici onayı zorunlu mu? | (A) Evet, her zaman / (B) Sadece puan < 3.5 için |
| 2 | Ret edilen ürün için imha kararı ayrı tablo mu? | (A) Evet, `kalite_kontrol_imha` / (B) `not` alanına yazılır |
| 3 | Kalite kontrol formu UI nasıl olacak? | (A) Ayrı sayfa / (B) Stok detay modal'ı içinde |
| 4 | Laboratuvar entegrasyonu harici mi? | (A) Harici lab'a API / (B) Manuel giriş (şimdilik) |
| 5 | Kalite puanı eşikleri sistem ayarı mı? | (A) Evet, `sistem_ayarlari` tablosundan çekilsin / (B) Kod içinde sabit |

---

**Hazırlayan:** Hermes Agent  
**Tarih:** 2026-07-29
