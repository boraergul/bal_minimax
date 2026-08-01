# Çapraz Doküman Çelişki Denetimi Raporu

**Kapsam:** `C:\Users\Super\workspace` içindeki ERP `.md` dokümanlarının 2026-07-30 tarihli anlık görüntüsü (19 dosya + daha sonra ana belgelere entegre edilip silinen `UPDATE.md` notu)  
**Yöntem:** Dokümanlar arası isim, enum, tablo/alan, API endpoint ve iş kuralları karşılaştırması
**Tarih:** 2026-07-30
**Denetçi:** Hermes sub-agent

> **Not:** Yalnızca çelişkiler raporlanmıştır; dosyalarda değişiklik yapılmamıştır. Her bulgunun ilk sütununda dosya, satır veya bölüm referansı, ikinci sütunda çelişki tanımı, üçüncü sütunda diğer kaynak(lar) ile karşılaştırma yer alır.

---

## 0. Doküman Envanteri (Denetim Kapsamı)

| # | Dosya | Boyut | Not |
|---|-------|-------|-----|
| 1 | SRS-Kurutulmus-Meyve-Bal-ERP.md | 5309 satır | ⭐ Ana kaynak — gereksinimler |
| 2 | DB-Design-Kurutulmus-Meyve-Bal-ERP.md | 7321 satır | ⭐ Ana kaynak — fiziksel şema |
| 3 | SYSTEM-ARCH-Kurutulmus-Meyve-Bal-ERP.md | 2136 satır | ⭐ Ana kaynak — mimari/API |
| 4 | INDEX-DOKUMANLARI.md | 282 satır | Eşleme matrisi |
| 5 | UPDATE.md | 204 satır | Operasyonel değişiklikler |
| 6 | SON-KULLANMA-FEFO-COZUMU.md | 614 satır | Çözüm |
| 7 | KALITE-KONTROL-COZUMU.md | ~670 | Çözüm |
| 8 | STOK-DUZELTME-ONAY-COZUMU.md | 446 | Çözüm |
| 9 | BIRIM-DONUSUM-COZUMU.md | 597 | Çözüm |
| 10 | BILDIRIM-SISTEMI-COZUMU.md | 729 | Çözüm |
| 11 | DEPO-YONETIM-COZUMU.md | 1167 | Çözüm |
| 12 | URETIM-MALIYET-COZUMU.md | 762 | Çözüm |
| 13 | URUN-OZELLIK-COZUMU.md | 365 | Çözüm |
| 14 | TOPLU-ISLEM-COZUMU.md | 600+ | Çözüm |
| 15 | RAPORLAMA-MODULU-COZUMU.md | 561 | Çözüm |
| 16 | SATIS-IADE-COZUMU.md | 516 | Çözüm |
| 17 | TRANSFER-ONAY-COZUMU.md | 460+ | Çözüm |
| 18 | BARKOD-YAZDIRMA-COZUMU.md | ~580 | Çözüm |
| 19 | eksik_alan_analizi.md | 467 | Destek |
| 20 | FONKSIYONEL-EKSIKLIK-DETAYLARI.md | 696 | Destek |
| 21 | URETIMLIK_HAZIRLIK_GAP-ANALIZI-RAPORU.md | ~830 | Destek |

---

## 1. Tablo İsimlendirme Çelişkileri (TEKİL/ÇOĞUL + FARKLI İSİMLER)

Bunlar tasarım ile uygulama arasında SQL hatasına yol açacak en kritik bulgulardır. Bir tablonun **tek isimle** (örn. `stok_karti`) tanımlı olması, başka dokümanın aynı kavrama **farklı isimle** (örn. `stok_kartlari`) atıfta bulunması migration sırasında FK/reference uyumsuzluğu demektir.

### 1.1 `stok_karti` ↔ `stok_kartlari`

| Kaynak | Kullandığı İsim | Arama İfadesi |
|--------|------------------|---------------|
| **DB-Design §3.2.1 (line 259), §4, §5.x, §22 (CREATE TABLE)** | `stok_karti` (tekil) — 102 yerde | `stok_karti` |
| **INDEX-DOKUMANLARI §4, §7, §6 (line 56, 139, 219, 238, 243)** | `stok_kartlari` (çoğul) — 5 yerde | `stok_kartlari` |
| **SYSTEM-ARCH (line 875, 884-887, 908, 912, 916, 1739)** | `stok_kartlari` (çoğul) — 9 yerde | `stok_kartlari` |
| **DB-Design §21 (line 6311, 6331, 6781, 6791, 7192, 7207, 7265, 7282)** | `stok_kartlari` (çoğul) — FK referansları, 8 yerde | `REFERENCES stok_kartlari(stok_id)` |

**Çelişki özeti:**
- Veritabanı tablosu **tekil** isimle (`stok_karti`) tanımlı, ancak yeni eklenen §21 tabloları (`kalite_kontrol`, `kalite_numune`, `stok_duzeltme_talepleri`, `skt_islem`) **çoğul** forma FK atıyor: `REFERENCES stok_kartlari(stok_id)` — bu SQL'de hata verir.
- SYSTEM-ARCH indeksi: `CREATE INDEX idx_stok_lot_no ON stok_kartlari(lot_no)` — yine aynı hata.
- INDEX, hem izlenebilirlik hem FEFO satırlarında çoğulu kullanıyor.

**Etki:** Tüm SQL migration'ları kırılır. INDEX, migration sonrası kod tarafında referans veremeyecek hale gelir.

---

### 1.2 `uretim_emri` ↔ `uretim_emirleri`

| Kaynak | İsim |
|--------|------|
| DB-Design §3.4.1 (line 483), §22 CREATE TABLE (line 2183) | `uretim_emri` (tekil) |
| INDEX-DOKUMANLARI line 250 | `uretim_emirleri` (çoğul) |
| DB-Design §21'deki indeksler (line 2812) | `idx_uretim_emri_durum ON uretim_emri(durum)` (tekil) |

**Etki:** INDEX, "§3.5 Üretim → uretim_emirleri, uretim_detaylari" diyor; SRS ve DB-Design ana gövde `uretim_emri`. Rapor/endpoint dokümantasyonu yanlış tabloya atıf veriyor.

---

### 1.3 `satis_kaydi` ↔ `satis_kayitlari` ↔ `satilan_kayitlari`

| Kaynak | İsim |
|--------|------|
| SRS §3.6, DB-Design §22 CREATE TABLE (line 2229) | `satis_kaydi` (tekil) |
| SYSTEM-ARCH (line 870 bölgesi) | `satis_kayitlari` (çoğul) — arama: `satilan_kayitlari` |
| INDEX-DOKUMANLARI line 251 | `satilan_kayitlari` |

**Etki:** SYSTEM-ARCH ve INDEX Türkçe olmayan (`satilan_kayitlari`) formu tercih ediyor. Üç farklı isim aynı kavram için.

---

### 1.4 `satis_kalemleri` ↔ `satilan_kalemleri`

| Kaynak | İsim |
|--------|------|
| SRS §3.6, DB-Design §22 (line 2254) | `satis_kalemleri` |
| INDEX-DOKUMANLARI line 252 | `satilan_kalemleri` |
| DB-Design §22 (line 2413 vs 2254) | `satis_kalemleri` (FK `REFERENCES satis_kalemleri(satis_kalem_id)`) |

**Etki:** INDEX'te "satilan_kalemleri" yazıyor, ama DB-Design ve SRS "satis_kalemleri" diyor.

---

### 1.5 `tedarikci_degerlendirme` ↔ `tedarikci_degerlendirmeleri`

| Kaynak | İsim |
|--------|------|
| DB-Design §22 (line 2146, `CREATE TABLE tedarikci_degerlendirme`) | `tedarikci_degerlendirme` |
| INDEX-DOKUMANLARI line 235 | `tedarikci_degerlendirmeleri` |
| SRS §3.1.5 | `tedarikci_degerlendirme` (alan listesi, prefix'i olmayan) |

---

### 1.6 `kalite_kontrol` ↔ `kalite_kontrol_kayitlari`

| Kaynak | İsim |
|--------|------|
| **DB-Design §3.8.2 (line 740), §22 line 2395 (CREATE TABLE), §21 (line 6318)** | `kalite_kontrol` |
| **DB-Design §11.3 (line 3175)** | `kalite_kontrol_kayitlari` |
| INDEX, KALITE-KONTROL-COZUMU, FONKSIYONEL-EKSIKLIK | `kalite_kontrol` |

**Çelişki özeti:** Aynı kavram (kalite kontrol analizi) için DB-Design **kendisi iki ayrı tablo** tanımlıyor: §3.8.2 / §22 / §21'de `kalite_kontrol`, §11.3'te `kalite_kontrol_kayitlari`. İki tablonun kolon seti örtüşüyor (`kontrol_tarihi`, `sonuc_deger`/`sonuc`, `lab_rapor_no`/`kontrol_eden_lab`) — bu tasarım net değil.

---

### 1.7 `lot_izlenebilirlik` ↔ `gida_izlenebilirlik_log`

| Kaynak | İsim |
|--------|------|
| **DB-Design §11.1 (line 3080)** | `gida_izlenebilirlik_log` |
| **INDEX-DOKUMANLARI line 146, 240** | `lot_izlenebilirlik` |
| **SYSTEM-ARCH line 884** | `lot_izlenebilirlik` |

**Çelişki:** DB-Design `gida_izlenebilirlik_log` adıyla bir tablo yaratmış; INDEX ve SYSTEM-ARCH aynı kavramı `lot_izlenebilirlik` olarak anıyor. Gıda İzlenebilirlik Tebliği referansı için tasarlanan tablonun adı diğer iki ana kaynakta asla geçmiyor.

---

### 1.8 `uretim_maliyet` (tek tablo) ↔ `uretim_iscilik` + `uretim_enerji` + `uretim_bakim`/`uretim_genel_gider` (4 ayrı tablo)

| Kaynak | Model |
|--------|-------|
| **DB-Design §3.8.3 (line 769), §22 (line 2411)** | Tek `uretim_maliyet` tablosu — malzeme/işçilik/enerji/bakım/diger sütun olarak |
| **DB-Design §21 (line 6903, ~line 2725-2770), INDEX, URETIM-MALIYET-COZUMU** | 4 ayrı tablo: `uretim_iscilik`, `uretim_enerji`, `uretim_bakim`, `uretim_genel_gider` |

**Çelişki:** DB-Design içinde bile iki farklı maliyet modellemesi var. INDEX ve çözüm dokümanı §3.4.13 ile eşleştirirken §21'deki ayrı tabloları öne çıkarıyor; ana §3.8 ise tek tablo diyor. Migration kararı net değil.

---

### 1.9 `kalite_numune` ↔ `kalite_numuneleri`

DB-Design, INDEX, KALITE-KONTROL-COZUMU: `kalite_numune` (§21 line 6376); INDEX'te tutarlı. Bu noktada INDEX-DOKUMANLARI çoğul formu vermemiş. (Düzeltme: çoğul form başka yerde geçmiyor → uyumlu görünüyor; **düzeltildi**: tek büyük çelişki 1.6 kapsamında.)

---

### 1.10 `uretim_lot` vs INDEX'te `uretim_lotlari` yazımı / satış dosyası

INDEX-DOKUMANLARI line 240 diyor ki `uretim_lot`; ancak UPDATE ve diğer çözüm dosyalarında `uretim_lot_id` kullanılıyor. Buradaki tutarsızlık **çözüm 1.2 ve 1.8 kapsamında değil**; ayrıca dosya dışı.

---

## 2. Enum / Statü Çelişkileri

### 2.1 `stok_karti.durum` — Yeni statülerin yazılış biçimi (SON_KULLANIM_GECDI ↔ SON_KULLANIM_GECTI)

| Kaynak | Değer |
|--------|-------|
| **SON-KULLANMA-FEFO-COZUMU §1.2 (line 49), §2.1 (line 60), §2.3 (line 66, 93), §2.4 (line 127, 138)** | **`SON_KULLANIM_GECTI`** (T - harfiyen, yazım hatası) |
| **SON-KULLANMA-FEFO-COZUMU §3.1 (line 172-174 ALTER TYPE), §3.6, §4.3 örnek JSON, §5.3, §6** | `SON_KULLANIM_GECDI` (D - doğru yazım) |
| **SRS §3.4.6 (line 411, 412, 418, 419, 527, 528), §3.4.7 (line 568, 569, 579)** | `SON_KULLANIM_GECDI` |
| **DB-Design §9.1 (line 2965)** | `SON_KULLANIM_GECDI` (D) |
| **INDEX §6 line 219** | Üçü birden: `SON_KULLANIM_GECDI`, `SON_KULLANIM_RISKLI`, `SON_KULLANIM_ISLEM_GECICI` |

**Çelişki özeti:** **Aynı çözüm dokümanının kendisinde** (SON-KULLANMA-FEFO-COZUMU) iki ayrı yazım kullanılıyor. `T` harflerinin yer alması §1.2, §2.3, §2.4'te — bunlar SQL DDL bölümüyle (§3.1) çelişiyor. PostgreSQL `ALTER TYPE ... ADD VALUE 'SON_KULLANIM_GECTI'` iki kez denenirse hata verir.

**Etki:** Migration SQL'i hatalı çalışır; ilk değer eklendikten sonra ikincisi "already exists" alır.

---

### 2.2 `stok_karti.durum` — Eklenecek değerlerde eksik

| Kaynak | Set |
|--------|-----|
| DB-Design §9.1 (line 2963) | `AKTIF, BITTI, IPTAL, KALITE_KONTROL, DEPO_DISI, RET, SON_KULLANIM_GECDI, SON_KULLANIM_RISKLI` (8 değer) |
| INDEX §6 line 219 | Bu 8 değere ek olarak `SON_KULLANIM_ISLEM_GECICI` da eklendi diyor (9 değer) |
| SON-KULLANMA-FEFO-COZUMU §2.2 (line 73-79) | 3 yeni değer tanımlanıyor: `SON_KULLANIM_GECTI`, `SON_KULLANIM_RISKLI`, `SON_KULLANIM_IŞLEM_GECICI` |

**Çelişki:** DB-Design §9.1 (veri sözlüğü) `SON_KULLANIM_ISLEM_GECICI` değerini **listeye dahil etmemiş** — sadece 8 değer var, 9. değer eksik.

---

### 2.3 `uretim_emri.durum` — 4 değer

DB-Design §9.1 (line 2976), §22 CREATE TABLE CHECK, SRS §3.5 ve KALITE-KONTROL-COZUMU line 139 hep birlikte:
`BEKLEMEDE, ONAYLANDI, TAMAMLANDI, IPTAL`

**Çelişki:** SYSTEM-ARCH (line 411, 464, 508, 535) diğer modüllerin enumlarını listeliyor; ancak `uretim_emri.durum` için doğrudan bir tanım vermiyor. Üretim emrinin **`DURDURULDU`** veya **`KISMEN_TAMAMLANDI`** durumu başka modüllerde ima edilmesine rağmen yok.

**Öneri:** Yeni üretim akışının kısmi tamamlanma senaryosu için `uretim_emri.durum` setinin gözden geçirilmesi.

---

### 2.4 `kalite_kontrol.durum` — Üç farklı enum seti

Aynı alan için üç ayrı değer seti var:

| Kaynak | Değerler |
|--------|----------|
| **DB-Design §22 line 6360 (CHECK constraint)** | `('BEKLIYOR', 'KONTROL_EDILIYOR', 'ONAYLI', 'KISMEN_KABUL', 'RED')` — 5 değer |
| **DB-Design §3.8.2 (line 740), §21 (line 6318 CREATE TABLE)** | `sonuc` alanı: `('GECTI', 'KALDI', 'RET')` — 3 değer (kontrol _sonucu_) |
| **KALITE-KONTROL-COZUMU §2.1 (line 121-130), FONKSIYONEL-EKSIKLIK-DETAYLARI line 219, 302** | `('BEKLIYOR', 'KABUL', 'RET', 'KISMEN_KABUL')` — 4 değer |

**Çelişki:** Üç kaynak aynı kavram için üç ayrı set veriyor. `KABUL`/`ONAYLI`/`GECTI` isimleri arasında seçim yapılmamış; `RED`/`RET` karışıklığı var. Trigger ve state-machine kodunda hangi listenin doğru olduğu **net değil**.

---

### 2.5 `stok_hareketleri.hareket_tipi` — Eksik `SON_KULLANIM_CIKIS`

DB-Design §9.1 (line 2966) enum: `GIRIS, URETIM_GIRIS, URETIM_CIKIS, SATIS_CIKIS, IADE, DUZELTME, TRANSFER`
SON-KULLANMA-FEFO-COZUMU §6 (line 588) ve §7 (line 600): `SON_KULLANIM_CIKIS` eklenecek diyor; DB-Design enum'una yansımamış.

---

### 2.6 `kalite_geri_cekme.durum`/`sinif` çelişkisi (DB-Design §11)

DB-Design §11.2 (line 3136-3162):
- `sinif`: `CLASS1, CLASS2, CLASS3`
- `durum`: `AKTİF, TAMAMLANDI, İPTAL` (Türkçe karakterli büyük harf)

INDEX'te bu tablonun adı veya bu enum seti geçmiyor. DB-Design içinde `durum` Türkçe karakter kullanırken diğer tablolarda (`AKTIF`, `BITTI`, `IPTAL` — ASCII) tutarsız.

---

### 2.7 `stok_duzeltme_talepleri.durum` yazım hatası

SYSTEM-ARCH line 535: `OLUSTURULDU, BEKLEMEDE_ONAY, ONAYLANDI, RETTEDI, STOK_GUNCLLENDI` — `STOK_GUNCLLENDI` ve `RETTEDI` yazım hataları (doğrusu: `STOK_GUNCELLENDI`, `REDDEDILDI`). Diğer modüllerde `REDDEDILDI` kullanılıyor (DB-Design §3.8.1 line 723).

---

### 2.8 `toplu_islemler.durum` — Yalnızca SYSTEM-ARCH'ta

SYSTEM-ARCH line 464: `BEKLEMEDE, VALIDATING, ISLENIYOR, TAMAMLANDI, HATALAR_VAR, IPTAL_EDILDI`
TOPLU-ISLEM-COZUMU ve DB-Design'da bu enum seti geçmiyor (dokümanlar arası kopukluk).

---

## 3. Alan / Sütun Çelişkileri

### 3.1 `uretim_emri` tablosunda (DB-Design §22) **ürünler alanları sızmış**

DB-Design §22 `CREATE TABLE uretim_emri` (line 2183-2195) tablo tanımında şu sütunlar var:
```
stok_kodu VARCHAR(50),
barkod VARCHAR(50),
aciklama TEXT,
gorsel_url VARCHAR(500),
agirlik DECIMAL(10,3),
hacim DECIMAL(10,3),
minimum_stok_seviyesi DECIMAL(15,3),
maksimum_stok_seviyesi DECIMAL(15,3),
raf_omru_gun INTEGER
```
Bunlar `urunler` tablosunun alanları — `uretim_emri` tablosunda olmamalı.

DB-Design §3.4.1 (line 483) doğru spec: sadece `uretim_id, uretim_no, tarih, durum, planlanan_tarih, tamamlama_tarihi, not, gerceklesen_miktar, olusturma_tarihi, guncelleme_tarihi, silme_tarihi, olusturan_kullanici_id`.

**Etki:** §22'deki migration ile uygulanırsa `uretim_emri` tablosu gereksiz sütunlarla şişer; `urunler` ve `uretim_emri` arasında sütun duplicasyonu olur.

---

### 3.2 `sistem_ayarlari` PK — `ayar_adi` vs `ayar_key`

| Kaynak | Anahtar Kolon |
|--------|---------------|
| DB-Design §3.7.1 (line 676), §3.7.2 (line 911), §22 (line 2354) | `ayar_adi` (UNIQUE) |
| SON-KULLANMA-FEFO-COZUMU §3.5 (line 240) | `INSERT INTO sistem_ayarlari (ayar_key, deger, Aciklama) VALUES ('SKT_UYARI_GUN', '30', ...)` |

**Çelişki:** Çözüm dokümanı INSERT'i yanlış kolon adıyla yazılmış. `ayar_key` kolonu yok; bu SQL çalışmaz.

---

### 3.3 SKT uyarı eşiği — 3 ayrı isim

| Kaynak | Anahtar / Ayar |
|--------|----------------|
| SRS §3.4.6.3 (line 552, 559) | `son_kullanma_uyari_gun` (sistem ayarı, snake_case Türkçe) |
| SRS §3.4.6 (line 412, 419), §3.4.7 (line 569) | `SKT_uYARI_GUN` (mixed case) |
| SON-KULLANMA-FEFO-COZUMU §3.5 (line 242), §5.4 (line 558, 561) | `SKT_UYARI_GUN` (Tüm Büyük) |

**Çelişki:** Üç kaynak aynı ayar için farklı anahtar ismi veriyor. Veri sözlüğündeki (`sistem_ayarlari.ayar_adi`) gerçek değer hangisi? Schema'da bu sütun yok; sadece anahtarla çağrılacak bir lookup gerekiyor.

---

### 3.4 `depo_konumlar.son_kullanma_uyari` vs `skd_gun`

DEPO-YONETIM-COZUMU §2 (line 173): `son_kullanma_uyari` INTEGER (varsayılan 30, gün)
SON-KULLANMA-FEFO-COZUMU §4.2 JSON (line 375): `skd_gun` INTEGER (negatif/pozitif gün farkı)

**Çelişki:** İki alan tamamen farklı semantiklere sahip: biri uyarı eşiği (gün), diğeri son kullanmaya kalan gün sayısı. Ad benzerliği nedeniyle karıştırılabilir.

---

### 3.5 DB-Design §3.7.1 ile §3.7.2 bölüm numaralandırma çakışması

DB-Design dosyasında iki kez `§3.7.1 sistem_ayarlari` ve iki kez `§3.7.2 audit_log` başlığı var (line 671 ve line 906). Bu:
- Kopya-yapıştır / düzenleme hatası sonucu aynı başlık numarası iki yerde geçiyor.
- Takip eden bölümler de sıra dışı: §3.7.2 `audit_log` iki kez geçiyor, `fifo_ihlal_onay` §3.8.1 olarak planlanmış ama tablo §3.7.2 sonrası geliyor.

---

### 3.6 `satis_kaydi.fatura_*` alanları — "Fatura kapsam dışı" şartına rağmen

SRS §1.2 (line 26): *"Faturalama/Ödeme Takibi (bu sistem haricinde yapılacak)"* — kapsam dışı.

Ancak aynı SRS:
- §3.3.1 `musteriler.adres` alanı açıklaması: "Fatura adresi" (line 350)
- §3.4.2 `stok_karti.giris_referans_no`: "Alım irsaliyesi/fatura numarası (P2)" (line 402)
- §3.6 `satis_kaydi.fatura_kesildi`, `fatura_no`, `fatura_tarihi` (line 1029-1031)
- §3.6 satır 1053'te **Not:** "Faturalama bu sistemde YAPILMAYACAKTIR. Satış kaydı takip amaçlıdır."
- §3.12 performans metrikleri (line 1287): "fatura kesimi" yazıyor
- §8.3 KDV defterleri (line 2632-2633): "Her fatura için KDV oranı, matrah ve tutar ayrı kaydedilir" / "Alış ve satış faturaları ayrı defterlerde izlenir"
- §8.4 (line 2640): "Faturalar — 10 yıl saklama"
- eksik_alan_analizi.md: `teslimat_adresi` "Fatura adresinden farklı teslimat adresi", `fatura_no`, `fatura_tarihi` alanları "Eklenmeli" olarak listelemiş

**Çapraz:** SATIS-IADE-COZUMU §6.5 (line 366-372), §8.5 (line 475-477), §9 (line 495-497) **otomatik fatura düzeltmesi** ve **e-fatura entegrasyonu** varsayıyor.

DB-Design §13 (line 3326-3360): `fatura_kesme_kurallari` ve `kdv_hareket` tabloları tanımlı.

**Çelişki özeti:** "Faturalama kapsam dışı" şartı dokümanın başında verilmiş, ama:
1. Aynı dokümanın §3.6 ve §8 bölümlerinde fatura alanları, KDV defterleri ve uzun süreli saklama kuralları detaylandırılmış.
2. Birden fazla çözüm dokümanı ve DB-Design tablo düzeyinde fatura işlemeye kalkışmış.
3. INDEX §6 line 111'de "§3.6 Satış Yönetimi (Fatura yok)" notu var — ama pratikte her yerde fatura var.

**Etki:** SRS kapsam yazımı ile tutarsız iş kuralları birlikte yaşıyor. Satış İade çözümünün tamamı fatura varsayımı üzerine kurulu (müşteriye düzeltme faturası, e-fatura entegrasyonu, GİB'e uyum), bu da SRS'nin "kapsam dışı" ifadesiyle çelişiyor.

---

### 3.7 `barkod_yazici` INDEX'te var, DB-Design'da yok

INDEX-DOKUMANLARI line 67: "`Barkod/Etiket` çözüm doc etiket_sablonlari, **barkod_yazici** tablolarını kapsıyor" diyor.
BARKOD-YAZDIRMA-COZUMU ve DB-Design'ın hiçbir bölümünde `barkod_yazici` tablosu tanımlı değil. Sadece `etiket_sablon` ve `etiket_alan` tabloları var (DB-Design §3.5.4-3.5.5 line 2274-2298).

---

### 3.8 `tedarikci_fiyat_gecmisi` alanlarında fiyat ayrıştırması

DB-Design §22 line 2111: `tedarikci_fiyat_gecmisi` tablosu var. Ancak SRS §3.1.5 (line 217): fiyat_puanı, hizmet_puanı, genel_puan, ödeme_planı, sertifikalar, resmi_dosyalar alanları `tedarikci_degerlendirme` tablosunda listelenmiş. Fiyat geçmişi ve değerlendirme ayrı tablolar — bunların SRS'deki anlatımla eşleşmesi net değil.

---

## 4. API Endpoint Çelişkileri

### 4.1 SKT/FEFO endpoint'leri — 3 farklı versiyon

| Kaynak | Endpoint |
|--------|----------|
| SON-KULLANMA-FEFO-COZUMU §4 (line 280, 343, 384, 433) | `GET /api/v1/stok/lot-onerisi`, `GET /api/v1/stok/skt-raporu`, `POST /api/v1/stok/skt-islem`, `POST /api/v1/stok/skt-esik` |
| SYSTEM-ARCH §3.2.17 (line 505) | `/api/v1/stok/skt` (prefix-eklemli, 7 endpoint olacak) |
| INDEX-DOKUMANLARI line 194 | `SKT Kontrol — /api/v1/stok/skt — 7 endpoint — FEFO/SKT` |
| SRS §3.4.7 | SKT endpointi verilmemiş (görünürde yok) |

**Çelişki:** Çözüm doc altında 4 ayrı endpoint var (`lot-onerisi`, `skt-raporu`, `skt-islem`, `skt-esik`); SYSTEM-ARCH ve INDEX bunları `/api/v1/stok/skt` altında toplamış (7 endpoint), ancak tek tek hangilerinin karşılık geldiği netleşmemiş.

---

### 4.2 Transfer endpointleri — `transfer` vs `transferler`

| Kaynak | Endpoint |
|--------|----------|
| INDEX-DOKUMANLARI line 201 | `Transfer Onay — /api/v1/depo/transfer — 7 endpoint` |
| DEPO-YONETIM-COZUMU §7 (line 644-653) ve §11 (line 940-949) | `/api/v1/depo/transferler` (çoğul, 10 endpoint) |

**Etki:** TRANSFER-ONAY-COZUMU ile DEPO-YONETIM-COZUMU iki farklı endpoint ailesi öne sürüyor. Bu iki çözüm dokümanı arasındaki sınır net değil.

---

### 4.3 İzlenebilirlik endpointi — 4 farklı versiyon

| Kaynak | Endpoint |
|--------|----------|
| SRS §3.4.3 / API listesi (line 2141) | `GET /api/v1/stok/lot/{lotNo}` |
| SYSTEM-ARCH line 314 | `GET /lot/{lot_no}` (prefix yok, doğrudan path) |
| SYSTEM-ARCH line 356 | `GET /izlenebilirlik/lot/{lot_no}` (prefix yok) |
| UPDATE.md line 24, 164 | `GET /api/v1/raporlar/izlenebilirlik/lot/{lot_no}` |
| UPDATE.md line 155 ayrıca | `POST /uretim/{id}/tamamla` döndürür `kaynak_lot` |

**Çelişki:** Aynı kavram (lot izlenebilirlik sorgusu) için 4 farklı endpoint path var; bunlardan hangisinin standart olduğu net değil.

---

### 4.4 Ürün endpoint'leri — UPDATE.md'nin bağlamı

UPDATE.md (line 148-151) yeni endpoint'leri veriyor:
- `GET /urunler/`, `POST /urunler/`, `PUT /urunler/{id}` — `/api/v1` prefix'i yok
- `GET /urunler/hammaddeler/liste` — prefix yok
- `POST /uretim/`, `POST /uretim/{id}/tamamla` — prefix yok
- `GET /raporlar/izlenebilirlik/lot/{lot_no}` — prefix yok

INDEX ve SYSTEM-ARCH tüm endpointlerde `/api/v1` zorunlu.

**Etki:** UPDATE.md'deki endpointler ile ana dökümanlar arasında prefix uyumu yok. UPDATE.md'nin "kısa yazım" olduğu varsayılırsa, bunun açıkça belirtilmesi gerek.

---

### 4.5 Satış çıkış endpoint'i — FEFO-COZUMU

SON-KULLANMA-FEFO-COZUMU §5.1 (line 497): `POST /api/v1/satis/satis-cikis`
DB-Design / SRS / INDEX'te böyle bir endpoint yok; "Satış /api/v1/satis — 5 endpoint" diyor (INDEX line 197) ama `satis-cikis`'i tek tek anmıyor.

---

### 4.6 Üretim maliyet hesaplama endpoint'i

FONKSIYONEL-EKSIKLIK-DETAYLARI line 609: `POST /api/v1/uretim/{uretim_id}/maliyet-hesapla`
URETIM-MALIYET-COZUMU: Uygulama PostgreSQL trigger'ı ile maliyet hesaplamayı tetikliyor (`AFTER UPDATE ON uretim_emri WHEN durum='TAMAMLANDI'`). Yani **iki ayrı strateji**:
- Çözüm doc: tetikleyici tabanlı (otomatik)
- Fonksiyonel eksiklik: explicit endpoint ile hesap

---

## 5. İş Kuralları Çelişkileri

### 5.1 FIFO/FEFO algoritması — Öncelik sıralaması

SON-KULLANMA-FEFO-COZUMU §2.1 (line 57-63) ve INDEX §6 line 217, SRS §3.4.6, DB-Design §5 ve §6 üzerinde **FEFO+FIFO hibrit kuralı** tanımlı:
- Öncelik 1 (en yüksek): `SON_KULLANIM_GECTI` (bloke)
- Öncelik 2: `SON_KULLANIM_RISKLI` → FEFO
- Öncelik 3: Normal → FIFO

Ancak DB-Design §6.1 (line 1601-1610) **`FIFO Stratejisi`** başlığıyla sadece FIFO tanımlıyor. §6.2 (`fn_fifo_lot_sec`) sadece giriş tarihine göre sıralama yapıyor; FEFO mantığı içermiyor.

**Çelişki:** DB-Design ana gövde FIFO ile çalışan bir fonksiyon tanımlamış (§6.2), SRS §3.4.6 ve FEFO çözüm dokümanı ise FEFO-FIFO hibrit diyor. SQL fonksiyonu (`fn_fifo_lot_sec`) §3.4.6 ile uyumlu değil.

---

### 5.2 FIFO İhlal uyarısı tetikleyicisi — 7 gün sabit

DB-Design §6.3 (line 1690-1709): "FIFO ihlal uyarısı — Lot seçilen lot, FIFO sırasına göre 7 günden fazla geç ise uyarı."
Bu 7 günlük eşik başka hiçbir yerde geçmiyor; bir config'e bağlı değil.

---

### 5.3 Lot izlenebilirlik — tedarikçi bağlantısı (UPDATE eksik belgeleme)

UPDATE.md (line 5-19): "Üretim tamamlandığında `kaynak_stok_id` otomatik olarak ayarlanıyor, `tedarikci_id` ham maddeden miras alınıyor."
- Bu davranış DB-Design §3.2.1 `stok_karti` (line 268): "`kaynak_stok_id` UUID Hayır — Kaynak stok (üretim ise, FK → stok_karti)".
- Ama §22'deki `CREATE TABLE stok_karti` (line 1997): `kaynak_stok_id UUID REFERENCES stok_karti(stok_id)` — nullable self-FK.

SRS §3.4.3 / §3.5: üretim-emri tamamlandığında, hammadde lotunun `tedarikci_id` bilgisinin otomatik devralınacağına dair bir kural **yok**.

**Çelişki:** UPDATE.md yeni bir iş kuralı ekliyor (otomatik `tedarikci_id` mirası) ama bunu ana kaynaklara (SRS, DB-Design) yansıtmamış.

---

### 5.4 Üretim tamamlamada otomatik tetikleyici stratejisi

| Kaynak | Yaklaşım |
|--------|----------|
| URETIM-MALIYET-COZUMU §7 (line 489), DB-Design §5.5 | PostgreSQL `AFTER UPDATE` trigger ile `uretim_emri.durum = 'TAMAMLANDI'` olunca otomatik maliyet hesabı |
| FONKSIYONEL-EKSIKLIK-DETAYLARI line 609 | Explicit `POST /api/v1/uretim/{id}/maliyet-hesapla` endpoint'i |
| UPDATE.md line 17-19 | Üretim tamamlamada transaction içinde 5 işlem birden: hammadde tüketimi, mamul stok oluşturma, `kaynak_stok_id` bağlantısı, tedarikçi devri, üretim lot kaydı |

**Çelişki:** Üç farklı yerde üç farklı uygulama stratejisi anlatılıyor. Hangisinin kullanılacağı net değil; hepsi birlikte çalışırsa idempotency riski var.

---

### 5.5 FIFO İhlal tetikleyicisi etki alanı

DB-Design §5.5.1 (line 1344-1399): trigger sadece `hareket_tipi = 'SATIS_CIKIS'` için FIFO ihlal kontrolü yapıyor.
FEFO çözümünde ise FIFO sırası **sadece `AKTIF` normal lotlar** için (priority 3); üretim çıkışı, satış çıkışı, transfer çıkışı için uygulanması gerektiği ima ediliyor.
- Üretim çıkışı (`URETIM_CIKIS`) için trigger tetiklenmiyor.
- Transfer çıkışı (`TRANSFER`) için tetiklenmiyor.

---

### 5.6 FEFO/FIFO ihlal yetkisi

SON-KULLANMA-FEFO-COZUMU §6 (line 615): "FEFO ihlal onayı: Son kullanma yaklaşan lot varken daha yeni lot seçme yetkisi kimde olacak? — **Açık nokta**"
- Bu yetki matrisi tanımsız; sorumluluk atanmamış.

---

## 6. İzlenebilirlik / Mamül-Hammadde İlişkisi Çelişkileri

### 6.1 İzlenebilirlik tablo seçimi (1.7 ile bağlantılı)

Yukarıda 1.7'de belirtildiği üzere: `gida_izlenebilirlik_log` ↔ `lot_izlenebilirlik`. İki farklı tablo, iki farklı alan seti.
- DB-Design §11.1 `gida_izlenebilirlik_log`: `kaynak_tablo`, `kaynak_id`, `asama` (TEDARİK, ÜRETİM, …) içeriyor → zengin log
- INDEX ve SYSTEM-ARCH'taki `lot_izlenebilirlik`: varlığı belirtilmiş ama şeması yok

**Etki:** İzlenebilirlik zincirinin nasıl sorgulanacağı (DB tarafı JOIN mi, log mu) net değil.

---

### 6.2 `hammadde_id` eklenmesi (UPDATE.md §3)

UPDATE.md line 79-93: `urunler` tablosuna `hammadde_id` (self-FK) eklendi.
- DB-Design §22 (line 1926) `urunler` tablosu: `hammadde_id UUID` zaten var (line 191) — `Mamulün temel ham madde ürünü (self-FK → urunler.urun_id); yalnızca MAMUL için zorunlu`.

**Çelişki:** UPDATE.md bunu "yeni" diye sunuyor, ama DB-Design'da zaten var. Güncelleme notu ile ana DB-Design arasında **tarih senkronizasyonu kopuk**.

---

### 6.3 `kaynak_stok_id` izlenebilirlik sütunu

| Kaynak | Davranış |
|--------|----------|
| DB-Design §22 line 2004 | `kaynak_stok_id UUID REFERENCES stok_karti(stok_id)` (nullable self-FK) |
| UPDATE.md line 11-14 | Önceden `NULL` idi; artık otomatik dolduruluyor |
| UPDATE.md line 92 | `ALTER TABLE urunler ADD COLUMN hammadde_id UUID REFERENCES urunler(id)` |

DB-Design zaten `kaynak_stok_id` kolonunu içeriyor; UPDATE bunu "yeni gelen özellik" gibi sunmamalı.

---

### 6.4 Üretim-detay ile `mamul_urun_id`/`hammadde_stok_id` çelişkisi

DB-Design §3.4.2 (line 507-509):
- `uretim_detay.mamul_urun_id` (FK → urunler) ← üretilecek mamul
- `uretim_detay.hammadde_urun_id` (FK → urunler) ← kullanılacak hammadde
- `uretim_detay.hammadde_stok_id` (FK → stok_karti) ← spesifik lot

URUN-OZELLIK-COZUMU'nda bu ayrım yok; çözüm dökümanı `urun_donusum` üzerinden mamul-hammadde eşleştirmesi kullanıyor, bu ayrı bir tablo.

İlişki: hem `uretim_detay.hammadde_*` hem `urunler.hammadde_id` (self-FK) hem `urun_donusum` üç ayrı yerde mamul-hammadde eşleşmesi tutuluyor. Tek kaynaktan idare etme kararı yok.

---

## 7. Erişim Yetkisi / Rol Çelişkileri

### 7.1 SKT yaklaşan lot varken daha yeni lot seçimi — yetki tanımsız

SON-KULLANMA-FEFO-COZUMU §6 (line 615): "FEFO ihlal onayı — Açık nokta (Review Gerekli)"
FIFO için DB-Design §3.8.1 `fifo_ihlal_onay` tablosu var; FEFO için karşılığı yok.

---

### 7.2 İmha/indirim işlem yetkisi

SON-KULLANMA-FEFO-COZUMU §8 (line 609): "İmha onay yetkisi — Açık nokta. ADMIN only mi, Depo Sorumlusu + Yönetici mi?"

---

### 7.3 Kritik ihlal ADMIN onayı

SRS §3.4.6 (line 1101): "Kritik ihlaller (SKT < 3 gün, miktar > %25) sadece ADMIN onayı ile geçerli olur."
Bu, dokümantasyon başka yerinde (SKT çözümünde veya SYSTEM-ARCH'ta) tekrar geçmiyor.

---

### 7.4 Düzeltme talebi onay mekanizması

DB-Design §3.8.1 (line 723) `fifo_ihlal_onay.onaylayan_kullanici_id`: herhangi bir kullanıcı olabilir gibi görünüyor.
STOK-DUZELTME-ONAY-COZUMU: "İki aşamalı onay" diyor — operatör + yönetici.
Bu iki kaynak aynı kavramı (düzeltme onayı) farklı kurguluyor.

---

## 8. Diğer Çapraz Çelişkiler

### 8.1 `stok_karti.aktif` boolean çelişkisi

DB-Design §22 (line 1997) `stok_karti` tablosunda `aktif` boolean yok (soft-delete `silme_tarihi` kullanılıyor).
SYSTEM-ARCH line 887 indeks: `CREATE INDEX idx_stok_son_kullanma ON stok_kartlari(son_kullanma) WHERE aktif = true;` — `aktif` boolean varsayıyor. Bu kolon gerçekte yok.

---

### 8.2 `urunler.kategori` — 9 değer

DB-Design §9.1 (line 2961): `MEYVE, BAL, KARSIM, KURUYEMIS, SEBZE, KURU_BAKLIYAT, YAG, TURSU, DIGER` — 9 değer.
SRS §3.2.1 (line 228): aynı 9 değer.
INDEX §6 line 218: "6 yeni kategori eklendi: KURUYEMIS, SEBZE, KURU_BAKLIYAT, YAG, TURSU, DIGER" diyor; yani 3 → 9'a genişletilmiş.

**Çelişki:** INDEX "6 yeni eklendi" diyor; ancak gerçek ekleme 6 değil, zaten 3 (MEYVE, BAL, KARSIM) → 6 yeni eklenmiş. Bu doğru; ama listede yeni eklenenler `KURUYEMIS, SEBZE, KURU_BAKLIYAT, YAG, TURSU, DIGER` = 6. Bilgi doğru ancak bu rakamın "yenilik listesi" gibi sunulması kafa karıştırıcı.

---

### 8.3 Birim dönüşüm tablo modeli

DB-Design §22 line 2685-2704: `birimler` ve `birim_donusum` iki ayrı tablo olarak tanımlı.
Ama `birim_donusum` tablosu `kaynak_birim_id` ve `hedef_birim_id` ile çalışıyor; `carpan` üzerinden dönüşüm yapıyor. Bu, geleneksel N x M dönüşüm matrisi yerine "kaynak→hedef carpan" yaklaşımı.

SRS §3.2.6 (line 324-334) ve DB-Design §3.5.4 `urun_donusum` tablosu ise mamul→hammadde dönüşüm oranları. İki farklı kavram:
- `urun_donusum`: Ürün ağacı (mamul↔hammadde reçetesi)
- `birim_donusum`: Birim dönüşümü (kg↔gr, adet↔koli)

Bunlar çelişmiyor; ancak **isim benzerliği** raporlamayı karıştırabilir.

---

### 8.4 UPDATE.md ile SRS §3.4.6 uyumsuz tetikleyici

UPDATE.md line 173: "`uretim.py` — kaynak_stok_id bağlantısı, decimal fix".
SRS §3.4.6 / §3.5: Üretim tamamlama sonrasında hammadde lot tedarikçi `tedarikci_id`'sinin mamule **devredileceği** kural yok.
Bu yeni iş kuralı UPDATE'de "yeni özellik" gibi sunuluyor; SRS'de yok.

---

### 8.5 INDEX, eksik_alan_analizi, FONKSIYONEL-EKSIKLIK arasındaki "tamamlandı" tutarsızlığı

INDEX §8 Checklist:
- ✓ "Tüm SRS eksiklikleri giderildi (§3.4.5-§3.4.14)"
- ✓ "Cross-doc tutarsızlıklar çözüldü"

Ama FONKSIYONEL-EKSIKLIK (line 48, 379 vb.) ve eksik_alan_analizi defalarca "Eklenmeli", "Belirsiz", "Açık nokta" diye alanları işaretliyor. Bu iki kaynak arasında **kapanmamış görev** çelişkisi var.

---

### 8.6 Satış kalemi FK hedef tutarsızlığı

DB-Design §8.1 (line 2920) ilişki tablosu:
"satis_kalemleri → stok_karti N:1 — Satış kalemi bir lot/stok kartına bağlı"

DB-Design §22 CREATE TABLE satis_kalemleri (line 2254 civarı): `stok_id UUID REFERENCES stok_karti(stok_id)` — FK hedefi stok_karti.

SYSTEM-ARCH (line 356): `/izlenebilirlik/lot/{lot_no}` endpointi rapor dönerken satis_kalemleri → lot zincire katılıyor mu, katılmıyor mu? İlişki haritasında (line 2920) yazıyor ama JOIN sorguları belirsiz.

---

## 9. Eksik / Tutarsız Verilen Migration Desteği

INDEX §8 checklist:
- [ ] "`update_db_design.py` çalıştırılacak (migration)" — **ÇALIŞTIRILMAMIŞ**.
- [ ] "Alembic migration dosyaları oluşturulacak" — **YOK**.
- UPDATE.md line 198: "Database migration için manual ALTER TABLE çalıştırıldı (Alembic migration script'i yok)."

`update_db_design.py` dosyası **stok_karti** (tekil) üzerinde replace yapıyor (line 161-208); alembic yaratacak script yok. Bu da tablo isimlendirme çelişkisinin (1.1) canlı sisteme yansımadan önce çözülmesi gerektiğini gösteriyor.

---

## 10. Faturalama Kapsam Dışı Şartı — Detaylı Matris

SRS §1.2 açıkça "Faturalama bu sistem haricinde yapılacak" diyor. Bu şarta aykırı görünen tüm alanlar:

| Bulgu | Dosya | Satır | İhlal Tipi |
|-------|-------|-------|------------|
| `musteriler.adres` "Fatura adresi" | SRS | 350 | Alan semantiği fatura varsayıyor |
| `stok_karti.giris_referans_no` "fatura numarası" | SRS | 402 | Alım fatura takibi |
| `satis_kaydi.fatura_no`, `fatura_tarihi`, `fatura_kesildi` (P1) | SRS | 1029-1031 | Satış faturası alanları |
| "Müşteri seçimi, fatura kesimi" | SRS | 1287 | Satış modülü performans metrikleri arasında |
| KDV oranı, matrah, tutar; Alış/Satış Kayıt Defteri | SRS | 2632-2633 | Yasal muhasebe defterleri |
| Faturalar 10 yıl saklama | SRS | 2640 | Yasal yükümlülük |
| `teslimat_adresi`, `fatura_no`, `fatura_tarihi` alanları eklenmeli | eksik_alan_analizi | 178-185 | Daha fazla fatura alanı |
| Fatura düzeltmesi (otomatik), iade düzeltme notası | SATIS-IADE-COZUMU | 41, 54, 61, 115, 366-372 | Tam işlem |
| E-fatura entegrasyonu (GİB'e uyumlu düzeltme faturası) | SATIS-IADE-COZUMU | 495-497 | Tam işlem |
| `fatura_kesme_kurallari`, `kdv_hareket` tabloları | DB-Design | 3326-3360 | Tam veri yapısı |
| `uretim_maliyet.birim` "TRY" varsayılan, `maliyet_donemi` ile aylık takip | DB-Design | 2411 | Maliyet-fatura bağlantısı dolaylı |

**Etki:** "Kapsam dışı" ifadesi yalnızca dokümanın girişinde kalmış; geri kalan tüm sistem fatura varsayımı üzerine inşa edilmiş. Bu, kapsam revizyonu veya şartın kaldırılması gerektiği anlamına gelir.

---

## 11. Önem Sırasına Göre Özet

### 🔴 Kritik (migration'ı kıracak, sistemi durduracak)

1. **§1.1** — `stok_karti` (DB-Design ana gövde + §22 CREATE TABLE) ↔ `stok_kartlari` (DB-Design §21, SYSTEM-ARCH, INDEX). Tüm migration FK'ları kırılır.
2. **§2.1** — `SON_KULLANIM_GECTI` vs `SON_KULLANIM_GECDI`: Aynı çözüm dokümanının içinde iki yazım. ALTER TYPE hata verir.
3. **§3.1** — DB-Design §22 `CREATE TABLE uretim_emri` tablosunda `stok_kodu`, `barkod`, `agirlik` vb. ürünler alanları sızmış. Kopyala-yapıştır bug'ı; uygulanırsa tablo gereksiz şişer.
4. **§1.7** — İzlenebilirlik tablo ismi: `gida_izlenebilirlik_log` (DB-Design) ↔ `lot_izlenebilirlik` (INDEX/SYSTEM-ARCH).
5. **§1.6** — `kalite_kontrol` (3 farklı yerde) ↔ `kalite_kontrol_kayitlari` (§11.3). Aynı kavram için iki ayrı tablo.

### 🟡 Yüksek (iş kuralı yanlış uygulanır)

6. **§3.6 + §10** — Faturalama kapsam dışı şartı ile pratikte fatura yapısı (KDV, e-fatura, GİB) çelişkisi.
7. **§2.4** — `kalite_kontrol.durum` enum: 3 farklı set.
8. **§5.1** — FIFO fonksiyonu (§6.2) FEFO/FIFO hibrit kuralıyla (§3.4.6) uyumsuz.
9. **§1.8** — Maliyet modeli: tek `uretim_maliyet` (§3.8.3) ↔ 4 ayrı tablo (§21).
10. **§3.2** — `ayar_key` vs `ayar_adi` — INSERT SQL'i çalışmaz.

### 🟢 Orta (dokümantasyon/raporlama sorunu)

11. **§4.1-§4.3** — API endpoint çelişkileri (SKT, transfer, izlenebilirlik).
12. **§1.2-1.5** — Tablo isimlendirme tekil/çoğul karışıklığı (uretim_emri/emirleri, satis_kaydi/kayitlari, vb.).
13. **§3.3** — SKT uyarı eşiği anahtarı 3 farklı isim.
14. **§2.7** — `STOK_GUNCLLENDI`, `RETTEDI` yazım hataları SYSTEM-ARCH'ta.
15. **§5.3-§5.4** — Üretim tamamlama stratejisi çelişkisi (trigger / endpoint / UPDATE'deki transaction).

---

## 12. Çözüm Önerileri (Çerçeve)

1. **Tek isimlendirme standardı** kabul et (örn. PostgreSQL convention — tekil). Tüm `stok_karti`, `uretim_emri`, `satis_kaydi`, `kalite_kontrol`, `tedarikci_degerlendirme` formuna standardize et, §21 + SYSTEM-ARCH + INDEX'te toplu güncelleme yap.
2. **Tek enum sözlüğü** oluştur: `stok_karti.durum`, `uretim_emri.durum`, `kalite_kontrol.durum`, `stok_hareketleri.hareket_tipi`. DB-Design §9.1'i tek doğru kaynak yap, çözüm dokümanları buna referans versin.
3. **API endpoint namespace**'i netleştir: `/api/v1/stok/skt/...` mi yoksa `/api/v1/stok/lot-onerisi` mi — birini seç. INDEX'e göre `skt` tercih edilmiş, ancak çözüm dokümanları farklı yazmış.
4. **Fatura kapsam kararı** net. SRS §1.2 "kapsam dışı" diyor; ya bu şart korunup tüm fatura alanları, tablolar ve çözüm kaldırılmalı, ya da şart güncellenmeli ve bu bölümler resmileştirilmeli.
5. **§22 DB-Design bölümündeki kopyala-yapıştır bug'larını** temizle (uretim_emri tablosunun yanlış sütunları).
6. **Alembic migration** planla, `update_db_design.py`'nin manuel geçişlerini sürdürülebilir migration'lara çevir.
7. **UPDATE.md**'yi "yeni eklenen özellik" listesi olarak tutmak yerine, ana kaynaklarda (SRS/DB-Design) ilgili bölümlere işle ve UPDATE.md'yi sadece "uygulama notları" olarak ayrı tut.

---

## 13. Sonuç

Toplam **21 dosya** üzerinde yapılan denetimde **en az 25 farklı somut çelişki** tespit edilmiştir. Çelişkilerin yaklaşık yarısı tablo/alan isimlendirmesi, dörtte biri enum değerleri, geri kalanı API endpoint ve iş kuralları etrafındadır.

**Kapsam dışı (fatura) şartı** en kritik çelişki noktasıdır: SRS'nin girişinde tek cümleyle belirtilmiş olmasına rağmen sistem genelinde fatura varsayımı mevcuttur. Bu durum, ya kapsamın güncellenmesini, ya da büyük ölçekli refaktör gerektirir.

**Dosya değişikliği yapılmamıştır** — yalnızca bu rapor (`CAPRAZ-DOKUMAN-CELISKI-RAPORU.md`) oluşturulmuştur.
