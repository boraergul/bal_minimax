# Urun Ozellik Sistemi Tamamlama — Cozum Dokumani
## Versiyon: 1.0 | Tarih: 2026-07-29 | Durum: TASLAK

---

## 1. MEVCUT DURUM

### 1.1 Tablo Yapilari (DB Design Bolum 3.1.5 ve 3.2.3)

**urun_ozellikleri** — Urun nitelik tanimlari (kategori bazli sablon):
| Alan | Tip | Aciklama |
|------|-----|----------|
| ozellik_id | UUID | PK |
| kategori | VARCHAR(20) | MEYVE, BAL, KARSIM, TUML |
| alan_adi | VARCHAR(50) | Veritabani alan adi (rnk, boyut) |
| goruntu_adi | VARCHAR(100) | Kullaniciya gosterilecek ad |
| tip | VARCHAR(20) | METIN, SAYI, ENUM, BOOLEAN, TARIH |
| zorunlu | BOOLEAN | Stok girisinde zorunlu mu? |
| etikette_goster | BOOLEAN | Etikette gosterilsin mi? |
| etikette_zorunlu | BOOLEAN | Etikette zorunlu mu? |
| siralama | INTEGER | Form/etiket sirasi |
| varsayilan_deger | VARCHAR(255) | Varsayilan deger |
| enum_degerleri | JSONB | Enum tipi icin secenek listesi |
| olusturma_tarihi, guncelleme_tarihi, silme_tarihi | TIMESTAMP | Standart audit alanlari |

**lot_ozellikleri** — Lot bazli ozellik degerleri:
| Alan | Tip | Aciklama |
|------|-----|----------|
| lot_ozellik_id | UUID | PK |
| stok_id | UUID | FK → stok_karti |
| ozellik_id | UUID | FK → urun_ozellikleri |
| deger | VARCHAR(255) | Girilen deger |
| birim | VARCHAR(20) | Birim (varsa) |
| olusturma_tarihi, guncelleme_tarihi | TIMESTAMP | Standart audit alanlari |

**Unique constraint:** `(stok_id, ozellik_id)` — ayni lotta ayni ozellik bir kez tanimlanabilir.

### 1.2 Mevcut Eksiklikler (URETIMLIK_HAZIRLIK_GAP-ANALIZI-RAPORU Bolum 1.2.3)

1. **CRUD API endpoint'leri yok** — urun_ozellikleri tablosu icin
2. **Kategori bazli varsayilan ozellikler** nasil olusturulacak belirsiz
3. **Lot ozellikleri ↔ Urun ozellikleri iliskisi** tam net degil
4. **Etiket alanlari ile ozellik sistemi entegrasyonu** belirsiz
5. **Ozellik guncelleme kurallari** tanimsiz

---

## 2. COZUM TASARIMI

### 2.1 CRUD API Endpoint'leri

Tum endpoint'ler `/api/v1/ozellikler` on eki altinda toplanir.

#### 2.1.1 Ozellik Tanimi CRUD

| Endpoint | Method | Aciklama |
|----------|--------|----------|
| `/api/v1/ozellikler` | GET | Tum aktif ozellikleri listele (filtre: kategori, tip) |
| `/api/v1/ozellikler/{ozellikId}` | GET | Tek ozellik detay |
| `/api/v1/ozellikler` | POST | Yeni ozellik tanimi olustur |
| `/api/v1/ozellikler/{ozellikId}` | PUT | Ozellik tanimini guncelle |
| `/api/v1/ozellikler/{ozellikId}` | DELETE | Soft delete (silme_tarihi atanir) |
| `/api/v1/ozellikler/kategori/{kategori}` | GET | Belirli kategoriye ait ozellikler |
| `/api/v1/ozellikler/sablon/{kategori}` | GET | Kategori icin varsayilan sablon (siralama + gorunurluk) |

#### 2.1.2 Lot Ozellik Degerleri CRUD

| Endpoint | Method | Aciklama |
|----------|--------|----------|
| `/api/v1/lotlar/{stokId}/ozellikler` | GET | Lota ait tum ozellik degerleri |
| `/api/v1/lotlar/{stokId}/ozellikler/{ozellikId}` | GET | Tek lot ozellik degeri |
| `/api/v1/lotlar/{stokId}/ozellikler` | POST | Lot icin ozellik degeri olustur (toplu: POST /toplu) |
| `/api/v1/lotlar/{stokId}/ozellikler/{ozellikId}` | PUT | Lot ozellik degerini guncelle |
| `/api/v1/lotlar/{stokId}/ozellikler/{ozellikId}` | DELETE | Lot ozellik degerini sil |
| `/api/v1/lotlar/{stokId}/ozellikler/toplu` | PUT | Birden fazla ozellik degerini toplu guncelle |

#### 2.1.3 Toplu Olusturma (Seed) Endpoint'i

| Endpoint | Method | Aciklama |
|----------|--------|----------|
| `/api/v1/ozellikler/kategori/{kategori}/seed` | POST | Kategori icin varsayilan ozellikleri olustur (idempotent) |

---

### 2.2 Kategori Bazli Varsayilan Ozelliklerin Olusturulmasi

#### 2.2.1 Varsayilan Ozellik Sablonlari

**MEYVE kategorisi:**
| Alan Adi | Goruntu Adi | Tip | Zorunlu | Etikette | Enum Degerleri |
|----------|-------------|-----|---------|---------|----------------|
| renk | Renk | ENUM | Hayir | Evet | ["Acik sarı", "Koyu amber", "Kristal beyaz", "Kahverengi", "Yesil"] |
| boyut | Boyut Grubu | ENUM | Evet | Evet | ["Buyuk (23+)", "Orta (20-23)", "Kucuk (18-20)", "Cok kucuk (<18)"] |
| nem_orani | Nem Orani (%) | SAYI | Hayir | Hayir | — |
| kurutma_sekli | Kurutma Sekli | ENUM | Evet | Evet | ["Gunes", "Jenerator", "Diger"] |
| fire_orani | Fire Orani (%) | SAYI | Hayir | Hayir | — |

**BAL kategorisi:**
| Alan Adi | Goruntu Adi | Tip | Zorunlu | Etikette | Enum Degerleri |
|----------|-------------|-----|---------|---------|----------------|
| renk | Renk | ENUM | Hayir | Evet | ["Acik sarı", "Koyu amber", "Kristal beyaz", "Kahverengi"] |
| kristalizasyon | Kristalizasyon | ENUM | Hayir | Evet | ["Kristalize", "Sivi", "Kremamsi"] |
| koken | Koken | METIN | Hayir | Evet | — |
| ph_degeri | pH Degeri | SAYI | Hayir | Hayir | — |
| nem_orani | Nem Orani (%) | SAYI | Hayir | Hayir | — |
| diastaz_sayisi | Diastaz Sayisi | SAYI | Hayir | Hayir | — |
| hmf_degeri | HMF Degeri | SAYI | Hayir | Hayir | — |

**KARSIM kategorisi:** Hem MEYVE hem BAL ozelliklerinin birlesimi.

**TUML (Tum Kategoriler):** Sistem genelinde gecerli ortak ozellikler (uretici, not, vb.).

#### 2.2.2 Seed Mekanizmasi Kurallari

1. **Idempotent** — ayni kategori icin seed tekrar cagrildiginda mevcut ozellikleri silmeden guncelleir
2. **Alan adi unique** — ayni kategoride ayni `alan_adi` ile birden fazla ozellik olamaz
3. **Seed sirasinda** — mevcut ozellikler `varsayilan_deger` ve `enum_degerleri` ile karsilastirilir, farkli olanlar guncelleir
4. **Silinmis ozellikler** — `silme_tarihi` olanlar seed'de aktive edilmez; yeni ozellik olarak eklenir
5. **Seed yetkisi** — sadece ADMIN rolune sahip kullanicilar cagirabilir

#### 2.2.3 Seed SQL / Migration Ornegi

```sql
-- Kategori bazli varsayilan ozellikler icin seed fonksiyonu
CREATE OR REPLACE FUNCTION fn_seed_kategori_ozellikler(p_kategori VARCHAR(20))
RETURNS VOID AS $$
DECLARE
    v_ozellik urun_ozellikleri%ROWTYPE;
BEGIN
    -- Mevcut ozellikler ile varsayilanlari karsilastir, eksik olanlari ekle
    IF p_kategori = 'MEYVE' THEN
        INSERT INTO urun_ozellikleri (kategori, alan_adi, goruntu_adi, tip, zorunlu, etikette_goster, etikette_zorunlu, siralama, enum_degerleri)
        SELECT 'MEYVE', 'renk', 'Renk', 'ENUM', FALSE, TRUE, FALSE, 1, '["Acik sarı","Koyu amber","Kristal beyaz","Kahverengi","Yesil"]'::JSONB
        WHERE NOT EXISTS (SELECT 1 FROM urun_ozellikleri WHERE kategori = 'MEYVE' AND alan_adi = 'renk' AND silme_tarihi IS NULL)
        ON CONFLICT (kategori, alan_adi) WHERE silme_tarihi IS NULL DO NOTHING;

        INSERT INTO urun_ozellikleri (kategori, alan_adi, goruntu_adi, tip, zorunlu, etikette_goster, etikette_zorunlu, siralama, enum_degerleri)
        SELECT 'MEYVE', 'boyut', 'Boyut Grubu', 'ENUM', TRUE, TRUE, TRUE, 2, '["Buyuk (23+)","Orta (20-23)","Kucuk (18-20)","Cok kucuk (<18)"]'::JSONB
        WHERE NOT EXISTS (SELECT 1 FROM urun_ozellikleri WHERE kategori = 'MEYVE' AND alan_adi = 'boyut' AND silme_tarihi IS NULL)
        ON CONFLICT (kategori, alan_adi) WHERE silme_tarihi IS NULL DO NOTHING;
        
        -- ... diger MEYVE ozellikleri
    ELSIF p_kategori = 'BAL' THEN
        -- BAL varsayilan ozellikleri
    END IF;
END;
$$ LANGUAGE plpgsql;
```

---

### 2.3 Lot Ozellikleri ↔ Urun Ozellikleri Iliskisi

#### 2.3.1 Iliski Yapisi

```
urun_ozellikleri (sablon/kalip)
    │
    │ 1:N — bir sablon birim ozellik (kalip)
    │
    v
lot_ozellikleri (o sablonun belirli bir lot icin doldurulmus degeri)
    │
    │ FK: stok_id → stok_karti.stok_id
    │ FK: ozellik_id → urun_ozellikleri.ozellik_id
    │
    v
stok_karti (lot)
```

**Iliski kurallari:**
- `lot_ozellikleri.ozellik_id`, ilgili `stok_karti.urun_id`'nin kategorisine uygun `urun_ozellikleri.kategori` ile eslesmeli
- Bir lotun `urun_id`'si MEYVE ise, o lot icin sadece `kategori=MEYVE` veya `kategori=TUML` olan ozellikler kullanilabilir
- `kategori=TUML` olan ozellikler her lot icin gecerlidir

#### 2.3.2 Lot Ozelligi Olusturma Kurallari

1. **Stok girisi sirasinda** — `stok_karti` olusturulurken, urunun kategorisine uygun varsayilan ozellikler `lot_ozellikleri` tablosuna on uyari ile eklenir
2. **Zorunlu ozellikler** — `urun_ozellikleri.zorunlu=TRUE` olanlar, lot kaydi tamamlanmadan once doldurulmali
3. **Enum validasyonu** — `tip=ENUM` olanlarda girilen deger, `enum_degerleri` listesinde olmali
4. **Sayi validasyonu** — `tip=SAYI` olanlarda deger sayisal olmali, birim belirtildi ise birim de saklanir
5. **Guncelleme izni** — sadece `guncellenebilir=TRUE` olan ozellikler sonradan degistirilebilir (bkz. Bolum 2.5)

#### 2.3.3 Lot Ozellikleri ile Urun Ozellikleri Uyum Kontrolu (Trigger)

```sql
CREATE OR REPLACE FUNCTION fn_lot_ozellik_kategori_kontrol()
RETURNS TRIGGER AS $$
DECLARE
    v_urun_kategori VARCHAR(20);
    v_ozellik_kategori VARCHAR(20);
BEGIN
    -- Ilgili lotun urun kategorisini al
    SELECT u.kategori INTO v_urun_kategori
    FROM stok_karti s
    JOIN urunler u ON s.urun_id = u.urun_id
    WHERE s.stok_id = NEW.stok_id;

    -- Ozelligin kategorisini al
    SELECT kategori INTO v_ozellik_kategori
    FROM urun_ozellikleri
    WHERE ozellik_id = NEW.ozellik_id;

    -- Uyumluluk kontrolu: TUML her yerde gecerli, digerleri eslesmeli
    IF v_ozellik_kategori != 'TUML' AND v_ozellik_kategori != v_urun_kategori THEN
        RAISE EXCEPTION 'Ozellik kategorisi (%) lotun urun kategorisi (%) ile uyumsuz', 
            v_ozellik_kategori, v_urun_kategori;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lot_ozellik_kategori_kontrol
BEFORE INSERT OR UPDATE ON lot_ozellikleri
FOR EACH ROW
EXECUTE FUNCTION fn_lot_ozellik_kategori_kontrol();
```

---

### 2.4 Etiket Alanlari ile Ozellik Sistemi Entegrasyonu

#### 2.4.1 Mevcut Tablo Yapisi

SRS Bolum 7.5.6'ya gore etiket sisteminin iki temel tablosu var:

**etiket_sablonlari** (sablon_id, ad, tur, aktif, etiket_boyut, barkod_format)

**etiket_alanlari** (alan_id, sablon_id, alan_tipi, goruntu_metni, deger, ozellik_id, zorunlu, varsayilan, konum_x, konum_y, boyut_en, boyut_boy, yaziboyut, siralama)

#### 2.4.2 Entegrasyon Noktasi: alan_tipi = 'OzelAlan'

`etiket_alanlari.ozellik_id` FK'si, `urun_ozellikleri.ozellik_id`'ye referans verir.

**Entegrasyon akisi:**

```
Etiket sablonu olusturulurken → "OzelAlan" tipinde alan ekle
    → "Hangi ozellik?" secimi yapilir (urun_ozellikleri listesinden)
    → Sadece etikette_goster=TRUE olan ozellikler listelenir
    → Secilen ozellik_id → etiket_alanlari.ozellik_id olarak kaydedilir

Etiket basilirken:
    1. Ilgili lotun stok_id'si bulunur
    2. lot_ozellikleri tablosundan bu lotun tum degerleri okunur
    3. etiket_alanlari'naki her OzelAlan icin:
       - lot_ozellikleri'nden ilgili deger bulunur (ozellik_id uzerinden)
       - Deger bulunamazsa → bos gosterilir (veya etikette_zorunlu kontrolu yapilir)
    4. Bulunan deger etiket sablonunda ilgili konuma yazdirilir
```

#### 2.4.3 Veri Cekme Sorgusu (View)

```sql
-- Lot ozelliklerini etiket sistemi icin normalize edilmis sekilde doner
CREATE OR REPLACE VIEW v_lot_ozellik_etiket AS
SELECT 
    lo.stok_id,
    lo.ozellik_id,
    uo.alan_adi,
    uo.goruntu_adi,
    uo.tip,
    lo.deger,
    lo.birim,
    uo.etikette_goster,
    uo.etikette_zorunlu,
    uo.enum_degerleri
FROM lot_ozellikleri lo
JOIN urun_ozellikleri uo ON lo.ozellik_id = uo.ozellik_id
WHERE uo.silme_tarihi IS NULL
  AND uo.etikette_goster = TRUE;
```

#### 2.4.4 Entegrasyon Kurallari

1. **Sadece gosterim icin isaretli ozellikler** (`etikette_goster=TRUE`) etiket sablonunda secilebilir
2. **Etikette zorunlu** (`etikette_zorunlu=TRUE`) olan ozellikler, etiket sablonuna eklendiginde bos birakilamaz — validasyon uyarir
3. **Sablon kopyalama** — bir sablonu baska bir sablona kopyalarken, `ozellik_id` referansi oldugu gibi tasinir
4. **Ozellik silme** — silinen ozellik_id'ye referans veren `etiket_alanlari` kayitlari `NULL` yapilir ve uyari loglanir
5. **Enum deger gosterimi** — etikette enum degerleri, `goruntu_adi` ile gosterilir (orn: boyut="Buyuk (23+)" sirada "Buyuk (23+)" basilir)

---

### 2.5 Ozellik Guncelleme Kurallari

#### 2.5.1 Urun Ozelligi Tanimini Guncelleme Kurallari

**Tanim (urun_ozellikleri)** guncellemelerinde dikkat edilecek hususlar:

| Alan | Sonradan Guncellenebilir Mi? | Kural |
|------|-------------------------------|-------|
| goruntu_adi | Evet | Form ve etiketlerde hemen yansir |
| tip | Hayir (kisitli) | Ilgili lotlarda veri varsa degistirilemez; bos ise degistirilebilir |
| enum_degerleri | Kosullu | Mevcut `deger` degerleri yeni listede yoksa, validasyon uyarisi verir |
| zorunlu | Kosullu | Mevcut lotlarda bos ise TRUE yapilabilir; dolu lot yoksa her zaman |
| etikette_goster | Evet | Sadece gorunurluk ayari |
| etikette_zorunlu | Kosullu | Etiket sablonlarinda kullanimda ise, once sablonlardan cikarilmasi gerekir |
| siralama | Evet | Form/etiket siralamasi degisir |
| varsayilan_deger | Evet | Sadece yeni lotlar icin gecerli |

**`tip` degistirme kosulu:**
```sql
-- Tip degisikligi kontrolu
SELECT COUNT(*) INTO v_lot_sayisi
FROM lot_ozellikleri
WHERE ozellik_id = p_ozellik_id AND deger IS NOT NULL;

IF v_lot_sayisi > 0 THEN
    -- Mevcut degerler var, tip degistirme riskli
    RAISE WARNING 'Bu ozellik % lotta kullanilmistir. Tip degisikligi veri kaybina yol acabilir.', v_lot_sayisi;
END IF;
```

#### 2.5.2 Lot Ozelligi Degerini Guncelleme Kurallari

**Lot ozellik degeri (lot_ozellikleri)** guncellemelerinde dikkat edilecek hususlar:

| Durum | Guncellenebilir Mi? | Aciklama |
|-------|---------------------|----------|
| Lot AKTIF, uretim tamamlanmis | **Hayir** | Uretim tamamlandiktan sonra analitik ozellikler (renk, boyut) kilitlenir |
| Lot AKTIF, uretim asamasinda | **Evet** | Uretim suresinde duzeltmeye izin verilir (kalite kontrol asamasinda) |
| Lot KALITE_KONTROL | **Evet** | Kalite kontrol onayi oncesi son duzeltme sansi |
| Lot BITTI/DEPO_DISI | **Hayir** | Tamamlanmis lot artik degistirilemez |
| Lot IPTAL/RET | **Hayir** | Iptal edilmis lotlar degistirilemez |
| Deger bos (NULL) | **Evet** | Eksik bilgi tamamlanabilir |

#### 2.5.3 Guncellenebilir Alan Listesi (Tabloya Eklenmeli)

`urun_ozellikleri` tablosuna asagidaki alan eklenmeli:

```sql
ALTER TABLE urun_ozellikleri ADD COLUMN guncellenebilir BOOLEAN NOT NULL DEFAULT TRUE;
COMMENT ON COLUMN urun_ozellikleri.guncellenebilir IS 'FALSE = sabitlenmis, sonradan degistirilemez (uretken analitik ozellikler icin)';
```

**Varsayilan deger:** Tum yeni ozellikler icin `guncellenebilir=TRUE`. Olusturulurken yonetici tarafindan `FALSE` yapilabilir (orn: `koken` gibi sabit urun bilgileri icin).

#### 2.5.4 Guncelleme API Yetki Kontrolu

```python
def lot_ozellik_guncelle(stok_id, ozellik_id, yeni_deger, kullanici_id):
    # 1. Lot durumunu kontrol et
    lot = get_stok_karti(stok_id)
    
    if lot.durum not in ('AKTIF', 'KALITE_KONTROL'):
        raise PermissionError(f"Lot durumu {lot.durum} — ozellik guncellemesine izin yok")
    
    # 2. Uretim tamamlanmis kontrolu
    if lot.uretim_tamamlandi and lot.durum == 'AKTIF':
        # AKTIF ama uretim tamamlanmis → guncellenebilir alan mi?
        ozellik = get_ozellik(ozellik_id)
        if not ozellik.guncellenebilir:
            raise PermissionError(f"Bu ozellik ({ozellik.goruntu_adi}) sabitlenmis, guncelleme yapilamaz")
    
    # 3. Yetki kontrolu (break-glass: yonetici override)
    kullanici = get_kullanici(kullanici_id)
    if not yetki_var_mi(kullanici, 'ozellik_guncelle'):
        # break-glass: sadece ADMIN bu kontrolu asabilir
        if kullanici.rol.ad != 'ADMIN':
            raise PermissionError("Bu islem icin yetkiniz yok")
    
    # 4. Degeri guncelle
    return update_lot_ozellik(stok_id, ozellik_id, yeni_deger)
```

---

## 3. YENI EKLENMESI GEREKEN VERITABANI ALANLARI

### 3.1 urun_ozellikleri Tablosuna Eklenecek Alan

```sql
-- urun_ozellikleri tablosuna (DB Design Bolum 3.1.5'e eklenecek)
ALTER TABLE urun_ozellikleri 
ADD COLUMN guncellenebilir BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN gorunurluk JSONB NOT NULL DEFAULT '["stok_listesi","stok_detay","uretim_form","satis_form","raporlar","etiket","dashboard"]'::JSONB;

COMMENT ON COLUMN urun_ozellikleri.gorunurluk IS 'Hangi ekranlarda gorunecegi: stok_listesi, stok_detay, uretim_form, satis_form, raporlar, etiket, dashboard';
COMMENT ON COLUMN urun_ozellikleri.guncellenebilir IS 'FALSE = sabitlenmis ozellik, lot olusturulduktan sonra degistirilemez';
```

### 3.2 etiket_alanlari Tablosuna Ek Alan (SRS Bolum 7.5.6)

```sql
-- etiket_alanlari tablosuna
ALTER TABLE etiket_alanlari 
ADD COLUMN deger_placeholder VARCHAR(255);  -- Deger okunamazsa gosterilecek yazi
```

---

## 4. API SERYALIZASYON ORNEKLERI

### 4.1 GET /api/v1/ozellikler/kategori/MEYVE

```json
{
  "kategori": "MEYVE",
  "ozellikler": [
    {
      "ozellik_id": "550e8400-e29b-41d4-a716-446655440001",
      "alan_adi": "renk",
      "goruntu_adi": "Renk",
      "tip": "ENUM",
      "zorunlu": false,
      "etikette_goster": true,
      "etikette_zorunlu": false,
      "siralama": 1,
      "varsayilan_deger": null,
      "enum_degerleri": ["Acik sarı","Koyu amber","Kristal beyaz","Kahverengi","Yesil"],
      "guncellenebilir": true,
      "gorunurluk": ["stok_detay","uretim_form","etiket"]
    }
  ]
}
```

### 4.2 POST /api/v1/lotlar/{stokId}/ozellikler (Toplu Olusturma)

```json
{
  "ozellikler": [
    {
      "ozellik_id": "550e8400-e29b-41d4-a716-446655440001",
      "deger": "Koyu amber",
      "birim": null
    },
    {
      "ozellik_id": "550e8400-e29b-41d4-a716-446655440002",
      "deger": "23.5",
      "birim": "%"
    }
  ]
}
```

---

## 5. ONEMLI TASARIM KARARLARI

### 5.1 Urun Ozellikleri vs Etiket Sablonu Iliskisi

- **urun_ozellikleri** = urun nitelik tanimlari (veritabani sablonu)
- **etiket_alanlari** = etiket uzerinde fiziksel yerlesim bilgisi (konum, boyut)
- Iliski: `etiket_alanlari.ozellik_id` → `urun_ozellikleri.ozellik_id`
- Bir `urun_ozellikleri` silindiginde `etiket_alanlari.ozellik_id` NULL yapilir (FK set null)
- Bir `urun_ozellikleri` silinmeden once, bu ozellige referans veren `etiket_alanlari` kayitlari yoneticiye uyari ile bildirilir

### 5.2 Deger Saklama Stratejisi

- `lot_ozellikleri.deger` her zaman `VARCHAR(255)` olarak saklanir
- `tip=SAYI` olanlarin degeri veritabaninda sayisal string olarak saklanir, uygulama katmaninda sayiya donusturulur
- `tip=BOOLEAN` olanlar: "true"/"false" string olarak saklanir
- `tip=TARIH` olanlar: ISO 8601 formatinda ("2026-07-29") saklanir
- Cevirim tablosu: `enum_degerleri` JSONB dizisi sadece valid secenekleri tanimlar, girilen degerleri saklamaz

### 5.3 Varsayilan Deger Mekanizmasi

1. Urun_ozellikleri.varsayilan_deger = formda ONceden doldurulmus deger
2. Lot olusturma sirasinda, varsayilan deger varsa `lot_ozellikleri.deger` olarak on eklenir
3. Kullanici varsayilani degistirebilir veya silebilir
4. Varsayilan degerler seed/meşguliyet ile otomatik doldurulmaz — sistem sadece formda onerir

---

## 6. TEST SENARYOLARI

| # | Senaryo | Beklenen Sonuc |
|---|---------|----------------|
| T1 | MEYVE kategorisi icin seed cagrildiginda | Tum varsayilan MEYVE ozellikleri olusur |
| T2 | Ayni seed tekrar cagrildiginda | Mevcut ozellikler guncellenir, yenileri eklenmez |
| T3 | BAL kategorisinde ENUM olmayan bir deger girildiginde | 400 bad request doner |
| T4 | MEYVE lotuna BAL kategorisinde ozellik eklenmek istendiginde | 400 + kategori uyumsuzluk hatasi |
| T5 | Tamamlanmis lotta guncellenebilir=FALSE olan ozellik degistirilmek istendiginde | 403 forbidden doner |
| T6 | ADMIN rolusekli bu engeli asabilir mi? | Evet, break-glass yetkisi ile izinli |
| T7 | Etiket sablonu olustururken OzelAlan secildiginde | Sadece etikette_goster=TRUE olanlar listelenir |
| T8 | Etiket basilirken lotta eksik zorunlu alan varsa | Uyari mesaji ile uyarilir ama yazdirima devam edilir |
| T9 | Bir urun ozelligi silindiginde iliskili etiket_alanlari | ozellik_id NULL yapilir, loglanir |

---

## 7. IMPLEMENTASYON ONCELIK SIRASI

1. **Faz 1:** `urun_ozellikleri` tablosuna `guncellenebilir` ve `gorunurluk` alanlari eklenir (migration)
2. **Faz 2:** `fn_lot_ozellik_kategori_kontrol` trigger'i olusturulur
3. **Faz 3:** Seed fonksiyonu ve API endpoint'i (`POST /kategori/{kategori}/seed`) implement edilir
4. **Faz 4:** Temel CRUD API endpoint'leri (`/ozellikler` ve `/lotlar/{stokId}/ozellikler`) implement edilir
5. **Faz 5:** Entegrasyon: etiket sistemi — `v_lot_ozellik_etiket` view olusturulur, etiket basilirken lot ozellikleri cekilir
6. **Faz 6:** Guncelleme kurallari — durum bazli yetki kontrolu ve break-glass mekanizmasi

---

## 8. MEVCUT DOKUMAN GUNCELLEME NOTLARI

**DB-Design-Kurutulmus-Meyve-Bal-ERP.md:**
- Bolum 3.1.5 (`urun_ozellikleri` tablosu): `guncellenebilir` ve `gorunurluk` alanlari eklenecek
- Belge: `goruntu_adi` yazim hatasi duzeltilecek → `goruntu_adi` (SRS'de `goruntu_adı` olarak gecer, DB'de `goruntu_adi` — tutarlilik icin `goruntu_adi` standart olsun)

**SRS-Kurutulmus-Meyve-Bal-ERP.md:**
- Bolum 3.2.4 (`lot_ozellikleri`): `lot_id` alani yerine `stok_id` kullanilacak (DB design ile tutarli)
- Bolum 7.5.6: `ozellik_id` FK'sinin urun_ozellikleri ile iliskisi dokumante edilecek
