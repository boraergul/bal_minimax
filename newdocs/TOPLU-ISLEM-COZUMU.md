# Toplu İşlem (Batch) Altyapısı Tasarım Dokümanı

**Versiyon:** 1.0  
**Tarih:** 2026-07-29  
**Durum:** TASLAK  
**Kaynak:** GAP Analiz Raporu — Bölüm 1.2.1 (Orta Düzey Eksiklik)  
**Mevcut Durum:** API endpoint'leri yok, Excel/CSV import/export belirsiz, `import_log` tablosu yok

---

## 1. Genel Bakış

### 1.1 Mevcut Durum (GAP)
GAP Analiz Raporu'nda şu eksiklikler tespit edilmiştir:

| Eksiklik | Açıklama |
|----------|----------|
| API endpoint'leri yok | Toplu işlemler için herhangi bir REST API tanımlanmamış |
| Import/export mekanizması belirsiz | Excel/CSV ile veri girişi nasıl yapılacak bilinmiyor |
| Log tablosu eksik | `toplu_islemler` veya `import_log` tablosu veritabanı tasarımında yok |
| Validation mekanizması yok | Import edilen verinin doğrulanması için sistem yok |
| Batch job takibi yok | Uzun süren işlemlerin durumu izlenemiyor |
| Hata yönetimi eksik | Başarısız satırlar ne olacak, nasıl raporlanacak belli değil |

### 1.2 Hedef
Büyük miktarda veri girişini (stok girişi, üretim emri, satış kaydı vb.) hızlı ve güvenilir şekilde yapmayı sağlayan bir toplu işlem altyapısı kurmak.

### 1.3 Kapsamdaki İşlem Türleri

| İşlem Türü | Açıklama | Öncelik |
|------------|----------|---------|
| **Stok Girişi (Hammadde)** | CSV/Excel ile toplu hammadde stok girişi | P0 |
| **Üretim Emri** | CSV/Excel ile toplu üretim emri oluşturma | P0 |
| **Müşteri Toplu Kayıt** | CSV/Excel ile toplu müşteri ekleme | P1 |
| **Tedarikçi Toplu Kayıt** | CSV/Excel ile toplu tedarikçi ekleme | P1 |
| **Stok Düzeltme** | CSV/Excel ile toplu stok düzeltme (yönetici onaylı) | P1 |
| **Toplu Etiket Baskı** | Lot listesi ile toplu etiket PDF oluşturma | P2 |
| **Satış Kaydı İracı** | Satış kayıtlarını CSV/Excel'e aktarma | P1 |

---

## 2. Veritabanı Tasarımı

### 2.1 Yeni Tablolar

---

#### 2.1.1 `toplu_islemler` — Toplu İşlem Job Tablosu

Ana işlem kaydı. Her import/export işlemi bir satır olarak kaydedilir.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `islem_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `islem_turu` | VARCHAR(30) | ✓ | IMPORT, EXPORT |
| `islem_alt_turu` | VARCHAR(30) | ✓ | STOK_GIRISI, URETIM_EMRI, MUSKAYIT, TEDARIKCI_KAYIT, STOK_DUZELTME, ETIKET_BASKI, SATIS_IRAC |
| `durum` | VARCHAR(20) | ✓ | BEKLEMEDE, VALIDATING, ISLENIYOR, TAMAMLANDI, HATALAR_VAR, IPTAL_EDILDI |
| `dosya_adi` | VARCHAR(255) | ✓ | Yüklenen/dosyanın adı |
| `dosya_yolu` | VARCHAR(500) | ✓ | Sunucudaki dosya yolu (MinIO/S3) |
| `dosya_boyutu` | BIGINT | ✓ | Byte cinsinden dosya boyutu |
| `dosya_hash` | VARCHAR(64) | ✓ | SHA-256 hash (dosya bütünlük kontrolü) |
| `toplam_satir` | INTEGER | Hayır | Dosyadaki toplam satır sayısı (import için) |
| `basarili_satir` | INTEGER | Hayır | Başarıyla işlenen satır sayısı |
| `basarisiz_satir` | INTEGER | Hayır | Hatalı satır sayısı |
| `toplam_tutanak` | INTEGER | Hayır | Export için oluşturulan kayıt sayısı |
| `sonuc_dosya_adi` | VARCHAR(255) | Hayır | Sonuç dosyası adı (MinIO/S3) |
| `sonuc_dosya_yolu` | VARCHAR(500) | Hayır | Sonuç dosyası yolu |
| `hata_aciklamasi` | TEXT | Hayır | Genel hata açıklaması (işlem düzeyinde) |
| `islem_bilgisi` | JSONB | Hayır | Ek işlem metadata (örn: hangi filtreler uygulandı) |
| `baslama_zamani` | TIMESTAMP | Hayır | İşlemin başladığı zaman |
| `bitis_zamani` | TIMESTAMP | Hayır | İşlemin bittiği zaman |
| `sures_saniye` | INTEGER | Hayır | İşlem süresi (saniye) |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |
| `onaylayan_kullanici_id` | UUID | Hayır | Onaylayan kullanıcı (STOK_DUZELTME için yönetici) |
| `onay_tarihi` | TIMESTAMP | Hayır | Onay tarihi |
| `ip_adresi` | VARCHAR(45) | Hayır | İşlemi başlatan IP |
| `not` | TEXT | Hayır | İşlem notu |

**İndeksler:**
```sql
CREATE INDEX idx_topluislemler_durum ON toplu_islemler(durum);
CREATE INDEX idx_topluislemler_tur ON toplu_islemler(islem_turu, islem_alt_turu);
CREATE INDEX idx_topluislemler_olusturan ON toplu_islemler(olusturan_kullanici_id);
CREATE INDEX idx_topluislemler_tarih ON toplu_islemler(olusturma_tarihi DESC);
```

**Kısıtlamalar:**
```sql
CONSTRAINT toplu_islemler_durum_check CHECK (durum IN ('BEKLEMEDE', 'VALIDATING', 'ISLENIYOR', 'TAMAMLANDI', 'HATALAR_VAR', 'IPTAL_EDILDI'));
CONSTRAINT toplu_islemler_toplam_satir_check CHECK (toplam_satir >= 0);
CONSTRAINT toplu_islemler_basarili_satir_check CHECK (basarili_satir >= 0);
CONSTRAINT toplu_islemler_basarisiz_satir_check CHECK (basarisiz_satir >= 0);
```

---

#### 2.1.2 `toplu_islem_satirlari` — İşlem Satır Detayları

Her import satırının ayrı ayrı sonucunu tutar. Hatalı satırlar için hata detayı saklanır.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `satir_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `islem_id` | UUID | ✓ | İşlem referansı (FK → toplu_islemler) |
| `satir_numarasi` | INTEGER | ✓ | Dosyadaki satır numarası (1-based) |
| `durum` | VARCHAR(20) | ✓ | BASARILI, BASARISIZ, ATLANDI, VALidasyon_HATASI |
| `satir_verisi` | JSONB | ✓ | Orijinal satır verisi (debugging için) |
| `islenmis_veri` | JSONB | Hayır | İşlem sonrası oluşturulan veri (JSON olarak saklanır) |
| `olusturulan_kayit_id` | UUID | Hayır | Oluşturulan kaydın ID'si (stok_karti.stok_id, musteri_id vb.) |
| `hata_kodu` | VARCHAR(50) | Hayır | Hata kodu (VALIDATION_ERROR, FK_ERROR, DUPLICATE_ERROR vb.) |
| `hata_mesaji` | TEXT | Hayır | İnsan okunabilir hata mesajı |
| `hata_detayi` | JSONB | Hayır | Hata detayı (hangi alan, hangi değer, beklene değer) |
| ` yeniden_deneilebilir` | BOOLEAN | ✓ | Bu satır yeniden denebilir mi? (varsayılan: FALSE) |
| `islem_sonrasi_miktar` | DECIMAL(15,3) | Hayır | İşlem sonrası stok miktarı vb. (stok girişi için) |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |

**İlişkiler:**
- `islem_id` → `toplu_islemler(islem_id)` (Many-to-One, CASCADE delete)

**İndeksler:**
```sql
CREATE INDEX idx_toplui_satir_islem ON toplu_islem_satirlari(islem_id);
CREATE INDEX idx_toplui_satir_durum ON toplu_islem_satirlari(durum);
CREATE INDEX idx_toplui_satir_hata_kod ON toplu_islem_satirlari(hata_kodu);
CREATE INDEX idx_toplui_satir_kayit ON toplu_islem_satirlari(olusturulan_kayit_id) WHERE olusturulan_kayit_id IS NOT NULL;
```

**Kısıtlamalar:**
```sql
CONSTRAINT toplu_islem_satirlari_durum_check CHECK (durum IN ('BASARILI', 'BASARISIZ', 'ATLANDI', 'VALIDATION_HATASI'));
```

---

#### 2.1.3 `toplu_islem_sablonlari` — Import Şablon Tanımları

Her import türü için şablon tanımı. Kolon eşleştirmesi, validasyon kuralları ve örnek dosya bilgisi tutulur.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `sablon_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `ad` | VARCHAR(100) | ✓ | Şablon adı (örn: "Hammadde Stok Girişi Şablonu") |
| `islem_alt_turu` | VARCHAR(30) | ✓ | Hangi import türü için (STOK_GIRISI, URETIM_EMRI vb.) |
| `aciklama` | TEXT | Hayır | Şablon açıklaması |
| `versiyon` | VARCHAR(20) | ✓ | Şablon versiyonu (örn: "1.0") |
| `kolon_eslemeleri` | JSONB | ✓ | JSON: { "excel_kolon": "db_kolon", ... } |
| `zorunlu_kolonlar` | JSONB | ✓ | Zorunlu kolon listesi |
| `veri_tipleri` | JSONB | ✓ | Kolon veri tipi tanımları (string, integer, decimal, date, uuid, enum) |
| `enum_degerleri` | JSONB | Hayır | Enum kolonlar için geçerli değerler |
| `ornek_dosya_yolu` | VARCHAR(500) | Hayır | Örnek dosya indirme yolu |
| `maks_satir` | INTEGER | ✓ | Maksimum satır sayısı (varsayılan: 10000) |
| `desteklenen_formatlar` | VARCHAR(50) | ✓ | Desteklenen formatlar: CSV, XLSX, XLS |
| `aktif` | BOOLEAN | ✓ | Şablon aktif mi? |
| `varsayilan` | BOOLEAN | ✓ | Bu şablon varsayılan mı? |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

**Unique Constraint:**
```sql
CONSTRAINT toplu_islem_sablonlari_unique UNIQUE (islem_alt_turu, versiyon);
```

---

### 2.2 Mevcut Tablolarda Değişiklik

#### `sistem_ayarlari` — Yeni Sistem Ayarları

Aşağıdaki ayarlar `sistem_ayarlari` tablosuna eklenmelidir:

| Ayar Adı | Veri Tipi | Kategori | Varsayılan | Açıklama |
|----------|-----------|----------|------------|----------|
| `TOPLU_ISLEM_MAK_SATIR` | INTEGER | STOK | 10000 | Tek seferde işlenebilecek max satır |
| `TOPLU_ISLEM_TIMEOUT_DK` | INTEGER | STOK | 30 | İşlem başına timeout (dakika) |
| `TOPLU_ISLEM_BASARI_ESIGI` | DECIMAL | STOK | 0.80 | İşlem başarılı sayılması için minimum oran |
| `TOPLU_ISLEM_DOSYA_BOYUT_MB` | INTEGER | STOK | 50 | Maksimum dosya boyutu (MB) |
| `TOPLU_ISLEM_RETRY_COUNT` | INTEGER | STOK | 3 | Hatalı satır yeniden deneme sayısı |
| `TOPLU_ISLEM_RESULT_SAKLAMA_GUN` | INTEGER | STOK | 30 | Sonuç dosyalarının saklama süresi (gün) |

---

## 3. API Endpoint Tasarımı

### 3.1 Toplu İşlem API'leri — Genel Yapı

**Base URL:** `/api/v1/toplu-islemler`

**Auth:** JWT Token (rol bazlı yetki kontrolü)

**Yetki Gereksinimleri:**
| Endpoint | Gerekli Yetki |
|----------|---------------|
| POST (import) | `toplu_import` |
| POST (export) | `toplu_export` |
| GET /status | `toplu_oku` |
| GET /detail | `toplu_oku` |
| POST /approve | `toplu_onayla` |
| POST /cancel | `toplu_iptal` |
| GET /download | `toplu_oku` |
| GET /template | `toplu_oku` |

---

### 3.2 Endpoint Detayları

#### 3.2.1 `POST /api/v1/toplu-islemler/import` — Toplu Import Başlat

**Açıklama:** Excel/CSV dosyasını yükler, async olarak işlemeye başlar.

**Request:**
- Content-Type: `multipart/form-data`
- Gövde:
  - `file`: Dosya (zorunlu, max 50MB)
  - `islem_alt_turu`: String (zorunlu,örn: STOK_GIRISI)
  - `sablon_id`: UUID (opsiyonel, belirtilmezse varsayılan şablon kullanılır)
  - `async`: Boolean (varsayılan: true) — false olursa sync işlem (küçük dosyalar için)

**Response (201 Created — async):**
```json
{
  "islem_id": "550e8400-e29b-41d4-a716-446655440000",
  "durum": "BEKLEMEDE",
  "mesaj": "Import işlemi sıraya alındı",
  "dosya_adi": "stok_girisi_2026.xlsx",
  "toplam_satir": 1500,
  "tahmini_sure_sn": 45,
  "durum_url": "/api/v1/toplu-islemler/550e8400-e29b-41d4-a716-446655440000/durum",
  "sonuc_url": "/api/v1/toplu-islemler/550e8400-e29b-41d4-a716-446655440000/sonuc"
}
```

**Response (200 OK — sync, küçük dosya):**
```json
{
  "islem_id": "550e8400-e29b-41d4-a716-446655440000",
  "durum": "TAMAMLANDI",
  "toplam_satir": 150,
  "basarili_satir": 148,
  "basarisiz_satir": 2,
  "islem_suresi_sn": 3,
  "hatali_satirlar": [
    {
      "satir_numarasi": 23,
      "hata_kodu": "FK_ERROR",
      "hata_mesaji": "urun_id: Geçersiz ürün ID'si",
      "satir_verisi": { "urun_kodu": "KAY-001", "miktar": 100 }
    }
  ]
}
```

**Hata Durumları:**
| HTTP Kodu | Hata | Açıklama |
|-----------|------|----------|
| 400 | GEÇERSIZ_DOSYA | Desteklenmeyen format veya bozuk dosya |
| 400 | SATIR_ASIMI | Satır sayısı limiti aşıyor |
| 400 | EKSİK_ZORUNLU_KOLON | Zorunlu kolon eksik |
| 401 | YETKISIZ | Token geçersiz veya yetki yok |
| 413 | DOSYA_BUYUK | Dosya boyutu limiti aşıyor |

---

#### 3.2.2 `POST /api/v1/toplu-islemler/export` — Toplu Export

**Açıklama:** Belirtilen filtrelere göre veri çıktısı oluşturur.

**Request (JSON):**
```json
{
  "islem_alt_turu": "SATIS_IRAC",
  "filtreler": {
    "tarih_baslangic": "2026-01-01",
    "tarih_bitis": "2026-07-31",
    "musteri_id": null,
    "durum": "TAMAMLANDI"
  },
  "format": "XLSX",
  "sablon_id": "...",
  "async": true
}
```

**Response (202 Accepted — async):**
```json
{
  "islem_id": "660e8400-e29b-41d4-a716-446655440001",
  "durum": "BEKLEMEDE",
  "mesaj": "Export işlemi sıraya alındı",
  "tahmini_sure_sn": 120,
  "durum_url": "/api/v1/toplu-islemler/660e8400-e29b-41d4-a716-446655440001/durum"
}
```

---

#### 3.2.3 `GET /api/v1/toplu-islemler/{islem_id}/durum` — İşlem Durumu Sorgula

**Response:**
```json
{
  "islem_id": "550e8400-e29b-41d4-a716-446655440000",
  "islem_turu": "IMPORT",
  "islem_alt_turu": "STOK_GIRISI",
  "durum": "ISLENIYOR",
  "dosya_adi": "stok_girisi_2026.xlsx",
  "toplam_satir": 1500,
  "islenen_satir": 750,
  "basarili_satir": 745,
  "basarisiz_satir": 5,
  "ilerleme_yuzde": 50.0,
  "baslama_zamani": "2026-07-29T10:30:00Z",
  "tahmini_bitis_zamani": "2026-07-29T10:31:00Z",
  "sures_saniye": 30,
  "islem_logu": [
    { "zaman": "2026-07-29T10:30:00Z", "mesaj": "Dosya yüklendi, validasyon başladı" },
    { "zaman": "2026-07-29T10:30:05Z", "mesaj": "Validasyon tamamlandı: 1500 satır, 5 hatalı" },
    { "zaman": "2026-07-29T10:30:05Z", "mesaj": "İşleme başlandı" }
  ]
}
```

**Durum Geçiş Diyagramı:**
```
BEKLEMEDE
    │ (dosya alındı, validasyon başlayacak)
    ▼
VALIDATING ────► HATA ────► IPTAL_EDILDI
    │ (validasyon geçildi)
    ▼
ISLENIYOR ◄───────────────────► HATALAR_VAR
    │ (tüm satırlar işlendi)        │
    │                               │ (en az 1 hatalı satır var)
    ▼                               ▼
    TAMAMLANDI ◄────────────────────�
```

---

#### 3.2.4 `GET /api/v1/toplu-islemler/{islem_id}/sonuc` — İşlem Sonucu Detayı

**Query Params:**
- `sayfa`: Integer (varsayılan: 1)
- `sayfa_boyutu`: Integer (varsayılan: 50, max: 200)
- `durum`: BASARILI | BASARISIZ | ATLANDI | VALIDATION_HATASI (filtreleme)
- `hata_kodu`: String (filtreleme)

**Response:**
```json
{
  "islem_id": "550e8400-e29b-41d4-a716-446655440000",
  "durum": "HATALAR_VAR",
  "toplam_satir": 1500,
  "basarili_satir": 1495,
  "basarisiz_satir": 5,
  "sayfa": 1,
  "sayfa_boyutu": 50,
  "toplam_sayfa": 1,
  "satirlar": [
    {
      "satir_id": "770e8400-e29b-41d4-a716-446655440099",
      "satir_numarasi": 23,
      "durum": "BASARISIZ",
      "satir_verisi": {
        "urun_kodu": "KAY-999",
        "miktar": "abc",
        "birim_fiyat": 150.00
      },
      "olusturulan_kayit_id": null,
      "hata_kodu": "VALIDATION_ERROR",
      "hata_mesaji": "Miktar alanı sayısal olmalıdır",
      "hata_detayi": {
        "alan": "miktar",
        "girilen_deger": "abc",
        "beklenen_tip": "DECIMAL(15,3)"
      },
      "yeniden_deneilebilir": true
    },
    {
      "satir_id": "770e8400-e29b-41d4-a716-446655440100",
      "satir_numarasi": 45,
      "durum": "BASARILI",
      "satir_verisi": {
        "urun_kodu": "KAY-001",
        "miktar": 100,
        "birim_fiyat": 150.00
      },
      "olusturulan_kayit_id": "880e8400-e29b-41d4-a716-446655440200",
      "hata_kodu": null,
      "hata_mesaji": null,
      "yeniden_deneilebilir": false
    }
  ],
  "indirme_url": "/api/v1/toplu-islemler/550e8400-e29b-41d4-a716-446655440000/hata-raporu-indir"
}
```

---

#### 3.2.5 `GET /api/v1/toplu-islemler/{islem_id}/hata-raporu-indir` — Hata Raporu İndir

**Query Params:**
- `format`: CSV | XLSX (varsayılan: CSV)

**Response:** İndirilebilir dosya (Content-Disposition: attachment)

Dosya içeriği (CSV):
```csv
satir_numarasi,durum,urun_kodu,miktar,hata_kodu,hata_mesaji
23,BASARISIZ,KAY-999,abc,VALIDATION_ERROR,Miktar alanı sayısal olmalıdır
47,BASARISIZ,KAY-001,-50,VALIDATION_ERROR,Miktar sıfırdan büyük olmalıdır
```

---

#### 3.2.6 `GET /api/v1/toplu-islemler` — İşlem Listesi

**Query Params:**
- `sayfa`: Integer (varsayılan: 1)
- `sayfa_boyutu`: Integer (varsayılan: 20, max: 100)
- `islem_turu`: IMPORT | EXPORT
- `islem_alt_turu`: String
- `durum`: String
- `tarih_baslangic`: ISO date
- `tarih_bitis`: ISO date
- `olusturan_id`: UUID

**Response:**
```json
{
  "sayfa": 1,
  "sayfa_boyutu": 20,
  "toplam_kayit": 45,
  "toplam_sayfa": 3,
  "islemler": [
    {
      "islem_id": "550e8400-e29b-41d4-a716-446655440000",
      "islem_turu": "IMPORT",
      "islem_alt_turu": "STOK_GIRISI",
      "durum": "TAMAMLANDI",
      "dosya_adi": "stok_girisi_2026.xlsx",
      "toplam_satir": 1500,
      "basarili_satir": 1495,
      "basarisiz_satir": 5,
      "olusturma_tarihi": "2026-07-29T10:30:00Z",
      "sures_saniye": 120,
      "olusturan_ad": "Ahmet Yılmaz"
    }
  ]
}
```

---

#### 3.2.7 `POST /api/v1/toplu-islemler/{islem_id}/onay` — Stok Düzeltme Onay

**Açıklama:** Yönetici onayı gerektiren toplu işlemleri onaylar (STOK_DUZELTME gibi).

**Request:**
```json
{
  "onay_durumu": "ONAYLA",
  "not": "Miktar kontrol edildi, uygun"
}
```

**Response:**
```json
{
  "islem_id": "550e8400-e29b-41d4-a716-446655440000",
  "durum": "ISLENIYOR",
  "onay_tarihi": "2026-07-29T11:00:00Z",
  "onaylayan": "Mehmet Demir (ADMIN)"
}
```

---

#### 3.2.8 `GET /api/v1/toplu-islemler/sablonlar` — Şablon Listesi

**Response:**
```json
{
  "sablonlar": [
    {
      "sablon_id": "990e8400-e29b-41d4-a716-446655440300",
      "ad": "Hammadde Stok Girişi Şablonu",
      "islem_alt_turu": "STOK_GIRISI",
      "versiyon": "1.0",
      "zorunlu_kolonlar": ["urun_kodu", "miktar", "birim_fiyat", "tedarikci_vergi_no"],
      "maks_satir": 10000,
      "desteklenen_formatlar": ["CSV", "XLSX"],
      "varsayilan": true,
      "ornek_indirme_url": "/api/v1/toplu-islemler/sablonlar/990e.../ornek-indir"
    }
  ]
}
```

---

#### 3.2.9 `GET /api/v1/toplu-islemler/sablonlar/{sablon_id}/ornek-indir` — Örnek Şablon İndir

**Response:** İndirilebilir örnek dosya (CSV/XLSX)

---

## 4. Import Validation Mekanizması

### 4.1 Validation Katmanları

Her import işlemi 3 aşamadan geçer:

```
┌─────────────────────────────────────────────────────────────┐
│  AŞAMA 1: FORMAT VALİDASYONU (Hızlı, Senkron)               │
│  • Dosya formatı kontrolü (CSV, XLSX)                      │
│  • Dosya boyutu kontrolü                                    │
│  • Kolon başlık kontrolü (zorunlu kolonlar mevcut mu?)    │
│  • Max satır sayısı kontrolü                                │
│  → Hata varsa: BEKLEMEDE → IPTAL_EDILDI (anında red)       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  AŞAMA 2: DATA TYPE VALİDASYONU (Senkron)                   │
│  • Her hücre için veri tipi kontrolü                         │
│  • Tarih formatları (DD.MM.YYYY, YYYY-MM-DD)                │
│  • Sayısal alanlar (integer, decimal)                       │
│  • UUID formatı kontrolü                                    │
│  • Enum değerleri kontrolü (kategori, birim vb.)             │
│  → Her satır: VALIDATION_HATASI veya devam                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  AŞAMA 3: BUSINESS VALİDASYONU (Async, DB bağlantılı)       │
│  • FK kontrolü (urun_id, tedarikci_id gerçekten var mı?)    │
│  • Müşteri/tedarikçi vergi_no benzersizlık kontrolü         │
│  • Stok miktarı >= 0 kontrolü                               │
│  • Birim tutarlılığı (kg, ton, adet)                         │
│  • Çift kayıt kontrolü (aynı lot_no var mı?)                │
│  → Her satır: BASARILI veya BASARISIZ (yeniden denenebilir) │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Validation Kuralları — Stok Girişi Örneği

**Zorunlu Alanlar:** `urun_kodu`, `miktar`, `birim_fiyat`, `tedarikci_vergi_no`

**Alan Validasyonları:**

| Alan | Kural | Hata Kodu |
|------|-------|-----------|
| `urun_kodu` | Ürünler tablosunda mevcut olmalı | FK_ERROR |
| `miktar` | > 0, sayısal olmalı | VALIDATION_ERROR |
| `birim_fiyat` | >= 0, sayısal olmalı | VALIDATION_ERROR |
| `tedarikci_vergi_no` | Vergi numarası formatı: 10 veya 11 rakam | VALIDATION_ERROR |
| `tedarikci_vergi_no` | Tedarikçiler tablosunda mevcut olmalı | FK_ERROR |
| `birim` | Geçerli birim: kg, ton, adet, paket | VALIDATION_ERROR |
| `stok_tipi` | HAMMADDE veya MAMUL olmalı | VALIDATION_ERROR |
| `uretim_tarihi` | Tarih formatı, bugünden ileri olmaz | VALIDATION_ERROR |
| `son_kullanma` | Tarih formatı, uretim_tarihi'nden ileri olmalı | VALIDATION_ERROR |
| `lot_no` | Benzersiz olmalı (stok_karti tablosunda) | DUPLICATE_ERROR |

### 4.3 Hata Kodları Sözlüğü

| Hata Kodu | Açıklama | Yeniden Denenebilir |
|-----------|----------|---------------------|
| `VALIDATION_ERROR` | Veri tipi veya format hatası | Hayır |
| `FK_ERROR` | Foreign key bulunamadı | Hayır |
| `DUPLICATE_ERROR` | Çift kayıt | Hayır |
| `MISSING_REQUIRED` | Zorunlu alan eksik | Hayır |
| `CONSTRAINT_ERROR` | DB kısıtlaması ihlali | Evet (düzeltildikten sonra) |
| `BUSINESS_RULE_ERROR` | İş kuralı ihlali (örn: yetersiz stok) | Evet |
| `INTERNAL_ERROR` | Beklenmeyen sunucu hatası | Evet |
| `FILE_PARSE_ERROR` | Dosya ayrıştırma hatası | Hayır |

---

## 5. Batch Job Status Takibi

### 5.1 Durum Makinesi

```
╔════════════════╗     dosya alındı     ╔══════════════╗
║   BEKLEMEDE     ├──────────────────────►║  VALIDATING  ║
╚════════════════╝                       ╚══════╤═══════╝
                                                │
                           validasyon hatası    │  validasyon geçti
                    ┌──────────────────────────┼──────────────────────┐
                    ▼                                                  ▼
           ╔═══════════════╗                               ╔══════════════╗
           ║IPTAL_EDILDI  ║                               ║  ISLENIYOR    ║
           ╚═══════════════╝                               ╚══════╤═══════╝
                                                                  │
                                     tüm satırlar işlendi         │
                    ┌──────────────────────────────────────────────┤
                    ▼                                              ▼
           ╔═══════════════════╗                        ╔══════════════╗
           ║    HATALAR_VAR     ║                        ║  TAMAMLANDI   ║
           ╚═══════════════════╝                        ╚══════════════╝
```

### 5.2 WebSocket / Server-Sent Events (Opsiyonel)

Uzun süren işlemler için gerçek zamanlı ilerleme takibi:

**Endpoint:** `GET /api/v1/toplu-islemler/{islem_id}/stream`

**Event Format (SSE):**
```
data: {"tip": "ILERLEME", "islenen_satir": 500, "toplam_satir": 1500, "yuzde": 33}
data: {"tip": "SATIR_HATASI", "satir_numarasi": 234, "hata_kodu": "FK_ERROR"}
data: {"tip": "TAMAMLANDI", "basarili": 1495, "basarisiz": 5}
```

### 5.3 Periyodik Durum Güncelleme

İşlem durumu her 100 satırda veya 5 saniyede bir güncellenir:

```sql
UPDATE toplu_islemler
SET basarili_satir = :basarili,
    basarisiz_satir = :basarisiz,
    guncelleme_tarihi = NOW()
WHERE islem_id = :islem_id;
```

---

## 6. Hata Yönetimi

### 6.1 Başarısız Satır Stratejileri

| Senaryo | Davranış |
|---------|----------|
| Validation hatası (geçersiz veri) | Satır BASARISIZ olarak işaretlenir, işlem devam eder |
| FK hatası (bağlı kayıt yok) | Satır BASARISIZ, işlem devam eder |
| DB constraint hatası | Satır BASARISIZ, işlem devam eder |
| Sunucu crash | İşlem BEKLEMEDE kalır, ops tarafından manuel müdahale |
| Timeout | İşlem IPTAL_EDILDI, başarılı satırlar korunur |

### 6.2 Kısmi Başarı (Partial Success)

Import işlemi, başarı eşiği (`TOPLU_ISLEM_BASARI_ESIGI`, varsayılan %80) aşılırsa TAMAMLANDI olarak işaretlenir. Eşiğin altındaysa HATALAR_VAR olarak işaretlenir.

```python
basari_orani = basarili_satir / toplam_satir
if basari_orani >= ayar["TOPLU_ISLEM_BASARI_ESIGI"]:
    durum = "TAMAMLANDI"
else:
    durum = "HATALAR_VAR"
```

### 6.3 Yeniden Deneme Mekanizması (Retry)

`yeniden_deneilebilir = TRUE` olan satırlar yeniden işlenebilir:

**Endpoint:** `POST /api/v1/toplu-islemler/{islem_id}/yeniden-dene`

```json
{
  "satir_idler": ["...", "..."],
  "duzeltilmis_veriler": {
    "770e8400-...": { "miktar": 100 },
    "770e8401-...": { "urun_kodu": "KAY-001" }
  }
}
```

Yeniden deneme sonucunda satır güncellenir ve eski hatalı kayıt `ATLANDI` olarak işaretlenir.

### 6.4 Sonuç Dosyası Saklama

Başarılı bir import veya export sonrasında sonuç dosyası MinIO/S3'e saklanır:

```
toplu-islemler/
├── results/
│   ├── import/
│   │   └── {islem_id}/
│   │       ├── original_{dosya_adi}.xlsx
│   │       └── hata_raporu_{islem_id}.csv
│   └── export/
│       └── {islem_id}/
│           └── export_{islem_id}.xlsx
```

Saklama süresi: `TOPLU_ISLEM_RESULT_SAKLAMA_GUN` (varsayılan 30 gün).

---

## 7. Güvenlik ve Yetki Kontrolü

### 7.1 Rol Bazlı Yetkiler

| Rol | Import | Export | Onay | Görüntüleme |
|-----|--------|--------|------|-------------|
| ADMIN | ✓ Tümü | ✓ Tümü | ✓ | ✓ Tümü |
| DEPO_SORUMLUSU | ✓ Stok Girişi, Stok Düzeltme | ✓ Stok ile ilgili | ✗ | ✓ Kendi işlemleri |
| SATIS_SORUMLUSU | ✓ Müşteri, Satış İhracı | ✓ Satış ile ilgili | ✗ | ✓ Kendi işlemleri |

### 7.2 Dosya Güvenliği

- Yüklenen dosyalar MinIO/S3'e `private` olarak kaydedilir
- İndirme URL'leri imzalı (presigned), 1 saat geçerli
- Dosya hash (SHA-256) ile bütünlük kontrolü

### 7.3 Denetim Günlüğü

Tüm toplu işlemler `audit_log` tablosuna kaydedilir:

```json
{
  "tablo_adi": "toplu_islemler",
  "kayit_id": "550e8400-...",
  "islem_tipi": "INSERT",
  "yeni_deger": {
    "islem_turu": "IMPORT",
    "islem_alt_turu": "STOK_GIRISI",
    "dosya_adi": "stok_girisi_2026.xlsx",
    "toplam_satir": 1500,
    "olusturan": "Ahmet Yılmaz"
  }
}
```

---

## 8. Dosya Format Detayları

### 8.1 CSV Format Kuralları

- Encoding: UTF-8 (BOM olmadan)
- Ayırıcı: Virgül (`,`)
- Tırnak: Çift tırnak (`"`) — değerlerde virgül varsa
- Tarih formatı: `DD.MM.YYYY` veya `YYYY-MM-DD`
- Ondalık ayracı: Nokta (`.`)
- Satır başlığı: İlk satır

### 8.2 Excel (XLSX) Format Kuralları

- İlk sayfa kullanılır
- İlk satır: Başlık
- Tarih hücreleri: Excel tarih formatı
- Sayısal hücreler: Sayı formatı
- Boş hücreler: NULL olarak işlenir

### 8.3 Örnek Stok Girişi CSV

```csv
urun_kodu,miktar,birim,birim_fiyat,tedarikci_vergi_no,stok_tipi,uretim_tarihi,son_kullanma,konum,not
KAY-001,100,kg,150.00,1234567890,HAMMADDE,01.07.2026,01.07.2027,A-01-01,""
KAY-002,50,kg,200.50,1234567890,HAMMADDE,15.07.2026,15.07.2027,A-01-02,"İlk kalite"
UZM-001,200,kg,80.00,0987654321,HAMMADDE,20.07.2026,20.07.2026,B-02-01,"Çabuk sat"
```

---

## 9. Celery Task Tanımları

Toplu işlemler Celery worker'lar üzerinde asenkron çalışır:

```python
# Task tanımları
@celery_app.task(bind=True, name='toplu_islem.import_stok_girisi')
def import_stok_girisi(self, islem_id, dosya_yolu, sablon_id):
    """Hammadde stok girişi import task'i"""
    # 1. Dosyayı oku
    # 2. Validation Aşama 2 (veri tipleri)
    # 3. Validation Aşama 3 (business rules, FK kontrolleri)
    # 4. Her satırı işle
    # 5. Sonuçları kaydet
    # 6. Sonuç dosyasını oluştur
    pass

@celery_app.task(name='toplu_islem.export_satis')
def export_satis(self, islem_id, filtreler, format):
    """Satış kayıtları export task'i"""
    pass

# Queue yapısı
QUEUES = {
    'toplu_islem_import': 'toplu.islem.import',    # P0 — hızlı yanıt beklenir
    'toplu_islem_export': 'toplu.islem.export',    # P1 — raporlama
    'toplu_islem_yeniden': 'toplu.islem.yeniden',  # P2 — retry işlemleri
}
```

**Retry Policy:**
- Max retries: 3
- Retry interval: Exponential backoff (10s, 30s, 90s)
- Dead letter queue: `toplu_islem_dlq`

---

## 10. Karşılaştırma: Mevcut Durum vs Tasarım

| Özellik | Mevcut Durum (GAP 1.2.1) | Tasarım Sonrası |
|---------|--------------------------|-----------------|
| Import API | Yok | POST /import |
| Export API | Yok | POST /export |
| Şablon sistemi | Yok | /sablonlar endpoint |
| import_log tablosu | Yok | toplu_islemler + toplu_islem_satirlari |
| Validation | Yok | 3 aşamalı validasyon |
| Batch status | Yok | /durum endpoint, SSE |
| Hata yönetimi | Yok | Hata raporu, retry |
| Yetkilendirme | Yok | RBAC |

---

## 11. Sonraki Adımlar

1. **Veritabanı Migration:** `toplu_islemler`, `toplu_islem_satirlari`, `toplu_islem_sablonlari` tablolarını oluştur
2. **Celery Task yapısı:** Queue ve retry policy tanımla
3. **MinIO/S3 entegrasyonu:** Dosya depolama ve presigned URL
4. **API implementasyonu:** CRUD + import/export endpoint'leri
5. **Validation kütüphanesi:** Tip kontrolü, FK kontrolü, iş kuralları
6. **Swagger dokümantasyonu:** OpenAPI spec güncelle
7. **Test senaryoları:** Happy path + hata senaryoları + boundary testleri

---

**Doküman Bilgisi:**
- Toplam yeni tablo sayısı: 3
- Toplam yeni endpoint sayısı: 9
- Mevcut tablolarda değişiklik: 1 (sistem_ayarlari — 6 yeni ayar)
