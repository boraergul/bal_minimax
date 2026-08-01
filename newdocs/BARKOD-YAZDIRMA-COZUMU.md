# BARKOD YAZDIRMA MODÜLÜ ÇÖZÜMÜ

**Versiyon:** 1.1.0  
**Tarih:** 2026-07-29  
**Durum:** Tasarım Taslak  
**Modül:** Barkod Yazdırma  
**Etki Alanı:** Depo, Üretim, Lojistik, Etiketleme, Barkod Üretimi

---

## 1. Header

| Alan | Değer |
|------|-------|
| Doküman No | SOL-BRKOD-001 |
| Başlık | Barkod Yazdırma Modülü Teknik Çözüm Dokümanı |
| Proje | Kuru Meyve-Bal ERP Sistemi |
| Yazarlar | Çözüm Mimar ekibi |
| Onay | Beklemede |

---

## 2. Mevcut Durum

### 2.1 Genel Bakış
Mevcut sistemde barkod üretimi ve yazdırma işlemi harici yazılımlarla, manuel Excel etiketleri ile veya tedarikçi tarafından basılan etiketlerle yapılmaktadır. Farklı birimler (depo, üretim, lojistik) kendi etiket formatlarını kullanmaktadır.

### 2.2 Tespit Edilen Sorunlar
- **Standart Dışı Etiketler:** Her departman farklı format kullanıyor, birbirleriyle uyumlu değil.
- **Barkod Geçerliliği:** Basılan barkodlar EAN-13 veya Code128 standardına uymuyor, tarayıcı hataları yaşanıyor.
- **Ürün Bilgisi Eksikliği:** Etiketlerde sadece barkod numarası var, ürün adı, LOT no, tarih gibi bilgiler yok.
- **Yazıcı Uyumsuzluğu:** Zebra, Argox, TSC gibi farklı marka yazıcılara uyum sağlanamıyor.
- **Küçük Çaplı İhtiyaçlar:** 1-2 etiket basılması gerektiğinde bile büyük yazılım açmak gerekiyor.

### 2.3 Mevcut Süreç (Ham)
1. Ürün geliyor → tedarikçi barkodu veya manuel etiket
2. Depo elinde barkod okuyucu yok veya tarama hatalı
3. Stok hareketlerinde yanlış ürün kaydı

---

## 3. Tasarım Hedefleri

### 3.1 Stratejik Hedefler
| # | Hedef | Ölçüt |
|---|-------|-------|
| H-1 | Standart barkod formatları oluşturmak | EAN-13, Code128, QR Code üretimi |
| H-2 | ZPL desteği sağlamak | Zebra yazıcılara doğrudan ZPL çıktısı |
| H-3 | PDF etiket desteği | Zebra, Argox, TSC için PDF çıktı |
| H-4 | Çoklu etiket şablonu | Ürün, koli, palet, nakliye etiketi |
| H-5 | Toplu etiket yazdırma | Çoklu ürün, LOT, tarih bazlı seçim |

### 3.2 Fonksiyonel Kapsam
- **Barkod Üretimi:** EAN-13, Code128 (ASCII, numeric), QR Code, DataMatrix
- **Etiket Şablonları:** Ürün etiketi (küçük), Koli etiketi (orta), Palet etiketi (büyük), Nakliye etiketi
- **Değişken Alanlar:** Ürün adı, miktar, birim, LOT no, tarihler (Üretim/SON/Tarih), tedarikçi
- **Yazıcı Profilleri:** Zebra ZPL, Argox ZPL, TSC TSPL, Genel PDF
- **Toplu Yazdırma:** Excel/CSV'den toplu etiket, LOT bazlı seçim
- **Yazdırma Kuyruğu:** Birden fazla yazdırma işi, duraklatma, iptal
- **Önizleme:** Yazdırmadan önce görsel önizleme (PNG/PDF)

### 3.3 Kapsam Dışı
- NFC/RFID etiketleme (faz-2)
- Mobil yazıcı yönetimi (faz-2)
- Barkod doğrulama/quality scoring (faz-2)

---

## 4. DB Gereksinimleri

> **Kanonik şema sınırı:** Ana DB-Design'da kalıcı şablon yapıları `etiket_sablon` ve `etiket_alan` tablolarıdır. Fiziksel yazıcı tanımı için ayrı bir kalıcı tablo yoktur; yazıcı profili uygulama konfigürasyonunda tutulur. Aşağıdaki İngilizce adlandırılmış tablolar kavramsal örneklerdir ve migration kaynağı değildir; uygulamada ana veri sözlüğündeki adlara eşlenmelidir.

### 4.1 Tablo: `barcode_definitions`
```sql
CREATE TABLE barcode_definitions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(64) UNIQUE NOT NULL,
    barcode_type    VARCHAR(32) NOT NULL,     -- 'EAN13', 'CODE128', 'QR', 'DATAMATRIX'
    prefix          VARCHAR(16),              -- EAN-13 için firma prefixi (12 hane + checksum)
    current_sequence BIGINT DEFAULT 0,
    digit_count     INTEGER DEFAULT 13,       -- EAN-13: 13, CODE128: değişken
    check_digit_calc BOOLEAN DEFAULT TRUE,     -- Otomatik check digit hesapla
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Tablo: `label_templates`
```sql
CREATE TABLE label_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(64) UNIQUE NOT NULL,
    name            VARCHAR(256) NOT NULL,
    description     TEXT,
    template_type   VARCHAR(32) NOT NULL,     -- 'PRODUCT', 'BOX', 'PALLET', 'SHIPPING', 'RACK'
    width_mm        DECIMAL(6,2) NOT NULL,     -- Etiket genişliği (mm)
    height_mm       DECIMAL(6,2) NOT NULL,     -- Etiket yüksekliği (mm)
    printer_type    VARCHAR(32) NOT NULL,      -- 'ZEBRA_ZPL', 'ARGOX_ZPL', 'TSC_TSPL', 'GENERIC_PDF'
    template_def    JSONB NOT NULL,            -- Şablon yapısı (bkz. 4.5)
    is_default      BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_template_type    ON label_templates(template_type);
CREATE INDEX idx_template_printer ON label_templates(printer_type);
CREATE INDEX idx_template_active  ON label_templates(is_active);
```

### 4.3 Tablo: `print_jobs`
```sql
CREATE TABLE print_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number      VARCHAR(32) UNIQUE NOT NULL,  -- 'PRINT-2026-000001'
    template_id     UUID REFERENCES label_templates(id),
    printer_profile VARCHAR(64),                    -- Kullanılan yazıcı profili
    status          VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    total_labels    INTEGER NOT NULL DEFAULT 0,
    printed_labels  INTEGER DEFAULT 0,
    failed_labels   INTEGER DEFAULT 0,
    requested_by    UUID REFERENCES users(id),
    requested_at    TIMESTAMPTZ DEFAULT NOW(),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    error_message   TEXT,
    copies          INTEGER DEFAULT 1,             -- Her etiketten kaç kopya
    output_format   VARCHAR(16) DEFAULT 'ZPL',     -- 'ZPL', 'PDF', 'PNG'
    output_data     BYTEA,                          -- Oluşturulan dosya (blob)
    file_path       VARCHAR(512),                   -- Dosya yolu (storage)
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_printjob_status   ON print_jobs(status);
CREATE INDEX idx_printjob_template ON print_jobs(template_id);
CREATE INDEX idx_printjob_requested ON print_jobs(requested_by);
```

### 4.4 Tablo: `print_job_items`
```sql
CREATE TABLE print_job_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    print_job_id    UUID REFERENCES print_jobs(id) ON DELETE CASCADE,
    product_id      UUID REFERENCES products(id),
    barcode_value   VARCHAR(256) NOT NULL,
    barcode_type    VARCHAR(32) NOT NULL,
    label_data      JSONB NOT NULL,           -- {product_name, lot_no, qty, exp_date, ...}
    status          VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PRINTED', 'FAILED'
    print_order     INTEGER NOT NULL,
    error_message   TEXT,
    printed_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_items_job    ON print_job_items(print_job_id);
CREATE INDEX idx_job_items_product ON print_job_items(product_id);
CREATE INDEX idx_job_items_status  ON print_job_items(status);
```

### 4.5 Şablon Tanım Yapısı (template_def JSONB)
```json
{
  "layout": {
    "columns": 1,
    "rows": 1,
    "margin_mm": {"top": 2, "bottom": 2, "left": 2, "right": 2}
  },
  "elements": [
    {
      "id": "barcode_main",
      "type": "BARCODE",
      "position": {"x": 10, "y": 10, "width": 50, "height": 30, "unit": "mm"},
      "barcode_type": "CODE128",
      "data_field": "barcode_value",
      "show_text": true,
      "text_position": "below"
    },
    {
      "id": "product_name",
      "type": "TEXT",
      "position": {"x": 10, "y": 45, "width": 50, "height": 6, "unit": "mm"},
      "font": {"name": "DejaVu Sans", "size": 8, "bold": true},
      "data_field": "product_name",
      "align": "left"
    },
    {
      "id": "lot_date",
      "type": "TEXT",
      "position": {"x": 10, "y": 52, "width": 50, "height": 5, "unit": "mm"},
      "font": {"name": "DejaVu Sans", "size": 6},
      "data_field": "lot_info",
      "format": "LOT: {lot_no} | TRT: {production_date} | SKT: {expiry_date}"
    },
    {
      "id": "qty_unit",
      "type": "TEXT",
      "position": {"x": 10, "y": 58, "width": 50, "height": 5, "unit": "mm"},
      "font": {"name": "DejaVu Sans", "size": 6},
      "data_field": "quantity_display",
      "format": "{qty} {unit}"
    }
  ]
}
```

### 4.6 Tablo: `product_barcodes`
```sql
CREATE TABLE product_barcodes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID REFERENCES products(id),
    barcode_value   VARCHAR(256) NOT NULL,
    barcode_type    VARCHAR(32) NOT NULL,
    is_primary      BOOLEAN DEFAULT FALSE,
    is_valid        BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, barcode_value)
);

CREATE INDEX idx_prod_barcode_product ON product_barcodes(product_id);
CREATE INDEX idx_prod_barcode_value   ON product_barcodes(barcode_value);
```

### 4.7 Tablo: `printer_profiles`
```sql
CREATE TABLE printer_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(128) NOT NULL,
    printer_brand   VARCHAR(32) NOT NULL,      -- 'ZEBRA', 'ARGOX', 'TSC', 'GENERIC'
    dpi             INTEGER DEFAULT 203,       -- 203, 300, 600
    label_width_mm  DECIMAL(6,2) NOT NULL,
    label_height_mm DECIMAL(6,2),
    connection_type VARCHAR(16) NOT NULL,      -- 'NETWORK', 'USB', 'BLUETOOTH'
    address         VARCHAR(256),             -- IP adresi veya port
    zpl_settings    JSONB DEFAULT '{}',       -- ^MD, ^PR gibi ZPL komutları
    is_active       BOOLEAN DEFAULT TRUE,
    is_default      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_printer_brand   ON printer_profiles(printer_brand);
CREATE INDEX idx_printer_default ON printer_profiles(is_default);
```

---

## 5. API Endpoints

### 5.1 Barkod Yönetimi

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/barcodes` | Barkod tanımlarını listele |
| POST | `/api/v1/barcodes/generate` | Yeni barkod üret (EAN-13, Code128, QR) |
| GET | `/api/v1/barcodes/validate/{value}` | Barkod geçerliliğini kontrol et |
| POST | `/api/v1/barcodes/assign` | Ürüne barkod ata |
| GET | `/api/v1/barcodes/product/{productId}` | Ürünün barkodlarını getir |

### 5.2 Etiket Şablonları

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/templates` | Şablonları listele |
| GET | `/api/v1/templates/{id}` | Şablon detayı |
| POST | `/api/v1/templates` | Yeni şablon oluştur |
| PUT | `/api/v1/templates/{id}` | Şablon güncelle |
| DELETE | `/api/v1/templates/{id}` | Şablon sil |
| GET | `/api/v1/templates/{id}/preview` | Şablonu önizle (PNG) |

### 5.3 Yazdırma İşlemleri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/v1/print` | Etiket yazdır (hızlı) |
| POST | `/api/v1/print/batch` | Toplu etiket yazdır |
| GET | `/api/v1/print/jobs` | Yazdırma işlerini listele |
| GET | `/api/v1/print/jobs/{id}` | İş detayı |
| POST | `/api/v1/print/jobs/{id}/cancel` | İşi iptal et |
| GET | `/api/v1/print/jobs/{id}/preview` | İş önizleme |
| GET | `/api/v1/print/jobs/{id}/download` | PDF/ZPL indir |

### 5.4 Yazıcı Yönetimi

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/printers` | Yazıcı profillerini listele |
| GET | `/api/v1/printers/{id}` | Yazıcı detayı |
| POST | `/api/v1/printers` | Yeni yazıcı profili ekle |
| PUT | `/api/v1/printers/{id}` | Yazıcı güncelle |
| DELETE | `/api/v1/printers/{id}` | Yazıcı sil |
| POST | `/api/v1/printers/{id}/test` | Test sayfası yazdır |

### 5.5 Endpoint Detayları

#### POST `/api/v1/barcodes/generate`
**Request:**
```json
{
  "barcode_type": "EAN13",
  "quantity": 5,
  "product_id": "uuid",
  "prefix": "59012345",
  "lot_no": "LOT-2026-07"
}
```
**Response:**
```json
{
  "barcodes": [
    {"value": "5901234512345", "type": "EAN13", "checksum": "5", "product_id": "uuid"},
    {"value": "5901234512352", "type": "EAN13", "checksum": "2", "product_id": "uuid"}
  ],
  "generated_at": "2026-07-29T10:00:00Z"
}
```

#### POST `/api/v1/print`
**Request:**
```json
{
  "template_id": "uuid",
  "printer_id": "uuid",
  "copies": 2,
  "data": {
    "product_id": "uuid",
    "barcode_value": "5901234512345",
    "product_name": "Kuru İncir 500g",
    "lot_no": "LOT-2026-07-A",
    "production_date": "2026-07-01",
    "expiry_date": "2027-07-01",
    "qty": 24,
    "unit": "adet"
  }
}
```
**Response:**
```json
{
  "job_id": "uuid",
  "job_number": "PRINT-2026-000042",
  "status": "COMPLETED",
  "labels_printed": 2,
  "output_format": "ZPL"
}
```

#### POST `/api/v1/print/batch`
**Request:**
```json
{
  "template_id": "uuid",
  "printer_id": "uuid",
  "output_format": "PDF",
  "items": [
    {"product_id": "uuid1", "qty": 5, "lot_no": "A1"},
    {"product_id": "uuid2", "qty": 10, "lot_no": "B2"}
  ]
}
```

---

## 6. İş Kuralları

### 6.1 Barkod Üretim Kuralları
| Kural | Açıklama |
|-------|----------|
| BK-01 | EAN-13: 12 hane + otomatik check digit (mod10) |
| BK-02 | Code128: İnsan okunabilir karakter seti (ASCII 0-127) |
| BK-03 | QR Code: Türkçe karakter desteği (UTF-8) |
| BK-04 | Her barkod benzersiz olmalı, çakışma kontrolü yapılır |
| BK-05 | Sistem tarafından üretilen barkodlar "SYS-" prefix ile başlar |
| BK-06 | Müşteri barkodları (harici) "EXT-" prefix ile işaretlenir |

### 6.2 EAN-13 Check Digit Hesaplama
```
1. 1., 3., 5., 7., 9., 11. haneler toplamı × 3
2. 2., 4., 6., 8., 10., 12. haneler toplamı
3. Adım 1 + Adım 2 = Toplam
4. (10 - (Toplam mod 10)) mod 10 = Check Digit
5. 12 hane + Check Digit = EAN-13
```

### 6.3 Etiket Şablon Kuralları
| Kural | Açıklama |
|-------|----------|
| SK-01 | Minimum etiket genişliği: 25mm, maksimum: 150mm |
| SK-02 | Etiket yüksekliği: minimum 10mm, maksimum: 300mm (rulodan) |
| SK-03 | Şablon üzerinde en az 1 barkod alanı olmalı |
| SK-04 | Metin fontları: DejaVu Sans, Arial, Courier (PDF'te TTF) |
| SK-05 | Barkod yüksekliği minimum 10mm olmalı (tarayıcı okuyabilmesi için) |
| SK-06 | Şablon kodu benzersiz olmalı |

### 6.4 Yazdırma Kuralları
| Kural | Açıklama |
|-------|----------|
| YK-01 | Aynı anda maksimum 500 etiket yazdırılabilir |
| YK-02 | ZPL doğrudan yazıcıya gönderilir (TCP/IP) |
| YK-03 | PDF çıktısı önce sunucuda oluşturulur, sonra indirilir/yazdırılır |
| YK-04 | Toplu yazdırma işi arka planda çalışır (async) |
| YK-05 | Başarısız etiketler ayrı log'lanır, iş devam eder |
| YK-06 | Yazdırma işi 10 dakika timeout'a tabidir |

### 6.5 Yazıcı Profilleri Kuralları
| Kural | Açıklama |
|-------|----------|
| YP-01 | Zebra ZPL: ^XA...^XZ yapısı, ^MD, ^PR komutları desteklenir |
| YP-02 | Argox ZPL: Zebra ile uyumlu, ek ~RG komutu |
| YP-03 | TSC TSPL: TSPL komut seti ayrı parse edilir |
| YP-04 | Ağ yazıcıları için IP:PORT formatı (ör: 192.168.1.100:9100) |
| YP-05 | Her yazıcı profili için test sayfası yazdırılabilir |

---

## 7. Durum Makinesi

### 7.1 Barkod Durumları
```
[AVAILABLE] ---assign---> [ASSIGNED] ---unassign---> [AVAILABLE]
                    |
                    +---deactivate---> [INACTIVE]
```

| Durum | Açıklama |
|-------|----------|
| AVAILABLE | Üretildi, henüz bir ürüne atanmamış |
| ASSIGNED | Bir ürüne bağlanmış, kullanılıyor |
| INACTIVE | Devre dışı bırakılmış |

### 7.2 Print Job Durumları
```
[PENDING] --start---> [PROCESSING] --success---> [COMPLETED]
    |                      |                        |
    |                      +--partial--->[PARTIAL] |
    |                      |                        |
    |                      +--fail--->[FAILED]     |
    |                                             |
    +--cancel-->[CANCELLED] <--cancel-------------+
```

| Durum | Açıklama |
|-------|----------|
| PENDING | Kuyrukta bekliyor |
| PROCESSING | Etiketler üretiliyor |
| COMPLETED | Tüm etiketler başarıyla yazdırıldı |
| PARTIAL | Bazı etiketler başarısız |
| FAILED | Tüm iş başarısız |
| CANCELLED | Kullanıcı iptal etti |

### 7.3 Print Job Item Durumları
```
[PENDING] --print---> [PRINTED]
    |                  |
    |                  +--fail---> [FAILED]
    |
    +--skip---> [SKIPPED]
```

---

## 8. Acceptance Criteria

### 8.1 Barkod Üretimi
- [ ] AC-01: EAN-13 barkod üretilebilir, check digit doğru hesaplanır
- [ ] AC-02: Code128 barkod üretilebilir (ASCII karakter desteği)
- [ ] AC-03: QR Code üretilebilir, Türkçe karakter içerebilir
- [ ] AC-04: Üretilen barkod geçerlilik kontrolünden geçer
- [ ] AC-05: Birden fazla barkod tek seferde üretilebilir

### 8.2 Etiket Şablonları
- [ ] AC-06: Kullanıcı yeni etiket şablonu oluşturabilir
- [ ] AC-07: Şablon üzerine barkod, metin, çizgi eklenebilir
- [ ] AC-08: Şablon önizlemesi PNG olarak görüntülenebilir
- [ ] AC-09: Ürün, koli, palet, nakliye için hazır şablonlar mevcuttur
- [ ] AC-10: Şablon ölçüleri (mm) yazıcıya uygun şekilde hesaplanır

### 8.3 Yazdırma
- [ ] AC-11: Tek etiket yazdırma < 2 saniyede tamamlanır
- [ ] AC-12: Toplu yazdırma (100 etiket) < 30 saniyede tamamlanır
- [ ] AC-13: ZPL çıktısı Zebra yazıcıda doğru basılır
- [ ] AC-14: PDF çıktısı doğru ölçülerde oluşturulur
- [ ] AC-15: Her etikette ürün adı, LOT no, tarihler doğru gösterilir

### 8.4 Yazıcı Yönetimi
- [ ] AC-16: Ağ yazıcı profili IP adresi ile kaydedilir
- [ ] AC-17: Test sayfası yazdırılarak yazıcı bağlantısı doğrulanır
- [ ] AC-18: Varsayılan yazıcı tanımlanabilir

### 8.5 Toplu İşlemler
- [ ] AC-19: Excel/CSV ile toplu etiket yazdırılabilir
- [ ] AC-20: LOT no bazlı filtreleme ile etiket seçimi yapılabilir
- [ ] AC-21: Belirli ürünlerin etiketleri tekrar yazdırılabilir

### 8.6 Entegrasyon
- [ ] AC-22: Barkod üretimi satış siparişi onayına entegre edilebilir
- [ ] AC-23: Transfer onayı sonrası otomatik etiket üretilebilir
- [ ] AC-24: Depo girişi sonrası ürün etiketi önerisi sunulur

---

## 9. Teknik Notlar

### 9.1 Barkod Kütüphanesi
- Python: `python-barcode` (EAN, Code128), `qrcode` (QR)
- Node.js: `bwip-js` (EAN, Code128, QR, DataMatrix)
- Java: `ZXing` (barcode generation and parsing)

### 9.2 ZPL Örnekleri

**EAN-13 Barkod:**
```
^XA
^FO50,30^BY3
^BEN,100,Y,N
^FD5901234512345^FS
^FO50,140^A0N,30,30^FDBarkod: 5901234512345^FS
^XZ
```

**QR Code:**
```
^XA
^FO50,30^BQN,2,6
^FDQA,2,M,7,A^FDCüMBûR^FS
^XZ
```

### 9.3 ZPL Parametreleri
| Komut | Açıklama |
|-------|----------|
| ^XA | Etiket başlangıcı |
| ^XZ | Etiket sonu |
| ^FOx,y | Alan Orijini (x, y koordinatı) |
| ^BYw | Barkod Modülü Genişliği |
| ^BEN | EAN-13 Barkod |
| ^BQN | QR Code |
| ^FD...^FS | Alan Verisi |
| ^A0N | Yazı Tipi (Normal) |
| ^MD | Yoğunluk (Media Darkness) |
| ^PR | Baskı Hızı |

### 9.4 PDF Üretimi
- `pdfkit` (wkhtmltopdf) veya `reportlab` kullanılabilir
- Barkod görseli önce PNG olarak üretilir, PDF'e gömülür
- Font: DejaVu Sans TTF (Türkçe karakter desteği)

### 9.5 TCP/IP Yazdırma (Zebra)
```python
import socket

def send_to_zebra(ip: str, port: int, zpl_data: str) -> bool:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect((ip, port))
        sock.send(zpl_data.encode('utf-8'))
        sock.close()
        return True
    except Exception as e:
        logger.error(f"Zebra print error: {e}")
        return False
```

### 9.6 Şablon Render
```python
def render_label(template: dict, data: dict) -> str:
    """Şablon + veri => ZPL string üretir"""
    zpl = "^XA\n"
    
    for element in template['elements']:
        if element['type'] == 'BARCODE':
            zpl += render_barcode_zpl(element, data)
        elif element['type'] == 'TEXT':
            zpl += render_text_zpl(element, data)
    
    zpl += "^XZ\n"
    return zpl

def render_barcode_zpl(el: dict, data: dict) -> str:
    btype = el['barcode_type']
    value = resolve_data_field(el['data_field'], data)
    x, y = el['position']['x'], el['position']['y']
    h = el['position']['height']
    
    if btype == 'EAN13':
        return f"^FO{x},{y}^BY3^BEN,{h*10},Y,N^FD{value}^FS\n"
    elif btype == 'CODE128':
        return f"^FO{x},{y}^BY3^BCN,{h*10},Y,N^FD{value}^FS\n"
    elif btype == 'QR':
        return f"^FO{x},{y}^BQN,2,{h//5}^FDQA,2,M,7,A^FD{value}^FS\n"
    return ""
```
