# Birim Dönüşüm Tutarlılığı — Çözüm Tasarım Dokümanı

**Versiyon:** 1.0
**Tarih:** 2026-07-29
**Durum:** Tasarım Önerisi
**İlişkili Dokümanlar:** SRS-Kurutulmus-Meyve-Bal-ERP.md, DB-Design-Kurutulmus-Meyve-Bal-ERP.md

---

## 1. Mevcut Durum Analizi

### 1.1 Tespit Edilen Eksiklikler

| # | Eksiklik | Konum | Etki |
|---|----------|-------|------|
| 1 | `birimler` tablosu yok | DB Tasarımı | Standart birim listesi tanımlı değil; serbest string kullanılıyor |
| 2 | `birim_donusum` tablosu yok | DB Tasarımı | Genel birim dönüşüm oranları tanımlı değil |
| 3 | `urunler.birim_toptan/perakende` serbest VARCHAR(10) | DB §3.1.4 | Referans bütünlüğü yok, "kg" yazımı farklılıkları mümkün |
| 4 | `urun_donusum` sadece hammadde→mamul dönüşüm oranı için | DB §3.7.1 | Genel birimler arası (kg↔g, toptan↔perakende) dönüşüm yapmıyor |
| 5 | Dönüşüm validasyonu yok | İş kuralları | Stok hareketlerinde birim uyumsuzluğu denetlenmiyor |
| 6 | Gösterim birimi ayrıştırılmamış | Uygulama katmanı | Kullanıcıya hangi birimde sunulacağı tanımlı değil |

### 1.2 Mevcut Tasarım (Parçalı)

```
urunler tablosu:
  birim_toptan    VARCHAR(10)   -- "kg", "ton" — serbest string, FK yok
  birim_perakende VARCHAR(10)   -- "kg", "gram", "adet", "paket" — serbest string, FK yok

urun_donusum tablosu (mevcut):
  donusum_id, mamul_urun_id, hammadde_urun_id, donusum_orani, fire_orani
  -- Sadece ürün-ürün dönüşüm oranı; birimler-arası çarpan tablosu değil
```

---

## 2. Önerilen Çözüm Tasarımı

### 2.1 Yeni Tablo: `birimler` — Birim Tanımları

```sql
CREATE TABLE birimler (
    birim_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ad                VARCHAR(50) NOT NULL,          -- "Kilogram", "Gram", "Adet"
    kisa_ad           VARCHAR(10) NOT NULL UNIQUE,   -- "kg", "g", "adet", "paket"
    tip               VARCHAR(20) NOT NULL,         -- ONAYLI | OLCEK | AGIRLIK
    temel_birim_mi    BOOLEAN     NOT NULL DEFAULT FALSE,  -- Her tip için biri temel birim olur
    carpan_temele     DECIMAL(15,6) DEFAULT NULL,    -- Temel birime çevirme çarpanı (NULL = temel birim)
    bolen_temele      DECIMAL(15,6) DEFAULT NULL,    -- Temel birimden çevirme böleni (NULL = temel birim)
    olusturma_tarihi  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi       TIMESTAMP,
    aktif             BOOLEAN     NOT NULL DEFAULT TRUE,

    CONSTRAINT birimler_tip_check CHECK (tip IN ('ONAYLI', 'OLCEK', 'AGIRLIK')),
    CONSTRAINT birimler_temel_birim_dar CHECK (
        (temel_birim_mi = TRUE AND carpan_temele IS NULL AND bolen_temele IS NULL) OR
        (temel_birim_mi = FALSE AND carpan_temele IS NOT NULL AND bolen_temele IS NOT NULL)
    )
);
```

**Birim Tipleri:**

| Tip | Açıklama | Örnek Birimler |
|-----|----------|---------------|
| `AGIRLIK` | Ağırlık ölçüleri | kg (temel), g, ton, mg |
| `OLCEK` | Sayma/adet birimleri | adet, paket, koli, palet |
| `ONAYLI` | Resmi/ticari onaylı birimler | kg, ton (düzenlenmiş pazarlarda kullanılır) |

**Varsayılan Kayıtlar (Seed):**

| ad | kisa_ad | tip | temel_birim_mi | carpan_temele | bolen_temele |
|----|---------|-----|---------------|---------------|--------------|
| Kilogram | kg | AGIRLIK | TRUE | NULL | NULL |
| Gram | g | AGIRLIK | FALSE | 1000 | 1 |
| Ton | ton | AGIRLIK | FALSE | 0.001 | 1 |
| Miligram | mg | AGIRLIK | FALSE | 1000000 | 1 |
| Adet | adet | OLCEK | TRUE | NULL | NULL |
| Paket | paket | OLCEK | FALSE | 1 | 1 |
| Koli | koli | OLCEK | FALSE | 1 | 1 |
| Palet | palet | OLCEK | FALSE | 1 | 1 |

---

### 2.2 Yeni Tablo: `birim_donusum` — Birim Dönüşüm Oranları

```sql
CREATE TABLE birim_donusum (
    donusum_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    kaynak_birim_id    UUID        NOT NULL REFERENCES birimler(birim_id),
    hedef_birim_id     UUID        NOT NULL REFERENCES birimler(birim_id),
    carpan             DECIMAL(15,6) NOT NULL,  -- kaynak → hedef: hedef = kaynak × carpan
    bolen              DECIMAL(15,6) NOT NULL,  -- kaynak → hedef: hedef = kaynak / bolen
    toptan_mi          BOOLEAN     NOT NULL DEFAULT FALSE,  -- Toptan dönüşüm mü?
    perakende_mi       BOOLEAN     NOT NULL DEFAULT FALSE,  -- Perakende dönüşüm mü?
    aktif              BOOLEAN     NOT NULL DEFAULT TRUE,
    olusturma_tarihi   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi        TIMESTAMP,

    CONSTRAINT birim_donusum_kaynakkendi CHECK (kaynak_birim_id != hedef_birim_id),
    CONSTRAINT birim_donusum_tipayni CHECK (
        (SELECT b1.tip FROM birimler b1 WHERE b1.birim_id = kaynak_birim_id) =
        (SELECT b2.tip FROM birimler b2 WHERE b2.birim_id = hedef_birim_id)
    ),
    CONSTRAINT birim_donusum_unique UNIQUE (kaynak_birim_id, hedef_birim_id) 
        WHERE silme_tarihi IS NULL AND aktif = TRUE
);
```

**Çarpraz Kontrol:** `carpan × bolen = 1` olmalı (dönüşüm tersinir).

**Varsayılan Kayıtlar (Seed):**

| Kaynak | Hedef | Carpan | Bolen |
|--------|-------|--------|-------|
| kg | g | 1000 | 1 |
| g | kg | 1 | 1000 |
| ton | kg | 1000 | 1 |
| kg | ton | 1 | 1000 |
| adet | paket | 1 | 1 |
| paket | koli | 1 | 1 |
| koli | palet | 1 | 1 |

---

### 2.3 Yeni Tablo: `urun_birim_varsayilani` — Ürün Bazlı Birim Varsayılanları

```sql
CREATE TABLE urun_birim_varsayilani (
    urun_birim_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    urun_id            UUID        NOT NULL REFERENCES urunler(urun_id),
    birim_id           UUID        NOT NULL REFERENCES birimler(birim_id),
    satis_birimi_mi    BOOLEAN     NOT NULL DEFAULT FALSE,  -- Satışta kullanılabilir
    toptan_birimi_mi   BOOLEAN     NOT NULL DEFAULT FALSE,  -- Toptan satış birimi
    perakende_birimi_mi BOOLEAN    NOT NULL DEFAULT FALSE,  -- Perakende satış birimi
    varsayilan_mi      BOOLEAN     NOT NULL DEFAULT FALSE,  -- Genel varsayılan
    guncelleme_tarihi  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi        TIMESTAMP,

    CONSTRAINT urun_birim_varsayilani_unique UNIQUE (urun_id, birim_id) 
        WHERE silme_tarihi IS NULL,
    CONSTRAINT urun_birim_varsayilani_varsa_check 
        CHECK (urun_id IS NOT NULL AND birim_id IS NOT NULL)
);
```

---

### 2.4 Güncellenmiş Tablo: `urunler`

```sql
-- Mevcut alanlar korunur, FK ve CHECK eklenir:

ALTER TABLE urunler
    ADD CONSTRAINT urunler_birim_toptan_fk 
        FOREIGN KEY (birim_toptan) REFERENCES birimler(kisa_ad)  -- kisa_ad referansı
        DEFERRABLE INITIALLY DEFERRED,
    ADD CONSTRAINT urunler_birim_perakende_fk 
        FOREIGN KEY (birim_perakende) REFERENCES birimler(kisa_ad)
        DEFERRABLE INITIALLY DEFERRED,
    ADD CONSTRAINT urunler_birim_toptan_check 
        CHECK (birim_toptan IN (SELECT kisa_ad FROM birimler WHERE tip IN ('AGIRLIK','ONAYLI'))),
    ADD CONSTRAINT urunler_birim_perakende_check 
        CHECK (birim_perakende IN (SELECT kisa_ad FROM birimler));
```

> **Not:** Mevcut VARCHAR(10) kolonları korunur; FK `birimler.kisa_ad`'a yönlendirilir. Bu sayaca mevcut veri bozulmaz, sadece yeni kısıtlamalar devreye girer.

---

### 2.5 Birim Dönüşüm Validasyon Fonksiyonu

```sql
CREATE OR REPLACE FUNCTION fn_birim_donusum_dogrula(
    p_kaynak_birim VARCHAR(10),
    p_hedef_birim  VARCHAR(10),
    p_kaynak_miktar DECIMAL(15,3)
) RETURNS DECIMAL(15,3) AS $$
DECLARE
    v_carpan DECIMAL(15,6);
    v_bolen  DECIMAL(15,6);
    v_result DECIMAL(15,3);
BEGIN
    -- Aynı birimse dönüşüme gerek yok
    IF p_kaynak_birim = p_hedef_birim THEN
        RETURN p_kaynak_miktar;
    END IF;

    SELECT bd.carpan, bd.bolen
    INTO v_carpan, v_bolen
    FROM birim_donusum bd
    JOIN birimler kb ON kb.birim_id = bd.kaynak_birim_id
    JOIN birimler hb ON hb.birim_id = bd.hedef_birim_id
    WHERE kb.kisa_ad = p_kaynak_birim
      AND hb.kisa_ad = p_hedef_birim
      AND bd.aktif = TRUE
      AND bd.silme_tarihi IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Birim dönüşüm tanımlı değil: % → %', p_kaynak_birim, p_hedef_birim;
    END IF;

    -- Dönüşüm tersinirlik kontrolü: carpan × bolen ≈ 1
    IF ABS((v_carpan * v_bolen) - 1.0) > 0.000001 THEN
        RAISE WARNING 'Dönüşüm tutarsızlığı: % → % (carpan×bolen = % ≠ 1)', 
            p_kaynak_birim, p_hedef_birim, v_carpan * v_bolen;
    END IF;

    v_result := (p_kaynak_miktar * v_carpan) / v_bolen;
    RETURN v_result;

END;
$$ LANGUAGE plpgsql;
```

---

### 2.6 Stok Hareketleri Entegrasyonu

**Stok Hareketi Girişi (`stok_hareketleri`):**

Her stok hareketi kaydında otomatik dönüşüm validasyonu:

```sql
CREATE OR REPLACE FUNCTION fn_stok_hareketi_birim_kontrol()
RETURNS TRIGGER AS $$
BEGIN
    -- Hareket birimi ile stok kartı birimi uyumsuzsa uyar
    IF NEW.birim <> (
        SELECT s.birim FROM stok_karti s WHERE s.stok_id = NEW.stok_id
    ) THEN
        -- Otomatik dönüşüm yap; tutarsızlık varsa uyar
        DECLARE
            v_cevrulmus DECIMAL(15,3);
        BEGIN
            v_cevrulmus := fn_birim_donusum_dogrula(NEW.birim, (
                SELECT s.birim FROM stok_karti s WHERE s.stok_id = NEW.stok_id
            ), NEW.miktar);
            -- Uyarı loglanır ama işlem engellenmez (sistem esnekliği)
            RAISE NOTICE 'Birim dönüştürüldü: % % → % %', 
                NEW.miktar, NEW.birim, v_cevrulmus, 
                (SELECT s.birim FROM stok_karti s WHERE s.stok_id = NEW.stok_id);
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Birim dönüşüm hatası: % → %', NEW.birim, 
                (SELECT s.birim FROM stok_karti s WHERE s.stok_id = NEW.stok_id);
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stok_hareketi_birim_kontrol
BEFORE INSERT OR UPDATE ON stok_hareketleri
FOR EACH ROW
EXECUTE FUNCTION fn_stok_hareketi_birim_kontrol();
```

---

### 2.7 Satış Entegrasyonu

Satış işlemlerinde birim tutarlılığı:

```
Satis Akışı:
  1. Ürün seçilir
  2. Satış birimi belirlenir (toptan veya perakende)
  3. Sistem otomatik olarak uygun birimi seçer (urun_birim_varsayilani tablosundan)
  4. Fiyat birime göre çekilir (birim_fiyat tablosundan)
  5. Stok çıkışı doğru birimde yapılır
```

---

### 2.8 Sayfa ve Gösterim Birimi

Ürün listeleme/raporlama sırasında kullanıcıya hangi birimde gösterileceği:

```sql
-- Her ürün için varsayılan gösterim birimi
CREATE VIEW vw_urunler_birimli AS
SELECT 
    u.urun_id,
    u.ad,
    u.kategori,
    u.birim_toptan,
    u.birim_perakende,
    -- Gösterim birimi: tercih edilen birim
    COALESCE(
        (SELECT ubv.birim_id 
         FROM urun_birim_varsayilani ubv 
         WHERE ubv.urun_id = u.urun_id 
           AND ubv.varsayilan_mi = TRUE 
           AND ubv.silme_tarihi IS NULL),
        (SELECT b.birim_id FROM birimler b WHERE b.kisa_ad = u.birim_perakende)
    ) AS varsayilan_gosterim_birim_id,
    -- Gösterim birimi kısa adı
    COALESCE(
        (SELECT b.kisa_ad 
         FROM urun_birim_varsayilani ubv 
         JOIN birimler b ON b.birim_id = ubv.birim_id
         WHERE ubv.urun_id = u.urun_id 
           AND ubv.varsayilan_mi = TRUE 
           AND ubv.silme_tarihi IS NULL),
        u.birim_perakende
    ) AS varsayilan_gosterim_birim
FROM urunler u
WHERE u.silme_tarihi IS NULL AND u.aktif = TRUE;
```

---

## 3. Görev Dağılımı

| # | Görev | Öncelik | Modül |
|---|-------|---------|-------|
| 1 | `birimler` tablosu ve seed verisi oluştur | P0 | Veritabanı |
| 2 | `birim_donusum` tablosu ve seed verisi oluştur | P0 | Veritabanı |
| 3 | `urun_birim_varsayilani` tablosu oluştur | P1 | Veritabanı |
| 4 | `urunler` tablosuna FK ve CHECK kısıtlamaları ekle | P1 | Veritabanı |
| 5 | `fn_birim_donusum_dogrula()` fonksiyonu | P0 | İş Kuralı |
| 6 | `trg_stok_hareketi_birim_kontrol` tetikleyicisi | P1 | İş Kuralı |
| 7 | `vw_urunler_birimli` view oluştur | P2 | Raporlama |
| 8 | Ürün CRUD API'lerinde birim validasyonu | P1 | API |

---

## 4. Migration Dosyası

Dosya yolu: `workspace/migrations/003_add_birim_donusum_sistemi.py`

```python
# Pseudocode — tam SQL migration:
# 1. CREATE TABLE birimler (...)
# 2. INSERT INTO birimler (...) -- seed
# 3. CREATE TABLE birim_donusum (...)
# 4. INSERT INTO birim_donusum (...) -- seed
# 5. CREATE TABLE urun_birim_varsayilani (...)
# 6. ALTER TABLE urunler ADD CONSTRAINT (FK + CHECK)
# 7. CREATE FUNCTION fn_birim_donusum_dogrula (...)
# 8. CREATE TRIGGER trg_stok_hareketi_birim_kontrol (...)
# 9. CREATE VIEW vw_urunler_birimli (...)
```

---

## 5. Etki Analizi

| Etki Alanı | Değerlendirme |
|------------|---------------|
| Mevcut veri | `birimler` seed verisi mevcut `birim_toptan/perakende` değerleriyle uyumlu olmalı. FK eklemesi öncesi veri temizliği gerekebilir. |
| Performans | Eklenen foreign key'ler JOIN performansını iyileştirir; index'ler zaten mevcut |
| API değişikliği | Mevcut API'lerde string birim yerine UUID kullanılması gerekecek (geriye uyumlu wrapper ile) |
| Backward compatibility | Mevcut `birim_toptan VARCHAR(10)` korunur; FK referansı `kisa_ad` üzerinden yapılır |

---

## 6. Doğrulama Senaryoları

| # | Senaryo | Beklenen Sonuç |
|---|--------|----------------|
| 1 | `fn_birim_donusum_dogrula('kg', 'g', 1)` çağrılır | `1000` döner |
| 2 | `fn_birim_donusum_dogrula('kg', 'adet', 1)` çağrılır | HATA: farklı tip, dönüşüm yok |
| 3 | Tanımsız dönüşüm çağrılır | HATA: "Birim dönüşüm tanımlı değil" |
| 4 | `stok_hareketleri`'ne kg birimle giriş, stok_karti birimi g olan kayda eklenir | Otomatik dönüşüm yapılır, uyarı loglanır |
| 5 | Yeni ürün eklenirken `birim_toptan = 'kilo'` yazılır (yanlış yazım) | FK hatası: kayıt reddedilir |
