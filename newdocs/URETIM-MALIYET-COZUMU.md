# Üretim Maliyet Hesaplama Sistemi — Tasarım Dokümanı

**Versiyon:** 1.1.0  
**Tarih:** 2026-07-29  
**Durum:** TASLAK — Uygulama Öncesi Geliştirme Ekibi Onayı Gerekli  
**Öncelik:** 1.1.3 Kritik — GAP Raporu Bölüm 1.1.3

---

## 1. Problemin Tanımı

### 1.1 Kritik Boşluk (GAP Raporu 1.1.3)

`uretim_emri.toplam_maliyet` alanı mevcut ancak **nasıl doldurulacağı tanımlanmamış**. Mevcut durum:

| Tablo | Alan | Sorun |
|-------|------|-------|
| `uretim_emri` | `toplam_maliyet` | Boş — hesaplama formülü yok |
| `uretim_emri` | `fire_orani_planlanan` | Var, kullanılmıyor |
| `uretim_emri` | `fire_orani_gercek` | Var, kullanılmıyor |
| `uretim_detay` | `fire_miktari` | Var, maliyete yansımıyor |
| `urun_donusum` | `fire_orani` | Var, üretim emriyle ilişkilendirilmemiş |
| `uretim_maliyet` | *(ayrı tablo)* | Var, ama `uretim_emri.toplam_maliyet`'e yazılmıyor |
| `genel_gider` | *(ayrı tablo)* | Var, üretim maliyetine dağıtılmıyor |
| `birim_fiyat` | `fiyat_tipi='MALIYET'` | Var, kullanılmıyor |

**Sonuç:** Üretim emri tamamlandığında `toplam_maliyet = NULL` kalıyor. Maliyet raporları çalışmıyor.

---

## 2. Maliyet Hesaplama Formülü

### 2.1 Genel Formül

```
Toplam Üretim Maliyeti =
    Hammadde Maliyeti
  + İşçilik Maliyeti
  + Enerji Maliyeti
  + Bakım Maliyeti
  + Fire Maliyeti
  + Genel Gider Dağıtımı
```

**Birim Maliyet:**
```
Birim Maliyet = Toplam Üretim Maliyeti / Üretilen Net Miktar
```

### 2.2 Hammadde Maliyeti (FIFO Bazlı)

Her üretim detayı (`uretim_detay`) için:

```
Hammadde Maliyeti[i] = hammadde_miktar[i] × birim_fiyat[i]
```

- `birim_fiyat[i]`: İlgili hammadde lotunun `stok_karti.birim_fiyat` değeri (FIFO sırasındaki lot)
- **Birden fazla lot kullanılıyorsa** her lotun maliyeti ayrı hesaplanır ve toplanır

**Toplam Hammadde Maliyeti:**
```
Hammadde Toplam = Σ (hammadde_miktar[i] × birim_fiyat[i])
```

### 2.3 Fire Maliyeti

Fire, hammadde kaybından kaynaklanır. Fire maliyeti = fire olarak kaybedilen hammadde miktarının maliyetidir.

```
Fire Maliyeti = fire_miktari × Fire Birim Fiyatı
```

**Fire Birim Fiyatı** hesaplama stratejisi (ürün bazlı ayarlanabilir):

| Strateji | Formül | Kullanım Senaryosu |
|----------|--------|--------------------|
| `HAMMADDE_SON` | Son lotun birim fiyatı | Standart — fire kaynağı son lot |
| `HAMMADDE_ORTALAMA` | Ağırlıklı ortalama birim fiyat | Çok lot kullanımı |
| `HAMMADDE_ILK` | İlk lotun birim fiyatı (FIFO'da ilk fire) | Fire ilk lotta oluşuyorsa |
| `SIFIR` | Fire maliyeti sıfır | Fire'ın üretken sayıldığı durum |

**Fire Birim Fiyatı Depolama:**

`urun_donusum` tablosuna yeni alan eklenir:

```sql
-- urun_donusum tablosuna eklenecek alan
fire_birim_fiyat_stratejisi VARCHAR(20) 
  DEFAULT 'HAMMADDE_SON'
  CHECK (fire_birim_fiyat_stratejisi IN ('HAMMADDE_SON','HAMMADDE_ORTALAMA','HAMMADDE_ILK','SIFIR'))
```

### 2.4 İşçilik Maliyeti

**İşçilik Kayıtları** — yeni tablo:

```sql
CREATE TABLE uretim_iscilik (
    iscilik_id      UUID PRIMARY KEY,
    uretim_id       UUID NOT NULL REFERENCES uretim_emri(uretim_id),
    personel_id     UUID REFERENCES kullanicilar(kullanici_id),  -- veya ayrı personel tablosu
    calisma_saati   DECIMAL(5,2) NOT NULL,
    saatlik_ucret   DECIMAL(10,4) NOT NULL,
    toplam_tutar    DECIMAL(15,4) GENERATED ALWAYS AS (calisma_saati * saatlik_ucret) STORED,
    aciklama        TEXT,
    olusturma_tarihi TIMESTAMP DEFAULT NOW(),
    olusturan_kullanici_id UUID REFERENCES kullanicilar(kullanici_id)
);
```

```
İşçilik Maliyeti = Σ (calisma_saati[i] × saatlik_ucret[i])
```

### 2.5 Enerji ve Bakım Maliyetleri

Üretim emri bazında sabit giderler:

**Enerji Giderleri** — yeni tablo:

```sql
CREATE TABLE uretim_enerji (
    enerji_id        UUID PRIMARY KEY,
    uretim_id        UUID NOT NULL REFERENCES uretim_emri(uretim_id),
    gider_tipi       VARCHAR(20) NOT NULL 
                     CHECK (gider_tipi IN ('ELEKTRIK','DOGALGAZ','YAKIT','SU','DIGER')),
    gider_tutari     DECIMAL(15,4) NOT NULL,
    birim            VARCHAR(20) DEFAULT 'TL',
    aciklama         TEXT,
    olusturma_tarihi TIMESTAMP DEFAULT NOW(),
    olusturan_kullanici_id UUID REFERENCES kullanicilar(kullanici_id)
);
```

**Bakım Giderleri** — aynı `uretim_enerji` tablosunda `BAKIM` gider_tipi ile veya ayrı tablo:

```sql
CREATE TABLE uretim_bakim (
    bakim_id         UUID PRIMARY KEY,
    uretim_id        UUID NOT NULL REFERENCES uretim_emri(uretim_id),
    bakim_tipi       VARCHAR(30),  -- PLANLI, HATALAR
    bakim_tutari     DECIMAL(15,4) NOT NULL,
    birim            VARCHAR(20) DEFAULT 'TL',
    aciklama         TEXT,
    olusturma_tarihi TIMESTAMP DEFAULT NOW(),
    olusturan_kullanici_id UUID REFERENCES kullanicilar(kullanici_id)
);
```

```
Enerji Maliyeti     = Σ uretim_enerji.gider_tutari (gider_tipi IN ('ELEKTRIK','DOGALGAZ','YAKIT','SU'))
Bakım Maliyeti      = Σ uretim_bakim.bakim_tutari
```

Alternatif: **Sistem ayarı olarak sabit enerji/bakım oranı** (üretim başına veya hammadde maliyeti %'si):

```sql
-- sistem_ayarlari tablosuna eklenecek ayarlar
INSERT INTO sistem_ayarlari (ayar_adi, deger, veri_tipi, kategori) VALUES
  ('URETIM_ENERJI_ORAN', '0.02', 'DECIMAL', 'URETIM'),      -- hammadde_maliyeti × 0.02
  ('URETIM_BAKIM_ORAN',  '0.01', 'DECIMAL', 'URETIM'),      -- hammadde_maliyeti × 0.01
  ('URETIM_ISCILIK_SAAT_UCRET', '250.00', 'DECIMAL', 'URETIM');  -- TL/saat
```

### 2.6 Genel Gider Dağıtımı

Genel giderler (`genel_gider` tablosu) üretimler arasında dağıtılır.

**Dağıtım Stratejisi** (`sistem_ayarlari`):

| Strateji | Formül | Açıklama |
|----------|--------|----------|
| `HAMMADDE_ORANI` | `hammadde_maliyeti / toplam_hammadde_maliyeti_all_production × toplam_genel_gider` | Hammadde maliyeti oranında |
| `ISCILIK_ORANI` | `iscilik_maliyeti / toplam_iscilik_maliyeti × toplam_genel_gider` | İşçilik saati oranında |
| `MIKTAR_ORANI` | `uretilen_miktar / toplam_uretim_miktari × toplam_genel_gider` | Üretilen miktar oranında |
| `SABIT` | `sabit_tutar` | Üretim başına sabit |

**Dönem Bazlı Genel Gider:**

```sql
-- Dönem: ay/yıl
Toplam Genel Gider (Dönem) = 
  SELECT SUM(gider_tutari) FROM genel_gider 
  WHERE donem_ay = :ay AND donem_yil = :yil AND odendi = TRUE
```

```
Genel Gider Dağıtımı = 
  Toplam Genel Gider (Dönem) × Dağıtım Stratejisi Oranı
```

---

## 3. Fire Yönetimi

### 3.1 Fire Oranı Tanımı

Her mamul-hammadde çifti için `urun_donusum.fire_orani` tanımlı:

```
fire_orani = 0.05  →  %5 fire bekleniyor
```

### 3.2 Fire Hesaplama Akışı

```
Planlanan Üretim:
  Mamul Miktar (planlanan) = hammadde_miktar × (1 - fire_orani)

Fiili Üretim:
  Fire Miktarı (fiili) = uretim_detay.fire_miktari
  Fire Oranı (fiili)   = fire_miktari / (hammadde_miktar + fire_miktari)
```

**Önemli:** `fire_miktari` = hammadde_miktarı - (üretilen mamul miktarı / dönüşüm oranı)

Örnek:
- Hammadde: 105 kg kayısı
- Dönüşüm oranı: 1.05 (1 kg mamul için 1.05 kg hammadde gerekli)
- Fire oranı: %5
- Beklenen mamul: 105 / 1.05 = 100 kg
- Fire miktarı: 105 - 100 = 5 kg

### 3.3 Fire Maliyetinin Mamul Maliyetine Eklenmesi

Fire kaybettiğimiz hammadde maliyetidir. İki yaklaşım:

**Yaklaşım A — Fire'yi ayrı satır olarak ekle (Önerilen):**

```
Fire Maliyeti = fire_miktari × hammadde_birim_fiyat
Toplam Maliyet = Hammadde Maliyeti + İşçilik + Enerji + Bakım + Fire + Genel Gider
```

**Yaklaşım B — Fire'yi hammadde maliyetine dahil et:**

```
Efektif Hammadde Maliyeti = (hammadde_miktar × birim_fiyat) + (fire_miktari × fire_birim_fiyat)
```

> **Tercih:** Yaklaşım A — fire ayrı görünür, fire oranı analizi ve raporlaması kolaylaşır.

### 3.4 Fire Oranı Sapma Uyarısı

```
Fire Sapması = fire_orani_gercek - fire_orani_planlanan

Eğer |fire_orani_gercek - fire_orani_planlanan| > sistem_ayari.URETIM_FIRE_SAPMA_ESIK
  → Uyarı: "Fiili fire oranı (%X) planlanandan (%Y) sapma gösteriyor"
```

`URETIM_FIRE_SAPMA_ESIK` sistem ayarı: varsayılan `%2` (0.02).

---

## 4. Veritabanı Değişiklikleri

### 4.1 Yeni Tablolar

#### `uretim_iscilik` — İşçilik Kayıtları

```sql
CREATE TABLE uretim_iscilik (
    iscilik_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uretim_id            UUID NOT NULL REFERENCES uretim_emri(uretim_id),
    personel_id          UUID REFERENCES kullanicilar(kullanici_id),
    calisma_saati        DECIMAL(5,2) NOT NULL CHECK (calisma_saati > 0),
    saatlik_ucret        DECIMAL(10,4) NOT NULL CHECK (saatlik_ucret >= 0),
    toplam_tutar         DECIMAL(15,4) GENERATED ALWAYS AS (calisma_saati * saatlik_ucret) STORED,
    aciklama             TEXT,
    olusturma_tarihi     TIMESTAMP DEFAULT NOW(),
    olusturan_kullanici_id UUID REFERENCES kullanicilar(kullanici_id),
    guncelleme_tarihi    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_uretim_iscilik_uretim ON uretim_iscilik(uretim_id);
```

#### `uretim_enerji` — Enerji ve Diğer Değişken Giderler

```sql
CREATE TABLE uretim_enerji (
    enerji_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uretim_id            UUID NOT NULL REFERENCES uretim_emri(uretim_id),
    gider_tipi           VARCHAR(20) NOT NULL 
                         CHECK (gider_tipi IN ('ELEKTRIK','DOGALGAZ','YAKIT','SU','BAKIM','DIGER')),
    gider_tutari         DECIMAL(15,4) NOT NULL CHECK (gider_tutari >= 0),
    birim                VARCHAR(20) DEFAULT 'TL',
    aciklama             TEXT,
    olusturma_tarihi     TIMESTAMP DEFAULT NOW(),
    olusturan_kullanici_id UUID REFERENCES kullanicilar(kullanici_id),
    guncelleme_tarihi    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_uretim_enerji_uretim ON uretim_enerji(uretim_id);
```

#### `genel_gider_dagitim` — Genel Gider Dağıtım Kayıtları

```sql
CREATE TABLE genel_gider_dagitim (
    dagitim_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uretim_id            UUID NOT NULL REFERENCES uretim_emri(uretim_id),
    donem_ay             INTEGER NOT NULL CHECK (donem_ay BETWEEN 1 AND 12),
    donem_yil            INTEGER NOT NULL,
    dagitim_stratejisi   VARCHAR(20) NOT NULL 
                         CHECK (dagitim_stratejisi IN ('HAMMADDE_ORANI','ISCILIK_ORANI','MIKTAR_ORANI','SABIT')),
    dagilim_orani        DECIMAL(10,6),  -- hesaplanan oran
    dagitilan_tutar      DECIMAL(15,4) NOT NULL,
    toplam_gider         DECIMAL(15,4) NOT NULL,  -- dönem toplam gider
    birim                VARCHAR(20) DEFAULT 'TL',
    olusturma_tarihi     TIMESTAMP DEFAULT NOW(),
    olusturan_kullanici_id UUID REFERENCES kullanicilar(kullanici_id)
);

CREATE INDEX idx_genel_gider_dagitim_uretim ON genel_gider_dagitim(uretim_id);
CREATE INDEX idx_genel_gider_dagitim_donem ON genel_gider_dagitim(donem_yil, donem_ay);
```

### 4.2 Mevcut Tablo Değişiklikleri

#### `uretim_emri` — Yeni Alanlar

```sql
ALTER TABLE uretim_emri ADD COLUMN birim_maliyet DECIMAL(15,4);
ALTER TABLE uretim_emri ADD COLUMN birim VARCHAR(20) DEFAULT 'TL';
ALTER TABLE uretim_emri ADD COLUMN maliyet_hesaplama_tarihi TIMESTAMP;
ALTER TABLE uretim_emri ADD COLUMN maliyet_durumu VARCHAR(20) 
  DEFAULT 'HENUZ_HESAPLANMADI'
  CHECK (maliyet_durumu IN ('HENUZ_HESAPLANMADI','HESAPLANDI','HATA'));
```

> `toplam_maliyet` zaten var — doldurulacak.

#### `urun_donusum` — Yeni Alan

```sql
ALTER TABLE urun_donusum ADD COLUMN fire_birim_fiyat_stratejisi VARCHAR(20) 
  DEFAULT 'HAMMADDE_SON'
  CHECK (fire_birim_fiyat_stratejisi IN ('HAMMADDE_SON','HAMMADDE_ORTALAMA','HAMMADDE_ILK','SIFIR'));
ALTER TABLE urun_donusum ADD COLUMN aktif DEFAULT TRUE;
```

#### `sistem_ayarlari` — Yeni Ayar Kayıtları

```sql
INSERT INTO sistem_ayarlari (ayar_adi, deger, veri_tipi, kategori, aciklama) VALUES
  ('URETIM_FIRE_SAPMA_ESIK',      '0.02',   'DECIMAL', 'URETIM', 'Fire oranı sapma eşiği (%2 = 0.02)'),
  ('URETIM_ENERJI_ORAN',          '0.02',   'DECIMAL', 'URETIM', 'Hammadde maliyeti × bu oran = enerji gideri varsayılanı'),
  ('URETIM_BAKIM_ORAN',           '0.01',   'DECIMAL', 'URETIM', 'Hammadde maliyeti × bu oran = bakım gideri varsayılanı'),
  ('URETIM_GENEL_GIDER_STRATEJI','HAMMADDE_ORANI', 'STRING', 'URETIM', 'Genel gider dağıtım stratejisi'),
  ('URETIM_GENEL_GIDER_SABIT',    '0',      'DECIMAL', 'URETIM', 'Üretim başına sabit genel gider (STRATEJI=SABIT ise)'),
  ('URETIM_FIRE_BIRIM_FIYAT_VARS', 'HAMMADDE_SON', 'STRING', 'URETIM', 'Varsayılan fire birim fiyat stratejisi');
```

---

## 5. Maliyet Hesaplama Algoritması

### 5.1 `hesapla_uretim_maliyeti(uretim_id)` Prosedürü

```python
def hesapla_uretim_maliyeti(uretim_id: UUID) -> MaliyetSonuc:
    """
    Üretim emrinin toplam maliyetini hesaplar.
    Çalıştırılma zamanı: Üretim emri TAMAMLANDI durumuna geçtiğinde.
    """

    # 1. Üretim emri bilgilerini al
    emri = db.query(UretimEmri).get(uretim_id)
    detaylar = db.query(UretimDetay).filter_by(uretim_id=uretim_id).all()

    # 2. Hammadde Maliyeti (FIFO — lot bazlı)
    hammadde_toplam = Decimal('0')
    for detay in detaylar:
        lot = db.query(StokKarti).get(detay.hammadde_stok_id)
        hammadde_maliyeti = detay.hammadde_miktar * lot.birim_fiyat
        hammadde_toplam += hammadde_maliyeti

    # 3. Fire Maliyeti
    fire_toplam = Decimal('0')
    for detay in detaylar:
        donusum = db.query(UrunDonusum).filter_by(
            mamul_urun_id=detay.mamul_urun_id,
            hammadde_urun_id=detay.hammadde_urun_id,
            aktif=True
        ).first()

        fire_strateji = donusum.fire_birim_fiyat_stratejisi or 'HAMMADDE_SON'
        fire_birim_fiyat = _get_fire_birim_fiyat(detay, fire_strateji)
        fire_maliyeti = detay.fire_miktari * fire_birim_fiyat
        fire_toplam += fire_maliyeti

    # 4. İşçilik Maliyeti
    iscilik_rows = db.query(UretimIscilik).filter_by(uretim_id=uretim_id).all()
    iscilik_toplam = sum(row.toplam_tutar for row in iscilik_rows)

    # 5. Enerji/Bakım Maliyeti
    enerji_rows = db.query(UretimEnerji).filter_by(uretim_id=uretim_id).all()
    enerji_toplam = sum(row.gider_tutari for row in enerji_rows 
                        if row.gider_tipi not in ('BAKIM',))
    bakim_toplam = sum(row.gider_tutari for row in enerji_rows 
                       if row.gider_tipi == 'BAKIM')

    # 5a. Alternatif: Sistem ayarı oran ile hesapla (enerji/bakım ayrı girilmediyse)
    if enerji_toplam == 0 and bakim_toplam == 0:
        enerji_oran = Decimal(sistem_ayari('URETIM_ENERJI_ORAN'))  # 0.02
        bakim_oran  = Decimal(sistem_ayari('URETIM_BAKIM_ORAN'))   # 0.01
        enerji_toplam = hammadde_toplam * enerji_oran
        bakim_toplam  = hammadde_toplam * bakim_oran

    # 6. Genel Gider Dağıtımı
    genel_gider_tutar = _dagit_genel_gider(uretim_id, hammadde_toplam, iscilik_toplam)

    # 7. Toplam Maliyet
    toplam_maliyet = (
        hammadde_toplam 
      + fire_toplam 
      + iscilik_toplam 
      + enerji_toplam 
      + bakim_toplam 
      + genel_gider_tutar
    )

    # 8. Birim Maliyet
    toplam_mamul_miktar = sum(d.mamul_miktar for d in detaylar)
    birim_maliyet = toplam_maliyet / toplam_mamul_miktar if toplam_mamul_miktar > 0 else Decimal('0')

    # 9. Fire Oranı (fiili)
    toplam_hammadde_miktar = sum(d.hammadde_miktar for d in detaylar)
    toplam_fire_miktar = sum(d.fire_miktari for d in detaylar)
    fire_orani_gercek = toplam_fire_miktar / (toplam_hammadde_miktar + toplam_fire_miktar) \
        if (toplam_hammadde_miktar + toplam_fire_miktar) > 0 else Decimal('0')

    # 10. uretim_emri güncelle
    emri.toplam_maliyet = toplam_maliyet
    emri.birim_maliyet = birim_maliyet
    emri.birim = 'TL'
    emri.fire_orani_gercek = fire_orani_gercek
    emri.maliyet_hesaplama_tarihi = datetime.now()
    emri.maliyet_durumu = 'HESAPLANDI'

    # 11. uretim_maliyet kaydı oluştur (detaylı历史)
    maliyet_kaydi = UretimMaliyet(
        uretim_id=uretim_id,
        malzeme_maliyeti=hammadde_toplam,
        iscilik_maliyeti=iscilik_toplam,
        enerji_maliyeti=enerji_toplam,
        bakim_maliyeti=bakim_toplam,
        fire_maliyeti=fire_toplam,
        diger_maliyetler=genel_gider_tutar,  # genel gider + diğer
        toplam_maliyet=toplam_maliyet,
        birim='TL',
        maliyet_donemi=date.today().replace(day=1),
    )
    db.add(maliyet_kaydi)
    db.commit()

    return MaliyetSonuc(
        toplam=toplam_maliyet,
        birim_maliyet=birim_maliyet,
        hammadde=hammadde_toplam,
        iscilik=iscilik_toplam,
        enerji=enerji_toplam,
        bakim=bakim_toplam,
        fire=fire_toplam,
        genel_gider=genel_gider_tutar,
        fire_orani_gercek=fire_orani_gercek,
    )


def _get_fire_birim_fiyat(detay, strateji) -> Decimal:
    if strateji == 'SIFIR':
        return Decimal('0')
    lot = db.query(StokKarti).get(detay.hammadde_stok_id)
    if strateji == 'HAMMADDE_SON':
        return lot.birim_fiyat
    elif strateji == 'HAMMADDE_ILK':
        # FIFO'da en eski lot — lot.giris_tarihi en eski olan
        pass  # benzer mantık
    elif strateji == 'HAMMADDE_ORTALAMA':
        pass  # ağırlıklı ortalama
    return lot.birim_fiyat
```

### 5.2 Üretim Tamamlama Orkestrasyonu — Tek Servis ve İdempotent Hesaplama

`POST /api/v1/uretim/{uretim_id}/tamamla` servis işlemi hammadde tüketimi, mamul lot oluşturma, kaynak lot bağlantısı ve maliyet hesabını **tek transaction** içinde orkestre eder. Maliyet fonksiyonu `uretim_id` üzerinde idempotent upsert yapar; aynı istek veya hesaplama tekrarlandığında ikinci maliyet/stok kaydı oluşmaz. Veritabanı trigger'ı iş mantığı çalıştırmaz.

```sql
CREATE OR REPLACE FUNCTION fn_uretim_tamamlandi_bildirim()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.durum = 'TAMAMLANDI' AND OLD.durum != 'TAMAMLANDI' THEN
        -- Yalnız gözlemlenebilirlik bildirimi; maliyet/stok iş mantığı çalıştırmaz.
        PERFORM pg_notify('uretim_tamamlandi', NEW.uretim_id::TEXT);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_uretim_tamamlandi_bildirim
AFTER UPDATE OF durum ON uretim_emri
FOR EACH ROW
EXECUTE FUNCTION fn_uretim_tamamlandi_bildirim();
```

> **Kanonik karar:** Maliyet hesaplama tamamla endpoint'inin servis katmanında ve aynı transaction içinde yapılır. Trigger yalnız telemetri bildirimi üretir; Celery/worker bu bildirime dayanarak yeniden maliyet veya stok kaydı oluşturmaz. Ayrı `maliyet-hesapla` endpoint'i kontrollü yeniden hesaplama içindir ve aynı idempotency anahtarını kullanır.

### 5.3 Fire Sapma Kontrolü

```python
def kontrol_fire_sapma(uretim_id: UUID):
    emri = db.query(UretimEmri).get(uretim_id)
    sapma_esik = Decimal(sistem_ayari('URETIM_FIRE_SAPMA_ESIK'))  # 0.02

    if emri.fire_orani_planlanan and emri.fire_orani_gercek:
        sapma = abs(emri.fire_orani_gercek - emri.fire_orani_planlanan)
        if sapma > sapma_esik:
            # Uyarı oluştur — bildirim gönder
            bildirim_gonder(
                tip='FIRE_SAPMA',
                mesaj=f"Üretim {emri.uretim_no}: Fiili fire oranı (%{emri.fire_orani_gercek*100:.1f}) "
                      f"planlanandan (%{emri.fire_orani_planlanan*100:.1f}) sapma gösteriyor.",
                hedef='URETIM_YONETICI'
            )
```

---

## 6. API Endpoint'ler

### 6.1 Maliyet Hesaplama

```
POST   /api/v1/uretim/{uretim_id}/maliyet-hesapla  # kontrollü, idempotent yeniden hesaplama
GET    /api/v1/uretim/{uretim_id}/maliyet
GET    /api/v1/uretim/{uretim_id}/maliyet-detay
```

**POST — Maliyet Hesapla Request:**
```json
{
  "hesaplama_tipi": "TAM",         // TAM veya TAHMINI
  "iscilik_ekle": [
    {
      "personel_id": "uuid",
      "calisma_saati": 8.5,
      "saatlik_ucret": 250.00,
      "aciklama": "Kayısı kurutma operasyonu"
    }
  ],
  "enerji_ekle": [
    {
      "gider_tipi": "ELEKTRIK",
      "gider_tutari": 150.00,
      "aciklama": "Kurutma makinesi"
    }
  ],
  "genel_gider_dagitim_stratejisi": "HAMMADDE_ORANI"  // opsiyonel, sistem varsayılanını kullanır
}
```

**GET — Maliyet Getir Response:**
```json
{
  "uretim_id": "uuid",
  "uretim_no": "URET-20260729-001",
  "durum": "TAMAMLANDI",
  "toplam_maliyet": 5250.00,
  "birim_maliyet": 52.50,
  "birim": "TL",
  "maliyet_durumu": "HESAPLANDI",
  "hesaplama_tarihi": "2026-07-29T15:30:00Z",
  "bilesenler": {
    "hammadde":  4000.00,    // %76.2
    "iscilik":    750.00,    // %14.3
    "enerji":      80.00,    // %1.5
    "bakim":       40.00,    // %0.8
    "fire":       200.00,    // %3.8
    "genel_gider": 180.00    // %3.4
  },
  "fire_orani_planlanan": 0.05,
  "fire_orani_gercek": 0.048,
  "sapma": -0.002
}
```

### 6.2 Maliyet Güncelleme (Üretim Tamamlanmadan Önce)

```
PATCH  /api/v1/uretim/{uretim_id}/maliyet-guncelle
```

- Üretim emri durumu `BEKLEMEDE` veya `ONAYLANDI` iken işçilik/enerji girişi yapılabilir
- `maliyet_durumu = 'HENUZ_HESAPLANMADI'` olarak kalır
- Üretim tamamlandığında son hesaplama yapılır

### 6.3 Fire Oranı Tanımlama (Ürün Bazlı)

```
GET    /api/v1/urun/{urun_id}/donusum
POST   /api/v1/urun/{urun_id}/donusum
PATCH  /api/v1/urun/donusum/{donusum_id}
```

**Donusum Request/Response:**
```json
{
  "mamul_urun_id": "uuid-kayisi-kuru",
  "hammadde_urun_id": "uuid-kayisi-taze",
  "donusum_orani": 1.05,
  "fire_orani": 0.05,
  "fire_birim_fiyat_stratejisi": "HAMMADDE_SON",
  "aktif": true
}
```

### 6.4 Genel Gider Dağıtım Raporu

```
GET    /api/v1/rapor/genel-gider-dagitim?donem_ay=7&donem_yil=2026
```

---

## 7. Sıfır Maliyet Senaryosu — Güvenlik

Maliyet sıfır veya negatif olamaz. Veritabanı düzeyinde koruma:

```sql
ALTER TABLE uretim_emri 
  ADD CONSTRAINT uretim_emri_maliyet_non_negative 
  CHECK (toplam_maliyet IS NULL OR toplam_maliyet >= 0);

ALTER TABLE uretim_maliyet 
  ADD CONSTRAINT uretim_maliyet_toplam_check 
  CHECK (toplam_maliyet >= 0);

-- Birim maliyet negatif olamaz
ALTER TABLE uretim_emri 
  ADD CONSTRAINT uretim_emri_birim_maliyet_check 
  CHECK (birim_maliyet IS NULL OR birim_maliyet >= 0);
```

---

## 8. Sıralı Hesaplama Akışı (Üretim Emri Yaşam Döngüsü)

```
[DURUM: BEKLEMEDE]
    │
    ├─► İşçilik kayıtları girilebilir      → uretim_iscilik
    ├─► Enerji giderleri girilebilir       → uretim_enerji
    ├─► Genel gider dağıtım stratejisi seç → sistem_ayarlari (geçici override)
    │
    ▼
[DURUM: ONAYLANDI]
    │  (Üretim başlamak üzere — maliyet tahmini yapılabilir)
    │
    ▼
[DURUM: TAMAMLANDI]  ───► tamamla servis transaction'ı ──► İdempotent maliyet hesapla
    │                         │
    │                         ▼
    │                   Uygulama servisi:
    │                   1. Hammadde maliyeti (FIFO lot fiyatları)
    │                   2. Fire maliyeti (fire_orani + strateji)
    │                   3. İşçilik toplamı (uretim_iscilik)
    │                   4. Enerji/Bakım toplamı (uretim_enerji)
    │                   5. Genel gider dağıtımı
    │                   6. Fire sapma kontrolü
    │                   7. uretim_emri.toplam_maliyet GÜNCELLE
    │                   8. uretim_maliyet KAYDI OLUŞTUR
    │                   9. Mamul stok_karti.birim_fiyat GÜNCELLE (birim_maliyet)
    │
    ▼
[DURUM: TAMAMLANDI] + maliyet_durumu = 'HESAPLANDI'
```

---

## 9. Mamul Stok Kartı Güncelleme

Üretim tamamlandığında oluşan mamul lotunun `birim_fiyat` alanı, hesaplanan birim maliyet ile güncellenir:

```python
# Mamul lotunun birim fiyatını güncelle
mamul_lot = db.query(StokKarti).get(uretim_lot.mamul_stok_id)
mamul_lot.birim_fiyat = birim_maliyet  # TL/kg veya TL/adet
```

Bu sayede:
- Mamul satıldığında `satis_kalemleri.birim_fiyat` FIFO'dan değil, üretim maliyetinden gelir
- Stok değeri doğru hesaplanır
- Kar/zarar analizi yapılabilir

---

## 10. Veritabanı Trigger vs Uygulama Katmanı Kararı

| İşlem | Nerede Yapılır | Gerekçe |
|-------|----------------|---------|
| `uretim_emri.durum = TAMAMLANDI` geçişi | Uygulama servisindeki tamamla transaction'ı | Stok, lot, izlenebilirlik ve maliyeti tek orkestrasyonda tutar |
| Maliyet hesaplama | Uygulama katmanı, idempotent fonksiyon | Kompleks iş mantığı; tekrar çağrıda duplicate üretmez |
| PostgreSQL trigger | Yalnız `pg_notify` telemetrisi | İş mantığı ve worker tetiklemesi yapmaz |
| `toplam_maliyet` güncelleme | Uygulama katmanı (transaction içinde) | Tutarlılık kontrolü |
| Fire sapma kontrolü | Uygulama katmanı | Bildirim gönderimi gerekli |
| Stok birim_fiyat güncelleme | Uygulama katmanı | Lot üretim kaydı ile koordineli |

---

## 11. Açık Konular — Geliştirme Ekibi Karar Vermeli

1. **İşçilik verileri girilecek mi?** Eğer üretimde personel takibi yoksa, işçilik maliyeti sistem ayarı oran ile otomatik hesaplanabilir (hammadde maliyeti × `URETIM_ISCILIK_ORAN`).

2. **Enerji/bakım giderleri manuel mi girilecek, yoksa sayaç okuması ile mi?** Sayaç okuması ile olursa `uretim_enerji` tablosu yerine `enerji_okuma` gibi ayrı bir akış gerekebilir.

3. **Genel gider dağıtımı hangi sıklıkla güncellenecek?** Aylık — ay sonunda kesinleşen genel giderler dağıtılır. Bu durumda üretim anında genel gider = 0, ay sonunda güncelleme yapılır.

4. **`uretim_emri.toplam_maliyet` NULL bırakılabilir mi?** Önerilen yaklaşım: Üretim tamamlanmadan maliyet hesaplanamaz. `maliyet_durumu` ile "HENUZ_HESAPLANMADI" / "HESAPLANDI" / "HATA" takip edilir.

5. **Maliyet hesaplama hatalarında ne olur?** `maliyet_durumu = 'HATA'`, hata mesajı loglanır, yönetici bildirimi gönderilir. Üretim emri "TAMAMLANDI" olarak kalır, maliyet manuel düzeltilebilir.

---

## 12. Özet Tablo — Yapılması Gerekenler

| # | İş | Öncelik | Tablo/Alan |
|---|----|---------|------------|
| 1 | `uretim_iscilik` tablosu oluştur | Kritik | Yeni tablo |
| 2 | `uretim_enerji` tablosu oluştur | Kritik | Yeni tablo |
| 3 | `genel_gider_dagitim` tablosu oluştur | Kritik | Yeni tablo |
| 4 | `uretim_emri` → `birim_maliyet`, `maliyet_durumu` alanları ekle | Kritik | ALTER |
| 5 | `urun_donusum` → `fire_birim_fiyat_stratejisi` alanı ekle | Kritik | ALTER |
| 6 | Sistem ayarları ekle (`URETIM_*`) | Kritik | sistem_ayarlari |
| 7 | Maliyet hesaplama API (`POST .../maliyet-hesapla`) | Kritik | API |
| 8 | Maliyet getir API (`GET .../maliyet`) | Kritik | API |
| 9 | Tetikleyici ve arka plan işi (Celery) | Kritik | Backend |
| 10 | Fire sapma kontrolü ve bildirim | Orta | Backend |
| 11 | Birim fiyat güncelleme (mamul lot) | Orta | Backend |
| 12 | Maliyet raporları API | Orta | API |
| 13 | Genel gider dağıtım raporu API | Orta | API |

---

## Ek A: Örnek Hesaplama

**Senaryo:** 100 kg kurutulmuş kayısı üretimi

**Veriler:**
- Hammadde: Taze kayısı — `lot_no = LOT-20260701-001`
- Hammadde miktarı: 105 kg (planlanan fire %5)
- Hammadde birim fiyat (FIFO): 20 TL/kg
- İşçilik: 8 saat × 250 TL/saat = 2.000 TL
- Enerji: Sistem ayarı oran × hammadde maliyeti = 0.02 × 2.100 = 42 TL
- Bakım: Sistem ayarı oran × hammadde maliyeti = 0.01 × 2.100 = 21 TL
- Fire fiili: 5 kg
- Fire birim fiyat stratejisi: `HAMMADDE_SON` = 20 TL/kg
- Dönem genel gider (aylık): 10.000 TL
- Toplam hammadde maliyeti (tüm üretimler): 500.000 TL
- Dağıtım stratejisi: `HAMMADDE_ORANI`

**Hesaplama:**

```
Hammadde Maliyeti = 105 kg × 20 TL/kg = 2.100 TL
Fire Maliyeti     = 5 kg × 20 TL/kg = 100 TL
İşçilik Maliyeti = 8 × 250 = 2.000 TL
Enerji Maliyeti  = 2.100 × 0.02 = 42 TL
Bakım Maliyeti   = 2.100 × 0.01 = 21 TL

Genel Gider Dağıtımı = (2.100 / 500.000) × 10.000 = 42 TL

Toplam Maliyet = 2.100 + 100 + 2.000 + 42 + 21 + 42 = 4.305 TL
Birim Maliyet  = 4.305 / 100 kg = 43.05 TL/kg
```

**Maliyet Bileşenleri Dağılımı:**
```
Hammadde   : 2.100 TL  (%48.8)
İşçilik    : 2.000 TL  (%46.5)
Fire       :   100 TL  (%2.3)
Enerji     :    42 TL  (%1.0)
Bakım      :    21 TL  (%0.5)
Genel Gid. :    42 TL  (%1.0)
─────────────────────────────
TOPLAM     : 4.305 TL  (%100)
```

---

*Bu doküman GAP Raporu Bölüm 1.1.3'te tespit edilen kritik eksikliği çözmek için hazırlanmıştır. Uygulama öncesi geliştirme ekibinin kodlama standartlarına uygunluğu kontrol etmesi gerekir.*
