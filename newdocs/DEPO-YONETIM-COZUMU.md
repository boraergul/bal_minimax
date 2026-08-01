# Depo Yönetim Sistemi Tasarım Dokümanı
## Kurutulmuş Meyve ve Bal Yönetim Sistemi (ERP)

---

**Versiyon:** 1.0  
**Tarih:** 2026-07-29  
**Durum:** TASLAK — Orta Düzey Tasarım  
**Kapsam:** Depo/Konum Yönetimi, Kapasite Takibi, Depolar Arası Transfer

---

## 1. Giriş ve Mevcut Durum Analizi

### 1.1 Mevcut Durum (Gap Analizi Sonucu)

Mevcut sistemde `stok_karti` tablosunda aşağıdaki konum alanları bulunmaktadır:

| Alan | Tip | Açıklama |
|------|-----|----------|
| `depo` | VARCHAR(50) | Depo adı (A deposu, B deposu vb.) |
| `raf` | VARCHAR(50) | Raf numarası |
| `blok` | VARCHAR(50) | Depo içi blok/bölge |
| `palet_no` | VARCHAR(50) | Palet numarası (varsa) |

**Tespit Edilen Eksiklikler:**

1. **Ayrı depo/konum modülü yok** — Konum bilgisi sadece serbest metin alan olarak tutuluyor
2. **Depo kapasitesi ve doluluk oranı takibi yok** — Dolu mu boş mu bilinmiyor
3. **Depolar arası transfer belirsiz** — `TRANSFER` hareket tipi var ama iş akışı dokümante değil
4. **Konum validasyonu yok** — Olmayan rafa koyma engellenmiyor
5. **Depo bazlı stok hareketi kuralları tanımsız** — Hangi depodan hangi kurallarla çıkış yapılacağı belli değil
6. **Kapasite uyarı mekanizması yok** — Depo dolduğunda uyarı verilmiyor

### 1.2 Tasarım Hedefleri

- [x] Depo ve konum tablosu (ambar/raf/blok/palet seviyesi)
- [x] Doluluk oranı ve kapasite takibi
- [x] Depolar arası transfer iş akışı
- [x] Konum validasyonu (olmayan rafa koyma engeli)
- [x] Depo bazlı stok hareketi kuralları
- [x] Kapasite uyarı mekanizması

---

## 2. Veritabanı Tasarımı

### 2.1 Yeni Tablolar

---

#### 2.1.1 `depolar` — Depo Tanımları

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `depo_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `kod` | VARCHAR(20) | ✓ | Depo kodu (örn: DEPO-A, DEPO-B) — unique |
| `ad` | VARCHAR(100) | ✓ | Depo adı (örn: Ana Depo, Yardımcı Depo) |
| `tip` | VARCHAR(20) | ✓ | HAMMADDE, MAMUL, KARISIM, DEPO_DISI |
| `adres` | TEXT | Hayır | Depo adresi |
| `kapasite_m2` | DECIMAL(10,2) | Hayır | Depo alanı (m²) |
| `kapasite_kg` | DECIMAL(15,3) | Hayır | Maksimum kapasite (kg) |
| `yukseklik_m` | DECIMAL(5,2) | Hayır | Depo yüksekliği (m) |
| `sicaklik_kontrolu` | BOOLEAN | ✓ | Sıcaklık kontrolü var mı? (varsayılan: FALSE) |
| `sicaklik_min` | DECIMAL(5,2) | Hayır | Min sıcaklık (°C) — gıda için |
| `sicaklik_max` | DECIMAL(5,2) | Hayır | Max sıcaklık (°C) — gıda için |
| `nem_orani_min` | INTEGER | Hayır | Min nem (%) |
| `nem_orani_max` | INTEGER | Hayır | Max nem (%) |
| `aktif` | BOOLEAN | ✓ | Aktif/Pasif (varsayılan: TRUE) |
| ` varsayilan_kabul_deposu` | BOOLEAN | ✓ | Varsayılan kabul deposu mu? (varsayılan: FALSE) |
| `varsayilan_sevk_deposu` | BOOLEAN | ✓ | Varsayılan sevk deposu mu? (varsayılan: FALSE) |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

**Kısıtlamalar:**
```sql
CONSTRAINT depolar_kod_unique EXCLUDE (kod WITH =) WHERE (silme_tarihi IS NULL);
CONSTRAINT depolar_kapasite_positive CHECK (kapasite_m2 > 0 AND kapasite_kg > 0);
```

**İlişkiler:**
- `olusturan_kullanici_id` → `kullanicilar(kullanici_id)` (Many-to-One)

---

#### 2.1.2 `depo_bloklar` — Depo Blok/Bölge Tanımları

Her depo, fiziksel olarak bloklara/bölgelere ayrılmıştır (örneğin: A1, A2, B1, B2).

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `blok_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `depo_id` | UUID | ✓ | Depo referansı (FK → depolar) |
| `kod` | VARCHAR(20) | ✓ | Blok kodu (örn: A1, B2, HAMMADDE-1) — depo içinde unique |
| `ad` | VARCHAR(100) | ✓ | Blok adı |
| `tip` | VARCHAR(20) | ✓ | STORAGE, PICKING, RECEIVING, SHIPPING, QUARANTINE, RETURN |
| `kat` | INTEGER | ✓ | Depo katı (0 = zemin, 1 = birinci kat, vb.) |
| `kapasite_m2` | DECIMAL(10,2) | Hayır | Blok alanı (m²) |
| `kapasite_kg` | DECIMAL(15,3) | Hayır | Blok maksimum kapasite (kg) |
| `raf_sayisi` | INTEGER | Hayır | Bu bloktaki raf sayısı |
| `aktif` | BOOLEAN | ✓ | Aktif/Pasif (varsayılan: TRUE) |
| `sira_no` | INTEGER | ✓ | Görüntüleme sırası |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

**Kısıtlamalar:**
```sql
CONSTRAINT depo_bloklar_kod_unique EXCLUDE (depo_id WITH =, kod WITH =) WHERE (silme_tarihi IS NULL);
```

**İlişkiler:**
- `depo_id` → `depolar(depo_id)` (Many-to-One)
- `olusturan_kullanici_id` → `kullanicilar(kullanici_id)` (Many-to-One)

---

#### 2.1.3 `depo_raflar` — Raf Tanımları

Her blok içinde raflar bulunur. Raf yapısı: koridor + raf numarası.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `raf_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `blok_id` | UUID | ✓ | Blok referansı (FK → depo_bloklar) |
| `kod` | VARCHAR(20) | ✓ | Raf kodu (örn: R01, R02) — blok içinde unique |
| `ad` | VARCHAR(100) | ✓ | Raf adı |
| `raf_tip` | VARCHAR(20) | ✓ | PALET, CASCADE, BULK, FLOOR |
| `katman_sayisi` | INTEGER | ✓ | Raf katman sayısı (1-10) |
| `konum_basamak_sayisi` | INTEGER | ✓ | Her katmandaki konum sayısı (1-20) |
| `kapasite_kg` | DECIMAL(15,3) | Hayır | Raf maksimum kapasite (kg) |
| `genislik_cm` | DECIMAL(8,2) | Hayır | Raf genişliği (cm) |
| `derinlik_cm` | DECIMAL(8,2) | Hayır | Raf derinliği (cm) |
| `yukseklik_cm` | DECIMAL(8,2) | Hayır | Raf yüksekliği (cm) |
| `aktif` | BOOLEAN | ✓ | Aktif/Pasif (varsayılan: TRUE) |
| `sira_no` | INTEGER | ✓ | Görüntüleme sırası |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

**Kısıtlamalar:**
```sql
CONSTRAINT depo_raflar_kod_unique EXCLUDE (blok_id WITH =, kod WITH =) WHERE (silme_tarihi IS NULL);
```

**İlişkiler:**
- `blok_id` → `depo_bloklar(blok_id)` (Many-to-One)
- `olusturan_kullanici_id` → `kullanicilar(kullanici_id)` (Many-to-One)

---

#### 2.1.4 `depo_konumlar` — Fiziksel Depo Konumları (Raf İçi)

Her raf katmanında birden fazla konum bulunur. Tam konum kodu: `DEP-A / BLOK-A1 / RAF-R01 / KAT-2 / KON-05`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `konum_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `raf_id` | UUID | ✓ | Raf referansı (FK → depo_raflar) |
| `kod` | VARCHAR(20) | ✓ | Konum kodu (örn: K01, K02) — raf içinde unique |
| `tam_kod` | VARCHAR(50) | ✓ | Tam adres kodu (örn: DEPO-A:BLOK-A1:RAF-R01:KAT-2:KON-05) |
| `katman` | INTEGER | ✓ | Kaçıncı katman (1 = en alt) |
| `konum_no` | INTEGER | ✓ | Katman içinde sıra numarası (1 = en solda) |
| `tip` | VARCHAR(20) | ✓ | STORAGE, PICKING, BUFFER, DAMAGED, QUARANTINE |
| `durum` | VARCHAR(20) | ✓ | BOS, DOLU, REZERVE, BAKIM, IPTAL |
| `kapasite_kg` | DECIMAL(15,3) | Hayır | Bu konumun maksimum kapasitesi (kg) |
| `mevcut_kg` | DECIMAL(15,3) | ✓ | Mevcut ağırlık (kg) — hesaplanır |
| `doluluk_orani` | DECIMAL(5,2) | ✓ | Doluluk yüzdesi (0-100) — hesaplanır |
| `son_kullanma_uyari` | INTEGER | ✓ | Bu konumdaki ürünlerin son kullanma uyarısı (gün) — varsayılan: 30 |
| `aktif` | BOOLEAN | ✓ | Aktif/Pasif (varsayılan: TRUE) |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

**Kısıtlamalar:**
```sql
CONSTRAINT depo_konumlar_kod_unique EXCLUDE (raf_id WITH =, kod WITH =) WHERE (silme_tarihi IS NULL);
    CONSTRAINT depo_konumlar_tam_kod_unique EXCLUDE (tam_kod WITH =) WHERE (silme_tarihi IS NULL);
CONSTRAINT depo_konumlar_doluluk_check CHECK (doluluk_orani >= 0 AND doluluk_orani <= 100);
```

**İlişkiler:**
- `raf_id` → `depo_raflar(raf_id)` (Many-to-One)
- `olusturan_kullanici_id` → `kullanicilar(kullanici_id)` (Many-to-One)

---

#### 2.1.5 `depo_paletler` — Palet Tanımları

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `palet_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `depo_id` | UUID | ✓ | Depo referansı (FK → depolar) |
| `konum_id` | UUID | ✓ | Konum referansı (FK → depo_konumlar) |
| `palet_no` | VARCHAR(50) | ✓ | Palet numarası/etiket (barcode) — unique |
| `tip` | VARCHAR(20) | ✓ | STANDARD, EUR, BLOCK, DISPLAY |
| `durum` | VARCHAR(20) | ✓ | BOŞ, DOLU, TRANSIT, DEPO_DISI |
| `agirlik_kg` | DECIMAL(8,2) | ✓ | Palet kendi ağırlığı (tare) |
| `max_yuk_kg` | DECIMAL(8,2) | ✓ | Maksimum yük kapasitesi (kg) |
| `mevcut_yuk_kg` | DECIMAL(8,2) | ✓ | Mevcut yük (kg) — hesaplanır |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

**Kısıtlamalar:**
```sql
CONSTRAINT depo_paletler_palet_no_unique EXCLUDE (palet_no WITH =) WHERE (silme_tarihi IS NULL);
CONSTRAINT depo_paletler_mevcut_yuk_check CHECK (mevcut_yuk_kg >= 0);
```

**İlişkiler:**
- `depo_id` → `depolar(depo_id)` (Many-to-One)
- `konum_id` → `depo_konumlar(konum_id)` (Many-to-One)
- `olusturan_kullanici_id` → `kullanicilar(kullanici_id)` (Many-to-One)

---

#### 2.1.6 `stok_konum_hareketi` — Stok Konum Hareketleri (Fiziksel Lokasyon Değişikliği)

Stok kartının fiziksel konum değişikliklerini takip eder (depo/raf/konum/palet değişikliği).

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `hareket_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `stok_id` | UUID | ✓ | Stok kartı referansı (FK → stok_karti) |
| `hareket_tipi` | VARCHAR(20) | ✓ | GIRIS, CIKIS, TRANSFER, DEPOICI_TRANSFER, RAFLARASI_TRANSFER |
| `kaynak_depo_id` | UUID | Hayır | Kaynak depo (FK → depolar) — transferde zorunlu |
| `kaynak_konum_id` | UUID | Hayır | Kaynak konum (FK → depo_konumlar) — GIRIS dışında zorunlu |
| `kaynak_palet_id` | UUID | Hayır | Kaynak palet (FK → depo_paletler) |
| `hedef_depo_id` | UUID | Hayır | Hedef depo (FK → depolar) — transferde zorunlu |
| `hedef_konum_id` | UUID | Hayır | Hedef konum (FK → depo_konumlar) |
| `hedef_palet_id` | UUID | Hayır | Hedef palet (FK → depo_paletler) |
| `miktar_kg` | DECIMAL(15,3) | ✓ | Hareket eden miktar (kg) |
| `hareket_tarihi` | TIMESTAMP | ✓ | Hareket tarihi |
| `aciklama` | TEXT | Hayır | Hareket açıklaması |
| `referans_id` | UUID | Hayır | İlgili kaynak ID (stok_hareketleri, uretim_emri vb.) |
| `referans_tipi` | VARCHAR(30) | Hayır | STOK_HAREKETI, URETIM, SATIS, TRANSFER, SAYIM |
| `onay_durumu` | VARCHAR(20) | ✓ | BEKLEMEDE, ONAYLANDI, REDDEDILDI, TAMAMLANDI |
| `onay_tarihi` | TIMESTAMP | Hayır | Onay tarihi |
| `onaylayan_kullanici_id` | UUID | Hayır | Onaylayan kullanıcı (FK → kullanicilar) |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

**Kısıtlamalar:**
```sql
CONSTRAINT stok_konum_hareketi_kaynak_hedef_check CHECK (
  (kaynak_depo_id IS NOT NULL AND hedef_depo_id IS NOT NULL) OR
  (kaynak_konum_id IS NOT NULL AND hedef_konum_id IS NOT NULL)
);
```

**İlişkiler:**
- `stok_id` → `stok_karti(stok_id)` (Many-to-One)
- `kaynak_depo_id` → `depolar(depo_id)` (Many-to-One, nullable)
- `kaynak_konum_id` → `depo_konumlar(konum_id)` (Many-to-One, nullable)
- `kaynak_palet_id` → `depo_paletler(palet_id)` (Many-to-One, nullable)
- `hedef_depo_id` → `depolar(depo_id)` (Many-to-One, nullable)
- `hedef_konum_id` → `depo_konumlar(konum_id)` (Many-to-One, nullable)
- `hedef_palet_id` → `depo_paletler(palet_id)` (Many-to-One, nullable)
- `onaylayan_kullanici_id` → `kullanicilar(kullanici_id)` (Many-to-One, nullable)
- `olusturan_kullanici_id` → `kullanicilar(kullanici_id)` (Many-to-One)

---

#### 2.1.7 `depo_transfer` — Depolar Arası Transfer Kayıtları

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `transfer_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `transfer_no` | VARCHAR(50) | ✓ | Transfer numarası (TRANSFER-YYYYMMDD-XXX) — unique |
| `kaynak_depo_id` | UUID | ✓ | Kaynak depo (FK → depolar) |
| `hedef_depo_id` | UUID | ✓ | Hedef depo (FK → depolar) |
| `durum` | VARCHAR(20) | ✓ | HAZIRLANIYOR, SEVK_EDILDI, YOLDA, TESLIM_ALINDI, TAMAMLANDI, IPTAL |
| `planlanan_tarih` | DATE | Hayır | Planlanan transfer tarihi |
| `gerceklesen_tarih` | TIMESTAMP | Hayır | Fiili transfer tamamlama tarihi |
| `nakliye_firmasi` | VARCHAR(100) | Hayır | Nakliye firma adı |
| `nakliye_araci` | VARCHAR(50) | Hayır | Araç plaka numarası |
| `sevq_irsa_no` | VARCHAR(50) | Hayır | Sevk irsaliyesi numarası |
| `teslim_alan` | VARCHAR(100) | Hayır | Teslim alan kişi adı |
| `teslim_tarihi` | TIMESTAMP | Hayır | Teslim alma tarihi |
| `toplam_miktar_kg` | DECIMAL(15,3) | ✓ | Toplam transfer edilen miktar (kg) |
| `kalem_sayisi` | INTEGER | ✓ | Transfer kalem sayısı |
| `aciklama` | TEXT | Hayır | Transfer açıklaması |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

**Kısıtlamalar:**
```sql
CONSTRAINT depo_transfer_no_unique EXCLUDE (transfer_no WITH =) WHERE (silme_tarihi IS NULL);
CONSTRAINT depo_transfer_kaynak_hedef_check CHECK (kaynak_depo_id != hedef_depo_id);
```

**İlişkiler:**
- `kaynak_depo_id` → `depolar(depo_id)` (Many-to-One)
- `hedef_depo_id` → `depolar(depo_id)` (Many-to-One)
- `olusturan_kullanici_id` → `kullanicilar(kullanici_id)` (Many-to-One)

---

#### 2.1.8 `depo_transfer_kalemleri` — Transfer Kalemleri

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `kalem_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `transfer_id` | UUID | ✓ | Transfer referansı (FK → depo_transfer) |
| `stok_id` | UUID | ✓ | Stok kartı referansı (FK → stok_karti) |
| `miktar_kg` | DECIMAL(15,3) | ✓ | Transfer edilen miktar (kg) |
| `lot_no` | VARCHAR(50) | ✓ | Lot numarası |
| `urun_ad` | VARCHAR(255) | ✓ | Ürün adı (stok kartından alınır, raporlama için) |
| `kaynak_konum_id` | UUID | ✓ | Stok kartının mevcut konumu (FK → depo_konumlar) |
| `hedef_konum_id` | UUID | ✓ | Hedef depodaki hedef konum (FK → depo_konumlar) |
| `kalem_durumu` | VARCHAR(20) | ✓ | HAZIR, SEVK_EDILDI, TESLIM_ALINDI, EKSİK, FAZLA, HASARLI |
| `birim_fiyat` | DECIMAL(15,4) | Hayır | Birim fiyat (değer takibi için) |
| `tutar` | DECIMAL(15,4) | Hayır | Toplam tutar |
| `not` | TEXT | Hayır | Kalem notu |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

**Kısıtlamalar:**
```sql
CONSTRAINT depo_transfer_kalemleri_miktar_check CHECK (miktar_kg > 0);
```

**İlişkiler:**
- `transfer_id` → `depo_transfer(transfer_id)` (Many-to-One)
- `stok_id` → `stok_karti(stok_id)` (Many-to-One)
- `kaynak_konum_id` → `depo_konumlar(konum_id)` (Many-to-One)
- `hedef_konum_id` → `depo_konumlar(konum_id)` (Many-to-One)
- `olusturan_kullanici_id` → `kullanicilar(kullanici_id)` (Many-to-One)

---

#### 2.1.9 `depo_doluluk_durumu` — Anlık Doluluk Durumu (View veya Snapshot Tablo)

Depoların ve blokların anlık doluluk oranlarını tutar. Günlük veya anlık raporlama için kullanılır.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `durum_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `depo_id` | UUID | ✓ | Depo referansı (FK → depolar) |
| `blok_id` | UUID | Hayır | Blok referansı (FK → depo_bloklar) — NULL = depo geneli |
| `raf_id` | UUID | Hayır | Raf referansı (FK → depo_raflar) — NULL = blok geneli |
| `konum_id` | UUID | Hayır | Konum referansı (FK → depo_konumlar) — NULL = raf geneli |
| `toplam_kapasite_kg` | DECIMAL(15,3) | ✓ | Toplam kapasite (kg) |
| `mevcut_kullanilan_kg` | DECIMAL(15,3) | ✓ | Mevcut kullanılan (kg) |
| `doluluk_orani` | DECIMAL(5,2) | ✓ | Doluluk yüzdesi (0-100) |
| `bos_konum_sayisi` | INTEGER | ✓ | Boş konum sayısı |
| `dolu_konum_sayisi` | INTEGER | ✓ | Dolu konum sayısı |
| `toplam_konum_sayisi` | INTEGER | ✓ | Toplam konum sayısı |
| `son_guncelleme` | TIMESTAMP | ✓ | Son güncelleme zamanı |
| `rapor_tarihi` | DATE | ✓ | Rapor tarihi (günlük snapshot için) |

---

#### 2.1.10 `depo_kapasite_uyarilari` — Kapasite Uyarı Kayıtları

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `uyari_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `depo_id` | UUID | ✓ | Depo referansı (FK → depolar) |
| `blok_id` | UUID | Hayır | Blok referansı (FK → depo_bloklar) |
| `uyari_tipi` | VARCHAR(20) | ✓ | DOLULUK_ORANI, KONUM_SAYISI, SON_KULLANMA, SICAKLIK |
| `uyari_seviyesi` | VARCHAR(20) | ✓ | INFO, WARNING, CRITICAL |
| `esik_degeri` | DECIMAL(5,2) | ✓ | Tetikleme eşik değeri (%) |
| `mevcut_deger` | DECIMAL(5,2) | ✓ | Mevcut değer |
| `mesaj` | TEXT | ✓ | Uyarı mesajı |
| `durum` | VARCHAR(20) | ✓ | AKTIF, ONAYLANDI, KAPANDI |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Uyarı oluşturma tarihi |
| `onay_tarihi` | TIMESTAMP | Hayır | Onaylanma tarihi |
| `onaylayan_kullanici_id` | UUID | Hayır | Onaylayan kullanıcı |
| `kapanma_tarihi` | TIMESTAMP | Hayır | Kapanma tarihi |
| `kapanma_nedeni` | TEXT | Hayır | Kapanma nedeni |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

---

#### 2.1.11 `stok_karti` Tablosuna Eklenmesi Gereken Alanlar

Mevcut `stok_karti` tablosuna aşağıdaki alanlar eklenmelidir (foreign key olarak):

| Alan | Tip | Açıklama |
|------|-----|----------|
| `depo_id` | UUID | Depo referansı (FK → depolar) — GIRIS sırasında zorunlu |
| `konum_id` | UUID | Konum referansı (FK → depo_konumlar) — GIRIS sırasında zorunlu |
| `palet_id` | UUID | Palet referansı (FK → depo_paletler) — opsiyonel |
| `depo_kod` | VARCHAR(20) | Depo kodu (arama kolaylığı için, FK değil) |
| `konum_kod` | VARCHAR(50) | Tam konum kodu (arama kolaylığı için) |

> **Not:** Mevcut `depo`, `raf`, `blok`, `konum` VARCHAR alanları `depo_id`, `konum_id` FK'ları ile değiştirilmelidir. Eski alanlar legacy uyumluluk için geçici olarak tutulabilir ancak yeni girişlerde FK kullanılmalıdır.

---

### 2.2 Tetikleyiciler (Triggers)

#### 2.2.1 `trg_update_konum_doluluk`

`stok_konum_hareketi` veya `stok_karti` tablosunda değişiklik olduğunda ilgili `depo_konumlar` tablosunun `mevcut_kg` ve `doluluk_orani` alanlarını otomatik günceller.

```sql
CREATE OR REPLACE FUNCTION fn_update_konum_doluluk()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE depo_konumlar
    SET mevcut_kg = mevcut_kg + NEW.miktar_kg,
        doluluk_orani = LEAST(100, (mevcut_kg + NEW.miktar_kg) / NULLIF(kapasite_kg, 0) * 100),
        guncelleme_tarihi = NOW()
    WHERE konum_id = NEW.hedef_konum_id;
    
    UPDATE depo_konumlar
    SET mevcut_kg = mevcut_kg - OLD.miktar_kg,
        doluluk_orani = GREATEST(0, (mevcut_kg - OLD.miktar_kg) / NULLIF(kapasite_kg, 0) * 100),
        guncelleme_tarihi = NOW()
    WHERE konum_id = OLD.kaynak_konum_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    UPDATE depo_konumlar
    SET mevcut_kg = mevcut_kg - OLD.miktar_kg,
        doluluk_orani = GREATEST(0, (mevcut_kg - OLD.miktar_kg) / NULLIF(kapasite_kg, 0) * 100),
        guncelleme_tarihi = NOW()
    WHERE konum_id = OLD.kaynak_konum_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_konum_doluluk
AFTER INSERT OR UPDATE OR DELETE ON stok_konum_hareketi
FOR EACH ROW EXECUTE FUNCTION fn_update_konum_doluluk();
```

#### 2.2.2 `trg_check_konum_kapasitesi`

Stok girişinde konum kapasitesini kontrol eder, kapasite aşımını engeller.

```sql
CREATE OR REPLACE FUNCTION fn_check_konum_kapasitesi()
RETURNS TRIGGER AS $$
DECLARE
  v_kapasite_kg DECIMAL(15,3);
  v_mevcut_kg DECIMAL(15,3);
BEGIN
  SELECT dk.kapasite_kg, dk.mevcut_kg
  INTO v_kapasite_kg, v_mevcut_kg
  FROM depo_konumlar dk
  WHERE dk.konum_id = NEW.hedef_konum_id;
  
  IF v_kapasite_kg IS NOT NULL AND (v_mevcut_kg + NEW.miktar_kg) > v_kapasite_kg THEN
    RAISE EXCEPTION 'Konum kapasitesi aşılıyor. Mevcut: % kg, Eklenmek istenen: % kg, Kapasite: % kg',
      v_mevcut_kg, NEW.miktar_kg, v_kapasite_kg;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_konum_kapasitesi
BEFORE INSERT ON stok_konum_hareketi
FOR EACH ROW
WHEN (NEW.hedef_konum_id IS NOT NULL)
EXECUTE FUNCTION fn_check_konum_kapasitesi();
```

---

## 3. Depo Bazlı Stok Hareketi Kuralları

### 3.1 Depo Türüne Göre Stok Kabul Kuralları

| Depo Tipi | Kabul Edilen Stok Tipi | Açıklama |
|-----------|----------------------|----------|
| HAMMADDE | HAMMADDE | Sadece hammadde girişi kabul edilir |
| MAMUL | MAMUL | Sadece mamul (üretim çıktısı) kabul edilir |
| KARISIM | HAMMADDE, MAMUL | Her iki tip de kabul edilir |
| DEPO_DISI | — | Stok girişi yapılamaz, sadece çıkış (sevkiyat) |

**Validasyon Kuralı:**
```python
def validate_depo_stok_tipi(depo_id: UUID, stok_tipi: str) -> bool:
    """
    Depo tipi ile stok tipi uyumunu kontrol eder.
    Returns True if compatible, raises ValueError if not.
    """
    depo = get_depo(depo_id)
    valid_combinations = {
        "HAMMADDE": ["HAMMADDE", "KARISIM"],
        "MAMUL": ["MAMUL", "KARISIM"],
        "KARISIM": ["HAMMADDE", "MAMUL", "KARISIM"],
        "DEPO_DISI": []
    }
    if depo.tip not in valid_combinations:
        raise ValueError(f"Bilinmeyen depo tipi: {depo.tip}")
    if stok_tipi not in valid_combinations[depo.tip]:
        raise ValueError(
            f"Depo tipi '{depo.tip}' ile stok tipi '{stok_tipi}' uyumsuz. "
            f"İzin verilen tipler: {valid_combinations[depo.tip]}"
        )
    return True
```

### 3.2 Konum Durumuna Göre Stok Girişi/Çıkışı

| Konum Durumu | Stok Girişi | Stok Çıkışı | Stok Transferi |
|-------------|-------------|-------------|----------------|
| BOS | ✓ İzin verilir | ✗ İzin yok | ✓ Hedef olabilir |
| DOLU | ✗ Kapasite doluysa engellenir | ✓ İzin verilir | ✓ Kaynak olabilir |
| REZERVE | ✗ Engellenir | ✗ Engellenir | ✗ İzin yok |
| BAKIM | ✗ Engellenir | ✗ Engellenir | ✗ İzin yok |
| IPTAL | ✗ Engellenir | ✗ Engellenir | ✗ İzin yok |

### 3.3 Konum Validasyonu Kuralları

**Kural Seti:**

1. **Konum Mevcutluk Kontrolü:** Girilen `konum_id`'nin `depo_konumlar` tablosunda aktif ve silinmemiş olması zorunludur.

2. **Konum-Depo Uyum Kontrolü:** Konumun bağlı olduğu depo ile stok kartının `depo_id`'si aynı olmalıdır.
   ```python
   def validate_konum_depo_uyumu(stok: StokKarti, konum: DepoKonum) -> bool:
       if stok.depo_id != konum.raf.blok.depo_id:
           raise ValueError(
               f"Stok ({stok.depo_id}) ile konum ({konum.raf.blok.depo_id}) aynı depoda değil. "
               f"Transfer gerekli."
           )
   ```

3. **Konum Tip Kontrolü:** STORAGE tipindeki konumlara sadece STORAGE veya BUFFER tipinde stok girişi yapılabilir.

4. **Kapasite Kontrolü:** Mevcut ağırlık + yeni giriş ağırlığı ≤ konum kapasitesi olmalıdır.

5. **Son Kullanma Kontrolü:** Stok girişi yapılacak konumda son kullanma tarihi yaklaşan ürün varsa uyarı verilir.

6. **Sıcaklık/Uygunluk Kontrolü:** Depo sıcaklık kontrolü aktif ise ürünün sıcaklık gereksinimi ile depo sıcaklık aralığı uyumlu olmalıdır.

### 3.4 Depo Bazlı FIFO Önceliklendirme

Bir depoda FIFO uygulanırken sadece o depodaki lotlar dikkate alınır:

```python
def get_fifo_lot_for_depo(urun_id: UUID, depo_id: UUID, miktar: Decimal) -> List[StokKarti]:
    """
    Belirli bir depodaki ürün için FIFO sırasına göre uygun lotları döner.
    Sadece o depodaki aktif lotlar dikkate alınır.
    """
    return (
        StokKarti.query
        .filter(
            StokKarti.urun_id == urun_id,
            StokKarti.depo_id == depo_id,
            StokKarti.durum == "AKTIF",
            StokKarti.miktar > 0
        )
        .order_by(
            StokKarti.giris_tarihi.asc(),          # FIFO: en eski önce
            StokKarti.son_kullanma.asc_nulls_last   # Son kullanma yaklaşan önce
        )
        .all()
    )
```

---

## 4. Depolar Arası Transfer İş Akışı

### 4.1 Transfer Durum Diyagramı

```
┌─────────────┐
│ HAZIRLANIYOR │ ←─── İlk oluşturulduğunda
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ SEVK_EDILDI │ ←─── Kaynak depodan çıkış yapıldığında
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    YOLDA    │ ←─── Nakliye başladığında
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ TESLIM_ALINDI     │ ←─── Hedef depo teslim aldığında
└────────┬─────────┘
         │
         ▼
┌─────────────┐
│  TAMAMLANDI  │ ←─── Kalemler hedef konumlara yerleştirildiğinde
└─────────────┘
```

### 4.2 Transfer İş Akış Adımları

#### Adım 1: Transfer Talebi Oluşturma
- Kaynak ve hedef depo seçilir
- Transfer edilecek stok kalemleri seçilir
- Her kalem için kaynak konum ve önerilen hedef konum belirlenir
- Toplam miktar ve kalem sayısı hesaplanır

#### Adım 2: Kaynak Depo Onayı
- Kaynak depo yetkilisi transfer talebini onaylar
- Stok kartlarının kaynak depoda olduğu doğrulanır
- Yeterli miktar kontrolü yapılır

#### Adım 3: Stok Hazırlama (HAZIRLANIYOR → SEVK_EDILDI)
- Seçilen stoklar için "REZERVE" durumu atanır (opsiyonel)
- Sevk irsaliyesi oluşturulur
- Fiziksel toplama yapılır

#### Adım 4: Sevk İşlemi
- Stok kartları kaynak depodan çıkış olarak işaretlenir
- `stok_hareketleri` tablosuna `CIKIS` tipinde kayıt eklenir (hareket_tipi = TRANSFER)
- `stok_konum_hareketi` tablosuna kayıt eklenir
- Nakliye bilgileri girilir (firma, plaka, sevk irsaliye no)

#### Adım 5: Teslim Alma (TESLIM_ALINDI)
- Hedef depo teslim aldığında bildirir
- Fiziksel miktar sisteme girilir
- Eksik/fazla/hasarlı kontrolü yapılır

#### Adım 6: Yerleştirme (TAMAMLANDI)
- Her kalem için hedef konum seçilir
- Konum validasyonu yapılır
- Stok kartları hedef depoya giriş olarak işaretlenir
- `stok_hareketleri` tablosuna `GIRIS` tipinde kayıt eklenir
- `stok_konum_hareketi` tablosuna kayıt eklenir

### 4.3 Transfer API Endpoint'leri

| Yöntem | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/depo/transferler` | Transfer listesi (filtre, sayfa) |
| POST | `/api/v1/depo/transferler` | Yeni transfer oluştur |
| GET | `/api/v1/depo/transferler/{id}` | Transfer detayı |
| PATCH | `/api/v1/depo/transferler/{id}/durum` | Durum güncelle |
| POST | `/api/v1/depo/transferler/{id}/kalemler` | Transfer kalemi ekle |
| DELETE | `/api/v1/depo/transferler/{id}/kalemler/{kalem_id}` | Transfer kalemi çıkar |
| POST | `/api/v1/depo/transferler/{id}/sevk` | Sevk işlemini tamamla |
| POST | `/api/v1/depo/transferler/{id}/teslimal` | Teslim alma işlemini tamamla |
| POST | `/api/v1/depo/transferler/{id}/yerlestir` | Yerleştirme işlemini tamamla |
| GET | `/api/v1/depo/transferler/{id}/rapor` | Transfer raporu |

---

## 5. Doluluk Oranı ve Kapasite Takibi

### 5.1 Doluluk Hesaplama Formülleri

**Konum Doluluk Oranı:**
```
doluluk_orani = (mevcut_kg / kapasite_kg) * 100
```

**Blok Doluluk Oranı:**
```
blok_toplam_kapasite = SUM(raf.kapasite_kg) — raflar üzerinden hesaplanır
blok_mevcut_kullanilan = SUM(konum.mevcut_kg) — konumlar üzerinden hesaplanır
blok_doluluk_orani = (blok_mevcut_kullanilan / blok_toplam_kapasite) * 100
```

**Depo Doluluk Oranı:**
```
depo_toplam_kapasite = depolar.kapasite_kg — direkt depodan alınır
depo_mevcut_kullanilan = SUM(depo_konumlar.mevcut_kg) — tüm konumlar üzerinden hesaplanır
depo_doluluk_orani = (depo_mevcut_kullanilan / depo_toplam_kapasite) * 100
```

### 5.2 Doluluk Durumu Sorguları

#### Konum Bazlı Doluluk Raporu
```sql
SELECT 
    dk.konum_id,
    dk.tam_kod,
    dk.durum,
    dk.kapasite_kg,
    dk.mevcut_kg,
    dk.doluluk_orani,
    dr.raf_kod,
    db.blok_kod,
    d.depo_ad
FROM depo_konumlar dk
JOIN depo_raflar dr ON dk.raf_id = dr.raf_id
JOIN depo_bloklar db ON dr.blok_id = db.blok_id
JOIN depolar d ON db.depo_id = d.depo_id
WHERE dk.aktif = TRUE
ORDER BY dk.doluluk_orani DESC;
```

#### Depo Özet Doluluk Raporu
```sql
SELECT 
    d.depo_id,
    d.kod,
    d.ad,
    d.tip,
    d.kapasite_kg,
    COALESCE(SUM(dk.mevcut_kg), 0) AS kullanilan_kg,
    COALESCE(SUM(dk.mevcut_kg), 0) / NULLIF(d.kapasite_kg, 0) * 100 AS doluluk_orani,
    COUNT(dk.konum_id) FILTER (WHERE dk.durum = 'BOS') AS bos_konum_sayisi,
    COUNT(dk.konum_id) FILTER (WHERE dk.durum = 'DOLU') AS dolu_konum_sayisi,
    COUNT(dk.konum_id) AS toplam_konum_sayisi
FROM depolar d
LEFT JOIN depo_bloklar db ON d.depo_id = db.depo_id AND db.silme_tarihi IS NULL
LEFT JOIN depo_raflar dr ON db.blok_id = dr.blok_id AND dr.silme_tarihi IS NULL
LEFT JOIN depo_konumlar dk ON dr.raf_id = dk.raf_id AND dk.silme_tarihi IS NULL
WHERE d.silme_tarihi IS NULL
GROUP BY d.depo_id, d.kod, d.ad, d.tip, d.kapasite_kg
ORDER BY doluluk_orani DESC;
```

### 5.3 Doluluk Snapshot (Günlük Raporlama)

Her gece yarısı (`00:00`) bir scheduled job çalışarak `depo_doluluk_durumu` tablosuna anlık snapshot kaydeder:

```python
@scheduler.scheduled_job("cron", hour=0, minute=0)
def capture_doluluk_snapshot():
    """
    Her gece yarısı tüm depo doluluk durumunu snapshot olarak kaydeder.
    """
    with session_scope() as session:
        query = """
            INSERT INTO depo_doluluk_durumu (
                durum_id, depo_id, blok_id, raf_id, konum_id,
                toplam_kapasite_kg, mevcut_kullanilan_kg, doluluk_orani,
                bos_konum_sayisi, dolu_konum_sayisi, toplam_konum_sayisi,
                son_guncelleme, rapor_tarihi
            )
            SELECT 
                gen_random_uuid(),
                d.depo_id,
                NULL,
                NULL,
                NULL,
                d.kapasite_kg,
                COALESCE(SUM(dk.mevcut_kg), 0),
                COALESCE(SUM(dk.mevcut_kg), 0) / NULLIF(d.kapasite_kg, 0) * 100,
                COUNT(dk.konum_id) FILTER (WHERE dk.durum = 'BOS'),
                COUNT(dk.konum_id) FILTER (WHERE dk.durum = 'DOLU'),
                COUNT(dk.konum_id),
                NOW(),
                CURRENT_DATE
            FROM depolar d
            LEFT JOIN depo_bloklar db ON d.depo_id = db.depo_id AND db.silme_tarihi IS NULL
            LEFT JOIN depo_raflar dr ON db.blok_id = dr.blok_id AND dr.silme_tarihi IS NULL
            LEFT JOIN depo_konumlar dk ON dr.raf_id = dk.raf_id AND dk.silme_tarihi IS NULL
            WHERE d.silme_tarihi IS NULL
            GROUP BY d.depo_id, d.kapasite_kg
        """
        session.execute(text(query))
```

---

## 6. Kapasite Uyarı Mekanizması

### 6.1 Uyarı Eşik Değerleri

| Uyarı Seviyesi | Doluluk Oranı Eşiği | Açıklama |
|----------------|---------------------|----------|
| **INFO** | %70 | Bilgilendirme — Depo %70 doldu |
| **WARNING** | %85 | Dikkat — Depo %85 doldu, yakında kapasite sorunu yaşanabilir |
| **CRITICAL** | %95 | Acil — Depo %95 doldu, yeni girişler engellenmeli |

### 6.2 Otomatik Uyarı Oluşturma

Stok girişi veya konum güncellemesi yapıldığında otomatik kontrol:

```python
def check_and_create_capacity_alert(
    session,
    depo_id: UUID,
    mevcut_doluluk_orani: Decimal,
    esikler: dict = {"INFO": 70, "WARNING": 85, "CRITICAL": 95}
) -> Optional[DepoKapasiteUyari]:
    """
    Doluluk oranını kontrol eder ve gerekirse uyarı oluşturur.
    """
    # Son açık uyarıyı kontrol et
    existing_alert = session.query(DepoKapasiteUyari).filter(
        DepoKapasiteUyari.depo_id == depo_id,
        DepoKapasiteUyari.durum == "AKTIF",
        DepoKapasiteUyari.uyari_tipi == "DOLULUK_ORANI"
    ).first()
    
    if existing_alert:
        # Mevcut uyarıyı güncelle
        if mevcut_doluluk_orani >= esikler["CRITICAL"]:
            new_seviye = "CRITICAL"
        elif mevcut_doluluk_orani >= esikler["WARNING"]:
            new_seviye = "WARNING"
        elif mevcut_doluluk_orani >= esikler["INFO"]:
            new_seviye = "INFO"
        else:
            # Eşiklerin altına düştü, uyarıyı kapat
            existing_alert.durum = "KAPANDI"
            existing_alert.kapanma_tarihi = datetime.now()
            existing_alert.kapanma_nedeni = "Doluluk oranı eşiklerin altına düştü"
            session.commit()
            return None
        
        if existing_alert.uyari_seviyesi != new_seviye:
            existing_alert.uyari_seviyesi = new_seviye
            existing_alert.mevcut_deger = mevcut_doluluk_orani
            session.commit()
        return existing_alert
    
    # Yeni uyarı oluştur
    if mevcut_doluluk_orani >= esikler["CRITICAL"]:
        seviye = "CRITICAL"
    elif mevcut_doluluk_orani >= esikler["WARNING"]:
        seviye = "WARNING"
    elif mevcut_doluluk_orani >= esikler["INFO"]:
        seviye = "INFO"
    else:
        return None
    
    uyari = DepoKapasiteUyari(
        uyari_id=gen_uuid(),
        depo_id=depo_id,
        uyari_tipi="DOLULUK_ORANI",
        uyari_seviyesi=seviye,
        esik_degeri=esikler[seviye],
        mevcut_deger=mevcut_doluluk_orani,
        mesaj=f"Depo doluluk oranı %{mevcut_doluluk_orani:.1f} — {seviye} seviyesinde uyarı",
        durum="AKTIF",
        olusturma_tarihi=datetime.now(),
        olusturan_kullanici_id=get_system_user_id()  # SYSTEM user
    )
    session.add(uyari)
    session.commit()
    return uyari
```

### 6.3 Uyarı Bildirimleri

| Uyarı Seviyesi | Bildirim Kanalı | Alıcılar |
|----------------|-----------------|----------|
| INFO | Sistem bildirimi | Depo sorumlusu |
| WARNING | Sistem bildirimi + E-posta | Depo sorumlusu + Yönetici |
| CRITICAL | Sistem bildirimi + E-posta + SMS | Depo sorumlusu + Yönetici + Acil müdahale ekibi |

### 6.4 Kritik Dolulukta Giriş Engelleme

%95 üzeri doluluk durumunda yeni stok girişi validasyonu:

```python
def validate_stok_girisi(session, depo_id: UUID, miktar_kg: Decimal) -> bool:
    """
    Kritik kapasite durumunda stok girişini engeller.
    """
    depo = session.query(Depolar).get(depo_id)
    mevcut_kullanilan = session.execute(
        text("SELECT COALESCE(SUM(mevcut_kg), 0) FROM depo_konumlar WHERE silme_tarihi IS NULL")
    ).scalar()
    
    yeni_doluluk = (mevcut_kullanilan + miktar_kg) / depo.kapasite_kg * 100
    
    if yeni_doluluk > 95:
        raise ValueError(
            f"Depo kapasitesi kritik seviyede (%{yeni_doluluk:.1f}). "
            f"Yeni giriş yapılamaz. Lütfen önce transfer veya sevkiyat yapın."
        )
    
    if yeni_doluluk > 85:
        warnings.warn(
            f"Depo doluluk oranı %85'i aşıyor (%{yeni_doluluk:.1f}). "
            f"Yeni giriş yapılabilir ancak kapasite planlaması yapılmalıdır."
        )
    
    return True
```

---

## 7. API Endpoint Özeti

### 7.1 Depo Yönetimi

| Yöntem | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/depo` | Depo listesi |
| POST | `/api/v1/depo` | Yeni depo oluştur |
| GET | `/api/v1/depo/{id}` | Depo detayı |
| PUT | `/api/v1/depo/{id}` | Depo güncelle |
| DELETE | `/api/v1/depo/{id}` | Depo sil (soft delete) |
| GET | `/api/v1/depo/{id}/doluluk` | Depo doluluk raporu |
| GET | `/api/v1/depo/{id}/konumlar` | Depo konum listesi |
| GET | `/api/v1/depo/{id}/uyarilar` | Depo uyarıları |

### 7.2 Blok Yönetimi

| Yöntem | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/depo/{depo_id}/bloklar` | Blok listesi |
| POST | `/api/v1/depo/{depo_id}/bloklar` | Yeni blok oluştur |
| GET | `/api/v1/bloklar/{id}` | Blok detayı |
| PUT | `/api/v1/bloklar/{id}` | Blok güncelle |
| GET | `/api/v1/bloklar/{id}/doluluk` | Blok doluluk raporu |
| GET | `/api/v1/bloklar/{id}/konumlar` | Blok konum listesi |

### 7.3 Raf Yönetimi

| Yöntem | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/bloklar/{blok_id}/raflar` | Raf listesi |
| POST | `/api/v1/bloklar/{blok_id}/raflar` | Yeni raf oluştur |
| GET | `/api/v1/raflar/{id}` | Raf detayı |
| PUT | `/api/v1/raflar/{id}` | Raf güncelle |
| GET | `/api/v1/raflar/{id}/konumlar` | Raf konum listesi |

### 7.4 Konum Yönetimi

| Yöntem | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/raflar/{raf_id}/konumlar` | Konum listesi |
| POST | `/api/v1/raflar/{raf_id}/konumlar` | Yeni konum oluştur |
| GET | `/api/v1/konumlar/{id}` | Konum detayı |
| PUT | `/api/v1/konumlar/{id}` | Konum güncelle |
| GET | `/api/v1/konumlar/{id}/stoklar` | Konumdaki stoklar |
| PATCH | `/api/v1/konumlar/{id}/durum` | Konum durumu güncelle (BOS, DOLU, BAKIM vb.) |

### 7.5 Transfer Yönetimi

| Yöntem | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/depo/transferler` | Transfer listesi |
| POST | `/api/v1/depo/transferler` | Yeni transfer oluştur |
| GET | `/api/v1/depo/transferler/{id}` | Transfer detayı |
| PATCH | `/api/v1/depo/transferler/{id}/durum` | Durum güncelle |
| POST | `/api/v1/depo/transferler/{id}/kalemler` | Kalem ekle |
| DELETE | `/api/v1/depo/transferler/{id}/kalemler/{kid}` | Kalem çıkar |
| POST | `/api/v1/depo/transferler/{id}/sevk` | Sevk et |
| POST | `/api/v1/depo/transferler/{id}/teslimal` | Teslim al |
| POST | `/api/v1/depo/transferler/{id}/yerlestir` | Yerleştir |
| GET | `/api/v1/depo/transferler/{id}/rapor` | Transfer raporu |

### 7.6 Doluluk ve Kapasite

| Yöntem | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/depo/doluluk-ozet` | Tüm depoların doluluk özeti |
| GET | `/api/v1/depo/{id}/doluluk-gecmisi` | Depo doluluk geçmişi (snapshot) |
| GET | `/api/v1/depo/{id}/bos-konumlar` | Boş konum listesi (stok girişi için öneri) |
| GET | `/api/v1/depo/{id}/uygun-konumlar/{stok_tipi}` | Stok tipine uygun boş konumlar |
| GET | `/api/v1/uyarilar` | Tüm aktif uyarılar |
| PATCH | `/api/v1/uyarilar/{id}/onayla` | Uyarıyı onayla |
| PATCH | `/api/v1/uyarilar/{id}/kapat` | Uyarıyı kapat |

---

## 8. Validasyon Örnekleri

### 8.1 Stok Girişi Validasyonu

```python
class StokGirisValidator:
    def __init__(self, session, depo_id: UUID, konum_id: UUID, miktar_kg: Decimal):
        self.session = session
        self.depo_id = depo_id
        self.konum_id = konum_id
        self.miktar_kg = miktar_kg
        self.errors = []
        self.warnings = []
    
    def validate(self) -> bool:
        """
        Tüm validasyon kurallarını çalıştırır.
        Hata varsa ValueError, uyarı varsa warnings döner.
        """
        self._validate_depo_exists()
        self._validate_konum_exists()
        self._validate_depo_konum_uyumu()
        self._validate_konum_tipi()
        self._validate_kapasite()
        self._validate_stok_tipi_uyumu()
        self._validate_sicaklik()
        
        if self.errors:
            raise ValueError("\n".join(self.errors))
        
        return True
    
    def _validate_depo_exists(self):
        depo = self.session.query(Depolar).get(self.depo_id)
        if not depo or depo.silme_tarihi:
            self.errors.append(f"Depo bulunamadı: {self.depo_id}")
        elif not depo.aktif:
            self.errors.append(f"Depo aktif değil: {depo.ad}")
    
    def _validate_konum_exists(self):
        konum = self.session.query(DepoKonumlar).get(self.konum_id)
        if not konum or konum.silme_tarihi:
            self.errors.append(f"Konum bulunamadı: {self.konum_id}")
        elif not konum.aktif:
            self.errors.append(f"Konum aktif değil: {konum.tam_kod}")
        elif konum.durum not in ["BOS", "DOLU"]:
            self.errors.append(f"Konum '{konum.tam_kod}' kullanıma uygun durumda değil: {konum.durum}")
    
    def _validate_depo_konum_uyumu(self):
        konum = self.session.query(DepoKonumlar).get(self.konum_id)
        raf = konum.raf
        blok = raf.blok
        if blok.depo_id != self.depo_id:
            self.errors.append(
                f"Konum '{konum.tam_kod}', '{blok.depo_id}' deposunda. "
                f"Stok girişi yapılmak istenen depo: '{self.depo_id}'"
            )
    
    def _validate_kapasite(self):
        konum = self.session.query(DepoKonumlar).get(self.konum_id)
        if konum.kapasite_kg and (konum.mevcut_kg + self.miktar_kg) > konum.kapasite_kg:
            self.errors.append(
                f"Konum kapasitesi aşılıyor. "
                f"Mevcut: {konum.mevcut_kg} kg, Eklenecek: {self.miktar_kg} kg, "
                f"Kapasite: {konum.kapasite_kg} kg"
            )
        elif konum.kapasite_kg and (konum.mevcut_kg + self.miktar_kg) / konum.kapasite_kg > 0.85:
            self.warnings.append(
                f"Konum %85 üzerinde dolacak. Yeni doluluk: "
                f"%{(konum.mevcut_kg + self.miktar_kg) / konum.kapasite_kg * 100:.1f}%"
            )
```

---

## 9. Örnek Kullanım Senaryoları

### Senaryo 1: Yeni Hammadde Girişi

1. Tedarikçiden 500 kg kayısı geldi
2. Depo sorumlusu sistemde "Stok Girişi" başlatır
3. Sistem otomatik olarak uygun konumları önerir:
   - Depo tipi = HAMMADDE
   - Uygun blok: HAMMADDE-1
   - Uygun konum: BOS, kapasite yeterli
4. Depo sorumlusu önerilen konumu seçer veya elle değiştirir
5. Sistem validasyonları çalıştırır:
   - Konum mevcut mu? ✓
   - Depo-konum uyumu? ✓
   - Kapasite yeterli mi? ✓
6. Stok girişi onaylanır
7. Stok kartı oluşturulur, konum bilgisi FK olarak kaydedilir
8. Doluluk oranları güncellenir
9. Eğer depo %85 üzerinde ise uyarı oluşturulur

### Senaryo 2: Depolar Arası Transfer

1. A Deposu'ndaki mamullerin bir kısmı B Deposu'na taşınacak
2. Depo sorumlusu "Transfer Oluştur" başlatır
3. Kaynak depo: A Deposu, Hedef depo: B Deposu
4. Taşınacak stoklar seçilir (lot bazlı)
5. Her lot için kaynak konum ve hedef konum belirlenir
6. Transfer onaya gider
7. Onay sonrası fiziksel toplama yapılır
8. Sevk işlemi başlatılır → stoklar REZERVE olur
9. Nakliye başlar
10. B Deposu teslim alır, miktar kontrolü yapar
11. Kalemler hedef konumlara yerleştirilir
12. Transfer tamamlanır, stok kartları güncellenir

### Senaryo 3: Kritik Kapasite Uyarısı

1. Gece saat 02:00'de stok girişi yapılır
2. Stok girişi ile birlikte A Deposu doluluk oranı %95.2'ye çıkar
3. `trg_update_konum_doluluk` trigger'ı çalışır
4. Sistem otomatik olarak kritik uyarı oluşturur
5. Bildirimler gönderilir:
   - Sistem bildirimi → Depo sorumlusu
   - E-posta → Depo sorumlusu + Yönetici
   - SMS → Acil müdahale ekibi
6. Yönetici uyarıyı onaylar
7. Bir sonraki stok girişlerinde sistem uyarı verir:
   - %85 üzeri = WARNING
   - %95 üzeri = CRITICAL (giriş engellenir)

---

## 10. Mevcut Tablo Güncellemeleri

### 10.1 `stok_karti` Tablosu Güncelleme SQL

```sql
-- Yeni alanları ekle (mevcut veri FK'lar ile doldurulabilir veya eski alanlar korunabilir)
ALTER TABLE stok_karti ADD COLUMN depo_id UUID REFERENCES depolar(depo_id);
ALTER TABLE stok_karti ADD COLUMN konum_id UUID REFERENCES depo_konumlar(konum_id);
ALTER TABLE stok_karti ADD COLUMN palet_id UUID REFERENCES depo_paletler(palet_id);
ALTER TABLE stok_karti ADD COLUMN depo_kod VARCHAR(20);
ALTER TABLE stok_karti ADD COLUMN konum_kod VARCHAR(50);

-- Eski alanları legacy olarak işaretle (opsiyyonel)
COMMENT ON COLUMN stok_karti.depo IS 'Legacy alan — depo_id FK kullanılmalı';
COMMENT ON COLUMN stok_karti.raf IS 'Legacy alan — konum_id FK kullanılmalı';
COMMENT ON COLUMN stok_karti.blok IS 'Legacy alan — konum_id FK üzerinden erişilmeli';
COMMENT ON COLUMN stok_karti.palet_no IS 'Legacy alan — palet_id FK kullanılmalı';

-- Yeni girişlerde FK zorunluluğu için
ALTER TABLE stok_karti ALTER COLUMN depo_id SET NOT NULL;
ALTER TABLE stok_karti ALTER COLUMN konum_id SET NOT NULL;

-- İndeksler
CREATE INDEX idx_stok_karti_depo_id ON stok_karti(depo_id);
CREATE INDEX idx_stok_karti_konum_id ON stok_karti(konum_id);
CREATE INDEX idx_stok_karti_palet_id ON stok_karti(palet_id);
CREATE INDEX idx_stok_karti_depo_kod ON stok_karti(depo_kod);
CREATE INDEX idx_stok_karti_konum_kod ON stok_karti(konum_kod);
```

---

## 11. Etki Analizi

| Bileşen | Etki | Açıklama |
|---------|------|----------|
| `stok_karti` tablosu | Orta | Yeni FK alanları ekleniyor, mevcut veri korunabilir |
| `stok_hareketleri` tablosu | Düşük | Yeni alanlar eklenebilir (kaynak/hedef konum) |
| API endpoint'leri | Orta | Yeni `/depo/*` endpoint'leri eklenecek |
| Stok giriş/çıkış servisleri | Yüksek | Validasyon kuralları değişecek |
| Trigger'lar | Orta | Yeni trigger'lar eklenecek |
| Raporlama | Orta | Yeni depo doluluk raporları eklenecek |

---

## 12. Sonraki Adımlar

1. [ ] Veritabanı migration script'leri hazırlanması
2. [ ] Yeni tablolar için API endpoint'lerinin implementasyonu
3. [ ] Stok giriş/çıkış servislerinin güncellenmesi
4. [ ] Transfer iş akışının UI entegrasyonu
5. [ ] Doluluk raporlarının dashboard entegrasyonu
6. [ ] Kapasite uyarı bildirimlerinin sisteme entegrasyonu
7. [ ] Konum validasyonu unit test'leri
8. [ ] Integration test'leri (transfer iş akışı)
9. [ ] Performance test'leri (doluluk hesaplamaları)

---

**Hazırlayan:** Hermes Agent  
**Tarih:** 2026-07-29  
**Versiyon:** 1.0
