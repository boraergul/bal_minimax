# Veritabanı Tasarım Dokümanı
## Kurutulmuş Meyve ve Bal Yönetim Sistemi (ERP)

---

**Versiyon:** 1.0  
**Tarih:** 2026-07-27  
**Durum:** Taslak  
**Veritabanı:** PostgreSQL 15+

---

## 1. Giriş

### 1.1 Amaç
Bu doküman, Kurutulmuş Meyve ve Bal Yönetim Sistemi'nin veritabanı tasarımını detaylı olarak tanımlar. SRS dokümanında belirtilen tüm gereksinimleri karşılayacak şekilde normalize edilmiş, ilişkisel bir veritabanı şeması sunulmaktadır.

### 1.2 Kapsam
- Tüm varlıklar ve tablolar
- Tablolar arası ilişkiler
- İndeksler
- Tetikleyiciler (Triggers)
- FIFO (First In First Out) implementasyonu
- Veri bütünlük kuralları

### 1.3 Tasarım İlkeleri
- **Normalizasyon:** 3NF (Third Normal Form)
- **Bütünlük:** Foreign Key, Check, Unique constraints
- **İzleme:** `created_at`, `updated_at`, `created_by` her tabloda
- **Soft Delete:** Silinen kayıtlar `deleted_at` ile işaretlenir, fiziksel silinmez

---

## 2. Varlık İlişki Diyagramı (ERD) - Özet

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│ Tedarikciler│──────│ Tedarikci_Urunleri│──────│   Urunler   │
└─────────────┘      └──────────────────┘      └──────┬──────┘
                                                      │
┌─────────────┐      ┌─────────────┐      ┌──────────┴────────┐
│  Musteriler │──────│ Satis_Kaydi │──────│  Satis_Kalemleri   │
└─────────────┘      └─────────────┘      └──────────┬────────┘
                                                      │
┌─────────────┐      ┌─────────────┐      ┌──────────┴────────┐
│  Urunler    │──────│ Stok_Karti  │──────│ Stok_Hareketleri  │
└─────────────┘      └──────┬──────┘      └───────────────────┘
                            │
                     ┌──────┴──────┐
                     │ Uretim_Emri │
                     └──────┬──────┘
                            │
                     ┌──────┴──────┐
                     │Uretim_Detay │
                     └─────────────┘
```

---

## 3. Tablo Tanımları

### 3.1 Temel Tablolar

---

#### 3.1.1 `tedarikciler` — Tedarikçi Yönetimi

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `tedarikci_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `ad` | VARCHAR(255) | ✓ | Tedarikçi adı |
| `vergi_no` | VARCHAR(20) | ✓ | Vergi numarası (unique) |
| `telefon` | VARCHAR(20) | Hayır | İletişim telefonu |
| `eposta` | VARCHAR(255) | Hayır | E-posta adresi |
| `adres` | TEXT | Hayır | Detaylı adres |
| `aktif` | BOOLEAN | ✓ | Aktif/Pasif durum (varsayılan: TRUE) |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi (NULL = aktif) |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |
| `faks` | VARCHAR(20) | Hayır | Faks numarası |
| `yetkili_kisi` | VARCHAR(255) | Hayır | Tedarikçi firma yetkilisinin adı Soyadı |
| `yetkili_telefon` | VARCHAR(20) | Hayır | Yetkili kişiye ait direct telefon |
| `yetkili_eposta` | VARCHAR(255) | Hayır | Yetkili kişiye ait direct e-posta |
| `banka_adi` | VARCHAR(100) | Hayır | Ödeme için banka adı |
| `banka_sube` | VARCHAR(100) | Hayır | Şube adı |
| `hesap_no` | VARCHAR(50) | Hayır | IBAN veya hesap numarası |
| `odeme_vadesi` | INTEGER | Hayır | Gün cinsinden vade (örn: 30, 60, 90) |
| `tedarikci_sinifi` | VARCHAR(1) | Hayır | Tedarikçi sınıflandırması ('A','B','C') |
| `not` | TEXT | Hayır | Özel notlar |

**Kısıtlamalar:
```sql
CONSTRAINT tedarikciler_vergi_no_unique UNIQUE (vergi_no) WHERE silme_tarihi IS NULL;
CONSTRAINT tedarikciler_eposta_unique UNIQUE (eposta) WHERE silme_tarihi IS NULL AND eposta IS NOT NULL;
```

---

#### 3.1.2 `kullanicilar` — Kullanıcı Yönetimi

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `kullanici_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `kullanici_adi` | VARCHAR(100) | ✓ | Benzersiz kullanıcı adı |
| `sifre_hash` | VARCHAR(255) | ✓ | bcrypt hash'li şifre |
| `ad` | VARCHAR(100) | ✓ | Ad |
| `soyad` | VARCHAR(100) | ✓ | Soyad |
| `eposta` | VARCHAR(255) | ✓ | E-posta (unique) |
| `rol_id` | UUID | ✓ | Rol referansı (FK → roller) |
| `aktif` | BOOLEAN | ✓ | Aktif/Pasif durum |
| `son_giris` | TIMESTAMP | Hayır | Son başarılı giriş |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |
| `telefon` | VARCHAR(20) | Hayır | Kullanıcı telefonu (bildirimler için) |
| `avatar_url` | VARCHAR(500) | Hayır | Profil fotoğrafı |
| `bildirim_tercihleri` | JSONB | Hayır | E-posta, SMS, uygulama bildirim tercihleri |
| `giris_sayisi` | INTEGER | Hayır | Toplam giriş sayısı |
| `son_sifre_degisikligi` | TIMESTAMP | Hayır | Son şifre değişikliği tarihi |
| `iki_factor_aktivate` | BOOLEAN | Hayır | İki faktörlü doğrulama aktif mi? |
| `iki_factor_secret` | VARCHAR(255) | Hayır | TOTP secret (şifrelenmiş) |
| `varsayilan_depo_id` | UUID | Hayır | Kullanıcının varsayılan deposu |
| `adres` | TEXT | Hayır | Kullanıcı adresi |
| `dogum_tarihi` | DATE | Hayır | Doğum tarihi |
| `bolum` | VARCHAR(100) | Hayır | Departman/bölüm |
| `unvan` | VARCHAR(100) | Hayır | İş unvanı |

---

#### 3.1.3 `roller` — Rol Yönetimi

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `rol_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `ad` | VARCHAR(50) | ✓ | Rol adı (ADMIN, DEPO_SORUMLUSU, SATIS_SORUMLUSU) |
| `aciklama` | TEXT | Hayır | Rol açıklaması |
| `yetkiler` | JSONB | ✓ | Yetki listesi (array) |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |

**Varsayılan Roller:**
```json
ADMIN: ["*"]
DEPO_SORUMLUSU: ["stok_oku", "stok_yaz", "uretim_oku", "uretim_yaz", "tedarikci_oku"]
SATIS_SORUMLUSU: ["satis_oku", "satis_yaz", "musteri_oku", "musteri_yaz", "urun_oku"]
```

---

#### 3.1.4 `urunler` — Ürün Kataloğu

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `urun_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `ad` | VARCHAR(255) | ✓ | Ürün adı (örn: Kayısı, Üzüm, Bal) |
| `kategori` | VARCHAR(20) | ✓ | MEYVE, BAL, KARSIM |
| `birim_toptan` | VARCHAR(10) | ✓ | kg, ton |
| `birim_perakende` | VARCHAR(10) | ✓ | kg, gram, adet, paket |
| `varsayilan_ozellikler` | JSONB | Hayır | Kategoriye göre varsayılan özellik listesi |
| `aktif` | BOOLEAN | ✓ | Aktif/Pasif durum |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |
| `stok_kodu` | VARCHAR(50) | Hayır | SKU (Stock Keeping Unit) numarası |
| `barkod` | VARCHAR(50) | Hayır | Ürün barkod numarası (EAN-13, UPC vb.) |
| `aciklama` | TEXT | Hayır | Ürün hakkında detaylı açıklama |
| `gorsel_url` | VARCHAR(500) | Hayır | Ürün fotoğrafı |
| `agirlik` | DECIMAL(10,3) | Hayır | Paket ağırlığı (gram) |
| `hacim` | DECIMAL(10,3) | Hayır | Paket hacmi (cm³) |
| `minimum_stok_seviyesi` | DECIMAL(15,3) | Hayır | Minimum stok uyarı seviyesi |
| `maksimum_stok_seviyesi` | DECIMAL(15,3) | Hayır | Maksimum stok limiti |
| `raf_omru_gun` | INTEGER | Hayır | Gün cinsinden raf ömrü |

---

#### 3.1.5 `urun_ozellikleri` — Ürün Özellikleri (Nitelikler)

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `ozellik_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `kategori` | VARCHAR(20) | ✓ | MEYVE, BAL, KARSIM, TUML |
| `alan_adi` | VARCHAR(50) | ✓ | Veritabanı alan adı (örn: renk, boyut) |
| `goruntu_adi` | VARCHAR(100) | ✓ | Kullanıcıya gösterilecek ad |
| `tip` | VARCHAR(20) | ✓ | METIN, SAYI, ENUM, BOOLEAN, TARIH |
| `zorunlu` | BOOLEAN | ✓ | Stok girişinde zorunlu mu? |
| `etikette_goster` | BOOLEAN | ✓ | Etikette gösterilsin mi? |
| `etikette_zorunlu` | BOOLEAN | ✓ | Etikette zorunlu mu? |
| `siralama` | INTEGER | ✓ | Form/etiket sırası |
| `varsayilan_deger` | VARCHAR(255) | Hayır | Varsayılan değer |
| `enum_degerleri` | JSONB | Hayır | Enum tipi için seçenek listesi |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |

---

#### 3.1.6 `musteriler` — Müşteri Yönetimi

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `musteri_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `ad` | VARCHAR(255) | ✓ | Müşteri adı/firma adı |
| `telefon` | VARCHAR(20) | Hayır | İletişim telefonu |
| `eposta` | VARCHAR(255) | Hayır | E-posta adresi |
| `adres` | TEXT | Hayır | Teslimat adresi |
| `vergi_no` | VARCHAR(20) | Hayır | Vergi numarası (firma ise) |
| `not` | TEXT | Hayır | Özel notlar |
| `aktif` | BOOLEAN | ✓ | Aktif/Pasif durum |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |
| `musteri_tipi` | VARCHAR(20) | Hayır | Müşteri türü ('BIREYSEL','KURUMSAL') |
| `tc_kimlik` | VARCHAR(11) | Hayır | Bireysel müşteriler için TC kimlik |
| `faks` | VARCHAR(20) | Hayır | Kurumsal müşteriler için faks |
| `teslimat_adresi` | TEXT | Hayır | Fatura adresinden farklı teslimat adresi |
| `il` | VARCHAR(50) | Hayır | Adresin iller bazında sınıflandırılması |
| `ilce` | VARCHAR(50) | Hayır | Adresin ilçe bazında sınıflandırılması |
| `posta_kodu` | VARCHAR(10) | Hayır | Posta kodu bilgisi |
| `musteri_sinifi` | VARCHAR(1) | Hayır | Müşteri sınıflandırması ('A','B','C') |
| `odeme_vadesi` | INTEGER | Hayır | Müşteriye özel vade bilgisi (gün) |
| `kredi_limiti` | DECIMAL(15,4) | Hayır | Müşteriye tanınan kredi limiti |
| `satis_temsilcisi_id` | UUID | Hayır | Bu müşteriden sorumlu satış temsilcisi (FK → kullanicilar) |
| `dogum_tarihi` | DATE | Hayır | Bireysel müşteriler için doğum tarihi |
| `cinsiyet` | VARCHAR(1) | Hayır | Bireysel müşteriler için ('E','K','D') |

---

### 3.2 Stok ve Envanter Tabloları

---

#### 3.2.1 `stok_karti` — Stok Kartı (Lot Bazlı)

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `stok_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `urun_id` | UUID | ✓ | Ürün referansı (FK → urunler) |
| `lot_no` | VARCHAR(50) | ✓ | Lot/parti numarası (unique, otomatik: LOT-YYYYMMDD-XXX) |
| `tedarikci_id` | UUID | Hayır | Kaynak tedarikçi (hammadde ise, FK → tedarikciler) |
| `kaynak_stok_id` | UUID | Hayır | Kaynak stok (üretim ise, FK → stok_karti) |
| `stok_tipi` | VARCHAR(20) | ✓ | HAMMADDE, MAMUL |
| `uretim_tarihi` | DATE | Hayır | Üretim tarihi |
| `son_kullanma` | DATE | Hayır | Son kullanma tarihi |
| `giris_tarihi` | TIMESTAMP | ✓ | Stoka giriş tarihi |
| `miktar` | DECIMAL(15,3) | ✓ | Mevcut miktar |
| `birim` | VARCHAR(20) | ✓ | kg, adet, paket |
| `birim_fiyat` | DECIMAL(15,4) | ✓ | Birim maliyet/alış fiyatı |
| `konum` | VARCHAR(100) | Hayır | Depo konumu (örn: A-01-02) |
| `durum` | VARCHAR(20) | ✓ | AKTIF, BITTI, IPTAL, KALITE_KONTROL, DEPO_DISI, RET |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |
| `faks` | VARCHAR(20) | Hayır | Faks numarası |
| `yetkili_kisi` | VARCHAR(255) | Hayır | Tedarikçi firma yetkilisinin adı Soyadı |
| `yetkili_telefon` | VARCHAR(20) | Hayır | Yetkili kişiye ait direct telefon |
| `yetkili_eposta` | VARCHAR(255) | Hayır | Yetkili kişiye ait direct e-posta |
| `banka_adi` | VARCHAR(100) | Hayır | Ödeme için banka adı |
| `banka_sube` | VARCHAR(100) | Hayır | Şube adı |
| `hesap_no` | VARCHAR(50) | Hayır | IBAN veya hesap numarası |
| `odeme_vadesi` | INTEGER | Hayır | Gün cinsinden vade (örn: 30, 60, 90) |
| `tedarikci_sinifi` | VARCHAR(1) | Hayır | Tedarikçi sınıflandırması ('A','B','C') |
| `not` | TEXT | Hayır | Özel notlar |

**Kısıtlamalar:
```sql
CONSTRAINT stok_karti_miktar_non_negative CHECK (miktar >= 0);
CONSTRAINT stok_karti_lot_no_unique UNIQUE (lot_no) WHERE silme_tarihi IS NULL;
```

**İlişkiler:**
- `urun_id` → `urunler(urun_id)` (Many-to-One)
- `tedarikci_id` → `tedarikciler(tedarikci_id)` (Many-to-One, nullable)
- `kaynak_stok_id` → `stok_karti(stok_id)` (Many-to-One, self-referential, nullable)

---

#### 3.2.2 `stok_hareketleri` — Stok Hareketleri

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `hareket_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `stok_id` | UUID | ✓ | Stok kartı referansı (FK → stok_karti) |
| `hareket_tipi` | VARCHAR(30) | ✓ | GIRIS, URETIM_GIRIS, URETIM_CIKIS, SATIS_CIKIS, IADE, DUZELTME, TRANSFER |
| `miktar` | DECIMAL(15,3) | ✓ | Hareket miktarı (pozitif = giriş, negatif = çıkış) |
| `birim_fiyat` | DECIMAL(15,4) | Hayır | Hareket birim fiyatı |
| `tutar` | DECIMAL(15,4) | Hayır | Toplam tutar |
| `onceki_miktar` | DECIMAL(15,3) | ✓ | Hareket öncesi miktar |
| `sonraki_miktar` | DECIMAL(15,3) | ✓ | Hareket sonrası miktar |
| `referans_id` | UUID | Hayır | İlgili kaynağa referans (satış, üretim vb.) |
| `referans_tipi` | VARCHAR(30) | Hayır | SATIS, URETIM, TEDARIK, DUZELTME |
| `aciklama` | TEXT | Hayır | Hareket açıklaması |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |
| `faks` | VARCHAR(20) | Hayır | Faks numarası |
| `yetkili_kisi` | VARCHAR(255) | Hayır | Tedarikçi firma yetkilisinin adı Soyadı |
| `yetkili_telefon` | VARCHAR(20) | Hayır | Yetkili kişiye ait direct telefon |
| `yetkili_eposta` | VARCHAR(255) | Hayır | Yetkili kişiye ait direct e-posta |
| `banka_adi` | VARCHAR(100) | Hayır | Ödeme için banka adı |
| `banka_sube` | VARCHAR(100) | Hayır | Şube adı |
| `hesap_no` | VARCHAR(50) | Hayır | IBAN veya hesap numarası |
| `odeme_vadesi` | INTEGER | Hayır | Gün cinsinden vade (örn: 30, 60, 90) |
| `tedarikci_sinifi` | VARCHAR(1) | Hayır | Tedarikçi sınıflandırması ('A','B','C') |
| `not` | TEXT | Hayır | Özel notlar |

**Kısıtlamalar:
```sql
CONSTRAINT stok_hareketleri_miktar CHECK (miktar != 0);
CONSTRAINT stok_hareketleri_onceki_sonraki CHECK (sonraki_miktar = onceki_miktar + miktar);
```

**İlişkiler:**
- `stok_id` → `stok_karti(stok_id)` (Many-to-One)

---

#### 3.2.3 `lot_ozellikleri` — Lot Özellik Kaydı

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `lot_ozellik_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `stok_id` | UUID | ✓ | Lot referansı (FK → stok_karti) |
| `ozellik_id` | UUID | ✓ | Özellik referansı (FK → urun_ozellikleri) |
| `deger` | VARCHAR(255) | ✓ | Girilen değer |
| `birim` | VARCHAR(20) | Hayır | Birim (varsa) |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |

**İlişkiler:**
- `stok_id` → `stok_karti(stok_id)` (Many-to-One)
- `ozellik_id` → `urun_ozellikleri(ozellik_id)` (Many-to-One)

**Unique Constraint:**
```sql
CONSTRAINT lot_ozellikleri_unique UNIQUE (stok_id, ozellik_id);
```

---

#### 3.2.4 `lot_fotograf` — Lot Fotoğraf Kaydı

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `foto_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `stok_id` | UUID | ✓ | Lot referansı (FK → stok_karti) |
| `foto_url` | VARCHAR(500) | ✓ | Fotoğraf dosya yolu |
| `thumbnail_url` | VARCHAR(500) | ✓ | Küçük resim yolu |
| `foto_tarihi` | TIMESTAMP | ✓ | Fotoğraf çekim tarihi |
| `not` | TEXT | Hayır | Fotoğraf notu |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

**İlişkiler:**
- `stok_id` → `stok_karti(stok_id)` (Many-to-One)

---

### 3.3 Tedarikçi İlişkili Tablolar

---

#### 3.3.1 `tedarikci_urunleri` — Tedarikçi Ürün İlişkisi

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `tedarikci_urun_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `tedarikci_id` | UUID | ✓ | Tedarikçi referansı (FK → tedarikciler) |
| `urun_id` | UUID | ✓ | Ürün referansı (FK → urunler) |
| `varsayilan_fiyat` | DECIMAL(15,4) | Hayır | Varsayılan alış fiyatı |
| `minimum_siparis_miktari` | DECIMAL(15,3) | Hayır | Minimum sipariş miktarı |
| `teslimat_suresi` | INTEGER | Hayır | Teslimat süresi (gün) |
| `aktif` | BOOLEAN | ✓ | Aktif/Pasif durum |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |

**İlişkiler:**
- `tedarikci_id` → `tedarikciler(tedarikci_id)` (Many-to-One)
- `urun_id` → `urunler(urun_id)` (Many-to-One)

**Unique Constraint:**
```sql
CONSTRAINT tedarikci_urunleri_unique UNIQUE (tedarikci_id, urun_id) WHERE silme_tarihi IS NULL;
```

---

#### 3.3.2 `tedarikci_fiyat_gecmisi` — Tedarikçi Fiyat Geçmişi

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `fiyat_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `tedarikci_urun_id` | UUID | ✓ | Tedarikçi-ürün referansı (FK → tedarikci_urunleri) |
| `birim_fiyat` | DECIMAL(15,4) | ✓ | Alış fiyatı |
| `gecerlilik_baslangic` | DATE | ✓ | Fiyat geçerlilik başlangıcı |
| `gecerlilik_bitis` | DATE | Hayır | Fiyat geçerlilik bitişi (NULL = halen geçerli) |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

**İlişkiler:**
- `tedarikci_urun_id` → `tedarikci_urunleri(tedarikci_urun_id)` (Many-to-One)

---

#### 3.3.3 `tedarikci_performans` — Tedarikçi Performans Takibi

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `performans_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `tedarikci_id` | UUID | ✓ | Tedarikçi referansı (FK → tedarikciler) |
| `donem_baslangic` | DATE | ✓ | Değerlendirme dönemi başlangıcı |
| `donem_bitis` | DATE | ✓ | Değerlendirme dönemi bitişi |
| `kalite_puani` | DECIMAL(3,2) | ✓ | 1-5 arası kalite puanı |
| `zamaninda_teslimat_orani` | DECIMAL(5,2) | ✓ | Zamanında teslimat yüzdesi |
| `toplam_siparis` | INTEGER | ✓ | Dönem içinde toplam sipariş sayısı |
| `sorunlu_siparis` | INTEGER | ✓ | Sorunlu sipariş sayısı |
| `son_degerlendirme_tarihi` | DATE | ✓ | Son kalite değerlendirmesi tarihi |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |

**İlişkiler:**
- `tedarikci_id` → `tedarikciler(tedarikci_id)` (Many-to-One)

---

#### 3.3.4 `tedarikci_degerlendirme` — Tedarikçi Değerlendirme Kaydı

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `degerlendirme_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `tedarikci_id` | UUID | ✓ | Tedarikçi referansı (FK → tedarikciler) |
| `siparis_id` | UUID | Hayır | İlgili sipariş/stok hareketi (FK → stok_hareketleri) |
| `kalite_puani` | INTEGER | ✓ | 1-5 arası puan |
| `fiyat_puani` | DECIMAL(3,2) | Hayır | Fiyat değerlendirmesi (1-5) |
| `hizmet_puani` | DECIMAL(3,2) | Hayır | Hizmet değerlendirmesi (1-5) |
| `genel_puan` | DECIMAL(3,2) | Hayır | Genel performans puanı |
| `odeme_plani` | VARCHAR(50) | Hayır | Ödeme planı uyumu |
| `sertifikalar` | JSONB | Hayır | Kalite sertifikaları (ISO, organik vb.) |
| `resmi_dosyalar` | JSONB | Hayır | Ticaret sicil, vergi levhası vb. |
| `yorum` | TEXT | Hayır | Değerlendirme yorumu |
| `degerlendirme_tarihi` | DATE | ✓ | Değerlendirme tarihi |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

**İlişkiler:**
- `tedarikci_id` → `tedarikciler(tedarikci_id)` (Many-to-One)
- `siparis_id` → `stok_hareketleri(hareket_id)` (Many-to-One, nullable)

---

### 3.4 Üretim Tabloları

---

#### 3.4.1 `uretim_emri` — Üretim Emri

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `uretim_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `uretim_no` | VARCHAR(50) | ✓ | Üretim emri numarası (URET-YYYYMMDD-XXX) |
| `tarih` | TIMESTAMP | ✓ | Emrin oluşturulma tarihi |
| `durum` | VARCHAR(20) | ✓ | BEKLEMEDE, ONAYLANDI, TAMAMLANDI, IPTAL |
| `planlanan_tarih` | DATE | Hayır | Planlanan üretim tarihi |
| `tamamlama_tarihi` | TIMESTAMP | Hayır | Fiili tamamlama tarihi |
| `not` | TEXT | Hayır | Üretim notları |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

**Unique Constraint:**
```sql
CONSTRAINT uretim_emri_no_unique UNIQUE (uretim_no) WHERE silme_tarihi IS NULL;
```

---

#### 3.4.2 `uretim_detay` — Üretim Detayı

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `detay_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `uretim_id` | UUID | ✓ | Üretim emri referansı (FK → uretim_emri) |
| `mamul_urun_id` | UUID | ✓ | Üretilecek mamul (FK → urunler) |
| `mamul_miktar` | DECIMAL(15,3) | ✓ | Üretilecek mamul miktarı |
| `mamul_birim` | VARCHAR(20) | ✓ | Mamul birimi |
| `hammadde_urun_id` | UUID | ✓ | Kullanılacak hammadde (FK → urunler) |
| `hammadde_lot_no` | VARCHAR(50) | ✓ | Kullanılacak lot numarası |
| `hammadde_stok_id` | UUID | ✓ | Hammadde stok kartı (FK → stok_karti) |
| `hammadde_miktar` | DECIMAL(15,3) | ✓ | Kullanılacak hammadde miktarı |
| `fire_miktari` | DECIMAL(15,3) | ✓ | Oluşan fire miktarı |
| `hammadde_birim` | VARCHAR(20) | ✓ | Hammadde birimi |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |

**İlişkiler:**
- `uretim_id` → `uretim_emri(uretim_id)` (Many-to-One)
- `mamul_urun_id` → `urunler(urun_id)` (Many-to-One)
- `hammadde_urun_id` → `urunler(urun_id)` (Many-to-One)
- `hammadde_stok_id` → `stok_karti(stok_id)` (Many-to-One)

---

#### 3.4.3 `uretim_lot` — Üretim Sonucu Oluşan Lot Kaydı

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `uretim_lot_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `uretim_id` | UUID | ✓ | Üretim emri referansı (FK → uretim_emri) |
| `mamul_stok_id` | UUID | ✓ | Oluşan mamul stok kartı (FK → stok_karti) |
| `kaynak_lot_bilgisi` | JSONB | ✓ | Kaynak hammadde lotu/lotları bilgisi |
| `uretim_tarihi` | DATE | ✓ | Üretim tarihi |
| `son_kullanma_tarihi` | DATE | ✓ | Hesaplanan son kullanma tarihi |
| `toplam_giris_miktari` | DECIMAL(15,3) | ✓ | Toplam üretilen miktar |
| `toplam_cikis_miktari` | DECIMAL(15,3) | ✓ | Toplam tüketilen/fire miktarı |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |

**İlişkiler:**
- `uretim_id` → `uretim_emri(uretim_id)` (Many-to-One)
- `mamul_stok_id` → `stok_karti(stok_id)` (Many-to-One)

---

### 3.5 Satış Tabloları

---

#### 3.5.1 `satis_kaydi` — Satış Kaydı

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `satis_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `satis_no` | VARCHAR(50) | ✓ | Satış numarası (SAT-YYYYMMDD-XXX) |
| `musteri_id` | UUID | ✓ | Müşteri referansı (FK → musteriler) |
| `tarih` | TIMESTAMP | ✓ | Satış tarihi |
| `durum` | VARCHAR(20) | ✓ | TAMAMLANDI, IPTAL, IADE |
| `toplam_tutar` | DECIMAL(15,4) | ✓ | Toplam satış tutarı |
| `indirim_tutari` | DECIMAL(15,4) | Hayır | Toplam indirim tutarı |
| `not` | TEXT | Hayır | Satış notları |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

**Unique Constraint:**
```sql
CONSTRAINT satis_kaydi_no_unique UNIQUE (satis_no) WHERE silme_tarihi IS NULL;
```

**İlişkiler:**
- `musteri_id` → `musteriler(musteri_id)` (Many-to-One)

---

#### 3.5.2 `satis_kalemleri` — Satış Kalemleri

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `kalem_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `satis_id` | UUID | ✓ | Satış referansı (FK → satis_kaydi) |
| `urun_id` | UUID | ✓ | Ürün referansı (FK → urunler) |
| `stok_id` | UUID | ✓ | Satılan lot/stok (FK → stok_karti) |
| `lot_no` | VARCHAR(50) | ✓ | Satılan lot numarası |
| `miktar` | DECIMAL(15,3) | ✓ | Satılan miktar |
| `birim` | VARCHAR(20) | ✓ | Birim |
| `birim_fiyat` | DECIMAL(15,4) | ✓ | Satış birim fiyatı |
| `tutar` | DECIMAL(15,4) | ✓ | Kalem tutarı |
| `indirim_orani` | DECIMAL(5,2) | Hayır | İndirim oranı (%) |
| `indirim_tutari` | DECIMAL(15,4) | Hayır | İndirim tutarı |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |

**İlişkiler:**
- `satis_id` → `satis_kaydi(satis_id)` (Many-to-One)
- `urun_id` → `urunler(urun_id)` (Many-to-One)
- `stok_id` → `stok_karti(stok_id)` (Many-to-One)

---

### 3.6 Etiket ve Baskı Tabloları

---

#### 3.6.1 `etiket_sablon` — Etiket Şablonu

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `sablon_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `ad` | VARCHAR(100) | ✓ | Şablon adı |
| `tur` | VARCHAR(20) | ✓ | MAL_ALIM, URETIM, SATIS, GENEL |
| `aktif` | BOOLEAN | ✓ | Varsayılan şablon mu? |
| `etiket_boyut` | VARCHAR(20) | ✓ | STANDART (50x25mm), BUYUK (100x50mm), MINI (25x13mm) |
| `barkod_format` | VARCHAR(20) | ✓ | CODE128, QR, EAN13 |
| `varsayilan` | BOOLEAN | ✓ | Sistem varsayılanı mı? |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

---

#### 3.6.2 `etiket_alan` — Etiket Alan Tanımları

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `alan_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `sablon_id` | UUID | ✓ | Şablon referansı (FK → etiket_sablon) |
| `alan_tipi` | VARCHAR(30) | ✓ | SabitMetin, UrunAdi, LotNo, Tarih, Miktar, Tedarikci, OzelAlan, Barkod, QRCode, Fotograf |
| `goruntu_metni` | VARCHAR(100) | ✓ | Kullanıcıya gösterilecek ad |
| `deger` | VARCHAR(255) | Hayır | Sabit metin değeri (SabitMetin ise) |
| `ozellik_id` | UUID | Hayır | ÖzelAlan tipi için özellik referansı (FK → urun_ozellikleri) |
| `zorunlu` | BOOLEAN | ✓ | Bu alan yazdırılacak mı? |
| `varsayilan_alan` | BOOLEAN | ✓ | Şablonda varsayılan alan mı? |
| `konum_x` | INTEGER | ✓ | Etiket üzerinde X koordinatı (px) |
| `konum_y` | INTEGER | ✓ | Etiket üzerinde Y koordinatı (px) |
| `boyut_en` | INTEGER | ✓ | Genişlik (px) |
| `boyut_boy` | INTEGER | ✓ | Yükseklik (px) |
| `yazi_boyut` | INTEGER | ✓ | Font size (pt) |
| `siralama` | INTEGER | ✓ | Alan sırası |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |

**İlişkiler:**
- `sablon_id` → `etiket_sablon(sablon_id)` (Many-to-One)
- `ozellik_id` → `urun_ozellikleri(ozellik_id)` (Many-to-One, nullable)

---

### 3.7 Sistem Tabloları

---

#### 3.7.1 `urun_donusum` — Ürün Dönüşüm Oranları

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `donusum_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `mamul_urun_id` | UUID | ✓ | Mamul ürün referansı (FK → urunler) |
| `hammadde_urun_id` | UUID | ✓ | Hammadde referansı (FK → urunler) |
| `donusum_orani` | DECIMAL(10,4) | ✓ | 1 birim mamul için gerekli hammadde (örn: 1.05 kg kayısı → 1 kg kurutulmuş kayısı) |
| `fire_orani` | DECIMAL(5,4) | ✓ | Beklenen fire yüzdesi (örn: 0.05 = %5) |
| `aktif` | BOOLEAN | ✓ | Aktif/Pasif durum |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |

**İlişkiler:**
- `mamul_urun_id` → `urunler(urun_id)` (Many-to-One)
- `hammadde_urun_id` → `urunler(urun_id)` (Many-to-One)

**Unique Constraint:**
```sql
CONSTRAINT urun_donusum_unique UNIQUE (mamul_urun_id, hammadde_urun_id) WHERE silme_tarihi IS NULL;
```

---

#### 3.7.2 `sistem_ayarlari` — Sistem Yapılandırması

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `ayar_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `ayar_adi` | VARCHAR(100) | ✓ | Ayar adı (unique) |
| `deger` | TEXT | ✓ | Ayar değeri |
| `veri_tipi` | VARCHAR(20) | ✓ | STRING, INTEGER, DECIMAL, BOOLEAN, JSON |
| `aciklama` | TEXT | Hayır | Ayar açıklaması |
| `kategori` | VARCHAR(50) | ✓ | GENEL, STOK, URETIM, SATIS, ETIKET |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |

**Unique Constraint:**
```sql
CONSTRAINT sistem_ayarlari_adi_unique UNIQUE (ayar_adi);
```

---

#### 3.7.3 `audit_log` — Denetim Günlüğü

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `log_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `tablo_adi` | VARCHAR(100) | ✓ | İşlem yapılan tablo |
| `kayit_id` | UUID | ✓ | İşlem yapılan kayıt ID |
| `islem_tipi` | VARCHAR(20) | ✓ | INSERT, UPDATE, DELETE |
| `eski_deger` | JSONB | Hayır | Güncelleme öncesi değerler |
| `yeni_deger` | JSONB | Hayır | Güncelleme sonrası değerler |
| `ip_adresi` | VARCHAR(45) | Hayır | İşlem yapan IP |
| `kullanici_id` | UUID | ✓ | İşlem yapan kullanıcı (FK → kullanicilar) |
| `olusturma_tarihi` | TIMESTAMP | ✓ | İşlem tarihi |

**İlişkiler:**
- `kullanici_id` → `kullanicilar(kullanici_id)` (Many-to-One)

---

## 4. İndeksler

### 4.1 Birincil İndeksler (PK - Otomatik)
Her tablonun `id` alanı üzerinde otomatik oluşur (B-tree).

### 4.2 Foreign Key İndeksleri
```sql
-- stok_karti
CREATE INDEX idx_stok_karti_urun_id ON stok_karti(urun_id);
CREATE INDEX idx_stok_karti_tedarikci_id ON stok_karti(tedarikci_id) WHERE tedarikci_id IS NOT NULL;
CREATE INDEX idx_stok_karti_kaynak_stok_id ON stok_karti(kaynak_stok_id) WHERE kaynak_stok_id IS NOT NULL;

-- stok_hareketleri
CREATE INDEX idx_stok_hareketleri_stok_id ON stok_hareketleri(stok_id);
CREATE INDEX idx_stok_hareketleri_hareket_tipi ON stok_hareketleri(hareket_tipi);
CREATE INDEX idx_stok_hareketleri_tarih ON stok_hareketleri(olusturma_tarihi);

-- satis_kalemleri
CREATE INDEX idx_satis_kalemleri_satis_id ON satis_kalemleri(satis_id);
CREATE INDEX idx_satis_kalemleri_stok_id ON satis_kalemleri(stok_id);
CREATE INDEX idx_satis_kalemleri_urun_id ON satis_kalemleri(urun_id);

-- satis_kaydi
CREATE INDEX idx_satis_kaydi_musteri_id ON satis_kaydi(musteri_id);
CREATE INDEX idx_satis_kaydi_tarih ON satis_kaydi(tarih);
CREATE INDEX idx_satis_kaydi_durum ON satis_kaydi(durum);

-- uretim_detay
CREATE INDEX idx_uretim_detay_uretim_id ON uretim_detay(uretim_id);
CREATE INDEX idx_uretim_detay_hammadde_stok_id ON uretim_detay(hammadde_stok_id);

-- uretim_emri
CREATE INDEX idx_uretim_emri_durum ON uretim_emri(durum);
CREATE INDEX idx_uretim_emri_tarih ON uretim_emri(tarih);

-- lot_ozellikleri
CREATE INDEX idx_lot_ozellikleri_stok_id ON lot_ozellikleri(stok_id);
CREATE INDEX idx_lot_ozellikleri_ozellik_id ON lot_ozellikleri(ozellik_id);
```

### 4.3 FIFO Sorguları İçin Özel İndeksler
```sql
-- FIFO için kritik: Stok çıkışında en eski lotu bulmak
CREATE INDEX idx_stok_karti_fifo 
ON stok_karti(urun_id, giris_tarihi, son_kullanma) 
WHERE durum = 'AKTIF' AND miktar > 0;

-- Son kullanma tarihi yaklaşan lotları bulmak
CREATE INDEX idx_stok_karti_son_kullanma 
ON stok_karti(son_kullanma) 
WHERE durum = 'AKTIF' AND silme_tarihi IS NULL;

-- Belirli bir ürün için aktif lotları tarihe göre sıralamak
CREATE INDEX idx_stok_karti_urun_giris_tarih 
ON stok_karti(urun_id, giris_tarihi) 
WHERE durum = 'AKTIF' AND silme_tarihi IS NULL;
```

### 4.4 Arama ve Filtreleme İndeksleri
```sql
-- Tedarikçi arama
CREATE INDEX idx_tedarikciler_ad ON tedarikciler(ad) WHERE silme_tarihi IS NULL;
CREATE INDEX idx_tedarikciler_vergi_no ON tedarikciler(vergi_no) WHERE silme_tarihi IS NULL;

-- Müşteri arama
CREATE INDEX idx_musteriler_ad ON musteriler(ad) WHERE silme_tarihi IS NULL;

-- Ürün arama
CREATE INDEX idx_urunler_ad ON urunler(ad) WHERE silme_tarihi IS NULL;
CREATE INDEX idx_urunler_kategori ON urunler(kategori) WHERE silme_tarihi IS NULL;

-- Audit log sorguları
CREATE INDEX idx_audit_log_tablo_kayit ON audit_log(tablo_adi, kayit_id);
CREATE INDEX idx_audit_log_tarih ON audit_log(olusturma_tarihi);
CREATE INDEX idx_audit_log_kullanici ON audit_log(kullanici_id);
```

### 4.5 Tam Metin Arama İndeksleri (Gerekirse)
```sql
-- Ürün adı araması için
CREATE INDEX idx_urunler_ad_fts ON urunler USING gin(to_tsvector('turkish', ad));

-- Tedarikçi adı araması için
CREATE INDEX idx_tedarikciler_ad_fts ON tedarikciler USING gin(to_tsvector('turkish', ad));
```

---

## 5. Tetikleyiciler (Triggers)

### 5.1 Stok Yönetimi Tetikleyicileri

#### 5.1.1 `trg_stok_hareketleri_after_insert` — Stok Hareketi Sonrası Miktar Güncelleme

**Amaç:** Her stok hareketi eklendiğinde, ilgili stok kartının mevcut miktarını otomatik günceller.

```sql
CREATE OR REPLACE FUNCTION fn_stok_hareketi_guncelle()
RETURNS TRIGGER AS $$
BEGIN
    -- Stok kartının mevcut miktarını güncelle
    UPDATE stok_karti
    SET miktar = NEW.sonraki_miktar,
        guncelleme_tarihi = CURRENT_TIMESTAMP
    WHERE stok_id = NEW.stok_id;
    
    -- Eğer miktar sıfır veya negatif ise, durumu BITTI olarak güncelle
    IF NEW.sonraki_miktar <= 0 THEN
        UPDATE stok_karti
        SET durum = 'BITTI',
            guncelleme_tarihi = CURRENT_TIMESTAMP
        WHERE stok_id = NEW.stok_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stok_hareketleri_after_insert
AFTER INSERT ON stok_hareketleri
FOR EACH ROW
EXECUTE FUNCTION fn_stok_hareketi_guncelle();
```

---

#### 5.1.2 `trg_stok_karti_lot_no_olustur` — Otomatik Lot Numarası

**Amaç:** Yeni stok kartı oluşturulurken lot numarası verilmezse otomatik oluşturur.

```sql
CREATE OR REPLACE FUNCTION fn_lot_no_olustur()
RETURNS TRIGGER AS $$
DECLARE
    v_lot_no VARCHAR(50);
    v_sequel INTEGER;
BEGIN
    -- Eğer lot_no boşsa otomatik oluştur
    IF NEW.lot_no IS NULL OR NEW.lot_no = '' THEN
        -- Bugünkü tarih için sıra numarasını al
        SELECT COALESCE(MAX(SUBSTRING(lot_no FROM 'LOT-[0-9]{8}-([0-9]+)$')::INTEGER), 0) + 1
        INTO v_sequel
        FROM stok_karti
        WHERE lot_no LIKE 'LOT-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%';
        
        v_lot_no := 'LOT-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(v_sequel::TEXT, 3, '0');
        
        NEW.lot_no := v_lot_no;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stok_karti_lot_no_olustur
BEFORE INSERT ON stok_karti
FOR EACH ROW
EXECUTE FUNCTION fn_lot_no_olustur();
```

---

#### 5.1.3 `trg_satis_sonrasi_stok_guncelle` — Satış Sonrası Stok Güncelleme

**Amaç:** Satış onaylandığında stok çıkış hareketi oluşturur.

```sql
CREATE OR REPLACE FUNCTION fn_satis_stok_cikis()
RETURNS TRIGGER AS $$
BEGIN
    -- Sadece TAMAMLANDI durumunda işlem yap
    IF NEW.durum = 'TAMAMLANDI' AND OLD.durum != 'TAMAMLANDI' THEN
        -- Satış kalemlerini işle
        INSERT INTO stok_hareketleri (
            stok_id, hareket_tipi, miktar, onceki_miktar, sonraki_miktar,
            birim_fiyat, tutar, referans_id, referans_tipi, olusturma_tarihi, olusturan_kullanici_id
        )
        SELECT 
            sk.stok_id,
            'SATIS_CIKIS',
            -sk.miktar,
            sk.miktar + COALESCE(
                (SELECT miktar FROM stok_karti WHERE stok_id = sk.stok_id),
                0
            ),
            COALESCE(
                (SELECT miktar FROM stok_karti WHERE stok_id = sk.stok_id),
                0
            ),
            sk.birim_fiyat,
            sk.tutar,
            NEW.satis_id,
            'SATIS',
            NEW.tarih,
            NEW.olusturan_kullanici_id
        FROM satis_kalemleri sk
        WHERE sk.satis_id = NEW.satis_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_satis_sonrasi_stok_guncelle
AFTER UPDATE ON satis_kaydi
FOR EACH ROW
EXECUTE FUNCTION fn_satis_stok_cikis();
```

---

### 5.2 Üretim Tetikleyicileri

#### 5.2.1 `trg_uretim_tamamlandi_stok_giris` — Üretim Tamamlandığında Stok Girişi

**Amaç:** Üretim emri tamamlandığında mamul için otomatik stok girişi oluşturur.

```sql
CREATE OR REPLACE FUNCTION fn_uretim_stok_giris()
RETURNS TRIGGER AS $$
DECLARE
    v_stok_id UUID;
    v_lot_no VARCHAR(50);
BEGIN
    -- Sadece TAMAMLANDI durumuna geçişte çalış
    IF NEW.durum = 'TAMAMLANDI' AND OLD.durum != 'TAMAMLANDI' THEN
        -- Her üretim detayı için stok girişi yap
        FOR detay IN 
            SELECT * FROM uretim_detay WHERE uretim_id = NEW.uretim_id
        LOOP
            -- Yeni lot numarası oluştur
            v_lot_no := 'LOT-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                        LPAD(
                            (SELECT COALESCE(MAX(SUBSTRING(lot_no FROM 'LOT-[0-9]{8}-([0-9]+)$')::INTEGER), 0) + 1
                             FROM stok_karti WHERE lot_no LIKE 'LOT-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%'
                            )::TEXT, 
                            3, '0'
                        );
            
            -- Mamul stok kartı oluştur
            INSERT INTO stok_karti (
                urun_id, lot_no, stok_tipi, kaynak_stok_id,
                uretim_tarihi, son_kullanma, giris_tarihi, miktar, birim, birim_fiyat,
                durum, olusturma_tarihi, olusturan_kullanici_id
            ) VALUES (
                detay.mamul_urun_id, v_lot_no, 'MAMUL', detay.hammadde_stok_id,
                CURRENT_DATE, 
                CURRENT_DATE + INTERVAL '1 year',  -- Varsayılan son kullanma: 1 yıl
                detay.mamul_miktar, detay.mamul_birim, 0,  -- Maliyet henüz hesaplanmadı
                'AKTIF', CURRENT_TIMESTAMP, NEW.olusturan_kullanici_id
            )
            RETURNING stok_id INTO v_stok_id;
            
            -- Hammadde çıkış hareketi oluştur
            INSERT INTO stok_hareketleri (
                stok_id, hareket_tipi, miktar, onceki_miktar, sonraki_miktar,
                referans_id, referans_tipi, olusturma_tarihi, olusturan_kullanici_id
            ) VALUES (
                detay.hammadde_stok_id,
                'URETIM_CIKIS',
                -detay.hammadde_miktar,
                detay.hammadde_miktar + COALESCE(
                    (SELECT miktar FROM stok_karti WHERE stok_id = detay.hammadde_stok_id),
                    0
                ),
                COALESCE(
                    (SELECT miktar FROM stok_karti WHERE stok_id = detay.hammadde_stok_id),
                    0
                ),
                NEW.uretim_id,
                'URETIM',
                CURRENT_TIMESTAMP,
                NEW.olusturan_kullanici_id
            );
            
            -- Üretim lot kaydı oluştur
            INSERT INTO uretim_lot (
                uretim_id, mamul_stok_id, kaynak_lot_bilgisi,
                uretim_tarihi, son_kullanma_tarihi,
                toplam_giris_miktari, toplam_cikis_miktari, olusturma_tarihi
            ) VALUES (
                NEW.uretim_id, v_stok_id,
                jsonb_build_object(
                    'hammadde_lot_no', detay.hammadde_lot_no,
                    'hammadde_miktar', detay.hammadde_miktar
                ),
                CURRENT_DATE,
                CURRENT_DATE + INTERVAL '1 year',
                detay.mamul_miktar,
                detay.hammadde_miktar + detay.fire_miktari,
                CURRENT_TIMESTAMP
            );
        END LOOP;
        
        -- Üretim emri tamamlama tarihini güncelle
        UPDATE uretim_emri 
        SET tamamlama_tarihi = CURRENT_TIMESTAMP 
        WHERE uretim_id = NEW.uretim_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_uretim_tamamlandi_stok_giris
AFTER UPDATE ON uretim_emri
FOR EACH ROW
EXECUTE FUNCTION fn_uretim_stok_giris();
```

---

### 5.3 Audit Log Tetikleyicileri

#### 5.3.1 `trg_audit_log` — Tüm Tablolar İçin Denetim Günlüğü

**Amaç:** Kritik tablolardaki tüm değişiklikleri kaydeder.

```sql
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (
            tablo_adi, kayit_id, islem_tipi, yeni_deger, kullanici_id, olusturma_tarihi
        ) VALUES (
            TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW),
            COALESCE(NEW.olusturan_kullanici_id, NEW.kullanici_id),
            CURRENT_TIMESTAMP
        );
        RETURN NEW;
    
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (
            tablo_adi, kayit_id, islem_tipi, eski_deger, yeni_deger, kullanici_id, olusturma_tarihi
        ) VALUES (
            TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), row_to_json(NEW),
            COALESCE(NEW.olusturan_kullanici_id, NEW.guncelleyen_kullanici_id),
            CURRENT_TIMESTAMP
        );
        RETURN NEW;
    
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (
            tablo_adi, kayit_id, islem_tipi, eski_deger, kullanici_id, olusturma_tarihi
        ) VALUES (
            TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD),
            COALESCE(OLD.olusturan_kullanici_id, OLD.kullanici_id),
            CURRENT_TIMESTAMP
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Kritik tablolar için audit trigger'ları
CREATE TRIGGER trg_tedarikciler_audit
AFTER INSERT OR UPDATE OR DELETE ON tedarikciler
FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_urunler_audit
AFTER INSERT OR UPDATE OR DELETE ON urunler
FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_stok_karti_audit
AFTER INSERT OR UPDATE OR DELETE ON stok_karti
FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_musteriler_audit
AFTER INSERT OR UPDATE OR DELETE ON musteriler
FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_satis_kaydi_audit
AFTER INSERT OR UPDATE OR DELETE ON satis_kaydi
FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
```

---

### 5.4 Veri Bütünlüğü Tetikleyicileri

#### 5.4.1 `trg_stok_miktar_negatif_engelle` — Negatif Stok Engelleme

**Amaç:** Stok miktarının negatif değere düşmesini engeller.

```sql
CREATE OR REPLACE FUNCTION fn_stok_miktar_kontrol()
RETURNS TRIGGER AS $$
BEGIN
    -- Sadece çıkış hareketleri için kontrol
    IF NEW.hareket_tipi IN ('SATIS_CIKIS', 'URETIM_CIKIS') THEN
        IF NEW.miktar < 0 THEN
            -- Yeterli stok var mı kontrol et
            IF (SELECT miktar FROM stok_karti WHERE stok_id = NEW.stok_id) < ABS(NEW.miktar) THEN
                RAISE EXCEPTION 'Yetersiz stok! Mevcut: %, Talep: %', 
                    (SELECT miktar FROM stok_karti WHERE stok_id = NEW.stok_id),
                    ABS(NEW.miktar);
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stok_miktar_negatif_engelle
BEFORE INSERT ON stok_hareketleri
FOR EACH ROW
EXECUTE FUNCTION fn_stok_miktar_kontrol();
```

---

#### 5.4.2 `trg_fiyat_gecmisi_gercek_zamanli` — Fiyat Geçmişi Kaydetme

**Amaç:** Tedarikçi ürün fiyatı değiştiğinde eski fiyatı geçmişe kaydeder.

```sql
CREATE OR REPLACE FUNCTION fn_tedarikci_fiyat_guncelle()
RETURNS TRIGGER AS $$
BEGIN
    -- Sadece birim_fiyat değiştiğinde çalış
    IF OLD.birim_fiyat IS DISTINCT FROM NEW.birim_fiyat THEN
        -- Eski fiyatın gecerlilik_bitis'ini güncelle
        UPDATE tedarikci_fiyat_gecmisi
        SET gecerlilik_bitis = CURRENT_DATE - INTERVAL '1 day'
        WHERE tedarikci_urun_id = NEW.tedarikci_urun_id
          AND gecerlilik_bitis IS NULL;
        
        -- Yeni fiyat için kayıt oluştur
        INSERT INTO tedarikci_fiyat_gecmisi (
            tedarikci_urun_id, birim_fiyat, gecerlilik_baslangic, olusturma_tarihi, olusturan_kullanici_id
        ) VALUES (
            NEW.tedarikci_urun_id, NEW.birim_fiyat, CURRENT_DATE, CURRENT_TIMESTAMP, NEW.olusturan_kullanici_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tedarikci_fiyat_guncelle
AFTER UPDATE OF varsayilan_fiyat ON tedarikci_urunleri
FOR EACH ROW
EXECUTE FUNCTION fn_tedarikci_fiyat_guncelle();
```

---

## 6. FIFO (First In First Out) Implementasyonu

### 6.1 FIFO Stratejisi

FIFO, stok çıkışlarında **en eski giriş tarihli lotun** önce kullanılmasını sağlar. Bu sayede:
- Ürünlerin son kullanma tarihlerine göre tüketilmesi
- Stok değerinin gerçekçi hesaplanması
- İzlenebilirliğin sağlanması

### 6.2 FIFO Lot Seçim Fonksiyonu

```sql
CREATE OR REPLACE FUNCTION fn_fifo_lot_sec(
    p_urun_id UUID,
    p_miktar DECIMAL(15,3)
)
RETURNS TABLE (
    stok_id UUID,
    lot_no VARCHAR(50),
    mevcut_miktar DECIMAL(15,3),
    kullanilacak_miktar DECIMAL(15,3),
    birim_fiyat DECIMAL(15,4),
    giris_tarihi TIMESTAMP,
    son_kullanma DATE
) AS $$
DECLARE
    v_kalan_miktar DECIMAL(15,3);
BEGIN
    v_kalan_miktar := p_miktar;
    
    -- FIFO sırasına göre lotları seç
    FOR stok_id, lot_no, mevcut_miktar, birim_fiyat, giris_tarihi, son_kullanma IN
        SELECT 
            sk.stok_id,
            sk.lot_no,
            sk.miktar,
            sk.birim_fiyat,
            sk.giris_tarihi,
            sk.son_kullanma
        FROM stok_karti sk
        WHERE sk.urun_id = p_urun_id
          AND sk.durum = 'AKTIF'
          AND sk.silme_tarihi IS NULL
          AND sk.miktar > 0
          AND (sk.son_kullanma IS NULL OR sk.son_kullanma > CURRENT_DATE)
        ORDER BY 
            sk.giris_tarihi ASC,                          -- FIFO: En eski önce
            sk.son_kullanma ASC NULLS LAST                -- Son kullanma yaklaşan önce
    LOOP
        IF v_kalan_miktar <= 0 THEN
            EXIT;
        END IF;
        
        RETURN QUERY SELECT
            stok_id,
            lot_no,
            mevcut_miktar,
            LEAST(v_kalan_miktar, mevcut_miktar),
            birim_fiyat,
            giris_tarihi,
            son_kullanma;
        
        v_kalan_miktar := v_kalan_miktar - mevcut_miktar;
    END LOOP;
    
    -- Yeterli stok yoksa hata fırlat
    IF v_kalan_miktar > 0 THEN
        RAISE EXCEPTION 'Yetersiz stok! Talep: %, Mevcut: %', 
            p_miktar, 
            p_miktar - v_kalan_miktar;
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;
```

### 6.3 FIFO İhlal Uyarı Tetikleyicisi

```sql
CREATE OR REPLACE FUNCTION fn_fifo_ihlal_kontrol()
RETURNS TRIGGER AS $$
DECLARE
    v_ilk_lot_giris TIMESTAMP;
    v_secili_lot_giris TIMESTAMP;
    v_gun_farki INTEGER;
BEGIN
    -- Satış çıkışı için FIFO kontrolü
    IF NEW.hareket_tipi = 'SATIS_CIKIS' THEN
        -- FIFO'ya göre seçilmesi gereken en eski lotun giriş tarihini bul
        SELECT MIN(giris_tarihi) INTO v_ilk_lot_giris
        FROM stok_karti
        WHERE urun_id = (SELECT urun_id FROM stok_karti WHERE stok_id = NEW.stok_id)
          AND durum = 'AKTIF'
          AND silme_tarihi IS NULL
          AND miktar > 0;
        
        -- Kullanılan lotun giriş tarihini bul
        SELECT giris_tarihi INTO v_secili_lot_giris
        FROM stok_karti
        WHERE stok_id = NEW.stok_id;
        
        -- Gün farkını hesapla
        IF v_ilk_lot_giris IS NOT NULL AND v_secili_lot_giris IS NOT NULL THEN
            v_gun_farki := DATE_PART('day', v_secili_lot_giris - v_ilk_lot_giris);
            
            -- 7 günden fazla fark varsa uyarı
            IF v_gun_farki > 7 THEN
                RAISE NOTICE 'FIFO İHLAL UYARISI: Lot % için seçilen lot, FIFO sırasına göre 7 günden fazla geç. İlgili lot: % (giriş: %), FIFO sırası: % (giriş: %)',
                    NEW.lot_no, NEW.stok_id, v_secili_lot_giris, 
                    (SELECT stok_id FROM stok_karti WHERE giris_tarihi = v_ilk_lot_giris LIMIT 1),
                    v_ilk_lot_giris;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fifo_ihlal_kontrol
BEFORE INSERT ON stok_hareketleri
FOR EACH ROW
EXECUTE FUNCTION fn_fifo_ihlal_kontrol();
```

### 6.4 Son Kullanma Yaklaşan Lot Uyarısı

```sql
CREATE OR REPLACE FUNCTION fn_son_kullanma_uyari()
RETURNS TRIGGER AS $$
DECLARE
    v_gun_sayisi INTEGER;
BEGIN
    -- Son kullanma tarihi güncellendiğinde veya yeni lot eklendiğinde kontrol et
    IF NEW.son_kullanma IS NOT NULL THEN
        v_gun_sayisi := NEW.son_kullanma - CURRENT_DATE;
        
        IF v_gun_sayisi <= 0 THEN
            RAISE WARNING 'SON KULLANMA TARİHİ DOLMUŞ: Lot % için son kullanma tarihi geçmiş (% tembi)',
                NEW.lot_no, NEW.son_kullanma;
        ELSIF v_gun_sayisi <= 30 THEN
            RAISE NOTICE 'SON KULLANMA YAKLAŞIYOR: Lot % için son kullanma tarihi % gün sonra dolacak (%)',
                NEW.lot_no, v_gun_sayisi, NEW.son_kullanma;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_son_kullanma_uyari
BEFORE INSERT OR UPDATE OF son_kullanma ON stok_karti
FOR EACH ROW
EXECUTE FUNCTION fn_son_kullanma_uyari();
```

### 6.5 FIFO Rapor Sorgusu

```sql
-- FIFO Uyumsuzluğu Raporu
CREATE VIEW vw_fifo_uyumsuzluk AS
SELECT 
    sk.urun_id,
    u.ad AS urun_ad,
    sk.stok_id,
    sk.lot_no,
    sk.giris_tarihi,
    sk.son_kullanma,
    sk.miktar,
    ROW_NUMBER() OVER (PARTITION BY sk.urun_id ORDER BY sk.giris_tarihi ASC) AS fifo_sira,
    COUNT(*) OVER (PARTITION BY sk.urun_id) AS toplam_lot_sayisi
FROM stok_karti sk
JOIN urunler u ON u.urun_id = sk.urun_id
WHERE sk.durum = 'AKTIF'
  AND sk.silme_tarihi IS NULL
  AND sk.miktar > 0
ORDER BY sk.urun_id, sk.giris_tarihi;

-- Stok Yaşlandırma Raporu
CREATE VIEW vw_stok_yaslandirma AS
SELECT 
    u.ad AS urun_ad,
    u.kategori,
    CASE 
        WHEN CURRENT_DATE - DATE(sk.giris_tarihi) <= 30 THEN '0-30 gün'
        WHEN CURRENT_DATE - DATE(sk.giris_tarihi) <= 90 THEN '31-90 gün'
        WHEN CURRENT_DATE - DATE(sk.giris_tarihi) <= 180 THEN '91-180 gün'
        ELSE '180+ gün'
    END AS yas_araligi,
    SUM(sk.miktar) AS toplam_miktar,
    COUNT(sk.stok_id) AS lot_sayisi
FROM stok_karti sk
JOIN urunler u ON u.urun_id = sk.urun_id
WHERE sk.durum = 'AKTIF'
  AND sk.silme_tarihi IS NULL
GROUP BY u.ad, u.kategori, 
    CASE 
        WHEN CURRENT_DATE - DATE(sk.giris_tarihi) <= 30 THEN '0-30 gün'
        WHEN CURRENT_DATE - DATE(sk.giris_tarihi) <= 90 THEN '31-90 gün'
        WHEN CURRENT_DATE - DATE(sk.giris_tarihi) <= 180 THEN '91-180 gün'
        ELSE '180+ gün'
    END
ORDER BY u.kategori, yas_araligi;
```

---

## 7. Veritabanı Şeması (DDL)

### 7.1 Tablo Oluşturma Sırası

Tablo oluştururken dikkat edilmesi gereken sıra:

```
1.roller
2.kullanicilar
3.tedarikciler
4.urunler
5.urun_ozellikleri
6.musteriler
7.tedarikci_urunleri
8.tedarikci_fiyat_gecmisi
9.tedarikci_performans
10.tedarikci_degerlendirme
11.stok_karti
12.stok_hareketleri
13.lot_ozellikleri
14.lot_fotograf
15.urun_donusum
16.uretim_emri
17.uretim_detay
18.uretim_lot
19.satis_kaydi
20.satis_kalemleri
21.etiket_sablon
22.etiket_alan
23.sistem_ayarlari
24.audit_log
```

### 7.2 Tam DDL Scripti

Aşağıda temel tablo yapıları ve ilişkiler verilmiştir:

```sql
-- ============================================
-- VERITABANI OLUSTURMA SCRIPTI
-- Kurutulmus Meyve ve Bal ERP Sistemi
-- PostgreSQL 15+
-- ============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Benzerlik aramasi icin

-- ============================================
-- TEMEL TABLOLAR
-- ============================================

-- Roller Tablosu
CREATE TABLE roller (
    rol_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad VARCHAR(50) NOT NULL,
    aciklama TEXT,
    yetkiler JSONB NOT NULL DEFAULT '[]',
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Kullanicilar Tablosu
CREATE TABLE kullanicilar (
    kullanici_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kullanici_adi VARCHAR(100) NOT NULL UNIQUE,
    sifre_hash VARCHAR(255) NOT NULL,
    ad VARCHAR(100) NOT NULL,
    soyad VARCHAR(100) NOT NULL,
    eposta VARCHAR(255) NOT NULL UNIQUE,
    rol_id UUID NOT NULL REFERENCES roller(rol_id),
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    son_giris TIMESTAMP,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    telefon VARCHAR(20),
    avatar_url VARCHAR(500),
    bildirim_tercihleri JSONB,
    giris_sayisi INTEGER DEFAULT 0,
    son_sifre_degisikligi TIMESTAMP,
    iki_factor_aktivate BOOLEAN DEFAULT FALSE,
    iki_factor_secret VARCHAR(255),
    varsayilan_depo_id UUID,
    adres TEXT,
    dogum_tarihi DATE,
    bolum VARCHAR(100),
    unvan VARCHAR(100)
);

-- Tedarikciler Tablosu
CREATE TABLE tedarikciler (
    tedarikci_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad VARCHAR(255) NOT NULL,
    vergi_no VARCHAR(20) NOT NULL,
    telefon VARCHAR(20),
    eposta VARCHAR(255),
    adres TEXT,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    faks VARCHAR(20),
    yetkili_kisi VARCHAR(255),
    yetkili_telefon VARCHAR(20),
    yetkili_eposta VARCHAR(255),
    banka_adi VARCHAR(100),
    banka_sube VARCHAR(100),
    hesap_no VARCHAR(50),
    odeme_vadesi INTEGER,
    tedarikci_sinifi VARCHAR(1),
    not TEXT,
    CONSTRAINT tedarikciler_vergi_no_unique UNIQUE (vergi_no) WHERE silme_tarihi IS NULL
);

-- Urunler Tablosu
CREATE TABLE urunler (
    urun_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad VARCHAR(255) NOT NULL,
    kategori VARCHAR(20) NOT NULL CHECK (kategori IN ('MEYVE', 'BAL', 'KARSIM', 'KURUYEMIS', 'SEBZE', 'KURU_BAKLIYAT', 'YAG', 'TURŞU', 'DIGER')),
    birim_toptan VARCHAR(10) NOT NULL,
    birim_perakende VARCHAR(10) NOT NULL,
    varsayilan_ozellikler JSONB,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    stok_kodu VARCHAR(50),
    barkod VARCHAR(50),
    aciklama TEXT,
    gorsel_url VARCHAR(500),
    agirlik DECIMAL(10,3),
    hacim DECIMAL(10,3),
    minimum_stok_seviyesi DECIMAL(15,3),
    maksimum_stok_seviyesi DECIMAL(15,3),
    raf_omru_gun INTEGER
);

-- Urun Ozellikleri Tablosu
CREATE TABLE urun_ozellikleri (
    ozellik_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kategori VARCHAR(20) NOT NULL CHECK (kategori IN ('MEYVE', 'BAL', 'KARSIM', 'TUML')),
    alan_adi VARCHAR(50) NOT NULL,
    goruntu_adi VARCHAR(100) NOT NULL,
    tip VARCHAR(20) NOT NULL CHECK (tip IN ('METIN', 'SAYI', 'ENUM', 'BOOLEAN', 'TARIH')),
    zorunlu BOOLEAN NOT NULL DEFAULT FALSE,
    etikette_goster BOOLEAN NOT NULL DEFAULT FALSE,
    etikette_zorunlu BOOLEAN NOT NULL DEFAULT FALSE,
    siralama INTEGER NOT NULL DEFAULT 0,
    varsayilan_deger VARCHAR(255),
    enum_degerleri JSONB,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP
);

-- Musteriler Tablosu
CREATE TABLE musteriler (
    musteri_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad VARCHAR(255) NOT NULL,
    telefon VARCHAR(20),
    eposta VARCHAR(255),
    adres TEXT,
    vergi_no VARCHAR(20),
    not TEXT,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    stok_kodu VARCHAR(50),
    barkod VARCHAR(50),
    aciklama TEXT,
    gorsel_url VARCHAR(500),
    agirlik DECIMAL(10,3),
    hacim DECIMAL(10,3),
    minimum_stok_seviyesi DECIMAL(15,3),
    maksimum_stok_seviyesi DECIMAL(15,3),
    raf_omru_gun INTEGER
);

-- ============================================
-- STOK TABLOLARI
-- ============================================

-- Stok Karti Tablosu
CREATE TABLE stok_karti (
    stok_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    urun_id UUID NOT NULL REFERENCES urunler(urun_id),
    lot_no VARCHAR(50) NOT NULL,
    tedarikci_id UUID REFERENCES tedarikciler(tedarikci_id),
    kaynak_stok_id UUID REFERENCES stok_karti(stok_id),
    stok_tipi VARCHAR(20) NOT NULL CHECK (stok_tipi IN ('HAMMADDE', 'MAMUL')),
    uretim_tarihi DATE,
    son_kullanma DATE,
    giris_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    miktar DECIMAL(15,3) NOT NULL DEFAULT 0,
    birim VARCHAR(20) NOT NULL,
    birim_fiyat DECIMAL(15,4) NOT NULL DEFAULT 0,
    konum VARCHAR(100),
    durum VARCHAR(20) NOT NULL DEFAULT 'AKTIF' CHECK (durum IN ('AKTIF', 'BITTI', 'IPTAL', 'KALITE_KONTROL', 'DEPO_DISI', 'RET')),
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    kalite_notu INTEGER,
    kalite_kontrol_tarihi TIMESTAMP,
    kalite_kontrol_edildi BOOLEAN DEFAULT FALSE,
    depo VARCHAR(50),
    raf VARCHAR(50),
    blok VARCHAR(50),
    agirlik_birim VARCHAR(20),
    brut_miktar DECIMAL(15,3),
    net_miktar DECIMAL(15,3),
    palet_no VARCHAR(50),
    giris_referans_no VARCHAR(100),
    musteri_id UUID,
    satis_hareket_id UUID,
    CONSTRAINT stok_karti_lot_no_unique UNIQUE (lot_no) WHERE silme_tarihi IS NULL,
    CONSTRAINT stok_karti_miktar_non_negative CHECK (miktar >= 0)
);

-- Stok Hareketleri Tablosu
CREATE TABLE stok_hareketleri (
    hareket_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stok_id UUID NOT NULL REFERENCES stok_karti(stok_id),
    hareket_tipi VARCHAR(30) NOT NULL CHECK (hareket_tipi IN ('GIRIS', 'URETIM_GIRIS', 'URETIM_CIKIS', 'SATIS_CIKIS', 'IADE', 'DUZELTME', 'TRANSFER')),
    miktar DECIMAL(15,3) NOT NULL,
    birim_fiyat DECIMAL(15,4),
    tutar DECIMAL(15,4),
    onceki_miktar DECIMAL(15,3) NOT NULL,
    sonraki_miktar DECIMAL(15,3) NOT NULL,
    referans_id UUID,
    referans_tipi VARCHAR(30),
    aciklama TEXT,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    karsi_stok_id UUID,
    lot_no VARCHAR(50),
    musteri_id UUID,
    tedarikci_id UUID,
    fifo_ihlal_edildi BOOLEAN DEFAULT FALSE,
    fifo_ihlal_nedeni TEXT,
    CONSTRAINT stok_hareketleri_miktar CHECK (miktar != 0),
    CONSTRAINT stok_hareketleri_onceki_sonraki CHECK (sonraki_miktar = onceki_miktar + miktar)
);

-- Lot Ozellikleri Tablosu
CREATE TABLE lot_ozellikleri (
    lot_ozellik_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stok_id UUID NOT NULL REFERENCES stok_karti(stok_id),
    ozellik_id UUID NOT NULL REFERENCES urun_ozellikleri(ozellik_id),
    deger VARCHAR(255) NOT NULL,
    birim VARCHAR(20),
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT lot_ozellikleri_unique UNIQUE (stok_id, ozellik_id)
);

-- Lot Fotograf Tablosu
CREATE TABLE lot_fotograf (
    foto_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stok_id UUID NOT NULL REFERENCES stok_karti(stok_id),
    foto_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500) NOT NULL,
    foto_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    not TEXT,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    stok_kodu VARCHAR(50),
    barkod VARCHAR(50),
    aciklama TEXT,
    gorsel_url VARCHAR(500),
    agirlik DECIMAL(10,3),
    hacim DECIMAL(10,3),
    minimum_stok_seviyesi DECIMAL(15,3),
    maksimum_stok_seviyesi DECIMAL(15,3),
    raf_omru_gun INTEGER
);

-- ============================================
-- TEDARIKCI ILISKILI TABLOLAR
-- ============================================

-- Tedarikci Urunleri Tablosu
CREATE TABLE tedarikci_urunleri (
    tedarikci_urun_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tedarikci_id UUID NOT NULL REFERENCES tedarikciler(tedarikci_id),
    urun_id UUID NOT NULL REFERENCES urunler(urun_id),
    varsayilan_fiyat DECIMAL(15,4),
    minimum_siparis_miktari DECIMAL(15,3),
    teslimat_suresi INTEGER,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    CONSTRAINT tedarikci_urunleri_unique UNIQUE (tedarikci_id, urun_id) WHERE silme_tarihi IS NULL
);

-- Tedarikci Fiyat Gecmisi Tablosu
CREATE TABLE tedarikci_fiyat_gecmisi (
    fiyat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tedarikci_urun_id UUID NOT NULL REFERENCES tedarikci_urunleri(tedarikci_urun_id),
    birim_fiyat DECIMAL(15,4) NOT NULL,
    gecerlilik_baslangic DATE NOT NULL,
    gecerlilik_bitis DATE,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    stok_kodu VARCHAR(50),
    barkod VARCHAR(50),
    aciklama TEXT,
    gorsel_url VARCHAR(500),
    agirlik DECIMAL(10,3),
    hacim DECIMAL(10,3),
    minimum_stok_seviyesi DECIMAL(15,3),
    maksimum_stok_seviyesi DECIMAL(15,3),
    raf_omru_gun INTEGER
);

-- Tedarikci Performans Tablosu
CREATE TABLE tedarikci_performans (
    performans_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tedarikci_id UUID NOT NULL REFERENCES tedarikciler(tedarikci_id),
    donem_baslangic DATE NOT NULL,
    donem_bitis DATE NOT NULL,
    kalite_puani DECIMAL(3,2) NOT NULL CHECK (kalite_puani >= 1 AND kalite_puani <= 5),
    zamaninda_teslimat_orani DECIMAL(5,2) NOT NULL CHECK (zamaninda_teslimat_orani >= 0 AND zamaninda_teslimat_orani <= 100),
    toplam_siparis INTEGER NOT NULL DEFAULT 0,
    sorunlu_siparis INTEGER NOT NULL DEFAULT 0,
    son_degerlendirme_tarihi DATE NOT NULL,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tedarikci Degerlendirme Tablosu
CREATE TABLE tedarikci_degerlendirme (
    degerlendirme_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tedarikci_id UUID NOT NULL REFERENCES tedarikciler(tedarikci_id),
    siparis_id UUID REFERENCES stok_hareketleri(hareket_id),
    kalite_puani INTEGER NOT NULL CHECK (kalite_puani >= 1 AND kalite_puani <= 5),
    yorum TEXT,
    degerlendirme_tarihi DATE NOT NULL,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    stok_kodu VARCHAR(50),
    barkod VARCHAR(50),
    aciklama TEXT,
    gorsel_url VARCHAR(500),
    agirlik DECIMAL(10,3),
    hacim DECIMAL(10,3),
    minimum_stok_seviyesi DECIMAL(15,3),
    maksimum_stok_seviyesi DECIMAL(15,3),
    raf_omru_gun INTEGER
);

-- ============================================
-- URETIM TABLOLARI
-- ============================================

-- Uretim Emri Tablosu
CREATE TABLE uretim_emri (
    uretim_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uretim_no VARCHAR(50) NOT NULL UNIQUE,
    tarih TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    durum VARCHAR(20) NOT NULL DEFAULT 'BEKLEMEDE' CHECK (durum IN ('BEKLEMEDE', 'ONAYLANDI', 'TAMAMLANDI', 'IPTAL')),
    planlanan_tarih DATE,
    tamamlama_tarihi TIMESTAMP,
    not TEXT,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    stok_kodu VARCHAR(50),
    barkod VARCHAR(50),
    aciklama TEXT,
    gorsel_url VARCHAR(500),
    agirlik DECIMAL(10,3),
    hacim DECIMAL(10,3),
    minimum_stok_seviyesi DECIMAL(15,3),
    maksimum_stok_seviyesi DECIMAL(15,3),
    raf_omru_gun INTEGER
);

-- Uretim Detay Tablosu
CREATE TABLE uretim_detay (
    detay_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uretim_id UUID NOT NULL REFERENCES uretim_emri(uretim_id),
    mamul_urun_id UUID NOT NULL REFERENCES urunler(urun_id),
    mamul_miktar DECIMAL(15,3) NOT NULL,
    mamul_birim VARCHAR(20) NOT NULL,
    hammadde_urun_id UUID NOT NULL REFERENCES urunler(urun_id),
    hammadde_lot_no VARCHAR(50) NOT NULL,
    hammadde_stok_id UUID NOT NULL REFERENCES stok_karti(stok_id),
    hammadde_miktar DECIMAL(15,3) NOT NULL,
    fire_miktari DECIMAL(15,3) NOT NULL DEFAULT 0,
    hammadde_birim VARCHAR(20) NOT NULL,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Uretim Lot Tablosu
CREATE TABLE uretim_lot (
    uretim_lot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uretim_id UUID NOT NULL REFERENCES uretim_emri(uretim_id),
    mamul_stok_id UUID NOT NULL REFERENCES stok_karti(stok_id),
    kaynak_lot_bilgisi JSONB NOT NULL,
    uretim_tarihi DATE NOT NULL,
    son_kullanma_tarihi DATE NOT NULL,
    toplam_giris_miktari DECIMAL(15,3) NOT NULL,
    toplam_cikis_miktari DECIMAL(15,3) NOT NULL,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SATIS TABLOLARI
-- ============================================

-- Satis Kaydi Tablosu
CREATE TABLE satis_kaydi (
    satis_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    satis_no VARCHAR(50) NOT NULL UNIQUE,
    musteri_id UUID NOT NULL REFERENCES musteriler(musteri_id),
    tarih TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    durum VARCHAR(20) NOT NULL DEFAULT 'TAMAMLANDI' CHECK (durum IN ('TAMAMLANDI', 'IPTAL', 'IADE')),
    toplam_tutar DECIMAL(15,4) NOT NULL DEFAULT 0,
    indirim_tutari DECIMAL(15,4) DEFAULT 0,
    not TEXT,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    stok_kodu VARCHAR(50),
    barkod VARCHAR(50),
    aciklama TEXT,
    gorsel_url VARCHAR(500),
    agirlik DECIMAL(10,3),
    hacim DECIMAL(10,3),
    minimum_stok_seviyesi DECIMAL(15,3),
    maksimum_stok_seviyesi DECIMAL(15,3),
    raf_omru_gun INTEGER
);

-- Satis Kalemleri Tablosu
CREATE TABLE satis_kalemleri (
    kalem_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    satis_id UUID NOT NULL REFERENCES satis_kaydi(satis_id),
    urun_id UUID NOT NULL REFERENCES urunler(urun_id),
    stok_id UUID NOT NULL REFERENCES stok_karti(stok_id),
    lot_no VARCHAR(50) NOT NULL,
    miktar DECIMAL(15,3) NOT NULL,
    birim VARCHAR(20) NOT NULL,
    birim_fiyat DECIMAL(15,4) NOT NULL,
    tutar DECIMAL(15,4) NOT NULL,
    indirim_orani DECIMAL(5,2),
    indirim_tutari DECIMAL(15,4),
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ETIKET TABLOLARI
-- ============================================

-- Etiket Sablon Tablosu
CREATE TABLE etiket_sablon (
    sablon_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad VARCHAR(100) NOT NULL,
    tur VARCHAR(20) NOT NULL CHECK (tur IN ('MAL_ALIM', 'URETIM', 'SATIS', 'GENEL')),
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    etiket_boyut VARCHAR(20) NOT NULL DEFAULT 'STANDART' CHECK (etiket_boyut IN ('STANDART', 'BUYUK', 'MINI')),
    barkod_format VARCHAR(20) NOT NULL DEFAULT 'CODE128' CHECK (barkod_format IN ('CODE128', 'QR', 'EAN13')),
    varsayilan BOOLEAN NOT NULL DEFAULT FALSE,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    stok_kodu VARCHAR(50),
    barkod VARCHAR(50),
    aciklama TEXT,
    gorsel_url VARCHAR(500),
    agirlik DECIMAL(10,3),
    hacim DECIMAL(10,3),
    minimum_stok_seviyesi DECIMAL(15,3),
    maksimum_stok_seviyesi DECIMAL(15,3),
    raf_omru_gun INTEGER
);

-- Etiket Alan Tablosu
CREATE TABLE etiket_alan (
    alan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sablon_id UUID NOT NULL REFERENCES etiket_sablon(sablon_id),
    alan_tipi VARCHAR(30) NOT NULL CHECK (alan_tipi IN ('SabitMetin', 'UrunAdi', 'LotNo', 'Tarih', 'Miktar', 'Tedarikci', 'OzelAlan', 'Barkod', 'QRCode', 'Fotograf')),
    goruntu_metni VARCHAR(100) NOT NULL,
    deger VARCHAR(255),
    ozellik_id UUID REFERENCES urun_ozellikleri(ozellik_id),
    zorunlu BOOLEAN NOT NULL DEFAULT TRUE,
    varsayilan_alan BOOLEAN NOT NULL DEFAULT FALSE,
    konum_x INTEGER NOT NULL DEFAULT 0,
    konum_y INTEGER NOT NULL DEFAULT 0,
    boyut_en INTEGER NOT NULL DEFAULT 100,
    boyut_boy INTEGER NOT NULL DEFAULT 50,
    yazi_boyut INTEGER NOT NULL DEFAULT 10,
    siralama INTEGER NOT NULL DEFAULT 0,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DESTEKLEYICI TABLOLAR
-- ============================================

-- Urun Donusum Tablosu
CREATE TABLE urun_donusum (
    donusum_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mamul_urun_id UUID NOT NULL REFERENCES urunler(urun_id),
    hammadde_urun_id UUID NOT NULL REFERENCES urunler(urun_id),
    donusum_orani DECIMAL(10,4) NOT NULL,
    fire_orani DECIMAL(5,4) NOT NULL DEFAULT 0,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    birim VARCHAR(20),
    baslangic_tarihi DATE,
    bitis_tarihi DATE,
    aciklama TEXT,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    CONSTRAINT urun_donusum_unique UNIQUE (mamul_urun_id, hammadde_urun_id) WHERE silme_tarihi IS NULL
);

-- Sistem Ayarlari Tablosu
CREATE TABLE sistem_ayarlari (
    ayar_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ayar_adi VARCHAR(100) NOT NULL UNIQUE,
    deger TEXT NOT NULL,
    veri_tipi VARCHAR(20) NOT NULL CHECK (veri_tipi IN ('STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'JSON')),
    aciklama TEXT,
    kategori VARCHAR(50) NOT NULL CHECK (kategori IN ('GENEL', 'STOK', 'URETIM', 'SATIS', 'ETIKET')),
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log Tablosu
CREATE TABLE audit_log (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tablo_adi VARCHAR(100) NOT NULL,
    kayit_id UUID NOT NULL,
    islem_tipi VARCHAR(20) NOT NULL CHECK (islem_tipi IN ('INSERT', 'UPDATE', 'DELETE')),
    eski_deger JSONB,
    yeni_deger JSONB,
    ip_adresi VARCHAR(45),
    kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXLER
-- ============================================

-- FIFO icin kritik indeksler
CREATE INDEX idx_stok_karti_fifo ON stok_karti(urun_id, giris_tarihi, son_kullanma) WHERE durum = 'AKTIF' AND miktar > 0;
CREATE INDEX idx_stok_karti_son_kullanma ON stok_karti(son_kullanma) WHERE durum = 'AKTIF' AND silme_tarihi IS NULL;
CREATE INDEX idx_stok_karti_urun_giris_tarih ON stok_karti(urun_id, giris_tarihi) WHERE durum = 'AKTIF' AND silme_tarihi IS NULL;

-- Foreign key indeksleri
CREATE INDEX idx_stok_hareketleri_stok_id ON stok_hareketleri(stok_id);
CREATE INDEX idx_stok_hareketleri_hareket_tipi ON stok_hareketleri(hareket_tipi);
CREATE INDEX idx_stok_hareketleri_tarih ON stok_hareketleri(olusturma_tarihi);
CREATE INDEX idx_satis_kalemleri_satis_id ON satis_kalemleri(satis_id);
CREATE INDEX idx_satis_kalemleri_stok_id ON satis_kalemleri(stok_id);
CREATE INDEX idx_satis_kaydi_musteri_id ON satis_kaydi(musteri_id);
CREATE INDEX idx_satis_kaydi_tarih ON satis_kaydi(tarih);
CREATE INDEX idx_uretim_detay_uretim_id ON uretim_detay(uretim_id);
CREATE INDEX idx_uretim_emri_durum ON uretim_emri(durum);
CREATE INDEX idx_lot_ozellikleri_stok_id ON lot_ozellikleri(stok_id);
CREATE INDEX idx_audit_log_tablo_kayit ON audit_log(tablo_adi, kayit_id);
CREATE INDEX idx_audit_log_tarih ON audit_log(olusturma_tarihi);
```

---

## 8. İlişki Özeti

### 8.1 Varlık İlişkileri Matrisi

| Kaynak Tablo | Hedef Tablo | İlişki Tipi | Açıklama |
|--------------|-------------|-------------|----------|
| tedarikciler | tedarikci_urunleri | 1:N | Bir tedarikçi birden fazla ürün tedarik edebilir |
| tedarikci_urunleri | tedarikci_fiyat_gecmisi | 1:N | Her tedarikçi-ürün ilişkisinin fiyat geçmişi olabilir |
| tedarikciler | tedarikci_performans | 1:N | Her tedarikçinin performans kaydı olabilir |
| tedarikciler | stok_karti | 1:N | Bir tedarikçiden birden fazla lot girişi olabilir |
| urunler | tedarikci_urunleri | 1:N | Bir ürün birden fazla tedarikçiden alınabilir |
| urunler | stok_karti | 1:N | Bir ürünün birden fazla lotu olabilir |
| urunler | urun_donusum | 1:N (mamul) | Bir mamulün birden fazla dönüşüm oranı olabilir |
| urunler | satis_kalemleri | 1:N | Bir ürün birden fazla satış kaleminde yer alabilir |
| urun_ozellikleri | lot_ozellikleri | 1:N | Bir özellik birden fazla lotta tanımlanabilir |
| musteriler | satis_kaydi | 1:N | Bir müşterinin birden fazla satış kaydı olabilir |
| satis_kaydi | satis_kalemleri | 1:N | Bir satışın birden fazla kalemi olabilir |
| satis_kalemleri | stok_karti | N:1 | Satış kalemi bir lot/stok kartına bağlı |
| stok_karti | stok_hareketleri | 1:N | Bir lotun birden fazla hareketi olabilir |
| stok_karti | lot_ozellikleri | 1:N | Bir lotun birden fazla özelliği olabilir |
| stok_karti | lot_fotograf | 1:N | Bir lotun birden fazla fotoğrafı olabilir |
| stok_karti | stok_karti | 1:1 (self) | Mamul lot → kaynak hammadde lotu |
| uretim_emri | uretim_detay | 1:N | Bir üretim emrinin birden fazla detayı olabilir |
| uretim_detay | urunler | N:1 (mamul) | Üretim detayında mamul ürün |
| uretim_detay | urunler | N:1 (hammadde) | Üretim detayında hammadde ürün |
| uretim_emri | uretim_lot | 1:N | Bir üretim emri birden fazla lot oluşturabilir |
| etiket_sablon | etiket_alan | 1:N | Bir şablonun birden fazla alanı olabilir |
| roller | kullanicilar | 1:N | Bir rol birden fazla kullanıcıya atanabilir |
| kullanicilar | audit_log | 1:N | Bir kullanıcının birden fazla audit kaydı olabilir |

### 8.2 Çoka Çok (N:N) İlişkiler

| İlişki | Ara Tablo |
|--------|-----------|
| Tedarikçi ↔ Ürün | tedarikci_urunleri |
| Mamul ↔ Hammadde (dönüşüm) | urun_donusum |
| Lot ↔ Özellik | lot_ozellikleri |

---

## 9. Veri Sözlüğü

### 9.1_ENUM Değerleri

| Alan | Geçerli Değerler |
|------|------------------|
| `urunler.kategori` | MEYVE, BAL, KARSIM, KURUYEMIS, SEBZE, KURU_BAKLIYAT, YAG, TURŞU, DIGER |
| `stok_karti.stok_tipi` | HAMMADDE, MAMUL |
| `stok_karti.durum` | AKTIF, BITTI, IPTAL, KALITE_KONTROL, DEPO_DISI, RET |
| `stok_hareketleri.hareket_tipi` | GIRIS, URETIM_GIRIS, URETIM_CIKIS, SATIS_CIKIS, IADE, DUZELTME, TRANSFER |
| `satis_kaydi.durum` | TAMAMLANDI, IPTAL, IADE |
| `satis_kaydi.odeme_sekli` | NAKIT, CEK, HAVALE, KREDI_KARTI, KAPIDA_ODEME |
| `satis_kaydi.odeme_durumu` | BEKLIYOR, ODENDI, KISMEN_ODENDI, VADE_GECIKTI |
| `satis_kaydi.satis_tipi` | PERAKENDE, TOPTAN, OZEL_SIPARIS |
| `uretim_emri.oncelik` | DUSUK, NORMAL, YUKSEK, ACIL |
| `musteriler.musteri_tipi` | BIREYSEL, KURUMSAL |
| `musteriler.cinsiyet` | E, K, D |
| `tedarikciler.tedarikci_sinifi` | A, B, C |
| `musteriler.musteri_sinifi` | A, B, C |
| `uretim_emri.durum` | BEKLEMEDE, ONAYLANDI, TAMAMLANDI, IPTAL |
| `urun_ozellikleri.tip` | METIN, SAYI, ENUM, BOOLEAN, TARIH |
| `etiket_sablon.tur` | MAL_ALIM, URETIM, SATIS, GENEL |
| `etiket_sablon.etiket_boyut` | STANDART, BUYUK, MINI |
| `etiket_sablon.barkod_format` | CODE128, QR, EAN13 |
| `etiket_alan.alan_tipi` | SabitMetin, UrunAdi, LotNo, Tarih, Miktar, Tedarikci, OzelAlan, Barkod, QRCode, Fotograf |
| `sistem_ayarlari.veri_tipi` | STRING, INTEGER, DECIMAL, BOOLEAN, JSON |
| `sistem_ayarlari.kategori` | GENEL, STOK, URETIM, SATIS, ETIKET |

---

## 10. Güvenlik Notları

### 10.1 Şifre Güvenliği
- Şifreler bcrypt ile hash'lenerek saklanmalı (`sifre_hash`)
- Minimum 12 karakter, karmaşıklık gereksinimi uygulanmalı (bkz. SRS Bölüm 7.1)

### 10.2 Erişim Kontrolü
- Roller tablosu üzerinden yetki listesi tanımlı
- Audit log ile tüm değişiklikler takip edilmeli
- Soft delete ile veri kaybı önlenmeli

### 10.3 Veri Koruma
- Hassas alanlar (eposta, telefon, vergi_no) için ek şifreleme düşünülebilir
- Audit log'da eski/yeni değerler JSONB olarak saklanır

---

**Sonraki Adımlar:**
1. Bu tasarımın SRS ile doğrulanması
2. Gerekli görülen düzeltmelerin yapılması
3. Fiziksel tasarım (tablespace, partitioning) kararları
4. Migration script'lerinin hazırlanması
