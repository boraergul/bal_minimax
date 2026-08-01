# Dokümantasyon Envanteri — Kurutulmuş Meyve ve Bal ERP

**Versiyon:** 1.2  
**Tarih:** 2026-07-29  
**Proje:** Kurutulmuş Meyve ve Bal Yönetim Sistemi (ERP)  
**Durum:** Tamamlandı

---

## 1. Doküman Haritası

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANA DOKÜMANLAR                                │
├─────────────────────────────────────────────────────────────────┤
│  SRS-Kurutulmus-Meyve-Bal-ERP.md       (203 KB)  ⭐ TEMEL       │
│  DB-Design-Kurutulmus-Meyve-Bal-ERP.md  (236 KB)  ⭐ TEMEL       │
│  SYSTEM-ARCH-Kurutulmus-Meyve-Bal-ERP.md (60 KB)  ⭐ TEMEL       │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────────┐
│ ÇÖZÜM DOK.   │     │ ÇÖZÜM DOK.    │     │ DESTEK DOK.       │
│ (10 adet)     │     │ (4 adet)       │     │ (2 adet)          │
├───────────────┤     ├───────────────┤     ├───────────────────┤
│ 1. FEFO/FIFO  │     │ 11. Raporlama │     │ eksik_alan_       │
│ 2. Kalite     │     │ 12. Satış İade│     │   analizi.md      │
│ 3. SKT        │     │ 13. Transfer  │     │ FONKSIYONEL-      │
│ 4. Stok Düz.  │     │ 14. Barkod    │     │   EKSIKLIK-       │
│ 5. Birim Dön.  │     └───────────────┘     │   DETAYLARI.md    │
│ 6. Bildirim   │                             │ URETIMLIK_...     │
│ 7. Depo Yön.  │                             │   GAP-ANALIZI...  │
│ 8. Üretim Mal.│                             └───────────────────┘
│ 9. Ürün Özell.│
│ 10. Toplu İş. │
└───────────────┘
```

---

## 2. Doküman Listesi (19 Dosya)

### 2.1 Ana Dokümanlar (Core)

| # | Dosya | Boyut | Versiyon | Açıklama |
|---|-------|-------|----------|----------|
| 1 | `SRS-Kurutulmus-Meyve-Bal-ERP.md` | 205 KB | 1.2 | Sistem Gereksinimleri Spesifikasyonu — tüm modüller; 29.07 güncellemeleri işlendi |
| 2 | `DB-Design-Kurutulmus-Meyve-Bal-ERP.md` | 278 KB | 1.2 | Veritabanı fiziksel tasarım — 35+ tablo; mamul-hammadde self-FK ve lot kaynak bağı |
| 3 | `SYSTEM-ARCH-Kurutulmus-Meyve-Bal-ERP.md` | 60 KB | 1.2 | Mimari, API, deployment, CI/CD, güvenlik; güncel ürün/üretim sözleşmeleri |

### 2.2 Çözüm Dokümanları (Solution) — §3.4.x Eşleşmesi

| # | Dosya | SRS Bölümü | DB Tablo | Kapsam |
|---|-------|-----------|----------|--------|
| 4 | `SON-KULLANMA-FEFO-COZUMU.md` | §3.4.6 | `stok_karti.durum` | FEFO/FIFO hibrit algoritması, SKT yönetimi |
| 5 | `KALITE-KONTROL-COZUMU.md` | §3.4.5 | `kalite_kontrol`, `kalite_numune` | 6-adım kalite kontrol workflow |
| 6 | `STOK-DUZELTME-ONAY-COZUMU.md` | §3.4.8 | `stok_duzeltme_talepleri` | İki aşamalı onay mekanizması |
| 7 | `BIRIM-DONUSUM-COZUMU.md` | §3.4.9 | `birimler`, `birim_donusum` | Birim dönüşüm sistemi |
| 8 | `BILDIRIM-SISTEMI-COZUMU.md` | §3.4.10 | `bildirimler`, `bildirim_sablonlari` | Bildirim motoru |
| 9 | `DEPO-YONETIM-COZUMU.md` | §3.4.11 | `depolar`, `depo_bloklar`, `depo_konumlar`, `depo_transfer` | Depo yönetimi |
| 10 | `URETIM-MALIYET-COZUMU.md` | §3.4.13 | `uretim_maliyet` (özet) + `uretim_iscilik`, `uretim_enerji`, `uretim_bakim`, `uretim_genel_gider` (detaylar) | Üretim maliyet |
| 11 | `URUN-OZELLIK-COZUMU.md` | §3.4.14 | `ozellik_tanimlari`, `urun_ozellikleri` | Ürün özellik sistemi |
| 12 | `TOPLU-ISLEM-COZUMU.md` | §3.4.12 | `toplu_islemler`, `toplu_islem_satirlari` | Batch altyapısı |
| 13 | `RAPORLAMA-MODULU-COZUMU.md` | §3.4.x | `rapor_tanimlari`, `rapor_cektirme` | Dashboard, KPI, export |
| 14 | `SATIS-IADE-COZUMU.md` | §3.4.x | `satis_iade`, `iade_numune` | İade workflow, fire hesaplama |
| 15 | `TRANSFER-ONAY-COZUMU.md` | §3.4.x | `depo_transfer`, `nakliye_takip` | Transfer onay zinciri |
| 16 | `BARKOD-YAZDIRMA-COZUMU.md` | §3.4.x | `etiket_sablon`, `etiket_alan` | ZPL/PDF, EAN-13/Code128/QR |

### 2.3 Destek Dokümanları

| # | Dosya | Boyut | Açıklama |
|---|-------|-------|----------|
| 17 | `eksik_alan_analizi.md` | 19 KB | P0/P1/P2 eksiklik detayları |
| 18 | `FONKSIYONEL-EKSIKLIK-DETAYLARI.md` | 21 KB | Fonksiyonel boşluk analizi |
| 19 | `URETIMLIK_HAZIRLIK_GAP-ANALIZI-RAPORU.md` | 34 KB | Üretimlik hazırlık gap analizi |

---

## 3. SRS Bölüm Yapısı (Tam Harita)

```
SRS-Kurutulmus-Meyve-Bal-ERP.md
├── §1   Giriş ve Genel Bakış
├── §2   Sistem Genel Bakış
│   ├── §2.1  Sistem Özellikleri
│   ├── §2.2  Kullanıcı Rolleri ve Yetkileri
│   ├── §2.3  Sistem Kısıtlamaları
│   ├── §2.4  Terminoloji
│   └── §2.5  Referans Dokümanlar
├── §3   İşlevsel Gereksinimler
│   ├── §3.1  Tedarikçi Yönetimi
│   ├── §3.2  Müşteri Yönetimi
│   ├── §3.3  Ürün Yönetimi
│   ├── §3.4  Stok Yönetimi
│   │   ├── §3.4.1  Stok Kartı Tanımları
│   │   ├── §3.4.2  Stok Giriş ve Çıkış İşlemleri
│   │   ├── §3.4.3  Lot/Parti Takibi ve İzlenebilirlik
│   │   ├── §3.4.4  Depo Yönetimi
│   │   ├── §3.4.5  Kalite Kontrol Workflow ⭐ YENI
│   │   ├── §3.4.6  FEFO/FIFO Hibrit Algoritma ⭐ YENI
│   │   ├── §3.4.7  SKT Yönetimi ve Scheduled Job ⭐ YENI
│   │   ├── §3.4.8  Stok Düzeltme Onay Mekanizması ⭐ YENI
│   │   ├── §3.4.9  Birim Dönüşüm Sistemi ⭐ YENI
│   │   ├── §3.4.10 Bildirim Sistemi ⭐ YENI
│   │   ├── §3.4.11 Depo Yönetimi ⭐ YENI
│   │   ├── §3.4.12 Toplu İşlem (Batch) Altyapısı ⭐ YENI
│   │   ├── §3.4.13 Üretim Maliyet Hesaplama ⭐ YENI
│   │   └── §3.4.14 Ürün Özellik Sistemi ⭐ YENI
│   ├── §3.5  Üretim Yönetimi
│   ├── §3.6  Satış Yönetimi (faturalama ve ödeme kapsam dışı)
│   ├── §3.7  Raporlama Modülü ⭐ YENI
│   ├── §3.8  Satış İade İş Akışı ⭐ YENI
│   ├── §3.9  Transfer Onay Workflow ⭐ YENI
│   ├── §3.10 Barkod ve Etiket Yazdırma ⭐ YENI
│   ├── §3.11 Bildirim Sistemi
│   └── §3.12 Sistem Yönetimi
├── §4   Veritabanı Gereksinimleri (Fiziksel Referans)
├── §5   Arayüz Gereksinimleri
├── §6   Performans Gereksinimleri
├── §7   Güvenlik Gereksinimleri
└── §8   Uyumluluk ve Yasal Gereksinimler
```

---

## 4. DB-Design Tablo Yapısı (Tam Liste)

### Core Tablolar
| Tablo | Çözüm Doc | Kapsam |
|-------|-----------|--------|
| `kullanicilar` | — | Kullanıcı yönetimi |
| `tedarikciler` | — | Tedarikçi yönetimi |
| `tedarikci_urunler` | — | Tedarikçi-ürün fiyat |
| `tedarikci_degerlendirme` | — | Kalite değerlendirme |
| `musteriler` | — | Müşteri yönetimi |
| `urunler` | — | Ürün tanımları |
| `urun_donusum` | BIRIM-DONUSUM | Ürün-ürün dönüşüm |
| `stok_karti` | FEFO, SKT | Lot/stok kayıtları |
| `stok_hareket` | — | Stok hareket log |
| `uretim_emri` | — | Üretim emirleri |
| `uretim_detay` | — | Üretim satırları |
| `uretim_lot` | — | Üretim sonuç lot |
| `satis_kaydi` | — | Satış kayıtları |
| `satis_kalemleri` | — | Satış kalemleri |
| `gida_izlenebilirlik_log` | — | İzlenebilirlik zinciri (Gıda İzlenebilirlik Tebliği) |
| `etiket_sablon` | BARKOD | Etiket tanımları |
| `ozellik_tanimlari` | URUN-OZELLIK | Özellik anahtarları |
| `urun_ozellikleri` | URUN-OZELLIK | Ürün özellik değerleri |

### Yeni Eklenen Tablolar ⭐
| Tablo | Çözüm Doc | Kapsam |
|-------|-----------|--------|
| `kalite_kontrol` | KALITE-KONTROL | Kalite kontrol kayıtları |
| `kalite_numune` | KALITE-KONTROL | Numune kayıtları |
| `bildirimler` | BILDIRIM-SISTEMI | Bildirim tablosu |
| `bildirim_sablonlari` | BILDIRIM-SISTEMI | Bildirim şablonları |
| `bildirim_gonderimleri` | BILDIRIM-SISTEMI | Gönderim logları |
| `bildirim_kullanicari` | BILDIRIM-SISTEMI | Kullanıcı tercihleri |
| `depolar` | DEPO-YONETIM | Depo tanımları |
| `depo_bloklar` | DEPO-YONETIM | Depo blok/bölge |
| `depo_konumlar` | DEPO-YONETIM | Depo konumları |
| `depo_transfer` | DEPO-YONETIM, TRANSFER | Transfer talepleri |
| `depo_transfer_detay` | DEPO-YONETIM | Transfer satirleri |
| `nakliye_takip` | TRANSFER | Nakliye takibi |
| `toplu_islemler` | TOPLU-ISLEM | Batch işlem ana |
| `toplu_islem_satirlari` | TOPLU-ISLEM | Batch satirleri |
| `birimler` | BIRIM-DONUSUM | Birim tanımları |
| `birim_donusum` | BIRIM-DONUSUM | Birim dönüşüm oranları |
| `uretim_iscilik` | URETIM-MALIYET | İşçilik maliyeti |
| `uretim_enerji` | URETIM-MALIYET | Enerji maliyeti |
| `uretim_genel_gider` | URETIM-MALIYET | Genel gider dağıtımı |
| `rapor_tanimlari` | RAPORLAMA | Rapor şablonları |
| `rapor_cektirme` | RAPORLAMA | Rapor çıktı logu |
| `rapor_schedule` | RAPORLAMA | Zamanlı raporlar |
| `satis_iade` | SATIS-IADE | İade kayıtları |
| `iade_numune` | SATIS-IADE | İade numune kayıtları |
| `stok_duzeltme_talepleri` | STOK-DUZELTME | Düzeltme talepleri |
| `stok_duzeltme_onay` | STOK-DUZELTME | Düzeltme onay kayıtları |
| `skt_islem` | FEFO/SKT | SKT işlem talepleri |

---

## 5. API Endpoint Özeti

| Modül | Endpoint Ön Eki | Metod Sayısı | Çözüm Doc |
|-------|----------------|-------------|-----------|
| Kimlik Doğrulama | `/api/v1/auth` | 5 | — |
| Tedarikçi | `/api/v1/tedarikciler` | 9 | — |
| Müşteri | `/api/v1/musteriler` | 7 | — |
| Ürün | `/api/v1/urunler` | 10 | — |
| Stok | `/api/v1/stok` | 10 | FEFO/SKT |
| Stok Düzeltme | `/api/v1/stok-duzeltme` | 6 | STOK-DUZELTME |
| SKT Kontrol | `/api/v1/stok/skt` | 7 | FEFO/SKT |
| Üretim | `/api/v1/uretim` | 7 | — |
| Üretim Maliyet | `/api/v1/uretim/maliyet` | 7 | URETIM-MALIYET |
| Satış | `/api/v1/satis` | 5 | — |
| Satış İade | `/api/v1/satis/{id}/iade` | 7 | SATIS-IADE |
| Kalite Kontrol | `/api/v1/kalite-kontrol` | 9 | KALITE-KONTROL |
| Depo | `/api/v1/depo` | 16 | DEPO-YONETIM |
| Transfer Onay | `/api/v1/depo/transferler` | 7 | TRANSFER |
| Bildirim | `/api/v1/bildirim` | 13 | BILDIRIM-SISTEMI |
| Birim | `/api/v1/birim` | 10 | BIRIM-DONUSUM |
| Toplu İşlem | `/api/v1/toplu-islem` | 8 | TOPLU-ISLEM |
| Ürün Özellik | `/api/v1/ozellikler` | 13 | URUN-OZELLIK |
| Raporlama | `/api/v1/raporlar` | 12 | RAPORLAMA |
| Barkod/Etiket | `/api/v1/etiket` | 8 | BARKOD |
| Ayarlar | `/api/v1/ayarlar` | 5 | — |
| **TOPLAM** | | **~180 endpoint** | |

---

## 6. Cross-Doc Tutarsızlık Çözümleri

Bu tabloda listelenen kararlar, kanonik referanslara dayalı olarak 2026-07-30 tarihinde dokümanlara işlenmiştir. Her karar, ilgili çözüm/doküman bölümüne yönlendirilir ve doğrulanabilir bir referans (dosya + bölüm) taşır.

| # | Konu | Karar (Doğrulanabilir Referans) |
|---|------|--------------------------------|
| 1 | FEFO vs FIFO öncelik | SON-KULLANMA-FEFO-COZUMU §2.1 — Üç kademeli hibrit: `SON_KULLANIM_GECDI` (bloke), `SON_KULLANIM_RISKLI` (FEFO), diğer AKTIF (FIFO); SYSTEM-ARCH §3.2.17 ile uyumlu |
| 2 | `urunler.kategori` 9 değer | SRS §3.2.1 + DB-Design §9.1 — `MEYVE, BAL, KARSIM, KURUYEMIS, SEBZE, KURU_BAKLIYAT, YAG, TURSU, DIGER` (9 değer, ASCII) |
| 3 | `stok_karti.durum` SKT durumları | SON-KULLANMA-FEFO-COZUMU §3.1 + DB-Design §9.1 — `SON_KULLANIM_GECDI`, `SON_KULLANIM_RISKLI`, `SON_KULLANIM_ISLEM_GECICI` (ASCII; T harfleri dahil EDİLMEMİŞ) |
| 4 | Kalite kontrol tablosu | DB-Design §3.4.5 + KALITE-KONTROL-COZUMU §4.1 — tek `kalite_kontrol` tablosu; durumlar: `BEKLIYOR,KONTROL_EDILIYOR,KABUL,KISMEN_KABUL,RET` |
| 5 | Birim dönüşüm sistemi | DB-Design §3.4.9 — `birimler` ve `birim_donusum` ayrı tablolar |
| 6 | Bildirim sistemi | DB-Design §3.4.10 — `bildirimler`, `bildirim_sablonlari`, `bildirim_gonderimleri` |
| 7 | Depo yönetimi | DB-Design §3.4.11 — `depolar`, `depo_bloklar`, `depo_konumlar`, `depo_transfer` |
| 8 | Üretim maliyet modeli | DB-Design §3.4.13 + URETIM-MALIYET-COZUMU — Kanonik model: `uretim_maliyet` (özet) + `uretim_iscilik`, `uretim_enerji`, `uretim_bakim`, `uretim_genel_gider` (detaylar) + malzeme tüketimi `stok_hareket` üzerinden |
| 9 | Toplu işlem | DB-Design §3.4.12 + TOPLU-ISLEM-COZUMU §2 — `toplu_islemler`, `toplu_islem_satirlari`; `toplu_islemler.durum` enum seti çözüm dokümanında `BEKLEMEDE, VALIDATING, ISLENIYOR, TAMAMLANDI, HATALAR_VAR, IPTAL_EDILDI` olarak açık |
| 10 | İade ve raporlama | DB-Design §3.4.8 + RAPORLAMA-MODULU — `satis_iade`, `rapor_tanimlari`, `rapor_cektirme` |
| 11 | Mamul → temel hammadde | DB-Design §3.2.3 + SYSTEM-ARCH §3.2.15 — `urunler.hammadde_id` self-FK, MAMUL check; `/api/v1/urunler/hammaddeler/liste` |
| 12 | Mamul lot → kaynak lot → tedarikçi | DB-Design §3.4 + SYSTEM-ARCH §3.2.7 — `stok_karti.kaynak_stok_id` + `tedarikci_id` üretim tamamlamada atomik atanır; çoklu kaynaklar `uretim_lot.kaynak_lot_bilgisi` JSONB içinde tutulur |
| 13 | Otomatik stok kodu biçimi | DB-Design §3.2.1 + SYSTEM-ARCH §3.2.3 — `{KATEGORI_PREFIX}-{URUN_KISALTMASI}-{BOYUT}`; Türkçe karakter dönüşümü sunucu doğrulaması |
| 14 | İzlenebilirlik kanalı | DB-Design §11.1 + SYSTEM-ARCH §3.2.7 — Kanonik sorgu: `GET /api/v1/raporlar/izlenebilirlik/lot/{lot_no}`; kayıt tablosu `gida_izlenebilirlik_log` |
| 15 | Transfer endpoint ailesi | SYSTEM-ARCH §3.2.10 + DEPO/TRANSFER çözümleri — `/api/v1/depo/transferler` (çoğul) |
| 16 | SKT endpoint ailesi | SYSTEM-ARCH §3.2.17 + SON-KULLANMA-FEFO-COZUMU §4 — `/api/v1/stok/skt/{lot-onerisi,rapor,islemler,islemler/{id},esik,esik/{urun_id},lot/{stok_id}}` (7 endpoint) |
| 17 | Sistem ayarı anahtarı | DB-Design §3.7.1 — `sistem_ayarlari.ayar_adi` kolonu; SKT için anahtar `SKT_UYARI_GUN` |
| 18 | FEFO/FIFO yetki matrisi | SON-KULLANMA-FEFO-COZUMU §8 — DEPO_SORUMLUSU talep eder, YONETICI onaylar, ADMIN kritik ihlal için zorunlu; imha maker-checker (talep+onay ayrı kullanıcı) |
| 19 | Fatura kapsam dışı | SRS §1.2 — Faturalama/KDV/e-fatura kapsam DIŞI; ilgili dokümanlar bu sınıra göre kontrol edilir |

> Yukarıdaki kararlar (1-19), 2026-07-30 tarihinde CAPRAZ-DOKUMAN-CELISKI-RAPORU.md bulgularına karşılık INDEX tarafından normalize edilmiş ve hedef dosyalara işlenmiştir. "Çelişkiler çözüldü" ifadesi ancak yukarıdaki referanslardan her birinin ilgili dosya-bölüme yazıldığının doğrulanması ile geçerlidir.

---

## 7. SRS'den DB-Design'a İzlenebilirlik Matrisi

```
SRS §                    →  DB-Design Tablo(lar)
─────────────────────────────────────────────────
§3.1 Tedarikçi          →  tedarikciler, tedarikci_urunler, tedarikci_degerlendirme
§3.2 Müşteri            →  musteriler
§3.2 Ürün               →  urunler (hammadde_id self-FK), urun_donusum, ozellik_tanimlari, urun_ozellikleri
§3.4.1 Stok Kartı       →  stok_karti
§3.4.2 Stok Hareket      →  stok_hareket
§3.4.3 Lot İzlenebilirlik →  gida_izlenebilirlik_log, uretim_lot
§3.4.4 Depo Yönetimi     →  depolar, depo_bloklar, depo_konumlar
§3.4.5 Kalite Kontrol    →  kalite_kontrol, kalite_numune
§3.4.6 FEFO/FIFO        →  stok_karti (durum alanı güncellendi)
§3.4.7 SKT Yönetimi     →  skt_islem
§3.4.8 Stok Düzeltme    →  stok_duzeltme_talepleri, stok_duzeltme_onay
§3.4.9 Birim Dönüşüm    →  birimler, birim_donusum
§3.4.10 Bildirim         →  bildirimler, bildirim_sablonlari, bildirim_gonderimleri
§3.4.12 Toplu İşlem      →  toplu_islemler, toplu_islem_satirlari
§3.5 Üretim              →  uretim_emri, uretim_detay, uretim_lot
                         →  uretim_maliyet (özet) + uretim_iscilik, uretim_enerji, uretim_bakim, uretim_genel_gider (§3.4.13)
§3.6 Satış               →  satis_kaydi, satis_kalemleri
§3.8 Satış İade         →  satis_iade, iade_numune
§3.9 Transfer            →  depo_transfer, depo_transfer_detay, nakliye_takip
§3.10 Barkod             →  etiket_sablon, etiket_alan
§3.11 Bildirim           →  (yukarıda §3.4.10 ile birleştirildi)
```

---

## 8. Doküman Tutarlılık Değerlendirmesi (2026-07-30)

UPDATE.md entegrasyonu sonrasında ana zincir aşağıdaki özellikler için senkronize edilmiştir. Her satır, ilgili karar referansının §6'daki tabloda kanonik referansı olduğunu ve hedef dosyalara işlendiğini varsayar; gerçek uygulama öncesi şu kararlar (madde 14-19) hedef dosya bölümlerinde teyit edilmelidir:

| Özellik | SRS | DB-Design | SYSTEM-ARCH | Çözüm doc | Doğrulama |
|---|---|---|---|---|---|
| Mamul → temel hammadde | `urunler.hammadde_id` gereksinimi | Self-FK + MAMUL check | CRUD sözleşmesi + hammadde liste endpoint'i | URUN-OZELLIK | §6 madde 11 |
| Mamul lot → kaynak lot → tedarikçi | Üretim tamamlama iş kuralı | `kaynak_stok_id`, devralınan `tedarikci_id`, çoklu kaynak JSONB | Atomik transaction + izlenebilirlik cevabı | DEPO + SON-KULLANMA | §6 madde 12 |
| Otomatik stok kodu | Biçim ve Türkçe karakter kuralı | Benzersizlik ve biçim iş kuralı | İstemci önizleme + sunucu doğrulama | — | §6 madde 13 |
| Üretim API alanları | nullable `gerceklesen_miktar`, `kaynak_lot` | `uretim_emri.gerceklesen_miktar` | POST/tamamla response sözleşmeleri | — | DB-Design §3.4.1 |
| SKT endpoint'leri | §3.4.7 | §3.4.7 | §3.2.17 (7 endpoint namespace) | SON-KULLANMA-FEFO §4 | §6 madde 16 |
| Transfer endpoint'leri | §3.4.11 | §3.4.11 | §3.2.10 (`/depo/transferler` çoğul) | DEPO + TRANSFER | §6 madde 15 |
| İzlenebilirlik kanalı | §3.4.3 | §11.1 (`gida_izlenebilirlik_log`) | §3.2.7 (`/raporlar/izlenebilirlik/lot/{lot_no}`) | — | §6 madde 14 |

### Açık yapısal tutarsızlıklar (2026-07-30 denetimi)

Aşağıdaki konular CAPRAZ-DOKUMAN-CELISKI-RAPORU.md'de tespit edilmiş, §6'daki karar tablosunda kayıt altına alınmış ve hedef 7 dosyaya işlenmiştir. "Çözüldü" ifadesi yalnızca ilgili kanonik referans hedef dosyada yer aldığında geçerlidir:

1. **Tekil/çoğul tablo adları** — kanonik set: `stok_karti`, `uretim_emri`, `satis_kaydi`, `satis_kalemleri`, `tedarikci_degerlendirme`, `kalite_kontrol`, `gida_izlenebilirlik_log`. SYSTEM-ARCH §5.1-§5.4 ve INDEX §4-§7 normalize edildi.
2. **`URUN-OZELLIK-COZUMU.md` ile INDEX uyumu** — `ozellik_tanimlari` + `urun_ozellikleri` kanonik; INDEX §4 bunu zaten doğru.
3. **Eski TASLAK/Eksik ibareleri** — INDEX'in §6'sı ile karar matrisi arasındaki tutarsızlık giderildi; "Gap analizi" belgeleri tarihsel analiz olarak işaretlendi.
4. **§4 sayıları** — INDEX §6'da karar kaydı (madde 14-19) ile dosya-bölüm referansları düzeltildi.
5. **DB-Design temizliği** — §7 DDL bölümündeki `CREATE TABLE uretim_emri` yanlış sütunları (kopyala-yapıştır bug'ı) temizlenmiştir.
6. **Migration stratejisi** — Alembic zorunlu; manuel ALTER TABLE yedek olarak kaldı (§9 checklist).

---

## 9. Kod Yazmaya Geçiş Checklist

Kod yazmaya başlamadan önce tamamlanması gereken maddeler:

- [x] Tüm SRS eksiklikleri giderildi ( §3.4.5 – §3.4.14 )
- [x] Tüm DB-Design tabloları tanımlandı (35+ tablo)
- [x] Tüm çözüm dokümanları tamamlandı (14 çözüm doc)
- [x] System Architecture tüm yeni modülleri kapsıyor
- [x] API endpoint listesi tamamlandı (~180 endpoint)
- [x] Cross-doc tutarsızlıklar çözüldü
- [x] Gap analizi dokümanları tamamlandı
- [ ] `update_db_design.py` çalıştırılacak (migration)
- [ ] Alembic migration dosyaları oluşturulacak
- [ ] İlk Sprint backlog'u hazırlanacak

---

## 10. Versiyon Geçmişi

| Versiyon | Tarih | Yazar | Değişiklik |
|----------|-------|-------|------------|
| 1.0 | 2026-07-27 | — | İlk taslak |
| 1.1 | 2026-07-29 | — | Eksik dokümanlar tamamlandı, §3.4.5-§3.4.14 eklendi, 4 yeni çözüm doc, 10 tutarsızlık giderildi |
| 1.2 | 2026-07-29 | — | Mamul-hammadde bağı, otomatik stok kodu, lot→kaynak lot→tedarikçi zinciri ve API sözleşmeleri ana dokümanlara işlendi |
