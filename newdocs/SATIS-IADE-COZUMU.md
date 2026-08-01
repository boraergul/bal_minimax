# SATIŞ İADE MODÜLÜ ÇÖZÜMÜ

**Versiyon:** 1.1.0  
**Tarih:** 2026-07-29  
**Durum:** Tasarım Taslak  
**Modül:** Satış İade  
**Etki Alanı:** Satış, İade, Fire Hesaplama, Kargo

---

## 1. Header

| Alan | Değer |
|------|-------|
| Doküman No | SOL-SAT-IAD-001 |
| Başlık | Satış İade Modülü Teknik Çözüm Dokümanı |
| Proje | Kuru Meyve-Bal ERP Sistemi |
| Yazarlar | Çözüm Mimar ekibi |
| Onay | Beklemede |

---

## 2. Mevcut Durum

### 2.1 Genel Bakış
Mevcut sistemde iade süreçleri telefon ve e-posta ile yönetilmektedir. İade nedenleri standartlaştırılmamış, fire hesaplaması manuel yapılmakta, depo süreçleri kağıt üzerinden takip edilmektedir.

### 2.2 Tespit Edilen Sorunlar
- **Standart Dışı İade Nedenleri:** Her müşteri temsilcisi farklı iade nedeni kodları kullanıyor, raporlama tutarsız.
- **Fire Hesaplama Hatası:** Kırılan/ezilen ürün fire oranı elle hesaplandığı için stok ve maliyet raporları hatalı oluşuyor.
- **Stok Senkronizasyonu:** İade ürünleri depolarına ulaştığında stok güncellenmesi gecikiyor.
- **İade Takip Zorluğu:** Müşteri iade sürecini sorgulayamıyor, e-posta ile uçuşan takip numaraları.
- **Kar Marjin Etkisi:** İade edilen ürünün maliyeti doğru hesaplanamıyor, kar marji bozuluyor.

### 2.3 Mevcut Süreç (Ham)
1. Müşteri arıyor → Temsilci not alıyor
2. İade onayı veriliyor → Manuel form dolduruluyor
3. Kargo kodu veriliyor (elle)
4. Ürün depo'ya geliyor → Kalite kontrol yapılıyor (kağıt)
5. Fire hesaplanıyor → Excel'de kayıt
6. İade stok ve maliyet etkisi kaydediliyor → Manuel

---

## 3. Tasarım Hedefleri

### 3.1 Stratejik Hedefler
| # | Hedef | Ölçüt |
|---|-------|-------|
| H-1 | Standartlaştırılmış iade nedenleri oluşturmak | Tüm iadeler kategorize edilebilir, raporlanabilir |
| H-2 | Otomatik fire hesaplama motoru kurmak | Fire, ürün bazında oran+kilo hesabı ile otomatik hesaplanır |
| H-3 | Dijital iade süreci kurmak | Kağıtsız, izlenebilir, otomatik bildirimler |
| H-4 | Müşteri self-service iade başlatma | Müşteri portalinden iade başlatabilir |
| H-5 | İade maliyetini doğru kârlılık raporuna yansıtmak | İade maliyet etkisi orijinal satış maliyetini baz alır |

### 3.2 Fonksiyonel Kapsam
- **İade Başvurusu:** Müşteri veya satış temsilcisi iade oluşturur
- **İade Neden Kodları:** Zarar Görmüş, Yanlış Ürün, Tüketim Süresi Dolmuş, Müşteri Memnuniyeti, Üretim Hatası
- **Kalite Kontrol:** Depo görevlisi ürünleri inceler, fire oranını belirler
- **Fire Hesaplama:** Ürün cinsine göre fire oranı tablosu, miktar bazlı hesaplama
- **Maliyet Etkisi:** İadenin stok, fire ve maliyet etkisi otomatik kaydedilir
- **Kargo Takibi:** Kargo durumu API ile çekilir, müşteriye bildirim
- **Raporlama:** İade oranı, fire maliyeti, neden dağılımı

### 3.3 Kapsam Dışı
- Mağaza içi iadeler (faz-2)
- Otomatik kargo anlaşması yönetimi (faz-2)
- Faturalama, ödeme/iade ödemesi, KDV, e-Fatura ve GİB entegrasyonları (harici muhasebe sisteminin sorumluluğundadır)

---

## 4. DB Gereksinimleri

### 4.1 Tablo: `return_reasons`
```sql
CREATE TABLE return_reasons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(32) UNIQUE NOT NULL, -- 'DAMAGED', 'WRONG_ITEM', 'EXPIRED', 'CUSTOMER_CS', 'DEFECT'
    name_tr         VARCHAR(128) NOT NULL,       -- 'Zarar Görmüş Ürün'
    name_en         VARCHAR(128),
    category        VARCHAR(32) NOT NULL,        -- 'CUSTOMER_FAULT', 'SELLER_FAULT', 'PRODUCTION_FAULT', 'LOGISTICS_FAULT'
    requires_photo  BOOLEAN DEFAULT FALSE,
    requires_reason_text BOOLEAN DEFAULT FALSE,
    refund_rate     DECIMAL(5,2) DEFAULT 100.00,  -- Müşteriye iade edilecek yüzde
    is_active       BOOLEAN DEFAULT TRUE,
    display_order   INTEGER DEFAULT 0
);
```

### 4.2 Tablo: `sales_returns`
```sql
CREATE TABLE sales_returns (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number       VARCHAR(32) UNIQUE NOT NULL,  -- 'RET-2026-000001'
    original_sale_id    UUID REFERENCES sales(id),
    customer_id         UUID REFERENCES customers(id),
    status              VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
    reason_id           UUID REFERENCES return_reasons(id),
    reason_detail       TEXT,
    customer_requested_at TIMESTAMPTZ DEFAULT NOW(),
    requested_by        UUID REFERENCES users(id),     -- Satış temsilcisi veya customer_user_id
    approved_by         UUID REFERENCES users(id),
    approved_at         TIMESTAMPTZ,
    pickup_cargo_code   VARCHAR(64),
    pickup_cargo_company VARCHAR(64),
    pickup_scheduled_at TIMESTAMPTZ,
    arrived_at          TIMESTAMPTZ,                  -- Depoya varış
    inspected_at        TIMESTAMPTZ,
    inspected_by        UUID REFERENCES users(id),
    inspector_notes     TEXT,
    total_return_qty    DECIMAL(18,3) NOT NULL DEFAULT 0,
    total_fire_qty      DECIMAL(18,3) NOT NULL DEFAULT 0,
    fire_amount         DECIMAL(18,2) NOT NULL DEFAULT 0, -- Yalnız iç maliyet raporlaması
    completed_at        TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_returns_status      ON sales_returns(status);
CREATE INDEX idx_returns_customer    ON sales_returns(customer_id);
CREATE INDEX idx_returns_original    ON sales_returns(original_sale_id);
CREATE INDEX idx_returns_number      ON sales_returns(return_number);
```

### 4.3 Tablo: `sales_return_items`
```sql
CREATE TABLE sales_return_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id           UUID REFERENCES sales_returns(id) ON DELETE CASCADE,
    sale_item_id        UUID REFERENCES sales_items(id),
    product_id          UUID REFERENCES products(id),
    returned_qty        DECIMAL(18,3) NOT NULL,
    fire_qty            DECIMAL(18,3) NOT NULL DEFAULT 0,    -- Kırılan/ezilen miktar
    fire_reason         VARCHAR(32),                         -- 'BROKEN', 'WET', 'EXPIRED', 'CONTAMINATED'
    unit_cost           DECIMAL(18,4) NOT NULL,             -- O günkü birim maliyet (satış anındaki)
    fire_amount         DECIMAL(18,2) NOT NULL DEFAULT 0,
    accepted_qty        DECIMAL(18,3) NOT NULL DEFAULT 0,
    quality_grade       VARCHAR(16),                         -- 'A', 'B', 'C', 'REJECT'
    inspector_notes     TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_return_items_return ON sales_return_items(return_id);
CREATE INDEX idx_return_items_product ON sales_return_items(product_id);
```

### 4.4 Tablo: `product_fire_rates`
```sql
CREATE TABLE product_fire_rates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID REFERENCES products(id),
    reason_code     VARCHAR(32) NOT NULL,       -- 'BROKEN', 'WET', 'EXPIRED', 'CONTAMINATED'
    fire_rate       DECIMAL(5,4) NOT NULL,      -- 0.0500 = %5 fire oranı
    min_fire_qty_kg DECIMAL(18,3) DEFAULT 0,     -- Minimum fire miktarı (kg)
    effective_from  DATE NOT NULL,
    effective_to    DATE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, reason_code, effective_from)
);
```

### 4.5 Tablo: `sales_return_status_log`
```sql
CREATE TABLE sales_return_status_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id   UUID REFERENCES sales_returns(id) ON DELETE CASCADE,
    from_status VARCHAR(32),
    to_status   VARCHAR(32) NOT NULL,
    changed_by  UUID REFERENCES users(id),
    changed_at  TIMESTAMPTZ DEFAULT NOW(),
    notes       TEXT
);

CREATE INDEX idx_return_log_return ON sales_return_status_log(return_id);
```

### 4.6 Tablo: `cargo_tracking`
```sql
CREATE TABLE cargo_tracking (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id       UUID REFERENCES sales_returns(id),
    cargo_code      VARCHAR(64) NOT NULL,
    cargo_company   VARCHAR(64) NOT NULL,
    events          JSONB DEFAULT '[]',   -- [{timestamp, status, location, description}]
    last_event      TEXT,
    last_updated    TIMESTAMPTZ DEFAULT NOW(),
    delivered_at    TIMESTAMPTZ
);
```

---

## 5. API Endpoints

### 5.1 İade Yönetimi

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/returns` | İade listesi (filtrelenebilir) |
| GET | `/api/v1/returns/{id}` | İade detayı |
| POST | `/api/v1/returns` | Yeni iade başvurusu oluştur |
| PUT | `/api/v1/returns/{id}` | İade bilgilerini güncelle |
| DELETE | `/api/v1/returns/{id}` | İade talebini iptal et |
| POST | `/api/v1/returns/{id}/approve` | İade onayla |
| POST | `/api/v1/returns/{id}/reject` | İade reddet |
| POST | `/api/v1/returns/{id}/cancel` | İade talebini müşteri iptal eder |

### 5.2 Kalite Kontrol ve İnceleme

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/returns/{id}/inspect` | İade inceleme formu |
| POST | `/api/v1/returns/{id}/inspect` | İnceleme sonucunu kaydet |
| GET | `/api/v1/returns/{id}/fire-calculation` | Fire hesaplamasını getir |
| POST | `/api/v1/returns/preview-fire` | Fire hesaplaması önizle |

### 5.3 Kargo

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/v1/returns/{id}/schedule-pickup` | Kargo alımı planla |
| GET | `/api/v1/returns/{id}/track` | Kargo takibi |
| POST | `/api/v1/returns/{id}/mark-arrived` | Depoya varış bildirimi |

### 5.4 Raporlama

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/returns/reasons` | İade nedenlerini listele |
| GET | `/api/v1/returns/stats` | İade istatistikleri |
| GET | `/api/v1/returns/fire-report` | Fire raporu |

### 5.5 Endpoint Detayları

#### POST `/api/v1/returns`
**Request:**
```json
{
  "original_sale_id": "uuid",
  "reason_id": "uuid",
  "reason_detail": "Paket deforme olmuştu",
  "items": [
    {
      "sale_item_id": "uuid",
      "product_id": "uuid",
      "return_qty": 5.0
    }
  ],
  "pickup_address": {
    "name": "Ahmet Yılmaz",
    "phone": "0532...",
    "address": "...",
    "city": "İstanbul"
  }
}
```
**Response:**
```json
{
  "id": "uuid",
  "return_number": "RET-2026-000042",
  "status": "REQUESTED",
  "estimated_accepted_qty": 4.5,
  "cargo_pickup_date": null
}
```

#### POST `/api/v1/returns/{id}/inspect`
**Request:**
```json
{
  "items": [
    {
      "return_item_id": "uuid",
      "fire_qty": 0.5,
      "fire_reason": "BROKEN",
      "quality_grade": "B",
      "inspector_notes": "Ambalaj yırtıktı, ürün kırılmış"
    }
  ],
  "inspector_notes": "Genel durum: Kargo sırasında ezilme"
}
```

#### POST `/api/v1/returns/preview-fire`
**Request:**
```json
{
  "product_id": "uuid",
  "return_qty": 10.0,
  "fire_qty": 0.8,
  "fire_reason": "BROKEN"
}
```
**Response:**
```json
{
  "product_id": "uuid",
  "product_name": "Kuru İncir 1kg",
  "return_qty": 10.0,
  "fire_qty": 0.8,
  "fire_rate_applied": 0.08,
  "fire_amount": 48.00,
  "net_accepted_qty": 9.2,
  "unit_cost": 60.00,
  "inventory_cost_effect": 552.00,
  "fire_cost_warning": false
}
```

---

## 6. İş Kuralları

### 6.1 İade Oluşturma Kuralları
| Kural | Açıklama |
|-------|----------|
| IK-01 | İade, sadece "TESLİM EDİLMİŞ" satışlar için açılabilir |
| IK-02 | İade süresi: Satış tarihinden itibaren 30 gün (müşteri), 90 gün (seller_fault/production_fault) |
| IK-03 | İade edilecek ürün miktarı, orijinal satış miktarını aşamaz |
| IK-04 | "Zarar Görmüş" ve "Üretim Hatası" nedenlerinde fotoğraf zorunludur |
| IK-05 | İade numarası formatı: RET-YYYY-NNNNNN (yıl-sıra) |

### 6.2 Onay ve Red Kuralları
| Kural | Açıklama |
|-------|----------|
| IK-06 | İade tutarı < ₺500: Otomatik onay |
| IK-07 | İade tutarı ₺500-₺5000: Satış müdürü onayı |
| IK-08 | İade tutarı > ₺5000: Satış direktörü onayı |
| IK-09 | Müşteri kaynaklı hata (CUSTOMER_FAULT) ise müşteri kargo ücretini öder |
| IK-10 | Satıcı kaynaklı hata (SELLER_FAULT, PRODUCTION_FAULT, LOGISTICS_FAULT) ise kargo ücreti satıcıya aittir |

### 6.3 Fire Hesaplama Kuralları (Kritik)
| Kural | Açıklama |
|-------|----------|
| FK-01 | Fire oranı ürün bazında `product_fire_rates` tablosundan çekilir |
| FK-02 | Fire hesaplaması: fire_qty * unit_cost = fire_amount |
| FK-03 | Fire, iade edilen toplam miktarın dışında hesaplanır (eklenmez) |
| FK-04 | Fire oranı tablosunda ürün+yıl+kış için spesifik oran olabilir |
| FK-05 | Minimum fire miktarı: 0.1 kg (altındaki fire 0.1 kg kabul edilir) |
| FK-06 | Fire tutarı yalnız iç maliyet/zarar raporunda gider etkisi olarak kaydedilir |
| FK-07 | Fire tutarı satış karını etkilemez (zaten satış anında kaydedilmiş maliyet) |
| FK-08 | Quality grade "REJECT" ise fire_qty = returned_qty, accepted_qty = 0 |

**Fire Hesaplama Formülü:**
```
net_accepted_qty = returned_qty - fire_qty
fire_amount     = fire_qty * unit_cost
inventory_cost_effect = net_accepted_qty * unit_cost
```

### 6.4 Kalite Kontrol Kuralları
| Kural | Açıklama |
|-------|----------|
| KK-01 | İade ürünleri depo'ya ulaştığında "ARRIVED" durumuna geçer |
| KK-02 | Kalite kontrol 48 saat içinde yapılmalıdır |
| KK-03 | Kontrol sonrası ürünler: A (satılabilir), B (indirimli satılabilir), C (proses), REJECT (imha) |
| KK-04 | A grade ürünler stoğa normal olarak eklenir |
| KK-05 | B grade ürünler "İndirimli Stok" olarak işaretlenir |
| KK-06 | REJECT ürünler imha edilir ve fire tablosuna eklenir |

### 6.5 Stok ve Maliyet Etkisi Kuralları
| Kural | Açıklama |
|-------|----------|
| IM-01 | İade tamamlandığında kabul edilen miktar için stok hareketi oluşturulur |
| IM-02 | Fire miktarı iç maliyet/zarar raporuna kaydedilir |
| IM-03 | İade kaydı satış ve lot referanslarıyla izlenebilir tutulur |
| IM-04 | Faturalama ve ödeme işlemi üretilmez; bunlar sistem kapsamı dışındadır |

### 6.6 Kargo Kuralları
| Kural | Açıklama |
|-------|----------|
| KG-01 | Kargo kodu atandığında müşteriye SMS ile bildirim gönderilir |
| KG-02 | Kargo takip bilgisi 4 saatte bir güncellenir |
| KG-03 | Kargo 10 gün içinde depoya ulaşmazsa sistem uyarı verir |
| KG-04 | Kargo kayıp olursa "Kargo Araştırma" süreci başlatılır |

---

## 7. Durum Makinesi

### 7.1 İade Ana Durumları
```
[REQUESTED] --approve--> [APPROVED] --schedule-pickup--> [PICKUP_SCHEDULED]
     |                    |                                   |
     +--reject-->[REJECTED]                                  |
     |                                                        v
     +--cancel-->[CANCELLED]                        [PICKED_UP]
                                                        |
                                                        v
                                                  [IN_TRANSIT]
                                                        |
                                                        v
                                                   [ARRIVED]
                                                        |
                                                        v
                                                  [INSPECTING]
                                                        |
                              +--------+-------+--------+
                              |        |       |
                              v        v       v
                          [PASS]  [PASS_B] [FAIL]
                              |        |       |
                              v        v       v
                          [QUALIFIED]  |    [REJECTED]
                              |        |       |
                              +----+   +---+   |
                                   |       |   |
                                   v       v   v
                                [COMPLETED] (fire credited)
```

### 7.2 Detaylı Durum Tablosu

| Durum | Açıklama | Bir Sonraki Geçiş |
|-------|----------|-------------------|
| REQUESTED | İade talebi oluşturuldu | APPROVE, REJECT, CANCEL |
| APPROVED | Satış müdürü/onaylı | PICKUP_SCHEDULED, CANCEL |
| REJECTED | İade reddedildi | — (terminal) |
| CANCELLED | Müşteri veya sistem iptal etti | — (terminal) |
| PICKUP_SCHEDULED | Kargo alımı planlandı | PICKED_UP |
| PICKED_UP | Kargo alındı | IN_TRANSIT |
| IN_TRANSIT | Kargo yolda | ARRIVED |
| ARRIVED | Depoya ulaştı | INSPECTING |
| INSPECTING | Kalite kontrol yapılıyor | PASS, PASS_B, FAIL |
| PASS | Kalite kontrol geçti (A grade) | COMPLETED |
| PASS_B | Kalite kontrol geçti (B grade) | COMPLETED |
| FAIL | Kalite kontrol başarısız | REJECTED |
| QUALIFIED | İade ürünleri stoğa eklendi | COMPLETED |
| COMPLETED | İade tamamlandı, stok ve maliyet etkisi kaydedildi | — (terminal) |
| REJECTED | Ürünler reddedildi, imha | — (terminal) |

### 7.3 Otomatik Geçişler
| Tetikleyici | Durum Değişimi |
|-------------|----------------|
| Kargo API: delivered | ARRIVED |
| Sistem: 48 saat geçti (ARRIVED) | INSPECTING (uyarı ile) |
| İade tutarı < ₺500 ve reason_id onaylı | REQUESTED → APPROVED (otomatik) |
| 10 gün geçti (PICKUP_SCHEDULED) | Uyarı e-postası |
| COMPLETED | Stok hareketi ve iç maliyet etkisi idempotent olarak kaydedilir |

---

## 8. Acceptance Criteria

### 8.1 İade Oluşturma
- [ ] AC-01: Satış temsilcisi mevcut satıştan iade oluşturabilir
- [ ] AC-02: Müşteri portalinden iade başlatılabilir (guest değil, kayıtlı müşteri)
- [ ] AC-03: İade numarası otomatik RET-YYYY-NNNNNN formatında üretilir
- [ ] AC-04: İade tutarı ₺500'ün altındaysa otomatik onaylanır
- [ ] AC-05: Yanlış ürün gönderimi fotoğraf yükleme zorunluluğu çalışır

### 8.2 Fire Hesaplama
- [ ] AC-06: Fire hesaplaması formülü doğru çalışır (net = return - fire)
- [ ] AC-07: Ürün bazında fire oranı tablosu uygulanır
- [ ] AC-08: Fire tutarı iç maliyet/zarar raporunda ayrı kalem görünür
- [ ] AC-09: Minimum fire miktarı (0.1 kg) kuralı uygulanır
- [ ] AC-10: REJECT grade'de accepted_qty = 0

### 8.3 Kalite Kontrol
- [ ] AC-11: Depo personeli her iade kalemi için fire ve kalite notu girebilir
- [ ] AC-12: A/B/C/Reject kalite gruplaması kaydedilir
- [ ] AC-13: Kalite kontrol sonrası stok otomatik güncellenir
- [ ] AC-14: B grade ürünler "indirimli stok" olarak işaretlenir

### 8.4 Kargo ve Takip
- [ ] AC-15: Kargo kodu atandığında SMS ile müşteri bilgilendirilir
- [ ] AC-16: Kargo takip bilgisi durum sayfasında görüntülenir
- [ ] AC-17: Kargo 10 gün içinde gelmezse sistem uyarısı üretilir

### 8.5 Stok ve Maliyet Etkisi
- [ ] AC-18: İade tamamlandığında kabul edilen miktar için stok hareketi otomatik oluşturulur
- [ ] AC-19: Fire miktarı iç maliyet/zarar raporuna ayrı kaydedilir
- [ ] AC-20: Aynı tamamlama isteği tekrarlandığında ikinci stok hareketi oluşmaz

### 8.6 Raporlama
- [ ] AC-21: İade oranı raporu (satış bazlı yüzde) görüntülenebilir
- [ ] AC-22: Fire tutarı raporu ürün bazlı çekilebilir
- [ ] AC-23: İade neden dağılımı pasta grafikte gösterilir
- [ ] AC-24: Haftalık iade özeti e-posta ile gönderilir

---

## 9. Teknik Notlar

### 9.1 Kargo API Entegrasyonu
- Yurtiçi Kargo, Aras Kargo, PTT Kargo API'leri düşünülmüştür
- Generic cargo tracking interface ile adapter pattern
- Her kargo şirketi için ayrı adapter

### 9.2 Kapsam Sınırı
- Bu modül stok iadesi, kalite, fire ve iç maliyet etkisini yönetir.
- Faturalama, tahsilat/iade ödemesi, vergi kaydı ve mali belge entegrasyonu üretmez.
- Harici muhasebe sistemleriyle olası entegrasyon bu sürümün kapsamı dışındadır.

### 9.3 Bildirim Sistemi
- SMS: Netgsm, İleti Merkezi veya Turkcell API
- E-posta: Natro veya SendGrid
- Bildirim şablonları veritabanında saklanır

### 9.4 Stok Güncellemesi
```sql
-- İade tamamlandığında (A grade ürün)
UPDATE inventory_stock
SET quantity = quantity + :net_refund_qty,
    updated_at = NOW()
WHERE product_id = :product_id AND warehouse_id = :warehouse_id;

-- Fire kaydı
INSERT INTO inventory_fire_log (product_id, reason, quantity, unit_cost, amount, reference_return_id)
VALUES (:product_id, :fire_reason, :fire_qty, :unit_cost, :fire_amount, :return_id);
```
