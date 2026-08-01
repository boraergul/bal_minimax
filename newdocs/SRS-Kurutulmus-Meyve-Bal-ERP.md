# Gereksinim Spesifikasyon Dokümanı (SRS)
## Kurutulmuş Meyve ve Bal Yönetim Sistemi

**Versiyon:** 1.4  
**Tarih:** 2026-07-30  
**Durum:** Tamamlandı

---

## 1. Giriş

### 1.1 Amaç
Bu doküman, kurutulmuş meyve ve bal üreticisi/toptancısı için geliştirilecek yönetim sisteminin tüm gereksinimlerini tanımlar. Sistem; tedarik zinciri takibi, üretim yönetimi, stok kontrolü, lot/parti izlenebilirliği ve raporlama fonksiyonlarını kapsayacak şekilde tasarlanmıştır.

### 1.2 Kapsam
**Dahil Edilen:**
- Tedarikçi Yönetimi
- Ürün Kataloğu Yönetimi
- Müşteri Yönetimi
- Envanter/Stok Yönetimi (Hammadde ve Mamul)
- Üretim İşlemleri (Lot Dönüşümü)
- Satış Takibi
- Lot İzlenebilirliği (Tedarikçi → Üretim → Son Ürün)
- FEFO+FIFO Hibrit Stok Yönetimi
- Raporlama ve Analitik
- Yedekleme ve Felaket Kurtarma
- Birim Testleri

**Dahil Edilmeyen:**
- Faturalama, ödeme takibi, e-fatura/e-arşiv entegrasyonu, GİB işlemleri, KDV beyannamesi ve alış/satış vergi defterleri (bu sistem haricinde yapılacak)
- E-ticaret/Müşteri Portalı
- Mobil Uygulama (ilk aşamada)

### 1.3 Hedef Kullanıcılar
- **Yönetici/Administrator:** Sistemin tüm fonksiyonlarına erişim
- **Depo Sorumlusu:** Stok giriş/çıkış, üretim işlemleri
- **Satış Sorumlusu:** Satış takibi, müşteri yönetimi

---

## 2. İş Süreçleri

### 2.1 Temel İş Akışı

```
[Tedarikçiler] 
      ↓ (100 kg hammadde satın alma)
[Hammadde Stoku - Giriş Lotu: Supplier-A, Tarih: X, Miktar: 100 kg]
      ↓ (FEFO+FIFO hibrit lot seçimiyle üretim emri)
[Üretim] 
      ↓ (1 kg'lık mamul üretimi, yeni lot oluşturma)
[Mamul Stoku - Lot: PROD-001, Kaynak: Lot-Supplier-A, Tarih: Y, Miktar: 100 adet]
      ↓ (Perakende satış)
[Müşteri] → [Satış Kaydı - Ürün, Lot, Miktar, Tarih]
```

### 2.2 Tedarik Süreci
1. Tedarikçiden hammadde siparişi verilir
2. Hammadde teslim alınır → Hammadde stoka girer (lot bilgisiyle)
3. Lot bilgisi: Tedarikçi, Tarih, Miktar, Birim Fiyat, Kalite Notu

### 2.3 Üretim Süreci
1. Mamul üretim emri oluşturulur
2. Hammadde lotu FEFO+FIFO hibrit kuralına göre seçilir
3. Dönüşüm kaydı: Hammadde lotu → Mamul lotu
4. Mamul lotu oluşturulur: Üretim Tarihi, Son Kullanma, Kaynak Lot
5. Mamul stoka girer

### 2.4 Satış Süreci
1. Müşteri siparişi kaydedilir
2. FEFO+FIFO hibrit kuralına göre uygun lot seçilir
3. Satış kaydı oluşturulur
4. Stok çıkışı yapılır

### 2.5 İzlenebilirlik Zinciri
Herhangi bir sorun olduğunda (kalite, sağlık vb.) sistem şunları sağlayabilmeli:
- Sorunlu ürünün hangi lotta olduğu
- O lotun hangi hammadde lotundan üretildiği
- Hammadde lotunun hangi tedarikçiden geldiği
- O tedarikçinin geçmiş performansı

### 2.6 İade ve İade Süreci
**İade Nedenleri:**
| Neden | Açıklama | Stok İşlemi |
|-------|----------|-------------|
| Kalite Sorunu | Ürün kalitesi uygun değil | Mamul stoğuna iade |
| Yanlış Ürün | Sipariş edilen ürün farklı geldi | Mamul stoğuna iade |
| Miktar Farkı | Sipariş edilen miktar farklı | Stok düzeltmesi |
| Müşteri İsteği | Müşteri ürünü iade etmek istiyor | Mamul stoğuna iade |

**İade Süreci:**
1. İade kaydı oluşturulur (satış kaydına bağlı)
2. İade nedeni ve durumu belirlenir
3. Ürün kontrol edilir (kalite kontrol)
4. Uygun lot seçilir (varsa aynı lot, yoksa FEFO+FIFO hibrit sıra)
5. Stok girişi yapılır
6. İade raporları güncellenir
7. Gerekirse tedarikçi bilgilendirmesi

**İade Kuralları:**
- Satış tarihinden itibaren 14 gün içinde iade
- Kalite sorunu olan ürünler için 30 gün
- İade edilen ürünler ayrı lotta izlenir
- Fire oluşursa fire oranı kaydedilir

### 2.7 Stok Düzeltme Süreci
**Düzeltme Nedenleri:**
| Neden | Açıklama |
|-------|----------|
| Sayım Farkı | Fiziksel sayım ile sistem farkı |
| Fire/Zarar | Üretim sırasında oluşan fire |
| Çalışma | Hırsızlık veya kayıp |
| Birim Değişikliği | Ölçü birimi değişikliği |

**Düzeltme Süreci:**
1. Düzeltme talebi oluşturulur
2. Düzeltme nedeni seçilir
3. Miktar ve lot bilgisi girilir
4. Yönetici onayı alınır (kritik düzeltmeler için)
5. Stok güncellenir
6. Denetim kaydı oluşturulur

**Düzeltme Kuralları:**
- Pozitif ve negatif düzeltme yapılabilir
- Kritik düzeltmeler (+/- %10 üzeri) yönetici onayı gerektirir
- Tüm düzeltmeler denetim günlüğüne kaydedilir
- Düzeltme nedeni zorunlu alandır

### 2.8 Tedarikçi Değerlendirme Süreci
**Değerlendirme Kriterleri:**
| Kriter | Ağırlık | Açıklama |
|--------|---------|----------|
| Kalite Puanı | %40 | Gelen ürünlerin kalite kontrol puanı |
| Teslimat Puanı | %30 | Zamanında teslimat yüzdesi |
| Fiyat Puanı | %20 | Piyasa fiyatlarına göre rekabetçilik |
| Hizmet Puanı | %10 | İletişim, esneklik, çözüm odaklılık |

**Değerlendirme Süreci:**
1. Her teslimat sonrası otomatik puanlama
2. Manuel değerlendirme (kalite kontrol sonucu)
3. Aylık/çeyreklik rapor hazırlama
4. Düşük performans uyarısı
5. Ödül veya uyarı sistemi uygulama

**Otomatik Uyarılar:**
- Kalite puanı < 3.0: Orta risk uyarısı
- Ardışık 3 sorunlu teslimat: Yüksek risk uyarısı
- Kalite puanı < 2.0: Tedarikçi askıya alma önerisi

---

## 3. Fonksiyonel Gereksinimler

### 3.1 Tedarikçi Yönetimi

#### 3.1.1 Tedarikçi Kaydı
| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| tedarikci_id | UUID | ✓ | Benzersiz tanımlayıcı |
| ad | String | ✓ | Tedarikçi adı |
| vergi_no | String | ✓ | Vergi numarası |
| telefon | String | ✓ | İletişim telefonu |
| eposta | String | ✓ | E-posta adresi |
| adres | Text | ✓ | Detaylı adres |
| faks | VARCHAR(20) | Hayır | Faks numarası |
| yetkili_kisi | VARCHAR(255) | Hayır | İlgili kişi adı soyadı |
| yetkili_telefon | VARCHAR(20) | Hayır | İlgili kişi telefonu |
| yetkili_eposta | VARCHAR(255) | Hayır | İlgili kişi e-posta |
| banka_adi | VARCHAR(100) | Hayır | Banka adı |
| banka_sube | VARCHAR(100) | Hayır | Şube adı |
| hesap_no | VARCHAR(50) | Hayır | IBAN/hesap numarası |

| tedarikci_sinifi | ENUM('A','B','C') | Hayır | Sınıflandırma |
| not | TEXT | Hayır | Özel notlar |
| aktif | Boolean | ✓ | Aktif/Pasif durum |
| olusturan_kullanici_id | UUID | ✓ | Oluşturan kullanıcı |
| olusturma_tarihi | DateTime | ✓ | Oluşturma tarihi |
| guncelleme_tarihi | DateTime | Hayır | Son güncelleme |
| silme_tarihi | DateTime | Hayır | Silme tarihi (soft delete) |

### 3.1.2 Tedarikçi Ürün İlişkisi
- Her tedarikçi birden fazla ürün tedarik edebilir
- Her ürün birden fazla tedarikçiden alınabilir
- Tedarikçi-ürün bazında varsayılan fiyat tanımlanabilir

#### 3.1.3 Tedarikçi Performans Takibi
| Metrik | Açıklama |
|--------|----------|
| Kalite Puanı | Ürün kalitesi üzerinden 1-5 arası puan |
| Zamanında Teslimat % | Siparişlerin zamanında teslim oranı |
| Toplam Sipariş | Geçmiş sipariş sayısı |
| Toplam Sorun | Kalite/teslimat sorunu sayısı |
| Son Değerlendirme | En son kalite değerlendirmesi tarihi |

**Otomatik Uyarı Sistemi:**
- Kalite puanı 3'ün altına düşünce uyarı
- Ardışık 3 sorunlu siparişte uyarı
- Tedarikçi performans raporu görüntüleme

#### 3.1.4 Tedarikçi Ödül/Uyarı Sistemi
- **Ödüllendirme Kriterleri:**
  - 6 ay boyunca kalite puanı ≥ 4.5
  - Sıfır sorunlu sipariş
  - Zamanında teslimat %95+
- **Uyarı Kriterleri:**
  - Kalite puanı ≤ 2.5
  - 3+ sorunlu sipariş 30 gün içinde
  - Tedarikçi geçici olarak askıya alınabilir

#### 3.1.5 Tedarikçi Değerlendirme
| Alan | Tip | Açıklama |
|------|-----|----------|
| degerlendirme_id | UUID | Benzersiz tanımlayıcı |
| tedarikci_id | UUID | Tedarikçi referansı |
| degerlendirme_tarihi | DATE | Değerlendirme tarihi |
| fiyat_puani | DECIMAL(3,2) | Fiyat değerlendirmesi (1-5) (P2) |
| hizmet_puani | DECIMAL(3,2) | Hizmet değerlendirmesi (1-5) (P2) |
| genel_puan | DECIMAL(3,2) | Genel performans puanı (P2) |

| sertifikalar | JSONB | Kalite sertifikaları (ISO, organik vb.) (P2) |
| resmi_dosyalar | JSONB | Ticaret sicil, vergi levhası vb. (P2) |
| olusturma_tarihi | TIMESTAMP | Oluşturma zamanı |
| olusturan_kullanici_id | UUID | Kaydı oluşturan kullanıcı (P0) |

### 3.2 Ürün Yönetimi

#### 3.2.1 Ürün Kataloğu
| Alan | Tip | Açıklama |
|------|-----|----------|
| urun_id | UUID | Benzersiz tanımlayıcı |
| ad | String | Ürün adı (örn: Kayısı, Üzüm, Bal) |
| kategori | Enum | MEYVE, BAL, KARSIM, KURUYEMIS, SEBZE, KURU_BAKLIYAT, YAG, TURSU, DIGER | Ürün kategorisi (P2) |
| birim_toptan | Enum | kg, ton |
| birim_perakende | Enum | kg, gram, adet, paket |
| aktif | Boolean | Aktif/Pasif durum |
| stok_kodu | VARCHAR(50) | SKU (Stock Keeping Unit) numarası (P0) |
| hammadde_id | UUID | Mamul ürünün temel ham madde ürünü; yalnızca MAMUL için, FK → urunler (P0) |
| barkod | VARCHAR(50) | Ürün barkod numarası (EAN-13, UPC vb.) (P0) |
| aciklama | TEXT | Ürün hakkında detaylı açıklama (P1) |
| gorsel_url | VARCHAR(500) | Ürün fotoğrafı URL (P1) |
| agirlik | DECIMAL(10,3) | Paket ağırlığı (gram) (P2) |
| hacim | DECIMAL(10,3) | Paket hacmi (cm³) (P2) |
| minimum_stok_seviyesi | DECIMAL(15,3) | Minimum stok uyarı seviyesi (P2) |
| maksimum_stok_seviyesi | DECIMAL(15,3) | Maksimum stok limiti (P2) |
| raf_omru_gun | INTEGER | Gün cinsinden raf ömrü (P2) |
| olusturan_kullanici_id | UUID | Kaydı oluşturan kullanıcı (P0) |

##### 3.2.1.1 Otomatik Stok Kodu ve Mamul-Hammadde İlişkisi
- Stok kodu biçimi `{KATEGORI_PREFIX}-{URUN_KISALTMASI}-{BOYUT}` olmalıdır (örn. `BAL-CIC-500G`, `MEY-INC-500G`).
- Kod üretiminde Türkçe karakterler ASCII büyük harflere dönüştürülür ve kullanıcıya kaydetmeden önce canlı önizleme gösterilir.
- Mamul ürün oluşturulurken `hammadde_id` zorunludur; stok kodu prefix'i mamulün bağlı olduğu ham maddenin kategorisinden türetilir.
- Sistem, mamul seçimi için MAMUL olmayan aktif ürünleri listeleyen bir servis sunmalıdır.

#### 3.2.2 Ürün Fotoğraf Desteği
- Her ürün için birden fazla fotoğraf yüklenebilir
- Fotoğraflar lot bazlı saklanır (lot_id ile ilişkili)
- Fotoğraf metadata: çekim tarihi, not, boyut (KB)
- Desteklenen formatlar: JPG, PNG, WEBP
- Maksimum dosya boyutu: 5MB
- Küçük resim (thumbnail) otomatik oluşturulur

#### 3.2.3 Ürün Özellikleri (Nitelikler) Sistemi
Sistem, ürün kategorilerine göre özelleştirilebilir alanlar tanımlanmasına izin verir.

##### Ön Tanımlı Özellik Kategorileri

**Kurutulmuş Meyveler İçin:**
| Özellik | Tip | Zorunlu | Açıklama |
|---------|-----|---------|----------|
| Renk | Enum/Metin | Hayır | Açık sarı, koyu sarı, turuncu, kahverengi |
| Boyut | Enum/Metin | Hayır | Küçük, orta, büyük, jumbo |
| Parça Büyüklüğü | Metin | Hayır | Örn: 3-5mm, 5-8mm |
| Nem Oranı | Sayı (%) | Hayır | %5-15 arası |
| Asitlik | Sayı | Hayır | pH değeri |
| Kükürtlü mü? | Boolean | Hayır | Evet/Hayır |
| Şeker Oranı | Sayı (%) | Hayır | Brix değeri |

**Bal İçin:**
| Özellik | Tip | Zorunlu | Açıklama |
|---------|-----|---------|----------|
| Renk | Enum/Metin | Hayır | Açık sarı, koyu amber, kristal beyaz, kahverengi |
| Kristalizasyon | Enum | Hayır | Kristalize, sıvı, kremamsı |
| Köken | Metin | Hayır | Çiçek, çam, kekik, karakovan |
| pH Değeri | Sayı | Hayır | 3.5-4.5 arası |
| Nem Oranı | Sayı (%) | Hayır | %18 altı ideal |
| Diastaz Sayısı | Sayı | Hayır | Güç birimi |
| HMF Değeri | Sayı | Hayır | (hidroksimetilfurfural) |

##### Özellik Yönetimi
| Alan | Tip | Açıklama |
|------|-----|----------|
| ozellik_id | UUID | Benzersiz tanımlayıcı |
| kategori | Enum | Meyve, Bal, Karışım, Tümü |
| alan_adi | String | Veritabanı alan adı (örn: renk, boyut) |
| goruntu_adı | String | Kullanıcıya gösterilecek ad (örn: "Renk") |
| tip | Enum | Metin, Sayı, Enum, Boolean, Tarih |
| zorunlu | Boolean | Stok girişinde zorunlu mu? |
| etikette_goster | Boolean | Etikette gösterilsin mi? |
| etikette_zorunlu | Boolean | Etikette zorunlu mu? |
| siralama | Integer | Form/etiket sırası |
| varsayilan_deger | String | Varsayılan değer |
| enum_degerleri | JSON | Enum tipi için seçenek listesi |

##### Özellik Görünürlük Ayarları
Her özelliğin nerelerde görüneceği yapılandırılabilir:
| Görünüm Yeri | Açıklama |
|--------------|----------|
| Stok Listesi | Stok hareketleri listesinde |
| Stok Detay Formu | Stok kartı detay ekranında |
| Üretim Formu | Üretim emri formunda |
| Satış Formu | Satış kaydı formunda |
| Raporlar | Rapor çıktılarında |
| Etiket | Baskı etiketinde |
| Dashboard | Özet görünümlerde |

#### 3.2.4 Lot Özellik Kaydı
| Alan | Tip | Açıklama |
|------|-----|----------|
| lot_ozellik_id | UUID | Benzersiz tanımlayıcı |
| lot_id | UUID | Lot referansı |
| ozellik_id | UUID | Özellik referansı |
| deger | String | Girilen değer |
| birim | String | Birim (varsa) |

#### 3.2.5 Lot Fotoğraf Kaydı
| Alan | Tip | Açıklama |
|------|-----|----------|
| foto_id | UUID | Benzersiz tanımlayıcı |
| lot_id | UUID | Lot referansı |
| foto_url | String | Fotoğraf dosya yolu |
| thumbnail_url | String | Küçük resim yolu |
| foto_tarihi | DateTime | Fotoğraf çekim tarihi |
| not | String | Fotoğraf notu |

#### 3.2.6 Dönüşüm Oranları Tanımlama
Bu bölümdeki kayıtlar kanonik `urun_donusum` tablosunda mamul-hammadde reçetesi/dönüşüm tanımı olarak tutulur. Operasyon sırasında fiilen tüketilen ürün, lot ve miktarın tek doğru kaynağı `uretim_detay`; `urunler.hammadde_id` ise mamulün varsayılan temel hammaddesidir. Reçete, varsayılan veya operasyonel kayıt birbirinin yerine kullanılmaz.

| Alan | Tip | Açıklama |
|------|-----|----------|
| urun_id | UUID | Mamul ürün referansı |
| hammadde_id | UUID | Hammadde referansı |
| donusum_orani | Decimal | 1 birim mamul için gerekli hammadde (örn: 1.05 kg kaysı → 1 kg kurutulmuş kayısı) |
| fire_orani | Decimal | Beklenen fire yüzdesi |
| birim | VARCHAR(20) | Hangi birimle ifade edildiği (kg, ton vb.) (P2) |
| baslangic_tarihi | DATE | Dönüşüm oranının geçerli olduğu başlangıç (P2) |
| bitis_tarihi | DATE | Dönüşüm oranının geçerli olduğu bitiş (P2) |
| aciklama | TEXT | Açıklama veya not (P2) |

#### 3.2.7 Ürün-Tedarikçi Fiyatları
- Her ürün-tedarikçi kombinasyonu için ayrı fiyat
- Fiyat geçmişi saklanmalı

### 3.3 Müşteri Yönetimi

#### 3.3.1 Müşteri Kaydı
| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| musteri_id | UUID | ✓ | Benzersiz tanımlayıcı |
| ad | String | ✓ | Müşteri adı/firma adı |
| musteri_tipi | ENUM('BIREYSEL','KURUMSAL') | ✓ | Müşteri türü |
| telefon | String | ✓ | İletişim telefonu |
| eposta | String | Hayır | E-posta adresi |
| adres | Text | ✓ | Müşteri ana/teslimat adresi; fatura adresi değildir |
| vergi_no | String | Hayır | Vergi numarası (firma ise) |
| tc_kimlik | VARCHAR(11) | Hayır | TC Kimlik numarası (bireysel) |
| faks | VARCHAR(20) | Hayır | Faks numarası |
| teslimat_adresi | TEXT | Hayır | İşlem bazında kullanılabilecek alternatif teslimat adresi |
| il | VARCHAR(50) | Hayır | İl |
| ilce | VARCHAR(50) | Hayır | İlçe |
| posta_kodu | VARCHAR(10) | Hayır | Posta kodu |
| musteri_sinifi | ENUM('A','B','C') | Hayır | Müşteri sınıfı |

| satis_temsilcisi_id | UUID | Hayır | Sorumlu satış temsilcisi |
| dogum_tarihi | DATE | Hayır | Doğum tarihi (bireysel) |
| cinsiyet | ENUM('E','K','D') | Hayır | Cinsiyet |
| not | Text | Hayır | Özel notlar |
| aktif | Boolean | ✓ | Aktif/Pasif durum |
| olusturan_kullanici_id | UUID | ✓ | Oluşturan kullanıcı |
| olusturma_tarihi | DateTime | ✓ | Oluşturma tarihi |
| guncelleme_tarihi | DateTime | Hayır | Son güncelleme |
| silme_tarihi | DateTime | Hayır | Silme tarihi (soft delete) |

### 3.4 Stok/Envanter Yönetimi

#### 3.4.1 Stok Tipleri
1. **Hammadde Stoku:** Tedarikçiden alınan işlenmemiş/ham ürünler
2. **Mamul Stoku:** Satışa hazır paketlenmiş ürünler

#### 3.4.2 Stok Kartı
| Alan | Tip | Açıklama |
|------|-----|----------|
| stok_id | UUID | Benzersiz tanımlayıcı |
| urun_id | UUID | Ürün referansı |
| lot_no | String | Lot/parti numarası |
| tedarikci_id | UUID | Kaynak tedarikçi (hammadde ise) |
| uretim_tarihi | Date | Üretim tarihi |
| son_kullanma | Date | Son kullanma tarihi |
| giris_tarihi | DateTime | Stoka giriş tarihi |
| miktar | Decimal | Mevcut miktar |
| birim | Enum | kg, adet, paket |
| birim_fiyat | Decimal | Birim maliyet |
| konum | String | Depo konumu (opsiyonel) |
| durum | ENUM('AKTIF','BITTI','IPTAL','KALITE_KONTROL','DEPO_DISI','RET','SON_KULLANIM_GECDI','SON_KULLANIM_RISKLI','SON_KULLANIM_ISLEM_GECICI') | Stok durumu (P2) |
| kalite_notu | INTEGER (1-5) | Giriş kalite kontrol puanı (P0) |
| kalite_kontrol_tarihi | TIMESTAMP | Kalite kontrol yapılma tarihi (P1) |
| kalite_kontrol_edildi | BOOLEAN | Kalite kontrolü yapıldı mı? (P0) |
| depo | VARCHAR(50) | Depo adı (A deposu, B deposu vb.) (P2) |
| raf | VARCHAR(50) | Raf numarası (P2) |
| blok | VARCHAR(50) | Depo içi blok/bölge (P2) |
| agirlik_birim | VARCHAR(20) | Ağırlık birimi (brüt, net) (P2) |
| brut_miktar | DECIMAL(15,3) | Brüt miktar (ambalaj dahil) (P2) |
| net_miktar | DECIMAL(15,3) | Net miktar (ürün sadece) (P2) |
| palet_no | VARCHAR(50) | Palet numarası (varsa) (P2) |
| giris_referans_no | VARCHAR(100) | Tedarikçi irsaliyesi veya harici teslimat belgesi referansı; fatura değildir (P2) |
| musteri_id | UUID | Satış çıkışı sonrası hangi müşteriye satıldı (izlenebilirlik için) (P2) |
| satis_hareket_id | UUID | Satış hareketi referansı (izlenebilirlik için) (P2) |
| olusturan_kullanici_id | UUID | Kaydı oluşturan kullanıcı (P0) |

#### 3.4.3 FEFO/FIFO Yönetimi
Sistem, stok çıkışlarında **FEFO (First Expiry, First Out)** ve **FIFO (First In, First Out)** kurallarını hibrit olarak uygular. Aşağıda öncelik sırası belirlenmiştir:

**Öncelik Sırası:**
1. **SON_KULLANIM_GECDI** — Son kullanma tarihi geçmiş lotlar otomatik olarak bloke edilir, çıkış yapılamaz
2. **SON_KULLANIM_RISKLI** — Son kullanma tarihi yaklaşan lotlar (≤ `SKT_UYARI_GUN`) FEFO kuralıyla öncelikli olarak çıkar
3. **Normal Stok (AKTIF)** — Son kullanma tarihi normal aralıkta olan lotlar FIFO kuralıyla (stoka giriş sırasına göre) çıkar

**FEFO ve FIFO Açıklaması:**
- **FEFO (First Expiry, First Out):** Önce son kullanma tarihi en yakın olan lot çıkar. Gıda güvenliği için kritik öneme sahiptir.
- **FIFO (First In, First Out):** Önce stoka en erken giriş yapan lot çıkar. Genel stok yönetimi için uygulanır.

**FIFO İhlali:**
- Normal stok çıkışlarında FIFO kuralı uygulanır
- FIFO ihlali durumunda sistem uyarı gösterir ve açıklama gerektirir
- Yönetici onayı ile FIFO ihlaline izin verilebilir
- İhlal kaydı denetim günlüğüne kaydedilir

**FEFO Önceliği:**
- Son kullanma tarihi yaklaşan lotlar (SON_KULLANIM_RISKLI), normal FIFO sırasından bağımsız olarak önce çıkarılır
- SKT uyarı gün eşiği sistem ayarlarından yapılandırılabilir
- Bu hibrit seçim kuralı satış, üretim tüketimi, transfer, toplu ve manuel çıkış dahil **tüm stok çıkış/tüketimlerinde** aynı servis üzerinden zorunlu uygulanır.
- İhlalde maker-checker uygulanır: `DEPO_SORUMLUSU` gerekçeli talep oluşturur; talebi oluşturan kişi onaylayamaz; `YONETICI` onaylar veya reddeder. Kritik SKT ihlallerini yalnızca `ADMIN` onaylayabilir.

#### 3.4.4 Stok Hareketleri
| Alan | Tip | Açıklama |
|------|-----|----------|
| hareket_id | UUID | Benzersiz tanımlayıcı |
| stok_id | UUID | Stok/Lot referansı |
| lot_no | VARCHAR(50) | Lot numarası (P2) |
| hareket_tipi | Enum | GIRIS, URETIM_GIRIS, URETIM_CIKIS, SATIS_CIKIS, IADE, DUZELTME, TRANSFER, SON_KULLANIM_CIKIS |
| miktar | DECIMAL(15,3) | Hareket miktarı |
| birim_fiyat | DECIMAL(15,4) | Birim fiyat |
| tutar | DECIMAL(15,4) | Toplam tutar |
| onceki_miktar | DECIMAL(15,3) | Hareket öncesi miktar |
| sonraki_miktar | DECIMAL(15,3) | Hareket sonrası miktar |
| referans_id | UUID | Referans kaynak ID |
| referans_tipi | String | Referans kaynak tipi |
| aciklama | TEXT | Açıklama |
| karsi_stok_id | UUID | Transfer işlemlerinde karşı lot (nereye gittiği) (P1) |
| fifo_ihlal_edildi | BOOLEAN | FIFO kuralı ihlal edildi mi? (P2) |
| fifo_ihlal_nedeni | TEXT | FIFO ihlal nedeni (manuel onay vb.) (P2) |
| musteri_id | UUID | Satış hareketlerinde müşteri referansı (P2) |
| tedarikci_id | UUID | Giriş hareketlerinde tedarikçi referansı (P2) |
| olusturma_tarihi | TIMESTAMP | Oluşturma zamanı |
| olusturan_kullanici_id | UUID | Kaydı oluşturan kullanıcı (P0) |

#### 3.4.5 Kalite Kontrol Workflow
Sisteme giren tüm hammaddeler ve üretilen mamuller, stok durumuna geçmeden önce kalite kontrol sürecinden geçer. Bu süreç, ürün kalitesinin tutarlılığını sağlamak ve sorunlu lotların sisteme girişini engellemek amacıyla zorunlu olarak uygulanır.

##### 3.4.5.1 Kalite Kontrol Süreci Adımları
|| Adım | Aşama | Sorumlu | Açıklama |
|------|-------|--------|----------|
| 1 | Numune Alma | Giriş | Depo Sorumlusu | Teslim alınan üründen numune alınır |
| 2 | Fiziksel Kontrol | Kontrol | Kalite Kontrol | Görsel, boyut, renk kontrolü yapılır |
| 3 | Laboratuvar Testi | Test | Kalite Kontrol | Gerekli durumlarda laboratuvar analizi |
| 4 | Puanlama | Değerlendirme | Kalite Kontrol | 1-5 arası kalite puanı verilir |
| 5 | Onay/Red | Karar | Yönetici | Kalite onayı verilir veya ürün reddedilir |
| 6 | Stok Kaydı | Kayıt | Depo Sorumlusu | Onaylanan ürün stoka girer |

##### 3.4.5.2 Kalite Kontrol Kriterleri
**Hammadde İçin:**
|| Kriter | Alt Limit | Üst Limit | Ağırlık |
|------|--------|----------|----------|--------|
| Nem Oranı (%) | Ürüne göre değişir | - | Belirtilen max | %25 |
| Renk Skoru | 1-5 | 3 | - | %20 |
| Boyut Dağılımı | % uygun | - | Belirtilen max | %20 |
| Koku/Tat | Normal olmalı | - | - | %15 |
| Paket Durumu | Hasarsız | - | - | %10 |
| Diğer | Ürüne özel | - | - | %10 |

**Mamul İçin:**
|| Kriter | Alt Limit | Üst Limit | Ağırlık |
|------|--------|----------|----------|--------|
| Ağırlık (net) | Belirtilen min | Belirtilen max | %30 |
| Görünüm | Normal | - | %25 |
| Ambalaj | Sağlam | - | %20 |
| Etiket | Doğru ve okunabilir | - | %15 |
| Son Kullanma | >= 30 gün | - | %10 |

##### 3.4.5.3 Kalite Kontrol Kaydı
|| Alan | Tip | Açıklama |
|------|-----|------|----------|
| kalite_kontrol_id | UUID | Benzersiz tanımlayıcı |
| lot_id | UUID | Kontrol edilen lot referansı |
| kontrol_tipi | ENUM('HAMMADDE','MAMUL','IADE') | Kontrol türü |
| kontrol_tarihi | TIMESTAMP | Kontrol tarihi |
| kontrol_eden_id | UUID | Kontrol eden kullanıcı |
| kalite_puani | INTEGER (1-5) | Genel kalite puanı |
| fiziksel_puan | INTEGER (1-5) | Fiziksel görünüm puanı |
| laboratuvar_puan | INTEGER (1-5) | Laboratuvar test puanı (varsa) |
| durum | ENUM('BEKLIYOR','KONTROL_EDILIYOR','KABUL','KISMEN_KABUL','RET') | Kontrol iş akışı durumu/sonucu |
| ret_nedeni | TEXT | Red durumunda ret nedeni |
| not | TEXT | Ek notlar |
| olusturma_tarihi | TIMESTAMP | Oluşturma zamanı |

##### 3.4.5.4 Koşullu Onay (Kısmi Red)
- Kalite puanı 3.0 - 3.9 arasında ise `KISMEN_KABUL` kararı verilebilir
- Kısmen kabul edilen lotlar, satışa uygun durumda işaretlenir ancak düşük fiyatlandırma yapılabilir
- Kısmen kabul edilen lotlar raporlarda ayrı görünür
- `KISMEN_KABUL`, yönetici onayı gerektirir

##### 3.4.5.5 Kalite Kontrol Raporing
- Günlük/haftalık/aylık kalite kontrol özeti
- Tedarikçi bazlı kalite performansı
- Ret oranı trend analizi
- En sık karşılaşılan kalite sorunları


#### 3.4.6 FEFO/FIFO Öncelik Detayları
Sistem, stok çıkışlarında FEFO (First Expiry, First Out) ve FIFO (First In, First Out) kurallarını hibrit olarak uygular. Aşağıda lot seçim algoritması detaylandırılmıştır.

##### 3.4.6.1 Lot Seçim Sırası
Stok çıkışında (satış veya üretim) lot seçim sırası aşağıdaki öncelik kurallarına göre belirlenir:

1. **SON_KULLANIM_GECDI (Bloke)** — Son kullanma tarihi geçmiş lotlar çıkış için seçilemez. Otomatik olarak `SON_KULLANIM_GECDI` durumuna geçer.
2. **SON_KULLANIM_RISKLI (FEFO Öncelikli)** — Son kullanma tarihi SKT uyarı eşiği (varsayılan: 30 gün) içinde olan lotlar FEFO kuralıyla en yakın SKT'li lot önce çıkar.
3. **AKTIF (FIFO Öncelikli)** — Normal stok durumundaki lotlar FIFO kuralıyla stoka giriş sırasına göre çıkar.

##### 3.4.6.2 Lot Seçim Algoritması (SQL)
```sql
WITH uygun_lotlar AS (
    SELECT
        sk.stok_id,
        sk.lot_no,
        sk.miktar,
        sk.son_kullanma,
        sk.giris_tarihi,
        sk.durum,
        CASE
            WHEN sk.durum = 'SON_KULLANIM_RISKLI' THEN 1
            WHEN sk.durum = 'AKTIF' THEN 2
            ELSE 99
        END AS oncelik_grubu
    FROM stok_karti sk
    WHERE sk.urun_id = :urun_id
      AND sk.durum NOT IN ('SON_KULLANIM_GECDI', 'BITTI', 'IPTAL', 'DEPO_DISI', 'RET')
      AND sk.miktar > 0
)
SELECT *
FROM uygun_lotlar
ORDER BY oncelik_grubu ASC,
         CASE WHEN oncelik_grubu = 1 THEN son_kullanma END ASC,
         CASE WHEN oncelik_grubu = 2 THEN giris_tarihi END ASC;
```

##### 3.4.6.3 SKT Eşik Değeri
- Son kullanma uyarı eşiği `sistem_ayarlari.ayar_adi = 'SKT_UYARI_GUN'` ile yapılandırılır (varsayılan: 30 gün)
- SKT'si bu eşiğe eşit veya düşük lotlar otomatik olarak `SON_KULLANIM_RISKLI` durumuna geçer

#### 3.4.7 Son Kullanma Tarihi (SKT) Yönetimi
Sistem, son kullanma tarihi geçmiş ve yaklaşan lotları otomatik olarak izler ve işler.

##### 3.4.7.1 SKT Durum Değerleri
|| Durum | Açıklama | Otomatik Tetiklenir mi? |
|--------|---------|------------------------|
| `SON_KULLANIM_GECDI` | Son kullanma tarihi geçmiş lot | ✓ (scheduled job) |
| `SON_KULLANIM_RISKLI` | Son kullanma uyarı eşiğine yaklaşmış (≤ `SKT_UYARI_GUN` gün) | ✓ (scheduled job) |
| `SON_KULLANIM_ISLEM_GECICI` | Geçmiş lot için işlem bekleniyor (imha/indirim/devir) | ✗ (manuel) |

##### 3.4.7.2 SKT Kontrol İş Akışı
```
SCHEDULED JOB: skt_kontrol_job (her 24 saat, 02:00'de)
Cron: 0 2 * * *
    │
    ▼
Günlük SKT kontrolü başlar
(son_kullanma < CURRENT_DATE) → SON_KULLANIM_GECDI
(son_kullanma <= CURRENT_DATE + SKT_UYARI_GUN) → SON_KULLANIM_RISKLI
    │
    ├── Geçmiş lot bulundu → durum değişikliği + bildirim gönderilir
    │
    └── Riskli lot bulundu → uyarı oluşturulur, stok durumu değişmez
```

##### 3.4.7.3 Geçmiş Lot İşlemleri
`DEPO_SORUMLUSU`, `SON_KULLANIM_GECDI` durumundaki lot için gerekçeli işlem talebi oluşturur; farklı bir `YONETICI` maker-checker ilkesiyle onaylar veya reddeder. Kritik SKT ihlalinde onay yetkisi yalnızca `ADMIN` rolündedir. Talep sahibi kendi talebini onaylayamaz.
- **İmha Et** → `SON_KULLANIM_GECDI` olarak işaretlenir, `stok_karti.miktar = 0`, fire kaydı oluşur
- **İndirimli Satış** → %X indirimli satış onayı gerekir
- **Depodan Çıkar** → `DEPO_DISI` durumu + manuel açıklama
- **Devir** → Başka ürüne/devlete devir kaydı

#### 3.4.8 Stok Düzeltme Onay Workflow
Kritik stok düzeltmeleri yönetici onayı gerektirir. İki aşamalı commit modeli uygulanır: düzeltme oluşturulur ama onaylanmadıkça stok güncellenmez.

##### 3.4.8.1 Durum Makinesi
| Durum | Açıklama |
|-------|----------|
| `OLUSTURULDU` | Düzeltme talebi açıldı, stok henüz güncellenmedi |
| `BEKLEMEDE_ONAY` | Admin onayı bekliyor (kritik düzeltmeler için) |
| `ONAYLANDI` | Onaylandı, stok güncelleniyor |
| `REDDEDILDI` | Reddedildi |
| `STOK_GUNCELLENDI` | Stok hareketi kaydı oluşturuldu |

##### 3.4.8.2 Onay Kriterleri
- Kritik düzeltme: `|miktar| / onceki_miktar * 100 > %10` → `BEKLEMEDE_ONAY` durumu
- Normal düzeltme: ≤ %10 → otomatik `ONAYLANDI`

##### 3.4.8.3 Onay Yetkileri
| Rol | Yetki |
|-----|-------|
| ADMIN | Tüm düzeltmeleri onaylama/reddetme |
| DEPO_SORUMLUSU | Normal düzeltmeler (otomatik onay) |

##### 3.4.8.4 Stok Düzeltme Kaydı
|| Alan | Tip | Açıklama |
|------|-----|----------|
| duzeltme_id | UUID | Benzersiz tanımlayıcı |
| stok_id | UUID | Stok kartı referansı |
| onceki_miktar | DECIMAL(15,3) | Düzeltme öncesi miktar |
| yeni_miktar | DECIMAL(15,3) | Düzeltme sonrası miktar |
| duzeltme_miktari | DECIMAL(15,3) | Fark (pozitif veya negatif) |
| duzeltme_nedeni | ENUM('SAYIM_FARKI','FIRE_ZARAR','CALISMA','BIRIM_DEGISIKLIGI','DIGER') | Düzeltme nedeni |
| duzeltme_aciklama | TEXT | Detaylı açıklama |
| durum | ENUM('OLUSTURULDU','BEKLEMEDE_ONAY','ONAYLANDI','REDDEDILDI','TAMAMLANDI','IPTAL_EDILDI') | İşlem durumu |
| olusturan_id | UUID | Düzeltmeyi talep eden kullanıcı |
| onay_leyen_id | UUID | Onaylayan kullanıcı |
| onay_tarihi | TIMESTAMP | Onay zamanı |
| ret_nedeni | TEXT | Reddetme gerekçesi |
| olusturma_tarihi | TIMESTAMP | Kayıt oluşturma zamanı |

#### 3.4.9 Birim Dönüşüm
Sistem, farklı ölçü birimleri arasında tutarlı dönüşüm sağlar.

##### 3.4.9.1 Birim Tanımları
|| Alan | Tip | Açıklama |
|------|-----|----------|
| birim_id | UUID | Benzersiz tanımlayıcı |
| ad | VARCHAR(50) | Birim adı (örn: Kilogram) |
| kisa_ad | VARCHAR(10) | Kısa ad (örn: kg) — unique |
| tip | ENUM('AGIRLIK','OLCEK','ONAYLI') | Birim tipi |
| temel_birim_mi | BOOLEAN | Bu birim tip için temel birim mi? |
| carpan_temele | DECIMAL(15,6) | Temel birime çevirme çarpanı |
| bolen_temele | DECIMAL(15,6) | Temel birimden çevirme böleni |

**Varsayılan Birimler:**
| Ad | Kısa Ad | Tip | Temel Birim | Çarpan |
|----|---------|-----|-------------|--------|
| Kilogram | kg | AGIRLIK | ✓ | — |
| Gram | g | AGIRLIK | ✗ | 1000 |
| Ton | ton | AGIRLIK | ✗ | 0.001 |
| Adet | adet | OLCEK | ✓ | — |
| Paket | paket | OLCEK | ✗ | 1 |

##### 3.4.9.2 Birim Dönüşüm Tablosu
|| Alan | Tip | Açıklama |
|------|-----|----------|
| donusum_id | UUID | Benzersiz tanımlayıcı |
| kaynak_birim_id | UUID | Kaynak birim referansı |
| hedef_birim_id | UUID | Hedef birim referansı |
| carpan | DECIMAL(15,6) | Kaynak → hedef çarpanı |
| bolen | DECIMAL(15,6) | Kaynak → hedef böleni |
| toptan_mi | BOOLEAN | Toptan dönüşüm mü? |
| perakende_mi | BOOLEAN | Perakende dönüşüm mü? |

##### 3.4.9.3 Dönüşüm Kuralları
- Stok hareketlerinde birim uyumsuzluğu denetlenir
- Hammadde → Mamul dönüşüm oranları ürün bazlı tanımlanır
- Dönüşüm validasyonu: kaynak ve hedef birim tipleri uyumlu olmalıdır (AGIRLIK ↔ AGIRLIK, OLCEK ↔ OLCEK)

#### 3.4.10 Bildirim Sistemi Detayı
Sistem, olay ve durum değişikliklerinde otomatik bildirimler gönderir.

##### 3.4.10.1 Bildirim Türleri ve Öncelik
|| Tür | Kod | Kanallar | Öncelik |
|-----|-----|-----|----------|---------|
| Stok Kritik | `STOK_KRITIK` | E-posta, SMS, Uygulama | Acil |
| Stok Düşük | `STOK_DUSUK` | Uygulama, E-posta | Yüksek |
| Son Kullanma Uyarısı | `LOT_SKT_TARIHI` | Uygulama, E-posta | Yüksek |
| Fire Oranı Uyarısı | `URETIM_FIRE` | Uygulama | Yüksek |
| Kalite Kontrol Gerekli | `KALITE_KONTROL_GEREKLI` | Uygulama, E-posta | Yüksek |
| FIFO İhlal Uyarısı | `FIFO_IHLAL` | Uygulama, E-posta | Normal |
| Depo Doluyor | `STOK_DEPO_DOLUYOR` | Uygulama | Yüksek |

| Sistem Yedekleme Başarılı | `SISTEM_YEDEKLEME_BASARILI` | E-posta | Normal |
| Güvenlik Uyarısı | `GUVENLIK_UYARI` | E-posta, SMS | Acil |

##### 3.4.10.2 Bildirim Öncelik Seviyeleri
| Seviye | Değer | SMS | Uygulama Anlık | E-posta Anlık |
|--------|-------|-----|----------------|---------------|
| Acil | 1 | ✓ | ✓ | ✓ |
| Kritik | 2 | ✓ | ✓ | ✓ |
| Yüksek | 3 | ✗ | ✓ | ✓ |
| Normal | 4 | ✗ | ✓ | ✗ |
| Bilgi | 5 | ✗ | ✗ | ✗ |

##### 3.4.10.3 Bildirim Şablonları
|| Şablon Kod | Başlık | İçerik Değişkenleri |
|-----------|---------|----------|
| `STOK_KRITIK` | "{urun_adi} stok kritik!" | urun_adi, miktar, esik |
| `LOT_SKT_TARIHI` | "{lot_no} lotunun son kullanma tarihi yaklaşıyor | lot_no, urun_adi, tarih |
| `KALITE_KONTROL_GEREKLI` | Yeni lot kalite kontrol bekliyor | lot_no, urun_adi |
| `FIFO_IHLAL` | FIFO kuralı ihlal edildi | lot_no, ihlal_nedeni |

#### 3.4.11 Depo Yönetimi
Sistem, fiziksel depo yapısını ve kapasite takibini yönetir.

##### 3.4.11.1 Depo Tanımları
|| Alan | Tip | Açıklama |
|------|-----|----------|
| depo_id | UUID | Benzersiz tanımlayıcı |
| kod | VARCHAR(20) | Depo kodu (örn: DEPO-A) — unique |
| ad | VARCHAR(100) | Depo adı |
| tip | ENUM('HAMMADDE','MAMUL','KARISIM','DEPO_DISI') | Depo türü |
| adres | TEXT | Depo adresi |
| kapasite_m2 | DECIMAL(10,2) | Depo alanı (m²) |
| kapasite_kg | DECIMAL(15,3) | Maksimum kapasite (kg) |
| sicaklik_kontrolu | BOOLEAN | Sıcaklık kontrolü var mı? |
| sicaklik_min/max | DECIMAL(5,2) | Min/max sıcaklık (°C) |
| nem_orani_min/max | INTEGER | Min/max nem (%) |
| varsayilan_kabul_deposu | BOOLEAN | Varsayılan kabul deposu mu? |
| varsayilan_sevk_deposu | BOOLEAN | Varsayılan sevk deposu mu? |

##### 3.4.11.2 Depo Blok/Bölge Tanımları
|| Alan | Tip | Açıklama |
|------|-----|----------|
| blok_id | UUID | Benzersiz tanımlayıcı |
| depo_id | UUID | Depo referansı |
| kod | VARCHAR(20) | Blok kodu (örn: A1, B2) |
| ad | VARCHAR(100) | Blok adı |
| tip | ENUM('STORAGE','PICKING','RECEIVING','SHIPPING','QUARANTINE','RETURN') | Blok türü |
| kat | INTEGER | Depo katı (0 = zemin) |
| kapasite_m2 | DECIMAL(10,2) | Blok alanı (m²) |

##### 3.4.11.3 Depo Transfer İş Akışı
```
Giriş Depo → Transfer Talebi → Yönetici Onayı → Çıkış İşlemi → Çıkış Depo → Teslim Alma
```

**Transfer Hareket Tipi:** `TRANSFER`
**API Ailesi:** `/api/v1/depo/transferler`
**Lot Seçimi:** Transfer çıkışında da FEFO+FIFO hibrit kuralı zorunludur.
**İlgili Alanlar:**
- `karsi_stok_id`: Transfer işlemlerinde karşı lot (nereye gittiği)

##### 3.4.11.4 Kapasite Uyarı Mekanizması
- Depo doluluk oranı > %80 → Yüksek öncelikli uyarı
- Depo doluluk oranı > %95 → Kritik uyarı
- Otomatik bildirim: `STOK_DEPO_DOLUYOR`

#### 3.4.12 Toplu İşlemler (Batch)
Sistem, büyük miktarda veri girişini hızlı ve güvenilir şekilde yapmayı sağlayan toplu işlem altyapısı sunar.

##### 3.4.12.1 Toplu İşlem Türleri
| İşlem Türü | Açıklama | Öncelik |
|------------|----------|---------|
| Stok Girişi (Hammadde) | CSV/Excel ile toplu hammadde stok girişi | P0 |
| Üretim Emri | CSV/Excel ile toplu üretim emri oluşturma | P0 |
| Müşteri Toplu Kayıt | CSV/Excel ile toplu müşteri ekleme | P1 |
| Tedarikçi Toplu Kayıt | CSV/Excel ile toplu tedarikçi ekleme | P1 |
| Stok Düzeltme | CSV/Excel ile toplu stok düzeltme (yönetici onaylı) | P1 |
| Toplu Etiket Baskı | Lot listesi ile toplu etiket PDF oluşturma | P2 |
| Satış Kaydı İhracı | Satış kayıtlarını CSV/Excel'e aktarma | P1 |

##### 3.4.12.2 Toplu İşlem Kaydı
|| Alan | Tip | Açıklama |
|------|-----|----------|
| islem_id | UUID | Benzersiz tanımlayıcı |
| islem_turu | ENUM('IMPORT','EXPORT') | İşlem türü |
| islem_alt_turu | VARCHAR(30) | Alt tür (STOK_GIRISI, URETIM_EMRI vb.) |
| durum | ENUM('BEKLEMEDE','VALIDATING','ISLENIYOR','TAMAMLANDI','HATALAR_VAR','IPTAL_EDİLDİ') | İşlem durumu |
| dosya_adi | VARCHAR(255) | Yüklenen dosyanın adı |
| dosya_yolu | VARCHAR(500) | Sunucudaki dosya yolu |
| dosya_boyutu | BIGINT | Byte cinsinden dosya boyutu |
| dosya_hash | VARCHAR(64) | SHA-256 hash |
| toplam_satir | INTEGER | Dosyadaki toplam satır sayısı |
| basarili_satir | INTEGER | Başarıyla işlenen satır sayısı |
| basarisiz_satir | INTEGER | Hatalı satır sayısı |
| sonuc_dosya_adi | VARCHAR(255) | Sonuç dosyası adı |
| baslama_zamani | TIMESTAMP | İşlemin başladığı zaman |
| bitis_zamani | TIMESTAMP | İşlemin bittiği zaman |
| olusturan_kullanici_id | UUID | İşlemi başlatan kullanıcı |
| onaylayan_kullanici_id | UUID | Onaylayan kullanıcı (STOK_DUZELTME için) |

##### 3.4.12.3 Import Validation
- Her satır için zorunlu alan kontrolü
- Referans bütünlüğü doğrulaması (tedarikçi_id, urun_id vb.)
- Birim dönüşüm validasyonu
- Hatalı satırlar ayrı raporlanır, başarılı satırlar işlenir
- Sonuç dosyası: başarılı ve hatalı satırların ayrıştırılmış hali

#### 3.4.13 Üretim Maliyet Hesaplama
Sistem, üretim maliyetlerini otomatik olarak hesaplar ve mamul lotlarına kaydeder.

##### 3.4.13.1 Maliyet Bileşenleri
| Bileşen | Açıklama | Hesaplama Yöntemi |
|---------|----------|------------------|
| Hammadde Maliyeti | Kullanılan hammadde bedeli | FEFO+FIFO hibrit kuralıyla tüketilen lot miktarı × lot birim fiyatı |
| İşçilik Maliyeti | Üretimde çalışan işçi süresi | Çalışma saati × saatlik ücret |
| Enerji/Gider | Üretimde tüketilen enerji, su, gaz | Fiili tüketim × birim fiyat |
| Fire Maliyeti | Üretim sırasında oluşan fire | Fire miktarı × birim maliyet |
| Genel Gider | Ortak üretim giderleri | Sabit dağılım anahtarı ile |

##### 3.4.13.2 Toplam Maliyet Formülü
```
Toplam Maliyet = Hammadde Maliyeti + İşçilik Maliyeti + Enerji/Gider + Fire Maliyeti + Genel Gider
Birim Maliyet = Toplam Maliyet / Üretilen Net Miktar
```

##### 3.4.13.3 Fire Maliyeti Stratejileri
| Strateji | Formül | Kullanım Senaryosu |
|----------|--------|-------------------|
| HAMMADDE_SON | Son lotun birim fiyatı | Standart — fire kaynağı son lot |
| HAMMADDE_ORTALAMA | Ağırlıklı ortalama birim fiyat | Çok lot kullanımı |
| HAMMADDE_ILK | İlk lotun birim fiyatı (FIFO'da ilk fire) | Fire ilk lotta oluşuyorsa |
| SIFIR | Fire maliyeti sıfır | Fire'ın üretken sayıldığı durum |

##### 3.4.13.4 Üretim Maliyet Kaydı
|| Alan | Tip | Açıklama |
|------|-----|----------|
| maliyet_id | UUID | Benzersiz tanımlayıcı |
| uretim_id | UUID | Üretim emri referansı |
| lot_no | VARCHAR(50) | Mamul lot numarası |
| hammadde_maliyeti | DECIMAL(15,4) | Toplam hammadde maliyeti |
| iscilik_maliyeti | DECIMAL(15,4) | Toplam işçilik maliyeti |
| enerji_maliyeti | DECIMAL(15,4) | Toplam enerji/gider |
| fire_maliyeti | DECIMAL(15,4) | Fire maliyeti |
| genel_gider | DECIMAL(15,4) | Dağıtılan genel gider |
| toplam_maliyet | DECIMAL(15,4) | Toplam üretim maliyeti |
| birim_maliyet | DECIMAL(15,4) | Birim (kg/adet) başına maliyet |
| fire_orani | DECIMAL(5,4) | Gerçekleşen fire oranı |
| hesaplama_tarihi | TIMESTAMP | Hesaplama tarihi |

##### 3.4.13.5 Maliyet Raporları
|| Rapor | Açıklama |
|-------|----------|
| Üretim Maliyet Özeti | Dönem bazlı toplam üretim maliyeti |
| Mamul Bazlı Maliyet | Her mamulün birim maliyeti karşılaştırması |
| Fire Maliyet Analizi | Fire oranı ve maliyet etkisi |
| Karşılaştırmalı Analiz | Planlanan vs gerçekleşen maliyet |

##### 3.4.13.6 Hesaplama Tetikleme ve İdempotensi
- Maliyet hesabı ayrı bir veritabanı trigger'ı veya bağımsız zorunlu endpoint akışı değildir.
- Üretim tamamlama servisinin tek transaction'ı içinden idempotent bir servis/fonksiyon olarak çağrılır.
- Aynı `uretim_id` ve tamamlanma sürümü için tekrar çağrı yeni mükerrer maliyet kaydı üretmez; mevcut sonuç döndürülür veya güvenli biçimde güncellenir.

#### 3.4.14 Ürün Özellik Sistemi
Sistem, ürün kategorilerine göre özelleştirilebilir nitelikler (özellikler) tanımlanmasına izin verir.

##### 3.4.14.1 Özellik Tanımları
|| Alan | Tip | Açıklama |
|------|-----|----------|
| ozellik_id | UUID | Benzersiz tanımlayıcı |
| kategori | ENUM('MEYVE','BAL','KARSIM','TUML') | Özelliğin geçerli olduğu kategori |
| alan_adi | VARCHAR(50) | Veritabanı alan adı (örn: renk, boyut) |
| goruntu_adi | VARCHAR(100) | Kullanıcıya gösterilecek ad |
| tip | ENUM('METIN','SAYI','ENUM','BOOLEAN','TARIH') | Özellik tipi |
| zorunlu | BOOLEAN | Stok girişinde zorunlu mu? |
| etikette_goster | BOOLEAN | Etikette gösterilsin mi? |
| etikette_zorunlu | BOOLEAN | Etikette zorunlu mu? |
| siralama | INTEGER | Form/etiket sırası |
| varsayilan_deger | VARCHAR(255) | Varsayılan değer |
| enum_degerleri | JSONB | Enum tipi için seçenek listesi |

##### 3.4.14.2 Kategori Bazlı Varsayılan Özellikler

**MEYVE Kategorisi:**
| Alan Adi | Goruntu Adi | Tip | Zorunlu | Etikette | Enum Degerleri |
|----------|------------|-----|---------|---------|----------------|
| renk | Renk | ENUM | Hayir | Evet | ["Acik sari", "Koyu amber", "Kristal beyaz", "Kahverengi"] |
| boyut | Boyut Grubu | ENUM | Evet | Evet | ["Buyuk (23+)", "Orta (20-23)", "Kucuk (18-20)"] |
| nem_orani | Nem Orani (%) | SAYI | Hayir | Hayir | — |
| kurutma_sekli | Kurutma Sekli | ENUM | Evet | Evet | ["Gunes", "Jenerator", "Diger"] |

**BAL Kategorisi:**
| Alan Adi | Goruntu Adi | Tip | Zorunlu | Etikette | Enum Degerleri |
|----------|------------|-----|---------|---------|----------------|
| renk | Renk | ENUM | Hayir | Evet | ["Acik sari", "Koyu amber", "Kristal beyaz", "Kahverengi"] |
| kristalizasyon | Kristalizasyon | ENUM | Hayir | Evet | ["Kristalize", "Sivi", "Kremamsi"] |
| koken | Koken | METIN | Hayir | Evet | — |
| ph_degeri | pH Degeri | SAYI | Hayir | Hayir | — |
| nem_orani | Nem Orani (%) | SAYI | Hayir | Hayir | — |
| diastaz_sayisi | Diastaz Sayisi | SAYI | Hayir | Evet | — |
| hmf_degeri | HMF Degeri | SAYI | Hayir | Evet | — |

##### 3.4.14.3 Lot Özellik Değerleri
|| Alan | Tip | Açıklama |
|------|-----|----------|
| lot_ozellik_id | UUID | Benzersiz tanımlayıcı |
| stok_id | UUID | Lot referansı |
| ozellik_id | UUID | Özellik referansı |
| deger | VARCHAR(255) | Girilen değer |
| birim | VARCHAR(20) | Birim (varsa) |

**Unique Constraint:** `(stok_id, ozellik_id)` — aynı lotta aynı özellik bir kez tanımlanabilir.

##### 3.4.14.4 Özellik Görünürlük Ayarları
| Görünüm Yeri | Açıklama |
|--------------|----------|
| Stok Listesi | Stok hareketleri listesinde |
| Stok Detay Formu | Stok kartı detay ekranında |
| Üretim Formu | Üretim emri formunda |
| Satış Formu | Satış kaydı formunda |
| Raporlar | Rapor çıktılarında |
| Etiket | Baskı etiketinde |


### 3.5 Üretim Yönetimi

#### 3.5.1 Üretim Emri
| Alan | Tip | Açıklama |
|------|-----|----------|
| uretim_id | UUID | Benzersiz tanımlayıcı |
| uretim_no | String | Üretim emri numarası (P0) |
| tarih | DateTime | Emrin oluşturulma tarihi |
| durum | Enum | Beklemede, Onaylandı, Tamamlandı, İptal |
| not | Text | Üretim notları |
| oncelik | ENUM('DUSUK','NORMAL','YUKSEK','ACIL') | Üretim öncelik seviyesi (P1) |
| planlanan_miktar | DECIMAL(15,3) | Planlanan üretim miktarı (P1) |
| gerceklesen_miktar | DECIMAL(15,3) | Fiili üretim miktarı (P1) |
| planlanan_baslama | TIMESTAMP | Planlanan başlama zamanı (P1) |
| gerceklesen_baslama | TIMESTAMP | Fiili başlama zamanı (P1) |
| planlanan_tarih | DATE | Planlanan üretim tarihi (P0) |
| tamamlama_tarihi | TIMESTAMP | Fiili tamamlama zamanı (P0) |
| kalite_kontrol_onayi | BOOLEAN | Kalite kontrol onayı alındı mı? (P1) |
| kalite_kontrol_tarihi | TIMESTAMP | Kalite kontrol tarihi (P1) |
| kalite_kontrol_eden_id | UUID | Kalite kontrol eden kullanıcı (P1) |
| toplam_maliyet | DECIMAL(15,4) | Toplam üretim maliyeti (P1) |
| fire_orani_planlanan | DECIMAL(5,4) | Planlanan fire oranı (P2) |
| fire_orani_gercek | DECIMAL(5,4) | Fiili fire oranı (P2) |
| son_tarih | DATE | Teslimat son tarihi (P2) |
| musteri_id | UUID | Özel üretim ise ilgili müşteri (P2) |
| siparis_no | VARCHAR(50) | Müşteri sipariş numarası (P2) |
| olusturan_kullanici_id | UUID | Kaydı oluşturan kullanıcı (P0) |

#### 3.5.2 Üretim Detayı
`uretim_detay`, üretimde fiilen tüketilen mamul/hammadde/lot/miktar ilişkilerinin operasyonel tek doğru kaynağıdır. `urunler.hammadde_id` yalnızca varsayılan temel hammaddeyi, `urun_donusum` ise reçete ve beklenen dönüşüm oranını tanımlar.

| Alan | Tip | Açıklama |
|------|-----|----------|
| detay_id | UUID | Benzersiz tanımlayıcı |
| uretim_id | UUID | Üretim emri referansı |
| mamul_urun_id | UUID | Üretilecek mamul |
| mamul_miktar | Decimal | Üretilecek miktar |
| hammadde_urun_id | UUID | Kullanılacak hammadde |
| hammadde_lot_no | String | Kullanılacak lot |
| hammadde_miktar | Decimal | Kullanılacak hammadde miktarı |
| fire_miktari | Decimal | Oluşan fire |

#### 3.5.3 Lot Üretim Kaydı
- Her üretim sonucu yeni bir lot oluşur
- Lot bilgisi şunları içerir:
  - Lot numarası (otomatik: LOT-YYYYMMDD-XXX)
  - Kaynak hammadde lotu/lotları
  - Üretim tarihi
  - Üretilen miktar
  - Son kullanma tarihi (otomatik hesaplama)
- Üretim tamamlandığında mamul stok kartının `kaynak_stok_id` alanı tüketilen hammadde stok kartına otomatik bağlanır.
- Mamul stok kartının `tedarikci_id` alanı kaynak hammadde lotundan devralınır; böylece Mamul Lot → Hammadde Lot → Tedarikçi zinciri kurulabilir.
- Birden fazla hammadde lotu kullanıldığında tüm kaynaklar `uretim_lot.kaynak_lot_bilgisi` içinde saklanır; `kaynak_stok_id` birincil/ilk tüketilen lotu gösterir.
- Üretim oluşturma yanıtında `gerceklesen_miktar` alanı bulunur ve tamamlanana kadar `null` olabilir. Tamamlama yanıtı `kaynak_lot` bilgisini döndürür.
- Miktar hesapları uygulama katmanında tek bir sayısal tipe normalize edilir; `float` ve `Decimal` doğrudan karıştırılmaz.
- Üretim tamamlama, servis katmanında **tek veritabanı transaction'ı** içinde hammadde tüketimlerini, mamul stok kartını, stok hareketlerini, üretim lot kaydını, `kaynak_stok_id` bağını ve tedarikçi mirasını birlikte yazar; herhangi bir adım başarısız olursa tamamı geri alınır.
- Hammadde tüketimlerinin tamamında FEFO+FIFO hibrit seçim servisi kullanılır.
- Birincil kaynak lot mamul `stok_karti.kaynak_stok_id` alanına yazılır; kaynak hammadde lotunun `tedarikci_id` değeri mamul stok kartına miras alınır. Çoklu kaynakların tamamı `uretim_lot.kaynak_lot_bilgisi` ile korunur.
- Tamamlama işlemi idempotenttir; aynı üretim emri için yinelenen istek ikinci kez stok tüketimi, mamul lotu veya maliyet kaydı oluşturmaz.
- Maliyet hesaplama, aynı tamamla transaction'ı içinden idempotent servis/fonksiyon olarak çağrılır; ayrı trigger veya zorunlu `maliyet-hesapla` endpoint'i kullanılmaz.

#### 3.5.4 Maliyet Hesaplama
Sistem, üretim maliyetlerini otomatik olarak hesaplar ve mamul lotlarına kaydeder. Bu sayede stok değeri, kar/zarar analizi ve fiyatlandırma kararları desteklenir.

##### 3.5.4.1 Maliyet Bileşenleri
| Bileşen | Açıklama | Hesaplama Yöntemi |
|---------|----------|------------------|
| Hammadde Maliyeti | Kullanılan hammadde bedeli | FEFO+FIFO hibrit kuralıyla tüketilen lot miktarı × lot birim fiyatı |
| İşçilik Maliyeti | Üretimde çalışan işçi süresi | Çalışma saati × saatlik ücret |
| Enerji/Gider | Üretimde tüketilen enerji, su, gaz | Fiili tüketim × birim fiyat |
| Fire Maliyeti | Üretim sırasında oluşan fire | Fire miktarı × birim maliyet |
| Genel Gider | Ortak üretim giderleri | Sabit dağılım anahtarı ile |

##### 3.5.4.2 Maliyet Hesaplama Yöntemleri
**Hammadde Maliyeti (FEFO+FIFO Hibrit Bazlı):**
- Üretimde kullanılan hammadde, tüm diğer stok tüketimleriyle aynı FEFO+FIFO hibrit sırasına göre belirlenir
- Hammadde birim fiyatı, ilgili lotun giriş birim fiyatıdır
- Birden fazla lot kullanılıyorsa, her lotun maliyeti ayrı hesaplanır
- Fire oluşan lotun maliyeti, toplam üretim maliyetine eklenir

**İşçilik Maliyeti:**
|| Alan | Tip | Açıklama |
|------|-----|------|----------|
| iscilik_id | UUID | Benzersiz tanımlayıcı |
| uretim_id | UUID | Üretim emri referansı |
| personel_id | UUID | Personel referansı |
| calisma_saati | DECIMAL(5,2) | Çalışma süresi (saat) |
| saatlik_ucret | DECIMAL(10,4) | Saatlik ücret |
| toplam_tutar | DECIMAL(15,4) | Toplam işçilik maliyeti |

**Genel Gider Dağılımı:**
- Aşağıdaki dağıtım anahtarlarından biri seçilebilir:
  - Hammadde maliyeti oranında
  - İşçilik saati oranında
  - Üretilen miktar oranında
  - Sabit tutar (üretim başına)

##### 3.5.4.3 Mamul Birim Maliyet Hesaplama
```
Toplam Maliyet = Hammadde Maliyeti + İşçilik Maliyeti + Enerji/Gider + Fire Maliyeti + Genel Gider
Birim Maliyet = Toplam Maliyet / Üretilen Miktar
```

##### 3.5.4.4 Maliyet Hesaplama Kaydı
|| Alan | Tip | Açıklama |
|------|-----|------|----------|
| maliyet_id | UUID | Benzersiz tanımlayıcı |
| uretim_id | UUID | Üretim emri referansı |
| lot_no | VARCHAR(50) | Mamul lot numarası |
| hammadde_maliyeti | DECIMAL(15,4) | Toplam hammadde maliyeti |
| iscilik_maliyeti | DECIMAL(15,4) | Toplam işçilik maliyeti |
| enerji_maliyeti | DECIMAL(15,4) | Toplam enerji/gider |
| fire_maliyeti | DECIMAL(15,4) | Fire maliyeti |
| genel_gider | DECIMAL(15,4) | Dağıtılan genel gider |
| toplam_maliyet | DECIMAL(15,4) | Toplam üretim maliyeti |
| birim_maliyet | DECIMAL(15,4) | Birim (kg/adet) başına maliyet |
| fire_orani | DECIMAL(5,4) | Gerçekleşen fire oranı |
| hesaplama_tarihi | TIMESTAMP | Hesaplama tarihi |
| olusturma_tarihi | TIMESTAMP | Oluşturma zamanı |

##### 3.5.4.5 Maliyet Raporları
|| Rapor | Açıklama |
|------|--------|----------|
| Üretim Maliyet Özeti | Dönem bazlı toplam üretim maliyeti |
| Mamul Bazlı Maliyet | Her mamulün birim maliyeti karşılaştırması |
| Fire Maliyet Analizi | Fire oranı ve maliyet etkisi |
| Maliyet Trend | Aylık/çeyreklik maliyet değişim analizi |
| Karşılaştırmalı Analiz | Planlanan vs gerçekleşen maliyet |

### 3.6 Satış Takibi

#### 3.6.1 Satış Kaydı
| Alan | Tip | Açıklama |
|------|-----|----------|
| satis_id | UUID | Benzersiz tanımlayıcı |
| satis_no | String | Satış kaydı numarası (P0) |
| musteri_id | UUID | Müşteri referansı |
| tarih | DateTime | Satış tarihi |
| durum | Enum | Tamamlandı, İptal, İade |
| toplam_tutar | Decimal | Toplam satış tutarı |
| indirim_tutari | DECIMAL(15,4) | Uygulanan indirim tutarı (P0) |
| not | Text | Satış notları |
| teslimat_adresi | TEXT | Bu satış için teslimat adresi (P1) |
| harici_teslimat_referansi | VARCHAR(100) | İrsaliye/kargo/harici teslimat belgesi referansı; fatura değildir (P2) |
| kargo_bilgileri | VARCHAR(255) | Kargo firması ve takip numarası (P2) |
| satis_tipi | ENUM('PERAKENDE','TOPTAN','OZEL_SIPARIS') | Satış türü (P1) |
| teslimat_tarihi | DATE | Planlanan teslimat tarihi (P2) |
| teslim_tarihi | DATE | Fiili teslimat tarihi (P2) |
| teslim_eden_id | UUID | Teslim eden kullanıcı (P2) |
| teslim_alan | VARCHAR(255) | Teslim alan kişi adı (P2) |
| iade_nedeni | TEXT | İade durumunda iade nedeni (P2) |
| iade_tarihi | TIMESTAMP | İade işlem tarihi (P2) |
| olusturan_kullanici_id | UUID | Kaydı oluşturan kullanıcı (P0) |

#### 3.6.2 Satış Kalemleri
| Alan | Tip | Açıklama |
|------|-----|----------|
| kalem_id | UUID | Benzersiz tanımlayıcı |
| satis_id | UUID | Satış referansı |
| urun_id | UUID | Ürün referansı |
| lot_no | String | Satılan lot |
| miktar | Decimal | Satılan miktar |
| birim_fiyat | Decimal | Satış birim fiyatı |
| tutar | Decimal | Kalem tutarı |

**Kapsam Kuralı:** `satis_kaydi` yalnızca satış, lot, sevk ve teslimat takibi içindir. Fatura kesme/düzeltme, ödeme/vade takibi, e-fatura, GİB ve KDV işlemleri bu sistemde yapılmaz ve bu amaçlarla alan tutulmaz.

#### 3.6.3 FEFO+FIFO Hibrit Zorunlu Onay Mekanizması
FEFO+FIFO hibrit kuralı tüm stok çıkış ve tüketimlerinde zorunludur. Kural dışı lot seçimi için sistematik maker-checker onayı uygulanır.

##### 3.6.3.1 FIFO İhlal Türleri
|| İhlal Türü | Açıklama | Örnek |
|------------|----------|--------|
| Tarih İhlali | Son kullanma tarihi yaklaşan lot yerine daha yeni lot seçimi | SKT: 5 gün > SKT: 30 gün |
| Sıra İhlali | Giriş sırasına uymadan lot seçimi | 3. lot > 1. lot |
| Miktar İhlali | Mevcut lotun tamamı yerine kısmi çekim | Tam lot yerine yarım lot |

##### 3.6.3.2 FEFO/FIFO İhlal Onay Süreci
```
1. `DEPO_SORUMLUSU` FEFO/FIFO sırasına aykırı lot için gerekçeli talep oluşturur
2. Sistem ihlal ve risk seviyesini gösterir
3. Kullanıcı ihlal nedenini seçer veya yazar
4. Sistem, ihlal onay formu açar:
   - İhlal edilen lot bilgileri
   - Seçilen lot bilgileri
   - İhlal nedeni (açılır listeden)
   - Açıklama (opsiyonel)
5. Talebi oluşturan kullanıcıdan farklı bir `YONETICI` onaylar; kritik SKT ihlalinde yalnızca `ADMIN` onaylayabilir
6. Stok çıkışı gerçekleşir
7. İhlal kaydı denetim günlüğüne yazılır
```

##### 3.6.3.3 İhlal Nedenleri
|| Neden | Açıklama |
|-------|----------|
| SKT Yaklaşıyor | Son kullanma tarihi yaklaşan lotun tamamı başka amaçla kullanılacak |
| Kalite Sorunu | Mevcut lotta kalite sorunu tespit edildi |
| Müşteri Özel İsteği | Müşteri belirli lot talep etti |
| Miktar Yetersiz | Mevcut lot miktarı yetersiz |
| Depo Konumu | Lojistik nedenlerle farklı lot tercih edildi |
| Üretim Planı | Üretim planı gereği farklı lot gerekli |
| Diğer | Yukarıdakilerin hiçbiri |

##### 3.6.3.4 Onay Yetkileri
|| Rol | Onay Yetkisi | Açıklama |
|-----|-----|------------|----------|
| ADMIN | Tüm ihlaller | Sınırsız onay |
| YONETICI | Kritik olmayan ihlaller | Farklı kullanıcının gerekçeli talebini onaylar/reddeder |
| DEPO_SORUMLUSU | Talep oluşturma | Onay veremez; kendi talebini onaylayamaz |
| SATIS_SORUMLUSU | Talep oluşturma | Müşteri isteğini gerekçelendirir; onay veremez |
| KALITE_KONTROL | Talep oluşturma | Kalite sorununu gerekçelendirir; onay veremez |

**Onay Kısıtları:**
- Kritik ihlaller (SKT < 3 gün, miktar > %25) sadece ADMIN onayı ile geçerli olur
- Maker-checker zorunludur: talep eden ve onaylayan aynı kullanıcı olamaz
- Ardışık 3 aynı tür ihlal otomatik olarak yönetici bildirimi tetikler

##### 3.6.3.5 FIFO İhlal Kaydı
|| Alan | Tip | Açıklama |
|------|-----|------|----------|
| ihlal_id | UUID | Benzersiz tanımlayıcı |
| stok_cikis_id | UUID | Stok çıkış hareketi referansı |
| ihlal_tarihi | TIMESTAMP | İhlal gerçekleşme tarihi |
| ihlal_eden_id | UUID | İhlal eden kullanıcı |
| ihlal_nedeni | ENUM | İhlal nedeni kodu |
| ihlal_aciklama | TEXT | Detaylı açıklama |
| onay_durumu | ENUM('BEKLIYOR','ONAYLANDI','REDDEDILDI') | Onay durumu |
| onay_eden_id | UUID | Onaylayan kullanıcı |
| onay_tarihi | TIMESTAMP | Onay tarihi |
| onaylanan_lot_no | VARCHAR(50) | İhlal sonrası seçilen lot |
| ihlal_edilen_lot_no | VARCHAR(50) | FIFO sırasına göre kullanılması gereken lot |
| tutulan_miktar | DECIMAL(15,3) | Çekilen miktar |
| olusturma_tarihi | TIMESTAMP | Kayıt oluşturma zamanı |

##### 3.6.3.6 FIFO Uyumsuzluk Raporu
Sistem, FIFO kurallarına uyum oranını izler ve düzenli raporlar üretir.

|| Rapor | Açıklama |
|------|--------|----------|
| Günlük İhlal Özeti | Günlük FIFO ihlal sayısı ve toplam çıkış içindeki oranı |
| Kullanıcı Bazlı İhlal | Hangi kullanıcıların kaç ihlal yaptığı |
| İhlal Neden Dağılımı | İhlal nedenlerinin yüzdesel dağılımı |
| Aylık Trend | Aylık FIFO uyum oranı trendi |
| Risk Analizi | Yüksek riskli ihlallerin listesi |

**FIFO Uyum Hedefi:** Sistem, %95 üzeri FIFO uyum oranını hedefler. Bu oranın altına düşülmesi durumunda yönetici uyarısı üretilir.

### 3.9 Kullanıcı Yönetimi

#### 3.9.1 Kullanıcı Kaydı
| Alan | Tip | Açıklama |
|------|-----|----------|
| kullanici_id | UUID | Benzersiz tanımlayıcı |
| kullanici_adi | VARCHAR(100) | Benzersiz kullanıcı adı |
| sifre_hash | VARCHAR(255) | Şifrelenmiş şifre (bcrypt/argon2) |
| ad | VARCHAR(100) | Kullanıcı adı |
| soyad | VARCHAR(100) | Kullanıcı soyadı |
| eposta | VARCHAR(255) | E-posta adresi |
| rol_id | UUID | Rol referansı |
| aktif | BOOLEAN | Aktif/Pasif durum |
| son_giris | TIMESTAMP | Son giriş zamanı |
| telefon | VARCHAR(20) | Kullanıcı telefonu (bildirimler için) (P2) |
| avatar_url | VARCHAR(500) | Profil fotoğrafı URL (P2) |
| bildirim_tercihleri | JSONB | E-posta, SMS, uygulama bildirim tercihleri (P2) |
| giris_sayisi | INTEGER | Toplam giriş sayısı (P2) |
| son_sifre_degisikligi | TIMESTAMP | Son şifre değişikliği tarihi (P2) |
| iki_factor_aktivate | BOOLEAN | İki faktörlü doğrulama aktif mi? (P2) |
| iki_factor_secret | VARCHAR(255) | TOTP secret (şifrelenmiş) (P2) |
| varsayilan_depo_id | UUID | Kullanıcının varsayılan deposu (P2) |
| adres | TEXT | Kullanıcı adresi (P2) |
| dogum_tarihi | DATE | Doğum tarihi (P2) |
| bolum | VARCHAR(100) | Departman/bölüm (P2) |
| unvan | VARCHAR(100) | İş unvanı (P2) |
| olusturma_tarihi | TIMESTAMP | Oluşturma zamanı |
| guncelleme_tarihi | TIMESTAMP | Son güncelleme zamanı |
| olusturan_kullanici_id | UUID | Kaydı oluşturan kullanıcı (P0) |

#### 3.9.2 Kullanıcı Rolleri
| Rol | Yetkiler | Açıklama |
|-----|----------|----------|
| ADMIN | Tüm yetkiler | Sistem yöneticisi |
| DEPO_SORUMLUSU | Stok giriş/çıkış, üretim işlemleri | Depo yönetimi |
| SATIS_SORUMLUSU | Satış takibi, müşteri yönetimi | Satış yönetimi |
| RAPOR | Tüm raporlara erişim | Sadece raporlama |
| MUSTERI_HIZMETLERI (P2) | musteri_oku, musteri_yaz, satis_oku | Müşteri hizmetleri |
| KALITE_KONTROL (P2) | stok_oku, kalite_oku, kalite_yaz, rapor_oku | Kalite kontrol |

| YEDEK_KULLANICI (P2) | Sınırlı yetkiler | Acil durumlar için |

### 3.7 Lot İzlenebilirliği

#### 3.7.1 İzlenebilirlik Zinciri
Her lot için şu bilgiler saklanır:
1. **Lot Kimlik Bilgisi:** Lot numarası, üretim tarihi
2. **Kaynak Bilgisi:**
   - Hammadde ise: Tedarikçi, alım tarihi, alım lotu
   - Mamul ise: Kaynak hammadde lotu, üretim tarihi
3. **Hareket Geçmişi:** Tüm giriş/çıkış hareketleri

#### 3.7.2 İzlenebilirlik Sorgulama
- Lot numarası ile ürünün geçmişini sorgulama
- Sorunlu ürün tespitinde ilgili tüm lotları listeleme
- Müşteriye satılan ürünün kaynağına ulaşma

### 3.8 Raporlama

#### 3.8.1 Stok Raporları
| Rapor | Açıklama |
|-------|----------|
| Anlık Stok Durumu | Tüm ürünlerin mevcut stok miktarı |
| Minimum Stok Uyarısı | Belirli eşiğin altındaki ürünler |
| Son Kullanma Yaklaşan | X gün içinde son kullanma tarihi Dolan ürünler |
| Stok Değeri | Toplam stok değeri (maliyet bazlı) |

#### 3.8.2 Satış Raporları
| Rapor | Açıklama |
|-------|----------|
| Günlük/Aylık/Yıllık Satış | Satış özeti |
| Müşteri Bazlı Satış | Müşteriye göre satış dağılımı |
| Ürün Bazlı Satış | En çok/az satan ürünler |
| Lot Bazlı Satış | Hangi lotun ne kadar satıldığı |

#### 3.8.3 Tedarikçi Raporları
| Rapor | Açıklama |
|-------|----------|
| Tedarikçi Performansı | Kalite, zamanında teslimat, sorun oranı |
| Tedarikçi Bazlı Alımlar | Tedarikçiden yapılan toplam alımlar |
| Tedarikçi Karşılaştırması | Aynı ürün için tedarikçi karşılaştırması |

#### 3.8.4 Üretim Raporları
| Rapor | Açıklama |
|-------|----------|
| Günlük/Periyodik Üretim | Üretim özeti |
| Fire Oranı Analizi | Beklenen vs gerçekleşen fire |
| Dönüşüm Verimliliği | Hammadde → Mamul dönüşüm oranı |

#### 3.8.5 İzlenebilirlik Raporları
| Rapor | Açıklama |
|-------|----------|
| Lot Geçmişi | Bir lotun tüm hareketleri |
| Ürün Kaynak Raporu | Ürünün kaynağından satışına kadar |
| Sorunlu Lot Raporu | Kalite sorunu olan lotlar |

---

## 4. Teknik Gereksinimler

### 4.1 Teknoloji Seçimi Önerisi

**Önerilen Stack:**
| Katman | Teknoloji | Gerekçe |
|--------|-----------|---------|
| Backend | Python (FastAPI) veya Node.js (Express/NestJS) | Hızlı geliştirme, geniş ekosistem |
| Frontend | React veya Vue.js | Modern, responsive UI |
| Veritabanı | PostgreSQL | Güvenilir, JSON desteği, ACID uyumlu |
| Cache | Redis (opsiyonel) | Performans için |
| Container | Docker | Kolay deployment, izolasyon |

**Neden PostgreSQL?**
- Karmaşık sorgular ve raporlama için güçlü
- JSON veri tipi esneklik sağlar
- Tam ACID uyumluluğu (stok ve izlenebilirlik bütünlüğü için kritik)
- Açık kaynak ve ücretsiz
- Yedekleme araçları yaygın

### 4.2 Veritabanı Tasarım İlkeleri
- **Normalizasyon:** 3NF seviyesi
- **Bütünlük:** Foreign key constraints, check constraints
- **İzleme:** Created_at, updated_at, created_by her tabloda
- **Soft Delete:** Silinen kayıtlar fiziksel silinmeyecek
- **Kanonik tablo adları:** Ana iş tabloları tekil adlandırılır: `stok_karti`, `uretim_emri`, `satis_kaydi`, `kalite_kontrol`, `tedarikci_degerlendirme`. Çoğul varyantlar tablo adı olarak kullanılmaz.

### 4.3 Yedekleme ve Geri Dönüş

#### 4.3.1 Yedekleme Stratejisi
| Yedekleme Tipi | Sıklık | Saklama Süresi |
|----------------|--------|----------------|
| Tam Yedekleme | Haftalık | 4 hafta |
| Artımlı Yedekleme | Günlük | 7 gün |
| Anlık Snapshot | Saatlik | 24 saat |

#### 4.3.2 Geri Dönüş Gereksinimleri
- RPO (Recovery Point Objective): 1 saat
- RTO (Recovery Time Objective): 4 saat
- Geri dönüş prosedürü dokümante edilmeli
- Düzenli geri dönüş testleri yapılmalı

#### 4.3.3 Yedekleme Konumları
- Yerel depolama (günlük)
- Bulut depolama (AWS S3, Google Cloud Storage, vb.)
- Farklı fiziksel lokasyon (kritik veri için)

### 4.4 Birim Testleri

#### 4.4.1 Test Kapsamı ve Gereksinimleri
| Modül | Birim Test (Minimum) | Entegrasyon Test | E2E Test |
|-------|---------------------|------------------|----------|
| Tedarikçi Modülü | CRUD, performans hesaplama, validasyon | API endpoint testleri | Tedarikçi ekleme akışı |
| Ürün Modülü | CRUD, dönüşüm oranı hesaplama, özellik yönetimi | Kategori filtreleme, arama | Ürün kataloğu görüntüleme |
| Stok Modülü | FIFO işlemleri, lot seçimi, minimum stok kontrolü | Stok hareketleri, uyarı tetikleme | Stok giriş/çıkış akışı |
| Üretim Modülü | Lot oluşturma, izlenebilirlik, fire hesaplama | Üretim emri akışı | Üretim tamamlama akışı |
| Satış Modülü | Lot atama, FEFO+FIFO stok çıkışı, iade işlemleri | Müşteri seçimi, teslimat kaydı | Satış kaydı oluşturma |
| Raporlama | Hesaplama doğruluğu, tarih aralığı | Rapor generate etme | Rapor görüntüleme, export |
| Etiket Modülü | Şablon oluşturma, baskı önizleme | Etiket yazdırma servisi | Etiket basma akışı |

**Kod Kavrama Hedefleri:**
| Tip | Hedef | Açıklama |
|-----|-------|----------|
| Birim Test | %80+ | Her fonksiyon/method için |
| Entegrasyon Test | %70+ | API endpoint ve veritabanı işlemleri |
| E2E Test | Kritik akışlar | Kullanıcı yolculuğu başına en az 1 test |

#### 4.4.2 Test Araçları
| Katman | Araç | Kullanım |
|--------|------|----------|
| Backend Birim | pytest (Python) / Jest (Node.js) | Fonksiyonel testler |
| Backend Entegrasyon | pytest-django / Supertest | API testleri |
| Frontend | React Testing Library / Vue Test Utils | Bileşen testleri |
| E2E | Playwright / Cypress | Tarayıcı otomasyonu |
| Yük Testi | k6 / Locust | Performans testleri |
| Güvenlik | OWASP ZAP / Burp Suite | Penetrasyon testleri |

#### 4.4.3 Test Senaryoları Öncelikleri
| Öncelik | Kapsam | Açıklama |
|---------|--------|----------|
| P0 - Kritik | Login, stok çıkışı, FIFO, üretim | Sistem durmasına neden olacak hatalar |
| P1 - Yüksek | CRUD işlemleri, raporlama | Ana işlevleri etkileyen hatalar |
| P2 - Orta | Arama, filtreleme, sıralama | İş akışını yavaşlatan hatalar |
| P3 - Düşük | UI detayları, renkler | Kozmetik hatalar |

#### 4.4.4 Sürekli Test Otomasyonu
- Her commit'de otomatik test çalışması
- Test coverage raporu otomatik oluşturma
- Başarısız testler build'i engeller
- Regression test suite'i

---

### 4.9 Performans ve Altyapı Gereksinimleri

#### 4.9.1 Veritabanı Bölümlendirme (Partitioning) Stratejisi

**Hedef:** Yoğun yazılan ve büyüyen tabloların bakımını, sorgu performansını ve arşivlemesini kolaylaştırmak için PostgreSQL Range Partitioning kullanılır.

**Bölümlendirilen Tablolar:**

| Tablo | Bölümlendirme Türü | Anahtar | Saklama Süresi |
|-------|---------------------|---------|----------------|
| `stok_hareketleri` | AYLIK (RANGE) | `hareket_tarihi` | 24 ay aktif; sonrası arşiv |
| `audit_log` | YILLIK (RANGE) | `islem_tarihi` | 7 yıl (KVKK uyumu) |

**`stok_hareketleri` — Aylık Bölümlendirme:**
- Her ay için ayrı partition oluşturulur (örn. `stok_hareketleri_2026_07`).
-partition adlandırma formatı: `{tablo_adi}_{yil}_{ay}`
- 24 aydan eski partition'lar `DETACH` edilerek salt-okunur arşive alınır.
- Partition yönetimi (oluşturma, arşivleme, silme) bir automation script ile yapılır.
- Her partition'da `(stok_karti_id, hareket_tarihi)` ve `(hareket_tipi, hareket_tarihi)` composite index'leri bulunur.

**`audit_log` — Yıllık Bölümlendirme:**
- Her yıl için ayrı partition oluşturulur (örn. `audit_log_2026`).
-partition adlandırma formatı: `audit_log_{yil}`
- 7 yıldan eski partition'lar arşiv schema'sına taşınır.
- Yasal uyumluluk gereği partition'lar fiziksel olarak silinmez; önce arşivlenir.

**Diğer Tablolar:**
- `satis_kaydi` / `satis_kalemleri`: Yıllık satış hacmi > 5 milyon satıra ulaşınca YILLIK bölümlendirmeye geçilir.
- Diğer tablolar (lookup tabloları, düşük hacimli tablolar) bölümlendirilmez.

---

#### 4.9.2 Bağlantı Havuzu (PgBouncer) Yapılandırması

PostgreSQL önünde **PgBouncer** (transaction-mode pooling) kullanılır.

**PgBouncer Temel Parametreleri:**

| Parametre | Değer | Açıklama |
|-----------|-------|----------|
| `pool_size` | **20** | PostgreSQL backend başına max eşzamanlı connection |
| `max_client_conn` | **100** | PgBouncer'a bağlanabilecek max client (uygulama + admin) |
| `reserve_pool_size` | **5** | Peak anında ekstra connections |
| `reserve_pool_timeout` | **3 sn** | Reserve pool'a geçiş süresi |
| `server_idle_timeout` | **600 sn** | Boşta connection timeout (10 dk) |
| `server_connect_timeout` | **15 sn** | Backend connection oluşturma timeout'u |
| `server_lifetime` | **3600 sn** | Bir connection'ın ömrü (1 saat) |
| `query_timeout` | **300 sn** | Maksimum sorgu süresi (5 dakika) |
| `pool_mode` | **transaction** | Transaction bazında connection alınır/serbest bırakılır |
| `max_db_connections` | **25** | Tek database'e max toplam connection |

**Pool Boyutlandırma Gerekçesi:**
- `pool_size=20`: 8 vCPU / 32 GB RAM sunucu için PostgreSQL'in verimli çalışabileceği ideal backend connection sayısı.
- `max_client_conn=100`: Uygulama sunucularındaki worker/thread sayısı × 2-3 çarpanı; 100 client 20 backend connection üzerinden multiplex edilir.
- `reserve_pool_size=5`: Ani yük artışında (batch job + kullanıcı isteği) %25 ek kapasite sağlar.
- `query_timeout=300`: Raporlama ve uzun analitik sorgular için 5 dakika makul tavan değeridir.

**Kullanıcı Bağlantı String'i (Uygulama Tarafı):**
```
postgresql://erp_app@127.0.0.1:5432/erp_prod
```
→ PgBouncer 5432 portundan dinler; uygulama doğrudan PgBouncer'a bağlanır, PostgreSQL'e değil.

**İzleme Komutları:**
```sql
SHOW POOLS;       -- Tüm pool'ların durumu
SHOW CLIENTS;     -- Bağlı client'lar
SHOW SERVERS;     -- Backend connection'ları
SHOW STAT;        -- İstatistik özeti

-- Kritik metrikler:
--   cl_waiting > 0 ise pool büyütülmeli
--   sv_active > pool_size ise kuyruk oluşur, erken uyarı
```

---

#### 4.9.3 Önbellek (Redis) Stratejisi

Sistem, PostgreSQL üzerindeki yükü azaltmak ve yanıt sürelerini kısaltmak için **Redis** kullanır. Uygulama katmanında **read-through** ve **write-through** cache stratejileri uygulanır.

**Redis Key Formatı ve TTL Değerleri:**

*1. Tablo Önbellekleri (Read-Through Cache)*

| Key Kalıbı | Açıklama | TTL | Freshlik Kriteri |
|------------|----------|-----|-----------------|
| `cache:stok_karti:{stok_karti_id}` | Lot/Stok kartı detayı | 1 saat | Stok hareketi sonrası invalidation |
| `cache:stok_karti:list:{sayfa}` | Stok kartı listesi (sayfalanmış) | 5 dakika | Yeni lot eklendiğinde invalidation |
| `cache:stok_miktar:{stok_karti_id}` | Anlık stok miktarı (gerçek-zamanlı) | 30 saniye | Her stok hareketi sonrası güncellenir |
| `cache:urunler:all` | Tüm ürün kataloğu | 24 saat | Ürün CRUD işlemlerinde invalidation |
| `cache:urunler:{urun_id}` | Ürün detayı | 6 saat | Ürün güncellendiğinde invalidation |
| `cache:musteriler:list:{sayfa}` | Müşteri listesi (sayfalanmış) | 5 dakika | Müşteri eklendiğinde invalidation |
| `cache:musteriler:{musteri_id}` | Müşteri detayı | 1 saat | Müşteri güncellendiğinde invalidation |
| `cache:tedarikciler:all` | Tüm tedarikçi listesi | 6 saat | Tedarikçi CRUD işlemlerinde invalidation |
| `cache:fiyat:{urun_id}:{musteri_id}:{fiyat_tipi}` | Ürün-müşteri fiyatı | 2 saat | Fiyat güncellemesinde invalidation |
| `cache:stok_degerleri:all` | Genel stok değeri özeti (dashboard) | 1 dakika | Herhangi bir stok hareketi sonrası invalidation |

*2. Oturum ve Ara Katman (Intermediate Layer) Önbellekleri*

| Key Kalıbı | Açıklama | TTL |
|------------|----------|-----|
| `session:{session_id}` | Kullanıcı oturum verisi | 8 saat |
| `auth:token:{token_id}` | JWT refresh token | 24 saat |
| `rate_limit:{ip_adresi}` | API rate limiting sayaçları | 1 dakika |
| `job:lock:{job_name}` | Dağıtık kilit (background job) | 5 dakika |
| `report:pending:{rapor_id}` | Uzun-ömürlü rapor sonucu (async) | 30 dakika |

*3. Komut/Sorgu Önbellekleri*

| Key Kalıbı | Açıklama | TTL |
|------------|----------|-----|
| `query:fifo_lot:{urun_id}` | FIFO'ya göre sıralanmış lot ID'leri | 5 dakika |
| `query:fiyat_sorgula:{urun_id}:{musteri_id}` | Fiyat sorgulama sonucu | 1 saat |
| `query:stok_durumu:{urun_id}` | Ürüne ait toplam stok durumu | 2 dakika |

**Invalidation (Geçersiz Kılma) Stratejisi:**

1. **Event-Driven Invalidation (Tercih edilen):** Her CRUD işleminde ilgili key'ler anında silinir. Stok hareketi, ürün güncellemesi gibi olaylarda Redis `DELETE` ve `PUBLISH` kullanılır.

2. **Pattern-Based Bulk Invalidation:** Liste sayfaları gibi çoklu key'ler tek seferde temizlenir.
   ```python
   # Örnek: Tüm stok listesi cache'lerini temizle
   redis_client.delete(*redis_client.keys("cache:stok_karti:list:*"))
   ```

3. **TTL-Based Soft Invalidation:** Event-driven invalidation'ın uygulanamadığı durumlarda TTL süresi sonunda key otomatik yenilenir.

**Redis Yapılandırma Önerileri:**
- `maxmemory`: 2 GB (veya sunucu RAM'inin %25'i)
- `maxmemory-policy`: `allkeys-lru` (bellek dolunca en eski key'leri sil)
- `appendonly`: yes (AOF persistence)
- `bind`: 127.0.0.1 (sadece localhost)
- `requirepass`: güçlü bir şifre

**İzleme:**
- Cache hit rate < %80 ise cache boyutu veya TTL değerleri gözden geçirilir.
- Prometheus metrikleri: `redis_cache_hits_total`, `redis_cache_misses_total`

---

## 5. Arayüz Gereksinimleri

### 5.1 Genel Arayüz Prensipleri
- Responsive tasarım (masaüstü öncelikli)
- Kullanıcı dostu, minimal eğitim gereksinimi
- Hızlı veri girişi için kısayollar
- Onay mekanizmaları (kritik işlemler için)

### 5.2 Ana Ekranlar

1. **Dashboard:** Özet bilgiler, uyarılar, hızlı erişim
2. **Stok Yönetimi:** Stok listesi, hareketler, uyarılar
3. **Tedarikçi Yönetimi:** Tedarikçi listesi, performans, değerlendirme
4. **Ürün Yönetimi:** Ürün kataloğu, fiyatlar, dönüşüm oranları
5. **Müşteri Yönetimi:** Müşteri listesi, geçmiş
6. **Üretim:** Üretim emri oluşturma, takip
7. **Satış:** Satış kayıtları, lot seçimi
8. **Raporlar:** Tüm raporlara tek erişim noktası
9. **Ayarlar:** Sistem yapılandırması, kullanıcı yönetimi

### 5.3 Kritik Kullanıcı Akışları

#### Stok Girişi Akışı
```
Tedarikçi Seç → Ürün Seç → Lot Bilgisi Girişi → Miktar → Fiyat → Kaydet
```

#### Satış Kaydı Akışı
```
Müşteri Seç → Ürün Ekle → Sistem otomatik FEFO+FIFO hibrit lot seçer → Miktar → Birim Fiyat → Kaydet
```

#### Üretim Akışı
```
Üretim Emri Oluştur → Mamul Seç → Miktar Belirle → Sistem hammadde lotu önerir (FEFO+FIFO) → Onayla → Üretim Tamamla
```

### 5.4 Kullanıcı Deneyimi İyileştirmeleri

#### 5.4.1 Toplu İşlemler (Batch Operations)
| İşlem | Açıklama |
|-------|----------|
| Toplu Stok Girişi | Excel/CSV ile toplu veri yükleme |
| Toplu Stok Çıkışı | Birden fazla ürün için tek seferde çıkış |
| Toplu Üretim | Çoklu üretim emri oluşturma |
| Toplu Etiket Basma | Seçili lotlar için toplu etiket yazdırma |
| Toplu Güncelleme | Seçili kayıtların toplu düzenlenmesi |
| Toplu Silme | Seçili kayıtların toplu silinmesi (soft delete) |

#### 5.4.2 Gelişmiş Filtreleme ve Arama
**Filtreleme Özellikleri:**
- Çoklu kriter ile eş zamanlı filtreleme
- Tarih aralığı filtreleri
- Sayısal aralık filtreleri (miktar, fiyat)
- Enum/multi-select filtreleri
- Filtrelenmiş sonuçları kaydetme
- Filtre preset'leri oluşturma

**Arama Özellikleri:**
- Tek alan veya tüm alanlarda arama
- Otomatik tamamlama (autocomplete)
- Arama sonuçlarında vurgulama
- Arama geçmişi
- Sık kullanılan aramaları kaydetme
- Joker karakter desteği (*, ?)

#### 5.4.3 Veri Dışa Aktarım (Export)
| Format | Kullanım |
|--------|----------|
| Excel (.xlsx) | Raporlar, veri analizi |
| CSV (.csv) | Veri transferi, arşivleme |
| PDF | Yazdırma, paylaşım |
| JSON | API entegrasyonları, yedekleme |

**Export Seçenekleri:**
- Tüm veri veya filtrelenmiş veri
- Sütun seçimi
- Tarih aralığı belirleme
- Sayfa başı kayıt sayısı
- Şifre korumalı export (opsiyonel)

#### 5.4.4 Dashboard ve Görselleştirme
**Dashboard Bileşenleri:**
| Bileşen | Açıklama |
|---------|----------|
| Stok Özeti | Anlık stok durumu, minimum stok uyarıları |
| Satış Grafiği | Günlük/aylık/yıllık satış trendleri |
| Fire Oranı | Üretim fire oranı analizi |
| Tedarikçi Performansı | En iyi/kötü tedarikçiler |
| Son Kullanma Yaklaşan | Lot bazlı uyarı listesi |
| Hızlı İşlemler | Sık kullanılan işlemlere hızlı erişim |

**Görselleştirme Türleri:**
- Çizgi grafik (trend analizi)
- Sütun grafik (karşılaştırma)
- Pasta grafik (dağılım)
- Heatmap (aktivite yoğunluğu)
- Harita görünümü (depo konumu)

#### 5.4.5 Klavye Kısayolları
| Kısayol | İşlev |
|---------|-------|
| Ctrl+N | Yeni kayıt oluştur |
| Ctrl+S | Kaydet |
| Ctrl+F | Arama / Filtre |
| Ctrl+E | Düzenle |
| Ctrl+D | Sil |
| Ctrl+P | Yazdır |
| Ctrl+Shift+E | Export |
| Escape | İptal / Kapat |
| Tab | Sonraki alan |
| Enter | Formu gönder |

#### 5.4.6 Bildirim ve Uyarı Merkezi
- Tüm sistem bildirimleri tek merkezde
- Okunmamış bildirim sayacı
- Bildirim öncelik seviyeleri (kritik, normal, bilgi)
- Bildirimlere direkt erişim
- Bildirimleri toplu işaretleme

---

## 6. Lokalizasyon ve Doğrulama Gereksinimleri

### 6.1 Dil Desteği
- **Birincil Dil:** Türkçe
- Tüm arayüz metinleri Türkçe olacak
- Kullanıcı mesajları, hata mesajları, etiketler Türkçe
- Sistem logları Türkçe

### 6.2 Tarih ve Saat Formatı
| Alan | Format | Örnek |
|------|--------|-------|
| Tarih | GG/AA/YYYY | 27/07/2026 |
| TarihSaat | GG/AA/YYYY SS:DD | 27/07/2026 14:30 |
| TarihSaatSaniye | GG/AA/YYYY SS:DD:SN | 27/07/2026 14:30:00 |
| Saat | SS:DD | 14:30 |
| SaatSaniye | SS:DD:SN | 14:30:00 |
| Ay Adı | Türkçe | Ocak, Şubat, ..., Aralık |
| Gün Adı | Türkçe | Pazartesi, Salı, ..., Pazar |
| Haftanın İlk Günü | Pazartesi |
| Saat Dilimi | Europe/Istanbul (UTC+3) | Sunucu ve istemci tutarlı |
| Hafta Numarası | ISO 8601 (Pazartesi başlangıç) | 2026-W30 |

**Not:** "SS:DD" gösteriminde SS = Saat (00–23), DD = Dakika (00–59); saniye gerekirse "SS:DD:SN" kullanılır. "SS:DD:SN" uluslararası standarttaki "HH:MM:SS" eşdeğeridir.

### 6.3 Parasal Format (Türkiye Standartları)
| Alan | Format | Örnek |
|------|--------|-------|
| Para Birimi Sembolü | ₺ (ön-ek) | ₺1.234,56 |
| Para Birimi Kodu | TRY (ISO 4217) | 1.234,56 TRY |
| Ondalık Ayırıcı | Virgül (,) | 1.234,56 |
| Binlik Ayırıcı | Nokta (.) | 1.234.567,89 |
| Ondalık Basamak | 2 (standart), 3-4 (miktar/kg gibi) | 1.234,56 ₺ / 12,345 kg |
| Negatif Değer | Parantez ile | (1.234,56) ₺ |
| Sıfır Değer | Tire/Çizgi | - ₺ |
| Kur Biçimi | 1 USD = 35,12 ₺ | 35,12 ₺ (6 ondalık) |
| Çoklu Para | TL, USD, EUR | 100,00 USD = 3.512,00 ₺ |
| Yuvarlama | Banka yuvarlaması (en yakın 0,01 ₺) | 1.234,567 ₺ → 1.234,57 ₺ |
| Tablo Görünümü | Sembol hücre sonunda, rakam sağa hizalı | `1.234,56 ₺` |
| Giriş Formu | Serbest format, parse esnasında normalize | "1.234,56" / "1234.56" / "1234,56" kabul edilir |

**Kurallar:**
- Sistemdeki tüm para birimi alanlarında gösterim `₺` simgesi ile yapılır.
- API sınırında (JSON) sayısal değer ondalık nokta ile, kuruş hassasiyetinde taşınır (`1234.56`); gösterim istemcide yapılır.
- 1000+ ₺ için binlik ayırıcı zorunlu; altı için serbest.
- Eksi bakiye / zarar / fire raporları parantez gösterimini kullanır.

### 6.4 Veri Doğrulama (Input Validation)
| Alan Tipi | Kural | Örnek |
|-----------|-------|-------|
| Tarih | GG/AA/YYYY format, geçerli tarih kontrolü | 27/07/2026 geçerli, 32/13/2026 geçersiz |
| Para | Sayısal, virgül ondalık, negatif değer | 1.234,56 ✓, abc ✗ |
| E-posta | Geçerli e-posta formatı | info@ornek.com ✓ |
| Telefon | 10-11 rakam, operatör kodu kontrolü | 0532 123 45 67 ✓ |
| Vergi No | 10 rakam (TC) veya 11 rakam (VKN) | |
| Miktar | Pozitif ondalıklı sayı, sıfır olamaz | 10.5 kg ✓, -5 kg ✗ |
| Lot No | Alfanümerik, isteğe bağlı tire alt çizgi | LOT-2026-001 ✓ |
| URL | Geçerli URL formatı | https://... |
| Zorunlu Alan | Boş bırakılamaz uyarısı | "Bu alan zorunludur" |

### 6.5 Form Tipi Tanımları
| Tip | Kullanım Alanı |
|-----|----------------|
| metin | Genel metin girişi |
| sayi | Sayısal değerler, ondalık destekli |
| para | Parasal değerler (TL formatında) |
| tarih | GG/AA/YYYY tarih seçici |
| tarihSaat | Tarih + saat seçici |
| ePosta | E-posta adresi |
| telefon | Telefon numarası |
| vergiNo | Vergi/T.C. numarası |
| cokluSecim | Checkbox/Radio grupları |
| dropdown | Seçim listesi |
| lotNo | Otomatik/generated lot numarası |
| miktar | Miktar + birim seçimi |

### 6.6 Tablo (Data Grid) Standardı

Tüm listeleme ekranlarında (stok, müşteri, satış, üretim, lot, kalite vb.) aşağıdaki yapısal standart zorunludur:

| Özellik | Standart |
|---------|----------|
| Sütun başlığı | İlk harf büyük, Türkçe; sıralanabilir kolonlarda ok ikonu (▲/▼) |
| Satır yüksekliği | 40 px (kompakt), 48 px (varsayılan) |
| Sıralama | Her sütunda; varsayılan: liste ekrana geliş sırasına göre |
| Filtreleme | Her sütunda (sayısal, tarih, metin, enum türüne göre); filtre çubuğu açılır-kapanır |
| Sayfalama | 20 / 50 / 100 sayfa başı seçenekleri; varsayılan 20 |
| Satır numarası | İlk sütunda (sayfa başına yeniden başlar) |
| Seçim | Checkbox kolonu + "tümünü seç" toggle; çoklu seçim için |
| Sabit kolonlar | İlk 2 kolon (eylem + PK) yatay scroll'da sabit kalır |
| Boş durum (empty state) | Orta hizalı ikon + "Kayıt bulunamadı" mesajı + "Filtreleri temizle" eylemi |
| Yükleniyor (skeleton) | Satır başına shimmer efekti, 3 satır görünür |
| Hata (yükleme) | Tablo üstünde kırmızı uyarı bandı + "Yeniden dene" butonu |
| Sayısal kolonlar | Sağa hizalı; negatif parantezle |
| Tarih kolonları | GG/AA/YYYY; null ise "-" |
| Para kolonları | `1.234,56 ₺` (sağa hizalı, simge sonda) |
| Boolean kolonları | ✓ / ✗ ikonu |
| Satır aksiyonları | Sağa sabit kolon; dikey 3-nokta menü (görüntüle/düzenle/sil/...) |
| Toplam satırı | Son satır; sayısal kolonlar için SUM, diğerleri boş |
| Hücre tooltip | Uzun değerler hover'da tam metin |
| Responsive | 1024 px altında yatay scroll; satır içeriği sıkıştırılmaz |
| Klavye | ↑/↓ satır, Enter detay, Ctrl+Home ilk satır |
| Erişilebilirlik | `role="table"`, `aria-sort`, `aria-label` ile ekran okuyucu desteği |

### 6.7 Uyarı ve Bildirim (Notification) Standardı

Sistem genelinde dört seviye zorunludur:

| Seviye | Renk | İkon | Kullanım |
|--------|------|------|----------|
| BİLGİ (info) | Mavi (#3B82F6) | `i` | Operasyonel mesajlar, başarılı kayıt sonrası bilgi |
| BAŞARI (success) | Yeşil (#10B981) | `✓` | İşlem başarıyla tamamlandı |
| UYARI (warning) | Turuncu (#F59E0B) | `⚠` | Onay gerektiren, kural ihlali olmayan durumlar (SKT yaklaşıyor, kritik eşik aşımı) |
| HATA (error) | Kırmızı (#EF4444) | `✕` | Sistem hatası, doğrulama hatası, kritik işlem reddi |

**Bildirim bileşenleri:**
- Konum: Sağ üst köşe (toast) ve/veya sayfanın üstünde sabit banner (sayfa düzeyi uyarılar).
- Süre: BİLGİ 5 sn, BAŞARI 3 sn, UYARI kalıcı (kapatılabilir), HATA kalıcı (aksiyon gerektirir).
- Çoklu bildirim: üst üste dizilir, max 4 görünür, kalanlar "+N daha" özetinde.
- Sesli uyarı: yalnızca UYARI ve HATA'da, kullanıcı tercihi ile kapatılabilir.
- Erişilebilirlik: `aria-live="polite"` (BİLGİ/BAŞARI), `aria-live="assertive"` (UYARI/HATA).
- Lokalizasyon: tüm metinler `tr` çeviri anahtarından okunur.

### 6.8 Hata Ekranı Standardı

Sistem genelinde karşılaşılan her hata için **tek tip gösterim** uygulanır.

#### 6.8.1 Yapısal Bileşenler

| Bileşen | Açıklama |
|---------|----------|
| Hata Kodu | `ERR-{KATEGORİ}-{4 haneli sayı}` (örn. `ERR-VAL-0142`, `ERR-AUTH-0003`, `ERR-SYS-9001`) |
| Başlık | Tek satır, max 80 karakter, Türkçe, büyük harfle değil (sadece cümle başı) |
| Açıklama | 1-3 cümle, kullanıcının anlayacağı dilde, teknik detay içermez |
| Çözüm Önerisi (opsiyonel) | "Bunu nasıl çözerim" CTA butonu (örn. "Yeniden dene", "Yardım sayfasına git") |
| Detay (geliştirici/debug) | "Teknik detay" açılır paneli; correlation_id, trace_id, zaman damgası |
| İlgili Eylemler | Birincil (örn. "Yeniden Dene"), ikincil (örn. "Geri Dön"); en fazla 2 |

#### 6.8.2 Hata Kategorileri (standart set)

| Kategori | Kod Öneki | Anlamı | Örnek |
|----------|-----------|--------|-------|
| Doğrulama | `VAL` | Giriş/format/iş kuralı ihlali | Tarih geçersiz, miktar ≤ 0 |
| Yetkilendirme | `AUTH` | Oturum/yetki eksik | MFA gerekli, oturum doldu |
| İş Kuralı | `BIZ` | Domain kuralı ihlali | Stok yetersiz, son kullanma geçmiş |
| Sistem | `SYS` | Altyapı/uygulama hatası | DB bağlantı hatası |
| Entegrasyon | `INT` | Dış servis hatası | e-Fatura servisinden yanıt yok |
| Bulunamadı | `NF` | Kaynak bulunamadı | Lot/ürün/kullanıcı yok |

#### 6.8.3 Mesaj Yazım Standardı

- Samimi ama profesyonel (`"Bu işlem tamamlanamadı"`, `"Geçersiz bir tarih girdiniz"`).
- Suçlayıcı olmayan (`"Bir hata oluştu"` → `"İşlem tamamlanamadı; lütfen tekrar deneyin"`).
- Teknik jargon yok (kullanıcıya SQL hata kodu değil, iş anlamı gösterilir; teknik detay ayrı panelde).
- Çözüm yönlendirmeli (`"Giriş yaptıktan sonra tekrar deneyin"`, `"Sistem yöneticisiyle iletişime geçin"`).
- Tek satırda net fiil + bağlam.

#### 6.8.4 Sayfa Düzeyi vs Bileşen Düzeyi

| Kapsam | Gösterim |
|--------|----------|
| Sayfa yüklenemedi | Tam sayfa hata ekranı (header/footer gizli, "Ana sayfaya dön" CTA) |
| Bileşen/tablo yüklenemedi | Bileşen içi hata bandı + "Yeniden Dene" |
| Form submit hatası | Alan altında kırmızı metin + özet toast |
| Modal/dialog işlem hatası | Dialog içi banner (üstte kırmızı) |

#### 6.8.5 Örnek Mesajlar (Standart Havuz)

| Durum | Kod | Başlık | Açıklama |
|-------|-----|--------|----------|
| Stok yetersiz | `ERR-BIZ-0023` | Yetersiz stok | Seçtiğiniz ürün için depoda yeterli miktar yok. |
| Son kullanma geçmiş | `ERR-BIZ-0041` | Son kullanma tarihi geçmiş | Bu lotun son kullanma tarihi 15/03/2026, satışa uygun değil. |
| Yetkisiz erişim | `ERR-AUTH-0007` | Bu işlem için yetkiniz yok | Yönetici onayı gerekiyor. |
| Geçersiz tarih | `ERR-VAL-0102` | Geçersiz tarih | Lütfen GG/AA/YYYY formatında bir tarih girin. |
| MFA gerekli | `ERR-AUTH-0011` | MFA doğrulaması gerekli | Bu işlem için iki faktörlü kimlik doğrulama zorunludur. |
| Sistem bakımda | `ERR-SYS-9101` | Sistem şu an bakımda | Tahmini dönüş: 27/07/2026 23:00. |

### 6.9 Menü ve Navigasyon Standardı

| Özellik | Standart |
|---------|----------|
| Üst menü (header) | Logo (sol) + ana navigasyon (orta) + kullanıcı menüsü (sağ) |
| Ana navigasyon | Stok, Üretim, Satış, Kalite, Depo, Raporlar, Yönetim; max 7 öğe |
| Aktif menü öğesi | Alt çizgi (3 px, primary renk), yazı kalın (font-weight: 600) |
| Yan menü (sub-navigation) | Aktif sayfanın alt başlıkları; max 2 seviye |
| Breadcrumb | Sayfa başlığının üstünde, anasayfa > kategori > sayfa |
| Kullanıcı menüsü | Profil, Tercihler, Yardım, Çıkış; avatar + ad + rol |
| Sayfa başlığı | H1: Sayfa adı; sağda birincil eylem butonu(lar)ı (örn. "Yeni Lot") |
| Sayfa içi sekmeler (tabs) | Yatay; max 6 sekme; aktif olan alt çizili, içerik değişimi animasyonsuz |
| Mobil kenar menü | < 768 px; hamburger menü, slide-in drawer |
| İçerik genişliği | Max 1280 px; uzun tablolar için tam genişlik |
| Tema | Açık (varsayılan) + karanlık; kullanıcı tercihi localStorage'da |
| Erişilebilirlik | Tüm interaktif öğeler klavye ile erişilebilir, focus halkası görünür |

### 6.10 Erişilebilirlik ve Uluslararasılaştırma (i18n)

#### 6.10.1 Erişilebilirlik (A11y)

- Tüm interaktif öğeler klavye ile erişilebilir; görünür `focus` halkası (2 px primary renk, 2 px offset).
- Renk kontrast oranı WCAG AA (≥ 4.5:1 normal metin, ≥ 3:1 büyük metin).
- Hata mesajları için renk tek başına taşıyıcı değil; ikon ve metin eşlik eder.
- Form alanları için `<label for="…">` ve `aria-describedby` (yardım metni/hata metni).
- Tab sırası mantıksal; modal açıkken focus trap.
- Yüklenen içerikler için `aria-live` bölgeleri.
- Ekran okuyucu testleri: NVDA + Chrome, VoiceOver + Safari dönemsel doğrulanır.

#### 6.10.2 Çoklu Dil ve Yerelleştirme

- **Birincil dil:** Türkçe (`tr`).
- **İkincil dil:** İngilizce (`en`) — destek için altyapı hazır, anahtar eşleme tüm metinleri kapsar.
- Çeviri anahtarları `src/i18n/{locale}/{namespace}.json` dosyalarında tutulur; anahtarlar nokta notasyonu (`stok.lotOlustur.butonYeni`).
- Tarih/saat/para formatı `Intl.DateTimeFormat` ve `Intl.NumberFormat` üzerinden locale'e göre çözümlenir.
- Saat dilimi: Kullanıcının tarayıcı saat dilimi öncelikli; saklama UTC.
- Metin yönü (RTL): Türkçe ve İngilizce LTR; mimari RTL'e uygun (gelecekte Arapça desteği).
- Çeviri anahtarları runtime'da değiştirilebilir (operasyonel ekleme/düzeltme).

### 6.11 Yükleme, Boş Durum ve Yer Tutucu

| Durum | Gösterim |
|-------|----------|
| Sayfa yükleniyor | Üstte progress bar (1-2 sn sonra gizlenir), içerik alanı skeleton placeholder |
| Liste yükleniyor | Tablo içi 3 satır shimmer |
| Buton işlemde | Daire spinner + metin gri + disabled |
| Boş veri | İkon + "Henüz kayıt yok" + "İlk kaydı oluştur" CTA |
| Hata (sayfa) | Tam ekran hata komponenti (§6.8) |
| Çok uzun işlem | Snackbar + ilerleme yüzdesi (örn. toplu içe aktarma) |

### 6.12 Sembol ve Renk Paleti (Uygulama Geneli)

#### 6.12.1 Durum Renkleri (uyarı/başarı/hata/bilgi)

| Token | Renk | Kullanım |
|-------|------|----------|
| `--color-success` | #10B981 | Başarı, onay, geçerli |
| `--color-warning` | #F59E0B | SKT yaklaşıyor, kritik eşik |
| `--color-error` | #EF4444 | Hata, red, silme onayı |
| `--color-info` | #3B82F6 | Bilgi, hatırlatma |
| `--color-neutral` | #6B7280 | Pasif, devre dışı |

#### 6.12.2 Anlam Renkleri (semantik)

| Token | Renk | Kullanım |
|-------|------|----------|
| `--color-stock-ok` | #10B981 | Stok yeterli |
| `--color-stock-low` | #F59E0B | Stok minimumun altına düşmek üzere |
| `--color-stock-out` | #EF4444 | Stok tükendi |
| `--color-skt-fresh` | #10B981 | SKT > uyarı eşiğinin 2 katı |
| `--color-skt-warn` | #F59E0B | SKT uyarı eşiğinde |
| `--color-skt-critical` | #EF4444 | SKT < uyarı eşiği veya geçmiş |
| `--color-quality-pass` | #10B981 | Kalite KABUL |
| `--color-quality-warn` | #F59E0B | KISMEN_KABUL |
| `--color-quality-fail` | #EF4444 | RET |

#### 6.12.3 Tipografi

| Token | Değer |
|-------|-------|
| Font ailesi | "Inter", system-ui, sans-serif |
| Başlık (H1) | 24 px / 700 |
| Başlık (H2) | 20 px / 600 |
| Başlık (H3) | 16 px / 600 |
| Gövde | 14 px / 400 |
| Küçük | 12 px / 400 |
| Mono (kod) | "JetBrains Mono", monospace |

---

## 7. Güvenlik Gereksinimleri

### 7.1 Kimlik Doğrulama
- Kullanıcı adı/şifre ile giriş
- **Güçlü Şifre Politikası:**
  - Minimum 12 karakter
  - En az 1 büyük harf, 1 küçük harf, 1 rakam, 1 özel karakter
  - Son 12 şifre tekrar kullanılamaz
  - Şifre sıfırlama token geçerliliği: 24 saat
- **Çok Faktörlü Kimlik Doğrulama (MFA):**
  - E-posta veya SMS ile OTP kodu
  - Authenticator uygulama desteği (TOTP)
  - Kritik işlemler için MFA zorunlu
- Oturum zaman aşımı (15 dakika hareketsizlik)
- Aynı anda maksimum 3 aktif oturum
- Başarısız giriş denemesi: 5 kez sonra 15 dakika kilit

### 7.2 Yetkilendirme
- Rol tabanlı erişim kontrolü (RBAC)
- Admin, Depo Sorumlusu, Satış Sorumlusu, Rapor Sorumlusu rolleri
- Kritik işlemler için ek yetki gerektirme
- İzin matrisi ile detaylı erişim kontrolü
- En Az Yetki Prensibi (Least Privilege) uygulanır

### 7.3 Veri Güvenliği
- Şifreli iletişim (TLS 1.3 - HTTPS)
- Veritabanı şifreleme (AES-256, Transparent Data Encryption)
- Şifreler bcrypt/argon2 ile hashlenmiş saklanır
- Düzenli güvenlik güncellemeleri
- SQL injection, XSS, CSRF korumaları
- Rate limiting: API uç noktalarında

### 7.4 Oturum Yönetimi
- JWT token tabanlı kimlik doğrulama
- Access token geçerliliği: 15 dakika
- Refresh token geçerliliği: 7 gün
- Token yenileme mekanizması
- Oturum iptal etme (logout) özelliği
- Uzak oturum sonlandırma (admin yetkisi)

### 7.5 Çok Faktörlü Kimlik Doğrulama (MFA)

#### 7.5.1 MFA Türleri ve Desteklenen Yöntemler
| Yöntem | Açıklama | Varsayılan Durum |
|--------|----------|-----------------|
| TOTP (Time-based One-Time Password) | Google Authenticator, Microsoft Authenticator, Authy gibi uygulamalar ile 6 haneli kod üretimi | Zorunlu (ADMIN, DEPO_SORUMLUSU) |
| Yedek Kodları (Backup Codes) | 10 adet一次性 kurtarma kodu (8 karakterli) | Tüm MFA kullanıcıları için |

#### 7.5.2 MFA Zorunlu Roller
Aşağıdaki roller için MFA **zorunlu** olarak etkinleştirilmelidir:
- **ADMIN** — Tüm sistem yönetimi yetkilerine sahip
- **DEPO_SORUMLUSU** — Stok giriş/çıkış ve üretim işlemleri

Aşağıdaki roller için MFA **önerilir** (opsiyonel):
- **SATIS_SORUMLUSU** — Satış ve müşteri verisi erişimi
- **RAPOR_SORUMLUSU** — Hassas raporlama erişimi

#### 7.5.3 TOTP Uygulama Detayları
- **Algoritma:** SHA-1 (RFC 6238 standart)
- **Periyot:** 30 saniye
- **Basamak Sayısı:** 6 rakam
- **Issuer:** "KurutulmusMeyveBalERP" (QR kod içinde)
- **Hesap Adı:** Kullanıcının e-posta adresi
- **QR Kod Formatı:** otpauth://totp/{issuer}:{account}?secret={secret}&issuer={issuer}&algorithm=SHA1&digits=6&period=30

#### 7.5.4 TOTP Etkinleştirme Akışı
1. Kullanıcı profil ayarlarında "MFA Etkinleştir" butonuna tıklar
2. Sistem benzersiz bir secret key (base32 encoded, 32 karakter) oluşturur ve veritabanında şifrelenmiş olarak saklar
3. Frontend, secret key'i kullanarak QR kodu oluşturur ve kullanıcıya gösterir
4. Kullanıcı authenticator uygulaması ile QR kodu taratır
5. Kullanıcı authenticator'dan aldığı 6 haneli kodu doğrulama ekranına girer
6. Sistem TOTP kodunu doğrular — başarılı ise `iki_factor_aktivate = TRUE`, `iki_factor_secret` güncellenir
7. Sistem kullanıcıya 10 adet yedek kod oluşturur ve gösterir (bir kez gösterilir, tekrar görüntülenemez)

#### 7.5.5 Yedek Kodları (Backup Codes)
- Her kullanıcı için MFA etkinleştirildiğinde 10 adet yedek kod otomatik üretilir
- Kod formatı: `XXXX-XXXX` (8 karakter, 4-4 ayrılmış, alphanumeric)
- Her kod **yalnızca bir kez** kullanılabilir
- Kullanılan kod veritabanında `kullanildi = TRUE` olarak işaretlenir, asla yeniden aktive edilemez
- Kullanıcı tüm yedek kodları tükettiğinde veya sıfırlamak istediğinde yeni 10 kod üretilebilir
- Yedek kod üretimi audit_log'a kaydedilir

#### 7.5.6 MFA Doğrulama Akışı
1. Kullanıcı e-posta ve şifre ile giriş yapar
2. Hesap MFA gerektiriyorsa, sistem doğrulama ekranına yönlendirir
3. Kullanıcı TOTP kodunu veya yedek kodunu girer
4. Sistem kodu doğrular:
   - TOTP: Sunucu saati ile ±1 periyot toleransı ile kontrol edilir
   - Yedek Kod: Hash karşılaştırması ile doğrulanır, kullanıldı işaretlenir
5. Başarılı doğrulama sonrası ana sayfaya yönlendirilir

#### 7.5.7 MFA Zorunlu Kılma Kuralları
- ADMIN rolündeki tüm yeni kullanıcılar için ilk girişte MFA kurulumu zorunlu tutulur
- DEPO_SORUMLUSU rolündeki kullanıcılar ilk girişte 7 gün içinde MFA kurulumu yapmalıdır (uyarı gösterilir)
- Adminler, kullanıcı bazlı MFA zorunluluğunu kaldırabilir (audit log ile kaydedilir)
- MFA pasifleştirme: Mevcut TOTP kodunun girilmesi zorunludur

---

### 7.6 Şifre Sıfırlama Akışı

#### 7.6.1 "Şifremi Unuttum" Süreci
1. Kullanıcı giriş ekranında "Şifremi Unuttum" bağlantısına tıklar
2. Kullanıcı kayıtlı e-posta adresini girer
3. Sistem e-postayı doğrudan reddetmez (hesap varmış gibi davranır — timing attack koruması)
4. Geçerli bir e-posta için sistem:
   - 6 haneli bir kod üretir ve `sifre_sifirlama_token` tablosuna depolar
   - Kod geçerlilik süresi: **15 dakika**
   - Aynı e-posta için 3 dakikada bir yeniden talep yapılabilir (rate limit)
5. Sistem, e-postayı gönderir ve kullanıcıya "E-postanızı kontrol edin" mesajı gösterir
6. Kullanıcı e-postadaki bağlantıya tıklar (bağlantı: `/sifre-sifirla?token={token}`)
7. Token doğrulanır — geçerli ise yeni şifre belirleme ekranı gösterilir
8. Kullanıcı yeni şifreyi girer (güçlü şifre politikası uygulanır)
9. Şifre güncellenir, token silinir, başarı mesajı gösterilir

#### 7.6.2 Şifre Sıfırlama Tablo Yapısı
| Alan | Tip | Açıklama |
|------|-----|----------|
| `token` | UUID | Benzersiz sıfırlama token (PK) |
| `kullanici_id` | UUID | Kullanıcı referansı (FK) |
| `token_hash` | VARCHAR(255) | Token hash (SHA-256) |
| `码 | VARCHAR(6) | 6 haneli doğrulama kodu (şifrelenmiş) |
| `olusturma_tarihi` | TIMESTAMP | Oluşturulma zamanı |
| `son_kullanma` | TIMESTAMP | Sona erme zamanı (15 dakika) |
| `kullanildi` | BOOLEAN | Kullanıldı mı? |
| `kullanildi_tarihi` | TIMESTAMP | Kullanılma zamanı |
| `ip_adresi` | VARCHAR(45) | Talep eden IP |
| `user_agent` | VARCHAR(500) | Talep eden tarayıcı |

#### 7.6.3 Şifre Sıfırlama Güvenlik Kuralları
- Token tek kullanımlıktır
- Token süresi 15 dakikadır; süresi dolan token reddedilir
- 3 ardışık başarısız kod denemesinde token kilitlenir
- Şifre değişikliği son 12 şifre ile aynı olamaz
- Başarılı şifre sıfırlama sonrası kullanıcının tüm aktif oturumları sonlandırılır
- Şifre değişikliği audit_log'a kaydedilir
- Kullanıcı şifresini unuttu hatası ile 5 kez ardışık deneme sonrası 15 dakika bekleme süresi uygulanır

---

### 7.7 API Rate Limiting

#### 7.7.1 Rate Limit Değerleri
| Kapsam | Limit | Açıklama |
|--------|-------|----------|
| Genel API | 100 istek/dakika | Tüm endpoint'ler için (kimlik doğrulanmış kullanıcılar) |
| Burst Limiti | 200 istek | Kısa süreli ani artışlara izin (token bucket algoritması) |
| Giriş Endpoint'i | 10 istek/dakika | `/api/v1/auth/giris` |
| Şifre Sıfırlama Talebi | 3 istek/3 dakika | `/api/v1/auth/sifre-unuttum` |
| MFA Doğrulama | 5 istek/dakika | `/api/v1/auth/mfa-dogrula` |
| Genel (anonim) | 20 istek/dakika | Kimlik doğrulamamış istekler |
| Statik Kaynaklar | 1000 istek/dakika | CSS, JS, görseller |

#### 7.7.2 Rate Limit Header'ları
Sunulan tüm API yanıtlarında aşağıdaki header'lar bulunur:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1625689200
Retry-After: 60  (sadece limit aşıldığında)
```

#### 7.7.3 Rate Limit Aşımı Davranışı
- Limit aşıldığında HTTP `429 Too Many Requests` döndürülür
- Yanıt body: `{"hata": "Çok fazla istek", "bekleme_suresi": 60}`
- Bekleme süresi sonunda otomatik olarak yeniden deneme yapılabilir
- Aşırı aşım (10x limit) durumunda IP bazlı engelleme (1 saat)

---

### 7.8 Güvenlik Başlıkları (Security Headers)

#### 7.8.1 HTTP Güvenlik Başlıkları
| Başlık | Değer | Açıklama |
|--------|-------|----------|
| Content-Security-Policy (CSP) | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.example.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self';` | XSS, veri sızıntısı ve clickjacking koruması |
| Strict-Transport-Security (HSTS) | `max-age=31536000; includeSubDomains; preload` | HTTPS zorunlu kılma, 1 yıl süre, alt alanları dahil, preload list'e ekleme önerisi |
| X-Content-Type-Options | `nosniff` | MIME type sniffing engelleme |
| X-Frame-Options | `DENY` | iframe embed engelleme (clickjacking koruması) |
| X-XSS-Protection | `1; mode=block` | Eski tarayıcılar için XSS koruması (modern tarayıcılarda CSP yeterli) |
| Referrer-Policy | `strict-origin-when-cross-origin` | Referrer bilgisi kontrolü |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=()` | Özellik erişim kısıtlama |
| Cache-Control | `no-store, no-cache, must-revalidate, private` | Hassas veri önbelleklenmemesi |
| Pragma | `no-cache` | HTTP/1.0 geriye uyumluluk |

#### 7.8.2 CSP Yapılandırma Detayları
- **default-src 'self'**: Tüm kaynaklar yalnızca aynı origin'den
- **script-src 'self'**: JavaScript yalnızca kendi domain'den (inline script 'unsafe-inline' ile sınırlı)
- **style-src 'self' 'unsafe-inline'**: CSS için inline stiller kabul edilir (frontend framework gerekçesiyle)
- **img-src 'self' data: https:**: Görseller, data URI ve HTTPS kaynaklardan
- **frame-ancestors 'none'**: Hiçbir sayfa iframe olarak embed edilemez
- **form-action 'self'**: Form POST'ları yalnızca kendi origin'e
- **base-uri 'self'**: Base URL manipülasyonunu engelleme

#### 7.8.3 HSTS Yapılandırma Detayları
- **max-age=31536000**: Tarayıcı 1 yıl boyunca yalnızca HTTPS ile bağlanır
- **includeSubDomains**: Tüm alt alanlar dahil
- **preload**: HSTS preload list'e ekleme önerisi (google.com/list纳入)
- Üretim ortamında HSTS aktifken HTTP'den HTTPS'e yönlendirme yapılır
- Geliştirme ortamında HSTS devre dışı

---

### 7.9 Güvenlik Günlüğü (Audit Log)
- Tüm güvenlik olayları loglanır:
  - Başarısız giriş denemeleri
  - Yetkilendirme hataları
  - Kritik işlemler
  - Şifre değişiklikleri
  - MFA etkinleştirme/pasifleştirme
  - Rate limit aşımı olayları
- Log saklama: 1 yıl
- Güvenlik uyarı sistemi

---

### 7.10 Şifre Güvenliği ve Anahtar Yönetimi

#### 7.10.1 Algoritma Seçimi: HS256 vs RS256
| Özellik | HS256 (HMAC + SHA-256) | RS256 (RSA + SHA-256) |
|---------|------------------------|------------------------|
| Tür | Simetrik | Asimetrik |
| Performans | Çok hızlı | Yavaş |
| Gizlilik | Secret key paylaşımı gerekir | Public key ile doğrulama |
| Kullanım Alanı | Tek servis, gizli key paylaşılabilir | Mikro-servisler, çoklu sistemler |
| Güvenlik | İyi (key sızdırılmazsa) | Çok iyi (private key ayrı tutulur) |

**Karar:** Bu sistemde **RS256** kullanılacaktır. Gerekçe:
- Mikro-servis mimarisine geçiş kolaylığı
- Authentication service'in private key'i yalnızca kendinde tutması
- Diğer servisler yalnızca public key ile token doğrular
- Token üretim ve doğrulama ayrılığı

#### 7.10.2 Anahtar Rotasyon Stratejisi
| Rotasyon Türü | Süre | Açıklama |
|---------------|------|----------|
| Access Token | 15 dakika | Kısa ömürlü, sık yenilenmesi beklenir |
| Refresh Token | 7 gün | Orta ömürlü, aktif oturum sürekliliği |
| RS256 Private/Public Key Pair | 1 yıl | Yıllık rotasyon, eski key ile imzalanan token geçerliğini korur |
| MFA Secret Key | Sona erme yok | Aktifken değişmez, kullanıcı isterse sıfırlayabilir |
| Şifre Sıfırlama Token | 15 dakika | Tek kullanımlık |

**Anahtar Rotasyon Süreci:**
1. Yeni RSA key pair oluşturulur (3072 bit — RSA-4096 yerine 3072 tercih edilir, performans/güvenlik dengesi)
2. Yeni public key, sistem konfigürasyonuna eklenir
3. Eski private key geçiş süresince (2 hafta) aktarımda kullanılır
4. Geçiş süresi sonunda eski private key silinir
5. Rotasyon audit_log'a kaydedilir
6. Public key ön-yüklemesi (preload) güncellenir

#### 7.10.3 HashiCorp Vault Entegrasyonu
**Neden Vault?**
- Simetrik/asimetrik anahtar saklaması
- Audit log: Tüm anahtar erişimleri log'lanır
- Otomatik anahtar rotasyonu
- HSM (Hardware Security Module) desteği
- Dynamic secrets: Veritabanı credential'ları için

**Entegre Edilecek Alanlar:**
| Kaynak | Vault Path | Açıklama |
|--------|-----------|----------|
| RS256 Private Key | `secret/erp/jwt/private_key` | JWT imzalama anahtarı |
| RS256 Public Key | `secret/erp/jwt/public_key` | JWT doğrulama anahtarı |
| MFA TOTP Secret | `secret/erp/mfa/{kullanici_id}` | Kullanıcı bazlı MFA secret |
| Şifre Sıfırlama Token | `secret/erp/password_reset/{token_id}` | Geçici token storage |
| Database Master Password | `secret/erp/db/master` | Veritabanı şifreleme anahtarı |

**Vault Konfigürasyonu:**
- **Transit Engine:** Şifreleme/decryption için (TOTP secret, reset token)
- **Transit Engine (Key Derivation):** Şifre hash'leme için (HMAC key)
- **Audit Log Backend:** Dosya veya syslog ile tüm erişimler kaydedilir
- **TTL Ayarları:** Kısa ömürlü token'lar için (5 dakika) dynamic secrets

---

### 7.11 Barkod/Etiket Baskı Desteği
Sistem, lot bazlı barkod etiketleri üretip yazıcıdan basabilmelidir.

#### 7.5.1 Barkod Formatları
| Format | Kullanım Alanı |
|--------|----------------|
| Code128 | Lot numaraları, ürün SKU'ları |
| QR Code | Ürün bilgisi, izlenebilirlik linki |
| EAN-13 | Perakende ürün barkodları |

#### 7.5.2 Etiket İçeriği
Her barkod etiketi şu bilgileri içermelidir:
- **Ürün Adı** (Türkçe)
- **Lot Numarası** (Barkod)
- **Üretim Tarihi** (GG/AA/YYYY)
- **Son Kullanma Tarihi** (GG/AA/YYYY)
- **Miktar/Birim** (örn: 1 kg)
- **Tedarikçi Adı** (opsiyonel)
- **QR Kod** (izlenebilirlik bilgisi - lot detayına link)

#### 7.5.3 Etiket Boyutları
| Tip | Boyut | Kullanım |
|-----|-------|----------|
| Standart | 50x25mm | Genel kullanım |
| Büyük | 100x50mm | Palet/paket etiketleri |
| Mini | 25x13mm | Küçük ürünler |

#### 7.5.4 Yazıcı Desteği
- Zebra ZPL uyumlu yazıcılar
- Direct thermal ve thermal transfer
- A4 yazıcıdan PDF çıktısı seçeneği

#### 7.5.5 Etiket Baskı Akışı
```
Stok Girişi → Lot Oluşturma → "Etiket Bas" Butonu → Önizleme → Yazıcı Seç → Baskı
```

#### 7.5.6 Etiket Yapılandırma Yönetimi
Sistem, etiket içeriğinin tamamen özelleştirilebilmesini sağlar.

##### Etiket Şablonu Tanımlama
| Alan | Tip | Açıklama |
|------|-----|----------|
| sablon_id | UUID | Benzersiz tanımlayıcı |
| ad | String | Şablon adı (örn: "Mal Alım Etiketi", "Üretim Etiketi") |
| tur | Enum | MAL_ALIM, URETIM, SATIS, GENEL |
| aktif | Boolean | Varsayılan şablon mu? |
| etiket_boyut | Enum | Standart, Büyük, Mini |
| barkod_format | Enum | Code128, QR, EAN-13 |

##### Etiket Alan Tanımları
Her şablon için hangi alanların gösterileceği ve zorunlu olup olmadığı tanımlanır.

| Alan | Tip | Açıklama |
|------|-----|----------|
| alan_id | UUID | Benzersiz tanımlayıcı |
| sablon_id | UUID | Şablon referansı |
| alan_tipi | Enum | SabitMetin, UrunAdi, LotNo, Tarih, Miktar, Tedarikci, OzelAlan, Barkod, QRCode, Fotograf |
| goruntu_metni | String | Kullanıcıya gösterilecek ad |
| deger | String | Sabit metin değeri (SabitMetin ise) |
| ozellik_id | UUID | ÖzelAlan tipi için özellik referansı |
| zorunlu | Boolean | Bu alan yazdırılacak mı? |
| varsayilan | Boolean | Şablonda varsayılan alan mı? |
| konum_x | Integer | Etiket üzerinde X koordinatı (px) |
| konum_y | Integer | Etiket üzerinde Y koordinatı (px) |
| boyut_en | Integer | Genişlik (px) |
| boyut_boy | Integer | Yükseklik (px) |
| yaziboyut | Integer | Font size (pt) |
| siralama | Integer | Alan sırası |

##### Etiket Türüne Göre Zorunlu/İsteğe Bağlı Alanlar

**MAL_ALIM (Tedarikçiden Alım):**
| Alan | Zorunlu | İsteğe Bağlı |
|------|---------|--------------|
| Lot Numarası | ✓ | |
| Ürün Adı | ✓ | |
| Tedarikçi Adı | ✓ | |
| Alım Tarihi | ✓ | |
| Miktar/Birim | ✓ | |
| Son Kullanma | | ✓ |
| Renk | | ✓ |
| Kalite Notu | | ✓ |
| Fotoğraf | | ✓ |
| Özel Alanlar | | ✓ |

**URETIM (Üretim Sonrası):**
| Alan | Zorunlu | İsteğe Bağlı |
|------|---------|--------------|
| Lot Numarası | ✓ | |
| Ürün Adı | ✓ | |
| Üretim Tarihi | ✓ | |
| Son Kullanma | ✓ | |
| Miktar/Birim | ✓ | |
| Kaynak Hammadde Lotu | ✓ | |
| fire_orani | | ✓ |
| Renk | | ✓ |
| Boyut | | ✓ |
| Fotoğraf | | ✓ |
| Özel Alanlar | | ✓ |

**SATIS:**
| Alan | Zorunlu | İsteğe Bağlı |
|------|---------|--------------|
| Lot Numarası | ✓ | |
| Ürün Adı | ✓ | |
| Satış Tarihi | ✓ | |
| Miktar/Birim | ✓ | |
| Müşteri Adı | | ✓ |
| Fotoğraf | | ✓ |

##### Etiket Önizleme ve Test Baskı
- Şablon oluşturulduktan sonra önizleme görüntülenebilir
- Test etiketi basılabilir (çoklu kopya seçeneği)
- Şablonlar arasında kopyalama yapılabilir

##### Varsayılan Şablon Ayarları
| Ayar | Açıklama |
|------|----------|
| MAL_ALIM varsayılan | Tedarikçiden alımda otomatik seçilecek şablon |
| URETIM varsayılan | Üretim sonrası otomatik seçilecek şablon |
| Genel etiket | Tüm diğer durumlar için varsayılan şablon |

---

## 8. API Tasarımı

### 8.1 API Mimarisi
Sistem, RESTful API üzerinden erişilebilir olacak şekilde tasarlanacaktır.

**Endpoint Yapısı:**
```
/api/v1/{modul}/{kaynak}
/api/v1/{modul}/{kaynak}/{id}
/api/v1/{modul}/{kaynak}/{id}/{alt-kaynak}
```

**Modüller:**
| Modül | Endpoint Öneki | Açıklama |
|-------|---------------|----------|
| Tedarikçi | /api/v1/tedarikci | Tedarikçi yönetimi |
| Ürün | /api/v1/urun | Ürün kataloğu |
| Müşteri | /api/v1/musteri | Müşteri yönetimi |
| Stok | /api/v1/stok | Stok yönetimi |
| Üretim | /api/v1/uretim | Üretim yönetimi |
| Satış | /api/v1/satis | Satış takibi |
| Rapor | /api/v1/rapor | Raporlama |
| Etiket | /api/v1/etiket | Etiket baskı |

> **Kanonik API kuralı:** Dokümandaki tüm uç noktalar tam `/api/v1` önekiyle yazılır. Lot izlenebilirliği `GET /api/v1/raporlar/izlenebilirlik/lot/{lot_no}`, SKT ailesi `/api/v1/stok/skt/...`, depo transfer ailesi `/api/v1/depo/transferler` olarak standardize edilmiştir.

### 8.2 HTTP Metodları
| Metod | Kullanım | Açıklama |
|-------|---------|----------|
| GET | /api/v1/urun | Liste getir (paginated) |
| GET | /api/v1/urun/{id} | Tek kayıt getir |
| POST | /api/v1/urun | Yeni kayıt oluştur |
| PUT | /api/v1/urun/{id} | Kayıt güncelle |
| DELETE | /api/v1/urun/{id} | Kayıt sil (soft delete) |
| PATCH | /api/v1/urun/{id} | Kısmi güncelleme |

### 8.3 Ortak Yanıt Formatı
```json
{
  "success": true,
  "data": { },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100
  },
  "error": null
}
```

**Hata Yanıtları:**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Zorunlu alan eksik",
    "details": [
      {"field": "ad", "message": "Ürün adı zorunludur"}
    ]
  }
}
```

### 8.4 Kimlik Doğrulama (API)
| Yöntem | Açıklama |
|--------|----------|
| Bearer Token (JWT) | OAuth 2.0 Access Token |
| API Key | Sistem entegrasyonları için |
| Refresh Token | Token yenileme |

### 8.5 Rate Limiting
| Plan | Limit | Açıklama |
|------|-------|----------|
| Standart | 1000 istek/saat | Normal kullanım |
| Yüksek | 10000 istek/saat | Kritik operasyonlar |
| Batch | 100 istek/dakika | Toplu işlemler |

### 8.6 Versiyonlama
- URL-based versiyonlama: `/api/v1/`, `/api/v2/`
- Breaking değişiklikler yeni versiyon gerektirir
- Eski versiyonlar minimum 6 ay desteklenir

### 8.7 Yaygın API Uç Noktaları
| Endpoint | Metod | Açıklama |
|----------|-------|----------|
| /api/v1/raporlar/izlenebilirlik/lot/{lot_no} | GET | Kanonik lot izlenebilirlik sorgusu |
| /api/v1/stok/skt/lot-onerisi | GET | FEFO+FIFO lot önerisi |
| /api/v1/stok/skt/rapor | GET | SKT raporu |
| /api/v1/stok/skt/islemler | POST | SKT işlem talebi |
| /api/v1/stok/cikis | POST | Stok çıkışı (FEFO+FIFO) |
| /api/v1/uretim/emir | POST | Üretim emri oluştur |
| /api/v1/depo/transferler | POST | Depolar arası transfer talebi |
| /api/v1/raporlar/stok-degeri | GET | Stok değeri raporu |
| /api/v1/etiket/bas/{lotNo} | POST | Etiket yazdır |

---

## 9. Denetim Günlüğü (Audit Log)

### 9.1 Denetim Kapsamı
Sistemde yapılan tüm kritik işlemler denetim günlüğüne kaydedilir.

**Kaydedilecek İşlemler:**
| İşlem Kategorisi | Örnek İşlemler |
|-----------------|----------------|
| Kimlik Doğrulama | Giriş, çıkış, başarısız giriş denemesi |
| CRUD İşlemleri | Oluşturma, güncelleme, silme |
| Stok İşlemleri | Giriş, çıkış, düzeltme, transfer |
| Finansal İşlemler | Fiyat değişikliği, indirim |
| Yetkilendirme | Rol atama, izin değişikliği |
| Sistem | Konfigürasyon değişikliği, yedekleme |

### 9.2 Denetim Kaydı İçeriği
| Alan | Tip | Açıklama |
|------|-----|----------|
| log_id | UUID | Benzersiz tanımlayıcı |
| zaman | DateTime | İşlem zamanı |
| kullanici_id | UUID | İşlemi yapan kullanıcı |
| kullanici_ad | String | Kullanıcı adı |
| ip_adresi | String | İstemci IP adresi |
| modul | String | İşlem yapılan modül |
| islem | String | İşlem tipi (CREATE, UPDATE, DELETE, READ) |
| kaynak_tip | String | Kaynak tablo/tip |
| kaynak_id | UUID | Kaynak kayıt ID |
| onceki_deger | JSON | Değişiklik öncesi (güncelleme için) |
| yeni_deger | JSON | Değişiklik sonrası |
| tarayici | String | Tarayıcı bilgisi |
| oturum_id | String | Oturum tanımlayıcı |

### 9.3 Denetim Politikası
- Denetim logları **5 yıl** saklanır
- Loglar **değiştirilemez** (append-only)
- Kritik işlemler için **ikinci doğrulama** zorunlu
- Denetim loglarına erişim **sadece Admin** rolüne açık

### 9.4 Denetim Raporlama
| Rapor | Açıklama |
|-------|----------|
| Kullanıcı Aktivite Raporu | Belirli kullanıcının tüm işlemleri |
| Değişiklik Geçmişi | Bir kaydın tüm değişiklikleri |
| Anomali Tespiti | Olağandışı işlem örüntüleri |
| Uyumluluk Raporu | Düzenleyici gereksinimler |

---

## 10. Bildirim Sistemi

### 10.1 Bildirim Türleri
| Tür | Kanal | Açıklama |
|-----|-------|----------|
| Stok Uyarısı | E-posta, SMS, Uygulama | Minimum stok, son kullanma yaklaşıyor |
| Tedarikçi Uyarısı | E-posta, Uygulama | Performans düşüşü, kalite sorunu |
| Üretim Uyarısı | Uygulama | Fire oranı yüksek, plansız üretim |
| Sistem Bildirimi | E-posta, Uygulama | Yedekleme tamamlandı, hata oluştu |
| Onay Bekleyen | Uygulama | Yönetici onayı gerektiren işlemler |

### 10.2 Bildirim Kanalları
| Kanal | Aktif | Kullanım |
|-------|-------|----------|
| Uygulama İçi | Varsayılan | Tüm bildirimler |
| E-posta | Yapılandırılabilir | Kritik uyarılar, raporlar |
| SMS | Yapılandırılabilir | Acil stok/sistem uyarıları |
| Webhook | Yapılandırılabilir | Sistem entegrasyonları |

### 10.3 Bildirim Tercihleri
- Kullanıcı bazlı bildirim tercihleri
- Bildirim saatleri (mesai dışı kapatma)
- Öncelik seviyesi (kritik, normal, düşük)
- Bildirim gruplandırma (saatlik, günlük özet)

### 10.4 Bildirim Şablonları
| Şablon | Değişkenler | Açıklama |
|---------|-------------|----------|
| stok_dusuk | {urun_adi}, {miktar}, {esik} | Stok minimum eşik altında |
| lot_son_kullanma | {lot_no}, {urun_adi}, {tarih} | Son kullanma yaklaşıyor |
| tedarikci_sorun | {tedarikci_adi}, {sorun_tipi} | Tedarikçi performans sorunu |
| sistem_hata | {hata_mesaji}, {timestamp} | Sistem hatası oluştu |

---

## 11. CI/CD Gereksinimleri

### 11.1 Sürekli Entegrasyon (CI)
**Derleme Süreci:**
1. Kod gönderimi (commit) tetikler
2. Statik analiz (linting, type checking)
3. Birim testleri çalıştırma
4. Entegrasyon testleri (docker-compose)
5. Derleme (build artifact oluşturma)
6. Güvenlik taraması (SAST)
7. Sonuç raporlama

**CI Pipeline:**
```yaml
stages:
  - lint
  - test
  - build
  - security-scan
  - report
```

### 11.2 Sürekli Teslimat (CD)
| Ortam | Tetikleyici | Otomatik/Manuel |
|-------|-------------|------------------|
| Development | Her commit | Otomatik |
| Staging | Release branch | Otomatik |
| Production | Onay tag'ı | Manuel onay |

### 11.3 Test Ortamları
| Ortam | Amaç | Veri |
|-------|------|-----|
| Local | Geliştirici test | Mock/Seed veri |
| CI | Otomatik testler | Test veritabanı |
| Dev | Entegrasyon test | Anonimize üretim verisi |
| Staging | Son kullanıcı test | Anonimize üretim verisi |
| Production | Canlı sistem | Gerçek veri |

### 11.4 Deployment Stratejisi
**Blue-Green Deployment:**
- Aynı anda iki prod ortamı
- Anlık geçiş yapılabilir
- Geri alma (rollback) kolay

**Canary Release:**
- Yeni sürüm %5 trafiğe açılır
- Sorun yoksa tam geçiş
- Sorun varsa anında geri al

### 11.5 Docker Yapılandırması
**Servisler:**
| Servis | Port | Açıklama |
|--------|------|----------|
| api | 8000 | FastAPI backend |
| frontend | 3000 | React/Vue UI |
| db | 5432 | PostgreSQL |
| redis | 6379 | Cache (opsiyonel) |
| nginx | 80/443 | Reverse proxy |

### 11.6 Altyapı Kodu (IaC)
- Terraform veya Ansible kullanılır
- Tüm ortamlar kod olarak tanımlanır
- Değişiklikler versiyon kontrolünde

---

## 12. Veri Saklama ve Veri Yönetimi

### 12.1 Veri Saklama Süreleri
| Veri Kategorisi | Saklama Süresi | Gerekçe |
|-----------------|----------------|---------|
| Denetim Günlükleri | 5 yıl | Yasal uyumluluk |
| Satış ve teslimat izlenebilirlik kayıtları | İşletme saklama politikası + uygulanabilir gıda izlenebilirlik süresi | Operasyonel izlenebilirlik; fatura/vergi defteri değildir |
| Stok Hareketleri | 10 yıl | İzlenebilirlik |
| Müşteri Verileri | Sözleşme süresi + 5 yıl | Yasal yükümlülük |
| Tedarikçi Verileri | Sözleşme süresi + 5 yıl | Yasal yükümlülük |
| Ürün Fotoğrafları | Süresiz | İzlenebilirlik |
| Sistem Logları | 1 yıl | Güvenlik |
| Geçici Dosyalar | 30 gün | Performans |

### 12.2 Veri Arşivleme
- **Arşivleme Kriteri:** 2 yıldan eski veriler
- **Arşiv Formatı:** Sıkıştırılmış JSON/CSV
- **Arşiv Konumu:** Ayrı depolama (S3 cold storage)
- **Arşive Erişim:** Admin onayı ile okuma

### 12.3 Veri İmha
| Yöntem | Kullanım |
|--------|---------|
| Fiziksel Silme | Sabit disk imhası |
| Yazma/Silme | 3 kez üzerine yazma |
| Kriptografik Silme | Şifreleme anahtarı imhası |

### 12.4 Veri Yedekleme
| Yedekleme | Sıklık | Saklama | Konum |
|-----------|--------|---------|-------|
| Tam | Haftalık | 4 hafta | Yerel + Bulut |
| Artımlı | Günlük | 7 gün | Yerel + Bulut |
| Anlık | Saatlik | 24 saat | Yerel |
| Arşiv | Aylık | 1 yıl | Bulut (cold) |

### 12.5 Veri Transfer Güvenliği
- Tüm veri aktarımları TLS 1.3 ile şifreli
- API erişimi için JWT token zorunlu
- Veri aktarım logları tutulur
- Büyük veri transferi için chunked upload

---

## 12.5 Sistem Ayarları

### 12.5.1 Sistem Ayar Tanımları
| Alan | Tip | Açıklama |
|------|-----|----------|
| ayar_id | UUID | Benzersiz tanımlayıcı |
| ayar_adi | VARCHAR(100) | Ayar adı |
| deger | TEXT | Ayar değeri |
| veri_tipi | VARCHAR(20) | Veri tipi (INTEGER, BOOLEAN, DECIMAL vb.) |
| aciklama | TEXT | Ayar açıklaması |
| kategori | VARCHAR(50) | Ayar kategorisi |
| olusturma_tarihi | TIMESTAMP | Oluşturma zamanı |
| guncelleme_tarihi | TIMESTAMP | Son güncelleme zamanı |

### 12.5.2 Önerilen Sistem Ayarları
| Ayar Adı | Veri Tipi | Önerilen Değer | Açıklama |
|----------|-----------|----------------|----------|
| fifo_ihlal_toleransi_gun | INTEGER | 0 | FIFO ihlaline izin verilen gün farkı (P2) |
| varsayilan_son_kullanma_gun | INTEGER | 365 | Ürün girişinde varsayılan son kullanma gün sayısı (P2) |
| minimum_stok_uyari_esigi | DECIMAL(15,3) | 10 | Minimum stok uyarı eşiği (genel) (P2) |
| SKT_UYARI_GUN | INTEGER | 30 | Son kullanma uyarısı kaç gün önce (P2) |
| kalite_kontrol_zorunlu | BOOLEAN | TRUE | Stok girişinde kalite kontrol zorunlu mu? (P2) |

### 12.5.3 Bildirim Türleri
| Tür | Kanal | Açıklama |
|-----|-------|----------|
| Stok Uyarısı | E-posta, SMS, Uygulama | Minimum stok, son kullanma yaklaşıyor |
| Tedarikçi Uyarısı | E-posta, Uygulama | Performans düşüş, kalite sorunu |
| Üretim Uyarısı | Uygulama | Fire oranı yüksek, plansız üretim |
| Sistem Bildirimi | E-posta, Uygulama | Yedekleme tamamlandı, hata oluştu |
| Onay Bekleyen | Uygulama | Yönetici onayı gerektiren işlemler |
| kalite_kontrol_gerekli (P2) | Uygulama, E-posta | Stok girişinde kalite kontrol bekliyor |
| fifo_ihlal_uyari (P2) | Uygulama, E-posta | FIFO kuralı ihlal edildiğinde |
| stok_depo_doluyor (P2) | Uygulama | Depo doluluk oranı yüksek |

| sistem_yedekleme_basarili (P2) | E-posta | Yedekleme tamamlandı bilgisi |
| guvenlik_uyari (P2) | E-posta, SMS | Kritik güvenlik olayları |

## 13. Proje Phasing (Aşamalandırma)

### Phase 1 - Temel (MVP)
- Tedarikçi, Ürün, Müşteri CRUD
- Stok yönetimi (giriş/çıkış)
- FIFO lot seçimi
- Temel raporlama

### Phase 2 - Üretim ve İzlenebilirlik
- Üretim emri ve takibi
- Lot izlenebilirliği
- Detaylı raporlama

### Phase 3 - İleri Özellikler
- Otomatik uyarı sistemi
- Performans analitiği
- Gelişmiş raporlama (dashboard)

### Phase 4 - Optimizasyon
- Performans iyileştirmeleri
- Mobil uygulama
- Entegrasyonlar

---

## 14. Kabul Kriterleri

### 14.1 Fonksiyonel Kabul Kriterleri
- [ ] Tüm CRUD işlemleri doğru çalışır
- [ ] FIFO mantığı doğru uygulanır
- [ ] Lot izlenebilirliği eksiksiz çalışır
- [ ] Tüm raporlar doğru veri gösterir
- [ ] Yedekleme/geri dönüş başarılı

### 14.2 Performans Kriterleri
- Sayfa yüklenme süresi < 2 saniye
- Veri kaydetme < 1 saniye
- Rapor oluşturma < 5 saniye (1 yıllık veri)

### 14.3 Güvenlik Kriterleri
- Yetkisiz erişim engellenmeli
- Şifreler güvenli saklanmalı
- Audit log tutulmalı

---

## 15. KVKK Uyumluluğu (Kişisel Verilerin Korunması Kanunu)

### 15.1 Kişisel Veri Envanteri
Sistem, aşağıdaki kişisel veri kategorilerini işlemektedir:

| Veri Kategorisi | Veri Örnekleri | İşleme Amacı | Hukuki Sebep |
|----------------|----------------|--------------|--------------|
| Kimlik Bilgileri | Ad, soyad, TCKN | Müşteri/Tedarikçi tanımlama | Sözleşme + İcra yükümlülüğü |
| İletişim Bilgileri | Telefon, e-posta, adres | İletişim ve bildirim | Meşru menfaat + Onay |
| Kurumsal Tanımlayıcılar | Vergi no, firma iletişim bilgileri | Müşteri/tedarikçi tanımlama | Sözleşme + uygulanabilir yasal yükümlülük |
| İşlem Güvenliği | IP adresi, son giriş, login log | Güvenlik ve denetim | Yasal yükümlülük |
| Çalışan Verileri | Departman, unvan, doğum tarihi | İK yönetimi | İş sözleşmesi |

### 15.2 Veri Sahibi Hakları
| Hak | Açıklama | Yanıt Süresi |
|-----|----------|-------------|
| Bilgi Alma | Kişisel verilerin işlenip işlenmediğini öğrenme | 15 gün |
| İşlenme Bilgisini Alma | Verilerin işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme | 15 gün |
| Düzeltme | Yanlış/eksik verilerin düzeltilmesini talep etme | 15 gün |
| Silme | Verilerin KVKK m. 7'ye göre silinmesini talep etme | 15 gün |
| Anonim Hale Getirme | Verilerin bir daha geri dönüştürülemeyecek şekilde anonim hale getirilmesi | 30 gün |
| İtiraz | Kanuna aykırı işleme sebebiyle itiraz hakkı | 15 gün |

### 15.3 Saklama Süreleri
| Veri Türü | Saklama Süresi | Silme Yöntemi |
|-----------|---------------|---------------|
| Müşteri kişisel verileri | Sözleşme sona erdikten sonra 10 yıl | Güvenli silme |
| Tedarikçi kişisel verileri | Sözleşme sona erdikten sonra 10 yıl | Güvenli silme |

| Sistemsel log kayıtları | 5 yıl | Otomatik silme |
| Çerez ve oturum verileri | Oturum süresi + 1 yıl | Otomatik temizleme |

### 15.4 Veri İşleyen Sözleşmesi (VIS)
Harici hizmet sağlayıcıları (e-posta, bulut depolama vb.) ile KVKK m. 12 uyarınca **Veri İşleyen Sözleşmesi** imzalanmalıdır. Sözleşmede yer alması gereken asgari hususlar:

| Madde | İçerik |
|-------|--------|
| Veri İşlemenin Konusu | Hangi verilerin, hangi amaçla işleneceği |
| Süre | Sözleşme süresi ve veri saklama süresi |
| Güvenlik Tedbirleri | Teknik ve idari güvenlik önlemleri |
| Alt İşleyen Kısıtlaması | Alt işleyen kullanımı için açık izin |
| Veri İhlali Bildirimi | 72 saat içinde bildirim yükümlülüğü |
| Denetim Hakkı | Periyodik denetim hakkının saklı tutulması |

---

## 16. Gıda Güvenliği Yönetmeliği

### 16.1 Türk Gıda Kodeksi Gereksinimleri
Sistem, 5996 sayılı Veteriner Hizmetleri, Gıda ve Yem Kanunu ve ilgili Türk Gıda Kodeksi tebliğlerine uyum sağlamalıdır.

#### 16.1.1 Zorunlu Etiket Bilgileri
| Alan | Açıklama | Yasal Dayanak |
|------|----------|--------------|
| Ürün adı | Ürünün cinsi ve türü | TGK Etiketleme Tebliği |
| İçindekiler | Azami %2'lik sıralama kuralı | TGK İçindekiler Listesi Tebliği |
| Net miktar | Ağırlık veya hacim | Ölçü ve Ağırlıklar Tebliği |
| Son tüketim tarihi | GG.AA.YYYY formatı | TGK Genel Etiketleme Tebliği |
| Saklama koşulları | Sıcaklık ve nem gereksinimleri | Ürüne özel tebliğ |
| Üretici bilgileri | Ad, adres, şehir | TGK Genel Etiketleme Tebliği |
| Lot numarası | Üretim partisi takibi | TGK İzlenebilirlilik Tebliği |
| Menşe ülke | Origin country | TGK Genel Etiketleme Tebliği |

#### 16.1.2 Özel Ürün Gereksinimleri (Bal ve Kurutulmuş Meyve)
| Ürün Kategorisi | Ek Gereksinimler |
|----------------|------------------|
| Bal | Çiçek balı/kekik balı vb. menşe, diastaz sayısı, HMF değeri, proxid değeri |
| Kurutulmuş Kayısı | SO₂ kullanımı (varsa), sorbat (varsa), kuru madde oranı |
| Kurutulmuş Üzüm | Sülfit içeriği, sorbat, meyve asidi |
| Tüm kurutulmuş meyveler | Nem oranı (%15-25 arası ürüne göre), aflatoksin sınır değerleri |

### 16.2 İzlenebilirlilik Kuralları
#### 16.2.1 Lot Takip Zinciri
| Aşama | Takip Edilecek Bilgi | Sorumlu |
|-------|---------------------|---------|
| Hammadde Girişi | Tedarikçi, lot no, tarih, miktar, kalite belgesi | Depo Sorumlusu |
| Üretim | Kaynak lot(lar), üretim tarihi, mamul lot no | Üretim Sorumlusu |
| Depolama | Lot no, konum, sıcaklık/nem kaydı | Depo Sorumlusu |
| Dağıtım | Mamul lot no, müşteri, teslimat tarihi | Lojistik |

#### 16.2.2 İzlenebilirlilik Belge Zinciri
Her satış işlemiyle birlikte aşağıdaki bilgiler eşleşmelidir:
- Satış/teslimat kaydı ve harici teslimat referansı ↔ Lot no ↔ Üretim emri ↔ Hammadde lot(lar) ↔ Tedarikçi deklarasyonu

### 16.3 Geri Çağırma (Recall) Prosedürü
```
┌──────────────────────────────────────────────────────────┐
│                    GERİ ÇAĞIRMA İŞ AKIŞI                 │
├──────────────────────────────────────────────────────────┤
│ Adım 1: Sorun Tespiti                                    │
│   • Kalite kontrol sonucu / müşteri şikayeti /          │
│     resmi bildirim                                        │
│   → Lot numarası ve ürün grubu belirlenir              │
│                                                          │
│ Adım 2: Risk Değerlendirmesi                            │
│   • Tıbbi/alhıj sağlık riski → Class 1 (24 saat)       │
│   • Ciddi kalite sorunu → Class 2 (72 saat)            │
│   • Genel kalite sorunu → Class 3 (1 hafta)             │
│                                                          │
│ Adım 3: Dağıtım Tespiti                                  │
│   • Sistemden lot bazlı müşteri listesi çıkarılır      │
│   • Dağıtım kanalları belirlenir                        │
│                                                          │
│ Adım 4: Geri Çağırma Bildirimi                         │
│   • Bakanlığa bildirim (web sitesi, e-post)            │
│   • Müşterilere doğrudan bilgilendirme                 │
│   • Yetkililere raporlama                               │
│                                                          │
│ Adım 5: Ürün İmhası / Düzeltici Faaliyet               │
│   • İade alınan ürünlerin imhası                       │
│   • Kök neden analizi                                   │
│   • Süreç düzeltici faaliyet planı                     │
│                                                          │
│ Adım 6: Doğrulama                                       │
│   • Geri çağırma etkinliğinin kontrolü                 │
│   • Belgelendirme ve raporlama                         │
└──────────────────────────────────────────────────────────┘
```

| Sınıf | Risk Seviyesi | Bildirim Süresi | Örnek |
|-------|--------------|-----------------|-------|
| Class 1 | Yüksek (sağlık riski) | 24 saat | Aflatoksin bulaşması |
| Class 2 | Orta (ciddi kalite) | 72 saat | Yabancı madde tespiti |
| Class 3 | Düşük (genel kalite) | 1 hafta | Etiket hatası |

---

## 17. Denetim İzi (Audit Trail) Gereksinimleri

### 17.1 Denetim Günlüğü Kapsamı
Tüm sistem işlemleri aşağıdaki bilgilerle kaydedilmelidir:

| Alan | Açıklama | Örnek |
|------|----------|-------|
| İşlem zaman damgası | UTC olarak kesin zaman | 2026-07-29T14:32:05Z |
| Kullanıcı kimliği | İşlemi yapan kullanıcı | kullanici_id, rol |
| İşlem türü | CREATE, UPDATE, DELETE, READ, LOGIN | LOGIN, STOK_GIRIS |
| Etkilenen kaynak | Tablo adı + kayıt ID | stok_karti:abc-123 |
| Eski değer | Güncelleme/iptal öncesi | {"miktar": 100} |
| Yeni değer | Güncelleme/iptal sonrası | {"miktar": 95} |
| IP adresi | İşlemin yapıldığı IP | 192.168.1.10 |
| Oturum ID | Benzersiz oturum tanımlayıcı | sess_abc123 |
| Başarı/başarısız | İşlem sonucu | true / false |

### 17.2 Log Erişim Yetkileri
| Rol | Okuma | Yazma | Dışa Aktarım | Silme |
|-----|-------|-------|-------------|-------|
| ADMIN | ✓ (kendi verileri) | ✗ | ✗ | ✗ |
| DENETCI | ✓ (tüm loglar) | ✗ | ✓ | ✗ |
| SISTEM_YONETICISI | ✓ (tüm loglar) | ✗ | ✓ | ✗ |
| DIGER KULLANICILAR | ✗ | ✗ | ✗ | ✗ |

> **Kural:** Hiçbir kullanıcı kendi işlemlerinin denetim kaydını silemez veya değiştiremez.

### 17.3 Log İmzalama
Denetim günlüklerinin bütünlüğünü sağlamak için:
- Her log kaydı oluşturulduğunda **HMAC-SHA256** ile imzalanır
- İmza, kaydın `imza` alanında saklanır
- İmza anahtarı, sistem yöneticisi dışında biri tarafından bilinmemelidir
- Periyodik olarak (her 24 saatte bir) **blok zinciri tarzı zincirleme imza** oluşturulur
- Zincir bozulması durumunda otomatik uyarı üretilir

### 17.4 Saklama Süreleri (Yasal)
| Log Türü | Saklama Süresi | Yasal Dayanak |
|----------|---------------|--------------|
| Stok hareket logları | İşletme politikası + uygulanabilir gıda izlenebilirlik süresi | Operasyonel izlenebilirlik |
| Satış/teslimat logları | İşletme politikası + uygulanabilir gıda izlenebilirlik süresi | Operasyonel izlenebilirlik |
| Sistem güvenlik logları | 5 yıl | KVKK + 5651 sayılı kanun |
| Denetim izi (audit trail) | 10 yıl | İç denetim gereksinimi |
| Kalite kontrol kayıtları | 5 yıl | Gıda mevzuatı |
| Üretim logları | 5 yıl | Gıda mevzuatı |

---

## 18. Operasyonel Stok Maliyetlendirme Sınırı

Bu sistem yalnızca stok ve üretim için operasyonel maliyetleri hesaplar. Muhasebe kaydı, amortisman, vergi değerlemesi, KDV, beyanname, faturalama, ödeme, dekont ve GİB defterleri kapsam dışıdır ve harici muhasebe sisteminin sorumluluğundadır.

### 18.1 Operasyonel Maliyet Kuralları
- Hammadde ve mamul stok maliyeti, fiilen tüketilen lotların birim maliyetleri ile üretim maliyet bileşenlerinden hesaplanır.
- Fiziksel lot seçimi tüm çıkış/tüketimlerde FEFO+FIFO hibrit kuralına uyar; maliyet hesabı bu fiili tüketimleri esas alır.
- Fire maliyeti ve mamul birim maliyeti üretim kaydıyla ilişkilendirilir.
- Üretilen raporlar yönetim amaçlıdır; yasal defter, vergi beyannamesi veya muhasebe fişi niteliğinde değildir.
- İrsaliye veya harici teslimat belgesi referansları yalnızca teslimat ve izlenebilirlik bağı için saklanır.

### 18.2 Saklama Sınırı
- Stok hareketleri, kalite kayıtları, üretim lotları, satış/teslimat kayıtları ve harici teslimat referansları işletme politikası ile uygulanabilir gıda izlenebilirlik yükümlülüklerine göre saklanır.
- Fatura, ödeme, e-belge, KDV ve muhasebe belgelerinin saklama yükümlülüğü bu SRS'nin ve sistemin kapsamı dışındadır.

---

## Ekler

---

## 19. Veritabanı Migrasyon Stratejisi

### 19.1 Alembic Yapısı

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
- Migration dosya adı formatı: `YYYYP-MM-DD_HHMMSS_<acıklama>.py`
- Geriye dönük uyumluluk (backward compatibility) sağlanmalı
- Büyük veri manipülasyonları için `batch_alter` kullanılmalı

### 15.2 Sıfır Kesinti (Zero-Downtime) Migrasyon Adımları

**Aşama 1 — Kod Yayını (Blue-Green Deployment)**
1. Yeni kod + eski şema ile paralel ortam kur
2. Database migration'ı uygula (backward-compatible şekilde)
3. Yeni kodun eski şema ile çalıştığını doğrula
4. Trafiği yeni ortama aktar

**Aşama 2 — Şema Geçişi**
1. `expand` migration: Yeni kolonları nullable olarak ekle
2. Uygulama kodunu güncelle (yeni kolonu oku/yaz)
3. `contract` migration: Nullable kısıtlamaları kaldır, default değerler uygula

**Örnek Zero-Downtime Migration:**
```python
# 001_expand_add_phone.py
def upgrade():
    # Adım 1: Kolonu nullable olarak ekle
    op.add_column('kullanicilar',
        sa.Column('telefon', sa.String(20), nullable=True))
    
    # Adım 2: Mevcut verileri doldur (arka plan job)
    # bulk_update_mappings(...)

# 002_contract_telefon.py  
def upgrade():
    # Adım 3: Nullable kısıtlamasını kaldır
    op.alter_column('kullanicilar', 'telefon', nullable=False)
```

### 15.3 Geri Alma (Rollback) Planı

| Senaryo | Rollback Stratejisi |
|---------|---------------------|
| Şema hatası | `alembic downgrade -1` |
| Veri bütünlüğü sorunu | Manuel veri düzeltme + migration |
| Kritik hata | Snapshot'tan restore |

**Rollback Komutları:**
```bash
# Bir önceki versiyona dön
alembic downgrade -1

# Belirli bir revizyona dön
alembic downgrade <revision_id>

# Tüm migration'ları geri al
alembic downgrade base
```

### 15.4 Tohum (Seed) Veri Yönetimi

```
seed_data/
├── 01_temel_birimler.py         # Ölçü birimleri
├── 02_sistem_rolleri.py         # Varsayılan roller
├── 03_ornek_urunler.py          # Demo ürün kataloğu
└── 04_ornek_tedarikciler.py     # Demo tedarikçiler
```

**Seed Komutları:**
```bash
# Tüm seed verilerini yükle
flask seed run --env=development

# Belirli bir seed'i çalıştır
flask seed run --seed=01_temel_birimler

# Seed verilerini temizle (test için)
flask seed reset --seed=02_sistem_rolleri
```

---

## 20. ortam Değişkeni Yönetimi

### 20.1 .env Dosya Yapısı

**Staging Ortamı (`config/.env.staging`):**
```bash
# Uygulama
FLASK_ENV=staging
FLASK_DEBUG=0
LOG_LEVEL=INFO

# Veritabanı
DATABASE_URL=postgresql://user:pass@staging-db:5432/erp_staging

# Redis
REDIS_URL=redis://staging-redis:6379/0

# Güvenlik
SECRET_KEY=<staging-secret-key>
JWT_SECRET_KEY=<staging-jwt-secret>
SESSION_COOKIE_SECURE=true

# Harici Servisler
EMAIL_HOST=staging-smtp.example.com
SENTRY_DSN=<staging-sentry-dsn>
```

**Prodüksiyon Ortamı (`config/.env.production`):**
```bash
# Uygulama
FLASK_ENV=production
FLASK_DEBUG=0
LOG_LEVEL=WARNING

# Veritabanı
DATABASE_URL=postgresql://user:<vault-ref>@prod-db:5432/erp_production

# Redis
REDIS_URL=redis://prod-redis:6379/0

# Güvenlik
SECRET_KEY=<vault:secret/erp/production/secret-key>
JWT_SECRET_KEY=<vault:secret/erp/production/jwt-secret>
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=Strict

# Harici Servisler
EMAIL_HOST=smtp.example.com
SENTRY_DSN=<vault:secret/erp/production/sentry-dsn>
```

### 16.2 HashiCorp Vault Entegrasyonu

**Vault Path Yapısı:**
```
secret/erp/
├── production/
│   ├── database-password
│   ├── secret-key
│   ├── jwt-secret
│   └── sentry-dsn
├── staging/
│   └── ...
└── shared/
    └── backup-encryption-key
```

**Vault OKD/Kubernetes Entegrasyonu:**
```yaml
# external-secrets.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: erp-secrets
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
        key: secret/erp/production/database-password
        property: value
```

### 16.3 Gizli Anahtar (Secret) Rotasyonu

| Gizli Anahtar | Rotasyon Periyodu | Otomatik Yenileme |
|---------------|-------------------|-------------------|
| DATABASE_PASSWORD | 90 gün | ✓ |
| JWT_SECRET | 180 gün | Manuel |
| API_KEYS | 365 gün | ✓ |
| TLS_CERTIFICATES | 90 gün | ✓ (Let's Encrypt) |
| ENCRYPTION_KEYS | 365 gün | Manuel |

**Rotasyon Süreci:**
1. Yeni secret üret
2. Eski ve yeni secret'ı paralel kullan (grace period)
3. Uygulama yeniden başlat
4. Eski secret'ı devre dışı bırak
5. Audit log kontrol et

---

## 21. Yedekleme ve Doğrulama

### 21.1 Otomatik Geri Yükleme Testi

**Haftalık Geri Yükleme Testi Pipeline'ı:**
```yaml
# backup-restore-test.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-restore-test
spec:
  schedule: "0 2 * * 0"  # Her Pazar 02:00
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: restore-test
            image: erp-app:latest
            command:
            - /bin/bash
            - -c
            - |
              # En son yedeği indir
              aws s3 cp s3://erp-backups/$(date +%Y/%m/%d)/latest.sql.gz /tmp/
              
              # Checksum doğrula
              echo "$(sha256sum /tmp/latest.sql.gz)" > /tmp/latest.sql.gz.sha256
              aws s3 cp s3://erp-backups/$(date +%Y/%m/%d)/latest.sql.gz.sha256 /tmp/
              sha256sum -c /tmp/latest.sql.gz.sha256
              
              # Test veritabanında geri yükle
              PGPASSWORD=$TEST_DB_PASSWORD psql -h test-db -U user -d erp_test < <(zcat /tmp/latest.sql.gz)
              
              # Veri bütünlüğü kontrolü
              psql -h test-db -U user -d erp_test -c "SELECT COUNT(*) FROM kullanicilar;"
              
              echo "RESTORE_TEST_SUCCESS"
```

### 17.2 Checksum Doğrulama

**Yedekleme Sonrası Checksum İşlemi:**
```bash
# Yedekleme sırasında
pg_dump -U user -d erp_production | gzip > backup.sql.gz
sha256sum backup.sql.gz > backup.sql.gz.sha256
aws s3 cp backup.sql.gz s3://erp-backups/$(date +%Y%m%d)/
aws s3 cp backup.sql.gz.sha256 s3://erp-backups/$(date +%Y%m%d)/

# Geri yükleme sırasında doğrulama
aws s3 cp s3://erp-backups/$(date +%Y%m%d)/backup.sql.gz.sha256 /tmp/
sha256sum -c /tmp/backup.sql.gz.sha256 || exit 1
```

### 17.3 Belirli Noktaya Geri Dönme (Point-in-Time Recovery)

**PITR Konfigürasyonu:**
```bash
# PostgreSQL wal_archive aktif
# postgresql.conf
wal_level = replica
max_wal_senders = 3
archive_mode = on
archive_command = 'aws s3 cp %p s3://erp-wal-archive/%f'
```

**PITR Geri Yükleme Komutları:**
```bash
# Belirli bir zaman点'e geri dön
pg_restore \
  --dbname=erp_recovery \
  --verbose \
  --point-in-time='2026-07-28 14:30:00+03' \
  /var/lib/postgresql/backups/full_backup.tar
```

---

## 22. İzleme ve Grafana Uyarıları

### 22.1 Prometheus Metrikleri

**Uygulama Metrikleri:**
```python
from prometheus_client import Counter, Histogram, Gauge

# İşlem sayacı
http_requests_total = Counter(
    'http_requests_total',
    'Toplam HTTP isteği',
    ['method', 'endpoint', 'status']
)

# İşlem süresi
http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP istek süresi',
    ['method', 'endpoint']
)

# Aktif oturum sayısı
active_sessions = Gauge(
    'active_sessions',
    'Aktif oturum sayısı'
)

# Veritabanı bağlantı havuzu
db_pool_connections = Gauge(
    'db_pool_connections',
    'Veritabanı bağlantı sayısı',
    ['state']
)
```

**Kritik Sistem Metrikleri:**
```
# Veritabanı
pg_stat_database_tup_inserted_total
pg_stat_database_tup_updated_total
pg_stat_database_tup_deleted_total

# Bağlantı havuzu
db_pool_connections_available
db_pool_connections_in_use

# Stok seviyeleri
stock_level_critical{urun_id="..."}
stock_level_warning{urun_id="..."}
```

### 18.2 Grafana Uyarı Eşik Değerleri

**Kritik (P1) Uyarılar:**
| Uyarı Adı | Koşul | Eşik | Action |
|-----------|-------|------|--------|
| Veritabanı Bağlantısı Kesildi | `pg_up == 0` | 0 | Anlık bildirim + otomatik failover |
| Disk Doluluğu | `disk_usage_percent > 90` | %90 | Yedekleme tetikle |
| Yanıt Süresi Kritik | `http_request_duration_seconds > 5` | 5sn | Sistem restart |
| Yetkisiz Giriş Denemesi | `login_failures_total > 10` | 10/dk | IP blokla |

**Yüksek (P2) Uyarılar:**
| Uyarı Adı | Koşul | Eşik | Action |
|-----------|-------|------|--------|
| API Yanıt Süresi | `http_request_duration_seconds > 2` | 2sn | Log topla |
| CPU Kullanımı | `cpu_usage_percent > 80` | %80 | Scale horizontal |
| Bellek Kullanımı | `memory_usage_percent > 85` | %85 | Clear cache |
| Stok Kritik Seviye | `stock_level < min_stock` | Min | Sipariş oluştur |
| Yedekleme Başarısız | `backup_last_success_timestamp < now - 25h` | 25 saat | Manuel müdahale |

**Bilgilendirme (P3) Uyarıları:**
| Uyarı Adı | Koşul | Eşik |
|-----------|-------|------|
| Periyodik Rapor | CRON | Haftalık |
| Stok Yenileme Uyarısı | `stock_level < reorder_point` | — |
| Sistem Sağlık Durumu | Heartbeat | 5 dakika |
| Kullanıcı Aktivasyonu Gerekli | `inactive_days > 30` | 30 gün |

### 18.3 Grafana Dashboard JSON (Özet)
```json
{
  "dashboard": {
    "title": "ERP Sistemi Genel Bakış",
    "panels": [
      {
        "title": "Sistem Sağlık Durumu",
        "type": "stat",
        "targets": [
          {"expr": "up{service='erp-api'}"},
          {"expr": "pg_up"}
        ]
      },
      {
        "title": "HTTP İstek Süreleri (P50/P95/P99)",
        "type": "graph",
        "targets": [
          {"expr": "histogram_quantile(0.50, http_request_duration_seconds)"},
          {"expr": "histogram_quantile(0.95, http_request_duration_seconds)"},
          {"expr": "histogram_quantile(0.99, http_request_duration_seconds)"}
        ]
      },
      {
        "title": "Stok Kritik Seviyeler",
        "type": "table",
        "targets": [
          {"expr": "stock_level_critical"}
        ]
      }
    ]
  }
}
```

---

## 23. Kubernetes Kaynak Limitleri

### 23.1 LimitRange

```yaml
# limitrange-defaults.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: erp-limits
  namespace: erp-production
spec:
  limits:
  # Konteyner başına varsayılan limitler
  - max:
      cpu: "4"
      memory: 8Gi
    min:
      cpu: 100m
      memory: 128Mi
    default:
      cpu: 500m
      memory: 1Gi
    defaultRequest:
      cpu: 250m
      memory: 512Mi
    type: Container
  
  # Pod başına toplam limitler
  - max:
      cpu: "8"
      memory: 16Gi
    min:
      cpu: 200m
      memory: 256Mi
    type: Pod
```

### 19.2 ResourceQuota

```yaml
# resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: erp-quota
  namespace: erp-production
spec:
  hard:
    # İşlem kaynakları
    requests.cpu: "16"
    requests.memory: 32Gi
    limits.cpu: "32"
    limits.memory: 64Gi
    
    # Nesne sayıları
    pods: 50
    services: 20
    persistentvolumeclaims: 10
    secrets: 30
    configmaps: 20
    
    # Storage
    requests.storage: 100Gi
    persistentvolumeclaims.storageclass: "standard": 10
```

### 19.3 Vertical Pod Autoscaler (VPA)

```yaml
# vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: erp-api-vpa
  namespace: erp-production
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: erp-api
  updatePolicy:
    updateMode: "Off"  # Öneri modu (RollingUpdate için "Auto")
  resourcePolicy:
    containerPolicies:
    - containerName: erp-api
      minAllowed:
        cpu: 250m
        memory: 512Mi
      maxAllowed:
        cpu: 4
        memory: 8Gi
      controlledResources: ["cpu", "memory"]
      controlledValues: "RequestsAndLimits"
```

### 19.4 Production Ortamı Kaynak Önerileri

| Bileşen | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|-------------|------------|-----------------|--------------|
| erp-api | 500m | 2 | 1Gi | 4Gi |
| erp-worker | 1 | 4 | 2Gi | 8Gi |
| erp-scheduler | 250m | 1 | 512Mi | 2Gi |
| PostgreSQL | 2 | 8 | 4Gi | 16Gi |
| Redis | 500m | 2 | 2Gi | 8Gi |
| Prometheus | 1 | 4 | 2Gi | 8Gi |
| Grafana | 250m | 1 | 256Mi | 1Gi |

---

## Ekler

### A) Terimler Sözlüğü
| Terim | Açıklama |
|-------|----------|
| FIFO | First In First Out - İlk giren ilk çıkar |
| Lot/Parti | Belirli bir üretim veya tedarik birimi |
| Hammadde | İşlenmemiş, ham ürün |
| Mamul | Üretilmiş, satışa hazır ürün |
| SKU | Stock Keeping Unit - Stok Takip Numarası |
| RPO | Recovery Point Objective - Veri kaybı tolere edilebilir süre |
| RTO | Recovery Time Objective - Sistem kurtarma süresi |

### B) Referans Ekranlar
(Dokümana eklenecek wireframe/mockup'lar)

---

**Doküman Bilgisi:**
- Versiyon: 1.0
- Tarih: 2026-07-27
- Yazar: [Sistemi Hazırlayan]
- Durum: Taslak

---

## 24. Kubernetes Eksik Manifestler

Sistem, Kubernetes üzerinde çalışacak şekilde tasarlanmıştır. Aşağıda eksik veya ayrıntılandırılmamış manifest dosyaları sunulmaktadır.

### 20.1 Ingress — Dış Erişim ve Rotalama

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
    # TLS termination
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    # Rate limiting
    nginx.ingress.kubernetes.io/limit-rps: "100"
    nginx.ingress.kubernetes.io/limit-connections: "50"
    # CORS
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://erp.example.com"
    nginx.ingress.kubernetes.io/cors-allow-methods: "PUT, GET, POST, DELETE, PATCH, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-headers: "Authorization,Content-Type,Accept,Origin,User-Agent,Cache-Control,Keep-Alive,X-Requested-With"
    nginx.ingress.kubernetes.io/cors-max-age: "1728000"
    # Body size
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    # Timeouts
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "30"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    # WebSocket
    nginx.ingress.kubernetes.io/use-regex: "true"
    # Security headers
    nginx.ingress.kubernetes.io/configuration-snippet: |
      add_header X-Frame-Options "SAMEORIGIN" always;
      add_header X-Content-Type-Options "nosniff" always;
      add_header X-XSS-Protection "1; mode=block" always;
      add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
      add_header Referrer-Policy "strict-origin-when-cross-origin" always;
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - erp.example.com
        - api.erp.example.com
        - admin.erp.example.com
      secretName: erp-tls-secret
  rules:
    # API endpoints
    - host: api.erp.example.com
      http:
        paths:
          - path: /api/v1/
            pathType: Prefix
            backend:
              service:
                name: erp-api-service
                port:
                  number: 8000
          - path: /admin/api/
            pathType: Prefix
            backend:
              service:
                name: erp-api-service
                port:
                  number: 8000
          - path: /health
            pathType: Exact
            backend:
              service:
                name: erp-api-service
                port:
                  number: 8000
          - path: /metrics
            pathType: Exact
            backend:
              service:
                name: prometheus
                port:
                  number: 9090
    # Frontend
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
    # Admin arayüzü
    - host: admin.erp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: erp-admin-service
                port:
                  number: 80
---
# Staging Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: erp-ingress-staging
  namespace: erp-staging
  labels:
    app: erp
    environment: staging
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

### 20.2 Service — Servis Tanımları

```yaml
# service-erp-api.yaml
apiVersion: v1
kind: Service
metadata:
  name: erp-api-service
  namespace: erp-production
  labels:
    app: erp-api
    environment: production
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8000"
    prometheus.io/path: "/metrics"
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 8000
      targetPort: 8000
      protocol: TCP
    - name: grpc
      port: 8001
      targetPort: 8001
      protocol: TCP
  selector:
    app: erp-api
---
# service-erp-frontend.yaml
apiVersion: v1
kind: Service
metadata:
  name: erp-frontend-service
  namespace: erp-production
  labels:
    app: erp-frontend
    environment: production
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 80
      targetPort: 80
      protocol: TCP
  selector:
    app: erp-frontend
---
# service-erp-worker.yaml
apiVersion: v1
kind: Service
metadata:
  name: erp-worker-service
  namespace: erp-production
  labels:
    app: erp-worker
spec:
  type: ClusterIP
  ports:
    - name: flower
      port: 5555
      targetPort: 5555
      protocol: TCP
  selector:
    app: erp-worker
---
# service-postgresql.yaml (ClusterIP — dışarıdan erişim yok)
apiVersion: v1
kind: Service
metadata:
  name: postgresql-service
  namespace: erp-production
  labels:
    app: postgresql
  annotations:
    prometheus.io/scrape: "false"
spec:
  type: ClusterIP
  clusterIP: None  # Headless service — StatefulSet ile kullanılır
  ports:
    - name: postgres
      port: 5432
      targetPort: 5432
      protocol: TCP
  selector:
    app: postgresql
---
# service-redis.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: erp-production
  labels:
    app: redis
spec:
  type: ClusterIP
  clusterIP: None  # Headless for StatefulSet
  ports:
    - name: redis
      port: 6379
      targetPort: 6379
      protocol: TCP
    - name: redis-sentinel
      port: 26379
      targetPort: 26379
      protocol: TCP
  selector:
    app: redis
---
# NodePort Servis (acil erişim için — production'da Ingress tercih edilmeli)
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
      protocol: TCP
  selector:
    app: erp-api
```

### 20.3 ConfigMap — Uygulama Yapılandırması

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
  # Django settings
  DJANGO_SETTINGS_MODULE: "config.settings.production"
  PYTHONUNBUFFERED: "1"
  LOG_LEVEL: "INFO"
  LOG_FORMAT: "json"
  
  # Application
  ALLOWED_HOSTS: "erp.example.com,api.erp.example.com,admin.erp.example.com"
  CORS_ALLOWED_ORIGINS: "https://erp.example.com"
  
  # Database
  DATABASE_HOST: "postgresql-service"
  DATABASE_PORT: "5432"
  DATABASE_NAME: "erp_db"
  DATABASE_POOL_SIZE: "20"
  DATABASE_MAX_OVERFLOW: "10"
  
  # Redis / Celery
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  CELERY_BROKER_URL: "redis://redis-service:6379/0"
  CELERY_RESULT_BACKEND: "redis://redis-service:6379/1"
  CELERY_TASK_TRACK_STARTED: "true"
  CELERY_TASK_TIME_LIMIT: "3600"
  CELERY_BEAT_SCHEDULE_FIL: "/tmp/celerybeat-schedule"
  
  # Storage
  AWS_S3_BUCKET_NAME: "erp-media-bucket"
  AWS_S3_REGION: "eu-central-1"
  MEDIA_URL: "/media/"
  STATIC_URL: "/static/"
  
  # Monitoring
  PROMETHEUS_ENABLED: "true"
  SENTRY_DSN: ""  # Production'da doldurulacak
  SENTRY_ENVIRONMENT: "production"
  
  # Feature Flags
  FEATURE_STOCK_ALERT: "true"
  FEATURE_SUPPLIER_PORTAL: "false"
  FEATURE_ADVANCED_ANALYTICS: "true"
  FEATURE_LOT_PHOTO: "true"
  FEATURE_MULTI_CURRENCY: "false"
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
    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=1r/s;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;
```

### 20.4 Secret — Hassas Veri Yönetimi

```yaml
# secret-erp.yaml
apiVersion: v1
kind: Secret
metadata:
  name: erp-secrets
  namespace: erp-production
type: Opaque
stringData:
  # Veritabanı
  DATABASE_USER: "erp_user"
  DATABASE_PASSWORD: "<DB_PASSWORD>"
  DATABASE_SECRET_KEY: "<DB_SECRET_KEY>"
  
  # Redis
  REDIS_PASSWORD: "<REDIS_PASSWORD>"
  
  # Django
  DJANGO_SECRET_KEY: "<DJANGO_SECRET_KEY>"
  DJANGO_ADMIN_URL: "secure-admin/"
  
  # AWS / S3
  AWS_ACCESS_KEY_ID: "<AWS_ACCESS_KEY>"
  AWS_SECRET_ACCESS_KEY: "<AWS_SECRET_KEY>"
  
  # E-posta
  EMAIL_HOST_USER: "noreply@erp.example.com"
  EMAIL_HOST_PASSWORD: "<EMAIL_PASSWORD>"
  
  # Sentry
  SENTRY_DSN: "<SENTRY_DSN>"
  
  # API Keys
  API_RATE_LIMIT_KEY: "<RATE_LIMIT_KEY>"
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
  #   --cert=path/to/cert.pem \
  #   --key=path/to/key.pem
  # veya cert-manager ile otomatik
  tls.crt: <BASE64_CERT>
  tls.key: <BASE64_KEY>
```

### 20.5 PodDisruptionBudget — Kesinti Önleme

```yaml
# pdb-erp-api.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: erp-api-pdb
  namespace: erp-production
  labels:
    app: erp-api
spec:
  # En az %60 pod çalışır durumda olmalı (MaxUnavailable ile birlikte kullanılamaz)
  minAvailable: "60%"
  selector:
    matchLabels:
      app: erp-api
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: erp-worker-pdb
  namespace: erp-production
  labels:
    app: erp-worker
spec:
  minAvailable: "50%"
  selector:
    matchLabels:
      app: erp-worker
---
# PostgreSQL — yüksek öncelikli, en az 2 replica çalışmalı
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: postgresql-pdb
  namespace: erp-production
  labels:
    app: postgresql
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: postgresql
---
# Redis Sentinel — en az 2 node çalışmalı
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: redis-pdb
  namespace: erp-production
  labels:
    app: redis
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: redis
---
# Global API PDB (tüm API podları için)
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: erp-api-global-pdb
  namespace: erp-production
spec:
  maxUnavailable: 1  # Aynı anda sadece 1 pod bakımda olabilir
  selector:
    matchLabels:
      tier: api
```

---

## 25. CI/CD Pipeline — GitHub Actions

Sistem, GitHub Actions ile otomatik build, test ve deploy süreçlerini yürütür.

### 21.1 Pipeline Genel Mimarisi

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           CI/CD PIPELINE GENEL AKIŞ                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  [Push / PR] ──► [Checkout] ──► [Test Stage] ──► [Build Stage]               │
│       │                                      │                                │
│       │                                      ▼                                │
│       │                              [Container Build]                       │
│       │                                      │                                │
│       │                                      ▼                                │
│       │                              [Push to Registry]                      │
│       │                                      │                                │
│       │                                      ▼                                │
│       │                         [Deploy to STAGING]                          │
│       │                                      │                                │
│       │                                      ▼                                │
│       │                         [Staging Tests]                              │
│       │                                      │                                │
│       │                                      ▼                                │
│       │                         [Approval Gate]  ◄── Manuel Onay              │
│       │                                      │                                │
│       │                                      ▼                                │
│       │                         [Deploy to PRODUCTION]                       │
│       │                                      │                                │
│       │                                      ▼                                │
│       │                         [Health Check & Notify]                      │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 21.2 GitHub Actions Workflow — `ci-cd.yml`

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
        description: 'Deploy target (staging/production)'
        required: true
        default: 'staging'

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ══════════════════════════════════════════════════════════════════════════
  # STAGE 1: TEST
  # ══════════════════════════════════════════════════════════════════════════
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
        ports:
          - 5432:5432
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
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Cache pip packages
        uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
          restore-keys: |
            ${{ runner.os }}-pip-

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install -r requirements-dev.txt

      - name: Run migrations
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/erp_test
        run: |
          python manage.py migrate --noinput

      - name: Run tests with coverage
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/erp_test
          REDIS_URL: redis://localhost:6379/0
          DJANGO_SECRET_KEY: test-secret-key-for-ci
        run: |
          coverage run --source='.' manage.py test --verbosity=2
          coverage report --fail-under=80
          coverage xml

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage.xml
          fail_ci_if_error: true

      - name: Run security checks
        run: |
          pip install bandit safety
          bandit -r ./erp -f txt -o bandit_report.txt || true
          safety check --json --output safety_report.json || true

      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: |
            bandit_report.txt
            safety_report.json
          retention-days: 30

  # ══════════════════════════════════════════════════════════════════════════
  # STAGE 2: BUILD
  # ══════════════════════════════════════════════════════════════════════════
  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push'
    
    outputs:
      image_tag: ${{ steps.meta.outputs.tags }}
      sha_tag: ${{ env.IMAGE_TAG }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=,suffix=,format=short
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push API image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            BUILD_SHA=${{ github.sha }}
            BUILD_DATE=${{ github.event.head_commit.timestamp }}
          targets: api

      - name: Build and push Worker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}-worker
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            BUILD_SHA=${{ github.sha }}
            BUILD_DATE=${{ github.event.head_commit.timestamp }}
          targets: worker

      - name: Build and push Frontend image
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ${{ steps.meta.outputs.tags }}-frontend
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          image: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          format: spdx-json
          output-file: sbom.spdx.json

      - name: Upload SBOM
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.spdx.json
          retention-days: 90

  # ══════════════════════════════════════════════════════════════════════════
  # STAGE 3: DEPLOY TO STAGING
  # ══════════════════════════════════════════════════════════════════════════
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop' || github.event_name == 'workflow_dispatch'
    environment: staging

    steps:
      - name: Checkout kubeconfig
        uses: actions/checkout@v4
        with:
          repository: example-org/k8s-config
          path: ./k8s-config
          token: ${{ secrets.K8S_CONFIG_REPO_TOKEN }}

      - name: Setup kubectl
        uses: azure/setup-kubectl@v4
        with:
          version: '1.28'

      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBE_CONFIG_STAGING }}" | base64 -d > kubeconfig
          echo "KUBECONFIG=$(pwd)/kubeconfig" >> $GITHUB_ENV

      - name: Deploy to Staging
        run: |
          # Namespace oluştur (yoksa)
          kubectl create namespace erp-staging --dry-run=client -o yaml | kubectl apply -f -
          
          # ConfigMap deploy
          kubectl apply -f k8s-config/staging/configmap.yaml -n erp-staging
          
          # Secrets (sadece kritik olanlar — büyük kısmı Vault'tan)
          kubectl apply -f k8s-config/staging/secrets-override.yaml -n erp-staging
          
          # Helm deployment
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

      - name: Run smoke tests
        run: |
          API_URL="https://staging-api.erp.example.com"
          curl -f "${API_URL}/health/" || exit 1
          curl -f "${API_URL}/api/v1/urun/" || exit 1

      - name: Notify staging deployment
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "*Staging Deployment Başarılı* :white_check_mark:",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Staging Deployment*\n• Commit: `${{ github.sha }}`\n• Branch: `${{ github.ref_name }}`\n• Yazar: `${{ github.actor }}`"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK

  # ══════════════════════════════════════════════════════════════════════════
  # STAGE 4: APPROVAL GATE (PRODUCTION)
  # ══════════════════════════════════════════════════════════════════════════
  approval-prod:
    name: Production Approval Gate
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://erp.example.com
    steps:
      - name: Request approval
        run: |
          echo "Production deployment requires manual approval from a designated approver."
          echo "Required reviewers: @devops-team or @erp-maintainers"
          echo "Approvers will receive a GitHub Actions approval request."

  # ══════════════════════════════════════════════════════════════════════════
  # STAGE 5: DEPLOY TO PRODUCTION
  # ══════════════════════════════════════════════════════════════════════════
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: approval-prod
    environment: production
    if: github.ref == 'refs/heads/main'

    strategy:
      matrix:
        component: [api, worker, frontend]

    steps:
      - name: Checkout kubeconfig
        uses: actions/checkout@v4
        with:
          repository: example-org/k8s-config
          path: ./k8s-config

      - name: Setup kubectl
        uses: azure/setup-kubectl@v4
        with:
          version: '1.28'

      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBE_CONFIG_PRODUCTION }}" | base64 -d > kubeconfig
          echo "KUBECONFIG=$(pwd)/kubeconfig" >> $GITHUB_ENV

      - name: Pre-deployment backup
        run: |
          kubectl exec -n erp-production deployment/erp-api -- python manage.py dbbackup || true
          kubectl exec -n erp-production statefulset/postgresql -- pg_dumpall -U postgres > pre_deploy_backup_$(date +%Y%m%d_%H%M%S).sql

      - name: Deploy to Production
        run: |
          # Blue-Green veya Rolling Update stratejisi
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
          # Health check
          for i in {1..10}; do
            if curl -sf "https://api.erp.example.com/health/"; then
              echo "Health check passed"
              break
            fi
            echo "Waiting for health check... attempt $i"
            sleep 10
          done
          
          # Smoke tests
          curl -sf "https://api.erp.example.com/api/v1/stok/" | jq . || exit 1

      - name: Notify production deployment
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "*Production Deployment Başarılı* :rocket:",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Production Deployment*\n• Commit: `${{ github.sha }}`\n• Commit Message: `${{ github.event.head_commit.message }}`\n• Yazar: `${{ github.actor }}`"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK

  # ══════════════════════════════════════════════════════════════════════════
  # STAGE 6: DEPENDENCY VULNERABILITY SCAN (Her zaman çalışır)
  # ══════════════════════════════════════════════════════════════════════════
  security-scan:
    name: Dependency Vulnerability Scan
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Run OWASP Dependency Check
        uses: securego/gosec-action@master

      - name: Check for vulnerable Python packages
        run: |
          pip install pip-audit
          pip-audit --format=json --output=pip-audit.json || true
```

### 21.3 Environment Protection Rules

GitHub repository'de aşağıdaki environment koruma kuralları tanımlanmalıdır:

| Environment | Required Reviewers | Deployment Branch | Secrets |
|------------|-------------------|-----------------|---------|
| staging | 1 developer | develop | KUBE_CONFIG_STAGING, STAGING_DB_PASSWORD |
| production | 2 (1 DevOps + 1 Tech Lead) | main | KUBE_CONFIG_PRODUCTION, PROD_DB_PASSWORD |

### 21.4 Pipeline Değişkenleri ve Secret'lar

```
# GitHub Secrets (Production)
KUBE_CONFIG_PRODUCTION        → Base64-encoded kubeconfig
PROD_DB_PASSWORD              → PostgreSQL production password
REDIS_PROD_PASSWORD           → Redis production password
SLACK_WEBHOOK_URL             → Slack notification webhook
K8S_CONFIG_REPO_TOKEN         → Read-only token for k8s-config repo

# GitHub Secrets (Staging)
KUBE_CONFIG_STAGING           → Base64-encoded kubeconfig
STAGING_DB_PASSWORD           → PostgreSQL staging password

# GitHub Variables
REGISTRY                      → ghcr.io
K8S_CONFIG_REPO               → example-org/k8s-config
```

---

## 26. IaC — Altyapı Kodu (Terraform + Ansible)

### 22.1 Terraform — AWS Kaynakları

```hcl
# terraform/main.tf
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
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

# ─── VPC ────────────────────────────────────────────────────────────────────
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
  count             = 3
  vpc_id             = aws_vpc.erp_vpc.id
  cidr_block         = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone  = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = false
  tags = {
    Name = "erp-private-subnet-${count.index + 1}"
    Tier = "Private"
  }
}

resource "aws_subnet" "public_subnets" {
  count             = 2
  vpc_id             = aws_vpc.erp_vpc.id
  cidr_block         = cidrsubnet(var.vpc_cidr, 4, count.index + 10)
  availability_zone  = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = {
    Name = "erp-public-subnet-${count.index + 1}"
    Tier = "Public"
  }
}

resource "aws_internet_gateway" "erp_igw" {
  vpc_id = aws_vpc.erp_vpc.id
  tags = { Name = "erp-igw" }
}

resource "aws_nat_gateway" "nat_gateway" {
  count         = 2
  subnet_id     = aws_subnet.public_subnets[count.index].id
  connectivity_type = "public"
  tags = { Name = "erp-nat-${count.index + 1}" }
  depends_on = [aws_internet_gateway.erp_igw]
}

# ─── EKS Cluster ─────────────────────────────────────────────────────────────
resource "aws_eks_cluster" "erp_cluster" {
  name     = "erp-cluster-${var.environment}"
  role_arn = aws_iam_role.eks_cluster_role.arn
  version  = "1.28"
  
  vpc_config {
    subnet_ids              = concat(aws_subnet.private_subnets[*].id, aws_subnet.public_subnets[*].id)
    endpoint_public_access  = true
    public_access_cidrs     = var.allowed_cidrs
  }

  depends_on = [aws_iam_role_policy_attachment.eks_cluster_policy]
}

# ─── RDS PostgreSQL ───────────────────────────────────────────────────────────
resource "aws_db_instance" "postgresql" {
  identifier           = "erp-postgresql-${var.environment}"
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = var.db_instance_class
  allocated_storage    = 100
  max_allocated_storage = 500
  storage_encrypted    = true
  storage_type         = "gp3"
  
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.erp_subnet_group.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"
  
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  performance_insights_enabled = true
  deletion_protection          = var.environment == "production" ? true : false
  
  tags = {
    Name = "erp-postgresql-${var.environment}"
  }
}

resource "aws_db_subnet_group" "erp_subnet_group" {
  name       = "erp-db-subnet-group"
  subnet_ids = aws_subnet.private_subnets[*].id
  tags = { Name = "erp-db-subnet-group" }
}

# ─── ElastiCache Redis ───────────────────────────────────────────────────────
resource "aws_elasticacheReplicationGroup" "redis" {
  replication_group_id       = "erp-redis-${var.environment}"
  engine                      = "redis"
  engine_version              = "7.0"
  node_type                   = var.redis_node_type
  number_cache_clusters       = var.environment == "production" ? 2 : 1
  
  port                        = 6379
  parameter_group_name        = "default.redis7"
  
  security_group_ids          = [aws_security_group.redis_sg.id]
  subnet_group_name           = aws_elasticache_subnet_group.erp_redis_subnet.name
  
  automatic_failover_enabled   = var.environment == "production" ? true : false
  multi_az_enabled           = var.environment == "production" ? true : false
  
  at_rest_encryption_enabled  = true
  transit_encryption_enabled = true
  auth_token_enabled          = true
  
  snapshot_retention_limit   = 7
  snapshot_window           = "04:00-05:00"
  
  lifecycle {
    ignore_changes = [transit_encryption_enabled]
  }
}

resource "aws_elasticache_subnet_group" "erp_redis_subnet" {
  name       = "erp-redis-subnet"
  subnet_ids = aws_subnet.private_subnets[*].id
}

# ─── S3 Buckets ──────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "media_bucket" {
  bucket = "erp-media-${var.environment}-${data.aws_caller_identity.current.account_id}"
  
  tags = {
    Name = "erp-media-${var.environment}"
    Environment = var.environment
  }
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
    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class  = "STANDARD_IA"
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
    description     = "EKS Nodes to PostgreSQL"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "redis_sg" {
  name        = "erp-redis-sg"
  vpc_id      = aws_vpc.erp_vpc.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes_sg.id]
  }
}

resource "aws_security_group" "eks_nodes_sg" {
  name        = "erp-eks-nodes-sg"
  vpc_id      = aws_vpc.erp_vpc.id

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

# ─── IAM Roles ────────────────────────────────────────────────────────────────
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
```

```hcl
# terraform/variables.tf
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-central-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.medium"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "erp_db"
}

variable "allowed_cidrs" {
  description = "Allowed CIDR blocks for EKS API access"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
```

### 22.2 Terraform — GCP Kaynakları

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

# ─── GCP Network ─────────────────────────────────────────────────────────────
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

# ─── Cloud SQL PostgreSQL ─────────────────────────────────────────────────────
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
    
    lifecycle {
      ignore_changes = [settings[0].maintenance_window]
    }
  }
}

# ─── Cloud Memorystore Redis ──────────────────────────────────────────────────
resource "google_redis_instance" "redis" {
  name           = "erp-redis-${var.environment}"
  tier           = var.environment == "production" ? "STANDARD_HA" : "BASIC"
  memory_size_gb = var.redis_memory_gb
  region         = var.gcp_region
  network        = google_compute_network.erp_vpc.id
  
  redis_version  = "redis_7_0"
  
  transit_encryption_mode = "SERVER_AUTHENTICATION"
  
  persistence_config {
    persistence_mode = "RDB"
    rdb_next_save_time = "03:00"
    rdb_snapshot_period = "PERIODIC"
  }
}

# ─── GKE Cluster ─────────────────────────────────────────────────────────────
resource "google_container_cluster" "erp_cluster" {
  name     = "erp-cluster-${var.environment}"
  location = var.gcp_region
  network  = google_compute_network.erp_vpc.id
  subnetwork = google_compute_subnetwork.private_subnet.name
  
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
      
      service_account = google_service_account.erp_node_sa.email
      
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
    cluster_ipv4_cidr_block  = "10.4.0.0/16"
    services_ipv4_cidr_block = "10.0.0.0/20"
  }
  
  network_policy {
    enabled = true
  }
  
  vertical_pod_autoscaling {
    enabled = true
  }
}
```

### 22.3 Ansible — Sunucu Yapılandırması

```yaml
# ansible/playbooks/provision.yml
---
# Özet: Tüm application sunucularına ortak yapılandırma uygulanır
- name: Provision ERP Application Servers
  hosts: app_servers
  become: yes
  remote_user: ubuntu
  gather_facts: yes

  vars:
    erp_user: erp
    erp_home: /opt/erp
    erp_venv: /opt/erp/venv
    erp_log_dir: /var/log/erp

  tasks:
    # ─── Sistem güncelleme ──────────────────────────────────────────────────
    - name: Update apt cache and upgrade packages
      ansible.builtin.apt:
        update_cache: yes
        upgrade: full
        autoremove: yes
        autoclean: yes
      when: ansible_os_family == "Debian"

    # ─── Zaman senkronizasyonu (Chrony) ───────────────────────────────────
    - name: Install and configure Chrony NTP
      ansible.builtin.apt:
        name: chrony
        state: present
      notify: Restart chrony

    - name: Configure Chrony servers
      ansible.builtin.template:
        src: templates/chrony.conf.j2
        dest: /etc/chrony/chrony.conf
        mode: '0644'
      notify: Restart chrony

    # ─── Logrotate ─────────────────────────────────────────────────────────
    - name: Configure logrotate for ERP logs
      ansible.builtin.template:
        src: templates/logrotate-erp.j2
        dest: /etc/logrotate.d/erp
        mode: '0644'

    # ─── Fail2ban ──────────────────────────────────────────────────────────
    - name: Install and configure Fail2ban
      ansible.builtin.apt:
        name: fail2ban
        state: present

    - name: Configure Fail2ban
      ansible.builtin.template:
        src: templates/fail2ban-erp.conf.j2
        dest: /etc/fail2ban/jail.d/erp.conf
        mode: '0644'
      notify: Restart fail2ban

    # ─── Disk monitoring ───────────────────────────────────────────────────
    - name: Install Prometheus Node Exporter
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
# Özet: PostgreSQL sunucu yapılandırması
- name: Configure PostgreSQL Servers
  hosts: postgres_servers
  become: yes
  vars:
    postgres_version: "15"
    postgres_data_dir: "/var/lib/postgresql/{{ postgres_version }}/main"
    postgres_conf_dir: "/etc/postgresql/{{ postgres_version }}/main"
    postgres_backup_dir: "/var/backups/postgresql"

  tasks:
    - name: Install PostgreSQL
      ansible.builtin.apt:
        name:
          - postgresql-{{ postgres_version }}
          - postgresql-contrib-{{ postgres_version }}
          - postgresql-{{ postgres_version }}-pgext
        state: present

    - name: Configure PostgreSQL
      ansible.builtin.template:
        src: templates/postgresql.conf.j2
        dest: "{{ postgres_conf_dir }}/postgresql.conf"
        mode: '0644'
      notify: Restart PostgreSQL

    - name: Configure pg_hba.conf
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

    - name: Create ERP database and user
      become: yes
      become_user: postgres
      community.postgresql.postgresql_user:
        name: "{{ erp_db_user }}"
        password: "{{ erp_db_password }}"
        role_attr_flags: CREATEDB,LOGIN
      vars:
        ansible_python_interpreter: /usr/bin/python3

    - name: Create ERP database
      become: yes
      become_user: postgres
      community.postgresql.postgresql_db:
        name: "{{ erp_db_name }}"
        owner: "{{ erp_db_user }}"
        encoding: 'UTF8'
        locale: 'en_US.UTF-8'
      vars:
        ansible_python_interpreter: /usr/bin/python3

    - name: Setup PostgreSQL backup cron job
      ansible.builtin.cron:
        name: "PostgreSQL daily backup"
        hour: "3"
        minute: "0"
        user: postgres
        job: "/usr/bin/pg_dumpall -U postgres | gzip > {{ postgres_backup_dir }}/backup_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz"

  handlers:
    - name: Restart PostgreSQL
      ansible.builtin.systemd_service:
        name: postgresql
        state: restarted

---
# Özet: Redis sunucu yapılandırması
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

```yaml
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

```yaml
# ansible/roles/app_server/templates/redis.conf.j2
# Redis configuration template
bind {{ ansible_host }}
port 6379
protected-mode yes

# Memory management
maxmemory {{ redis_maxmemory | default('2gb') }}
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 100
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# Replication (production)
replica-read-only yes

# Security
requirepass {{ redis_password }}

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Slow log
slowlog-log-slower-than 10000
slowlog-max-len 128
```

---

## 27. Release Prosedürü

### 23.1 Yayın Süreci — Adım Adım

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        RELEASE PROCESS WORKFLOW                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  [1. Planlama] ──► [2. Kod Geliştirme] ──► [3. Feature Freeze]               │
│                                              │                                │
│                                              ▼                                │
│                                      [4. RC Testing]                          │
│                                              │                                │
│                                              ▼                                │
│                                      [5. Release Approval]                    │
│                                              │                                │
│                                              ▼                                │
│                                      [6. Production Deploy]                    │
│                                              │                                │
│                                              ▼                                │
│                                      [7. Post-Release Monitoring]              │
│                                              │                                │
│                                              ▼                                │
│                                      [8. Release Closure]                     │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Adım 1 — Planlama (Sprint Başında)**
1. Product Owner, release hedeflerini belirler
2. Team, release'e dahil edilecek story'leri seçer
3. Release notes taslağı oluşturulur
4. Risk değerlendirmesi yapılır
5. Rollback planı gözden geçirilir

**Adım 2 — Kod Geliştirme (Sprint Süresince)**
1. Feature branch'lerde geliştirme yapılır
2. Feature flag'ler kullanılarak kod stash'lenebilir (opsiyonel)
3. Her feature için unit ve integration test yazılır
4. Code review süreci tamamlanır
5. Feature branch, develop branch'ine merge edilir

**Adım 3 — Feature Freeze (Release -7 gün)**
1. Yeni özellik geliştirme durdurulur
2. Sadece bug fix ve dokümantasyon çalışması yapılır
3. RC (Release Candidate) branch oluşturulur: `release/v1.x.0-rc1`
4. Tüm testler CI'da çalıştırılır
5. Performance test başlatılır

**Adım 4 — RC Testing (Release -5 gün)**
1. RC, staging ortamına deploy edilir
2. QA ekibi detaylı test yapar
3. Bug'lar raporlanır ve önceliklendirilir
4. Kritik bug'lar düzeltilir → yeni RC oluşturulur
5. Regression test tamamlanır

**Adım 5 — Release Onay (Release -2 gün)**
1. DevOps, release notlarını son haline getirir
2. Tech Lead ve Product Owner release'i onaylar
3. Deployment window'u belirlenir (yoğun olmayan saat)
4. On-call ekibi bilgilendirilir

**Adım 6 — Production Deploy (Release günü)**
1. Backup alınır (database + file storage)
2. Deployment talimatı tüm ekibe iletilir
3. Deployment başlatılır (CI/CD pipeline ile)
4. Health check ve smoke test çalıştırılır
5. Rollback hazır tutulur

**Adım 7 — Post-Release Monitoring (Deploy sonrası 48 saat)**
1. Error rate ve latency grafikleri izlenir
2. Kullanıcı feedback'i toplanır
3. Kritik bug bulunursa hotfix süreci başlatılır
4. SLA uyumluluğu kontrol edilir

**Adım 8 — Release Closure**
1. Release notes yayınlanır
2. Post-mortem toplantısı yapılır (kritik release ise)
3. Sprint retrospective'de release süreci değerlendirilir
4. Sonraki release için iyileştirmeler planlanır

### 23.2 Rollback Prosedürü

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           ROLLBACK TRIGGER NOKTALARI                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  KRİTİK (Anlık rollback):                                                    │
│    • Error rate > 5% normal threshold                                         │
│    • API yanıt süresi > 10sn (P99)                                           │
│    • Veritabanı bağlantısı kesildi                                           │
│    • Authentication/Authorization hatası                                     │
│                                                                               │
│  YÜKSEK (5 dakika içinde değerlendir):                                       │
│    • Error rate > 2%                                                         │
│    • API yanıt süresi > 5sn (P95)                                            │
│    • Belirli API endpoint'leri çalışmıyor                                    │
│    • Stok hareketi kaydı yapılamıyor                                         │
│                                                                               │
│  ORTA (30 dakika içinde değerlendir):                                        │
│    • Error rate > 1%                                                         │
│    • Non-critical feature hatası                                             │
│    • UI/UX bozulması (kritik olmayan)                                        │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Rollback Adımları:**

```bash
# 1. CI/CD pipeline rollback (tercih edilen yöntem)
# GitHub Actions'ta önceki başarılı workflow run'ı bulun
# "Re-run jobs" ile deploy stage'ini yeniden çalıştırın
# veya:

# 2. kubectl ile anlık rollback
kubectl rollout undo deployment/erp-api -n erp-production
kubectl rollout undo deployment/erp-worker -n erp-production
kubectl rollout undo deployment/erp-frontend -n erp-production

# 3. Helm rollback
helm rollback erp-prod -n erp-production

# 4. Spesifik bir revision'a rollback
kubectl rollout history deployment/erp-api -n erp-production
kubectl rollout undo deployment/erp-api -n erp-production --to-revision=3

# 5. Database rollback (sadece şema değişikliği olduysa)
# PostgreSQL migration down
python manage.py migrate urunler 0003_previous  # önceki migration'a geri dön

# 6. Rollback sonrası doğrulama
kubectl rollout status deployment/erp-api -n erp-production
curl -sf https://api.erp.example.com/health/

# 7. Ekibi bilgilendir
# Slack: #erp-alerts kanalına rollback bildirimi
```

### 23.3 Feature Flags

Feature flag'ler, kod deploy etmeden özellikleri açıp kapatmayı sağlar.

```python
# config/settings/production.py içinde Django settings

# Feature Flags — Unleash veya Django'nun kendi yapısı kullanılabilir
FEATURE_FLAGS = {
    # Stok yönetimi
    "FEATURE_STOCK_ALERT": True,
    "FEATURE_STOCK_FORECAST": False,
    "FEATURE_MULTI_WAREHOUSE": False,
    
    # Üretim
    "FEATURE_PRODUCTION_PLANNING": True,
    "FEATURE_QUALITY_CONTROL_WORKFLOW": True,
    
    # Raporlama
    "FEATURE_ADVANCED_ANALYTICS": True,
    "FEATURE_DASHBOARD_V2": False,
    
    # Entegrasyonlar
    "FEATURE_SUPPLIER_PORTAL": False,
    "FEATURE_CUSTOMER_PORTAL": False,
    "FEATURE_BARCODE_SCANNER": True,
    "FEATURE_EXPORT_PDF": True,
    
    # Para birimi
    "FEATURE_MULTI_CURRENCY": False,
    
    # Bildirimler
    "FEATURE_PUSH_NOTIFICATIONS": False,
    "FEATURE_EMAIL_NOTIFICATIONS": True,
    
    # Yeni UI
    "FEATURE_NEW_NAVIGATION": False,
    "FEATURE_DARK_MODE": False,
}
```

```python
# erp/utils/feature_flags.py
from django.conf import settings
from functools import wraps

def is_feature_enabled(feature_name: str) -> bool:
    """Feature flag'in açık olup olmadığını kontrol eder."""
    return settings.FEATURE_FLAGS.get(feature_name, False)

def feature_required(feature_name: str, fallback=None):
    """Decorator: feature flag kapalıysa fallback view döner veya 404."""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not is_feature_enabled(feature_name):
                if fallback:
                    return fallback(request, *args, **kwargs)
                from django.http import HttpResponseNotFound
                return HttpResponseNotFound("Bu özellik şu anda aktif değil.")
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

# Kullanım örneği:
# @feature_required("FEATURE_ADVANCED_ANALYTICS")
# def analytics_dashboard(request):
#     ...
```

```javascript
// frontend/src/config/features.ts
export const featureFlags = {
  enableStockAlert: import.meta.env.VITE_FLAG_STOCK_ALERT === 'true',
  enableAdvancedAnalytics: import.meta.env.VITE_FLAG_ADVANCED_ANALYTICS === 'true',
  enableBarcodeScanner: import.meta.env.VITE_FLAG_BARCODE_SCANNER === 'true',
  enableMultiCurrency: import.meta.env.VITE_FLAG_MULTI_CURRENCY === 'true',
};

// React bileşeni içinde kullanım
{featureFlags.enableAdvancedAnalytics && <AdvancedAnalyticsPanel />}
```

### 23.4 Sürüm Notları (Release Notes) Şablonu

```markdown
# v1.2.0 — 2026-08-15

## 🎉 Yeni Özellikler

- **Stok Kritik Seviye Uyarısı**: Minimum stok seviyesinin altına düşen ürünler için
  otomatik e-posta bildirimi
- **Lot Fotoğraf Yükleme**: Her lot için en fazla 5 fotoğraf yüklenebilir
- **Kalite Kontrol Workflow**: Hammadde girişinde zorunlu kalite kontrol süreci

## 🐛 Hata Düzeltmeleri

- [#142] FIFO çıkışında yanlış lot seçimi düzeltildi
- [#138] Stok hareketi raporunda tarih filtreleme düzeltildi
- [#135] Mobil görünümde menü overlay sorunu giderildi

## 🔧 Teknik İyileştirmeler

- PostgreSQL bağlantı havuzu boyutu optimize edildi (20 → 50)
- Redis cache stratejisi güncellendi
- API endpoint'lerinde response caching eklendi

## ⚠️ Breaking Changes

- `GET /api/v1/stok/hareketler` endpoint'inin çıktı formatı değişti.
  `musteri_id` alanı artık `musteri` nesnesi içinde dönüyor.
  Eski format için `?legacy=true` query parametresi kullanılabilir (v1.2.1'e kadar).

## 🚀 Bilinen Sorunlar

- Chrome 120'de barkod tarayıcı eklentisi düzgün çalışmıyor (v1.2.1'de düzeltilecek)

## 🔄 Upgrade Notları

```bash
# Database migration gerekli
python manage.py migrate

# Yeni environment variable
export FEATURE_STOCK_ALERT=true
```
```

---

## 28. Bağımlılık Güvenlik Tarama (Dependency Vulnerability Scanning)

### 24.1 Tarama Stratejisi

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    DEPENDENCY SCANNING PIPELINE                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  [1. Lokal Scan]     → geliştirici `pre-commit` hook                          │
│         │                                                                 │
│         ▼                                                                 │
│  [2. CI/CD Scan]    → her PR/push'ta otomatik                                 │
│         │                                                                 │
│         ▼                                                                 │
│  [3. SBOM Oluşturma] → her release'de                                        │
│         │                                                                 │
│         ▼                                                                 │
│  [4. Continuous Scan] → Docker image taranır (Trivy)                         │
│         │                                                                 │
│         ▼                                                                 │
│  [5. RAPORLAMA]     → GitHub Security + Slack                                │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 24.2 Python — pip-audit Entegrasyonu

```bash
# requirements.txt ile birlikte çalışır
# Her push'ta otomatik çalışır

pip install pip-audit

# Scan
pip-audit --format=json --output=pip-audit-report.json

# Kritik bulguları ayır
pip-audit --format=json | jq '[.[] | select(.vulns != null) | select(.vulns[].severity == "CRITICAL")]'
```

### 24.3 JavaScript/Node.js — npm audit + Snyk

```yaml
# package.json scripts
{
  "scripts": {
    "audit": "npm audit --audit-level=high",
    "audit:fix": "npm audit fix",
    "snyk:test": "snyk test --severity-threshold=high"
  }
}
```

```bash
# Snyk entegrasyonu (.snyk policy file)
# .snyk
policy:
  patch:
    'npm:minimatch:20160620':
      - snyk => patch:
          minimatch > 0.2.10:
            patched: '2016-07-14T12:00:00.000Z'
  ignore:
    'npm:minimatch:20160620':
      - reason: 'Patched in latest version'
        expires: '2026-09-01T00:00:00.000Z'
```

### 24.4 Docker Image — Trivy

```dockerfile
# Dockerfile — multi-stage build ile güvenlik
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
# Sadece gerekli dosyaları kopyala
COPY --from=builder /install /usr/local
COPY . .
RUN adduser --disabled-password erp && erp erp
USER erp

# Trivy ile tarama
# docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
#   aquasec/trivy image --severity CRITICAL,HIGH erp-api:latest
```

### 24.5 OWASP Dependency-Check

```yaml
# GitHub Actions'a ek (security-scan job'ına)
- name: Run OWASP Dependency Check
  run: |
    docker run --rm \
      -v "${{ github.workspace }}:/src" \
      -v "${{ github.workspace }}/dcheck-report:/report" \
      owasp/dependency-check-action \
      --project "ERP-${env.GITHUB_REF}" \
      --scan /src \
      --format HTML \
      --out /report \
      --severity CRITICAL \
      --confidence HIGH

- name: Upload Dependency Check Report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: dependency-check-report
    path: dcheck-report/
    retention-days: 90
```

### 24.6 Tarama Sonuçları — Eşik Değerleri

| Severity | Action |
|----------|--------|
| CRITICAL | Deployment engelle — hemen düzelt |
| HIGH | Deployment duraksat — 24 saat içinde düzelt veya exception |
| MEDIUM | Deployment devam — sprint içinde düzelt |
| LOW | Logla — bir sonraki major release'de düzelt |

### 24.7 GitHub Security Tab Entegrasyonu

Tüm tarama sonuçları (Trivy SARIF, pip-audit, npm audit, Snyk) GitHub Security sekmesinde toplanır:

```
Security tab → Vulnerability alerts → Dependabot alerts
Security tab → Code scanning alerts → Trivy/OWASP sonuçları
Security tab → Secret scanning alerts
```

Otomatik PR oluşturma: Dependabot, güvenlik güncellemelerini otomatik olarak pull request olarak açar.

---

## Sonraki Adımlar

1. Bu dokümanı inceleyip geri bildirim vermeniz
2. Eksik/gereksiz gördüğünüz noktaları belirtmeniz
3. Onay sonrası Veritabanı Tasarım Dokümanı hazırlanması
4. Teknoloji stack'in kesinleştirilmesi
