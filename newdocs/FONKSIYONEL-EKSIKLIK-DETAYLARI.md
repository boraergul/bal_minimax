# FONKSİYONEL EKSİKLİK DETAYLARI
## Kurutulmuş Meyve ve Bal Yönetim Sistemi - Kritik Boşluk Analizi

**Versiyon:** 1.0  
**Tarih:** 2026-07-29  
**Durum:** Analiz - Düzeltme Gerekiyor

---

## 1. FIFO (First In First Out) Zorunluluk Eksikliği

### 1.1 Mevcut Durum

SRS dokümanında FIFO tanımlanmış:
- `stok_hareketleri` tablosunda lot bazlı işlem
- `/api/v1/stok/fifo-tavsiye/{urun_id}` endpoint'i mevcut
- `fifo_ihlal_edildi` ve `fifo_ihlal_nedeni` alanları var

**Problem:** Satış API'si FIFO önerisi döndürür AMA kullanıcı bu öneriyi **göz ardı edebilir**.

### 1.2 Sorun Açıklaması

```
Mevcut Akış (Sorunlu):
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Satış      │ ──▶ │  FIFO        │ ──▶ │  Kullanıcı  │
│  Oluştur    │     │  Tavsiyesi   │     │  İstediğini  │
└─────────────┘     └──────────────┘     │  Seçebilir   │
                                         └─────────────┘
                                              │
                                              ▼
                                         FIFO İHLALİ
```

**Örnek Senaryo:**
1. Ürün X: Lot-A (eski, SKT: 30 gün), Lot-B (yeni, SKT: 60 gün)
2. Satış oluşturulurken FIFO tavsiyesi Lot-A önerir
3. Kullanıcı Lot-B seçer (yanlışlıkla veya kasıtlı)
4. Lot-A fire/çöp olarak ayrılır
5. **Sorun:** Lot-A daha sonra başka bir ürüne karışabilir (izlenebilirlik bozulur)

### 1.3 Riskler

| Risk | Açıklama | Öncelik |
|------|----------|---------|
| **Gıda Güvenliği** | SKT'si geçen ürün satılabilir | 🔴 Kritik |
| **İzlenebilirlik** | Lot zinciri kopar, hammadde kaynağı bulunamaz | 🔴 Kritik |
| **Mevzuat** | Gıda yönetmeliği ihlali (Türkiye Gıda Kodeksi) | 🔴 Kritik |
| **Mali Kayıp** | Fire/çöp artışı, ürün değer kaybı | 🟡 Yüksek |

### 1.4 Çözüm Önerileri

#### Seçenek A: Tam Zorunlu FIFO (Önerilen)
```
Akış:
1. Satış kaydı oluştur
2. Sistem otomatik olarak en eski lot'u seçer
3. Kullanıcı onaylar
4. Lot değişikliği MÜMKÜN DEĞİL veya ayrı onay gerektirir
```

**API Değişikliği:**
```
POST /api/v1/satis
{
  "musteri_id": "xxx",
  "urunler": [
    {
      "urun_id": "yyy",
      "lot_no": "AUTO-FIFO",  // ← Sistem otomatik seçer
      "miktar": 100
    }
  ]
}

Response:
{
  "onay_bekleyen": false,  // ← FIFO otomatik uygulandı
  "lot_bilgisi": {
    "lot_no": "LOT-2026-001",
    "son_kullanma": "2026-08-15",
    "girilen_tarih": "2026-07-01"
  }
}
```

#### Seçenek B: Onay Gerektiren Manuel Seçim
```
Akış:
1. Satış kaydı oluştur
2. FIFO önerisi gösterilir
3. Kullanıcı farklı lot seçerse → YÖNETİCİ ONAYI GEREKİR
4. Onay vermez ise FIFO lot kullanılır
```

**Yeni Tablo:**
```sql
CREATE TABLE fifo_ihlal_onay (
    onay_id UUID PRIMARY KEY,
    satis_id UUID REFERENCES satis_kaydi,
    önerilen_lot_no VARCHAR(50),
    secilen_lot_no VARCHAR(50),
    talep_eden_kullanici_id UUID,
    onay_durumu ENUM('BEKLIYOR','ONAYLANDI','REDDEDILDI'),
    onay_leyen_kullanici_id UUID,
    onay_tarihi TIMESTAMP,
    ihlal_nedeni TEXT
);
```

#### Seçenek C: Sadece Uyarı (En Zayıf)
```
Akış:
1. Satış kaydı oluştur
2. FIFO dışı lot seçilirse → UYARI göster
3. Kullanıcı "Anladım" derse işlem devam eder
4. Log'da kayıt edilir
```

### 1.5 Önerilen API Endpoint'leri

```yaml
# FIFO Tavsiyesi (Mevcut - Güçlendirilmeli)
GET /api/v1/stok/fifo-tavsiye/{urun_id}
  Query: ?miktar=100
  Response: 
    - önerilen_lot_no
    - tüm_lotlar (sıralı liste)
    - ihlal_riski: boolean

# FIFO İhlal Talebi (YENİ)
POST /api/v1/stok/fifo-ihlal-talep
  Body: {
    "urun_id": "xxx",
    "secilen_lot_no": "yyy",
    "neden": "Müşteri özel isteği"
  }
  Response: {
    "onay_gerekli": true,
    "onay_durumu": "BEKLIYOR"
  }

# FIFO İhlal Onayı (YENİ)
POST /api/v1/stok/fifo-ihlal-onay/{onay_id}
  Body: {
    "onaylandi": true/false,
    "aciklama": "..."
  }
```

### 1.6 SRS'de Yapılması Gereken Güncelleme

**Bölüm 3.6.1 Satış Kaydı'na eklenmeli:**
```
"FIFO Kuralları:
- Satış işlemlerinde lot seçimi otomatik olarak FIFO prensibine göre yapılır
- Manuel lot seçimi ancak yönetici onayı ile mümkündür
- FIFO ihlalleri denetim günlüğüne kaydedilir
- İhlal nedeni zorunlu olarak kaydedilir"
```

---

## 2. Kalite Kontrol Workflow Eksikliği

### 2.1 Mevcut Durum

DB Tasarımında mevcut:
- `stok_karti.kalite_kontrol_edildi` (boolean)
- `stok_karti.kalite_kontrol_tarihi` (timestamp)
- `stok_karti.kalite_notu` (text)
- `uretim_emri.kalite_kontrol_onayi` (boolean)
- `uretim_emri.kalite_kontrol_eden_id` (UUID)

**Problem:** Alanlar var AMA nasıl kullanılacağı, hangi adımların izleneceği tanımlanmamış.

### 2.2 Eksik Olan Süreç

```
OLMASI GEREKEN KALİTE KONTROL AKIŞI:
┌────────────────┐
│ Stok Girişi     │
│ (Mal Kabul)    │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Kalite Kontrol │──── Eğer Reddedilirse ────▶ Stok "RET" durumuna geçer
│ Formu Doldur   │                                      │
└───────┬────────┘                                      │
        │                                               ▼
        │                                        ┌────────────────┐
        ▼                                        │ İade/Tüketim   │
┌────────────────┐                               │ /İmha Kararı   │
│ Kritik Mi?     │──── Hayır ───▶ "Kabul" ────▶ Stok AKTIF       │
└───────┬────────┘                               └────────────────┘
        │
        │ Evet
        ▼
┌────────────────┐
│ Yönetici Onay  │
│ Gerekiyor mu?  │
└───────┬────────┘
        │
        ├── Hayır ──▶ Otomatik Onay ──▶ Stok AKTIF
        │
        └── Evet ──▶ Onay Bekliyor ──▶ Yönetici Onay/Red
```

### 2.3 Kalite Kontrol Formu İçeriği (Eksik)

**Gerekli Alanlar:**
| Alan | Tip | Açıklama |
|------|-----|----------|
| kontrol_id | UUID | Benzersiz tanımlayıcı |
| stok_id | UUID | Hangi stok kartı |
| kontrol_tarihi | TIMESTAMP | Kontrol zamanı |
| kontrol_eden_id | UUID | Kim kontrol etti |
| durum | ENUM('BEKLIYOR','KABUL','RET','KISMEN_KABUL') | Sonuç |
| ret_nedeni | TEXT | Ret ise neden |
| ret_kriteri | TEXT | Ret kriterleri listesi |

**Fiziksel Kontrol:**
| Alan | Tip | Açıklama |
|------|-----|----------|
| gorsel_kontrol | BOOLEAN | Görsel olarak uygun mu? |
| ambalaj_durumu | ENUM('IYI','ORTA','ZAYIF') | Ambalaj durumu |
| etiket_okunakli | BOOLEAN | Etiket okunabilir mi? |
| son_kullanma_tarihi | DATE | SKT uygun mu? |

**Laboratuvar Kontrolü (Gıda için):**
| Alan | Tip | Açıklama |
|------|-----|----------|
| nem_orani | DECIMAL(5,2) | Nem oranı (%) |
| tuzluluk_orani | DECIMAL(5,2) | Tuz oranı (%) |
| seker_orani | DECIMAL(5,2) | Şeker oranı (%) |
| aside_degeri | DECIMAL(5,2) | Asidite (pH) |

### 2.4 Ret Kriterleri (Eksik - Örnek)

```
RET EDİLMELİ EĞER:
☐ Son kullanma tarihi geçmiş
☐ Ambalaj açık veya hasarlı
☐ Nem oranı > %15 (kurutulmuş meyve için)
☐ Böcek, larva veya yabancı madde görüldü
☐ Küf veya mantar izi
☐ Kimyasal koku veya tat
☐ Etiket bilgileri eksik veya okunaklı değil
```

### 2.5 Önerilen API Endpoint'leri

```yaml
# Kalite Kontrol Oluştur (Stok girişi sonrası)
POST /api/v1/kalite-kontrol
  Body: {
    "stok_id": "xxx",
    "kontrol_turu": "MAL_KABUL",
    "kontrol_tarihi": "2026-07-29T10:00:00Z",
    "fiziksel_kontrol": {
      "gorsel_kontrol": true,
      "ambalaj_durumu": "IYI",
      "etiket_okunakli": true,
      "son_kullanma_tarihi": "2026-12-31"
    },
    "laboratuvar_sonuclari": {
      "nem_orani": 12.5,
      "tuzluluk_orani": 3.2
    },
    "not": "İlk parti kontrolü"
  }

# Kalite Kontrol Onayla/Reddet
POST /api/v1/kalite-kontrol/{kontrol_id}/sonuc
  Body: {
    "durum": "KABUL",  # KABUL | RET | KISMEN_KABUL
    "ret_nedeni": null,  # Ret ise zorunlu
    "kalite_notu": "Tüm kontroller başarılı"
  }

# Kalite Kontrol Listesi (Bekleyen)
GET /api/v1/kalite-kontrol/bekleyen
  Query: ?tarih=2026-07-29
  Response: [lista bekleyen kontroller]

# Kalite Kontrol Detay
GET /api/v1/kalite-kontrol/{kontrol_id}
  Response: kalite kontrol detayları
```

### 2.6 Yeni Veritabanı Tablosu (Eksik)

```sql
CREATE TABLE kalite_kontrol (
    kalite_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stok_id UUID NOT NULL REFERENCES stok_karti(stok_id),
    uretim_id UUID REFERENCES uretim_emri(uretim_id),  -- Üretim ise
    kontrol_turu ENUM('MAL_KABUL', 'URETIM', 'SEVK', 'RAFSURE') NOT NULL,
    kontrol_eden_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    kontrol_tarihi TIMESTAMP NOT NULL DEFAULT NOW(),
    durum ENUM('BEKLIYOR', 'KABUL', 'RET', 'KISMEN_KABUL') DEFAULT 'BEKLIYOR',
    ret_nedeni TEXT,
    ret_kriterleri JSONB,  -- ["SKT_GECMIS", "AMBAALAJ_HASAR", ...]
    
    -- Fiziksel Kontrol
    gorsel_kontrol BOOLEAN,
    ambalaj_durumu ENUM('IYI', 'ORTA', 'ZAYIF'),
    etiket_okunakli BOOLEAN,
    son_kullanma_tarihi DATE,
    
    -- Laboratuvar
    laboratuvar_sonuclari JSONB,  -- {"nem_orani": 12.5, "tuzluluk": 3.2}
    
    -- Sonuç
    sonuc_aciklamasi TEXT,
    onay_durumu ENUM('OTOMATIK', 'YONETICI_ONAYI') DEFAULT 'OTOMATIK',
    onay_leyen_id UUID REFERENCES kullanicilar(kullanici_id),
    onay_tarihi TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_kalite_kontrol_stok ON kalite_kontrol(stok_id);
CREATE INDEX idx_kalite_kontrol_durum ON kalite_kontrol(durum);
CREATE INDEX idx_kalite_kontrol_tarih ON kalite_kontrol(kontrol_tarihi);

-- Trigger: Ret durumunda stok kartını güncelle
CREATE OR REPLACE FUNCTION trg_kalite_kontrol_ret()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.durum = 'RET' THEN
        UPDATE stok_karti 
        SET durum = 'RET', 
            guncelleme_tarihi = NOW()
        WHERE stok_id = NEW.stok_id;
    ELSIF NEW.durum = 'KABUL' THEN
        UPDATE stok_karti 
        SET durum = 'AKTIF',
            kalite_kontrol_edildi = TRUE,
            kalite_kontrol_tarihi = NOW(),
            guncelleme_tarihi = NOW()
        WHERE stok_id = NEW.stok_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kalite_kontrol_ret
AFTER UPDATE ON kalite_kontrol
FOR EACH ROW
EXECUTE FUNCTION trg_kalite_kontrol_ret();
```

### 2.7 SRS'de Yapılması Gereken Güncelleme

**Yeni Bölüm eklenmeli (örneğin 3.4.5 Kalite Kontrol):**
```
### 3.4.5 Kalite Kontrol Süreci

**Tetikleyici:**
- Stok girişi (mal kabul) sonrası otomatik
- Üretim tamamlandığında
- Sevk öncesi (opsiyonel)

**Kontrol Adımları:**
1. Fiziksel kontrol (görsel, ambalaj, etiket)
2. Laboratuvar kontrolü (gerekirse)
3. Sonuç değerlendirme
4. Onay/Ret kararı

**Ret Durumunda:**
- Stok kartı "RET" durumuna geçer
- İlgili kişiye bildirim
- İmha veya iade kararı beklenir

**Onay Gerektiren Durumlar:**
- Kalite kontrol sonucu KISMEN KABUL ise
- Ret oranı > %10 ise
- Gıda güvenliği riski varsa
```

---

## 3. Üretim Maliyet Hesaplama Formülü Eksikliği

### 3.1 Mevcut Durum

`uretim_emri` tablosunda `toplam_maliyet` alanı var.
SRS'de: "Toplam üretim maliyeti" yazıyor.

**Problem:** Hesaplama formülü, hangi maliyet unsurlarının dahil edildiği belirsiz.

### 3.2 Maliyet Unsurları

```
TOPLAM ÜRETİM MALİYETİ = Hammadde Maliyeti + İşçilik Maliyeti + Enerji/Aidat + Fire Maliyeti + Genel Gider Payı
```

#### 3.2.1 Hammadde Maliyeti

```python
hammadde_maliyeti = Σ (kullanılan_hammadde_miktari × birim_fiyat)

# Örnek:
hammadde_maliyeti = 
    (10 kg kayısı × 85 TL/kg) +      # 850 TL
    (0.5 kg şeker × 25 TL/kg) +       # 12.5 TL
    (0.1 kg limon tuzu × 40 TL/kg)   # 4 TL
    = 866.5 TL
```

**Eksik:** Hammadde lot bazlı maliyet takibi yapılmalı mı? (FIFO ile gelen lot'ların ortalama maliyeti mi?)

#### 3.2.2 İşçilik Maliyeti

```python
iscilik_maliyeti = uretim_suresi_saat × saatlik_iscilik_bedeli

# Örnek:
iscilik_maliyeti = 4 saat × 150 TL/saat = 600 TL

# VEYA (parça başı)
iscilik_maliyeti = uretilen_miktar_kg × birim_iscilik_bedeli
iscilik_maliyeti = 100 kg × 6 TL/kg = 600 TL
```

**Eksik:** 
- İşçilik saat nasıl takip edilecek? (elle giriş mi, otomatik mi?)
- İşçilik birim fiyatı nereden alınacak?

#### 3.2.3 Enerji/Aidat Maliyeti

```python
enerji_maliyeti = kurutma_suresi_saat × enerji_birimi_fiyati

# Örnek (kurutma makinesi):
enerji_maliyeti = 8 saat × 50 TL/saat = 400 TL

# Alternatif (üretim miktarına göre):
enerji_maliyeti = uretilen_miktar_kg × birim_enerji_maliyeti
enerji_maliyeti = 100 kg × 4 TL/kg = 400 TL
```

**Eksik:** Enerji tüketimi lot bazlı mı takip edilecek?

#### 3.2.4 Fire Maliyeti

```python
fire_maliyeti = fire_miktari_kg × birim_hammadde_maliyeti

# Örnek:
fire_maliyeti = 5 kg × (866.5 TL / 100 kg) = 43.33 TL

# VEYA
fire_orani = (fire_miktari / toplam_hammadde) × 100
fire_orani = (5 / 105) × 100 = 4.76%
```

**Önemli:** Fire oranı planlanan ile gerçekleşen arasında fark varsa:
- Planlanan fire: 3%
- Gerçekleşen fire: 5%
- **Fark = Ek Maliyet** → Üretim emri maliyetine eklenir

#### 3.2.5 Genel Gider Payı (GHP)

```python
# Aylık genel giderler:
genel_giderler = kira + personel_salary + enerji + bakim + diger

# Üretim miktarına göre dağıtım:
ghp_orani = genel_giderler / toplam_uretim_miktari
birim_ghp = ghp_orani × uretilen_miktar

# Örnek:
ghp = 50,000 TL / 10,000 kg = 5 TL/kg
birim_ghp = 5 TL/kg × 100 kg = 500 TL
```

### 3.3 Tam Maliyet Hesaplama Formülü

```python
def hesapla_uretim_maliyeti(uretim_id):
    """
    Üretim emri maliyetini hesaplar
    """
    # 1. Hammadde Maliyeti
    hammadde = db.query("""
        SELECT SUM(hm.miktar * hm.birim_fiyat) as toplam
        FROM uretim_detay hd
        JOIN hammadde_stok hs ON hd.hammadde_lot_no = hs.lot_no
        WHERE hd.uretim_id = %s
    """, uretim_id)
    
    # 2. İşçilik Maliyeti
    iscilik = db.query("""
        SELECT SUM(sure_saat * saatlik_ucret) as toplam
        FROM iscilik_kayit
        WHERE uretim_id = %s
    """, uretim_id)
    
    # 3. Enerji Maliyeti
    enerji = db.query("""
        SELECT SUM(tuketim_kw * birim_fiyat) as toplam
        FROM enerji_kayit
        WHERE uretim_id = %s
    """, uretim_id)
    
    # 4. Fire Maliyeti
    fire = db.query("""
        SELECT fire_miktari, birim_maliyet
        FROM uretim_emri
        WHERE uretim_id = %s
    """, uretim_id)
    fire_maliyeti = fire.fire_miktari * fire.birim_maliyet
    
    # 5. Planlanan vs Gerçekleşen Fire Farkı
    fire_farki = (fire.gerceklesen_fire - fire.planlanan_fire) * fire.birim_maliyet
    
    # 6. Genel Gider Payı
    aylik_uretim = db.query("SELECT SUM(miktar) FROM uretim_emri WHERE DATE_TRUNC('month', tarih) = %s", ay)
    ghp = toplam_genel_gider / aylik_uretim * mevcut_uretim_miktari
    
    # TOPLAM
    toplam = hammadde + iscilik + enerji + fire_maliyeti + abs(fire_farki) + ghp
    
    return {
        "hammadde_maliyeti": hammadde,
        "iscilik_maliyeti": iscilik,
        "enerji_maliyeti": enerji,
        "fire_maliyeti": fire_maliyeti,
        "fire_farki": fire_farki,
        "genel_gider_payi": ghp,
        "toplam_maliyet": toplam,
        "birim_maliyet_kg": toplam / uretim_miktari
    }
```

### 3.4 Birim Maliyet Hesaplama

```python
# Ürün bazlı birim maliyet
birim_maliyet = toplam_maliyet / uretilen_miktar_net

# Örnek:
toplam_maliyet = 2500 TL
uretilen_miktar = 95 kg (5 kg fire sonrası)
birim_maliyet = 2500 / 95 = 26.32 TL/kg
```

### 3.5 Kar/Zarar Hesaplama

```python
# Satış kar/zarar
satis_miktari = 90 kg
satis_fiyati = 35 TL/kg
satis_geliri = 3150 TL

satis_kari = satis_geliri - (satis_miktari * birim_maliyet)
satis_kari = 3150 - (90 × 26.32) = 3150 - 2368.8 = 781.2 TL

kar_orani = (781.2 / 2368.8) × 100 = 32.98%
```

### 3.6 Yeni Veritabanı Tabloları

```sql
-- Üretim Maliyet Detay (her üretim için maliyet dökümü)
CREATE TABLE uretim_maliyet (
    maliyet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uretim_id UUID NOT NULL REFERENCES uretim_emri(uretim_id),
    maliyet_turu ENUM('HAMMADDE', 'ISCILIK', 'ENERJI', 'FIRE', 'DIGER') NOT NULL,
    miktar DECIMAL(15,4),  -- işçiliksa saat, enerjiyse kW, hammaddeyse kg
    birim_fiyat DECIMAL(15,4),
    toplam_tutar DECIMAL(15,4) NOT NULL,
    not TEXT,
    olusturma_tarihi TIMESTAMP DEFAULT NOW()
);

-- Genel Gider Tanımı (aylık)
CREATE TABLE genel_gider (
    gider_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ay DATE NOT NULL,  -- Ay bazlı
    gider_turu VARCHAR(100) NOT NULL,  -- KIRA, PERSONEL, ENERJI, BAKIM, DIGER
    aciklama TEXT,
    tutar DECIMAL(15,4) NOT NULL,
    olusturan_id UUID REFERENCES kullanicilar(kullanici_id),
    olusturma_tarihi TIMESTAMP DEFAULT NOW()
);

-- Birim Fiyat Tanımları (işçilik, enerji birim fiyatları)
CREATE TABLE birim_fiyat (
    fiyat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fiyat_turu VARCHAR(50) NOT NULL,  -- ISCILIK_SAAT, ENERJI_KW, ...
    birim VARCHAR(20) NOT NULL,  -- saat, kW, kg
    fiyat DECIMAL(15,4) NOT NULL,
    gecerlilik_baslangic DATE NOT NULL,
    gecerlilik_bitis DATE,
    aktif BOOLEAN DEFAULT TRUE,
    guncelleme_tarihi TIMESTAMP DEFAULT NOW()
);
```

### 3.7 Önerilen API Endpoint'leri

```yaml
# Maliyet Hesapla (idempotent iç servis; üretim tamamlama transaction'ı tarafından çağrılır)
POST /api/v1/uretim/{uretim_id}/maliyet-hesapla
  Response: {
    "hammadde_maliyeti": 866.50,
    "iscilik_maliyeti": 600.00,
    "enerji_maliyeti": 400.00,
    "fire_maliyeti": 43.33,
    "fire_farki": 0,
    "genel_gider_payi": 500.00,
    "toplam_maliyet": 2409.83,
    "birim_maliyet_kg": 26.78,
    "kar_orani_tahmini": 28.5
  }

# Maliyet Detay
GET /api/v1/uretim/{uretim_id}/maliyet
  Response: maliyet kalemleri listesi

# Birim Fiyat Güncelle
PUT /api/v1/birim-fiyat/{fiyat_id}
  Body: {
    "fiyat": 160.00,  # TL/saat
    "gecerlilik_bitis": "2026-08-31"
  }

# Genel Gider Ekle
POST /api/v1/genel-gider
  Body: {
    "ay": "2026-07",
    "gider_turu": "ENERJI",
    "aciklama": "Temmuz elektrik tüketim gideri",
    "tutar": 8500.00
  }

# Maliyet Raporu
GET /api/v1/rapor/uretim-maliyet
  Query: ?baslangic=2026-07-01&bitis=2026-07-31&urun_id=xxx
  Response: aylık üretim maliyetleri raporu
```

### 3.8 SRS'de Yapılması Gereken Güncelleme

**Bölüm 3.5 Üretim Yönetimi'ne yeni alt bölüm eklenmeli:**

```
### 3.5.4 Üretim Maliyet Hesaplama

#### 3.5.4.1 Maliyet Unsurları
| Unsurlar | Açıklama |
|----------|----------|
| Hammadde | Kullanılan hammadde × birim fiyat |
| İşçilik | Üretim süresi × saatlik bedel |
| Enerji | Tüketim × birim fiyat |
| Fire | Fire miktarı × birim maliyet |
| Genel Gider | Aylık giderler ÷ toplam üretim |

#### 3.5.4.2 Hesaplama Formülü
```
Toplam Maliyet = Hammadde + İşçilik + Enerji + Fire + Genel Gider Payı
Birim Maliyet = Toplam Maliyet ÷ Net Üretim Miktarı
```

#### 3.5.4.3 Maliyet Takip Tablosu
| Alan | Tip | Açıklama |
|------|-----|----------|
| maliyet_id | UUID | Benzersiz tanımlayıcı |
| uretim_id | UUID | Üretim emri referansı |
| maliyet_turu | Enum | Hammadde/İşçilik/Enerji/Fire/Diğer |
| miktar | Decimal | Tüketilen miktar |
| birim_fiyat | Decimal | Birim fiyat |
| toplam_tutar | Decimal | Toplam tutar |

#### 3.5.4.4 Fire Yönetimi
- Planlanan fire oranı üretim emrinde tanımlanır
- Gerçekleşen fire oranı üretim tamamında kaydedilir
- Fark pozitif ise ek maliyet olarak kaydedilir
- Fire oranı > %10 ise yönetici onayı gerekir
```

---

## 4. Öncelik Sıralaması

| # | Eksiklik | Öncelik | Tahmini Düzeltme Süresi |
|---|----------|---------|------------------------|
| 1 | FIFO Zorunluluk | 🔴 Kritik | 1 gün (API + DB) |
| 2 | Kalite Kontrol Workflow | 🔴 Kritik | 2-3 gün (API + DB + UI) |
| 3 | Maliyet Hesaplama | 🟡 Yüksek | 2 gün (API + DB) |

---

## 5. Sonraki Adımlar

1. [ ] FIFO zorunlu akış kararı (Seçenek A/B/C?)
2. [ ] Kalite kontrol form alanlarını onayla
3. [ ] Maliyet hesaplama formülünü onayla
4. [ ] SRS dokümanını güncelle
5. [ ] DB Design'a yeni tabloları ekle
6. [ ] API endpoint'lerini tasarla

---

**Hazırlayan:** Hermes Agent  
**Tarih:** 2026-07-29
