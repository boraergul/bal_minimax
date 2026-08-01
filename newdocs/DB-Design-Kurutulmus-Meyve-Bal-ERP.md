# Veritabanı Tasarım Dokümanı
## Kurutulmuş Meyve ve Bal Yönetim Sistemi (ERP)

---

**Versiyon:** 1.2  
**Tarih:** 2026-07-29  
**Durum:** Tamamlandı  
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
CONSTRAINT tedarikciler_vergi_no_unique EXCLUDE (vergi_no WITH =) WHERE (silme_tarihi IS NULL);
CONSTRAINT tedarikciler_eposta_unique EXCLUDE (eposta WITH =) WHERE (silme_tarihi IS NULL AND eposta IS NOT NULL);
```

---

#### 3.1.2 `kullanicilar` — Kullanıcı Yönetimi

| Alan | Tip | Zorunlu | Açıklama |
||------|-----|---------|----------|
|| `kullanici_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
|| `kullanici_adi` | VARCHAR(100) | ✓ | Benzersiz kullanıcı adı |
|| `sifre_hash` | VARCHAR(255) | ✓ | bcrypt hash'li şifre |
|| `ad` | VARCHAR(100) | ✓ | Ad |
|| `soyad` | VARCHAR(100) | ✓ | Soyad |
|| `eposta` | VARCHAR(255) | ✓ | E-posta (unique) |
|| `rol_id` | UUID | ✓ | Rol referansı (FK → roller) |
|| `aktif` | BOOLEAN | ✓ | Aktif/Pasif durum |
|| `son_giris` | TIMESTAMP | Hayır | Son başarılı giriş |
|| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
|| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
|| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |
|| `telefon` | VARCHAR(20) | Hayır | Kullanıcı telefonu (bildirimler için) |
|| `avatar_url` | VARCHAR(500) | Hayır | Profil fotoğrafı |
|| `bildirim_tercihleri` | JSONB | Hayır | E-posta, SMS, uygulama bildirim tercihleri |
|| `giris_sayisi` | INTEGER | Hayır | Toplam giriş sayısı |
|| `son_sifre_degisikligi` | TIMESTAMP | Hayır | Son şifre değişikliği tarihi |
|| `iki_factor_aktivate` | BOOLEAN | Hayır | İki faktörlü doğrulama aktif mi? (varsayılan: FALSE) |
|| `iki_factor_secret` | VARCHAR(255) | Hayır | TOTP secret (şifrelenmiş, AES-256) |
|| `iki_factor_secret_encrypted` | BOOLEAN | ✓ | Secret'ın şifrelenmiş olup olmadığı (varsayılan: TRUE) |
|| `mfa_olusturma_tarihi` | TIMESTAMP | Hayır | MFA'nın etkinleştirildiği tarih |
|| `mfa_zorunlu` | BOOLEAN | ✓ | Bu kullanıcı için MFA zorunlu mu? (rol bazlı, varsayılan: FALSE) |
|| `mfa_gecis_suresi_dakika` | INTEGER | Hayır | MFA kurulumu için verilen süre (dakika, -1 = süresiz) |
|| `yedek_kodlari_hash` | TEXT | Hayır | 10 yedek kodun hash'lenmiş hali (JSONB array) |
|| `son_yedek_kod_uretim` | TIMESTAMP | Hayır | Son yedek kod üretim tarihi |
|| `varsayilan_depo_id` | UUID | Hayır | Kullanıcının varsayılan deposu |
|| `adres` | TEXT | Hayır | Kullanıcı adresi |
|| `dogum_tarihi` | DATE | Hayır | Doğum tarihi |
|| `bolum` | VARCHAR(100) | Hayır | Departman/bölüm |
|| `unvan` | VARCHAR(100) | Hayır | İş unvanı |

**Ek Kısıtlamalar:**
```sql
-- MFA zorunlu roller için otomatik ayarlama trigger'ı
CREATE TRIGGER trg_mfa_zorunlu_rol
BEFORE INSERT OR UPDATE ON kullanicilar
FOR EACH ROW
EXECUTE FUNCTION fn_mfa_zorunlu_ayarla();

-- Şifrelenmiş TOTP secret için AES-256-GCM kullanılır
-- Anahtar: HashiCorp Vault transit engine'den temin edilir
```

**İndeksler:**
```sql
CREATE INDEX idx_kullanicilar_mfa_aktivate ON kullanicilar(iki_factor_aktivate) WHERE iki_factor_aktivate = TRUE;
CREATE INDEX idx_kullanicilar_mfa_zorunlu ON kullanicilar(mfa_zorunlu) WHERE mfa_zorunlu = TRUE;
```

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
| `kategori` | VARCHAR(20) | ✓ | MEYVE, BAL, MAMUL, KARSIM, KURUYEMIS, SEBZE, KURU_BAKLIYAT, YAG, TURSU, DIGER |
| `birim_toptan` | VARCHAR(10) | ✓ | kg, ton |
| `birim_perakende` | VARCHAR(10) | ✓ | kg, gram, adet, paket |
| `varsayilan_ozellikler` | JSONB | Hayır | Kategoriye göre varsayılan özellik listesi |
| `aktif` | BOOLEAN | ✓ | Aktif/Pasif durum |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |
| `stok_kodu` | VARCHAR(50) | Hayır | SKU (Stock Keeping Unit) numarası |
| `hammadde_id` | UUID | Hayır | Mamulün temel ham madde ürünü (self-FK → urunler.urun_id); yalnızca MAMUL için zorunlu |
| `barkod` | VARCHAR(50) | Hayır | Ürün barkod numarası (EAN-13, UPC vb.) |
| `aciklama` | TEXT | Hayır | Ürün hakkında detaylı açıklama |
| `gorsel_url` | VARCHAR(500) | Hayır | Ürün fotoğrafı |
| `agirlik` | DECIMAL(10,3) | Hayır | Paket ağırlığı (gram) |
| `hacim` | DECIMAL(10,3) | Hayır | Paket hacmi (cm³) |
| `minimum_stok_seviyesi` | DECIMAL(15,3) | Hayır | Minimum stok uyarı seviyesi |
| `maksimum_stok_seviyesi` | DECIMAL(15,3) | Hayır | Maksimum stok limiti |
| `raf_omru_gun` | INTEGER | Hayır | Gün cinsinden raf ömrü |

**Ek Kısıtlamalar ve İlişkiler:**
```sql
ALTER TABLE urunler ADD CONSTRAINT urunler_hammadde_fk FOREIGN KEY (hammadde_id) REFERENCES urunler(urun_id);
ALTER TABLE urunler ADD CONSTRAINT urunler_mamul_hammadde_check CHECK ((kategori = 'MAMUL' AND hammadde_id IS NOT NULL) OR (kategori <> 'MAMUL' AND hammadde_id IS NULL));
```
- `stok_kodu` iş kuralı: `{KATEGORI_PREFIX}-{URUN_KISALTMASI}-{BOYUT}`; mamullerde prefix bağlı ham maddenin kategorisinden türetilir.
- `stok_kodu` aktif kayıtlar arasında benzersiz olmalıdır.

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
| `teslimat_adresi` | TEXT | Hayır | Müşterinin ürün teslimat adresi |
| `il` | VARCHAR(50) | Hayır | Adresin iller bazında sınıflandırılması |
| `ilce` | VARCHAR(50) | Hayır | Adresin ilçe bazında sınıflandırılması |
| `posta_kodu` | VARCHAR(10) | Hayır | Posta kodu bilgisi |
| `musteri_sinifi` | VARCHAR(1) | Hayır | Müşteri sınıflandırması ('A','B','C') |

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

**İzlenebilirlik Kuralı:** Üretim tamamlanırken mamul stok kartının `kaynak_stok_id` değeri tüketilen birincil hammadde stok kartına, `tedarikci_id` değeri ise kaynak hammadde lotunun tedarikçisine atomik olarak yazılır. Birden çok kaynak lot varsa bütün kaynaklar `uretim_lot.kaynak_lot_bilgisi` JSONB alanında tutulur.

**Kısıtlamalar:
```sql
CONSTRAINT stok_karti_miktar_non_negative CHECK (miktar >= 0);
CONSTRAINT stok_karti_lot_no_unique EXCLUDE (lot_no WITH =) WHERE (silme_tarihi IS NULL);
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
CONSTRAINT tedarikci_urunleri_unique EXCLUDE (tedarikci_id WITH =, urun_id WITH =) WHERE (silme_tarihi IS NULL);
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

|| Alan | Tip | Zorunlu | Açıklama |
||------|-----|---------|----------|
|| `uretim_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
|| `uretim_no` | VARCHAR(50) | ✓ | Üretim emri numarası (URET-YYYYMMDD-XXX) |
|| `tarih` | TIMESTAMP | ✓ | Emrin oluşturulma tarihi |
|| `durum` | VARCHAR(20) | ✓ | BEKLEMEDE, ONAYLANDI, TAMAMLANDI, IPTAL |
|| `planlanan_tarih` | DATE | Hayır | Planlanan üretim tarihi |
|| `tamamlama_tarihi` | TIMESTAMP | Hayır | Fiili tamamlama tarihi |
|| `not` | TEXT | Hayır | Üretim notları |
|| `gerceklesen_miktar` | DECIMAL(15,3) | Hayır | Fiili üretim miktarı; üretim tamamlanana kadar NULL |
|| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
|| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
|| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |
|| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

> **Not:** Bu tablo **yalnızca** üretim emri başlık bilgisini içerir. Mamul bilgisi `uretim_detay` tablosunda (FK → `urunler.urun_id`), ürün katalog özellikleri (`stok_kodu`, `barkod`, `agirlik`, `minimum_stok_seviyesi`, `raf_omru_gun` vb.) `urunler` tablosunda tanımlıdır. Buraya kopyalanmaz. Kopyala-yapıştır bug'ı 2026-07-30 audit raporu ile giderildi.

**Unique Constraint:**
```sql
CONSTRAINT uretim_emri_no_unique EXCLUDE (uretim_no WITH =) WHERE (silme_tarihi IS NULL);
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
CONSTRAINT satis_kaydi_no_unique EXCLUDE (satis_no WITH =) WHERE (silme_tarihi IS NULL);
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

#### 3.7.1 `sistem_ayarlari` — Sistem Yapılandırması

| Alan | Tip | Zorunlu | Açıklama |
||------|-----|---------|----------|
|| `ayar_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
|| `ayar_adi` | VARCHAR(100) | ✓ | Ayar adı (unique) |
|| `deger` | TEXT | ✓ | Ayar değeri |
|| `veri_tipi` | VARCHAR(20) | ✓ | STRING, INTEGER, DECIMAL, BOOLEAN, JSON |
|| `aciklama` | TEXT | Hayır | Ayar açıklaması |
|| `kategori` | VARCHAR(50) | ✓ | GENEL, STOK, URETIM, SATIS, ETIKET |
|| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
|| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |

**Unique Constraint:**
```sql
CONSTRAINT sistem_ayarlari_adi_unique UNIQUE (ayar_adi);
```

---

#### 3.7.2 `audit_log` — Denetim Günlüğü

| Alan | Tip | Zorunlu | Açıklama |
||------|-----|---------|----------|
|| `log_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
|| `tablo_adi` | VARCHAR(100) | ✓ | İşlem yapılan tablo |
|| `kayit_id` | UUID | ✓ | İşlem yapılan kayıt ID |
|| `islem_tipi` | VARCHAR(20) | ✓ | INSERT, UPDATE, DELETE |
|| `eski_deger` | JSONB | Hayır | Güncelleme öncesi değerler |
|| `yeni_deger` | JSONB | Hayır | Güncelleme sonrası değerler |
|| `ip_adresi` | VARCHAR(45) | Hayır | İşlem yapan IP |
|| `kullanici_id` | UUID | ✓ | İşlem yapan kullanıcı (FK → kullanicilar) |
|| `olusturma_tarihi` | TIMESTAMP | ✓ | İşlem tarihi |

**İlişkiler:**
- `kullanici_id` → `kullanicilar(kullanici_id)` (Many-to-One)

---

### 3.8 Yeni Ek Tablolar

---

#### 3.8.1 `fifo_ihlal_onay` — FIFO İhlal Onay Kaydı

| Alan | Tip | Zorunlu | Açıklama |
||------|-----|---------|----------|
|| `onay_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
|| `hareket_id` | UUID | ✓ | İhlal eden hareket referansı (FK → stok_hareketleri) |
|| `onay_durumu` | VARCHAR(20) | ✓ | BEKLEMEDE, ONAYLANDI, REDDEDILDI |
|| `onay_tarihi` | TIMESTAMP | Hayır | Onay/red tarihi |
|| `onaylayan_kullanici_id` | UUID | ✓ | Onaylayan kullanıcı (FK → kullanicilar) |
|| `onay_nedeni` | TEXT | Hayır | İhlal onay nedeni |
|| `red_nedeni` | TEXT | Hayır | Reddetme nedeni |
|| `fark_gun_sayisi` | INTEGER | ✓ | FIFO'ya göre kaç gün geç kalındı |
|| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
|| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |

**İlişkiler:**
- `hareket_id` → `stok_hareketleri(hareket_id)` (Many-to-One)
- `onaylayan_kullanici_id` → `kullanicilar(kullanici_id)` (Many-to-One)

**Kısıtlamalar:**
```sql
CONSTRAINT fifo_ihlal_onay_durum CHECK (onay_durumu IN ('BEKLEMEDE', 'ONAYLANDI', 'REDDEDILDI'));
```

---

#### 3.8.2 `kalite_kontrol` — Kalite Kontrol Kaydı

| Alan | Tip | Zorunlu | Açıklama |
||------|-----|---------|----------|
|| `kontrol_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
|| `stok_id` | UUID | ✓ | Kontrol edilen lot (FK → stok_karti) |
|| `kontrol_tarihi` | TIMESTAMP | ✓ | Kontrol tarihi |
|| `kontrol_turu` | VARCHAR(20) | ✓ | GIRIS, CIKIS, PERIYODIK, SEBEBEP |
|| `sonuc` | VARCHAR(20) | ✓ | GECTI, KALDI, RET |
|| `kontrol_edilen_miktar` | DECIMAL(15,3) | ✓ | Kontrol edilen miktar |
|| `birim` | VARCHAR(20) | ✓ | Kontrol birimi |
|| `olusturan_kullanici_id` | UUID | ✓ | Kontrolü yapan (FK → kullanicilar) |
|| `not` | TEXT | Hayır | Kontrol notları |
|| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
|| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
|| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |

**İlişkiler:**
- `stok_id` → `stok_karti(stok_id)` (Many-to-One)
- `olusturan_kullanici_id` → `kullanicilar(kullanici_id)` (Many-to-One)

**Kısıtlamalar:**
```sql
CONSTRAINT kalite_kontrol_turu CHECK (kontrol_turu IN ('GIRIS', 'CIKIS', 'PERIYODIK', 'SEBEBEP'));
CONSTRAINT kalite_kontrol_sonuc CHECK (sonuc IN ('GECTI', 'KALDI', 'RET'));
```

---

#### 3.8.3 Üretim Maliyet Modeli — Ebeveyn/Detay İlişkisi

> **Kanonik Karar (2026-07-30 audit raporu 1.8):** `uretim_maliyet` özet/ana tablodur; maliyet bileşenleri (`uretim_iscilik`, `uretim_enerji`, `uretim_bakim`, `uretim_genel_gider`) detay tablolarıdır. Malzeme maliyeti 5. bileşendir ve `stok_hareketleri` kayıtlarından **hesaplanır** (ek tablo yok). Ebeveyn-detay modeli, **alternatif modeller değildir**: tüm bileşenler aynı `uretim_id` altında toplanır ve `toplam_maliyet` ebeveyn tabloda trigger ile güncellenir. Tek tablo yerine bu hiyerarşi kullanılır çünkü:
>
> 1. Her bileşenin kendine özgü detay alanları var (örn. `uretim_enerji.enerji_turu`, `uretim_genel_gider.dagitim_yontemi`).
> 2. Bileşenler zaman içinde birikerek eklenir; tek satırda güncelleme yapılamaz.
> 3. `malzeme_maliyeti` `stok_hareketleri`'nden hesaplanır (URETIM_CIKIS hareketlerinin `birim_fiyat * |miktar|` toplamı).

##### `uretim_maliyet` (ebeveyn özet)

|| Alan | Tip | Zorunlu | Açıklama |
||------|-----|---------|----------|
|| `maliyet_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
|| `uretim_id` | UUID | ✓ | Üretim emri referansı (FK → uretim_emri), UNIQUE per uretim |
|| `malzeme_maliyeti` | DECIMAL(15,4) | ✓ | Hesaplanan (stok_hareketleri'nden, URETIM_CIKIS) |
|| `iscilik_maliyeti` | DECIMAL(15,4) | ✓ | SUM(uretim_iscilik.toplam_tutar) |
|| `enerji_maliyeti` | DECIMAL(15,4) | Hayır | SUM(uretim_enerji.toplam_maliyet) |
|| `bakim_maliyeti` | DECIMAL(15,4) | Hayır | SUM(uretim_bakim.toplam_tutar) |
|| `genel_gider_maliyeti` | DECIMAL(15,4) | Hayır | SUM(uretim_genel_gider.tutar) |
|| `diger_maliyetler` | DECIMAL(15,4) | Hayır | Diğer manuel giderler |
|| `toplam_maliyet` | DECIMAL(15,4) | ✓ | Beş bileşenin toplamı (trigger ile) |
|| `birim` | VARCHAR(20) | ✓ | TRY (kapsam dışı bilgi ama tek para birimi) |
|| `maliyet_donemi` | DATE | ✓ | Maliyet hesaplama dönemi |
|| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
|| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
|| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |

**İlişkiler:**
- `uretim_id` → `uretim_emri(uretim_id)` (Many-to-One, **UNIQUE** — her emrin tek özet maliyeti)

**Kısıtlamalar:**
```sql
CONSTRAINT uretim_maliyet_uretim_unique UNIQUE (uretim_id);
CONSTRAINT uretim_maliyet_non_negative CHECK (
    malzeme_maliyeti >= 0 AND
    iscilik_maliyeti >= 0 AND
    enerji_maliyeti >= 0 AND
    bakim_maliyeti >= 0 AND
    genel_gider_maliyeti >= 0 AND
    diger_maliyetler >= 0 AND
    toplam_maliyet >= 0
);
```

**Detay Tabloları (ebeveyn-detay modeli):**
- `uretim_iscilik(emir_id, ...)` — işçilik bileşeni
- `uretim_enerji(emir_id, ...)` — enerji bileşeni
- `uretim_bakim(emir_id, ...)` — bakım bileşeni
- `uretim_genel_gider(emir_id, ...)` — genel gider bileşeni
- (malzeme bileşeni: `stok_hareketleri` üzerinden URETIM_CIKIS toplamından hesaplanır)

**Trigger / Hesaplama Notu (kanonik 5.4):** Üretim tamamlama transaction servis katmanında tek orkestrasyonla yürütülür; `uretim_maliyet` satırı INSERT veya UPSERT ile (uretim_id) oluşturulur/güncellenir ve maliyet fonksiyonu **idempotent** olmalıdır. Birden fazla çağrıda aynı sonucu üretir (aynı kaynak veriden aynı toplamı hesaplar). DB trigger'ı `toplam_maliyet` alanını bileşen tablolarındaki değişikliklerden otomatik günceller; trigger ek bir hesaplama yapmaz, sadece bileşenleri toplar.

```sql
CREATE OR REPLACE FUNCTION fn_uretim_maliyet_toplam_hesapla()
RETURNS TRIGGER AS $$
BEGIN
    NEW.toplam_maliyet := COALESCE(NEW.malzeme_maliyeti, 0)
                         + COALESCE(NEW.iscilik_maliyeti, 0)
                         + COALESCE(NEW.enerji_maliyeti, 0)
                         + COALESCE(NEW.bakim_maliyeti, 0)
                         + COALESCE(NEW.genel_gider_maliyeti, 0)
                         + COALESCE(NEW.diger_maliyetler, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_uretim_maliyet_toplam_otomatik
BEFORE INSERT OR UPDATE ON uretim_maliyet
FOR EACH ROW
EXECUTE FUNCTION fn_uretim_maliyet_toplam_hesapla();
```

> **Idempotency kuralı:** Servis katmanındaki `tamamlaUretimEmri(uretim_id)` fonksiyonu `ON CONFLICT (uretim_id) DO UPDATE` ile çalışır. Aynı emri iki kez "tamamla" çağrısı aynı maliyet satırını günceller, ek stok hareketi oluşturmaz.

---

#### 3.8.4 `genel_gider` — Genel Gider Kaydı

| Alan | Tip | Zorunlu | Açıklama |
||------|-----|---------|----------|
|| `gider_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
|| `gider_tipi` | VARCHAR(30) | ✓ | KIRA, ELEKTRIK, SU, DOGALGAZ, PERSONEL, DIGER |
|| `gider_adedi` | VARCHAR(100) | ✓ | Giderin adi/açıklaması |
|| `gider_tutari` | DECIMAL(15,4) | ✓ | Gider tutarı |
|| `birim` | VARCHAR(20) | ✓ | Para birimi (TL, USD, EUR) |
|| `donem_yil` | INTEGER | ✓ | Gider dönemi yıl |
|| `donem_ay` | INTEGER | ✓ | Gider dönemi ay (1-12) |
||| `tedarikci_id` | UUID | Hayır | Tedarikçi (FK → tedarikciler) |
||| `aciklama` | TEXT | Hayır | Gider açıklaması |
|| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
|| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
|| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |
|| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

**İlişkiler:**
- `tedarikci_id` → `tedarikciler(tedarikci_id)` (Many-to-One, nullable)
- `olusturan_kullanici_id` → `kullanicilar(kullanici_id)` (Many-to-One)

**Kısıtlamalar:**
```sql
CONSTRAINT genel_gider_tipi CHECK (gider_tipi IN ('KIRA', 'ELEKTRIK', 'SU', 'DOGALGAZ', 'PERSONEL', 'DIGER'));
CONSTRAINT genel_gider_donem_ay CHECK (donem_ay >= 1 AND donem_ay <= 12);
CONSTRAINT genel_gider_tutar CHECK (gider_tutari >= 0);
```

---

#### 3.8.5 `birim_fiyat` — Ürün Birim Fiyat Kaydı

| Alan | Tip | Zorunlu | Açıklama |
||------|-----|---------|----------|
|| `fiyat_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
|| `urun_id` | UUID | ✓ | Ürün referansı (FK → urunler) |
|| `fiyat_tipi` | VARCHAR(20) | ✓ | ALIS, SATIS, MALIYET |
|| `birim` | VARCHAR(20) | ✓ | Fiyat birimi (kg, ton, adet, paket) |
|| `tutar` | DECIMAL(15,4) | ✓ | Fiyat tutarı |
|| `doviz_cinsi` | VARCHAR(10) | ✓ | Para birimi (TRY, USD, EUR) |
|| `gecerlilik_baslangic` | DATE | ✓ | Fiyat geçerlilik başlangıcı |
|| `gecerlilik_bitis` | DATE | Hayır | Fiyat geçerlilik bitişi (NULL = halen geçerli) |
|| `asgari_miktar` | DECIMAL(15,3) | Hayır | Bu fiyatın geçerli olduğu asgari miktar |
|| `maksimum_miktar` | DECIMAL(15,3) | Hayır | Bu fiyatın geçerli olduğu azami miktar |
|| `musteri_id` | UUID | Hayır | Müşteriye özel fiyat (FK → musteriler) |
|| `tedarikci_id` | UUID | Hayır | Tedarikçiye özel fiyat (FK → tedarikci) |
|| `aciklama` | TEXT | Hayır | Fiyat açıklaması |
|| `aktif` | BOOLEAN | ✓ | Aktif/Pasif durum |
|| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
|| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
|| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |
|| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

**İlişkiler:**
- `urun_id` → `urunler(urun_id)` (Many-to-One)
- `musteri_id` → `musteriler(musteri_id)` (Many-to-One, nullable)
- `tedarikci_id` → `tedarikciler(tedarikci_id)` (Many-to-One, nullable)
- `olusturan_kullanici_id` → `kullanicilar(kullanici_id)` (Many-to-One)

**Kısıtlamalar:**
```sql
CONSTRAINT birim_fiyat_tip CHECK (fiyat_tipi IN ('ALIS', 'SATIS', 'MALIYET'));
CONSTRAINT birim_fiyat_tutar CHECK (tutar >= 0);
CONSTRAINT birim_fiyat_aktiflik CHECK (
    (musteri_id IS NOT NULL AND tedarikci_id IS NULL) OR
    (musteri_id IS NULL AND tedarikci_id IS NOT NULL) OR
    (musteri_id IS NULL AND tedarikci_id IS NULL)
);
```

---

#### 3.7.1 `urun_donusum` — Ürün Dönüşüm Oranları

|| Alan | Tip | Zorunlu | Açıklama |
||------|-----|---------|----------|
|| `donusum_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
|| `mamul_urun_id` | UUID | ✓ | Mamul ürün referansı (FK → urunler) |
|| `hammadde_urun_id` | UUID | ✓ | Hammadde referansı (FK → urunler) |
|| `donusum_orani` | DECIMAL(10,4) | ✓ | 1 birim mamul için gerekli hammadde (örn: 1.05 kg kayısı → 1 kg kurutulmuş kayısı) |
|| `fire_orani` | DECIMAL(5,4) | ✓ | Beklenen fire yüzdesi (örn: 0.05 = %5) |
|| `aktif` | BOOLEAN | ✓ | Aktif/Pasif durum |
|| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
|| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
|| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete tarihi |

**İlişkiler:**
- `mamul_urun_id` → `urunler(urun_id)` (Many-to-One)
- `hammadde_urun_id` → `urunler(urun_id)` (Many-to-One)

**Unique Constraint:**
```sql
CONSTRAINT urun_donusum_unique EXCLUDE (mamul_urun_id WITH =, hammadde_urun_id WITH =) WHERE (silme_tarihi IS NULL);
```

> **Not:** Bu tablo 2026-07-30 audit raporu kapsamında tekilleştirilmiş olup `urun_donusum` (ürün ağacı / reçetesi) ve `birim_donusum` (kg↔gr, adet↔koli gibi birim dönüşümü) kavramları **ayrı tablolardır** (DB-Design §3.5.4 ve §21.3). Bu bölümdeki eski §3.7.1/`§3.7.2`/`§3.7.3` numaraları kaldırılarak kanonik §3.7.1 olarak düzenlenmiştir.

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

-- fifo_ihlal_onay
CREATE INDEX idx_fifo_ihlal_onay_hareket_id ON fifo_ihlal_onay(hareket_id);
CREATE INDEX idx_fifo_ihlal_onay_durum ON fifo_ihlal_onay(onay_durumu);
CREATE INDEX idx_fifo_ihlal_onay_tarih ON fifo_ihlal_onay(olusturma_tarihi);

-- kalite_kontrol
CREATE INDEX idx_kalite_kontrol_stok_id ON kalite_kontrol(stok_id);
CREATE INDEX idx_kalite_kontrol_tarih ON kalite_kontrol(kontrol_tarihi);
CREATE INDEX idx_kalite_kontrol_tur ON kalite_kontrol(kontrol_turu);
CREATE INDEX idx_kalite_kontrol_sonuc ON kalite_kontrol(sonuc);

-- uretim_maliyet
CREATE INDEX idx_uretim_maliyet_uretim_id ON uretim_maliyet(uretim_id);
CREATE INDEX idx_uretim_maliyet_donem ON uretim_maliyet(maliyet_donemi);

-- genel_gider
CREATE INDEX idx_genel_gider_tipi ON genel_gider(gider_tipi);
CREATE INDEX idx_genel_gider_donem ON genel_gider(donem_yil, donem_ay);
CREATE INDEX idx_genel_gider_tedarikci ON genel_gider(tedarikci_id) WHERE tedarikci_id IS NOT NULL;
CREATE INDEX idx_genel_gider_odeme ON genel_gider(odendi) WHERE odendi = FALSE;

-- birim_fiyat
CREATE INDEX idx_birim_fiyat_urun_id ON birim_fiyat(urun_id);
CREATE INDEX idx_birim_fiyat_tip ON birim_fiyat(fiyat_tipi);
CREATE INDEX idx_birim_fiyat_musteri ON birim_fiyat(musteri_id) WHERE musteri_id IS NOT NULL;
CREATE INDEX idx_birim_fiyat_tedarikci ON birim_fiyat(tedarikci_id) WHERE tedarikci_id IS NOT NULL;
CREATE INDEX idx_birim_fiyat_gecerlilik ON birim_fiyat(gecerlilik_baslangic, gecerlilik_bitis) WHERE aktif = TRUE;
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

> **Kanonik Karar (2026-07-30 audit raporu 5.4):** Üretim tamamlama tek bir **servis katmanı transaction**'ında orkestre edilir. Aşağıdaki trigger (`fn_uretim_stok_giris`) yalnızca **stok yan etkilerini** üretir (mamul stok kartı INSERT, hammadde URETIM_CIKIS, üretim lot kaydı). Maliyet hesaplama (`fn_uretim_maliyet_toplam_hesapla`) bu trigger'da **çağrılmaz**; `tamamlaUretimEmri(uretim_id)` servis fonksiyonu `uretim_maliyet` satırını `INSERT ... ON CONFLICT (uretim_id) DO UPDATE` ile yazar (idempotent). Trigger ikinci kez çalışsa bile ek stok hareketi oluşturmaz; koruma için aşağıdaki trigger fonksiyonu mevcut `uretim_lot` kaydını kontrol eder.

#### 5.2.1 `trg_uretim_tamamlandi_stok_giris` — Üretim Tamamlandığında Stok Girişi

**Amaç:** Üretim emri tamamlandığında mamul için otomatik stok girişi oluşturur. Idempotent: aynı emir için yalnız bir kez çalışır.

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

### 5.5 Yeni Tablo Tetikleyicileri

#### 5.5.1 `trg_fifo_ihlal_onay_otomatik` — FIFO İhlal Durumunda Otomatik Onay Kaydı

**Amaç:** Stok hareketi FIFO ihlal ettiğinde otomatik olarak onay kaydı oluşturur.

```sql
CREATE OR REPLACE FUNCTION fn_fifo_ihlal_onay_olustur()
RETURNS TRIGGER AS $$
DECLARE
    v_ilk_lot_giris TIMESTAMP;
    v_secili_lot_giris TIMESTAMP;
    v_fark_gun INTEGER;
    v_esik_gun INTEGER;
BEGIN
    -- FIFO/FEFO kontrolü TÜM çıkış tipleri için (5.5 kanonik kararı)
    IF NEW.hareket_tipi IN ('SATIS_CIKIS', 'URETIM_CIKIS', 'TRANSFER', 'SON_KULLANIM_CIKIS', 'IADE')
       AND NEW.fifo_ihlal_edildi = TRUE THEN

        -- Sistem ayarından eşiği oku (varsayılan 7)
        SELECT COALESCE(
            (SELECT deger::INTEGER FROM sistem_ayarlari WHERE ayar_adi = 'FIFO_IHLAL_ESIK_GUN' LIMIT 1),
            7
        ) INTO v_esik_gun;

        -- FEFO+FIFO'ya göre seçilmesi gereken lotun giriş tarihini bul
        SELECT MIN(giris_tarihi) INTO v_ilk_lot_giris
        FROM stok_karti
        WHERE urun_id = (SELECT urun_id FROM stok_karti WHERE stok_id = NEW.stok_id)
          AND durum = 'AKTIF'
          AND silme_tarihi IS NULL
          AND miktar > 0
          AND durum NOT IN ('SON_KULLANIM_GECDI', 'SON_KULLANIM_RISKLI', 'SON_KULLANIM_ISLEM_GECICI');

        -- Kullanılan lotun giriş tarihini bul
        SELECT giris_tarihi INTO v_secili_lot_giris
        FROM stok_karti
        WHERE stok_id = NEW.stok_id;

        -- Gün farkını hesapla
        IF v_ilk_lot_giris IS NOT NULL AND v_secili_lot_giris IS NOT NULL THEN
            v_fark_gun := DATE_PART('day', v_secili_lot_giris - v_ilk_lot_giris);

            -- Eşikten fazla fark varsa onay kaydı oluştur
            IF v_fark_gun > v_esik_gun THEN
                INSERT INTO fifo_ihlal_onay (
                    hareket_id, onay_durumu, fark_gun_sayisi,
                    onaylayan_kullanici_id, olusturma_tarihi, guncelleme_tarihi
                ) VALUES (
                    NEW.hareket_id, 'BEKLEMEDE', v_fark_gun,
                    NEW.olusturan_kullanici_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fifo_ihlal_onay_otomatik
AFTER INSERT ON stok_hareketleri
FOR EACH ROW
EXECUTE FUNCTION fn_fifo_ihlal_onay_olustur();
```

---

#### 5.5.2 `trg_kalite_kontrol_sonuc_stok_guncelle` — Kalite Kontrol Sonucuna Göre Stok Durumu Güncelleme

**Amaç:** Kalite kontrol sonucu RET veya KALDI ise stok kartının durumunu günceller.

```sql
CREATE OR REPLACE FUNCTION fn_kalite_kontrol_stok_guncelle()
RETURNS TRIGGER AS $$
BEGIN
    -- Sadece yeni kayıt ve sonuç değişikliğinde çalış
    IF TG_OP = 'INSERT' THEN
        IF NEW.sonuc IN ('KALDI', 'RET') THEN
            UPDATE stok_karti
            SET durum = 'KALITE_KONTROL',
                guncelleme_tarihi = CURRENT_TIMESTAMP
            WHERE stok_id = NEW.stok_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.sonuc IN ('KALDI', 'RET') AND OLD.sonuc = 'GECTI' THEN
            UPDATE stok_karti
            SET durum = 'KALITE_KONTROL',
                guncelleme_tarihi = CURRENT_TIMESTAMP
            WHERE stok_id = NEW.stok_id;
        ELSIF NEW.sonuc = 'GECTI' AND OLD.sonuc IN ('KALDI', 'RET') THEN
            UPDATE stok_karti
            SET durum = 'AKTIF',
                guncelleme_tarihi = CURRENT_TIMESTAMP
            WHERE stok_id = NEW.stok_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kalite_kontrol_sonuc_stok_guncelle
AFTER INSERT OR UPDATE OF sonuc ON kalite_kontrol
FOR EACH ROW
EXECUTE FUNCTION fn_kalite_kontrol_stok_guncelle();
```

---

#### 5.5.3 `trg_uretim_maliyet_toplam_otomatik` — Üretim Maliyeti Toplam Otomatik Hesaplama

**Amaç:** Üretim maliyeti kaydedildiğinde toplam maliyeti otomatik hesaplar.

```sql
CREATE OR REPLACE FUNCTION fn_uretim_maliyet_toplam_hesapla()
RETURNS TRIGGER AS $$
BEGIN
    -- Toplam maliyeti otomatik hesapla
    NEW.toplam_maliyet := COALESCE(NEW.malzeme_maliyeti, 0)
                         + COALESCE(NEW.iscilik_maliyeti, 0)
                         + COALESCE(NEW.enerji_maliyeti, 0)
                         + COALESCE(NEW.bakim_maliyeti, 0)
                         + COALESCE(NEW.diger_maliyetler, 0);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_uretim_maliyet_toplam_otomatik
BEFORE INSERT OR UPDATE ON uretim_maliyet
FOR EACH ROW
EXECUTE FUNCTION fn_uretim_maliyet_toplam_hesapla();
```

---

#### 5.5.4 `trg_birim_fiyat_gercek_zamanli` — Birim Fiyat Geçmişi Kaydetme

**Amaç:** Birim fiyat değiştiğinde eski fiyatın bitiş tarihini günceller ve yeni fiyat kaydı oluşturur.

```sql
CREATE OR REPLACE FUNCTION fn_birim_fiyat_gecmis_olustur()
RETURNS TRIGGER AS $$
BEGIN
    -- Sadece tutar değiştiğinde ve aktif fiyat ise çalış
    IF OLD.tutar IS DISTINCT FROM NEW.tutar AND NEW.aktif = TRUE THEN
        -- Eski fiyatın bitiş tarihini güncelle
        UPDATE birim_fiyat
        SET gecerlilik_bitis = CURRENT_DATE - INTERVAL '1 day'
        WHERE urun_id = NEW.urun_id
          AND fiyat_tipi = NEW.fiyat_tipi
          AND aktif = TRUE
          AND silme_tarihi IS NULL
          AND (NEW.musteri_id IS NULL OR musteri_id = NEW.musteri_id)
          AND (NEW.tedarikci_id IS NULL OR tedarikci_id = NEW.tedarikci_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_birim_fiyat_gercek_zamanli
AFTER UPDATE OF tutar ON birim_fiyat
FOR EACH ROW
EXECUTE FUNCTION fn_birim_fiyat_gecmis_olustur();
```

---

#### 5.5.5 `trg_genel_gider_odenmeyen_uyari` — Ödenmemiş Gider Uyarısı

**Amaç:** Ödenmemiş giderlerin takibi için uyarı oluşturur (audit_log'a kayıt).

```sql
CREATE OR REPLACE FUNCTION fn_genel_gider_odenmeyen_kontrol()
RETURNS TRIGGER AS $$
BEGIN
    -- Sadece yeni kayıt ve odendi durumu değiştiğinde çalış
    IF TG_OP = 'INSERT' AND NEW.odendi = FALSE THEN
        RAISE NOTICE 'ODENMEMIS GIDER UYARISI: % - % tutarında gider ödenmemiş. Dönem: %/%',
            NEW.gider_adedi, NEW.gider_tutari, NEW.donem_ay, NEW.donem_yil;
    ELSIF TG_OP = 'UPDATE' AND NEW.odendi = TRUE AND OLD.odendi = FALSE THEN
        RAISE NOTICE 'GIDER ODENDI: % - % tutarında gider ödendi. Ödeme tarihi: %',
            NEW.gider_adedi, NEW.gider_tutari, NEW.odeme_tarihi;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_genel_gider_odenmeyen_uyari
AFTER INSERT OR UPDATE OF odendi ON genel_gider
FOR EACH ROW
EXECUTE FUNCTION fn_genel_gider_odenmeyen_kontrol();
```

---

### 5.6 Veri Bütünlüğü Tetikleyicileri

#### 5.6.1 `trg_stok_miktar_negatif_engelle` — Negatif Stok Engelleme

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

### 6.2 FEFO+FIFO Hibrit Lot Seçim Fonksiyonu

> **Kanonik Karar (2026-07-30 audit raporu 5.1):** `fn_fifo_lot_sec` adı korunur (geri uyumluluk) ancak içerik **FEFO+FIFO hibrit** mantığıyla çalışır. Önceliklendirme:
> 1. Önce `durum='SON_KULLANIM_GECDI'` olan lotlar **bloke** edilir (fonksiyon bunları hiç seçmez, ayrı cleanup transaction'ıyla `imha` veya `indirim`'e gönderilir).
> 2. SKT yaklaşan lotlar için **FEFO**: önce en yakın `son_kullanma` tarihi.
> 3. SKT belirsiz veya eşit lotlar için **FIFO**: önce en eski `giris_tarihi`.
>
> Eşikler sistem ayarı tablosundan (`sistem_ayarlari`) okunur:
> - `SKT_UYARI_GUN` — SKT yaklaşan uyarı eşiği (varsayılan 30)
> - `FEFO_ESIK_GUN` — FEFO aktif olacağı gün eşiği (varsayılan 7)
> - `FIFO_IHLAL_ESIK_GUN` — FIFO ihlal uyarı eşiği (varsayılan 7)

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
    son_kullanma DATE,
    oncelik VARCHAR(20)
) AS $$
DECLARE
    v_kalan_miktar DECIMAL(15,3);
    v_fefo_esik_gun INTEGER;
BEGIN
    -- Sistem ayarından FEFO eşiğini oku (varsayılan 7)
    SELECT COALESCE(
        (SELECT deger::INTEGER FROM sistem_ayarlari WHERE ayar_adi = 'FEFO_ESIK_GUN' LIMIT 1),
        7
    ) INTO v_fefo_esik_gun;

    v_kalan_miktar := p_miktar;

    -- FEFO+FIFO hibrit: önce SON_KULLANIM'a kalan gün az olan (FEFO), eşitse FIFO
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
          -- SON_KULLANIM_GECDI, SON_KULLANIM_RISKLI, SON_KULLANIM_ISLEM_GECICI lotlar seçilmez
          AND sk.durum NOT IN ('SON_KULLANIM_GECDI', 'SON_KULLANIM_RISKLI', 'SON_KULLANIM_ISLEM_GECICI', 'BITTI', 'IPTAL', 'KALITE_KONTROL', 'DEPO_DISI', 'RET')
          AND (sk.son_kullanma IS NULL OR sk.son_kullanma > CURRENT_DATE)
        ORDER BY
            sk.son_kullanma ASC NULLS LAST,    -- FEFO: SKT yaklaşan önce
            sk.giris_tarihi ASC                 -- FIFO: eşit SKT'de en eski önce
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
            son_kullanma,
            CASE
                WHEN son_kullanma IS NOT NULL
                     AND son_kullanma - CURRENT_DATE <= v_fefo_esik_gun THEN 'FEFO'
                ELSE 'FIFO'
            END;

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

> **Kanonik Karar (2026-07-30 audit raporu 5.5):** FIFO/FEFO kontrolü yalnızca `SATIS_CIKIS` için değil, **tüm tüketim/çıkış hareketlerinde** (`SATIS_CIKIS`, `URETIM_CIKIS`, `TRANSFER`, `SON_KULLANIM_CIKIS`, `IADE`) uygulanır. Eşik sistem ayarı `FIFO_IHLAL_ESIK_GUN`'dan okunur (varsayılan 7); eski 7 gün sabit değeri kaldırılmıştır.

```sql
CREATE OR REPLACE FUNCTION fn_fifo_ihlal_kontrol()
RETURNS TRIGGER AS $$
DECLARE
    v_ilk_lot_giris TIMESTAMP;
    v_secili_lot_giris TIMESTAMP;
    v_gun_farki INTEGER;
    v_esik_gun INTEGER;
BEGIN
    -- FIFO/FEFO kontrolü TÜM çıkış tipleri için geçerlidir
    IF NEW.hareket_tipi IN ('SATIS_CIKIS', 'URETIM_CIKIS', 'TRANSFER', 'SON_KULLANIM_CIKIS', 'IADE') THEN

        -- Sistem ayarından eşiği oku (varsayılan 7)
        SELECT COALESCE(
            (SELECT deger::INTEGER FROM sistem_ayarlari WHERE ayar_adi = 'FIFO_IHLAL_ESIK_GUN' LIMIT 1),
            7
        ) INTO v_esik_gun;

        -- FEFO+FIFO hibrit kuralına göre seçilmesi gereken lotun giriş tarihini bul
        SELECT MIN(giris_tarihi) INTO v_ilk_lot_giris
        FROM stok_karti
        WHERE urun_id = (SELECT urun_id FROM stok_karti WHERE stok_id = NEW.stok_id)
          AND durum = 'AKTIF'
          AND silme_tarihi IS NULL
          AND miktar > 0
          AND durum NOT IN ('SON_KULLANIM_GECDI', 'SON_KULLANIM_RISKLI', 'SON_KULLANIM_ISLEM_GECICI');

        -- Kullanılan lotun giriş tarihini bul
        SELECT giris_tarihi INTO v_secili_lot_giris
        FROM stok_karti
        WHERE stok_id = NEW.stok_id;

        -- Gün farkını hesapla
        IF v_ilk_lot_giris IS NOT NULL AND v_secili_lot_giris IS NOT NULL THEN
            v_gun_farki := DATE_PART('day', v_secili_lot_giris - v_ilk_lot_giris);

            -- Eşikten fazla fark varsa uyarı
            IF v_gun_farki > v_esik_gun THEN
                RAISE NOTICE 'FIFO/FEFO İHLAL UYARISI: Hareket % (%) için seçilen lot, FEFO+FIFO sırasına göre % günden fazla geç. Eşik: % gün. İlgili lot: % (giriş: %), FEFO+FIFO sırası: % (giriş: %)',
                    NEW.hareket_tipi, NEW.stok_id, v_gun_farki, v_esik_gun,
                    NEW.stok_id, v_secili_lot_giris,
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
    CONSTRAINT tedarikciler_vergi_no_unique EXCLUDE (vergi_no WITH =) WHERE (silme_tarihi IS NULL)
);

-- Urunler Tablosu
CREATE TABLE urunler (
    urun_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad VARCHAR(255) NOT NULL,
    kategori VARCHAR(20) NOT NULL CHECK (kategori IN ('MEYVE', 'BAL', 'KARSIM', 'KURUYEMIS', 'SEBZE', 'KURU_BAKLIYAT', 'YAG', 'TURSU', 'DIGER')),
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
-- (DB-Design §3.1.6 ile birebir; ürün katalog alanları buraya sızmaz)
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
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id)
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
    durum VARCHAR(20) NOT NULL DEFAULT 'AKTIF' CHECK (durum IN ('AKTIF', 'BITTI', 'IPTAL', 'KALITE_KONTROL', 'DEPO_DISI', 'RET', 'SON_KULLANIM_GECDI', 'SON_KULLANIM_RISKLI', 'SON_KULLANIM_ISLEM_GECICI')),
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
    CONSTRAINT stok_karti_lot_no_unique EXCLUDE (lot_no WITH =) WHERE (silme_tarihi IS NULL),
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
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id)
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
    CONSTRAINT tedarikci_urunleri_unique EXCLUDE (tedarikci_id WITH =, urun_id WITH =) WHERE (silme_tarihi IS NULL)
);

-- Tedarikci Fiyat Gecmisi Tablosu
-- (DB-Design §3.3.2 ile birebir; sızan alan yok)
CREATE TABLE tedarikci_fiyat_gecmisi (
    fiyat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tedarikci_urun_id UUID NOT NULL REFERENCES tedarikci_urunleri(tedarikci_urun_id),
    birim_fiyat DECIMAL(15,4) NOT NULL,
    gecerlilik_baslangic DATE NOT NULL,
    gecerlilik_bitis DATE,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id)
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
-- (DB-Design §3.4.1 ile birebir; ürün katalog alanları buraya sızmaz, kopyala-yapıştır bug'ı 2026-07-30 audit raporu ile giderildi)
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
    gerceklesen_miktar DECIMAL(15,3)
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
    CONSTRAINT urun_donusum_unique EXCLUDE (mamul_urun_id WITH =, hammadde_urun_id WITH =) WHERE (silme_tarihi IS NULL)
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
-- YENI TABLOLAR
-- ============================================

-- Fifo Ihlal Onay Tablosu
CREATE TABLE fifo_ihlal_onay (
    onay_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hareket_id UUID NOT NULL REFERENCES stok_hareketleri(hareket_id),
    onay_durumu VARCHAR(20) NOT NULL DEFAULT 'BEKLEMEDE' CHECK (onay_durumu IN ('BEKLEMEDE', 'ONAYLANDI', 'REDDEDILDI')),
    onay_tarihi TIMESTAMP,
    onaylayan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    onay_nedeni TEXT,
    red_nedeni TEXT,
    fark_gun_sayisi INTEGER NOT NULL,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Kalite Kontrol Tablosu
CREATE TABLE kalite_kontrol (
    kalite_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stok_id UUID NOT NULL REFERENCES stok_karti(stok_id),
    kontrol_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    kontrol_turu VARCHAR(20) NOT NULL CHECK (kontrol_turu IN ('GIRIS', 'CIKIS', 'PERIYODIK', 'SEBEBEP')),
    sonuc VARCHAR(20) NOT NULL CHECK (sonuc IN ('GECTI', 'KALDI', 'RET')),
    kontrol_edilen_miktar DECIMAL(15,3) NOT NULL,
    birim VARCHAR(20) NOT NULL,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    not TEXT,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP
);

-- Uretim Maliyet Tablosu
CREATE TABLE uretim_maliyet (
    maliyet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uretim_id UUID NOT NULL REFERENCES uretim_emri(uretim_id),
    malzeme_maliyeti DECIMAL(15,4) NOT NULL DEFAULT 0,
    iscilik_maliyeti DECIMAL(15,4) NOT NULL DEFAULT 0,
    enerji_maliyeti DECIMAL(15,4) DEFAULT 0,
    bakim_maliyeti DECIMAL(15,4) DEFAULT 0,
    diger_maliyetler DECIMAL(15,4) DEFAULT 0,
    toplam_maliyet DECIMAL(15,4) NOT NULL DEFAULT 0,
    birim VARCHAR(20) NOT NULL DEFAULT 'TRY',
    maliyet_donemi DATE NOT NULL,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    CONSTRAINT uretim_maliyet_non_negative CHECK (
        malzeme_maliyeti >= 0 AND
        iscilik_maliyeti >= 0 AND
        enerji_maliyeti >= 0 AND
        bakim_maliyeti >= 0 AND
        diger_maliyetler >= 0 AND
        toplam_maliyet >= 0
    )
);

-- Genel Gider Tablosu
CREATE TABLE genel_gider (
    gider_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gider_tipi VARCHAR(30) NOT NULL CHECK (gider_tipi IN ('KIRA', 'ELEKTRIK', 'SU', 'DOGALGAZ', 'PERSONEL', 'DIGER')),
    gider_adedi VARCHAR(100) NOT NULL,
    gider_tutari DECIMAL(15,4) NOT NULL CHECK (gider_tutari >= 0),
    birim VARCHAR(20) NOT NULL DEFAULT 'TRY',
    donem_yil INTEGER NOT NULL,
    donem_ay INTEGER NOT NULL CHECK (donem_ay >= 1 AND donem_ay <= 12),
    tedarikci_id UUID REFERENCES tedarikciler(tedarikci_id),
    aciklama TEXT,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id)
);

-- ============================================
-- YENI TABLOLAR - Bildirim Sistemi
-- ============================================

-- Bildirim Şablonları Tablosu
CREATE TABLE bildirim_sablonlari (
    sablon_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kod VARCHAR(50) NOT NULL UNIQUE,
    baslik_sablon VARCHAR(255) NOT NULL,
    icerik_sablon TEXT NOT NULL,
    oncelik VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    kanallar VARCHAR(20)[] NOT NULL DEFAULT ARRAY['UYGULAMA'],
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    dil VARCHAR(10) NOT NULL DEFAULT 'tr',
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    olusturan_kullanici_id UUID REFERENCES kullanicilar(kullanici_id),
    CONSTRAINT bildirim_sablonlari_oncelik_check CHECK (oncelik IN ('ACIL', 'KRITIK', 'YUKSEK', 'NORMAL', 'BILGI'))
);

-- Bildirimler Tablosu
CREATE TABLE bildirimler (
    bildirim_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ref_id UUID,
    ref_turu VARCHAR(50),
    kod VARCHAR(50) NOT NULL REFERENCES bildirim_sablonlari(kod),
    baslik VARCHAR(255) NOT NULL,
    icerik TEXT NOT NULL,
    oncelik VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    gonderim_durumu VARCHAR(20) NOT NULL DEFAULT 'HAZIR',
    okundu BOOLEAN NOT NULL DEFAULT FALSE,
    okunma_tarihi TIMESTAMP,
    kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    gonderim_tarihi TIMESTAMP,
    gonderim_hatasi TEXT,
    silme_tarihi TIMESTAMP,
    CONSTRAINT bildirimler_oncelik_check CHECK (oncelik IN ('ACIL', 'KRITIK', 'YUKSEK', 'NORMAL', 'BILGI')),
    CONSTRAINT bildirimler_durum_check CHECK (gonderim_durumu IN ('HAZIR', 'BEKLIYOR', 'GONDERILIYOR', 'BASARILI', 'BASARISIZ', 'IPTAL_EDILDI'))
);

-- Bildirim Gönderimleri Tablosu
CREATE TABLE bildirim_gonderimleri (
    gonderim_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bildirim_id UUID NOT NULL REFERENCES bildirimler(bildirim_id) ON DELETE CASCADE,
    kanal VARCHAR(20) NOT NULL,
    durum VARCHAR(20) NOT NULL DEFAULT 'BEKLIYOR',
    deneme_sayisi INTEGER NOT NULL DEFAULT 0,
    son_deneme TIMESTAMP,
    son_hata TEXT,
    harici_bildirim_id VARCHAR(255),
    gonderim_tarihi TIMESTAMP,
    teslim_tarihi TIMESTAMP,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bildirim_gonderimleri_kanal_check CHECK (kanal IN ('EPOSTA', 'SMS', 'UYGULAMA')),
    CONSTRAINT bildirim_gonderimleri_durum_check CHECK (durum IN ('BEKLIYOR', 'GONDERILIYOR', 'BASARILI', 'BASARISIZ', 'IPTAL_EDILDI'))
);

-- Bildirim Kullanıcı Kayıtları Tablosu (Kullanıcı-Bildirim İlişkisi)
CREATE TABLE bildirim_kullanicari (
    kayit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bildirim_id UUID NOT NULL REFERENCES bildirimler(bildirim_id) ON DELETE CASCADE,
    kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    okundu BOOLEAN NOT NULL DEFAULT FALSE,
    okunma_tarihi TIMESTAMP,
    bildirim_tipi VARCHAR(50) NOT NULL,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bildirim_kullanicari_unique UNIQUE (bildirim_id, kullanici_id)
);

-- ============================================
-- YENI TABLOLAR - Depo Yönetimi
-- ============================================

-- Depolar Tablosu
CREATE TABLE depolar (
    depo_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kod VARCHAR(20) NOT NULL UNIQUE,
    ad VARCHAR(100) NOT NULL,
    tip VARCHAR(20) NOT NULL CHECK (tip IN ('HAMMADDE', 'MAMUL', 'YARI_MAMUL', 'DIGER')),
    kapasite_m2 DECIMAL(10,2),
    sicaklik_kontrolu BOOLEAN NOT NULL DEFAULT FALSE,
    sicaklik_min DECIMAL(5,2),
    sicaklik_max DECIMAL(5,2),
    nem_orani_kontrolu BOOLEAN NOT NULL DEFAULT FALSE,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    varsayilan BOOLEAN NOT NULL DEFAULT FALSE,
    adres TEXT,
    il VARCHAR(50),
    ilce VARCHAR(50),
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id)
);

-- Depo Bloklar Tablosu
CREATE TABLE depo_bloklar (
    blok_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    depo_id UUID NOT NULL REFERENCES depolar(depo_id),
    kod VARCHAR(20) NOT NULL,
    ad VARCHAR(100) NOT NULL,
    tip VARCHAR(20) NOT NULL CHECK (tip IN ('RAF', 'BULK', 'DOKME', 'OZEL')),
    kapasite_m2 DECIMAL(10,2),
    kapasite_kg DECIMAL(15,3),
    raf_sayisi INTEGER,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    sira_no INTEGER NOT NULL DEFAULT 0,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    CONSTRAINT depo_bloklar_kod_unique EXCLUDE (depo_id WITH =, kod WITH =) WHERE (silme_tarihi IS NULL)
);

-- Depo Konumları Tablosu
CREATE TABLE depo_konumlar (
    konum_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blok_id UUID NOT NULL REFERENCES depo_bloklar(blok_id),
    kod VARCHAR(20) NOT NULL,
    tam_kod VARCHAR(50) NOT NULL,
    katman INTEGER NOT NULL DEFAULT 1,
    konum_no INTEGER NOT NULL DEFAULT 1,
    tip VARCHAR(20) NOT NULL CHECK (tip IN ('STORAGE', 'PICKING', 'BUFFER', 'DAMAGED', 'QUARANTINE')),
    durum VARCHAR(20) NOT NULL DEFAULT 'BOS' CHECK (durum IN ('BOS', 'DOLU', 'REZERVE', 'BAKIM', 'IPTAL')),
    kapasite_kg DECIMAL(15,3),
    mevcut_kg DECIMAL(15,3) NOT NULL DEFAULT 0,
    doluluk_orani DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (doluluk_orani >= 0 AND doluluk_orani <= 100),
    son_kullanma_uyari INTEGER NOT NULL DEFAULT 30,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    CONSTRAINT depo_konumlar_kod_unique EXCLUDE (blok_id WITH =, kod WITH =) WHERE (silme_tarihi IS NULL),
    CONSTRAINT depo_konumlar_tam_kod_unique EXCLUDE (tam_kod WITH =) WHERE (silme_tarihi IS NULL)
);

-- Depo Transfer Tablosu
CREATE TABLE depo_transfer (
    transfer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_no VARCHAR(50) NOT NULL UNIQUE,
    kaynak_depo_id UUID NOT NULL REFERENCES depolar(depo_id),
    hedef_depo_id UUID NOT NULL REFERENCES depolar(depo_id),
    durum VARCHAR(20) NOT NULL DEFAULT 'HAZIRLANIYOR' CHECK (durum IN ('HAZIRLANIYOR', 'SEVK_EDILDI', 'YOLDA', 'TESLIM_ALINDI', 'TAMAMLANDI', 'IPTAL')),
    planlanan_tarih DATE,
    gerceklesen_tarih TIMESTAMP,
    nakliye_firmasi VARCHAR(100),
    nakliye_araci VARCHAR(50),
    sevk_irsa_no VARCHAR(50),
    teslim_alan VARCHAR(100),
    teslim_tarihi TIMESTAMP,
    toplam_miktar_kg DECIMAL(15,3) NOT NULL DEFAULT 0,
    kalem_sayisi INTEGER NOT NULL DEFAULT 0,
    aciklama TEXT,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    CONSTRAINT depo_transfer_no_unique EXCLUDE (transfer_no WITH =) WHERE (silme_tarihi IS NULL),
    CONSTRAINT depo_transfer_kaynak_hedef_check CHECK (kaynak_depo_id != hedef_depo_id)
);

-- Depo Transfer Detay Tablosu
CREATE TABLE depo_transfer_detay (
    detay_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID NOT NULL REFERENCES depo_transfer(transfer_id) ON DELETE CASCADE,
    stok_id UUID NOT NULL REFERENCES stok_karti(stok_id),
    miktar_kg DECIMAL(15,3) NOT NULL CHECK (miktar_kg > 0),
    birim VARCHAR(20) NOT NULL,
    kaynak_konum_id UUID REFERENCES depo_konumlar(konum_id),
    hedef_konum_id UUID REFERENCES depo_konumlar(konum_id),
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id)
);

-- ============================================
-- YENI TABLOLAR - Toplu İşlem Altyapısı
-- ============================================

-- Toplu İşlemler Tablosu
CREATE TABLE toplu_islemler (
    islem_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    islem_turu VARCHAR(30) NOT NULL CHECK (islem_turu IN ('IMPORT', 'EXPORT')),
    islem_alt_turu VARCHAR(30) NOT NULL CHECK (islem_alt_turu IN ('STOK_GIRISI', 'URETIM_EMRI', 'MUSKAYIT', 'TEDARIKCI_KAYIT', 'STOK_DUZELTME', 'ETIKET_BASKI', 'SATIS_IRAC')),
    durum VARCHAR(20) NOT NULL DEFAULT 'BEKLEMEDE' CHECK (durum IN ('BEKLEMEDE', 'VALIDATING', 'ISLENIYOR', 'TAMAMLANDI', 'HATALAR_VAR', 'IPTAL_EDILDI')),
    dosya_adi VARCHAR(255),
    dosya_yolu VARCHAR(500),
    dosya_boyutu BIGINT,
    dosya_hash VARCHAR(64),
    toplam_satir INTEGER,
    basarili_satir INTEGER,
    basarisiz_satir INTEGER,
    toplam_tutanak INTEGER,
    sonuc_dosya_adi VARCHAR(255),
    sonuc_dosya_yolu VARCHAR(500),
    hata_aciklamasi TEXT,
    islem_bilgisi JSONB,
    baslama_zamani TIMESTAMP,
    bitis_zamani TIMESTAMP,
    sures_saniye INTEGER,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    onaylayan_kullanici_id UUID REFERENCES kullanicilar(kullanici_id),
    onay_tarihi TIMESTAMP,
    ip_adresi VARCHAR(45),
    not TEXT,
    CONSTRAINT toplu_islemler_toplam_satir_check CHECK (toplam_satir >= 0),
    CONSTRAINT toplu_islemler_basarili_satir_check CHECK (basarili_satir >= 0),
    CONSTRAINT toplu_islemler_basarisiz_satir_check CHECK (basarisiz_satir >= 0)
);

-- Toplu İşlem Satırları Tablosu
CREATE TABLE toplu_islem_satirlari (
    satir_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    islem_id UUID NOT NULL REFERENCES toplu_islemler(islem_id) ON DELETE CASCADE,
    satir_numarasi INTEGER NOT NULL,
    durum VARCHAR(20) NOT NULL DEFAULT 'BASARILI' CHECK (durum IN ('BASARILI', 'BASARISIZ', 'ATLANDI', 'VALIDATION_HATASI')),
    satir_verisi JSONB NOT NULL,
    islenmis_veri JSONB,
    olusturulan_kayit_id UUID,
    hata_kodu VARCHAR(50),
    hata_mesaji TEXT,
    hata_detayi JSONB,
    yeniden_deneilebilir BOOLEAN NOT NULL DEFAULT FALSE,
    islem_sonrasi_miktar DECIMAL(15,3),
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- YENI TABLOLAR - Birim Dönüşüm Sistemi
-- ============================================

-- Birimler Tablosu
CREATE TABLE birimler (
    birim_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad VARCHAR(50) NOT NULL,
    kisa_ad VARCHAR(10) NOT NULL UNIQUE,
    tip VARCHAR(20) NOT NULL CHECK (tip IN ('AGIRLIK', 'OLCEK', 'ONAYLI')),
    temel_birim_mi BOOLEAN NOT NULL DEFAULT FALSE,
    carpan_temele DECIMAL(15,6),
    bolen_temele DECIMAL(15,6),
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT birimler_temel_birim_dar CHECK (
        (temel_birim_mi = TRUE AND carpan_temele IS NULL AND bolen_temele IS NULL) OR
        (temel_birim_mi = FALSE AND carpan_temele IS NOT NULL AND bolen_temele IS NOT NULL)
    )
);

-- Birim Dönüşüm Tablosu
CREATE TABLE birim_donusum (
    donusum_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kaynak_birim_id UUID NOT NULL REFERENCES birimler(birim_id),
    hedef_birim_id UUID NOT NULL REFERENCES birimler(birim_id),
    carpan DECIMAL(15,6) NOT NULL,
    bolen DECIMAL(15,6) NOT NULL,
    toptan_mi BOOLEAN NOT NULL DEFAULT FALSE,
    perakende_mi BOOLEAN NOT NULL DEFAULT FALSE,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    CONSTRAINT birim_donusum_kaynakkendi CHECK (kaynak_birim_id != hedef_birim_id),
    CONSTRAINT birim_donusum_unique EXCLUDE (kaynak_birim_id WITH =, hedef_birim_id WITH =) WHERE (silme_tarihi IS NULL AND aktif = TRUE)
);

-- ============================================
-- YENI TABLOLAR - Üretim Maliyet
-- ============================================

-- Üretim İşçilik Tablosu
CREATE TABLE uretim_iscilik (
    iscilik_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uretim_id UUID NOT NULL REFERENCES uretim_emri(uretim_id),
    personel_id UUID REFERENCES kullanicilar(kullanici_id),
    calisma_saati DECIMAL(5,2) NOT NULL CHECK (calisma_saati > 0),
    saatlik_ucret DECIMAL(10,4) NOT NULL CHECK (saatlik_ucret >= 0),
    toplam_tutar DECIMAL(15,4) GENERATED ALWAYS AS (calisma_saati * saatlik_ucret) STORED,
    aciklama TEXT,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    olusturan_kullanici_id UUID REFERENCES kullanicilar(kullanici_id)
);

-- Üretim Enerji Tablosu
CREATE TABLE uretim_enerji (
    enerji_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uretim_id UUID NOT NULL REFERENCES uretim_emri(uretim_id),
    gider_tipi VARCHAR(20) NOT NULL CHECK (gider_tipi IN ('ELEKTRIK', 'DOGALGAZ', 'YAKIT', 'SU', 'BAKIM', 'DIGER')),
    gider_tutari DECIMAL(15,4) NOT NULL CHECK (gider_tutari >= 0),
    birim VARCHAR(20) NOT NULL DEFAULT 'TL',
    aciklama TEXT,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    olusturan_kullanici_id UUID REFERENCES kullanicilar(kullanici_id)
);

-- Üretim Genel Gider Tablosu
CREATE TABLE uretim_genel_gider (
    gider_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uretim_id UUID NOT NULL REFERENCES uretim_emri(uretim_id),
    gider_tipi VARCHAR(30) NOT NULL CHECK (gider_tipi IN ('KIRA', 'ELEKTRIK', 'SU', 'DOGALGAZ', 'PERSONEL', 'BAKIM', 'DIGER')),
    gider_adedi VARCHAR(100) NOT NULL,
    gider_tutari DECIMAL(15,4) NOT NULL CHECK (gider_tutari >= 0),
    birim VARCHAR(20) NOT NULL DEFAULT 'TL',
    donem_yil INTEGER NOT NULL,
    donem_ay INTEGER NOT NULL CHECK (donem_ay >= 1 AND donem_ay <= 12),
    aciklama TEXT,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id)
);

-- Birim Fiyat Tablosu
CREATE TABLE birim_fiyat (
    fiyat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    urun_id UUID NOT NULL REFERENCES urunler(urun_id),
    fiyat_tipi VARCHAR(20) NOT NULL CHECK (fiyat_tipi IN ('ALIS', 'SATIS', 'MALIYET')),
    birim VARCHAR(20) NOT NULL,
    tutar DECIMAL(15,4) NOT NULL CHECK (tutar >= 0),
    doviz_cinsi VARCHAR(10) NOT NULL DEFAULT 'TRY',
    gecerlilik_baslangic DATE NOT NULL,
    gecerlilik_bitis DATE,
    asgari_miktar DECIMAL(15,3),
    maksimum_miktar DECIMAL(15,3),
    musteri_id UUID REFERENCES musteriler(musteri_id),
    tedarikci_id UUID REFERENCES tedarikciler(tedarikci_id),
    aciklama TEXT,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi TIMESTAMP,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id)
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

-- Yeni tablolar icin indeksler
CREATE INDEX idx_fifo_ihlal_onay_hareket_id ON fifo_ihlal_onay(hareket_id);
CREATE INDEX idx_fifo_ihlal_onay_durum ON fifo_ihlal_onay(onay_durumu);
CREATE INDEX idx_fifo_ihlal_onay_tarih ON fifo_ihlal_onay(olusturma_tarihi);

CREATE INDEX idx_kalite_kontrol_stok_id ON kalite_kontrol(stok_id);
CREATE INDEX idx_kalite_kontrol_tarih ON kalite_kontrol(kontrol_tarihi);
CREATE INDEX idx_kalite_kontrol_tur ON kalite_kontrol(kontrol_turu);
CREATE INDEX idx_kalite_kontrol_sonuc ON kalite_kontrol(sonuc);

CREATE INDEX idx_uretim_maliyet_uretim_id ON uretim_maliyet(uretim_id);
CREATE INDEX idx_uretim_maliyet_donem ON uretim_maliyet(maliyet_donemi);

CREATE INDEX idx_genel_gider_tipi ON genel_gider(gider_tipi);
CREATE INDEX idx_genel_gider_donem ON genel_gider(donem_yil, donem_ay);
CREATE INDEX idx_genel_gider_tedarikci ON genel_gider(tedarikci_id) WHERE tedarikci_id IS NOT NULL;
CREATE INDEX idx_genel_gider_odeme ON genel_gider(odendi) WHERE odendi = FALSE;

CREATE INDEX idx_birim_fiyat_urun_id ON birim_fiyat(urun_id);
CREATE INDEX idx_birim_fiyat_tip ON birim_fiyat(fiyat_tipi);
CREATE INDEX idx_birim_fiyat_musteri ON birim_fiyat(musteri_id) WHERE musteri_id IS NOT NULL;
CREATE INDEX idx_birim_fiyat_tedarikci ON birim_fiyat(tedarikci_id) WHERE tedarikci_id IS NOT NULL;
CREATE INDEX idx_birim_fiyat_gecerlilik ON birim_fiyat(gecerlilik_baslangic, gecerlilik_bitis) WHERE aktif = TRUE;
```

-- Bildirim Sistemi İndeksleri
CREATE INDEX idx_bildirim_sablonlari_kod ON bildirim_sablonlari(kod);
CREATE INDEX idx_bildirim_sablonlari_aktif ON bildirim_sablonlari(aktif) WHERE aktif = TRUE;
CREATE INDEX idx_bildirimler_kullanici ON bildirimler(kullanici_id, okundu);
CREATE INDEX idx_bildirimler_ref ON bildirimler(ref_turu, ref_id);
CREATE INDEX idx_bildirimler_olusturma ON bildirimler(olusturma_tarihi DESC);
CREATE INDEX idx_bildirimler_durum ON bildirimler(gonderim_durumu);
CREATE INDEX idx_bildirim_gonderimleri_bildirim ON bildirim_gonderimleri(bildirim_id, kanal);
CREATE INDEX idx_bildirim_gonderimleri_durum ON bildirim_gonderimleri(durum);
CREATE INDEX idx_bildirim_kullanicari_kullanici ON bildirim_kullanicari(kullanici_id, okundu);

-- Depo Yönetimi İndeksleri
CREATE INDEX idx_depolar_tip ON depolar(tip);
CREATE INDEX idx_depolar_aktif ON depolar(aktif) WHERE aktif = TRUE;
CREATE INDEX idx_depo_bloklar_depo ON depo_bloklar(depo_id);
CREATE INDEX idx_depo_bloklar_aktif ON depo_bloklar(aktif) WHERE aktif = TRUE;
CREATE INDEX idx_depo_konumlar_blok ON depo_konumlar(blok_id);
CREATE INDEX idx_depo_konumlar_durum ON depo_konumlar(durum);
CREATE INDEX idx_depo_konumlar_tam_kod ON depo_konumlar(tam_kod) WHERE silme_tarihi IS NULL;
CREATE INDEX idx_depo_transfer_kaynak ON depo_transfer(kaynak_depo_id);
CREATE INDEX idx_depo_transfer_hedef ON depo_transfer(hedef_depo_id);
CREATE INDEX idx_depo_transfer_durum ON depo_transfer(durum);
CREATE INDEX idx_depo_transfer_tarih ON depo_transfer(olusturma_tarihi DESC);
CREATE INDEX idx_depo_transfer_detay_transfer ON depo_transfer_detay(transfer_id);
CREATE INDEX idx_depo_transfer_detay_stok ON depo_transfer_detay(stok_id);

-- Toplu İşlem İndeksleri
CREATE INDEX idx_toplu_islemler_durum ON toplu_islemler(durum);
CREATE INDEX idx_toplu_islemler_tur ON toplu_islemler(islem_turu, islem_alt_turu);
CREATE INDEX idx_toplu_islemler_olusturan ON toplu_islemler(olusturan_kullanici_id);
CREATE INDEX idx_toplu_islemler_tarih ON toplu_islemler(olusturma_tarihi DESC);
CREATE INDEX idx_toplu_islem_satirlari_islem ON toplu_islem_satirlari(islem_id);
CREATE INDEX idx_toplu_islem_satirlari_durum ON toplu_islem_satirlari(durum);
CREATE INDEX idx_toplu_islem_satirlari_hata_kod ON toplu_islem_satirlari(hata_kodu);

-- Birim Dönüşüm İndeksleri
CREATE INDEX idx_birimler_tip ON birimler(tip);
CREATE INDEX idx_birimler_aktif ON birimler(aktif) WHERE aktif = TRUE;
CREATE INDEX idx_birimler_kisa_ad ON birimler(kisa_ad);
CREATE INDEX idx_birim_donusum_kaynak ON birim_donusum(kaynak_birim_id);
CREATE INDEX idx_birim_donusum_hedef ON birim_donusum(hedef_birim_id);
CREATE INDEX idx_birim_donusum_aktif ON birim_donusum(aktif) WHERE aktif = TRUE;

-- Üretim Maliyet İndeksleri
CREATE INDEX idx_uretim_iscilik_uretim ON uretim_iscilik(uretim_id);
CREATE INDEX idx_uretim_iscilik_personel ON uretim_iscilik(personel_id);
CREATE INDEX idx_uretim_enerji_uretim ON uretim_enerji(uretim_id);
CREATE INDEX idx_uretim_enerji_tip ON uretim_enerji(gider_tipi);
CREATE INDEX idx_uretim_genel_gider_uretim ON uretim_genel_gider(uretim_id);
CREATE INDEX idx_uretim_genel_gider_donem ON uretim_genel_gider(donem_yil, donem_ay);

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
| kullanicilar | bildirimler | 1:N | Bir kullanıcı birden fazla bildirim alabilir |
| bildirimler | bildirim_gonderimleri | 1:N | Bir bildirim birden fazla kanala gönderilebilir |
| bildirimler | bildirim_kullanicari | 1:N | Bir bildirim birden fazla kullanıcıya atanabilir |
| depolar | depo_bloklar | 1:N | Bir deponun birden fazla bloğu olabilir |
| depo_bloklar | depo_konumlar | 1:N | Bir bloğun birden fazla konumu olabilir |
| depo_transfer | depo_transfer_detay | 1:N | Bir transferin birden fazla detayı olabilir |
| birimler | birim_donusum | 1:N (kaynak) | Bir birim birden fazla dönüşümde kaynak olabilir |
| birimler | birim_donusum | 1:N (hedef) | Bir birim birden fazla dönüşümde hedef olabilir |
| uretim_emri | uretim_iscilik | 1:N | Bir üretim emrine birden fazla işçilik kaydı eklenebilir |
| uretim_emri | uretim_enerji | 1:N | Bir üretim emrine birden fazla enerji gideri eklenebilir |
| uretim_emri | uretim_genel_gider | 1:N | Bir üretim emrine birden fazla genel gider eklenebilir |

### 8.2 Çoka Çok (N:N) İlişkiler

|| İlişki | Ara Tablo |
|--------|-----------|
| Tedarikçi ↔ Ürün | tedarikci_urunleri |
| Mamul ↔ Hammadde (dönüşüm) | urun_donusum |
| Lot ↔ Özellik | lot_ozellikleri |
| Bildirim ↔ Kullanıcı | bildirim_kullanicari |

---

## 9. Veri Sözlüğü

### 9.1_ENUM Değerleri

> **Kapsam Notu:** Bu sözlük kanonik enum sözlüğüdür. CHECK constraint'ler ve servis katmanı enum sabitleri bu tablodaki değerlerle bire bir aynı olmalıdır. Faturalama ve ödeme takibine ilişkin fiziksel alanlar kaldırılmıştır; yalnız faturalama/ödeme işlevlerinin kapsam dışı olduğunu belirten sınır notları korunur.

|| Alan | Geçerli Değerler |
||------|------------------|
|| `urunler.kategori` | MEYVE, BAL, KARSIM, KURUYEMIS, SEBZE, KURU_BAKLIYAT, YAG, TURSU, DIGER |
|| `stok_karti.stok_tipi` | HAMMADDE, MAMUL |
|| `stok_karti.durum` | AKTIF, BITTI, IPTAL, KALITE_KONTROL, DEPO_DISI, RET, SON_KULLANIM_GECDI, SON_KULLANIM_RISKLI, SON_KULLANIM_ISLEM_GECICI |
|| `stok_hareketleri.hareket_tipi` | GIRIS, URETIM_GIRIS, URETIM_CIKIS, SATIS_CIKIS, IADE, DUZELTME, TRANSFER, SON_KULLANIM_CIKIS |
|| `satis_kaydi.durum` | TAMAMLANDI, IPTAL, IADE |
|| *satis_kaydi.odeme_sekli (kapsam dışı, referans)* | NAKIT, CEK, HAVALE, KREDI_KARTI, KAPIDA_ODEME |
|| *satis_kaydi.odeme_durumu (kapsam dışı, referans)* | BEKLIYOR, ODENDI, KISMEN_ODENDI, VADE_GECIKTI |
|| *satis_kaydi.satis_tipi (kapsam dışı, referans)* | PERAKENDE, TOPTAN, OZEL_SIPARIS |
|| *uretim_emri.oncelik (kapsam dışı, referans)* | DUSUK, NORMAL, YUKSEK, ACIL |
|| `musteriler.musteri_tipi` | BIREYSEL, KURUMSAL |
|| `musteriler.cinsiyet` | E, K, D |
|| `tedarikciler.tedarikci_sinifi` | A, B, C |
|| `musteriler.musteri_sinifi` | A, B, C |
|| `uretim_emri.durum` | BEKLEMEDE, ONAYLANDI, TAMAMLANDI, IPTAL |
|| `kalite_kontrol.durum` | BEKLIYOR, KONTROL_EDILIYOR, KABUL, KISMEN_KABUL, RET |
|| `kalite_kontrol.sonuc` | UYGUN, SINIRDA, UYGUNSIZ |
|| `kalite_kontrol.kontrol_tipi` | GIRIS_KONTROL, PERIYODIK, SEBEPE, SIPARIS_KONTROL |
|| `kalite_kontrol.kontrol_turu` | GIRIS, CIKIS, PERIYODIK, SEBEBEP |
|| `urun_ozellikleri.tip` | METIN, SAYI, ENUM, BOOLEAN, TARIH |
|| `etiket_sablon.tur` | MAL_ALIM, URETIM, SATIS, GENEL |
|| `etiket_sablon.etiket_boyut` | STANDART, BUYUK, MINI |
|| `etiket_sablon.barkod_format` | CODE128, QR, EAN13 |
|| `etiket_alan.alan_tipi` | SabitMetin, UrunAdi, LotNo, Tarih, Miktar, Tedarikci, OzelAlan, Barkod, QRCode, Fotograf |
|| `sistem_ayarlari.veri_tipi` | STRING, INTEGER, DECIMAL, BOOLEAN, JSON |
|| `sistem_ayarlari.kategori` | GENEL, STOK, URETIM, SATIS, ETIKET |
|| `gida_geri_cekme.sinif` | CLASS1, CLASS2, CLASS3 |
|| `gida_geri_cekme.durum` | AKTIF, TAMAMLANDI, IPTAL |
|| `toplu_islemler.durum` | BEKLEMEDE, VALIDATING, ISLENIYOR, TAMAMLANDI, HATALAR_VAR, IPTAL_EDILDI |
|| `toplu_islem_satirlari.durum` | BASARILI, BASARISIZ, ATLANDI, VALIDATION_HATASI |
|| `stok_duzeltme_talepleri.durum` | OLUSTURULDU, BEKLEMEDE_ONAY, ONAYLANDI, REDDEDILDI, TAMAMLANDI, IPTAL_EDILDI |
|| `stok_duzeltme_talepleri.talep_tipi` | SAYIM_FARKI, FIRE_ZARAR, CALISMA, BIRIM_DEGISIKLIGI |
|| `depo_transfer.durum` | OLUSTURULDU, BEKLEMEDE, ONAYLANDI, REDDEDILDI, TAMAMLANDI, IPTAL_EDILDI |
|| `depo_konumlar.tip` | STORAGE, PICKING, BUFFER, DAMAGED, QUARANTINE |
|| `depo_konumlar.durum` | BOS, DOLU, REZERVE, BAKIM, IPTAL |
|| `skt_islem.islem_turu` | IMHA, INDIRIM, DEVIR, IADE_TEDARIKCI |
|| `skt_islem.durum` | BEKLEMEDE, ONAYLANDI, TAMAMLANDI, IPTAL |
|| `iade.durum` | OLUSTURULDU, KALITE_KONTROL, STOK_GIRISI, TAMAMLANDI, RET |
|| `fifo_ihlal_onay.onay_durumu` | BEKLEMEDE, ONAYLANDI, REDDEDILDI |
|| `uretim_maliyet.birim` (referans, kapsam dışı) | TRY, USD, EUR |
|| `genel_gider.gider_tipi` | KIRA, ELEKTRIK, SU, DOGALGAZ, PERSONEL, DIGER |

**ASCII enum kuralı:** Tüm enum sabitleri ASCII (Türkçe karakter içermez) kullanır. Örnek: `SON_KULLANIM_GECDI`, `SON_KULLANIM_RISKLI`, `SON_KULLANIM_ISLEM_GECICI`, `ONAYLANDI`, `BEKLEMEDE`, `IPTAL`, `TAMAMLANDI`. Bu, CHECK constraint'lerin taşınabilirliğini ve DB charset bağımsızlığını sağlar.

---

## 10. KVKK Uyumluluğu — Kişisel Veri Tabloları

### 10.1 `kvkk_veri_envanteri` — Kişisel Veri Envanter Kaydı
KVKK madde 3/1-(e) uyarınca veri envanteri tutulması için zorunlu tablo.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `envanter_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `veri_kategori` | VARCHAR(50) | ✓ | KİMLİK, İLETİŞİM, FİNANSAL, GÜVENLİK, ÇALIŞAN |
| `veri_alt_kategori` | VARCHAR(100) | ✓ | Örn: TCKN, Telefon, IBAN, IP adresi |
| `tablo_adi` | VARCHAR(100) | ✓ | İlgili veritabanı tablosu |
| `alan_adi` | VARCHAR(100) | ✓ | İlgili sütun |
| `isleme_amaci` | TEXT | ✓ | Verilerin işlenme amacı |
| `hukuki_sebep` | VARCHAR(50) | ✓ | SÖZLESME, YASAL_YUKUMLULUK, MEŞRU_MENFAAT, AÇIK_RIZA |
| `saklama_suresi_ay` | INTEGER | ✓ | Ay cinsinden saklama süresi |
| `veri_sahibi_turu` | VARCHAR(50) | ✓ | MUSTERI, TEDARIKCI, CALISAN, ZIYARETCI |
| `ozel_kişisel_veri` | BOOLEAN | ✓ | 6698 SK 6. madde kapsamı (ırk, etnik köken, siyasi, vb.) |
| `aktarim_yapiliyor` | BOOLEAN | ✓ | Yurt dışına aktarım yapılıyor mu? |
| `aktarim_ulke` | VARCHAR(100) | Hayır | Yurt dışı aktarım yapılıyorsa hedef ülke |
| `aktarim_sebep` | TEXT | Hayır | Aktarım gerekçesi |
| `guvenlik_onlemi` | VARCHAR(100) | ✓ | Şifreleme, maskeleme, erişim kontrolü |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

**İlişkiler:**
- `olusturan_kullanici_id` → `kullanicilar(kullanici_id)` (Many-to-One)

**Kısıtlamalar:**
```sql
CONSTRAINT kvkk_envanter_uniq EXCLUDE (tablo_adi WITH =, alan_adi WITH =) WHERE (silme_tarihi IS NULL);
```

---

### 10.2 `kvkk_veri_sahibi_talebi` — Veri Sahibi Hak Talebi Kaydı
KVKK madde 13-18 arasında tanımlanan veri sahibi başvurularının takibi.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `talep_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `talep_turu` | VARCHAR(30) | ✓ | BİLGİ_ALMA, DÜZELTME, SİLME, ANONİM_HALE_GETİRME, İTİRAZ |
| `talep_edilen_veri` | TEXT | ✓ | Hangi verilerin işlenip işlenmediğinin öğrenilmesi talebi |
| `talep_durumu` | VARCHAR(20) | ✓ | BEKLEMEDE, İŞLENİYOR, TAMAMLANDI, REDDEDİLDİ |
| `basvuru_tarihi` | DATE | ✓ | Veri sahibinin başvuru tarihi |
| `yanit_tarihi` | DATE | Hayır | Yanıt tarihi |
| `yanit_suresi_gun` | INTEGER | ✓ | Yasal süre içinde yanıtlandı mı? |
| `talep_eden_kisi` | VARCHAR(255) | ✓ | Başvuru sahibinin adı-soyadı |
| `talep_eden_tc` | VARCHAR(11) | Hayır | TC Kimlik numarası (bireysel) |
| `talep_eden_eposta` | VARCHAR(255) | ✓ | Başvuru sahibinin e-posta adresi |
| `talep_eden_telefon` | VARCHAR(20) | Hayır | Başvuru sahibinin telefonu |
| `talep_detayi` | TEXT | ✓ | Talep içeriği |
| `yanit_detayi` | TEXT | Hayır | Verilen yanıt detayı |
| `ret_sebebi` | TEXT | Hayır | Reddedilme sebebi (varsa) |
| `onaylayan_id` | UUID | Hayır | Talebi yanıtlayan kullanıcı (FK → kullanicilar) |
| `musteri_id` | UUID | Hayır | İlgili müşteri (FK → musteriler) |
| `tedarikci_id` | UUID | Hayır | İlgili tedarikçi (FK → tedarikciler) |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Kaydı oluşturan kullanıcı (FK → kullanicilar) |

**İlişkiler:**
- `musteri_id` → `musteriler(musteri_id)` (Many-to-One, nullable)
- `tedarikci_id` → `tedarikciler(tedarikci_id)` (Many-to-One, nullable)
- `onaylayan_id` → `kullanicilar(kullanici_id)` (Many-to-One, nullable)

**Enum Değerleri:**
| Alan | Geçerli Değerler |
|------|------------------|
| `talep_turu` | BİLGİ_ALMA, DÜZELTME, SİLME, ANONİM_HALE_GETİRME, İTİRAZ |
| `talep_durumu` | BEKLEMEDE, İŞLENİYOR, TAMAMLANDI, REDDEDİLDİ |

---

### 10.3 `kvkk_veri_isleyen_sozlesme` — Veri İşleyen Sözleşme Kaydı
Harici veri işleyenler (bulut sağlayıcı, e-posta servisi, ödeme kurumu vb.) ile imzalanan sözleşmelerin takibi.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `sozlesme_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `isleyen_ad` | VARCHAR(255) | ✓ | Veri işleyen kurum/kuruluş adı |
| `vergi_no` | VARCHAR(20) | Hayır | Veri işleyen vergi numarası |
| `sozlesme_tarihi` | DATE | ✓ | Sözleşme imza tarihi |
| `sozlesme_bitis` | DATE | ✓ | Sözleşme bitiş tarihi |
| `islenen_veri_kategorileri` | JSONB | ✓ | İşlenen kişisel veri kategorileri listesi |
| `isleme_amaci` | TEXT | ✓ | Verilerin hangi amaçla işleneceği |
| `guvenlik_onlemleri` | TEXT | ✓ | Teknik ve idari güvenlik tedbirleri |
| `alt_isleyen_izni` | BOOLEAN | ✓ | Alt işleyen kullanımına izin var mı? |
| `alt_isleyen_liste` | JSONB | Hayır | İzin verilen alt işleyen listesi |
| `veri_ihlali_bildirim_suresi` | INTEGER | ✓ | Saat cinsinden bildirim süresi (varsayılan: 72) |
| `sigorta_var` | BOOLEAN | Hayır | Siber sigorta mevcut mu? |
| `sigorta_police_no` | VARCHAR(100) | Hayır | Sigorta poliçe numarası |
| `denetim_hakki` | BOOLEAN | ✓ | Periyodik denetim hakkı saklı mı? |
| `denetim_periyodu_ay` | INTEGER | Hayır | Kaç ayda bir denetim hakkı |
| `sozlesme_dosyasi_url` | VARCHAR(500) | Hayır | İmzalı sözleşme belgesi URL |
| `aktif` | BOOLEAN | ✓ | Sözleşme aktif mi? |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |

---

## 11. Gıda Güvenliği — İzlenebilirlilik ve Kalite Tabloları

### 11.1 `gida_izlenebilirlik_log` — İzlenebilirlik Zinciri Logu
TGK İzlenebilirlilik Tebliği kapsamında lot bazlı izlenebilirlilik kayıtları.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `log_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `kaynak_tablo` | VARCHAR(50) | ✓ | Kaynak tablo (stok_karti, uretim_emri, satis_kaydi) |
| `kaynak_id` | UUID | ✓ | Kaynak kayıt ID |
| `lot_no` | VARCHAR(50) | ✓ | İzlenen lot numarası |
| `asama` | VARCHAR(30) | ✓ | TEDARİK, ÜRETİM, DEPOLAMA, DAĞITIM, SATIŞ |
| `girilen_lot_no` | VARCHAR(50) | ✓ | Giriş lot numarası (kaynak lot) |
| `cikan_lot_no` | VARCHAR(50) | Hayır | Çıkış lot numarası (varsa) |
| `miktar` | DECIMAL(15,3) | ✓ | İzlenen miktar |
| `birim` | VARCHAR(20) | ✓ | Miktar birimi (kg, adet, ton) |
| `tedarikci_id` | UUID | Hayır | İlgili tedarikçi (varsa) (FK → tedarikciler) |
| `musteri_id` | UUID | Hayır | İlgili müşteri (varsa) (FK → musteriler) |
| `uretim_emri_id` | UUID | Hayır | İlgili üretim emri (varsa) (FK → uretim_emri) |
| `satis_kaydi_id` | UUID | Hayır | İlgili satış kaydı (varsa) (FK → satis_kaydi) |
| `ref_evrak_no` | VARCHAR(100) | Hayır | İrsaliye, reçete veya harici teslimat belgesi numarası |
| `sorumlu_kullanici_id` | UUID | ✓ | İşlemi yapan kullanıcı (FK → kullanicilar) |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |

**İlişkiler:**
- `tedarikci_id` → `tedarikciler(tedarikci_id)` (Many-to-One, nullable)
- `musteri_id` → `musteriler(musteri_id)` (Many-to-One, nullable)
- `uretim_emri_id` → `uretim_emri(uretim_emri_id)` (Many-to-One, nullable)
- `satis_kaydi_id` → `satis_kaydi(satis_kaydi_id)` (Many-to-One, nullable)

**Enum Değerleri:**
| Alan | Geçerli Değerler |
|------|------------------|
| `asama` | TEDARİK, ÜRETİM, DEPOLAMA, DAĞITIM, SATIŞ |

**İndeksler:**
```sql
CREATE INDEX idx_izlenebilirlik_lot ON gida_izlenebilirlik_log(lot_no);
CREATE INDEX idx_izlenebilirlik_kaynak ON gida_izlenebilirlik_log(kaynak_tablo, kaynak_id);
```

---

### 11.2 `gida_geri_cekme` — Geri Çekme (Recall) Kaydı
Gıda güvenliği sorunu tespit edildiğinde yürütülen recall sürecinin kayıtları.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `cekme_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `cekme_no` | VARCHAR(50) | ✓ | Benzersiz recall numarası (örn: RECALL-2026-001) |
| `sinif` | VARCHAR(20) | ✓ | Risk sınıfı: CLASS1, CLASS2, CLASS3 |
| `durum` | VARCHAR(20) | ✓ | DURUM: AKTIF, TAMAMLANDI, IPTAL |
| `urun_id` | UUID | ✓ | Etkilenen ürün (FK → urunler) |
| `lot_no` | VARCHAR(50) | ✓ | Etkilenen lot numarası |
| `uretici_firma` | VARCHAR(255) | ✓ | Üretici firma adı |
| `sorun_tanimi` | TEXT | ✓ | Tespit edilen gıda güvenliği sorunu |
| `risk_seviyesi` | TEXT | ✓ | Sağlık riski değerlendirmesi |
| `bilisim_olusturuldu` | BOOLEAN | ✓ | Bakanlığa bildirim yapıldı mı? |
| `bildirim_tarihi` | DATE | Hayır | Bakanlığa bildirim tarihi |
| `musteri_bildirimi_tarihi` | DATE | Hayır | Müşterilere bildirim tarihi |
| `urun_miktari` | DECIMAL(15,3) | ✓ | Etkilenen ürün miktarı |
| `birim` | VARCHAR(20) | ✓ | Miktar birimi |
| `imha_edilen_miktar` | DECIMAL(15,3) | Hayır | İmha edilen miktar |
| `iade_edilen_miktar` | DECIMAL(15,3) | Hayır | İade edilen miktar |
| `dogrulama_tarihi` | DATE | Hayır | Recall tamamlandı doğrulama tarihi |
| `kapanis_notu` | TEXT | Hayır | Kapanış notu |
| `olusturan_kullanici_id` | UUID | ✓ | Oluşturan kullanıcı (FK → kullanicilar) |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | Son güncelleme tarihi |

**Enum Değerleri:**
| Alan | Geçerli Değerler |
|------|------------------|
| `sinif` | CLASS1, CLASS2, CLASS3 |
| `durum` | AKTIF, TAMAMLANDI, IPTAL |

**İlişkiler:**
- `urun_id` → `urunler(urun_id)` (Many-to-One)
- `olusturan_kullanici_id` → `kullanicilar(kullanici_id)` (Many-to-One)

**Unique Constraint:**
```sql
CONSTRAINT gida_geri_cekme_no_unique UNIQUE (cekme_no);
```

---

### 11.3 `kalite_kontrol` — Kalite Kontrol Analiz Kaydı (kanonik)

> **Kanonik Karar (2026-07-30 audit raporu 1.6):** DB-Design içindeki önceki mükerrer kalite modeli kaldırılmıştır. Fiziksel CREATE TABLE §21.1 bölümünde yalnız `kalite_kontrol` adıyla yapılır; alias veya geri-uyumluluk view'ı tanımlanmaz.

**Durum State Machine:**
```
BEKLIYOR → KONTROL_EDILIYOR → KABUL
                                 → KISMEN_KABUL
                                 → RET
```
- `sonuc` alanı (`UYGUN` / `SINIRDA` / `UYGUNSIZ`) ölçüm/analiz sonucudur; `durum` ile karıştırılmaz.
- Aynı kalite_kontrol kaydında `durum` iş akışı durumunu, `sonuc` ise ölçüm sonucunu temsil eder.

**Alanlar (kanonik tek tablo):**

|| Alan | Tip | Zorunlu | Açıklama |
||------|-----|---------|----------|
|| `kalite_id` | UUID | ✓ | PK |
|| `stok_id` | UUID | ✓ | FK → stok_karti |
|| `uretim_emri_id` | UUID | Hayır | FK → uretim_emri (varsa) |
|| `tedarikci_id` | UUID | Hayır | FK → tedarikciler |
|| `kontrol_tipi` | VARCHAR(30) | ✓ | GIRIS_KONTROL, PERIYODIK, SEBEPE, SIPARIS_KONTROL |
|| `durum` | VARCHAR(30) | ✓ | BEKLIYOR, KONTROL_EDILIYOR, KABUL, KISMEN_KABUL, RET |
|| `sonuc` | VARCHAR(20) | Hayır | UYGUN, SINIRDA, UYGUNSIZ |
|| `kontrol_edilen_miktar` | DECIMAL(15,3) | Hayır | Kontrol edilen miktar |
|| `birim` | VARCHAR(20) | Hayır | Miktar birimi |
|| `kabul_miktar` | DECIMAL(15,3) | Hayır | Kabul edilen miktar |
|| `red_miktar` | DECIMAL(15,3) | Hayır | Reddedilen miktar |
|| `kontrol_tarihi` | DATE | ✓ | Fiziksel kontrol tarihi |
|| `kontrol_suresi_dk` | INTEGER | Hayır | Kontrol süresi (dakika) |
|| `sonraki_kontrol_tarihi` | DATE | Hayır | Planlanan sonraki kontrol |
|| `kontrol_eden_lab` | VARCHAR(255) | Hayır | Analizi yapan laboratuvar (varsa) |
|| `lab_rapor_no` | VARCHAR(100) | Hayır | Lab rapor numarası |
|| `parametre_adi` | VARCHAR(100) | Hayır | Analiz parametresi (örn: Aflatoksin B1, SO2, Nem) |
|| `sonuc_deger` | DECIMAL(15,4) | Hayır | Ölçülen sayısal değer |
|| `limit_deger` | DECIMAL(15,4) | Hayır | Yasal limit değeri |
|| `analiz_metodu` | VARCHAR(100) | Hayır | Kullanılan analiz yöntemi |
|| `rapor_dosya_url` | VARCHAR(500) | Hayır | Lab raporu PDF URL |
|| `sonuc_puani` | INTEGER | Hayır | 0-100 arası kalite puanı |
|| `sonuc_aciklama` | TEXT | Hayır | Kontrol sonucu açıklaması |
|| `olusturan_kullanici_id` | UUID | ✓ | FK → kullanicilar |
|| `not` | TEXT | Hayır | Serbest not |
|| `olusturma_tarihi` | TIMESTAMP | ✓ | |
|| `guncelleme_tarihi` | TIMESTAMP | ✓ | |
|| `silme_tarihi` | TIMESTAMP | Hayır | |

**İlişkiler:**
- `stok_id` → `stok_karti(stok_id)` (Many-to-One)
- `olusturan_kullanici_id` → `kullanicilar(kullanici_id)` (Many-to-One)
- `uretim_emri_id` → `uretim_emri(uretim_id)` (Many-to-One, nullable)
- `tedarikci_id` → `tedarikciler(tedarikci_id)` (Many-to-One, nullable)

**CHECK Constraint'ler:**
```sql
CONSTRAINT kalite_kontrol_durum_check CHECK (durum IN ('BEKLIYOR', 'KONTROL_EDILIYOR', 'KABUL', 'KISMEN_KABUL', 'RET'));
CONSTRAINT kalite_kontrol_sonuc_check CHECK (sonuc IS NULL OR sonuc IN ('UYGUN', 'SINIRDA', 'UYGUNSIZ'));
CONSTRAINT kalite_kontrol_kontrol_tipi_check CHECK (kontrol_tipi IN ('GIRIS_KONTROL', 'PERIYODIK', 'SEBEPE', 'SIPARIS_KONTROL'));
```

> Bu bölüm §3.8.2 (genel kontrol), §11.3 (lab analiz), §21.1 (iş akışı durum) üçlüsünü tek tabloya indirger. Fiziksel CREATE TABLE §21.1'de bulunur.

## 12. Denetim İzi (Audit Trail) Tabloları

### 12.1 `denetim_izi` — Merkezi Denetim Günlüğü
Tüm sistem işlemlerinin merkezi olarak kaydedildiği tablo.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `kayit_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `zaman_damgasi` | TIMESTAMPTZ | ✓ | UTC olarak kesin zaman |
| `kullanici_id` | UUID | ✓ | İşlemi yapan kullanıcı (FK → kullanicilar) |
| `rol` | VARCHAR(50) | ✓ | Kullanıcının rolü |
| `islem_turu` | VARCHAR(30) | ✓ | CREATE, UPDATE, DELETE, READ, LOGIN, LOGOUT |
| `tablo_adi` | VARCHAR(100) | ✓ | Etkilenen tablo |
| `kayit_id` | UUID | ✓ | Etkilenen kayıt ID |
| `eski_deger` | JSONB | Hayır | Güncelleme/iptal öncesi değer |
| `yeni_deger` | JSONB | Hayır | Güncelleme/iptal sonrası değer |
| `ip_adresi` | VARCHAR(45) | ✓ | IPv4 veya IPv6 |
| `oturum_id` | VARCHAR(100) | ✓ | Benzersiz oturum tanımlayıcı |
| `basarili` | BOOLEAN | ✓ | İşlem başarılı mı? |
| `hata_mesaji` | TEXT | Hayır | Hata durumunda hata mesajı |
| `imza` | VARCHAR(128) | ✓ | HMAC-SHA256 imza |
| `zincir_imza` | VARCHAR(128) | Hayır | Önceki kayıda zincirleme imza (blok zinciri) |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |

**İlişkiler:**
- `kullanici_id` → `kullanicilar(kullanici_id)` (Many-to-One)

**İndeksler:**
```sql
CREATE INDEX idx_audit_zaman ON denetim_izi(zaman_damgasi DESC);
CREATE INDEX idx_audit_kullanici ON denetim_izi(kullanici_id, zaman_damgasi DESC);
CREATE INDEX idx_audit_tablo ON denetim_izi(tablo_adi, kayit_id);
CREATE INDEX idx_audit_imza ON denetim_izi(imza);
```

**Kısıtlamalar:**
```sql
CONSTRAINT denetim_izi_silinemez CHECK (1=1); -- Tetikleyici ile silme engellenir
```

---

### 12.2 `denetim_izi_ziyaret` — Audit Log Erişim Kaydı
Denetim günlüklerine kimlerin eriştiğinin kaydı (meta-audit).

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `ziyaret_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `kullanici_id` | UUID | ✓ | Logları görüntüleyen kullanıcı (FK → kullanicilar) |
| `ziyaret_tarihi` | TIMESTAMPTZ | ✓ | Erişim zamanı |
| `filtreler` | JSONB | Hayır | Uygulanan filtreler (tarih aralığı, tablo, kullanıcı) |
| `aktarilan_kayit_sayisi` | INTEGER | Hayır | Dışa aktarılan kayıt sayısı |
| `ip_adresi` | VARCHAR(45) | ✓ | Erişim yapan IP |
| `tarayici` | VARCHAR(255) | Hayır | User-agent bilgisi |

---

## 13. Operasyonel Stok Değerleme

> **Kapsam sınırı:** Faturalama, ödeme, vergi beyannamesi ve mali defterler bu sistemin kapsamı dışındadır. Mali belge/vergi tabloları ve alanları fiziksel şemada yer almaz. Bu bölüm yalnız üretim ve stok maliyetlerinin operasyonel raporlanmasını tanımlar.

### 13.1 `stok_degerleme` — Operasyonel Stok Değerleme Kayıtları

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `degerleme_id` | UUID | ✓ | Benzersiz tanımlayıcı (PK) |
| `donem` | VARCHAR(7) | ✓ | Dönem (YYYY-MM formatı) |
| `urun_id` | UUID | ✓ | Ürün referansı (FK → urunler) |
| `lot_no` | VARCHAR(50) | ✓ | Lot numarası |
| `stok_tipi` | VARCHAR(20) | ✓ | HAMMADDE veya MAMUL |
| `degerleme_yontemi` | VARCHAR(30) | ✓ | FIFO, ORTALAMA, MALIYET |
| `miktar` | DECIMAL(15,3) | ✓ | Dönem sonu miktar |
| `birim_maliyet` | DECIMAL(15,4) | ✓ | Hesaplanan operasyonel birim maliyet |
| `toplam_deger` | DECIMAL(15,4) | ✓ | Operasyonel toplam stok değeri |
| `degerleme_tarihi` | DATE | ✓ | Değerleme tarihi |
| `olusturan_kullanici_id` | UUID | ✓ | FK → kullanicilar |
| `olusturma_tarihi` | TIMESTAMP | ✓ | Kayıt oluşturma tarihi |

**İlişkiler:**
- `urun_id` → `urunler(urun_id)` (Many-to-One)
- `olusturan_kullanici_id` → `kullanicilar(kullanici_id)` (Many-to-One)

**Enum Değerleri:**
- `stok_tipi`: `HAMMADDE`, `MAMUL`
- `degerleme_yontemi`: `FIFO`, `ORTALAMA`, `MALIYET`

---



## 14. Güncellenmiş Veri Sözlüğü — Yeni Enum Değerleri

| Alan | Geçerli Değerler |
|------|------------------|
| `kvkk_veri_sahibi_talebi.talep_turu` | BİLGİ_ALMA, DÜZELTME, SİLME, ANONİM_HALE_GETİRME, İTİRAZ |
| `kvkk_veri_sahibi_talebi.talep_durumu` | BEKLEMEDE, İŞLENİYOR, TAMAMLANDI, REDDEDİLDİ |
| `kvkk_veri_envanteri.veri_kategori` | KİMLİK, İLETİŞİM, FİNANSAL, GÜVENLİK, ÇALIŞAN |
| `kvkk_veri_envanteri.hukuki_sebep` | SÖZLESME, YASAL_YUKUMLULUK, MEŞRU_MENFAAT, AÇIK_RIZA |
| `kvkk_veri_envanteri.veri_sahibi_turu` | MUSTERI, TEDARIKCI, CALISAN, ZIYARETCI |
| `gida_izlenebilirlik_log.asama` | TEDARIK, URETIM, DEPOLAMA, DAGITIM, SATIS |
| `gida_geri_cekme.sinif` | CLASS1, CLASS2, CLASS3 |
| `gida_geri_cekme.durum` | AKTIF, TAMAMLANDI, IPTAL |
| `kalite_kontrol.durum` | BEKLIYOR, KONTROL_EDILIYOR, KABUL, KISMEN_KABUL, RET |
| `kalite_kontrol.sonuc` | UYGUN, SINIRDA, UYGUNSIZ |
| `denetim_izi.islem_turu` | CREATE, UPDATE, DELETE, READ, LOGIN, LOGOUT |
| `stok_degerleme.stok_tipi` | HAMMADDE, MAMUL |
| `stok_degerleme.degerleme_yontemi` | FIFO, ORTALAMA, MALIYET |

---

## 16. Altyapı: Güvenlik Notları

### 16.1 Şifre Güvenliği
- Şifreler bcrypt ile hash'lenerek saklanmalı (`sifre_hash`)
- Minimum 12 karakter, karmaşıklık gereksinimi uygulanmalı (bkz. SRS Bölüm 7.1)

### 16.2 Erişim Kontrolü
- Roller tablosu üzerinden yetki listesi tanımlı
- Audit log ile tüm değişiklikler takip edilmeli
- Soft delete ile veri kaybı önlenmeli

### 16.3 Veri Koruma
- Hassas alanlar (eposta, telefon, vergi_no) için ek şifreleme düşünülebilir
- Audit log'da eski/yeni değerler JSONB olarak saklanır

---

---

## 17. Altyapı: Bölümlendirme

### 17.1 Genel İlkeler
- PostgreSQL **Range Partitioning** kullanılır.
- Tüm bölümlendirmeler **RANGE** tipi olup, tarih sütunları üzerinden yapılır.
- Partition'lar **YEAR/MONTH** bazında oluşturulur; yeni partition'lar otomatik eklenir.
- Eski partition'lar **Detach** edilerek arşivlenir, fiziksel silme yapılmaz.

---

### 17.2 Tablo Bölümlendirme Stratejisi

#### 17.2.1 `stok_hareketleri` — AYLIK Bölümlendirme

**Gerekçe:** Stok hareketleri en yoğun yazılan tablodur; aylık partition ile sorgu performansı, bakım ve arşivleme kolaylaşır.

```sql
-- Parent tablo
CREATE TABLE stok_hareketleri (
    hareket_id       UUID DEFAULT gen_random_uuid(),
    stok_karti_id    UUID NOT NULL,
    hareket_tipi     VARCHAR(20) NOT NULL,
    miktar           DECIMAL(15,3) NOT NULL,
    birim            VARCHAR(10) NOT NULL,
    birim_fiyat      DECIMAL(15,4),
    toplam_tutar     DECIMAL(15,2),
    hareket_tarihi   TIMESTAMP NOT NULL DEFAULT NOW(),
    referans_tablo   VARCHAR(50),
    referans_id      UUID,
    onceki_miktar    DECIMAL(15,3),
    sonraki_miktar   DECIMAL(15,3),
    aciklama         TEXT,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT NOW(),
    olusturan_kullanici_id UUID NOT NULL,
    CONSTRAINT stok_hareketleri_pk PRIMARY KEY (hareket_id, hareket_tarihi)
) PARTITION BY RANGE (hareket_tarihi);

-- Örnek aylık partition'lar (2026 yılı)
CREATE TABLE stok_hareketleri_2026_01 PARTITION OF stok_hareketleri
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE stok_hareketleri_2026_02 PARTITION OF stok_hareketleri
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE stok_hareketleri_2026_03 PARTITION OF stok_hareketleri
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE stok_hareketleri_2026_04 PARTITION OF stok_hareketleri
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE stok_hareketleri_2026_05 PARTITION OF stok_hareketleri
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE stok_hareketleri_2026_06 PARTITION OF stok_hareketleri
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE stok_hareketleri_2026_07 PARTITION OF stok_hareketleri
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE stok_hareketleri_2026_08 PARTITION OF stok_hareketleri
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE stok_hareketleri_2026_09 PARTITION OF stok_hareketleri
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE stok_hareketleri_2026_10 PARTITION OF stok_hareketleri
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE stok_hareketleri_2026_11 PARTITION OF stok_hareketleri
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE stok_hareketleri_2026_12 PARTITION OF stok_hareketleri
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- 2027 yılı için ön-tanımlı partition (catch-all)
CREATE TABLE stok_hareketleri_2027_default PARTITION OF stok_hareketleri
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
```

**Partition Yönetim Stratejisi:**
- **Oluşturma:** Her yılın Kasım ayında, bir sonraki yılın tüm partition'ları önceden oluşturulur.
- **Arşivleme:** 24 aydan eski partition'lar `DETACH` edilerek salt-okunur arşiv tablosuna alınır.
- **Silme:** Arşiv partition'ları gerektiğinde `DROP TABLE` ile fiziksel silinir (yasal süreç sonrası).
- **Index:** Her partition'da `(stok_karti_id, hareket_tarihi)` ve `(hareket_tipi, hareket_tarihi)` composite index'leri bulunur.

---

#### 17.2.2 `audit_log` — YILLIK Bölümlendirme

**Gerekçe:** Audit log salt-yazma, nadir-okuma bir tablodur; yıllık partition ile uzun vadeli arşivleme ve uyumluluk (KVKK/GDPR) sağlanır.

```sql
-- Parent tablo
CREATE TABLE audit_log (
    log_id          UUID DEFAULT gen_random_uuid(),
    tablo_adi       VARCHAR(100) NOT NULL,
    satir_id        UUID,
    islem_tipi      VARCHAR(10) NOT NULL,  -- INSERT, UPDATE, DELETE
    onceki_deger    JSONB,
    sonraki_deger   JSONB,
    ip_adresi       VARCHAR(45),
    kullanici_id    UUID NOT NULL,
    islem_tarihi    TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata        JSONB,
    CONSTRAINT audit_log_pk PRIMARY KEY (log_id, islem_tarihi)
) PARTITION BY RANGE (islem_tarihi);

-- Yıllık partition'lar
CREATE TABLE audit_log_2025 PARTITION OF audit_log
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE audit_log_2026 PARTITION OF audit_log
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE audit_log_2027 PARTITION OF audit_log
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
CREATE TABLE audit_log_2028 PARTITION OF audit_log
    FOR VALUES FROM ('2028-01-01') TO ('2029-01-01');

-- Arşivleme: 2025 ve öncesi partition'lar ayrı schema'da tutulabilir
-- ALTER TABLE audit_log_2025 SET SCHEMA audit_archive;
```

**Retention Politikası:**
- **7 yıl** süreyle saklanır (KVKK uyumluluğu kapsamında).
- 7 yıldan eski partition'lar Detach → Arşiv schema → Gerektiğinde fiziksel silme.

---

#### 17.2.3 Diğer Tablolar — Bölümlendirme YOK

Aşağıdaki tablolar **bölümlendirilmez**; boyutları kritik eşiğe ulaşmadıkça standalone olarak tutulur:

| Tablo | Gerekçe |
|-------|---------|
| `stok_karti` | Lot bazında sorgu, boyut küçük, partition'a gerek yok |
| `satis_kaydi` / `satis_kalemleri` | Satış hacmine göre değerlendirilecek; henüz kritik boyutta değil |
| `uretim_emri` / `uretim_detay` | Düşük hacimli |
| `tedarikciler`, `musteriler`, `kullanicilar` | Look-up tabloları |

> **Not:** `satis_kaydi` ve `satis_kalemleri` tabloları, yıllık satış hacmi > 5 milyon satırı aştığında **YILLIK** olarak bölümlendirilebilir. Bu karar üretim devreye alındıktan sonra, operasyonel metriklere dayanarak alınacaktır.

---

## 18. Altyapı: PgBouncer

### 18.1 Mimari Konum
```
[Uygulama Sunucuları]
        │
        ▼
  ┌─────────────┐
  │   PgBouncer  │  ← Transaction-mode pooling
  │  (connection │
  │    broker)   │
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  PostgreSQL │  ← Max 20 backend connection
  │   Primary   │
  └─────────────┘
```

### 18.2 PgBouncer Yapılandırma Dosyası

```ini
; ──────────────────────────────────────────────
;  pgbouncer.ini — Kurutulmuş Meyve ve Bal ERP
; ──────────────────────────────────────────────

[databases]
erp_db = host=127.0.0.1 port=5432 dbname=erp_prod

; ── Connection Settings ──
pool_size = 20              ; PostgreSQL backend başına max eşzamanlı connection
max_client_conn = 100       ; PgBouncer'a bağlanabilecek max client (uygulama + admin)
reserve_pool_size = 5       ; Peak anında ekstra connections (reserve pool)
reserve_pool_timeout = 3   ; Reserve pool'a geçiş süresi (saniye)
max_db_connections = 25     ; Tek bir database'e max toplam connection (pool_size + reserve)

; ── Pool Mode ──
; Transaction-mode: transaction bazında connection alınır/serbest bırakılır.
; Sorgular arasında connection boşta kalabilir.
; Uygulama tarafında "SET SESSION" ve "PREPARE" kullanılmamalıdır.
pool_mode = transaction

; ── Timeouts ──
server_idle_timeout = 600   ; Boşta connection'ın timeout'u (saniye)
server_connect_timeout = 15 ; Backend connection oluşturma timeout'u (saniye)
server_lifetime = 3600      ; Bir connection'ın ömrü (saniye); 1 saat sonra yenilen
query_timeout = 300         ; Maksimum sorgu süresi (saniye); raporlama sorguları için yeterli

; ── Logging & Safety ──
log_connections = 0         ; Normal bağlantıları loglama (1 = açık, performans etkisi)
log_disconnections = 0
log_pooler_errors = 1      ; Hata mesajlarını logla
stats_period = 60           ; İstatistik özetleme периода (saniye)

; ── Auth ──
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
admin_users = pgb_admin
```

### 18.3 PgBouncer Kullanıcı Listesi (`userlist.txt`)

```txt
# Format: "kullaniciadi" "sifrehashi"
# Şifreler PostgreSQL'deki pg_authid tablosuyla eşleşmelidir
"erp_app"     "SCRAM-SHA-256$..."
"erp_read"    "SCRAM-SHA-256$..."
"pgb_admin"   "SCRAM-SHA-256$..."
```

### 18.4 Uygulama Tarafı Bağlantı String'i

```python
# Örnek: SQLAlchemy / Django / psycopg2 bağlantı string'i
DATABASE_URL = "postgresql://erp_app@127.0.0.1:6432/erp_prod"

# 6432 → PgBouncer dinleme portu (varsayılan admin portu 6432 değil, 5432'dir;
# PgBouncer varsayılan portu 5432' dir; burada 6432 ayrı bir PgBouncer instance'ı
# için kullanılabilir. Tek instance için 5432 kullanılır.)
```

### 18.5 Pool Boyutlandırma Gerekçesi

| Parametre | Değer | Gerekçe |
|-----------|-------|---------|
| `pool_size = 20` | 20 | PostgreSQL'in `max_connections = 100` varsayılanı altında; CPU/ RAM'e göre 20 yeterli (8 vCPU, 32 GB RAM sunucu için) |
| `max_client_conn = 100` | 100 | Uygulama sunucularındaki worker/thread sayısı × 2-3 çarpanı; 100 uygulama connection'ı 20 backend connection üzerindenMultiplex edilir |
| `reserve_pool_size = 5` | 5 | Ani yük artışında (batch job + kullanıcı isteği) %25 ek kapasite |
| `server_idle_timeout = 600` | 600 sn | 10 dakika boşta bekleyen connection'ları serbest bırakarak kaynak tüketimini azaltır |
| `query_timeout = 300` | 300 sn | 5 dakika, raporlama ve uzun analitik sorgular için makul tavan |

### 18.6 PgBouncer Durum İzleme SQL'leri

```sql
-- PgBouncer SHOW komutları (pgbouncer console veya psql ile)
SHOW POOLS;              -- Tüm pool'ların durumu
SHOW CLIENTS;            -- Bağlı client'lar
SHOW SERVERS;            -- Backend PostgreSQL connection'ları
SHOW STAT;               -- İstatistik özeti
SHOW VERSION;            -- PgBouncer versiyonu

-- Kritik metrikler:
--   - `cl_active`: Aktif client sayısı
--   - `sv_active`: Aktif backend connection sayısı (pool_size'ı geçmemeli)
--   - `cl_waiting`: Bağlantı bekleyen client sayısı (>0 ise pool büyütülmeli)
--   - `sv_idle`: Boşta backend connection sayısı
```

---

## 19. Altyapı: Redis

### 19.1 Mimari Genel Görünüm

```
[Uygulama] → [Redis Cache] → [PostgreSQL]
                   ↑
              (cache miss)
                   │
                   ▼
            [PostgreSQL'e sorgu]
            → Sonucu cache'e yaz
            → İstemciye döndür
```

### 19.2 Redis Key Formatı ve TTL Değerleri

#### 19.2.1 Tablo Önbellekleri (Read-Through Cache)

| Key Kalıbı | Açıklama | TTL | Freshlik Kriteri |
|------------|----------|-----|-----------------|
| `cache:stok_karti:{stok_karti_id}` | Lot/Stok kartı detayı | **1 saat** (3600 sn) | Stok giriş/çıkış sonrası invalidation |
| `cache:stok_karti:list:{sayfa}` | Stok kartı listesi (sayfalanmış) | **5 dakika** (300 sn) | Yeni lot eklendiğinde invalidation |
| `cache:stok_miktar:{stok_karti_id}` | Anlık stok miktarı (gerçek-zamanlı) | **30 saniye** (30 sn) | Her stok hareketi sonrası güncellenir |
| `cache:urunler:all` | Tüm ürün kataloğu (küçük, nadir değişir) | **24 saat** (86400 sn) | Ürün CRUD işlemlerinde invalidation |
| `cache:urunler:{urun_id}` | Ürün detayı | **6 saat** (21600 sn) | Ürün güncellendiğinde invalidation |
| `cache:musteriler:list:{sayfa}` | Müşteri listesi (sayfalanmış) | **5 dakika** (300 sn) | Müşteri eklendiğinde invalidation |
| `cache:musteriler:{musteri_id}` | Müşteri detayı | **1 saat** (3600 sn) | Müşteri güncellendiğinde invalidation |
| `cache:tedarikciler:all` | Tüm tedarikçi listesi | **6 saat** (21600 sn) | Tedarikçi CRUD işlemlerinde invalidation |
| `cache:fiyat:{urun_id}:{musteri_id}:{fiyat_tipi}` | Ürün-müşteri fiyatı | **2 saat** (7200 sn) | Fiyat güncellemesinde invalidation |
| `cache:stok_degerleri:all` | Genel stok değeri özeti (dashboard) | **1 dakika** (60 sn) | Herhangi bir stok hareketi sonrası invalidation |

#### 19.2.2 Oturum ve Ara Katman (Intermediate Layer) Önbellekleri

| Key Kalıbı | Açıklama | TTL |
|------------|----------|-----|
| `session:{session_id}` | Kullanıcı oturum verisi | **8 saat** (28800 sn) |
| `auth:token:{token_id}` | JWT refresh token ya da kısa-ömürlü token | **24 saat** (86400 sn) |
| `rate_limit:{ip_adresi}` | API rate limiting sayaçları | **1 dakika** (60 sn) |
| `job:lock:{job_name}` | Dağıtık kilit (background job) | **5 dakika** (300 sn) |
| `report:pending:{rapor_id}` | Uzun-ömürlü rapor sonucu (async) | **30 dakika** (1800 sn) |

#### 19.2.3 Komut/Sorgu Önbellekleri

| Key Kalıbı | Açıklama | TTL |
|------------|----------|-----|
| `query:fifo_lot:{urun_id}` | FIFO'ya göre sıralanmış lot ID'leri | **5 dakika** (300 sn) |
| `query:fiyat_sorgula:{urun_id}:{musteri_id}` | Fiyat sorgulama sonucu | **1 saat** (3600 sn) |
| `query:stok_durumu:{urun_id}` | Ürüne ait toplam stok durumu | **2 dakika** (120 sn) |

---

### 19.3 Invalidation (Geçersiz Kılma) Stratejisi

#### 19.3.1 Event-Driven Invalidation (Tercih Edilen)

Her veri değişikliğinde **Redis PUBLISH/SUBSCRIBE** veya **Stream** kullanılarak ilgili key'ler anında silinir.

```python
# Örnek: Stok hareketi oluşturulduktan sonra
def stok_hareketi_olustur(hareket):
    db.session.add(hareket)
    db.session.commit()

    # Invalidation
    redis_client.delete(f"cache:stok_miktar:{hareket.stok_karti_id}")
    redis_client.delete(f"cache:stok_degerleri:all")
    redis_client.delete(f"cache:stok_karti:{hareket.stok_karti_id}")
    redis_client.delete(f"cache:stok_karti:list:*")      # Pattern silme
    redis_client.delete(f"query:fifo_lot:{hareket.stok_karti.urun_id}")

    # Bildirim
    redis_client.publish("stok:update", json.dumps({
        "stok_karti_id": str(hareket.stok_karti_id),
        "urun_id": str(hareket.stok_karti.urun_id),
        "hareket_tipi": hareket.hareket_tipi
    }))
```

#### 19.3.2 TTL-Based Soft Invalidation

Event-driven invalidation'ın uygulanamadığı durumlarda (örneğin dış servis kesintisi) TTL süresi sonunda key otomatik olarak yenilenir.

#### 19.3.3 Pattern-Based Bulk Invalidation

```python
# Tüm sayfa listelerini temizlemek için
def invalidate_list_cache(pattern_prefix: str):
    keys = redis_client.keys(f"cache:{pattern_prefix}:*")
    if keys:
        redis_client.delete(*keys)

# Kullanım örnekleri:
invalidate_list_cache("stok_karti:list")   # Stok listesi sayfaları
invalidate_list_cache("musteriler:list")   # Müşteri listesi sayfaları
invalidate_list_cache("report:*")          # Tüm rapor cache'leri
```

---

### 19.4 Redis Yapılandırma Önerileri

```yaml
# redis.conf (önerilen ayarlar)

# Bellek yönetimi
maxmemory 2gb                    # Redis için ayrılan maksimum bellek
maxmemory-policy allkeys-lru      # Bellek dolunca en eski kullanılan key'leri sil

# Persistence (AOF + RDB hibrit)
appendonly yes
appendfsync everysec
rdb快照-interval 900              # 15 dakikada bir RDB snapshot

# Network
timeout 300                       # Boşta bağlantı timeout (5 dakika)
tcp-keepalive 60                 # TCP keepalive (uygulama sunucusu uzakta ise)

# Güvenlik
bind 127.0.0.1                   # Sadece localhost (PgBouncer gibi local servisler)
requirepass "redis_sifresi"       # Güçlü bir şifre

# Replication (production'da)
replica-read-only yes
```

---

### 19.5 Cache Hit/Miss İzleme

```python
# Prometheus metrikleri olarak sunulabilir:
#   redis_cache_hits_total{key_type="stok_karti"}
#   redis_cache_misses_total{key_type="stok_karti"}
#   redis_command_duration_seconds{cmd="GET|SET|DEL"}

# Kritik oran: Cache hit rate < %80 ise cache boyutu veya TTL değerleri gözden geçirilir.
```

---

---

## 20. Altyapı: Migrasyon Stratejisi

### 20.1 Alembic Yapısı

```
alembic/
├── versions/                    # Migration dosyaları
│   ├── 001_initial_schema.py
│   ├── 002_add_urun_donusum.py
│   └── 003_add_lot_ozellikleri.py
├── env.py                       # Alembic ortam yapılandırması
├── script.py.mako               # Migration şablonu
└── alembic.ini                  # Alembic konfigürasyonu
```

**Migrasyon Kuralları:**
- Her migration tek bir amaca hizmet eder (single responsibility)
- Migration dosya adı formatı: `YYYY-MM-DD_HHMMSS_<aciklama>.py`
- Geriye dönük uyumluluk (backward compatibility) sağlanmalı
- Büyük veri manipülasyonları için `batch_alter` kullanılmalı
- Tablo yeniden adlandırma: `batch_alter_table` ile gerçekleştirilmeli

### 20.2 Sıfır Kesinti (Zero-Downtime) Migrasyon Adımları

**expand → contract Pattern:**

| Aşama | Migration Tipi | Açıklama |
|-------|----------------|----------|
| 1 | `expand` | Yeni kolon/tablo ekle (backward compatible) |
| 2 | Uygulama kodu güncelle | Yeni yapıyı kullan |
| 3 | `contract` | Eski yapıyı kaldır |

**Örnek expand Migration:**
```python
def upgrade():
    # Nullable kolon ekle
    op.add_column('kullanicilar',
        sa.Column('dogum_tarihi', sa.Date, nullable=True))
    
    # Yeni tablo ekle
    op.create_table('kullanici_profilleri',
        sa.Column('id', sa.UUID, primary_key=True),
        sa.Column('kullanici_id', sa.UUID, sa.ForeignKey('kullanicilar.id')),
        sa.Column('bio', sa.Text, nullable=True),
    )
```

**Örnek contract Migration (ikinci migration'da):**
```python
def upgrade():
    # Nullable kısıtlamasını kaldır, default değer uygula
    op.alter_column('kullanicilar', 'dogum_tarihi', nullable=False)
    
    # Eski kolonu kaldır (artık kullanılmıyorsa)
    # op.drop_column('eski_kolon')
```

### 20.3 Geri Alma (Rollback) Planı

| Senaryo | Rollback Stratejisi |
|---------|---------------------|
| Şema hatası | `alembic downgrade -1` |
| Veri bütünlüğü sorunu | Manuel düzeltme script'i |
| Kritik veri kaybı | Snapshot'tan PITR restore |

**Rollback Komutları:**
```bash
# Bir önceki versiyona dön
alembic downgrade -1

# Belirli revizyona dön
alembic downgrade <revision_id>

# Tüm migration'ları geri al (base'e dön)
alembic downgrade base
```

### 20.4 Tohum (Seed) Veri Yönetimi

```
seed_data/
├── 01_olcu_birimleri.py         # Ölçü birimleri (kg, adet, lt)
├── 02_sistem_rolleri.py           # Rol tanımları
├── 03_urun_kategorileri.py       # Ürün kategorileri (ENUM)
├── 04_stok_hareket_tipleri.py    # Stok hareket tipleri (ENUM)
└── 05_sistem_ayarlari.py         # Varsayılan sistem ayarları
```

**Seed Komutları:**
```bash
# Tüm seed verilerini yükle
flask seed run --env=development

# Belirli seed dosyasını çalıştır
flask seed run --seed=01_olcu_birimleri

# Seed verilerini temizle (test ortamı için)
flask seed reset --seed=02_sistem_rolleri
```

**Seed Data Örneği:**
```python
# seed_data/01_olcu_birimleri.py
SEED_DATA = [
    {"kod": "KG", "ad": "Kilogram", "sembol": "kg", "onEk": 1.0},
    {"kod": "GR", "ad": "Gram", "sembol": "g", "onEk": 0.001},
    {"kod": "ADET", "ad": "Adet", "sembol": "ad", "onEk": 1.0},
    {"kod": "LT", "ad": "Litre", "sembol": "L", "onEk": 1.0},
    {"kod": "ML", "ad": "Mililitre", "sembol": "ml", "onEk": 0.001},
]
```

---

## 21. Altyapı: Ortam Değişkeni

### 21.1 .env Dosya Yapısı

**Staging Ortamı (`config/.env.staging`):**
```bash
# === UYGULAMA ===
FLASK_ENV=staging
FLASK_DEBUG=0
LOG_LEVEL=INFO

# === VERİTABANI ===
DATABASE_URL=postgresql://erp_staging_user:<staging-db-pass>@staging-db.internal:5432/erp_staging
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20

# === REDIS ===
REDIS_URL=redis://:redis-pass@staging-redis.internal:6379/0
REDIS_SESSION_TTL=3600

# === GÜVENLİK ===
SECRET_KEY=<staging-secret-key-min-32-chars>
JWT_SECRET_KEY=<staging-jwt-secret>
JWT_ACCESS_TOKEN_EXPIRES=900
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true

# === HARICI SERVISLER ===
EMAIL_HOST=staging-smtp.example.com
EMAIL_PORT=587
EMAIL_USER=noreply@staging.example.com
EMAIL_PASSWORD=<email-pass>
SENTRY_DSN=<staging-sentry-dsn>
```

**Prodüksiyon Ortamı (`config/.env.production`):**
```bash
# === UYGULAMA ===
FLASK_ENV=production
FLASK_DEBUG=0
LOG_LEVEL=WARNING

# === VERİTABANI ===
DATABASE_URL=postgresql://erp_prod_user:<vault-ref>@prod-db.internal:5432/erp_production
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=40

# === REDIS ===
REDIS_URL=redis://:redis-prod-pass@prod-redis.internal:6379/0
REDIS_SESSION_TTL=1800

# === GÜVENLİK ===
SECRET_KEY=<vault:secret/erp/production/secret-key>
JWT_SECRET_KEY=<vault:secret/erp/production/jwt-secret>
JWT_ACCESS_TOKEN_EXPIRES=300
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=Strict

# === HARICI SERVISLER ===
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=noreply@example.com
SENTRY_DSN=<vault:secret/erp/production/sentry-dsn>
```

### 21.2 HashiCorp Vault Entegrasyonu

**Vault Path Yapısı:**
```
secret/erp/
├── production/
│   ├── database-password
│   ├── database-url
│   ├── redis-password
│   ├── secret-key
│   ├── jwt-secret
│   ├── email-password
│   ├── sentry-dsn
│   └── backup-encryption-key
├── staging/
│   ├── database-password
│   ├── secret-key
│   └── ...
└── shared/
    └── backup-encryption-key
```

**Kubernetes External Secrets Entegrasyonu:**
```yaml
# external-secrets.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: erp-production-secrets
  namespace: erp-production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: erp-secrets
    creationPolicy: Owner
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: secret/erp/production/database-url
    - secretKey: JWT_SECRET_KEY
      remoteRef:
        key: secret/erp/production/jwt-secret
    - secretKey: SENTRY_DSN
      remoteRef:
        key: secret/erp/production/sentry-dsn
```

### 21.3 Gizli Anahtar (Secret) Rotasyonu

| Gizli Anahtar | Rotasyon Periyodu | Otomatik | Yöntem |
|---------------|-------------------|----------|--------|
| DATABASE_PASSWORD | 90 gün | Evet | Vault + Kubernetes restart |
| JWT_SECRET | 180 gün | Hayır | Manuel + deployment |
| API_KEYS | 365 gün | Evet | Cloud provider secrets manager |
| TLS_CERTIFICATES | 90 gün | Evet | Let's Encrypt + cert-manager |
| BACKUP_ENCRYPTION_KEY | 365 gün | Hayır | Manuel + offline storage |
| REDIS_PASSWORD | 90 gün | Evet | Vault + Kubernetes restart |

**Rotasyon Süreci (Örnek — DATABASE_PASSWORD):**
```
1. Vault'ta yeni secret üret:
   vault write secret/erp/production/database-password value=<new-password>

2. External Secret otomatik çeker (1h içinde)

3. Kubernetes secret güncellenir

4. Uygulama pod'ları restart edilir (RollingUpdate)
   kubectl rollout restart deployment/erp-api -n erp-production

5. Eski secret Vault'tan silinir:
   vault delete secret/erp/production/database-password

6. Audit log kontrol edilir
```

---

## 22. Altyapı: Yedekleme

### 22.1 Otomatik Geri Yükleme Testi

**Haftalık Geri Yükleme Testi (Kubernetes CronJob):**
```yaml
# backup-restore-test-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-restore-test
  namespace: erp-production
spec:
  schedule: "0 3 * * 0"  # Her Pazar 03:00
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: backup-restore-sa
          containers:
          - name: restore-test
            image: postgres:15-alpine
            env:
              - name: TEST_DB_HOST
                valueFrom:
                  secretKeyRef:
                    name: test-db-config
                    key: host
              - name: TEST_DB_NAME
                value: erp_restore_test
            command:
            - /bin/sh
            - -c
            - |
              set -e
              
              # En son günlük yedeği S3'ten indir
              BACKUP_DATE=$(date -d "yesterday" +%Y/%m/%d)
              aws s3 cp s3://erp-backups/${BACKUP_DATE}/daily.sql.gz /tmp/daily.sql.gz
              
              # Checksum doğrula
              aws s3 cp s3://erp-backups/${BACKUP_DATE}/daily.sql.gz.sha256 /tmp/daily.sql.gz.sha256
              echo "$(sha256sum /tmp/daily.sql.gz)" | sha256sum -c --strict
              
              # Test veritabanı oluştur
              PGPASSWORD=$TEST_DB_PASSWORD psql -h $TEST_DB_HOST -U postgres -c "DROP DATABASE IF EXISTS erp_restore_test;"
              PGPASSWORD=$TEST_DB_PASSWORD psql -h $TEST_DB_HOST -U postgres -c "CREATE DATABASE erp_restore_test;"
              
              # Geri yükle
              zcat /tmp/daily.sql.gz | PGPASSWORD=$TEST_DB_PASSWORD psql -h $TEST_DB_HOST -U postgres -d erp_restore_test
              
              # Veri bütünlüğü kontrol
              RECORD_COUNT=$(PGPASSWORD=$TEST_DB_PASSWORD psql -h $TEST_DB_HOST -U postgres -d erp_restore_test -t -c "SELECT COUNT(*) FROM kullanicilar;")
              if [ "$RECORD_COUNT" -gt 0 ]; then
                echo "RESTORE_TEST_SUCCESS: $RECORD_COUNT records"
              else
                echo "RESTORE_TEST_FAILED: No records found"
                exit 1
              fi
          restartPolicy: OnFailure
```

### 22.2 Checksum Doğrulama

**Yedekleme Script'i:**
```bash
#!/bin/bash
# backup_with_checksum.sh

set -e

BACKUP_DIR="/var/backups/erp"
S3_BUCKET="s3://erp-backups"
DATE=$(date +%Y/%m/%d)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# SQL dump oluştur
pg_dump -U postgres -d erp_production | gzip > ${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz

# SHA256 checksum hesapla
sha256sum ${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz > ${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz.sha256

# S3'e yükle
aws s3 cp ${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz ${S3_BUCKET}/${DATE}/
aws s3 cp ${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz.sha256 ${S3_BUCKET}/${DATE}/

# En son yedeğe symlink oluştur
ln -sf ${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz ${BACKUP_DIR}/latest.sql.gz
ln -sf ${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz.sha256 ${BACKUP_DIR}/latest.sql.gz.sha256

aws s3 cp ${BACKUP_DIR}/latest.sql.gz ${S3_BUCKET}/${DATE}/latest.sql.gz
aws s3 cp ${BACKUP_DIR}/latest.sql.gz.sha256 ${S3_BUCKET}/${DATE}/latest.sql.gz.sha256

# Temizlik (30 günden eski yerel yedekler)
find ${BACKUP_DIR} -name "backup_*.sql.gz" -mtime +30 -delete
find ${BACKUP_DIR} -name "backup_*.sql.gz.sha256" -mtime +30 -delete

echo "Backup completed: ${TIMESTAMP}"
```

### 22.3 Point-in-Time Recovery (PITR)

**PostgreSQL PITR Konfigürasyonu (postgresql.conf):**
```ini
# Write Ahead Log (WAL) ayarları
wal_level = replica
max_wal_senders = 5
max_replication_slots = 3

# WAL archiving (S3)
archive_mode = on
archive_command = 'aws s3 cp %p s3://erp-wal-archive/%f'
archive_timeout = 300  # 5 dakikada bir WAL dosyası değişse bile zorla archive et

# Checksum (veri bütünlüğü için)
data_checksums = on
```

**PITR Geri Yükleme Süreci:**
```bash
#!/bin/bash
# pitr_restore.sh

set -e

RECOVERY_TARGET_TIME='2026-07-28 14:30:00+03'
RECOVERY_DIR="/var/lib/postgresql/restore"
S3_BUCKET="s3://erp-backups"
BACKUP_DATE="2026-07-28"

# 1. Temiz bir PostgreSQL veri dizini hazırla
mkdir -p ${RECOVERY_DIR}
chown postgres:postgres ${RECOVERY_DIR}

# 2. En yakın base backup'ı indir ve çıkart
aws s3 cp s3://erp-backups/${BACKUP_DATE}/base_backup.tar /tmp/base_backup.tar
tar -xf /tmp/base_backup.tar -C ${RECOVERY_DIR}

# 3. Recovery konfigürasyonu oluştur
cat > ${RECOVERY_DIR}/postgresql.auto.conf <<EOF
restore_command = 'aws s3 cp s3://erp-wal-archive/%f %p'
recovery_target_time = '${RECOVERY_TARGET_TIME}'
recovery_target_action = 'promote'
EOF

# 4. PostgreSQL'i restore modunda başlat
pg_ctl -D ${RECOVERY_DIR} start

# 5. Recovery tamamlanana bekle
# (postgresql.log kontrol edilir: "database system is ready")

# 6. Veritabanını kontrol et
psql -h localhost -U postgres -c "SELECT COUNT(*) FROM kullanicilar;"

echo "PITR restore completed"
```

**Geri Dönüş Süresi (RTO) Tahminleri:**
| Yedekleme Tipi | RTO |
|----------------|-----|
| Son 1 saatlik veri kaybı | ~15-30 dakika |
| Son 24 saatlik veri kaybı | ~30-60 dakika |
| Full base backup restore | ~1-4 saat |

---

## 23. Altyapı: İzleme

### 23.1 Prometheus Metrik Tanımları

**ERPSistem Metrikleri:**
```python
# app/metrics.py
from prometheus_client import Counter, Histogram, Gauge, Info

# --- HTTP Metrikleri ---
http_requests_total = Counter(
    'erp_http_requests_total',
    'Toplam HTTP isteği sayısı',
    ['method', 'endpoint', 'status_code']
)

http_request_duration_seconds = Histogram(
    'erp_http_request_duration_seconds',
    'HTTP istek süresi (saniye)',
    ['method', 'endpoint'],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

# --- İş Metrikleri ---
stok_hareketleri_total = Counter(
    'erp_stok_hareketleri_total',
    'Toplam stok hareketi',
    ['hareket_tipi', 'urun_kategori']
)

uretim_emri_total = Counter(
    'erp_uretim_emri_total',
    'Toplam üretim emri',
    ['durum']
)

satis_total = Counter(
    'erp_satis_total',
    'Toplam satış (TL)',
    ['musteri_tipi']
)

# --- Veritabanı Metrikleri ---
db_pool_connections = Gauge(
    'erp_db_pool_connections',
    'Veritabanı bağlantı havuzu durumu',
    ['state']  # active, idle, checked_out
)

db_query_duration_seconds = Histogram(
    'erp_db_query_duration_seconds',
    'Veritabanı sorgu süresi',
    ['query_type'],
    buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0]
)

# --- Stok Metrikleri ---
stok_seviyesi = Gauge(
    'erp_stok_seviyesi',
    'Mevcut stok miktarı',
    ['urun_id', 'stok_tipi']
)

stok_kritik_seviye = Gauge(
    'erp_stok_kritik_seviye',
    'Kritik stok seviyesinde mi (1=kritik, 0=normal)',
    ['urun_id']
)

# --- Sistem Metrikleri ---
active_sessions = Gauge(
    'erp_active_sessions',
    'Aktif kullanıcı oturumu sayısı'
)

login_attempts_total = Counter(
    'erp_login_attempts_total',
    'Toplam giriş denemesi',
    ['result']  # success, failed
)
```

**PostgreSQL Standart Metrikleri (pg_exporter):**
```
pg_stat_database_tup_inserted_total
pg_stat_database_tup_updated_total  
pg_stat_database_tup_deleted_total
pg_stat_database_tup_fetched_total
pg_stat_database_blks_hit_total
pg_stat_database_blks_read_total
pg_stat_archiver_archived_count
pg_stat_replication_sent_bytes_total
pg_up
```

### 23.2 Grafana Uyarı Eşik Değerleri

**Kritik (P1) — Anlık Müdahale Gerekli:**

| Uyarı Adı | PromQL / Koşul | Eşik | Bildirim |
|-----------|----------------|------|----------|
| Veritabanı Erişilemez | `pg_up == 0` | 0 | Slack P1 + PagerDuty |
| Disk Doluluğu Kritik | `disk_usage_percent > 90` | %90 | Slack P1 + PagerDuty |
| API Yanıt Vermiyor | `up{service="erp-api"} == 0` | 0 | Slack P1 + PagerDuty |
| Yetkisiz Giriş Denemesi | `rate(erp_login_attempts_total{result="failed"}[5m]) > 10` | >10/dk | Slack Security |
| Veritabanı Bağlantı Havuzu Dolu | `erp_db_pool_connections{state="checked_out"} / erp_db_pool_connections > 0.9` | %90 | Slack P1 |
| Mass Stock Out | `increase(erp_stok_hareketleri_total{type="SATIS_CIKIS"}[1h]) > 100` | >100 | Slack P2 |

**Yüksek (P2) — Yakında Müdahale Gerekli:**

| Uyarı Adı | PromQL / Koşul | Eşik | Bildirim |
|-----------|----------------|------|----------|
| API Yanıt Süresi Yüksek | `histogram_quantile(0.95, erp_http_request_duration_seconds) > 2` | >2sn | Slack P2 |
| CPU Kullanımı Yüksek | `cpu_usage_percent > 80` | %80 | Slack P2 |
| Hafıza Kullanımı Yüksek | `memory_usage_percent > 85` | %85 | Slack P2 |
| Stok Minimum Seviyede | `erp_stok_seviyesi < stok_minimum` | Min | Slack P2 |
| Yedekleme Son Çalışmadı | `time() - backup_last_success_timestamp > 90000` | >25 saat | Slack P2 + Email |
| Veritabanı Sorgu Süresi Yüksek | `histogram_quantile(0.95, erp_db_query_duration_seconds{lobal="select"} > 1` | >1sn | Slack P2 |

**Bilgilendirme (P3) — İzleme:**

| Uyarı Adı | Koşul | Bildirim |
|-----------|-------|----------|
| Haftalık Rapor Hazır | CRON (Pazartesi 09:00) | Email |
| Stok Yenileme Uyarısı | `stok_seviyesi < yeniden_siparis_noktasi` | Slack #stok |
| Yeni Kullanıcı Kaydı | `increase(erp_kullanicilar_total[24h]) > 0` | Slack #team |
| Sistem Sağlık Durumu | Heartbeat (5 dakika) | Dashboard |
| Düşük Kullanıcı Aktivasyonu | `inactive_days > 30` | Email (haftalık) |

### 14.3 Grafana Dashboard JSON (Temel Yapı)

```json
{
  "dashboard": {
    "title": "ERP Sistemi - Operasyonel Gösterge Paneli",
    "tags": ["erp", "production"],
    "timezone": "Europe/Istanbul",
    "panels": [
      {
        "id": 1,
        "title": "Sistem Sağlık Durumu",
        "type": "stat",
        "gridPos": {"x": 0, "y": 0, "w": 6, "h": 3},
        "targets": [
          {"expr": "up{service='erp-api'}", "legendFormat": "API"},
          {"expr": "pg_up", "legendFormat": "PostgreSQL"},
          {"expr": "up{service='erp-redis'}", "legendFormat": "Redis"}
        ],
        "fieldConfig": {
          "defaults": {
            "mappings": [{"type": "value", "options": {"0": {"text": "KAPALI", "color": "red"}}, {"type": "value", "options": {"1": {"text": "AKTIF", "color": "green"}}}]
          }
        }
      },
      {
        "id": 2,
        "title": "HTTP İstek Süreleri (P50 / P95 / P99)",
        "type": "timeseries",
        "gridPos": {"x": 6, "y": 0, "w": 12, "h": 8},
        "targets": [
          {"expr": "histogram_quantile(0.50, rate(erp_http_request_duration_seconds_bucket[5m]))", "legendFormat": "P50"},
          {"expr": "histogram_quantile(0.95, rate(erp_http_request_duration_seconds_bucket[5m]))", "legendFormat": "P95"},
          {"expr": "histogram_quantile(0.99, rate(erp_http_request_duration_seconds_bucket[5m]))", "legendFormat": "P99"}
        ]
      },
      {
        "id": 3,
        "title": "Stok Kritik Ürünler",
        "type": "table",
        "gridPos": {"x": 18, "y": 0, "w": 6, "h": 8},
        "targets": [
          {"expr": "erp_stok_kritik_seviye{seviye='kritik'}", "format": "table"}
        ]
      },
      {
        "id": 4,
        "title": "Günlük Satış (TL)",
        "type": "timeseries",
        "gridPos": {"x": 0, "y": 8, "w": 8, "h": 6},
        "targets": [
          {"expr": "sum(increase(erp_satis_total[1d]))", "legendFormat": "Toplam Satış"}
        ]
      },
      {
        "id": 5,
        "title": "Veritabanı Bağlantı Havuzu",
        "type": "gauge",
        "gridPos": {"x": 8, "y": 8, "w": 4, "h": 6},
        "targets": [
          {"expr": "erp_db_pool_connections{state='active'}", "legendFormat": "Aktif"},
          {"expr": "erp_db_pool_connections{state='idle'}", "legendFormat": "Boşta"}
        ]
      },
      {
        "id": 6,
        "title": "Giriş Denemeleri (Başarılı / Başarısız)",
        "type": "timeseries",
        "gridPos": {"x": 12, "y": 8, "w": 12, "h": 6},
        "targets": [
          {"expr": "sum(rate(erp_login_attempts_total{result='success'}[5m]))", "legendFormat": "Başarılı"},
          {"expr": "sum(rate(erp_login_attempts_total{result='failed'}[5m]))", "legendFormat": "Başarısız"}
        ]
      }
    ]
  }
}
```

---

## 24. Altyapı: K8s Kaynak Limitleri

### 24.1 LimitRange — Namespace Başına Konteyner Limitleri

```yaml
# limitrange-erp.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: erp-limit-range
  namespace: erp-production
  labels:
    app: erp
    environment: production
spec:
  limits:
    # Konteyner düzeyinde varsayılan ve max limitler
    - type: Container
      max:
        cpu: "4"
        memory: 8Gi
        ephemeral-storage: 10Gi
      min:
        cpu: 50m
        memory: 64Mi
        ephemeral-storage: 100Mi
      default:
        cpu: 250m
        memory: 512Mi
        ephemeral-storage: 1Gi
      defaultRequest:
        cpu: 100m
        memory: 256Mi
        ephemeral-storage: 500Mi
      maxLimitRequestRatio:
        cpu: "10"
        memory: "10"

    # Pod düzeyinde toplam limitler
    - type: Pod
      max:
        cpu: "8"
        memory: 16Gi
        ephemeral-storage: 20Gi
      min:
        cpu: 100m
        memory: 128Mi
        ephemeral-storage: 200Mi

    # PVC (Persistent Volume Claim) başına limitler
    - type: PersistentVolumeClaim
      min:
        storage: 1Gi
      max:
        storage: 100Gi
```

### 24.2 ResourceQuota — Namespace Toplam Kaynak Kotaları

```yaml
# resource-quota-erp.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: erp-resource-quota
  namespace: erp-production
  labels:
    app: erp
    environment: production
spec:
  hard:
    # --- İşlem Kaynakları (Requests) ---
    requests.cpu: "16"
    requests.memory: "32Gi"
    requests.ephemeral-storage: "50Gi"
    
    # --- İşlem Kaynakları (Limits) ---
    limits.cpu: "32"
    limits.memory: "64Gi"
    limits.ephemeral-storage: "100Gi"
    
    # --- Nesne Sayısı Kotaları ---
    pods: "50"
    replicationcontrollers: "5"
    services: "20"
    secrets: "40"
    configmaps: "30"
    persistentvolumeclaims: "15"
    services.loadbalancers: "2"
    services.nodeports: "5"
    
    # --- Storage Kotaları ---
    requests.storage: "200Gi"
    persistentvolumeclaims.storageclass."standard": "10"
    persistentvolumeclaims.storageclass."ssd": "5"
    
    # --- Ingress ---
    ingresses.networking.k8s.io: "10"
    
    # --- HPA ---
    horizontalpodautoscalers.autoscaling: "10"
```

### 24.3 Vertical Pod Autoscaler (VPA) — Otomatik Kaynak Önerisi

```yaml
# vpa-erp-api.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: erp-api-vpa
  namespace: erp-production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: erp-api
  updatePolicy:
    updateMode: "Off"  # "Auto" = otomatik uygula, "Off" = sadece öner
    minRecheckInterval: "10m"
    recommendedUpdates: "168h"  # 7 günde bir öner
  
  resourcePolicy:
    containerPolicies:
    - containerName: erp-api
      minAllowed:
        cpu: 100m
        memory: 256Mi
      maxAllowed:
        cpu: 4
        memory: 8Gi
      controlledResources:
        - cpu
        - memory
      controlledValues: "RequestsAndLimits"
      matchScaling: true

---
# vpa-erp-worker.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: erp-worker-vpa
  namespace: erp-production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: erp-worker
  updatePolicy:
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
    - containerName: erp-worker
      minAllowed:
        cpu: 250m
        memory: 512Mi
      maxAllowed:
        cpu: 8
        memory: 16Gi
      controlledResources:
        - cpu
        - memory
```

### 24.4 Production Ortamı Kaynak Önerileri

| Bileşen | CPU Request | CPU Limit | Memory Request | Memory Limit | Ephemeral-Storage |
|---------|-------------|-----------|----------------|--------------|-------------------|
| erp-api | 500m | 2 | 1Gi | 4Gi | 2Gi |
| erp-worker | 1 | 4 | 2Gi | 8Gi | 2Gi |
| erp-scheduler | 250m | 1 | 512Mi | 2Gi | 1Gi |
| erp-celery-beat | 100m | 500m | 256Mi | 1Gi | 500Mi |
| PostgreSQL (StatefulSet) | 2 | 8 | 4Gi | 16Gi | 50Gi |
| Redis (StatefulSet) | 500m | 2 | 2Gi | 8Gi | 10Gi |
| Prometheus | 1 | 4 | 2Gi | 8Gi | 20Gi |
| Grafana | 250m | 1 | 256Mi | 1Gi | 1Gi |
| Alertmanager | 100m | 500m | 128Mi | 512Mi | 500Mi |
| nginx-ingress-controller | 500m | 2 | 512Mi | 2Gi | 2Gi |

### 24.5 HPA (Horizontal Pod Autoscaler) — Yatay Ölçeklendirme

```yaml
# hpa-erp-api.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: erp-api-hpa
  namespace: erp-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: erp-api
  minReplicas: 2
  maxReplicas: 20
  metrics:
    # CPU metriği
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    # Hafıza metriği
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    # Özel metrik (stok hareketi yoğunluğu)
    - type: Pods
      pods:
        metric:
          name: erp_http_requests_total
        target:
          type: AverageValue
          averageValue: "1000"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
```

---

## 25. Altyapı: K8s Eksik Manifestler

DB tasarımı, Kubernetes üzerinde çalışan PostgreSQL ve Redis StatefulSet'lerini içerir. Aşağıda eksik manifest dosyaları detaylandırılmıştır.

### 25.1 Ingress — Dış Erişim

```yaml
# ingress-erp.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: erp-ingress
  namespace: erp-production
  labels:
    app: erp
    environment: production
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "120"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      add_header X-Frame-Options "SAMEORIGIN" always;
      add_header Strict-Transport-Security "max-age=31536000" always;
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - erp.example.com
        - api.erp.example.com
      secretName: erp-tls-secret
  rules:
    - host: api.erp.example.com
      http:
        paths:
          - path: /api/
            pathType: Prefix
            backend:
              service:
                name: erp-api-service
                port:
                  number: 8000
          - path: /admin/
            pathType: Prefix
            backend:
              service:
                name: erp-api-service
                port:
                  number: 8000
          - path: /health/
            pathType: Exact
            backend:
              service:
                name: erp-api-service
                port:
                  number: 8000
          - path: /metrics/
            pathType: Exact
            backend:
              service:
                name: prometheus
                port:
                  number: 9090
    - host: erp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: erp-frontend-service
                port:
                  number: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: erp-ingress-staging
  namespace: erp-staging
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - staging.erp.example.com
      secretName: erp-staging-tls-secret
  rules:
    - host: staging.erp.example.com
      http:
        paths:
          - path: /api/
            pathType: Prefix
            backend:
              service:
                name: erp-api-service
                port:
                  number: 8000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: erp-frontend-service
                port:
                  number: 80
```

### 16.2 Service — Servis Tanımları

```yaml
# service-api.yaml
apiVersion: v1
kind: Service
metadata:
  name: erp-api-service
  namespace: erp-production
  labels:
    app: erp-api
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8000"
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 8000
      targetPort: 8000
    - name: grpc
      port: 8001
      targetPort: 8001
  selector:
    app: erp-api
---
# service-frontend.yaml
apiVersion: v1
kind: Service
metadata:
  name: erp-frontend-service
  namespace: erp-production
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 80
      targetPort: 80
  selector:
    app: erp-frontend
---
# service-postgresql-headless.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgresql-headless
  namespace: erp-production
  labels:
    app: postgresql
spec:
  type: ClusterIP
  clusterIP: None  # Headless — StatefulSet pod DNS
  ports:
    - name: postgres
      port: 5432
      targetPort: 5432
  selector:
    app: postgresql
---
# service-redis-headless.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-headless
  namespace: erp-production
  labels:
    app: redis
spec:
  type: ClusterIP
  clusterIP: None
  ports:
    - name: redis
      port: 6379
      targetPort: 6379
  selector:
    app: redis
---
# NodePort — acil bakım için
apiVersion: v1
kind: Service
metadata:
  name: erp-api-nodeport
  namespace: erp-production
spec:
  type: NodePort
  ports:
    - name: http
      nodePort: 30080
      port: 8000
      targetPort: 8000
  selector:
    app: erp-api
```

### 16.3 ConfigMap — Uygulama Yapılandırması

```yaml
# configmap-erp.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: erp-config
  namespace: erp-production
  labels:
    app: erp
data:
  DJANGO_SETTINGS_MODULE: "config.settings.production"
  PYTHONUNBUFFERED: "1"
  LOG_LEVEL: "INFO"
  LOG_FORMAT: "json"
  
  # Veritabanı
  DATABASE_HOST: "postgresql-headless"
  DATABASE_PORT: "5432"
  DATABASE_NAME: "erp_db"
  DATABASE_POOL_SIZE: "20"
  DATABASE_MAX_OVERFLOW: "10"
  
  # Redis / Celery
  REDIS_HOST: "redis-headless"
  REDIS_PORT: "6379"
  CELERY_BROKER_URL: "redis://redis-headless:6379/0"
  CELERY_RESULT_BACKEND: "redis://redis-headless:6379/1"
  CELERY_TASK_TRACK_STARTED: "true"
  CELERY_TASK_TIME_LIMIT: "3600"
  
  # Storage
  AWS_S3_BUCKET_NAME: "erp-media-bucket"
  AWS_S3_REGION: "eu-central-1"
  MEDIA_URL: "/media/"
  STATIC_URL: "/static/"
  
  # Feature Flags
  FEATURE_STOCK_ALERT: "true"
  FEATURE_ADVANCED_ANALYTICS: "true"
  FEATURE_LOT_PHOTO: "true"
  FEATURE_EXPORT_PDF: "true"
  FEATURE_BARCODE_SCANNER: "true"
---
# configmap-nginx.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
  namespace: erp-production
data:
  default.conf: |
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/javascript application/javascript application/json;
```

### 16.4 Secret — Hassas Veri Yönetimi

```yaml
# secret-erp.yaml
apiVersion: v1
kind: Secret
metadata:
  name: erp-secrets
  namespace: erp-production
type: Opaque
stringData:
  DATABASE_USER: "erp_user"
  DATABASE_PASSWORD: "<DB_PASSWORD>"
  DATABASE_SECRET_KEY: "<DB_SECRET_KEY>"
  REDIS_PASSWORD: "<REDIS_PASSWORD>"
  DJANGO_SECRET_KEY: "<DJANGO_SECRET_KEY>"
  DJANGO_ADMIN_URL: "secure-admin/"
  AWS_ACCESS_KEY_ID: "<AWS_ACCESS_KEY>"
  AWS_SECRET_ACCESS_KEY: "<AWS_SECRET_KEY>"
  EMAIL_HOST_USER: "noreply@erp.example.com"
  EMAIL_HOST_PASSWORD: "<EMAIL_PASSWORD>"
  SENTRY_DSN: "<SENTRY_DSN>"
---
# secret-tls.yaml
apiVersion: v1
kind: Secret
metadata:
  name: erp-tls-secret
  namespace: erp-production
type: kubernetes.io/tls
data:
  # Oluşturmak için:
  # kubectl create secret tls erp-tls-secret \
  #   --cert=path/to/fullchain.pem \
  #   --key=path/to/privkey.pem
  tls.crt: <BASE64_CERT>
  tls.key: <BASE64_KEY>
```

### 16.5 PodDisruptionBudget — Kesinti Önleme

```yaml
# pdb-api.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: erp-api-pdb
  namespace: erp-production
spec:
  minAvailable: "60%"
  selector:
    matchLabels:
      app: erp-api
---
# pdb-worker.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: erp-worker-pdb
  namespace: erp-production
spec:
  minAvailable: "50%"
  selector:
    matchLabels:
      app: erp-worker
---
# pdb-postgresql.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: postgresql-pdb
  namespace: erp-production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: postgresql
---
# pdb-redis.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: redis-pdb
  namespace: erp-production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: redis
```

### 16.6 LimitRange — Konteyner Kaynak Limitleri

```yaml
# limitrange-erp.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: erp-limits
  namespace: erp-production
spec:
  limits:
    - max:
        cpu: "4"
        memory: 8Gi
      min:
        cpu: 50m
        memory: 64Mi
      default:
        cpu: 250m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 256Mi
      type: Container
    - max:
        cpu: "8"
        memory: 16Gi
      min:
        cpu: 100m
        memory: 128Mi
      type: Pod
    - type: PersistentVolumeClaim
      min:
        storage: 1Gi
      max:
        storage: 100Gi
```

### 16.7 ResourceQuota — Namespace Toplam Kotaları

```yaml
# resource-quota-erp.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: erp-resource-quota
  namespace: erp-production
spec:
  hard:
    requests.cpu: "16"
    requests.memory: "32Gi"
    limits.cpu: "32"
    limits.memory: "64Gi"
    pods: "50"
    services: "20"
    secrets: "40"
    configmaps: "30"
    persistentvolumeclaims: "15"
    requests.storage: "200Gi"
    ingresses.networking.k8s.io: "10"
    horizontalpodautoscalers.autoscaling: "10"
```

---

## 26. Altyapı: CI/CD

### 26.1 Pipeline Aşamaları

| Aşama | Tetiklenme | Açıklama |
|-------|-----------|----------|
| **Test** | Her push/PR | Unit + Integration test, coverage, bandit, pip-audit |
| **Build** | push sonrası | Multi-stage Docker build, SBOM oluşturma |
| **Deploy Staging** | develop branch | Helm chart deploy, smoke test, Slack bildirimi |
| **Approval Gate** | main branch | Manuel onay gerektirir |
| **Deploy Production** | onay sonrası | Pre-backup, Helm deploy, health check, bildirim |
| **Security Scan** | Her push | Trivy FS taraması, SARIF → GitHub Security |

### 26.2 GitHub Actions Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop, 'release/**']
  pull_request:
    branches: [main, develop]
  workflow_dispatch:
    inputs:
      deploy_target:
        description: 'Deploy target'
        required: true
        default: 'staging'

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ── Test Stage ──────────────────────────────────────────────────────────────
  test:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: erp_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-dev.txt

      - name: Run migrations
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/erp_test
        run: python manage.py migrate --noinput

      - name: Run tests with coverage
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/erp_test
          REDIS_URL: redis://localhost:6379/0
          DJANGO_SECRET_KEY: test-secret-key
        run: |
          coverage run --source='.' manage.py test --verbosity=2
          coverage report --fail-under=80
          coverage xml

      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage.xml
          fail_ci_if_error: true

      - name: Security checks
        run: |
          pip install bandit safety
          bandit -r ./erp -f txt -o bandit_report.txt || true
          safety check --json --output safety_report.json || true

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: bandit_report.txt|safety_report.json
          retention-days: 30

  # ── Build Stage ──────────────────────────────────────────────────────────────
  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push'
    
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,format=short
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=raw,value=latest,enable={{is_default_branch}}

      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            BUILD_SHA=${{ github.sha }}
            BUILD_DATE=${{ github.event.head_commit.timestamp }}

      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          image: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          format: spdx-json
          output-file: sbom.spdx.json

      - uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.spdx.json
          retention-days: 90

  # ── Deploy to Staging ────────────────────────────────────────────────────────
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop' || github.event_name == 'workflow_dispatch'
    environment: staging

    steps:
      - uses: actions/checkout@v4
        with:
          repository: example-org/k8s-config
          path: ./k8s-config
          token: ${{ secrets.K8S_CONFIG_REPO_TOKEN }}

      - uses: azure/setup-kubectl@v4
        with:
          version: '1.28'

      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBE_CONFIG_STAGING }}" | base64 -d > kubeconfig
          echo "KUBECONFIG=$(pwd)/kubeconfig" >> $GITHUB_ENV

      - name: Deploy to Staging
        run: |
          kubectl create namespace erp-staging --dry-run=client -o yaml | kubectl apply -f -
          kubectl apply -f k8s-config/staging/ -n erp-staging
          helm upgrade --install erp-staging ./k8s-config/helm/erp \
            --namespace erp-staging \
            --values ./k8s-config/staging/values.yaml \
            --set image.tag=${{ github.sha }} \
            --wait --timeout 10m

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/erp-api -n erp-staging --timeout=300s
          kubectl rollout status deployment/erp-worker -n erp-staging --timeout=300s
          kubectl rollout status deployment/erp-frontend -n erp-staging --timeout=300s

      - name: Smoke tests
        run: |
          curl -sf "https://staging-api.erp.example.com/health/" || exit 1
          curl -sf "https://staging-api.erp.example.com/api/v1/urun/" || exit 1

      - uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {"text": "*Staging Deployment:* `${{ github.sha }}` — Başarılı :white_check_mark:"}
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK

  # ── Approval Gate ────────────────────────────────────────────────────────────
  approval-prod:
    name: Production Approval Gate
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://erp.example.com
    steps:
      - run: |
          echo "Production deployment requires manual approval."
          echo "Required: 1 DevOps engineer + 1 Tech Lead"

  # ── Deploy to Production ─────────────────────────────────────────────────────
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: approval-prod
    environment: production
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4
        with:
          repository: example-org/k8s-config
          path: ./k8s-config

      - uses: azure/setup-kubectl@v4
        with:
          version: '1.28'

      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBE_CONFIG_PRODUCTION }}" | base64 -d > kubeconfig
          echo "KUBECONFIG=$(pwd)/kubeconfig" >> $GITHUB_ENV

      - name: Pre-deployment backup
        run: |
          kubectl exec -n erp-production deployment/erp-api -- python manage.py dbbackup || true
          kubectl exec -n erp-production statefulset/postgresql -- \
            pg_dumpall -U postgres > pre_deploy_backup_$(date +%Y%m%d_%H%M%S).sql

      - name: Deploy to Production
        run: |
          helm upgrade --install erp-prod ./k8s-config/helm/erp \
            --namespace erp-production \
            --values ./k8s-config/production/values.yaml \
            --set image.tag=${{ github.sha }} \
            --set image.repository=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }} \
            --wait --timeout 15m \
            --atomic \
            --cleanup-on-fail

      - name: Post-deployment verification
        run: |
          for i in {1..10}; do
            if curl -sf "https://api.erp.example.com/health/"; then
              echo "Health check passed"
              break
            fi
            echo "Attempt $i: waiting..."
            sleep 10
          done
          curl -sf "https://api.erp.example.com/api/v1/stok/" | jq . || exit 1

      - uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {"text": "*Production Deployment:* `${{ github.sha }}` — Başarılı :rocket:"}
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK

  # ── Security Scan (Her zaman) ───────────────────────────────────────────────
  security-scan:
    name: Dependency Vulnerability Scan
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    
    steps:
      - uses: actions/checkout@v4

      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'

      - uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Python dependency check
        run: |
          pip install pip-audit
          pip-audit --format=json --output=pip-audit.json || true
```

### 17.3 Environment Koruma Kuralları

| Environment | Zorunlu Reviewer | Branch | Secrets |
|------------|-----------------|--------|---------|
| staging | 1 developer | develop | KUBE_CONFIG_STAGING, STAGING_DB_PASSWORD |
| production | 2 (1 DevOps + 1 Tech Lead) | main | KUBE_CONFIG_PRODUCTION, PROD_DB_PASSWORD |

---

## 27. Altyapı: IaC

### 27.1 Terraform — AWS Kaynakları

```hcl
# terraform/main.tf
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket = "erp-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "eu-central-1"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
}

# ─── VPC ─────────────────────────────────────────────────────────────────────
resource "aws_vpc" "erp_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = {
    Name        = "erp-vpc-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_subnet" "private_subnets" {
  count                   = 3
  vpc_id                  = aws_vpc.erp_vpc.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = false
  tags = { Name = "erp-private-subnet-${count.index + 1}", Tier = "Private" }
}

resource "aws_subnet" "public_subnets" {
  count                   = 2
  vpc_id                  = aws_vpc.erp_vpc.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, count.index + 10)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = { Name = "erp-public-subnet-${count.index + 1}", Tier = "Public" }
}

resource "aws_internet_gateway" "erp_igw" {
  vpc_id = aws_vpc.erp_vpc.id
  tags   = { Name = "erp-igw" }
}

resource "aws_nat_gateway" "nat_gateway" {
  count              = 2
  subnet_id          = aws_subnet.public_subnets[count.index].id
  connectivity_type  = "public"
  tags               = { Name = "erp-nat-${count.index + 1}" }
  depends_on         = [aws_internet_gateway.erp_igw]
}

# ─── EKS Cluster ───────────────────────────────────────────────────────────────
resource "aws_eks_cluster" "erp_cluster" {
  name     = "erp-cluster-${var.environment}"
  role_arn = aws_iam_role.eks_cluster_role.arn
  version  = "1.28"

  vpc_config {
    subnet_ids             = concat(aws_subnet.private_subnets[*].id, aws_subnet.public_subnets[*].id)
    endpoint_public_access = true
    public_access_cidrs    = var.allowed_cidrs
  }

  depends_on = [aws_iam_role_policy_attachment.eks_cluster_policy]
}

resource "aws_iam_role" "eks_cluster_role" {
  name = "erp-eks-cluster-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
    }]
  })
}

# ─── RDS PostgreSQL ───────────────────────────────────────────────────────────
resource "aws_db_instance" "postgresql" {
  identifier             = "erp-postgresql-${var.environment}"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = var.db_instance_class
  allocated_storage      = 100
  max_allocated_storage  = 500
  storage_encrypted      = true
  storage_type           = "gp3"

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.erp_subnet_group.name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  performance_insights_enabled    = true
  deletion_protection             = var.environment == "production" ? true : false

  tags = { Name = "erp-postgresql-${var.environment}" }
}

resource "aws_db_subnet_group" "erp_subnet_group" {
  name       = "erp-db-subnet-group"
  subnet_ids = aws_subnet.private_subnets[*].id
  tags       = { Name = "erp-db-subnet-group" }
}

# ─── ElastiCache Redis ────────────────────────────────────────────────────────
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "erp-redis-${var.environment}"
  engine                      = "redis"
  engine_version              = "7.0"
  node_type                   = var.redis_node_type
  number_cache_clusters       = var.environment == "production" ? 2 : 1

  port                        = 6379
  parameter_group_name        = "default.redis7"

  security_group_ids          = [aws_security_group.redis_sg.id]
  subnet_group_name           = aws_elasticache_subnet_group.erp_redis_subnet.name

  automatic_failover_enabled  = var.environment == "production" ? true : false
  multi_az_enabled           = var.environment == "production" ? true : false

  at_rest_encryption_enabled  = true
  transit_encryption_enabled = true
  auth_token_enabled          = true

  snapshot_retention_limit    = 7
  snapshot_window            = "04:00-05:00"
}

resource "aws_elasticache_subnet_group" "erp_redis_subnet" {
  name       = "erp-redis-subnet"
  subnet_ids = aws_subnet.private_subnets[*].id
}

# ─── S3 Buckets ───────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "media_bucket" {
  bucket = "erp-media-${var.environment}-${data.aws_caller_identity.current.account_id}"
  tags   = { Name = "erp-media-${var.environment}", Environment = var.environment }
}

resource "aws_s3_bucket" "backup_bucket" {
  bucket = "erp-backup-${var.environment}-${data.aws_caller_identity.current.account_id}"

  versioning { enabled = true }
  lifecycle_rule {
    rule = {
      id      = "backup-lifecycle"
      enabled = true
      transition {
        days          = 30
        storage_class = "STANDARD_IA"
      }
      transition {
        days          = 90
        storage_class = "GLACIER"
      }
    }
  }
}

# ─── Security Groups ──────────────────────────────────────────────────────────
resource "aws_security_group" "rds_sg" {
  name        = "erp-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = aws_vpc.erp_vpc.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes_sg.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "redis_sg" {
  name   = "erp-redis-sg"
  vpc_id = aws_vpc.erp_vpc.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes_sg.id]
  }
}

resource "aws_security_group" "eks_nodes_sg" {
  name   = "erp-eks-nodes-sg"
  vpc_id = aws_vpc.erp_vpc.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

```hcl
# terraform/variables.tf
variable "aws_region"         { type = string; default = "eu-central-1" }
variable "environment"         { type = string }
variable "vpc_cidr"           { type = string; default = "10.0.0.0/16" }
variable "db_instance_class"  { type = string; default = "db.t3.medium" }
variable "redis_node_type"    { type = string; default = "cache.t3.medium" }
variable "db_username"        { type = string; sensitive = true }
variable "db_password"        { type = string; sensitive = true }
variable "db_name"            { type = string; default = "erp_db" }
variable "allowed_cidrs"      { type = list(string); default = ["0.0.0.0/0"] }
```

### 18.2 Terraform — GCP Kaynakları

```hcl
# terraform-gcp/main.tf
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  backend "gcs" {
    bucket = "erp-terraform-state"
    prefix = "prod/state"
  }
}

provider "google" {
  project = var.gcp_project
  region  = var.gcp_region
}

# ─── VPC ─────────────────────────────────────────────────────────────────────
resource "google_compute_network" "erp_vpc" {
  name                    = "erp-vpc"
  auto_create_subnetworks = false
  mtu                     = 1460
}

resource "google_compute_subnetwork" "private_subnet" {
  name          = "erp-private-subnet"
  network       = google_compute_network.erp_vpc.id
  ip_cidr_range = var.subnet_cidr
  region        = var.gcp_region

  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# ─── Cloud SQL PostgreSQL ────────────────────────────────────────────────────
resource "google_sql_database_instance" "postgresql" {
  name             = "erp-postgresql-${var.environment}"
  database_version = "POSTGRES_15"
  region           = var.gcp_region

  deletion_protection = var.environment == "production" ? true : false

  settings {
    tier              = var.db_instance_class
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = 100
    disk_autoresize   = true

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.erp_vpc.id
      require_ssl     = true
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
    }

    maintenance_window {
      day          = 7
      hour         = 4
      update_track = "stable"
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = false
    }
  }
}

# ─── Cloud Memorystore Redis ─────────────────────────────────────────────────
resource "google_redis_instance" "redis" {
  name           = "erp-redis-${var.environment}"
  tier           = var.environment == "production" ? "STANDARD_HA" : "BASIC"
  memory_size_gb = var.redis_memory_gb
  region         = var.gcp_region
  network        = google_compute_network.erp_vpc.id

  redis_version  = "redis_7_0"

  transit_encryption_mode = "SERVER_AUTHENTICATION"

  persistence_config {
    persistence_mode    = "RDB"
    rdb_next_save_time  = "03:00"
    rdb_snapshot_period = "PERIODIC"
  }
}

# ─── GKE Cluster ─────────────────────────────────────────────────────────────
resource "google_container_cluster" "erp_cluster" {
  name        = "erp-cluster-${var.environment}"
  location    = var.gcp_region
  network     = google_compute_network.erp_vpc.id
  subnetwork  = google_compute_subnetwork.private_subnet.name

  release_channel {
    channel = "STABLE"
  }

  node_pool {
    name               = "default-np"
    initial_node_count = 3
    machine_type       = "n2-standard-4"

    autoscaling {
      enabled       = true
      min_node_count = 1
      max_node_count = 10
    }

    node_config {
      disk_size_gb = 100
      disk_type    = "pd-ssd"
      preemptible  = false

      workload_metadata_config {
        mode = "GKE_METADATA"
      }
    }
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block = "172.16.0.0/28"
  }

  ip_allocation_policy {
    cluster_ipv4_cidr_block   = "10.4.0.0/16"
    services_ipv4_cidr_block = "10.0.0.0/20"
  }

  vertical_pod_autoscaling {
    enabled = true
  }
}
```

### 18.3 Ansible — Sunucu Yapılandırması

```yaml
# ansible/playbooks/provision.yml
---
# Tüm application sunucularına ortak yapılandırma
- name: Provision ERP Application Servers
  hosts: app_servers
  become: yes
  remote_user: ubuntu
  gather_facts: yes

  tasks:
    # Sistem güncelleme
    - name: Update apt and upgrade packages
      ansible.builtin.apt:
        update_cache: yes
        upgrade: full
        autoremove: yes
        autoclean: yes
      when: ansible_os_family == "Debian"

    # Chrony NTP
    - name: Install and configure Chrony
      ansible.builtin.apt:
        name: chrony
        state: present
      notify: Restart chrony

    - name: Configure Chrony
      ansible.builtin.template:
        src: templates/chrony.conf.j2
        dest: /etc/chrony/chrony.conf
        mode: '0644'
      notify: Restart chrony

    # Logrotate
    - name: Configure logrotate
      ansible.builtin.template:
        src: templates/logrotate-erp.j2
        dest: /etc/logrotate.d/erp
        mode: '0644'

    # Fail2ban
    - name: Install Fail2ban
      ansible.builtin.apt:
        name: fail2ban
        state: present

    - name: Configure Fail2ban
      ansible.builtin.template:
        src: templates/fail2ban-erp.conf.j2
        dest: /etc/fail2ban/jail.d/erp.conf
        mode: '0644'
      notify: Restart fail2ban

    # Prometheus Node Exporter
    - name: Install Node Exporter
      ansible.builtin.apt:
        name: prometheus-node-exporter
        state: present

    - name: Start Node Exporter
      ansible.builtin.systemd_service:
        name: prometheus-node-exporter
        state: started
        enabled: yes

  handlers:
    - name: Restart chrony
      ansible.builtin.systemd_service:
        name: chrony
        state: restarted

    - name: Restart fail2ban
      ansible.builtin.systemd_service:
        name: fail2ban
        state: restarted

---
# PostgreSQL sunucu yapılandırması
- name: Configure PostgreSQL Servers
  hosts: postgres_servers
  become: yes
  vars:
    postgres_version: "15"
    postgres_conf_dir: "/etc/postgresql/{{ postgres_version }}/main"

  tasks:
    - name: Install PostgreSQL
      ansible.builtin.apt:
        name:
          - postgresql-{{ postgres_version }}
          - postgresql-contrib-{{ postgres_version }}
        state: present

    - name: Configure PostgreSQL
      ansible.builtin.template:
        src: templates/postgresql.conf.j2
        dest: "{{ postgres_conf_dir }}/postgresql.conf"
        mode: '0644'
      notify: Restart PostgreSQL

    - name: Configure pg_hba
      ansible.builtin.template:
        src: templates/pg_hba.conf.j2
        dest: "{{ postgres_conf_dir }}/pg_hba.conf"
        mode: '0640'
      notify: Restart PostgreSQL

    - name: Enable and start PostgreSQL
      ansible.builtin.systemd_service:
        name: postgresql
        state: started
        enabled: yes

    - name: Create database and user
      become: yes
      become_user: postgres
      community.postgresql.postgresql_user:
        name: "{{ erp_db_user }}"
        password: "{{ erp_db_password }}"
        role_attr_flags: CREATEDB,LOGIN
      vars:
        ansible_python_interpreter: /usr/bin/python3

    - name: Create database
      become: yes
      become_user: postgres
      community.postgresql.postgresql_db:
        name: "{{ erp_db_name }}"
        owner: "{{ erp_db_user }}"
        encoding: 'UTF8'
        locale: 'en_US.UTF-8'
      vars:
        ansible_python_interpreter: /usr/bin/python3

    - name: Setup backup cron
      ansible.builtin.cron:
        name: "PostgreSQL daily backup"
        hour: "3"
        minute: "0"
        user: postgres
        job: "/usr/bin/pg_dumpall -U postgres | gzip > /var/backups/postgresql/backup_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz"

  handlers:
    - name: Restart PostgreSQL
      ansible.builtin.systemd_service:
        name: postgresql
        state: restarted

---
# Redis sunucu yapılandırması
- name: Configure Redis Servers
  hosts: redis_servers
  become: yes

  tasks:
    - name: Install Redis
      ansible.builtin.apt:
        name: redis-server
        state: present

    - name: Configure Redis
      ansible.builtin.template:
        src: templates/redis.conf.j2
        dest: /etc/redis/redis.conf
        mode: '0644'
      notify: Restart Redis

    - name: Enable and start Redis
      ansible.builtin.systemd_service:
        name: redis-server
        state: started
        enabled: yes

    - name: Set Redis password
      ansible.builtin.command: redis-cli CONFIG SET requirepass "{{ redis_password }}"
      notify: Restart Redis

  handlers:
    - name: Restart Redis
      ansible.builtin.systemd_service:
        name: redis-server
        state: restarted
```

```ini
# ansible/inventory/hosts.ini
[app_servers]
app-1.erp.example.com ansible_host=10.0.1.10
app-2.erp.example.com ansible_host=10.0.1.11

[postgres_servers]
pg-1.erp.example.com ansible_host=10.0.2.10

[redis_servers]
redis-1.erp.example.com ansible_host=10.0.2.20

[all:vars]
ansible_python_interpreter=/usr/bin/python3
ansible_user=ubuntu
```

```jinja2
# ansible/roles/app_server/templates/redis.conf.j2
bind {{ ansible_host }}
port 6379
protected-mode yes
maxmemory {{ redis_maxmemory | default('2gb') }}
maxmemory-policy allkeys-lru
save 900 1
save 300 100
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis
requirepass {{ redis_password }}
loglevel notice
logfile /var/log/redis/redis-server.log
slowlog-log-slower-than 10000
slowlog-max-len 128
```

---

## 28. Altyapı: Release

### 28.1 Adım Adım Yayın Süreci

```
[1. Planlama] → [2. Kod Geliştirme] → [3. Feature Freeze] 
                                           ↓
                                    [4. RC Testing]
                                           ↓
                                    [5. Release Onayı]
                                           ↓
                              [6. Production Deploy]
                                           ↓
                              [7. Post-Release İzleme]
                                           ↓
                                    [8. Release Kapatma]
```

**Adım 1 — Planlama**
- Product Owner release hedeflerini belirler
- Release'a dahil story'ler seçilir
- Risk değerlendirmesi yapılır
- Rollback planı gözden geçirilir

**Adım 2 — Kod Geliştirme**
- Feature branch'lerde geliştirme
- Her feature için test yazımı
- Code review süreci
- develop branch'e merge

**Adım 3 — Feature Freeze (Release -7 gün)**
- Yeni özellik geliştirme durdurulur
- RC branch oluşturulur: `release/v1.x.0-rc1`
- Tüm testler CI'da çalıştırılır

**Adım 4 — RC Testing (Release -5 gün)**
- RC staging'e deploy edilir
- QA detaylı test yapar
- Kritik bug'lar düzeltilir → yeni RC

**Adım 5 — Release Onayı (Release -2 gün)**
- Tech Lead + PO onayı
- Deployment window belirlenir

**Adım 6 — Production Deploy**
- Backup alınır
- CI/CD pipeline ile deploy
- Health check + smoke test
- Rollback hazır tutulur

**Adım 7 — Post-Release İzleme (48 saat)**
- Error rate ve latency izlenir
- Kritik bug → hotfix süreci

**Adım 8 — Release Kapatma**
- Release notes yayınlanır
- Retrospective toplantısı

### 28.2 Rollback Prosedürü

| Severity | Koşul | Action |
|----------|-------|--------|
| KRITIK | Error rate > 5%, DB bağlantı kesildi, Auth hatası | Anlık rollback |
| YÜKSEK | Error rate > 2%, API > 5sn (P95) | 5 dakika içinde değerlendir |
| ORTA | Error rate > 1%, non-critical bug | 30 dakika içinde değerlendir |

```bash
# kubectl ile anlık rollback
kubectl rollout undo deployment/erp-api -n erp-production
kubectl rollout undo deployment/erp-worker -n erp-production
kubectl rollout undo deployment/erp-frontend -n erp-production

# Helm rollback
helm rollback erp-prod -n erp-production

# Spesifik revision'a
kubectl rollout history deployment/erp-api -n erp-production
kubectl rollout undo deployment/erp-api -n erp-production --to-revision=3

# DB rollback (şema değişikliği varsa)
python manage.py migrate urunler 0003_previous

# Doğrulama
kubectl rollout status deployment/erp-api -n erp-production
curl -sf https://api.erp.example.com/health/
```

### 19.3 Feature Flags

```python
# config/settings/production.py
FEATURE_FLAGS = {
    "FEATURE_STOCK_ALERT": True,
    "FEATURE_STOCK_FORECAST": False,
    "FEATURE_QUALITY_CONTROL_WORKFLOW": True,
    "FEATURE_ADVANCED_ANALYTICS": True,
    "FEATURE_DASHBOARD_V2": False,
    "FEATURE_SUPPLIER_PORTAL": False,
    "FEATURE_BARCODE_SCANNER": True,
    "FEATURE_EXPORT_PDF": True,
    "FEATURE_MULTI_CURRENCY": False,
    "FEATURE_EMAIL_NOTIFICATIONS": True,
}

def is_feature_enabled(feature_name: str) -> bool:
    return settings.FEATURE_FLAGS.get(feature_name, False)

def feature_required(feature_name: str, fallback=None):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not is_feature_enabled(feature_name):
                from django.http import HttpResponseNotFound
                return HttpResponseNotFound("Bu özellik şu anda aktif değil.")
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator
```

### 19.4 Sürüm Notları Şablonu

```markdown
# v1.2.0 — 2026-08-15

## Yeni Özellikler
- **Stok Kritik Seviye Uyarısı**: Otomatik e-posta bildirimi
- **Lot Fotoğraf Yükleme**: Her lot için en fazla 5 fotoğraf

## Hata Düzeltmeleri
- [#142] FIFO çıkışında yanlış lot seçimi düzeltildi
- [#138] Tarih filtreleme düzeltildi

## Breaking Changes
- `GET /api/v1/stok/hareketler` çıktı formatı değişti.
  Eski format için `?legacy=true` kullanılabilir (v1.2.1'e kadar).

## Upgrade
```bash
python manage.py migrate
export FEATURE_STOCK_ALERT=true
```
```

---

## 29. Altyapı: Güvenlik Tarama

### 29.1 Tarama Stratejisi

```
[Lokal Scan] → pre-commit hook
      ↓
[CI/CD Scan] → her PR/push'ta
      ↓
[SBOM Oluşturma] → her release'de
      ↓
[Docker Image Scan] → Trivy
      ↓
[Raporlama] → GitHub Security + Slack
```

### 29.2 Python — pip-audit

```bash
pip install pip-audit
pip-audit --format=json --output=pip-audit-report.json
pip-audit --format=json | jq '[.[] | select(.vulns[].severity == "CRITICAL")]'
```

### 29.3 JavaScript — npm audit + Snyk

```json
// package.json
{
  "scripts": {
    "audit": "npm audit --audit-level=high",
    "snyk:test": "snyk test --severity-threshold=high"
  }
}
```

### 29.4 Docker — Trivy

```dockerfile
# Multi-stage build
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /install /usr/local
COPY . .
RUN adduser --disabled-password erp && chown -R erp:erp /app
USER erp
```

```bash
# Trivy ile image tarama
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image --severity CRITICAL,HIGH erp-api:latest
```

### 20.5 OWASP Dependency-Check

```yaml
- name: OWASP Dependency Check
  run: |
    docker run --rm \
      -v "${{ github.workspace }}:/src" \
      -v "${{ github.workspace }}/dcheck-report:/report" \
      owasp/dependency-check-action \
      --project "ERP-${GITHUB_REF}" \
      --scan /src \
      --format HTML \
      --out /report \
      --severity CRITICAL \
      --confidence HIGH
```

### 20.6 Eşik Değerleri

| Severity | Action |
|----------|--------|
| CRITICAL | Deployment engelle — hemen düzelt |
| HIGH | Deployment duraksat — 24 saat içinde düzelt |
| MEDIUM | Deployment devam — sprint içinde düzelt |
| LOW | Logla — sonraki major release'de düzelt |

---

---

## 30. Yeni Ek Tablolar — Çözüm Dokümanları Entegrasyonu

Bu bölüm, çözüm dokümanlarında tanımlanan ve SRS §3.4.x'e karşılık gelen tüm yeni tabloları içerir.

---

### 30.1 Kalite Kontrol (§3.4.5 — KALITE-KONTROL-COZUMU)

> **Kanonik Karar (2026-07-30 audit raporu 1.6/2.4):** Tüm sistemde **tek** `kalite_kontrol` tablosu kullanılır; önceki mükerrer model §3.8.2, §11.3 ve §21.1 gereksinimlerini bu tabloda birleştirir. İki ayrı semantik alan korunur: `durum` (iş akışı durumu — kanonik BEKLIYOR/KONTROL_EDILIYOR/KABUL/KISMEN_KABUL/RET) ve `sonuc` (ölçüm sonucu — kanonik UYGUN/SINIRDA/UYGUNSIZ). Bu ayrım state-machine ile ölçüm sonucunu karıştırmaz.

#### `kalite_kontrol`

|| Alan | Tip | Zorunlu | Açıklama |
||------|-----|---------|----------|
|| `kalite_id` | UUID | ✓ | PK |
|| `stok_id` | UUID | ✓ | FK → stok_karti |
|| `uretim_emri_id` | UUID | Hayır | FK → uretim_emri (varsa) |
|| `tedarikci_id` | UUID | Hayır | FK → tedarikciler |
|| `kontrol_tipi` | VARCHAR(30) | ✓ | GIRIS_KONTROL, PERIYODIK, SEBEPE, SIPARIS_KONTROL |
|| `kontrol_turu` | VARCHAR(20) | Hayır | GIRIS, CIKIS, PERIYODIK (geri uyumluluk; spec §3.8.2) |
|| `durum` | VARCHAR(30) | ✓ | BEKLIYOR, KONTROL_EDILIYOR, KABUL, KISMEN_KABUL, RET |
|| `sonuc` | VARCHAR(20) | Hayır | UYGUN, SINIRDA, UYGUNSIZ — ölçüm/analiz sonucu (durum ile karıştırılmaz) |
|| `sonuc_puani` | INTEGER | Hayır | 0-100 arası kalite puanı |
|| `sonuc_aciklama` | TEXT | Hayır | Kontrol sonucu açıklaması |
|| `kabul_miktar` | DECIMAL(15,3) | Hayır | Kabul edilen miktar |
|| `red_miktar` | DECIMAL(15,3) | Hayır | Reddedilen miktar |
|| `kontrol_edilen_miktar` | DECIMAL(15,3) | Hayır | Kontrol edilen toplam miktar (spec §3.8.2) |
|| `birim` | VARCHAR(20) | Hayır | Miktar birimi (spec §3.8.2) |
|| `kontrol_tarihi` | DATE | ✓ | Fiziksel kontrol tarihi |
|| `kontrol_suresi_dk` | INTEGER | Hayır | Kontrol süresi (dakika) |
|| `sonraki_kontrol_tarihi` | DATE | Hayır | Planlanan sonraki kontrol |
|| `olusturan_kullanici_id` | UUID | ✓ | FK → kullanicilar |
|| `not` | TEXT | Hayır | Kontrol notları |
|| `olusturma_tarihi` | TIMESTAMP | ✓ | |
|| `guncelleme_tarihi` | TIMESTAMP | ✓ | |
|| `silme_tarihi` | TIMESTAMP | Hayır | Soft delete |

```sql
CREATE TABLE kalite_kontrol (
    kalite_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stok_id                 UUID NOT NULL REFERENCES stok_karti(stok_id),
    uretim_emri_id          UUID REFERENCES uretim_emri(uretim_id),
    tedarikci_id            UUID REFERENCES tedarikciler(tedarikci_id),
    kontrol_tipi            VARCHAR(30) NOT NULL,
    kontrol_turu            VARCHAR(20),
    durum                   VARCHAR(30) NOT NULL DEFAULT 'BEKLIYOR',
    sonuc                   VARCHAR(20),
    sonuc_puani             INTEGER,
    sonuc_aciklama          TEXT,
    kabul_miktar            DECIMAL(15,3),
    red_miktar              DECIMAL(15,3),
    kontrol_edilen_miktar   DECIMAL(15,3),
    birim                   VARCHAR(20),
    kontrol_tarihi          DATE NOT NULL,
    kontrol_suresi_dk       INTEGER,
    sonraki_kontrol_tarihi  DATE,
    olusturan_kullanici_id  UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    not                     TEXT,
    olusturma_tarihi        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi            TIMESTAMP,

    CONSTRAINT kalite_durum_check CHECK (durum IN ('BEKLIYOR', 'KONTROL_EDILIYOR', 'KABUL', 'KISMEN_KABUL', 'RET')),
    CONSTRAINT kalite_kontrol_tipi_check CHECK (kontrol_tipi IN ('GIRIS_KONTROL', 'PERIYODIK', 'SEBEPE', 'SIPARIS_KONTROL')),
    CONSTRAINT kalite_sonuc_check CHECK (sonuc IS NULL OR sonuc IN ('UYGUN', 'SINIRDA', 'UYGUNSIZ')),
    CONSTRAINT kalite_puani_check CHECK (sonuc_puani IS NULL OR (sonuc_puani >= 0 AND sonuc_puani <= 100))
);
```

**İndeksler:**
```sql
CREATE INDEX idx_kalite_stok ON kalite_kontrol(stok_id);
CREATE INDEX idx_kalite_durum ON kalite_kontrol(durum);
CREATE INDEX idx_kalite_tarih ON kalite_kontrol(kontrol_tarihi);
CREATE INDEX idx_kalite_tedarikci ON kalite_kontrol(tedarikci_id);
```

---

#### `kalite_numune`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `numune_id` | UUID | ✓ | PK |
| `kalite_id` | UUID | ✓ | FK → kalite_kontrol |
| `numune_no` | VARCHAR(30) | ✓ | Numune numarası |
| `numune_tarihi` | TIMESTAMP | ✓ | Numune alım zamanı |
| `numune_alan_kullanici_id` | UUID | ✓ | FK → kullanicilar |
| `numune_miktar` | DECIMAL(15,3) | ✓ | Numune miktarı |
| `numune_birim` | VARCHAR(20) | ✓ | Birim |
| `analiz_tarihi` | DATE | Hayır | Analiz tarihi |
| `analiz_sonuc` | TEXT | Hayır | Analiz sonucu |
| `olusturma_tarihi` | TIMESTAMP | ✓ | |

```sql
CREATE TABLE kalite_numune (
    numune_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kalite_id               UUID NOT NULL REFERENCES kalite_kontrol(kalite_id),
    numune_no               VARCHAR(30) NOT NULL,
    numune_tarihi           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    numune_alan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    numune_miktar           DECIMAL(15,3) NOT NULL,
    numune_birim            VARCHAR(20) NOT NULL,
    analiz_tarihi           DATE,
    analiz_sonuc            TEXT,
    olusturma_tarihi        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_numune_kalite ON kalite_numune(kalite_id);
```

---

### 30.2 Bildirim Sistemi (§3.4.10 — BILDIRIM-SISTEMI-COZUMU)

#### `bildirimler`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `bildirim_id` | UUID | ✓ | PK |
| `kullanici_id` | UUID | ✓ | FK → kullanicilar |
| `bildirim_turu` | VARCHAR(50) | ✓ | Bildirim türü kodu |
| `oncelik` | VARCHAR(20) | ✓ | CRITICAL, HIGH, MEDIUM, LOW |
| `baslik` | VARCHAR(200) | ✓ | Bildirim başlığı |
| `icerik` | TEXT | ✓ | Bildirim içeriği |
| `okundu` | BOOLEAN | ✓ | Varsayılan FALSE |
| `okunma_tarihi` | TIMESTAMP | Hayır | |
| `referans_tip` | VARCHAR(50) | Hayır | İlişkili kaynak tipi |
| `referans_id` | UUID | Hayır | İlişkili kaynak ID |
| `olusturma_tarihi` | TIMESTAMP | ✓ | |
| `gonderim_tarihi` | TIMESTAMP | Hayır | Gönderim zamanı |

```sql
CREATE TABLE bildirimler (
    bildirim_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kullanici_id       UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    bildirim_turu     VARCHAR(50) NOT NULL,
    oncelik           VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    baslik            VARCHAR(200) NOT NULL,
    icerik            TEXT NOT NULL,
    okundu            BOOLEAN NOT NULL DEFAULT FALSE,
    okunma_tarihi     TIMESTAMP,
    referans_tip      VARCHAR(50),
    referans_id       UUID,
    olusturma_tarihi  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    gonderim_tarihi   TIMESTAMP,

    CONSTRAINT bildirim_oncelik_check CHECK (oncelik IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'))
);

CREATE INDEX idx_bildirim_kullanici ON bildirimler(kullanici_id);
CREATE INDEX idx_bildirim_turu ON bildirimler(bildirim_turu);
CREATE INDEX idx_bildirim_okundu ON bildirimler(okundu) WHERE okundu = FALSE;
```

**Bildirim Türleri:** STOK_KRITIK, STOK_DUSUK, LOT_SK_TARIHI, URETIM_FIRE, PLANSIZ_URETIM, TEDARIKCI_PERFORMANS, TEDARIKCI_BEKLEYEN, SISTEM_YEDEKLEME, SISTEM_HATA, VERI_IHLALI, GERI_CAGIRMA, ONAY_BEKLEYEN, KULLANICI_OLUSTU, SIFRE_DEGISIKLIGI, MFA_AKTIF

---

#### `bildirim_sablonlari`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `sablon_id` | UUID | ✓ | PK |
| `kod` | VARCHAR(50) | ✓ | Benzersiz kod |
| `bildirim_turu` | VARCHAR(50) | ✓ | İlişkili bildirim türü |
| `baslik_sablon` | VARCHAR(200) | ✓ | Başlık şablonu (template) |
| `icerik_sablon` | TEXT | ✓ | İçerik şablonu |
| `varsayilan_oncelik` | VARCHAR(20) | ✓ | |
| `eposta_aktif` | BOOLEAN | ✓ | E-posta gönderilsin mi? |
| `sms_aktif` | BOOLEAN | ✓ | SMS gönderilsin mi? |
| `uygulama_ici_aktif` | BOOLEAN | ✓ | |
| `olusturma_tarihi` | TIMESTAMP | ✓ | |

```sql
CREATE TABLE bildirim_sablonlari (
    sablon_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kod                   VARCHAR(50) NOT NULL UNIQUE,
    bildirim_turu         VARCHAR(50) NOT NULL,
    baslik_sablon         VARCHAR(200) NOT NULL,
    icerik_sablon         TEXT NOT NULL,
    varsayilan_oncelik    VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    eposta_aktif          BOOLEAN NOT NULL DEFAULT TRUE,
    sms_aktif             BOOLEAN NOT NULL DEFAULT FALSE,
    uygulama_ici_aktif    BOOLEAN NOT NULL DEFAULT TRUE,
    olusturma_tarihi      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

#### `bildirim_gonderimleri`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `gonderim_id` | UUID | ✓ | PK |
| `bildirim_id` | UUID | ✓ | FK → bildirimler |
| `kanal` | VARCHAR(20) | ✓ | EPOSTA, SMS, UYGULAMA_IC |
| `durum` | VARCHAR(20) | ✓ | BEKLIYOR, GONDERILDI, HATA |
| `hata_mesaji` | TEXT | Hayır | |
| `gonderim_tarihi` | TIMESTAMP | Hayır | |
| `olusturma_tarihi` | TIMESTAMP | ✓ | |

```sql
CREATE TABLE bildirim_gonderimleri (
    gonderim_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bildirim_id       UUID NOT NULL REFERENCES bildirimler(bildirim_id),
    kanal              VARCHAR(20) NOT NULL,
    durum              VARCHAR(20) NOT NULL DEFAULT 'BEKLIYOR',
    hata_mesaji        TEXT,
    gonderim_tarihi   TIMESTAMP,
    olusturma_tarihi  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT gonderim_kanal_check CHECK (kanal IN ('EPOSTA', 'SMS', 'UYGULAMA_IC')),
    CONSTRAINT gonderim_durum_check CHECK (durum IN ('BEKLIYOR', 'GONDERILDI', 'HATA'))
);

CREATE INDEX idx_gonderim_bildirim ON bildirim_gonderimleri(bildirim_id);
```

---

#### `bildirim_kullanicari`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `tercih_id` | UUID | ✓ | PK |
| `kullanici_id` | UUID | ✓ | FK → kullanicilar |
| `bildirim_turu` | VARCHAR(50) | ✓ | |
| `eposta_aktif` | BOOLEAN | ✓ | |
| `sms_aktif` | BOOLEAN | ✓ | |
| `uygulama_ici_aktif` | BOOLEAN | ✓ | |

```sql
CREATE TABLE bildirim_kullanicari (
    tercih_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kullanici_id       UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    bildirim_turu      VARCHAR(50) NOT NULL,
    eposta_aktif       BOOLEAN NOT NULL DEFAULT TRUE,
    sms_aktif          BOOLEAN NOT NULL DEFAULT FALSE,
    uygulama_ici_aktif BOOLEAN NOT NULL DEFAULT TRUE,

    UNIQUE(kullanici_id, bildirim_turu)
);
```

---

### 30.3 Birim Dönüşüm (§3.4.9 — BIRIM-DONUSUM-COZUMU)

#### `birimler`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `birim_id` | UUID | ✓ | PK |
| `ad` | VARCHAR(50) | ✓ | "Kilogram", "Gram" |
| `kisa_ad` | VARCHAR(10) | ✓ | "kg", "g" — unique |
| `tip` | VARCHAR(20) | ✓ | AGIRLIK, OLCEK, ONAYLI |
| `temel_birim_mi` | BOOLEAN | ✓ | Her tip için biri temel birim olur |
| `carpan_temele` | DECIMAL(15,6) | Hayır | Temel birime çevirme çarpanı |
| `bolen_temele` | DECIMAL(15,6) | Hayır | Temel birimden çevirme böleni |
| `olusturma_tarihi` | TIMESTAMP | ✓ | |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | |
| `silme_tarihi` | TIMESTAMP | Hayır | |
| `aktif` | BOOLEAN | ✓ | Varsayılan TRUE |

```sql
CREATE TABLE birimler (
    birim_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad                VARCHAR(50) NOT NULL,
    kisa_ad           VARCHAR(10) NOT NULL UNIQUE,
    tip               VARCHAR(20) NOT NULL,
    temel_birim_mi    BOOLEAN NOT NULL DEFAULT FALSE,
    carpan_temele     DECIMAL(15,6),
    bolen_temele      DECIMAL(15,6),
    olusturma_tarihi  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi      TIMESTAMP,
    aktif             BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT birimler_tip_check CHECK (tip IN ('AGIRLIK', 'OLCEK', 'ONAYLI')),
    CONSTRAINT birimler_temel_birim_dar CHECK (
        (temel_birim_mi = TRUE AND carpan_temele IS NULL AND bolen_temele IS NULL) OR
        (temel_birim_mi = FALSE AND carpan_temele IS NOT NULL AND bolen_temele IS NOT NULL)
    )
);
```

**Seed Data:** kg (AGIRLIK, temel), g, ton, mg, adet (OLCEK, temel), paket, koli, palet

---

#### `birim_donusum`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `donusum_id` | UUID | ✓ | PK |
| `kaynak_birim_id` | UUID | ✓ | FK → birimler |
| `hedef_birim_id` | UUID | ✓ | FK → birimler |
| `carpan` | DECIMAL(15,6) | ✓ | kaynak → hedef: hedef = kaynak × carpan |
| `bolen` | DECIMAL(15,6) | ✓ | kaynak → hedef: hedef = kaynak / bolen |
| `toptan_mi` | BOOLEAN | ✓ | Toptan dönüşüm mü? |
| `perakende_mi` | BOOLEAN | ✓ | Perakende dönüşüm mü? |
| `aktif` | BOOLEAN | ✓ | Varsayılan TRUE |
| `olusturma_tarihi` | TIMESTAMP | ✓ | |

```sql
CREATE TABLE birim_donusum (
    donusum_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kaynak_birim_id    UUID NOT NULL REFERENCES birimler(birim_id),
    hedef_birim_id     UUID NOT NULL REFERENCES birimler(birim_id),
    carpan             DECIMAL(15,6) NOT NULL,
    bolen              DECIMAL(15,6) NOT NULL,
    toptan_mi          BOOLEAN NOT NULL DEFAULT FALSE,
    perakende_mi       BOOLEAN NOT NULL DEFAULT FALSE,
    aktif              BOOLEAN NOT NULL DEFAULT TRUE,
    olusturma_tarihi   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(kaynak_birim_id, hedef_birim_id, toptan_mi, perakende_mi)
);

CREATE INDEX idx_donusum_kaynak ON birim_donusum(kaynak_birim_id);
CREATE INDEX idx_donusum_hedef ON birim_donusum(hedef_birim_id);
```

---

### 30.4 Depo Yönetimi (§3.4.11 — DEPO-YONETIM-COZUMU)

#### `depolar`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `depo_id` | UUID | ✓ | PK |
| `kod` | VARCHAR(20) | ✓ | "DEPO-A", "DEPO-B" — unique |
| `ad` | VARCHAR(100) | ✓ | |
| `tip` | VARCHAR(20) | ✓ | HAMMADDE, MAMUL, KARISIM, DEPO_DISI |
| `adres` | TEXT | Hayır | |
| `kapasite_m2` | DECIMAL(10,2) | Hayır | m² |
| `kapasite_kg` | DECIMAL(15,3) | Hayır | Maksimum kg |
| `sicaklik_kontrolu` | BOOLEAN | ✓ | |
| `sicaklik_min` | DECIMAL(5,2) | Hayır | °C |
| `sicaklik_max` | DECIMAL(5,2) | Hayır | °C |
| `nem_orani_min` | INTEGER | Hayır | % |
| `nem_orani_max` | INTEGER | Hayır | % |
| `aktif` | BOOLEAN | ✓ | Varsayılan TRUE |
| `varsayilan_kabul_deposu` | BOOLEAN | ✓ | |
| `varsayilan_sevk_deposu` | BOOLEAN | ✓ | |
| `olusturma_tarihi` | TIMESTAMP | ✓ | |
| `guncelleme_tarihi` | TIMESTAMP | ✓ | |
| `silme_tarihi` | TIMESTAMP | Hayır | |
| `olusturan_kullanici_id` | UUID | ✓ | FK → kullanicilar |

```sql
CREATE TABLE depolar (
    depo_id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kod                        VARCHAR(20) NOT NULL UNIQUE,
    ad                         VARCHAR(100) NOT NULL,
    tip                        VARCHAR(20) NOT NULL,
    adres                      TEXT,
    kapasite_m2                DECIMAL(10,2),
    kapasite_kg                DECIMAL(15,3),
    sicaklik_kontrolu          BOOLEAN NOT NULL DEFAULT FALSE,
    sicaklik_min               DECIMAL(5,2),
    sicaklik_max               DECIMAL(5,2),
    nem_orani_min              INTEGER,
    nem_orani_max              INTEGER,
    aktif                      BOOLEAN NOT NULL DEFAULT TRUE,
    varsayilan_kabul_deposu    BOOLEAN NOT NULL DEFAULT FALSE,
    varsayilan_sevk_deposu     BOOLEAN NOT NULL DEFAULT FALSE,
    olusturma_tarihi           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    silme_tarihi               TIMESTAMP,
    olusturan_kullanici_id     UUID NOT NULL REFERENCES kullanicilar(kullanici_id),

    CONSTRAINT depolar_tip_check CHECK (tip IN ('HAMMADDE', 'MAMUL', 'KARISIM', 'DEPO_DISI'))
);
```

---

#### `depo_bloklar`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `blok_id` | UUID | ✓ | PK |
| `depo_id` | UUID | ✓ | FK → depolar |
| `kod` | VARCHAR(20) | ✓ | "A1", "B2" — depo içinde unique |
| `ad` | VARCHAR(100) | ✓ | |
| `tip` | VARCHAR(20) | ✓ | STORAGE, PICKING, RECEIVING, SHIPPING, QUARANTINE, RETURN |
| `kat` | INTEGER | ✓ | 0 = zemin |
| `kapasite_m2` | DECIMAL(10,2) | Hayır | |

```sql
CREATE TABLE depo_bloklar (
    blok_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    depo_id       UUID NOT NULL REFERENCES depolar(depo_id),
    kod           VARCHAR(20) NOT NULL,
    ad            VARCHAR(100) NOT NULL,
    tip           VARCHAR(20) NOT NULL DEFAULT 'STORAGE',
    kat           INTEGER NOT NULL DEFAULT 0,
    kapasite_m2   DECIMAL(10,2),

    UNIQUE(depo_id, kod),
    CONSTRAINT blok_tip_check CHECK (tip IN ('STORAGE', 'PICKING', 'RECEIVING', 'SHIPPING', 'QUARANTINE', 'RETURN'))
);

CREATE INDEX idx_blok_depo ON depo_bloklar(depo_id);
```

---

#### `depo_konumlar`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `konum_id` | UUID | ✓ | PK |
| `blok_id` | UUID | ✓ | FK → depo_bloklar |
| `kod` | VARCHAR(30) | ✓ | "RAF-001", "ZEMIN-01" — blok içinde unique |
| `ad` | VARCHAR(100) | ✓ | |
| `tip` | VARCHAR(20) | ✓ | STORAGE, PICKING, CORRIDOR, LOADING |
| `doluluk_orani` | DECIMAL(5,2) | Hayır | 0.00 – 100.00 |
| `aktif` | BOOLEAN | ✓ | Varsayılan TRUE |

```sql
CREATE TABLE depo_konumlar (
    konum_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blok_id        UUID NOT NULL REFERENCES depo_bloklar(blok_id),
    kod            VARCHAR(30) NOT NULL,
    ad             VARCHAR(100) NOT NULL,
    tip            VARCHAR(20) NOT NULL DEFAULT 'STORAGE',
    doluluk_orani  DECIMAL(5,2),
    aktif          BOOLEAN NOT NULL DEFAULT TRUE,

    UNIQUE(blok_id, kod),
    CONSTRAINT konum_tip_check CHECK (tip IN ('STORAGE', 'PICKING', 'CORRIDOR', 'LOADING'))
);

CREATE INDEX idx_konum_blok ON depo_konumlar(blok_id);
```

---

#### `depo_transfer`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `transfer_id` | UUID | ✓ | PK |
| `kaynak_depo_id` | UUID | ✓ | FK → depolar |
| `hedef_depo_id` | UUID | ✓ | FK → depolar |
| `durum` | VARCHAR(30) | ✓ | OLUŞTURULDU, BEKLEMEDE, ONAYLANDI, REDDEDILDI, TAMAMLANDI, IPTAL_EDILDI |
| `neden` | TEXT | Hayır | Transfer nedeni |
| `nakliye_firmasi` | VARCHAR(100) | Hayır | |
| `tasima_maliyeti` | DECIMAL(15,2) | Hayır | TL |
| `tahmini_varis_tarihi` | DATE | Hayır | |
| `gercek_varis_tarihi` | DATE | Hayır | |
| `olusturan_kullanici_id` | UUID | ✓ | FK → kullanicilar |
| `onaylayan_kullanici_id` | UUID | Hayır | FK → kullanicilar |
| `olusturma_tarihi` | TIMESTAMP | ✓ | |
| `onay_tarihi` | TIMESTAMP | Hayır | |
| `tamamlama_tarihi` | TIMESTAMP | Hayır | |

```sql
CREATE TABLE depo_transfer (
    transfer_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kaynak_depo_id          UUID NOT NULL REFERENCES depolar(depo_id),
    hedef_depo_id           UUID NOT NULL REFERENCES depolar(depo_id),
    durum                   VARCHAR(30) NOT NULL DEFAULT 'OLUSTURULDU',
    neden                   TEXT,
    nakliye_firmasi         VARCHAR(100),
    tasima_maliyeti         DECIMAL(15,2),
    tahmini_varis_tarihi    DATE,
    gercek_varis_tarihi     DATE,
    olusturan_kullanici_id  UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    onaylayan_kullanici_id  UUID REFERENCES kullanicilar(kullanici_id),
    olusturma_tarihi        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    onay_tarihi             TIMESTAMP,
    tamamlama_tarihi        TIMESTAMP,

    CONSTRAINT transfer_durum_check CHECK (durum IN ('OLUSTURULDU', 'BEKLEMEDE', 'ONAYLANDI', 'REDDEDILDI', 'TAMAMLANDI', 'IPTAL_EDILDI')),
    CONSTRAINT transfer_kaynak_hedef_check CHECK (kaynak_depo_id <> hedef_depo_id)
);

CREATE INDEX idx_transfer_durum ON depo_transfer(durum);
CREATE INDEX idx_transfer_kaynak ON depo_transfer(kaynak_depo_id);
CREATE INDEX idx_transfer_hedef ON depo_transfer(hedef_depo_id);
```

---

#### `depo_transfer_detay`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `detay_id` | UUID | ✓ | PK |
| `transfer_id` | UUID | ✓ | FK → depo_transfer |
| `stok_id` | UUID | ✓ | FK → stok_karti |
| `miktar` | DECIMAL(15,3) | ✓ | Transfer edilecek miktar |
| `aktarilan_miktar` | DECIMAL(15,3) | Hayır | Fiilen aktarılan miktar |
| `hedef_konum_id` | UUID | Hayır | Hedef depodaki konum — FK → depo_konumlar |
| `aciklama` | TEXT | Hayır | |

```sql
CREATE TABLE depo_transfer_detay (
    detay_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id       UUID NOT NULL REFERENCES depo_transfer(transfer_id),
    stok_id           UUID NOT NULL REFERENCES stok_karti(stok_id),
    miktar            DECIMAL(15,3) NOT NULL,
    aktarilan_miktar  DECIMAL(15,3),
    hedef_konum_id    UUID REFERENCES depo_konumlar(konum_id),
    aciklama          TEXT
);

CREATE INDEX idx_transfer_detay_transfer ON depo_transfer_detay(transfer_id);
CREATE INDEX idx_transfer_detay_stok ON depo_transfer_detay(stok_id);
```

---

### 30.5 Toplu İşlem (§3.4.12 — TOPLU-ISLEM-COZUMU)

#### `toplu_islemler`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `islem_id` | UUID | ✓ | PK |
| `islem_turu` | VARCHAR(30) | ✓ | STOK_GIRISI, URETIM_EMRI, MUSKAYIT, TEDARIKCI_KAYIT, STOK_DUZELTME, ETIKET_BASKI, SATIS_IRAC |
| `durum` | VARCHAR(30) | ✓ | BEKLEMEDE, VALIDATING, ISLENIYOR, TAMAMLANDI, HATALAR_VAR, IPTAL_EDILDI |
| `dosya_adi` | VARCHAR(255) | Hayır | Yüklenen dosya adı |
| `satir_sayisi` | INTEGER | Hayır | Toplam satir sayısı |
| `islenen_satir` | INTEGER | Hayır | İşlenen satir sayısı |
| `basarisiz_satir` | INTEGER | Hayır | Hatalı satir sayısı |
| `sonuc_dosya_url` | VARCHAR(500) | Hayır | Sonuç dosyası URL |
| `hata_ozeti` | TEXT | Hayır | Özet hata mesajları |
| `olusturan_kullanici_id` | UUID | ✓ | FK → kullanicilar |
| `onaylayan_kullanici_id` | UUID | Hayır | FK → kullanicilar |
| `olusturma_tarihi` | TIMESTAMP | ✓ | |
| `tamamlama_tarihi` | TIMESTAMP | Hayır | |

```sql
CREATE TABLE toplu_islemler (
    islem_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    islem_turu             VARCHAR(30) NOT NULL,
    durum                  VARCHAR(30) NOT NULL DEFAULT 'BEKLEMEDE',
    dosya_adi              VARCHAR(255),
    satir_sayisi           INTEGER,
    islenen_satir          INTEGER DEFAULT 0,
    basarisiz_satir        INTEGER DEFAULT 0,
    sonuc_dosya_url        VARCHAR(500),
    hata_ozeti             TEXT,
    olusturan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    onaylayan_kullanici_id UUID REFERENCES kullanicilar(kullanici_id),
    olusturma_tarihi       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tamamlama_tarihi       TIMESTAMP,

    CONSTRAINT islem_turu_check CHECK (islem_turu IN ('STOK_GIRISI', 'URETIM_EMRI', 'MUSKAYIT', 'TEDARIKCI_KAYIT', 'STOK_DUZELTME', 'ETIKET_BASKI', 'SATIS_IRAC')),
    CONSTRAINT islem_durum_check CHECK (durum IN ('BEKLEMEDE', 'VALIDATING', 'ISLENIYOR', 'TAMAMLANDI', 'HATALAR_VAR', 'IPTAL_EDILDI'))
);

CREATE INDEX idx_islem_turu ON toplu_islemler(islem_turu);
CREATE INDEX idx_islem_durum ON toplu_islemler(durum);
```

---

#### `toplu_islem_satirlari`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `satir_id` | UUID | ✓ | PK |
| `islem_id` | UUID | ✓ | FK → toplu_islemler |
| `satir_numarasi` | INTEGER | ✓ | Dosyadaki satir numarası |
| `durum` | VARCHAR(20) | ✓ | BEKLEMEDE, BASARILI, HATALI, ATLANDI |
| `ham_data` | JSONB | ✓ | Orijinal satir verisi |
| `islenmis_data` | JSONB | Hayır | İşlenmiş veri |
| `hata_mesaji` | TEXT | Hayır | Hata detayı |
| `referans_id` | UUID | Hayır | Oluşturulan kaynak ID (stok_id, emir_id vb.) |
| `olusturma_tarihi` | TIMESTAMP | ✓ | |

```sql
CREATE TABLE toplu_islem_satirlari (
    satir_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    islem_id         UUID NOT NULL REFERENCES toplu_islemler(islem_id),
    satir_numarasi   INTEGER NOT NULL,
    durum            VARCHAR(20) NOT NULL DEFAULT 'BEKLEMEDE',
    ham_data         JSONB NOT NULL,
    islenmis_data    JSONB,
    hata_mesaji      TEXT,
    referans_id      UUID,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT satir_durum_check CHECK (durum IN ('BEKLEMEDE', 'BASARILI', 'HATALI', 'ATLANDI'))
);

CREATE INDEX idx_islem_satir_islem ON toplu_islem_satirlari(islem_id);
CREATE INDEX idx_islem_satir_durum ON toplu_islem_satirlari(durum);
```

---

### 30.6 Üretim Maliyet (§3.4.13 — URETIM-MALIYET-COZUMU)

#### `uretim_iscilik`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `iscilik_id` | UUID | ✓ | PK |
| `emir_id` | UUID | ✓ | FK → uretim_emri |
| `personel_id` | UUID | ✓ | FK → kullanicilar |
| `baslama_tarihi` | TIMESTAMP | ✓ | |
| `bitis_tarihi` | TIMESTAMP | ✓ | |
| `calisma_suresi_dk` | INTEGER | ✓ | |
| `birim_ucret` | DECIMAL(15,2) | ✓ | TL/saat |
| `toplam_ucret` | DECIMAL(15,2) | ✓ | = (calisma_suresi_dk/60) × birim_ucret |
| `aciklama` | TEXT | Hayır | |
| `olusturma_tarihi` | TIMESTAMP | ✓ | |

```sql
CREATE TABLE uretim_iscilik (
    iscilik_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emir_id              UUID NOT NULL REFERENCES uretim_emri(uretim_id),
    personel_id          UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    baslama_tarihi       TIMESTAMP NOT NULL,
    bitis_tarihi         TIMESTAMP NOT NULL,
    calisma_suresi_dk    INTEGER NOT NULL,
    birim_ucret          DECIMAL(15,2) NOT NULL,
    toplam_ucret         DECIMAL(15,2) NOT NULL,
    aciklama             TEXT,
    olusturma_tarihi     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT iscilik_sure_check CHECK (calisma_suresi_dk > 0)
);

CREATE INDEX idx_iscilik_emir ON uretim_iscilik(emir_id);
```

---

#### `uretim_enerji`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `enerji_id` | UUID | ✓ | PK |
| `emir_id` | UUID | ✓ | FK → uretim_emri |
| `enerji_turu` | VARCHAR(20) | ✓ | ELEKTRIK, DOGALGAZ, DIZEL, BUHAR, DIGER |
| `baslangic_tarihi` | TIMESTAMP | ✓ | |
| `bitis_tarihi` | TIMESTAMP | ✓ | |
| `tuketim_miktari` | DECIMAL(15,3) | ✓ | kWh, m³, litre |
| `birim_fiyat` | DECIMAL(15,4) | ✓ | TL birim fiyat |
| `toplam_maliyet` | DECIMAL(15,2) | ✓ | |
| `olcu_cihazi_no` | VARCHAR(50) | Hayır | Sayaç/ölçü cihazı numarası |
| `aciklama` | TEXT | Hayır | |
| `olusturma_tarihi` | TIMESTAMP | ✓ | |

```sql
CREATE TABLE uretim_enerji (
    enerji_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emir_id             UUID NOT NULL REFERENCES uretim_emri(uretim_id),
    enerji_turu         VARCHAR(20) NOT NULL,
    baslangic_tarihi    TIMESTAMP NOT NULL,
    bitis_tarihi        TIMESTAMP NOT NULL,
    tuketim_miktari     DECIMAL(15,3) NOT NULL,
    birim_fiyat         DECIMAL(15,4) NOT NULL,
    toplam_maliyet      DECIMAL(15,2) NOT NULL,
    olcu_cihazi_no      VARCHAR(50),
    aciklama            TEXT,
    olusturma_tarihi    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT enerji_turu_check CHECK (enerji_turu IN ('ELEKTRIK', 'DOGALGAZ', 'DIZEL', 'BUHAR', 'DIGER'))
);

CREATE INDEX idx_enerji_emir ON uretim_enerji(emir_id);
```

---

#### `uretim_genel_gider`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `gider_id` | UUID | ✓ | PK |
| `emir_id` | UUID | ✓ | FK → uretim_emri |
| `gider_turu` | VARCHAR(30) | ✓ | |
| `aciklama` | TEXT | ✓ | |
| `tutar` | DECIMAL(15,2) | ✓ | TL |
| `dagitim_yontemi` | VARCHAR(20) | ✓ | DIREKT, IS_ORANI, ALAN_ORANI, ADET_ORANI |
| `dagitim_orani` | DECIMAL(8,4) | Hayır | Dağıtım oranı (0.0001 – 1.0000) |
| `referans_emir_id` | UUID | Hayır | Farklı emre dağıtım yapıldıysa |
| `olusturma_tarihi` | TIMESTAMP | ✓ | |

```sql
CREATE TABLE uretim_genel_gider (
    gider_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emir_id             UUID NOT NULL REFERENCES uretim_emri(uretim_id),
    gider_turu          VARCHAR(30) NOT NULL,
    aciklama            TEXT NOT NULL,
    tutar               DECIMAL(15,2) NOT NULL,
    dagitim_yontemi     VARCHAR(20) NOT NULL,
    dagitim_orani       DECIMAL(8,4),
    referans_emir_id    UUID REFERENCES uretim_emri(uretim_id),
    olusturma_tarihi    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT gider_dagitim_check CHECK (dagitim_yontemi IN ('DIREKT', 'IS_ORANI', 'ALAN_ORANI', 'ADET_ORANI'))
);

CREATE INDEX idx_gider_emir ON uretim_genel_gider(emir_id);
```

---

### 30.7 Raporlama Modülü (§3.4.x — RAPORLAMA-MODULU-COZUMU)

#### `rapor_tanimlari`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `rapor_id` | UUID | ✓ | PK |
| `kod` | VARCHAR(50) | ✓ | Benzersiz kod |
| `ad` | VARCHAR(200) | ✓ | Rapor adı |
| `aciklama` | TEXT | Hayır | |
| `rapor_turu` | VARCHAR(30) | ✓ | STOK, SATIS, URETIM, MALIYET, TEDARIKCI, MUSTERI, FIRE |
| `sorgu_sql` | TEXT | ✓ | Rapor SQL sorgusu |
| `parametreler` | JSONB | Hayır | Parametre şablonları |
| `grafik_turu` | VARCHAR(30) | Hayır | BAR, LINE, PIE, TABLE, KPI |
| `varsayilan_periyot` | VARCHAR(20) | Hayır | GUNLUK, HAFTALIK, AYLIK, YILLIK |
| `olusturma_tarihi` | TIMESTAMP | ✓ | |

```sql
CREATE TABLE rapor_tanimlari (
    rapor_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kod                     VARCHAR(50) NOT NULL UNIQUE,
    ad                      VARCHAR(200) NOT NULL,
    aciklama                TEXT,
    rapor_turu              VARCHAR(30) NOT NULL,
    sorgu_sql               TEXT NOT NULL,
    parametreler            JSONB,
    grafik_turu             VARCHAR(30),
    varsayilan_periyot      VARCHAR(20),
    olusturma_tarihi        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT rapor_turu_check CHECK (rapor_turu IN ('STOK', 'SATIS', 'URETIM', 'MALIYET', 'TEDARIKCI', 'MUSTERI', 'FIRE'))
);
```

---

#### `rapor_cektirme`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `cektirme_id` | UUID | ✓ | PK |
| `rapor_id` | UUID | ✓ | FK → rapor_tanimlari |
| `kullanici_id` | UUID | ✓ | FK → kullanicilar |
| `parametre_degerleri` | JSONB | Hayır | Kullanılan parametre değerleri |
| `cektirme_tarihi` | TIMESTAMP | ✓ | |
| `cektirme_suresi_ms` | INTEGER | Hayır | Sorgu süresi (ms) |
| `durum` | VARCHAR(20) | ✓ | BASARILI, HATALI |
| `sonuc_url` | VARCHAR(500) | Hayır | Sonuç dosyası URL |
| `hata_mesaji` | TEXT | Hayır | |

```sql
CREATE TABLE rapor_cektirme (
    cektirme_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rapor_id              UUID NOT NULL REFERENCES rapor_tanimlari(rapor_id),
    kullanici_id          UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    parametre_degerleri   JSONB,
    cektirme_tarihi       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cektirme_suresi_ms   INTEGER,
    durum                 VARCHAR(20) NOT NULL,
    sonuc_url             VARCHAR(500),
    hata_mesaji           TEXT,

    CONSTRAINT cektirme_durum_check CHECK (durum IN ('BASARILI', 'HATALI'))
);

CREATE INDEX idx_cektirme_rapor ON rapor_cektirme(rapor_id);
CREATE INDEX idx_cektirme_tarih ON rapor_cektirme(cektirme_tarihi);
```

---

#### `rapor_schedule`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `schedule_id` | UUID | ✓ | PK |
| `rapor_id` | UUID | ✓ | FK → rapor_tanimlari |
| `periyot` | VARCHAR(20) | ✓ | GUNLUK, HAFTALIK, AYLIK |
| `calisma_zamani` | TIME | ✓ | Günün hangi saatinde çalışsın |
| `son_calisma_tarihi` | TIMESTAMP | Hayır | Son çalıştrma zamanı |
| `sonuc_eposta_listesi` | TEXT | Hayır | virgülle ayrılmış e-posta |
| `aktif` | BOOLEAN | ✓ | Varsayılan TRUE |
| `olusturma_tarihi` | TIMESTAMP | ✓ | |

```sql
CREATE TABLE rapor_schedule (
    schedule_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rapor_id              UUID NOT NULL REFERENCES rapor_tanimlari(rapor_id),
    periyot               VARCHAR(20) NOT NULL,
    calisma_zamani        TIME NOT NULL,
    son_calisma_tarihi    TIMESTAMP,
    sonuc_eposta_listesi  TEXT,
    aktif                 BOOLEAN NOT NULL DEFAULT TRUE,
    olusturma_tarihi      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT schedule_periyot_check CHECK (periyot IN ('GUNLUK', 'HAFTALIK', 'AYLIK'))
);

CREATE INDEX idx_schedule_rapor ON rapor_schedule(rapor_id);
```

---

### 30.8 Satış İade (§3.4.x — SATIS-IADE-COZUMU)

#### `satilan_iadeler`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `iade_id` | UUID | ✓ | PK |
| `satis_id` | UUID | ✓ | FK → satis_kaydi |
| `satis_kalem_id` | UUID | ✓ | FK → satis_kalemleri |
| `musteri_id` | UUID | ✓ | FK → musteriler |
| `iade_nedeni` | VARCHAR(30) | ✓ | KALITE_SORUNU, YANLIS_URUN, MIKTAR_FARKI, MUSERI_ISTEK, DIGER |
| `durum` | VARCHAR(30) | ✓ | OLUŞTURULDU, KALITE_KONTROL, STOK_GIRISI, TAMAMLANDI, RET |
| `iade_miktar` | DECIMAL(15,3) | ✓ | İade edilen miktar |
| `birim_fiyat` | DECIMAL(15,2) | ✓ | Birim fiyat |
| `toplam_tutar` | DECIMAL(15,2) | ✓ | |
| `iade_kargo_takip` | VARCHAR(100) | Hayır | Kargo takip numarası |
| `son_kabul_tarihi` | DATE | Hayır | İade son kabul tarihi |
| `kalite_kontrol_tarihi` | TIMESTAMP | Hayır | |
| `kalite_kontrol_sonuc` | VARCHAR(30) | Hayır | |
| `stok_giris_tarihi` | TIMESTAMP | Hayır | |
| `stok_giris_lot_no` | VARCHAR(50) | Hayır | Yeni lot numarası |
| `aciklama` | TEXT | Hayır | |
| `olusturan_kullanici_id` | UUID | ✓ | FK → kullanicilar |
| `olusturma_tarihi` | TIMESTAMP | ✓ | |
| `tamamlama_tarihi` | TIMESTAMP | Hayır | |

```sql
CREATE TABLE satilan_iadeler (
    iade_id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    satis_id                   UUID NOT NULL REFERENCES satis_kaydi(satis_id),
    satis_kalem_id             UUID NOT NULL REFERENCES satis_kalemleri(kalem_id),
    musteri_id                 UUID NOT NULL REFERENCES musteriler(musteri_id),
    iade_nedeni                VARCHAR(30) NOT NULL,
    durum                      VARCHAR(30) NOT NULL DEFAULT 'OLUSTURULDU',
    iade_miktar                DECIMAL(15,3) NOT NULL,
    birim_fiyat                DECIMAL(15,2) NOT NULL,
    toplam_tutar               DECIMAL(15,2) NOT NULL,
    iade_kargo_takip           VARCHAR(100),
    son_kabul_tarihi           DATE,
    kalite_kontrol_tarihi      TIMESTAMP,
    kalite_kontrol_sonuc       VARCHAR(30),
    stok_giris_tarihi          TIMESTAMP,
    stok_giris_lot_no          VARCHAR(50),
    aciklama                   TEXT,
    olusturan_kullanici_id     UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    olusturma_tarihi          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tamamlama_tarihi          TIMESTAMP,

    CONSTRAINT iade_nedeni_check CHECK (iade_nedeni IN ('KALITE_SORUNU', 'YANLIS_URUN', 'MIKTAR_FARKI', 'MUSERI_ISTEK', 'DIGER')),
    CONSTRAINT iade_durum_check CHECK (durum IN ('OLUSTURULDU', 'KALITE_KONTROL', 'STOK_GIRISI', 'TAMAMLANDI', 'RET'))
);

CREATE INDEX idx_iade_satis ON satilan_iadeler(satis_id);
CREATE INDEX idx_iade_durum ON satilan_iadeler(durum);
CREATE INDEX idx_iade_musteri ON satilan_iadeler(musteri_id);
```

---

#### `iade_numune`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `numune_id` | UUID | ✓ | PK |
| `iade_id` | UUID | ✓ | FK → satilan_iadeler |
| `numune_tarihi` | TIMESTAMP | ✓ | |
| `numune_miktar` | DECIMAL(15,3) | ✓ | |
| `aciklama` | TEXT | Hayır | |
| `analiz_sonuc` | VARCHAR(30) | Hayır | |
| `olusturma_tarihi` | TIMESTAMP | ✓ | |

```sql
CREATE TABLE iade_numune (
    numune_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iade_id           UUID NOT NULL REFERENCES satilan_iadeler(iade_id),
    numune_tarihi     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    numune_miktar     DECIMAL(15,3) NOT NULL,
    aciklama          TEXT,
    analiz_sonuc      VARCHAR(30),
    olusturma_tarihi  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_iade_numune_iade ON iade_numune(iade_id);
```

---

### 30.9 Stok Düzeltme Onay (§3.4.8 — STOK-DUZELTME-ONAY-COZUMU)

#### `stok_duzeltme_talepleri`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `talep_id` | UUID | ✓ | PK |
| `stok_id` | UUID | ✓ | FK → stok_karti |
| `talep_tipi` | VARCHAR(20) | ✓ | SAYIM_FARKI, FIRE_ZARAR, CALISMA, BIRIM_DEGISIKLIGI |
| `durum` | VARCHAR(30) | ✓ | OLUSTURULDU, BEKLEMEDE_ONAY, ONAYLANDI, REDDEDILDI, TAMAMLANDI, IPTAL_EDILDI |
| `mevcut_miktar` | DECIMAL(15,3) | ✓ | Düzeltme öncesi miktar |
| `yeni_miktar` | DECIMAL(15,3) | ✓ | Düzeltme sonrası miktar |
| `fark` | DECIMAL(15,3) | ✓ | yeni - mevcut |
| `kritik_esik` | DECIMAL(5,2) | Hayır | %10 eşiği aşıldı mı? |
| `aciklama` | TEXT | ✓ | Düzeltme gerekçesi |
| `belge_url` | VARCHAR(500) | Hayır | Kanıt belge URL |
| `olusturan_kullanici_id` | UUID | ✓ | FK → kullanicilar |
| `olusturma_tarihi` | TIMESTAMP | ✓ | |

```sql
CREATE TABLE stok_duzeltme_talepleri (
    talep_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stok_id                 UUID NOT NULL REFERENCES stok_karti(stok_id),
    talep_tipi              VARCHAR(20) NOT NULL,
    durum                   VARCHAR(30) NOT NULL DEFAULT 'OLUSTURULDU',
    mevcut_miktar           DECIMAL(15,3) NOT NULL,
    yeni_miktar             DECIMAL(15,3) NOT NULL,
    fark                    DECIMAL(15,3) NOT NULL,
    kritik_esik             DECIMAL(5,2),
    aciklama                TEXT NOT NULL,
    belge_url               VARCHAR(500),
    olusturan_kullanici_id  UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    olusturma_tarihi        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT talep_tipi_check CHECK (talep_tipi IN ('SAYIM_FARKI', 'FIRE_ZARAR', 'CALISMA', 'BIRIM_DEGISIKLIGI')),
    CONSTRAINT talep_durum_check CHECK (durum IN ('OLUSTURULDU', 'BEKLEMEDE_ONAY', 'ONAYLANDI', 'REDDEDILDI', 'TAMAMLANDI', 'IPTAL_EDILDI'))
);

CREATE INDEX idx_talep_stok ON stok_duzeltme_talepleri(stok_id);
CREATE INDEX idx_talep_durum ON stok_duzeltme_talepleri(durum);
```

---

#### `stok_duzeltme_onay`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `onay_id` | UUID | ✓ | PK |
| `talep_id` | UUID | ✓ | FK → stok_duzeltme_talepleri |
| `onaylayan_kullanici_id` | UUID | ✓ | FK → kullanicilar |
| `karar` | VARCHAR(20) | ✓ | ONAYLADI, REDDETTI |
| `gerekce` | TEXT | Hayır | Ret gerekçesi (ret için zorunlu) |
| `onay_tarihi` | TIMESTAMP | ✓ | |

```sql
CREATE TABLE stok_duzeltme_onay (
    onay_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    talep_id                UUID NOT NULL REFERENCES stok_duzeltme_talepleri(talep_id),
    onaylayan_kullanici_id UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    karar                   VARCHAR(20) NOT NULL,
    gerekce                 TEXT,
    onay_tarihi             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT onay_karar_check CHECK (karar IN ('ONAYLADI', 'REDDETTI')),
    CONSTRAINT onay_gerekce_zorunlu CHECK (karar <> 'REDDETTI' OR gerekce IS NOT NULL)
);

CREATE INDEX idx_onay_talep ON stok_duzeltme_onay(talep_id);
```

---

### 30.10 SKT İşlem (§3.4.7 — FEFO/SKT)

#### `skt_islem`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `islem_id` | UUID | ✓ | PK |
| `stok_id` | UUID | ✓ | FK → stok_karti |
| `islem_turu` | VARCHAR(30) | ✓ | IMHA, INDIRIM, DEVIR, IADE_TEDARIKCI |
| `durum` | VARCHAR(20) | ✓ | BEKLEMEDE, ONAYLANDI, TAMAMLANDI, IPTAL |
| `miktar` | DECIMAL(15,3) | ✓ | İşlem miktarı |
| `birim_fiyat` | DECIMAL(15,2) | Hayır | İndirim birim fiyatı (indirim için) |
| `toplam_tutar` | DECIMAL(15,2) | Hayır | Toplam tutar |
| `gerekce` | TEXT | ✓ | |
| `belge_url` | VARCHAR(500) | Hayır | İmha raporu vb. |
| `onaylayan_kullanici_id` | UUID | Hayır | FK → kullanicilar |
| `olusturan_kullanici_id` | UUID | ✓ | FK → kullanicilar |
| `olusturma_tarihi` | TIMESTAMP | ✓ | |
| `onay_tarihi` | TIMESTAMP | Hayır | |
| `tamamlama_tarihi` | TIMESTAMP | Hayır | |

```sql
CREATE TABLE skt_islem (
    islem_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stok_id                  UUID NOT NULL REFERENCES stok_karti(stok_id),
    islem_turu               VARCHAR(30) NOT NULL,
    durum                    VARCHAR(20) NOT NULL DEFAULT 'BEKLEMEDE',
    miktar                   DECIMAL(15,3) NOT NULL,
    birim_fiyat              DECIMAL(15,2),
    toplam_tutar             DECIMAL(15,2),
    gerekce                  TEXT NOT NULL,
    belge_url                VARCHAR(500),
    onaylayan_kullanici_id  UUID REFERENCES kullanicilar(kullanici_id),
    olusturan_kullanici_id  UUID NOT NULL REFERENCES kullanicilar(kullanici_id),
    olusturma_tarihi         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    onay_tarihi              TIMESTAMP,
    tamamlama_tarihi         TIMESTAMP,

    CONSTRAINT skt_islem_turu_check CHECK (islem_turu IN ('IMHA', 'INDIRIMLI_SATIS', 'DEVIR', 'IADE_TEDARIKCI')),
    CONSTRAINT skt_islem_durum_check CHECK (durum IN ('BEKLEMEDE', 'ONAYLANDI', 'TAMAMLANDI', 'IPTAL'))
);

CREATE INDEX idx_skt_islem_stok ON skt_islem(stok_id);
CREATE INDEX idx_skt_islem_durum ON skt_islem(durum);
```

---

## Sonraki Adımlar

1. Bu tasarımın SRS ile doğrulanması
2. Gerekli görülen düzeltmelerin yapılması
3. `update_db_design.py` çalıştırılarak Alembic migration oluşturulması
4. İlk Sprint backlog hazırlığı
