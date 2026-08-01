# Güncelleme Notları - 29 Temmuz 2026

## 🆕 Yeni Özellikler

### 1. Lot İzlenebilirlik Sistemi

**Amaç:** Mamül ürünlerden ham madde lot'una ve tedarikçiye kadar takip edilebilirlik.

**Önceki Durum:**
- Mamül lot'u ham madde lot'una bağlanmıyordu
- `kaynak_stok_id` her zaman `NULL` idi

**Yeni Durum:**
- Üretim tamamlandığında `kaynak_stok_id` otomatik olarak ayarlanıyor
- `tedarikci_id` ham maddeden miras alınıyor
- İzlenebilirlik sayfasında görsel zincir gösterimi

**Dosyalar:**
- `src/backend/app/api/uretim.py` - Üretim tamamlama mantığı güncellendi
- `src/frontend/src/pages/IzlenebilirlikPage.tsx` - Görsel izlenebilirlik zinciri

**API Endpoint:**
```
GET /api/v1/raporlar/izlenebilirlik/lot/{lot_no}
```

**Örnek Akış:**
```
MAM-20260729-001 (Mamül Lot)
    ↓ kaynak_stok_id
LOT-20260729-003 (Ham Madde Lot)
    ↓ tedarikci_id
Malatya Kayısı Tesisi (Tedarikçi)
```

---

### 2. Otomatik Stok Kodu Üretici

**Amaç:** Tutarlı ve anlamlı stok kodları oluşturmak.

**Kod Formatı:**
```
{KATEGORİ}-{ÜRÜN_KISALTMASI}-{BOYUT}

Örnekler:
  BAL-CIC-500G    → Çiçek Balı, 500g
  BAL-KEK-1KG     → Kekik Balı, 1kg
  MEYVE-KAY-1KG   → Kayısı, 1kg
  MEYVE-INC-500G  → İncir, 500g
```

**Dosyalar:**
- `src/frontend/src/lib/utils.ts` - `generateStokKodu()` fonksiyonu eklendi
- `src/frontend/src/pages/UrunlerPage.tsx` - "Kod Üret" butonu ve önizleme

**Özellikler:**
- Kategori prefix'i: MEYVE→MEY, BAL→BAL, vs.
- Ürün ismi kısaltması: Çiçek→CIC, Kekik→KEK, vs.
- Türkçe karakter dönüşümü: ç→C, ş→S, ğ→G, vs.
- Canlı önizleme

---

### 3. Mamül ↔ Ham Madde Bağlantısı

**Amaç:** Mamül ürünlerin hangi ham maddeden üretildiğini açıkça belirtmek.

**Önceki Durum:**
- Mamül ürünlerin MAMUL kategorisi stok koduna yansıyordu
- Hangi ham maddeden yapıldığı belli değildi

**Yeni Durum:**
- Mamül ürünlere `hammadde_id` alanı eklendi
- Stok kodu üretilirken ham madde kategorisi kullanılıyor
- Tablo görünümünde ham madde bilgisi gösteriliyor

**Dosyalar:**
- `src/backend/app/models/urun.py` - `hammadde_id` FK alanı eklendi
- `src/backend/app/api/urunler.py` - CRUD ve yeni endpoint'ler
- `src/frontend/src/types/index.ts` - Type tanımları güncellendi
- `src/frontend/src/pages/UrunlerPage.tsx` - Ham madde dropdown

**Yeni Endpoint:**
```
GET /api/v1/urunler/hammaddeler/liste
```
(Ham madde dropdown'u için MAMUL olmayan ürünleri döndürür)

**Veritabanı:**
```sql
ALTER TABLE urunler ADD COLUMN hammadde_id UUID REFERENCES urunler(id);
```

---

## 🔧 Bug Düzeltmeleri

### 1. Üretim Tamamlama Decimal Hatası
**Sorun:** `float - Decimal` operasyon hatası
**Çözüm:** Tüm değerler `float()` ile dönüştürüldü (`uretim.py:248-270`)

### 2. Üretim Oluşturma Validation Hatası
**Sorun:** `gerceklesen_miktar` alanı eksikti
**Çözüm:** `UretimResponse`'a `gerceklesen_miktar = None` eklendi (`uretim.py:196`)

### 3. Stok Giriş Endpoint'i
**Sorun:** Yanlış endpoint kullanılıyordu
**Çözüm:** `/stok/giris` doğru endpoint olarak kullanıldı

---

## 📋 Kullanım Senaryoları

### Senaryo 1: Yeni Mamül Ürün Oluşturma

1. **Ürünler** sayfasına git
2. **Yeni Ürün** butonuna tıkla
3. Ürün adı gir: "İncir Paketi 500g"
4. Kategori: **MAMUL** seç
5. **Ham Madde** dropdown görünür → "Kuru İncir" seç
6. **Paket Boyutu**: "500g" seç
7. **Kod Üret** butonuna tıkla
8. Sonuç: `MEY-INC-500G`
9. **Kaydet**

### Senaryo 2: Üretim ve İzlenebilirlik

1. **100 kg** kuru incir girişi yap (Tedarikçi: Malatya Tesisi)
   - Lot: `LOT-20260729-003`
2. **Üretim Emri** oluştur
   - Mamül: "İncir Paketi 500g" (50 adet)
   - Hammadde: LOT-20260729-003 (25 kg kullanılacak)
3. **Üretimi Tamamla**
   - Mamül Lot: `MAM-20260729-001` oluşur
   - Otomatik bağlantı: kaynak_stok_id = LOT-20260729-003
4. **İzlenebilirlik** sayfasında `MAM-20260729-001` ara
   - Görsel: TEDARİKÇİ → HAMMADDE LOT → ÜRETİM → MAMÜL LOT

---

## 🔄 API Değişiklikleri

### Ürün Endpoint'leri

| Endpoint | Değişiklik |
|----------|------------|
| `GET /urunler/` | `hammadde_id`, `hammadde_ad` alanları eklendi |
| `POST /urunler/` | `hammadde_id` kabul ediliyor |
| `PUT /urunler/{id}` | `hammadde_id` güncellenebiliyor |
| `GET /urunler/hammaddeler/liste` | **YENİ** - MAMUL olmayan ürünler |

### Üretim Endpoint'leri

| Endpoint | Değişiklik |
|----------|------------|
| `POST /uretim/` | `gerceklesen_miktar` artık create'de dönüyor |
| `POST /uretim/{id}/tamamla` | `kaynak_lot` bilgisi döndürülüyor |

### İzlenebilirlik Endpoint'i

| Endpoint | Değişiklik |
|----------|------------|
| `GET /raporlar/izlenebilirlik/lot/{lot_no}` | `kaynak` bölümüne tedarikçi eklendi |

---

## 📁 Değiştirilen Dosyalar

### Backend
- `src/backend/app/models/urun.py` - hammadde_id FK, relationship
- `src/backend/app/api/urunler.py` - CRUD güncellemeleri, yeni endpoint
- `src/backend/app/api/uretim.py` - kaynak_stok_id bağlantısı, decimal fix

### Frontend
- `src/frontend/src/lib/utils.ts` - generateStokKodu(), parseStokKodu()
- `src/frontend/src/pages/UrunlerPage.tsx` - ham madde dropdown, kod üretici
- `src/frontend/src/pages/IzlenebilirlikPage.tsx` - görsel zincir
- `src/frontend/src/types/index.ts` - Urun, Hammadde interface'leri

### Database
- `urunler` tablosuna `hammadde_id` kolonu eklendi

---

## 🚀 Sonraki Adımlar

1. **Mevcut mamül ürünlere ham madde bağlantısı** - El ile düzeltme gerekebilir
2. **Üretim emri oluştururken** mamül seçildiğinde otomatik ham madde önerisi
3. **Barkod** alanı için aynı otomatik üretim mantığı
4. **Raporlama** - Hammadde tüketim raporu, fire oranı takibi

---

## 📝 Notlar

- Docker container'ları volume mount edildiği için kod değişiklikleri anında yansıyor
- Database migration için manual ALTER TABLE çalıştırıldı (Alembic migration script'i yok)
- Frontend hot reload aktif

---

**Güncelleme Tarihi:** 29 Temmuz 2026
**Yapan:** Mavis (AI Assistant)
