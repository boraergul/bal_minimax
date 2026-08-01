# Gereksinim Spesifikasyon Dokümanı (SRS)
## Kurutulmuş Meyve ve Bal Yönetim Sistemi

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
- FIFO Yönetimi
- Raporlama ve Analitik
- Yedekleme ve Felaket Kurtarma
- Birim Testleri

**Dahil Edilmeyen:**
- Faturalama/Ödeme Takibi (bu sistem haricinde yapılacak)
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
      ↓ (FIFO mantığıyla üretim emri)
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
2. Hammadde lotu seçilir (FIFO'ya göre en eski önce)
3. Dönüşüm kaydı: Hammadde lotu → Mamul lotu
4. Mamul lotu oluşturulur: Üretim Tarihi, Son Kullanma, Kaynak Lot
5. Mamul stoka girer

### 2.4 Satış Süreci
1. Müşteri siparişi kaydedilir
2. FIFO'ya göre uygun lot seçilir
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
4. Uygun lot seçilir (varsa aynı lot, yoksa FIFO)
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
| **yeni:** faks | VARCHAR(20) | Hayır | Faks numarası |
| **yeni:** yetkili_kisi | VARCHAR(255) | Hayır | İlgili kişi adı soyadı |
| **yeni:** yetkili_telefon | VARCHAR(20) | Hayır | İlgili kişi telefonu |
| **yeni:** yetkili_eposta | VARCHAR(255) | Hayır | İlgili kişi e-posta |
| **yeni:** banka_adi | VARCHAR(100) | Hayır | Banka adı |
| **yeni:** banka_sube | VARCHAR(100) | Hayır | Şube adı |
| **yeni:** hesap_no | VARCHAR(50) | Hayır | IBAN/hesap numarası |
| **yeni:** odeme_vadesi | INTEGER | Hayır | Vade günü (30, 60, 90) |
| **yeni:** tedarikci_sinifi | ENUM('A','B','C') | Hayır | Sınıflandırma |
| **yeni:** not | TEXT | Hayır | Özel notlar |
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
| odeme_plani | VARCHAR(50) | Ödeme planı uyumu (P2) |
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
| kategori | Enum | Meyve, Bal, Karışım, KuruYemiş, Sebze, KuruBakliyat, Yağ, Turşu, Diğer (P2) |
| birim_toptan | Enum | kg, ton |
| birim_perakende | Enum | kg, gram, adet, paket |
| aktif | Boolean | Aktif/Pasif durum |
| stok_kodu | VARCHAR(50) | SKU (Stock Keeping Unit) numarası (P0) |
| barkod | VARCHAR(50) | Ürün barkod numarası (EAN-13, UPC vb.) (P0) |
| aciklama | TEXT | Ürün hakkında detaylı açıklama (P1) |
| gorsel_url | VARCHAR(500) | Ürün fotoğrafı URL (P1) |
| agirlik | DECIMAL(10,3) | Paket ağırlığı (gram) (P2) |
| hacim | DECIMAL(10,3) | Paket hacmi (cm³) (P2) |
| minimum_stok_seviyesi | DECIMAL(15,3) | Minimum stok uyarı seviyesi (P2) |
| maksimum_stok_seviyesi | DECIMAL(15,3) | Maksimum stok limiti (P2) |
| raf_omru_gun | INTEGER | Gün cinsinden raf ömrü (P2) |
| olusturan_kullanici_id | UUID | Kaydı oluşturan kullanıcı (P0) |

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
| adres | Text | ✓ | Fatura adresi |
| vergi_no | String | Hayır | Vergi numarası (firma ise) |
| **yeni:** tc_kimlik | VARCHAR(11) | Hayır | TC Kimlik numarası (bireysel) |
| **yeni:** faks | VARCHAR(20) | Hayır | Faks numarası |
| **yeni:** teslimat_adresi | TEXT | Hayır | Teslimat adresi |
| **yeni:** il | VARCHAR(50) | Hayır | İl |
| **yeni:** ilce | VARCHAR(50) | Hayır | İlçe |
| **yeni:** posta_kodu | VARCHAR(10) | Hayır | Posta kodu |
| **yeni:** musteri_sinifi | ENUM('A','B','C') | Hayır | Müşteri sınıfı |
| **yeni:** odeme_vadesi | INTEGER | Hayır | Vade günü |
| **yeni:** kredi_limiti | DECIMAL(15,4) | Hayır | Kredi limiti |
| **yeni:** satis_temsilcisi_id | UUID | Hayır | Sorumlu satış temsilcisi |
| **yeni:** dogum_tarihi | DATE | Hayır | Doğum tarihi (bireysel) |
| **yeni:** cinsiyet | ENUM('E','K','D') | Hayır | Cinsiyet |
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
| durum | ENUM('AKTIF','BITTI','IPTAL','KALITE_KONTROL','DEPO_DISI','RET') | Stok durumu (P2) |
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
| giris_referans_no | VARCHAR(100) | Alım irsaliyesi/fatura numarası (P2) |
| musteri_id | UUID | Satış çıkışı sonrası hangi müşteriye satıldı (izlenebilirlik için) (P2) |
| satis_hareket_id | UUID | Satış hareketi referansı (izlenebilirlik için) (P2) |
| olusturan_kullanici_id | UUID | Kaydı oluşturan kullanıcı (P0) |

#### 3.4.3 FIFO Yönetimi
- Stok çıkışlarında en eski lot önce kullanılır
- Son kullanma tarihi yaklaşan lotlar öncelikli gösterilir
- FIFO ihlali durumunda uyarı (elle müdahale seçeneği)

#### 3.4.4 Stok Hareketleri
| Alan | Tip | Açıklama |
|------|-----|----------|
| hareket_id | UUID | Benzersiz tanımlayıcı |
| stok_id | UUID | Stok/Lot referansı |
| lot_no | VARCHAR(50) | Lot numarası (P2) |
| hareket_tipi | Enum | GIRIS, URETIM_GIRIS, URETIM_CIKIS, SATIS_CIKIS, IADE, DUZELTME, TRANSFER |
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
| teslimat_adresi | TEXT | Fatura adresinden farklı teslimat adresi (P1) |
| odeme_sekli | ENUM('NAKIT','CEK','HAVALE','KREDI_KARTI','KAPIDA_ODEME') | Ödeme şekli (P0) |
| odeme_durumu | ENUM('BEKLIYOR','ODENDI','KISMEN_ODENDI','VADE_GECIKTI') | Ödeme durumu (P0) |
| vade_tarihi | DATE | Ödeme vade tarihi (P1) |
| fatura_kesildi | BOOLEAN | Fatura kesildi mi? (P1) |
| fatura_no | VARCHAR(50) | Fatura numarası (P1) |
| fatura_tarihi | DATE | Fatura kesilme tarihi (P1) |
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

**Not:** Faturalama bu sistemde YAPILMAYACAKTIR. Satış kaydı takip amaçlıdır.

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
| FINANS (P2) | rapor_oku, finans_rapor | Finans/muhasebe |
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
- Tam ACID uyumluluğu (finansal veri için kritik)
- Açık kaynak ve ücretsiz
- Yedekleme araçları yaygın

### 4.2 Veritabanı Tasarım İlkeleri
- **Normalizasyon:** 3NF seviyesi
- **Bütünlük:** Foreign key constraints, check constraints
- **İzleme:** Created_at, updated_at, created_by her tabloda
- **Soft Delete:** Silinen kayıtlar fiziksel silinmeyecek

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
| Satış Modülü | Lot atama, stok çıkışı, iade işlemleri | Müşteri seçimi, fatura kesimi | Satış kaydı oluşturma |
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
Müşteri Seç → Ürün Ekle → Sistem otomatik FIFO lot seçer → Miktar → Birim Fiyat → Kaydet
```

#### Üretim Akışı
```
Üretim Emri Oluştur → Mamul Seç → Miktar Belirle → Sistem hammadde lotu önerir (FIFO) → Onayla → Üretim Tamamla
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
| TarihSaat | GG/AA/YYYY SS:DD:SN | 27/07/2026 14:30:00 |
| Ay Adı | Türkçe | Ocak, Şubat, ..., Aralık |
| Gün Adı | Türkçe | Pazartesi, Salı, ..., Pazar |
| Haftanın İlk Günü | Pazartesi |

### 6.3 Parasal Format (Türkiye Standartları)
| Alan | Format | Örnek |
|------|--------|-------|
| Para Birimi | TL simgesi (₺) | |
| Ondalık Ayırıcı | Virgül (,) | 1.234,56 |
| Binlik Ayırıcı | Nokta (.) | 1.234.567,89 |
| Negatif Değer | Parantez ile | (1.234,56) |
| Kur Biçimi | 1 USD = 35,12 TL | |

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
-最小権限の原則 (Least Privilege) uygulanır

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

### 7.5 Güvenlik Günlüğü
- Tüm güvenlik olayları loglanır:
  - Başarısız giriş denemeleri
  - Yetkilendirme hataları
  - Kritik işlemler
  - Şifre değişiklikleri
- Log saklama: 1 yıl
- Güvenlik uyarı sistemi

---

### 7.5 Barkod/Etiket Baskı Desteği
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
| /api/v1/stok/lot/{lotNo} | GET | Lot izlenebilirlik sorgula |
| /api/v1/stok/cikis | POST | Stok çıkışı (FIFO) |
| /api/v1/uretim/emir | POST | Üretim emri oluştur |
| /api/v1/rapor/stok-degeri | GET | Stok değeri raporu |
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
| Satış Kayıtları | 10 yıl | Vergi/denetim gereksinimi |
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
| son_kullanma_uyari_gun | INTEGER | 30 | Son kullanma uyarısı kaç gün önce (P2) |
| kalite_kontrol_zorunlu | BOOLEAN | TRUE | Stok girişinde kalite kontrol zorunlu mu? (P2) |
| fatura_no_zorunlu | BOOLEAN | TRUE | Stok girişinde fatura numarası zorunlu mu? (P2) |

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
| musteri_odeme_gecikti (P2) | Uygulama, E-posta | Müşteri ödemesi gecikmiş |
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

## Sonraki Adımlar

1. Bu dokümanı inceleyip geri bildirim vermeniz
2. Eksik/gereksiz gördüğünüz noktaları belirtmeniz
3. Onay sonrası Veritabanı Tasarım Dokümanı hazırlanması
4. Teknoloji stack'in kesinleştirilmesi
