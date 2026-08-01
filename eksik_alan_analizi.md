# Eksik/Tamamlanmamış Varlık Alanları Analizi

**Hazırlık Tarihi:** 2026-07-27  
**Kapsam:** SRS, DB-Design ve System-Arch dokümanları karşılaştırması  
**Dil:** Türkçe

---

## 1. TEDARİKÇİ (Suppliers) Varlığı

### Mevcut Durum
| Doküman | Alanlar |
|---------|---------|
| **SRS** | tedarikci_id, ad, vergi_no, telefon, eposta, adres, aktif |
| **DB Design** | tedarikci_id, ad, vergi_no, telefon, eposta, adres, aktif, olusturma_tarihi, guncelleme_tarihi, silme_tarihi, olusturan_kullanici_id |

### Eksik Alanlar ve Öneriler

| # | Eksik Alan | Veri Tipi | Öneri | Gerekçe |
|---|------------|-----------|-------|---------|
| 1 | `faks` | VARCHAR(20) | Eklenmeli | Faks numarası hala iş süreçlerinde kullanılıyor |
| 2 | `yetkili_kisi` | VARCHAR(255) | Eklenmeli | Tedarikçi firma yetkilisinin adı Soyadı |
| 3 | `yetkili_telefon` | VARCHAR(20) | Eklenmeli | Yetkili kişiye ait direct telefon |
| 4 | `yetkili_eposta` | VARCHAR(255) | Eklenmeli | Yetkili kişiye ait direct e-posta |
| 5 | `banka_adi` | VARCHAR(100) | Eklenmeli | Ödeme için banka bilgisi |
| 6 | `banka_sube` | VARCHAR(100) | Eklenmeli | Şube adı |
| 7 | `hesap_no` | VARCHAR(50) | Eklenmeli | IBAN veya hesap numarası |
| 8 | `odeme_vadesi` | INTEGER | Eklenmeli | Gün cinsinden vade (örn: 30, 60, 90) |
| 9 | `tedarikci_sinifi` | ENUM('A','B','C') | Eklenmeli | Tedarikçi sınıflandırması performans değerlendirmesi için |
| 10 | `not` | TEXT | Eklenmeli | SRS'de bahsedilmemiş ancak DB Design'da da yok, eklenmeli |
| 11 | `olusturan_kullanici_id` | UUID | DB Design'da var, SRS'de yok - SRS'ye eklenmeli |

---

## 2. MÜŞTERİ (Customers) Varlığı

### Mevcut Durum
| Doküman | Alanlar |
|---------|---------|
| **SRS** | musteri_id, ad, telefon, eposta, adres, vergi_no, not |
| **DB Design** | musteri_id, ad, telefon, eposta, adres, vergi_no, not, aktif, olusturma_tarihi, guncelleme_tarihi, silme_tarihi, olusturan_kullanici_id |

### Eksik Alanlar ve Öneriler

| # | Eksik Alan | Veri Tipi | Öneri | Gerekçe |
|---|------------|-----------|-------|---------|
| 1 | `musteri_tipi` | ENUM('BIREYSEL','KURUMSAL') | Eklenmeli | Müşteri türüne göre farklı işlem gerekebilir |
| 2 | `tc_kimlik` | VARCHAR(11) | Eklenmeli | Bireysel müşteriler için TC kimlik zorunlu olabilir |
| 3 | `faks` | VARCHAR(20) | Eklenmeli | Kurumsal müşteriler için faks |
| 4 | `teslimat_adresi` | TEXT | Eklenmeli | Fatura adresinden farklı teslimat adresi gerekebilir |
| 5 | `il` | VARCHAR(50) | Eklenmeli | Adresin iller bazında sınıflandırılması |
| 6 | `ilce` | VARCHAR(50) | Eklenmeli | Adresin ilçe bazında sınıflandırılması |
| 7 | `posta_kodu` | VARCHAR(10) | Eklenmeli | Posta kodu bilgisi |
| 8 | `musteri_sinifi` | ENUM('A','B','C') | Eklenmeli | Müşteri sınıflandırması |
| 9 | `odeme_vadesi` | INTEGER | Eklenmeli | Müşteriye özel vade bilgisi |
| 10 | `kredi_limiti` | DECIMAL(15,4) | Eklenmeli | Müşteriye tanınan kredi limiti |
| 11 | `satis_temsilcisi_id` | UUID | Eklenmeli | Bu müşteriden sorumlu satış temsilcisi |
| 12 | `dogum_tarihi` | DATE | Eklenmeli | Bireysel müşteriler için |
| 13 | `cinsiyet` | ENUM('E','K','D') | Eklenmeli | Bireysel müşteriler için (Erkek, Kadın, Belirtilmemiş) |
| 14 | `olusturan_kullanici_id` | UUID | DB Design'da var, SRS'de yok - SRS'ye eklenmeli |

---

## 3. ÜRÜN (Products) Varlığı

### Mevcut Durum
| Doküman | Alanlar |
|---------|---------|
| **SRS** | urun_id, ad, kategori, birim_toptan, birim_perakende, aktif |
| **DB Design** | urun_id, ad, kategori, birim_toptan, birim_perakende, varsayilan_ozellikler, aktif, olusturma_tarihi, guncelleme_tarihi, silme_tarihi, olusturan_kullanici_id |

### Eksik Alanlar ve Öneriler

| # | Eksik Alan | Veri Tipi | Öneri | Gerekçe |
|---|------------|-----------|-------|---------|
| 1 | `stok_kodu` | VARCHAR(50) | Eklenmeli | SKU (Stock Keeping Unit) numarası |
| 2 | `barkod` | VARCHAR(50) | Eklenmeli | Ürün barkod numarası (EAN-13, UPC vb.) |
| 3 | `aciklama` | TEXT | Eklenmeli | Ürün hakkında detaylı açıklama |
| 4 | `gorsel_url` | VARCHAR(500) | Eklenmeli | Ürün fotoğrafı |
| 5 | `agirlik` | DECIMAL(10,3) | Eklenmeli | Paket ağırlığı (gram) |
| 6 | `hacim` | DECIMAL(10,3) | Eklenmeli | Paket hacmi (cm³) |
| 7 | `最小_stok_seviyesi` | DECIMAL(15,3) | Eklenmeli | Minimum stok uyarı seviyesi |
| 8 | `maksimum_stok_seviyesi` | DECIMAL(15,3) | Eklenmeli | Maksimum stok limiti |
| 9 | `raf_omru_gun` | INTEGER | Eklenmeli | Gün cinsinden raf ömrü |
| 10 | `olusturan_kullanici_id` | UUID | DB Design'da var, SRS'de yok - SRS'ye eklenmeli |

### Kategori Enum Değerleri Yetersizliği

**Mevcut:** MEYVE, BAL, KARSIM

**Öneri:** Daha fazla kategori eklenmeli
- `KURUYEMIS`
- `SEBZE` (kurutulmuş sebze varsa)
- `KURU_BAKLIYAT`
- `YAG` (bitkisel/hayvansal yağlar)
- `TURŞU`
- `DIGER`

---

## 4. STOK KARTI (Stock Card/Lot) Varlığı

### Mevcut Durum
| Doküman | Alanlar |
|---------|---------|
| **SRS** | stok_id, urun_id, lot_no, tedarikci_id, uretim_tarihi, son_kullanma, giris_tarihi, miktar, birim, birim_fiyat, konum |
| **DB Design** | stok_id, urun_id, lot_no, tedarikci_id, kaynak_stok_id, stok_tipi, uretim_tarihi, son_kullanma, giris_tarihi, miktar, birim, birim_fiyat, konum, durum, olusturma_tarihi, guncelleme_tarihi, silme_tarihi, olusturan_kullanici_id |

### Eksik Alanlar ve Öneriler

| # | Eksik Alan | Veri Tipi | Öneri | Gerekçe |
|---|------------|-----------|-------|---------|
| 1 | `kalite_notu` | INTEGER (1-5) | Eklenmeli | Giriş kalite kontrol puanı |
| 2 | `kalite_kontrol_tarihi` | TIMESTAMP | Eklenmeli | Kalite kontrol yapılma tarihi |
| 3 | `kalite_kontrol_edildi` | BOOLEAN | Eklenmeli | Kalite kontrolü yapıldı mı? |
| 4 | `depo` | VARCHAR(50) | Eklenmeli | Depo adı (A deposu, B deposu vb.) |
| 5 | `raf` | VARCHAR(50) | Eklenmeli | Raf numarası |
| 6 | `blok` | VARCHAR(50) | Eklenmeli | Depo içi blok/bölge |
| 7 | `agirlik_birim` | VARCHAR(20) | Eklenmeli | Ağırlık birimi (brüt, net) |
| 8 | `brut_miktar` | DECIMAL(15,3) | Eklenmeli | Brüt miktar (ambalaj dahil) |
| 9 | `net_miktar` | DECIMAL(15,3) | Eklenmeli | Net miktar (ürün sadece) |
| 10 | `palet_no` | VARCHAR(50) | Eklenmeli | Palet numarası (varsa) |
| 11 | `giris_referans_no` | VARCHAR(100) | Eklenmeli | Alım irsaliyesi/fatura numarası |
| 12 | `musteri_id` | UUID | Eklenmeli | Satış çıkışı sonrası hangi müşteriye satıldı (izlenebilirlik için) |
| 13 | `satis_hareket_id` | UUID | Eklenmeli | Satış hareketi referansı (izlenebilirlik için) |

### Durum Enum Değerleri Yetersizliği

**Mevcut:** AKTIF, BITTI, IPTAL

**Öneri:** Ek durumlar eklenmeli
- `KALITE_KONTROL` - Kalite kontrolde bekliyor
- `DEPO_DISI` - Depo dışında (satış, iade vb.)
- `RET` - Reddedildi (kalite problemi)

---

## 5. ÜRETİM EMİRİ (Production Order) Varlığı

### Mevcut Durum
| Doküman | Alanlar |
|---------|---------|
| **SRS** | uretim_id, tarih, durum, not |
| **DB Design** | uretim_id, uretim_no, tarih, durum, planlanan_tarih, tamamlama_tarihi, not, olusturma_tarihi, guncelleme_tarihi, silme_tarihi, olusturan_kullanici_id |

### Eksik Alanlar ve Öneriler

| # | Eksik Alan | Veri Tipi | Öneri | Gerekçe |
|---|------------|-----------|-------|---------|
| 1 | `oncelik` | ENUM('DUSUK','NORMAL','YUKSEK','ACIL') | Eklenmeli | Üretim öncelik seviyesi |
| 2 | `planlanan_miktar` | DECIMAL(15,3) | Eklenmeli | Planlanan üretim miktarı |
| 3 | `gerceklesen_miktar` | DECIMAL(15,3) | Eklenmeli | Fiili üretim miktarı |
| 4 | `planlanan_baslama` | TIMESTAMP | Eklenmeli | Planlanan başlama zamanı |
| 5 | `gerceklesen_baslama` | TIMESTAMP | Eklenmeli | Fiili başlama zamanı |
| 6 | `kalite_kontrol_onayi` | BOOLEAN | Eklenmeli | Kalite kontrol onayı alındı mı? |
| 7 | `kalite_kontrol_tarihi` | TIMESTAMP | Eklenmeli | Kalite kontrol tarihi |
| 8 | `kalite_kontrol_edildi_id` | UUID | Eklenmeli | Kalite kontrol eden kullanıcı |
| 9 | `toplam_maliyet` | DECIMAL(15,4) | Eklenmeli | Toplam üretim maliyeti |
| 10 | `fire_orani_planlanan` | DECIMAL(5,4) | Eklenmeli | Planlanan fire oranı |
| 11 | `fire_orani_gercek` | DECIMAL(5,4) | Eklenmeli | Fiili fire oranı |
| 12 | `son_tarih` | DATE | Eklenmeli | Teslimat son tarihi |
| 13 | `musteri_id` | UUID | Eklenmeli | Özel üretim ise ilgili müşteri |
| 14 | `siparis_no` | VARCHAR(50) | Eklenmeli | Müşteri sipariş numarası |

---

## 6. SATIŞ KAYDI (Sales Record) Varlığı

### Mevcut Durum
| Doküman | Alanlar |
|---------|---------|
| **SRS** | satis_id, musteri_id, tarih, durum, toplam_tutar, not |
| **DB Design** | satis_id, satis_no, musteri_id, tarih, durum, toplam_tutar, indirim_tutari, not, olusturma_tarihi, guncelleme_tarihi, silme_tarihi, olusturan_kullanici_id |

### Eksik Alanlar ve Öneriler

| # | Eksik Alan | Veri Tipi | Öneri | Gerekçe |
|---|------------|-----------|-------|---------|
| 1 | `teslimat_adresi` | TEXT | Eklenmeli | Fatura adresinden farklı olabilir |
| 2 | `odeme_sekli` | ENUM('NAKIT','CEK','HAVALE','KREDI_KARTI','KAPIDA_ODEME') | Eklenmeli | Ödeme şekli |
| 3 | `odeme_durumu` | ENUM('BEKLIYOR','ODENDI','KISMEN_ODENDI','VADE_GECIKTI') | Eklenmeli | Ödeme durumu (sistem faturanın dışında olsa da) |
| 4 | `vade_tarihi` | DATE | Eklenmeli | Ödeme vade tarihi |
| 5 | `fatura_kesildi` | BOOLEAN | Eklenmeli | Fatura kesildi mi? |
| 6 | `fatura_no` | VARCHAR(50) | Eklenmeli | Fatura numarası |
| 7 | `fatura_tarihi` | DATE | Eklenmeli | Fatura kesilme tarihi |
| 8 | `kargo_bilgileri` | VARCHAR(255) | Eklenmeli | Kargo firması ve takip numarası |
| 9 | `satis_tipi` | ENUM('PERAKENDE','TOPTAN','OZEL_SIPARIS') | Eklenmeli | Satış türü |
| 10 | `teslimat_tarihi` | DATE | Eklenmeli | Planlanan teslimat tarihi |
| 11 | `teslim_tarihi` | DATE | Eklenmeli | Fiili teslimat tarihi |
| 12 | `teslim_eden_id` | UUID | Eklenmeli | Teslim eden kullanıcı |
| 13 | `teslim_alan` | VARCHAR(255) | Eklenmeli | Teslim alan kişi adı |
| 14 | `iade_nedeni` | TEXT | Eklenmeli | İade durumunda iade nedeni |
| 15 | `iade_tarihi` | TIMESTAMP | Eklenmeli | İade işlem tarihi |

---

## 7. KULLANICI (User) Varlığı

### Mevcut Durum
| Doküman | Alanlar |
|---------|---------|
| **SRS** |roller bölümünde sınırlı bilgi |
| **DB Design** | kullanici_id, kullanici_adi, sifre_hash, ad, soyad, eposta, rol_id, aktif, son_giris, olusturma_tarihi, guncelleme_tarihi, silme_tarihi |

### Eksik Alanlar ve Öneriler

| # | Eksik Alan | Veri Tipi | Öneri | Gerekçe |
|---|------------|-----------|-------|---------|
| 1 | `telefon` | VARCHAR(20) | Eklenmeli | Kullanıcı telefonu (bildirimler için) |
| 2 | `avatar_url` | VARCHAR(500) | Eklenmeli | Profil fotoğrafı |
| 3 | `bildirim_tercihleri` | JSONB | Eklenmeli | E-posta, SMS, uygulama bildirim tercihleri |
| 4 | `giris_sayisi` | INTEGER | Eklenmeli | Toplam giriş sayısı |
| 5 | `son_sifre_degisikligi` | TIMESTAMP | Eklenmeli | Son şifre değişikliği tarihi |
| 6 | `两只_factor_aktivate` | BOOLEAN | Eklenmeli | İki faktörlü doğrulama aktif mi? |
| 7 | `两只_factor_secret` | VARCHAR(255) | Eklenmeli | TOTP secret (şifrelenmiş) |
| 8 | `varsayilan_depo_id` | UUID | Eklenmeli | Kullanıcının varsayılan deposu |
| 9 | `adres` | TEXT | Eklenmeli | Kullanıcı adresi |
| 10 | `dogum_tarihi` | DATE | Eklenmeli | Doğum tarihi |
| 11 | `bolum` | VARCHAR(100) | Eklenmeli | Departman/bölüm |
| 12 | `unvan` | VARCHAR(100) | Eklenmeli | İş unvanı |

---

## 8. STOK HAREKETLERİ (Stock Movements) Varlığı

### Mevcut Durum
| Doküman | Alanlar |
|---------|---------|
| **SRS** | Tablo 3.4.4'te sınırlı bilgi |
| **DB Design** | hareket_id, stok_id, hareket_tipi, miktar, birim_fiyat, tutar, onceki_miktar, sonraki_miktar, referans_id, referans_tipi, aciklama, olusturma_tarihi, olusturan_kullanici_id |

### Eksik Alanlar ve Öneriler

| # | Eksik Alan | Veri Tipi | Öneri | Gerekçe |
|---|------------|-----------|-------|---------|
| 1 | `karsi_stok_id` | UUID | Eklenmeli | Transfer işlemlerinde karşı lot (nereye gittiği) |
| 2 | `fifo_ihlal_edildi` | BOOLEAN | Eklenmeli | FIFO kuralı ihlal edildi mi? |
| 3 | `fifo_ihlal_nedeni` | TEXT | Eklenmeli | FIFO ihlal nedeni (manuel onay vb.) |
| 4 | `lot_no` | VARCHAR(50) | DB Design'da yok, eklenmeli | Stok kartından alınabilir ama raporlama için direkt olmalı |
| 5 | `musteri_id` | UUID | Eklenmeli | Satış hareketlerinde müşteri referansı |
| 6 | `tedarikci_id` | UUID | Eklenmeli | Giriş hareketlerinde tedarikçi referansı |

---

## 9. TEDARİKÇİ DEĞERLENDİRME (Supplier Evaluation) Varlığı

### Eksik Alanlar

| # | Eksik Alan | Veri Tipi | Öneri | Gerekçe |
|---|------------|-----------|-------|---------|
| 1 | `fiyat_puani` | DECIMAL(3,2) | Eklenmeli | Fiyat değerlendirmesi (1-5) |
| 2 | `hizmet_puani` | DECIMAL(3,2) | Eklenmeli | Hizmet değerlendirmesi (1-5) |
| 3 | `genel_puan` | DECIMAL(3,2) | Eklenmeli | Genel performans puanı |
| 4 | `odeme_plani` | VARCHAR(50) | Eklenmeli | Ödeme planı uyumu |
| 5 | `sertifikalar` | JSONB | Eklenmeli | Kalite sertifikaları (ISO, organik vb.) |
| 6 | `resmi_dosyalar` | JSONB | Eklenmeli | Ticaret sicil, vergi levhası vb. |

---

## 10. ÜRÜN DÖNÜŞÜM ORANLARI (Product Conversion) Varlığı

### Mevcut Durum
- DB Design'da `urun_donusum` tablosu mevcut: donusum_id, mamul_urun_id, hammadde_urun_id, donusum_orani, fire_orani, aktif, olusturma_tarihi, guncelleme_tarihi, silme_tarihi

### Eksik Alanlar

| # | Eksik Alan | Veri Tipi | Öneri | Gerekçe |
|---|------------|-----------|-------|---------|
| 1 | `birim` | VARCHAR(20) | Eklenmeli | Hangi birimle ifade edildiği (kg, ton vb.) |
| 2 | `baslangic_tarihi` | DATE | Eklenmeli | Dönüşüm oranının geçerli olduğu başlangıç |
| 3 | `bitis_tarihi` | DATE | Eklenmeli | Dönüşüm oranının geçerli olduğu bitiş |
| 4 | `aciklama` | TEXT | Eklenmeli | Açıklama veya not |

---

## 11. SİSTEM AYARLARI (System Settings) Eksiklikleri

### Mevcut Durum
- DB Design'da `sistem_ayarlari` tablosu var: ayar_id, ayar_adi, deger, veri_tipi, aciklama, kategori, olusturma_tarihi, guncelleme_tarihi

### Önerilen Yeni Sistem Ayarları

| # | Ayar Adı | Veri Tipi | Öneri | Gerekçe |
|---|----------|-----------|-------|---------|
| 1 | `fifo_ihlal_toleransi_gun` | INTEGER | Eklenmeli | FIFO ihlaline izin verilen gün farkı |
| 2 | `varsayilan_son_kullanma_gun` | INTEGER | Eklenmeli | Ürün girişinde varsayılan son kullanma gün sayısı |
| 3 | `minimum_stok_uyari_esigi` | DECIMAL(15,3) | Eklenmeli | Minimum stok uyarı eşiği (genel) |
| 4 | `son_kullanma_uyari_gun` | INTEGER | Eklenmeli | Son kullanma uyarısı kaç gün önce |
| 5 | `kalite_kontrol_zorunlu` | BOOLEAN | Eklenmeli | Stok girişinde kalite kontrol zorunlu mu? |
| 6 | `fatura_no_zorunlu` | BOOLEAN | Eklenmeli | Stok girişinde fatura numarası zorunlu mu? |

---

## 12. ROL YÖNETİMİ Eksiklikleri

### Mevcut Durum
| Doküman | Roller |
|---------|--------|
| **SRS** | ADMIN, DEPO_SORUMLUSU, SATIS_SORUMLUSU, RAPOR |
| **DB Design** | Varsayılan roller: ADMIN, DEPO_SORUMLUSU, SATIS_SORUMLUSU |

### Eksik Roller

| # | Eksik Rol | Yetkiler | Öneri |
|---|-----------|----------|-------|
| 1 | `MUSTERI_HIZMETLERI` | musteri_oku, musteri_yaz, satis_oku | Müşteri hizmetleri temsilcisi |
| 2 | `KALITE_KONTROL` | stok_oku, kalite_oku, kalite_yaz, rapor_oku | Kalite kontrol sorumlusu |
| 3 | `FINANS` | rapor_oku, finans_rapor | Finans/muhasebe |
| 4 | `YEDEK_KULLANICI` | Sınırlı yetkiler | Acil durumlar için |

---

## 13. BİLDİRİM SİSTEMİ Eksiklikleri

### Mevcut Durum
- SRS Bölüm 10'da tanımlanmış (Tablo 10.1-10.4)

### Eksik Bildirim Türleri

| # | Eksik Bildirim Türü | Kanal | Öneri |
|---|---------------------|-------|-------|
| 1 | `kalite_kontrol_gerekli` | Uygulama, E-posta | Stok girişinde kalite kontrol bekliyor |
| 2 | `fifo_ihlal_uyari` | Uygulama, E-posta | FIFO kuralı ihlal edildiğinde |
| 3 | `stok_depo_ Doluyor` | Uygulama | Depo doluluk oranı yüksek |
| 4 | `musteri_odeme_gecikti` | Uygulama, E-posta | Müşteri ödemesi gecikmiş |
| 5 | `sistem_yedekleme_basarili` | E-posta | Yedekleme tamamlandı bilgisi |
| 6 | `guvenlik_uyari` | E-posta, SMS | Kritik güvenlik olayları |

---

## 14. DOKÜMANLAR ARASI UYUMSUZLUKLAR

### 14.1 `olusturan_kullanici_id` Alanı Tutarsızlığı

| Tablo | SRS | DB Design |
|-------|-----|-----------|
| tedarikciler | ❌ Yok | ✅ Var |
| musteriler | ❌ Yok | ✅ Var |
| urunler | ❌ Yok | ✅ Var |
| tedarikci_degerlendirme | ❌ Yok | ✅ Var |

**Öneri:** SRS dokümanındaki tüm tablolara `olusturan_kullanici_id` alanı eklenmeli.

### 14.2 Zaman Damgası (Timestamp) Alanları Tutarsızlığı

**SRS Bölüm 4.2:** "Created_at, updated_at, created_by her tabloda" denmiş

**DB Design:** Uyumlu ✅

**SRS:** Tablo tanımlarında `created_at`, `updated_at` ve `created_by` eksik

### 14.3 Soft Delete Tutarsızlığı

- **SRS:** Soft delete tanımlı
- **DB Design:** `silme_tarihi` alanı var
- **SRS Tabloları:** Tanımlarda `silme_tarihi` alanı genellikle yok

---

## 15. TOPLAM EKSİK ALAN ÖZETİ

| Varlık | Eksik Alan Sayısı |
|--------|-------------------|
| Tedarikçi | 11 |
| Müşteri | 14 |
| Ürün | 10 (+ 6 yeni kategori) |
| Stok Kartı | 13 (+ 3 yeni durum) |
| Üretim Emri | 14 |
| Satış Kaydı | 15 |
| Kullanıcı | 12 |
| Stok Hareketleri | 6 |
| Tedarikçi Değerlendirme | 6 |
| Ürün Dönüşüm | 4 |
| Sistem Ayarları | 6 öneri |
| Bildirimler | 6 öneri |
| Roller | 4 öneri |

**Toplam: ~117 eksik veya tamamlanması gereken alan/entity**

---

## 16. ÖNCELİKLENDİRME ÖNERİSİ

### P0 - Kritik (Mutlak Gerekli)
1. Tüm tablolara `olusturan_kullanici_id` eklenmesi (SRS-DB tutarlılığı)
2. Stok Kartı'na `kalite_notu`, `kalite_kontrol_edildi` eklenmesi
3. Satış Kaydı'na `odeme_sekli`, `odeme_durumu` eklenmesi
4. Ürün tablosuna `stok_kodu`, `barkod` eklenmesi

### P1 - Yüksek (İş Süreçleri İçin Önemli)
1. Müşteri tablosuna `musteri_tipi`, `teslimat_adresi` eklenmesi
2. Tedarikçi tablosuna `yetkili_kisi`, `banka_bilgileri` eklenmesi
3. Üretim Emri'ne `oncelik`, `toplam_maliyet` eklenmesi
4. Stok Hareketleri'ne `karsi_stok_id` (transfer için) eklenmesi

### P2 - Orta (Raporlama ve Analitik)
1. Stok Kartı'na `depo`, `raf`, `blok` eklenmesi
2. Kullanıcı tablosuna `bildirim_tercihleri` eklenmesi
3. Yeni kategorilerin eklenmesi (KURUYEMIS vb.)
4. Sistem ayarlarının genişletilmesi

---

*Bu analiz, üç dokümanın (SRS, DB Design, System Arch) karşılaştırmalı incelenmesi sonucunda hazırlanmıştır.*
