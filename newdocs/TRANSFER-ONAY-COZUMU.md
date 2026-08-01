# TRANSFER ONAY MODÜLÜ ÇÖZÜMÜ

**Versiyon:** 1.0.0  
**Tarih:** 2026-07-29  
**Durum:** Tasarım Taslak  
**Modül:** Transfer Onay  
**Etki Alanı:** Depolar Arası Transfer, Onay Zinciri, Yetkilendirme

---

## 1. Header

| Alan | Değer |
|------|-------|
| Doküman No | SOL-TRS-ONAY-001 |
| Başlık | Transfer Onay Modülü Teknik Çözüm Dokümanı |
| Proje | Kuru Meyve-Bal ERP Sistemi |
| Yazarlar | Çözüm Mimar ekibi |
| Onay | Beklemede |

---

## 2. Mevcut Durum

### 2.1 Genel Bakış
Mevcut sistemde depo transferleri doğrudan onay gerektirmeden yapılabilmektedir. Stok çıkışı ve girişi eşzamanlı gerçekleşiyor, arada geçen sürede stok tutarsızlıkları oluşabiliyor. Onay hiyerarşisi tanımlı değil.

### 2.2 Tespit Edilen Sorunlar
- **Onaysız Transfer:** Kritik transferler (yüksek değerli, büyük miktar) kontrolsüz yapılıyor.
- **Stok Tutarsızlığı:** Çıkış ve giriş eşzamanlı olduğu için ara dönemde tutarsızlık yaşanıyor.
- **Onay Zinciri Belirsizliği:** Kime onaylatılacağı net değil, süreç kişiye göre değişiyor.
- **Takip Zorluğu:** Transferlerin hangi aşamada olduğu izlenemiyor.
- **Yetki Karmaşası:** Kimin neyi onaylayabileceği sistemsel olarak tanımlı değil.

### 2.3 Mevcut Süreç (Ham)
1. Depo amiri transfer talebi oluşturuyor
2. "Stoktan düş, diğer depoya ekle" → aynı anda işlem
3. Kayıt tamamlandı, takip yok

---

## 3. Tasarım Hedefleri

### 3.1 Stratejik Hedefler
| # | Hedef | Ölçüt |
|---|-------|-------|
| H-1 | Çok aşamalı onay zinciri kurmak | Transfer tutarına göre 1-3 onaycı tanımlanabilir |
| H-2 | Stok güvenliği sağlamak | Onay alınmadan stok hareketi olmaz |
| H-3 | Onay geçmişini izlenebilir yapmak | Her geçiş log'lanır, kim neyi onayladı belli |
| H-4 | Otomatik yönlendirme kurmak | Transfer özelliklerine göre doğru onaycıya yönlendir |
| H-5 | Dashboard ile takip sağlamak | Bekleyen onaylar, tamamlananlar görünür |

### 3.2 Fonksiyonel Kapsam
- **Transfer Talebi:** Depolar arası transfer talebi oluşturma
- **Onay Zinciri:** Kural tabanlı onaycı atama (tutar, ürün grubu, kaynak/hedef depo)
- **Staged Stock Movement:** Onay sürecinde stok "rezerve" olarak işaretlenir, onaylanınca kesinleşir
- **Onay/Bekleme/Red:** Her aşamada onay, geri gönderme (revize), red seçenekleri
- **Otomatik Hatırlatmalar:** 24 saat geçen onaylar için reminder e-postası
- **Raporlama:** Onay süresi, red oranı, kullanıcı bazlı performans

### 3.3 Kapsam Dışı
- Toptan satış transferleri (faz-2)
- Çapraz şirket transferleri (faz-2)
- Otomatik kargo/teslimat planlaması (faz-2)

---

## 4. DB Gereksinimleri

### 4.1 Tablo: `transfers`
```sql
CREATE TABLE transfers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number     VARCHAR(32) UNIQUE NOT NULL,  -- 'TRF-2026-000001'
    source_warehouse_id UUID REFERENCES warehouses(id),
    target_warehouse_id UUID REFERENCES warehouses(id),
    status              VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    priority            VARCHAR(16) DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'URGENT'
    total_amount        DECIMAL(18,2) NOT NULL DEFAULT 0,
    total_items         INTEGER NOT NULL DEFAULT 0,
    currency             VARCHAR(3) DEFAULT 'TRY',
    requested_by         UUID REFERENCES users(id),
    requested_at         TIMESTAMPTZ DEFAULT NOW(),
    description          TEXT,
    notes                TEXT,
    expected_ship_date   DATE,
    expected_arrival_date DATE,
    completed_at         TIMESTAMPTZ,
    rejected_at          TIMESTAMPTZ,
    rejected_by          UUID REFERENCES users(id),
    rejection_reason     TEXT,
    version              INTEGER DEFAULT 1,           -- Optimistic locking
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transfers_status       ON transfers(status);
CREATE INDEX idx_transfers_source       ON transfers(source_warehouse_id);
CREATE INDEX idx_transfers_target       ON transfers(target_warehouse_id);
CREATE INDEX idx_transfers_requested_by ON transfers(requested_by);
CREATE INDEX idx_transfers_number       ON transfers(transfer_number);
```

### 4.2 Tablo: `transfer_items`
```sql
CREATE TABLE transfer_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id     UUID REFERENCES transfers(id) ON DELETE CASCADE,
    product_id      UUID REFERENCES products(id),
    requested_qty   DECIMAL(18,3) NOT NULL,
    reserved_qty    DECIMAL(18,3) NOT NULL DEFAULT 0,   -- Stok rezerve edildi
    approved_qty    DECIMAL(18,3),                      -- Onaylanan miktar (revize sonrası)
    shipped_qty     DECIMAL(18,3) DEFAULT 0,
    received_qty    DECIMAL(18,3) DEFAULT 0,
    unit_cost       DECIMAL(18,4) NOT NULL,
    line_amount     DECIMAL(18,2) NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transfer_items_transfer ON transfer_items(transfer_id);
CREATE INDEX idx_transfer_items_product  ON transfer_items(product_id);
```

### 4.3 Tablo: `approval_chains`
```sql
CREATE TABLE approval_chains (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(128) NOT NULL,
    description     TEXT,
    rule_type       VARCHAR(32) NOT NULL,   -- 'AMOUNT_RANGE', 'PRODUCT_GROUP', 'WAREHOUSE_PAIR', 'GENERIC'
    rule_config     JSONB NOT NULL,          -- {"min_amount": 10000, "max_amount": 50000}
    chain_order     INTEGER NOT NULL,        -- Onay sırası (1, 2, 3...)
    approver_role   VARCHAR(64) NOT NULL,    -- 'WAREHOUSE_MANAGER', 'SALES_DIRECTOR', 'FINANCE_DIRECTOR', 'GENERAL_MANAGER'
    approver_user_id UUID REFERENCES users(id), -- NULL = role-based, dolu = specific user
    is_active       BOOLEAN DEFAULT TRUE,
    priority_override VARCHAR(16),           -- 'HIGH' override for this chain
    effective_from   DATE,
    effective_to     DATE,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chain_rule_type ON approval_chains(rule_type);
CREATE INDEX idx_chain_active   ON approval_chains(is_active);
```

### 4.4 Tablo: `transfer_approvals`
```sql
CREATE TABLE transfer_approvals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id     UUID REFERENCES transfers(id) ON DELETE CASCADE,
    chain_id        UUID REFERENCES approval_chains(id),
    approval_order  INTEGER NOT NULL,         -- Zincirdeki sıra (1, 2, ...)
    approver_id     UUID REFERENCES users(id),
    status          VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED', 'SKIPPED'
    decision_at     TIMESTAMPTZ,
    decision_notes  TEXT,
    revision_notes  TEXT,                      -- Geri gönderme notu
    assigned_at     TIMESTAMPTZ DEFAULT NOW(),
    reminded_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_approval_transfer ON transfer_approvals(transfer_id);
CREATE INDEX idx_approval_approver  ON transfer_approvals(approver_id);
CREATE INDEX idx_approval_status    ON transfer_approvals(status);
```

### 4.5 Tablo: `transfer_status_log`
```sql
CREATE TABLE transfer_status_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id     UUID REFERENCES transfers(id) ON DELETE CASCADE,
    from_status     VARCHAR(32),
    to_status       VARCHAR(32) NOT NULL,
    changed_by      UUID REFERENCES users(id),
    changed_at      TIMESTAMPTZ DEFAULT NOW(),
    notes           TEXT
);

CREATE INDEX idx_transfer_log_transfer ON transfer_status_log(transfer_id);
```

### 4.6 Tablo: `approval_policies`
```sql
CREATE TABLE approval_policies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(128) NOT NULL,
    policy_type     VARCHAR(32) NOT NULL,      -- 'AMOUNT_BAND', 'PRODUCT_CATEGORY', 'WAREHOUSE_SPECIFIC'
    conditions      JSONB NOT NULL,            -- [{field: 'total_amount', operator: '>=', value: 10000}]
    chain_ids       JSONB NOT NULL,            -- [chain_uuid_1, chain_uuid_2]
    is_default      BOOLEAN DEFAULT FALSE,     -- Eşleşme yoksa default policy
    is_active       BOOLEAN DEFAULT TRUE,
    priority        INTEGER DEFAULT 0,         -- Düşük önce değerlendirilir
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_policy_type    ON approval_policies(policy_type);
CREATE INDEX idx_policy_priority ON approval_policies(priority);
```

---

## 5. API Endpoints

### 5.1 Transfer Yönetimi

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/transfers` | Transfer listesi (filtrelenebilir) |
| GET | `/api/v1/transfers/{id}` | Transfer detayı |
| POST | `/api/v1/transfers` | Yeni transfer talebi oluştur |
| PUT | `/api/v1/transfers/{id}` | Transfer talebini güncelle (draft only) |
| DELETE | `/api/v1/transfers/{id}` | Transfer talebini sil (draft only) |
| POST | `/api/v1/transfers/{id}/submit` | Transferi onaya gönder |
| GET | `/api/v1/transfers/{id}/approval-chain` | Onay zincirini görüntüle |

### 5.2 Onay Yönetimi

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/approvals/pending` | Bekleyen onaylarım |
| GET | `/api/v1/approvals/history` | Onay geçmişim |
| POST | `/api/v1/approvals/{id}/approve` | Onayla |
| POST | `/api/v1/approvals/{id}/reject` | Reddet |
| POST | `/api/v1/approvals/{id}/request-revision` | Revizyon iste |
| POST | `/api/v1/approvals/{id}/delegate` | Yetki devret |

### 5.3 Depo İşlemleri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/v1/transfers/{id}/ship` | Transferi sevk et (kaynak depodan düş) |
| POST | `/api/v1/transfers/{id}/receive` | Transferi teslim al (hedef depoya ekle) |
| POST | `/api/v1/transfers/{id}/receive-item` | Kalem bazlı teslim alma |

### 5.4 Raporlama

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/transfers/stats` | Transfer istatistikleri |
| GET | `/api/v1/transfers/approval-times` | Onay süreleri raporu |
| GET | `/api/v1/transfers/rejection-report` | Red oranı raporu |

### 5.5 Endpoint Detayları

#### POST `/api/v1/transfers`
**Request:**
```json
{
  "source_warehouse_id": "uuid",
  "target_warehouse_id": "uuid",
  "priority": "NORMAL",
  "expected_ship_date": "2026-08-05",
  "expected_arrival_date": "2026-08-07",
  "description": "İstanbul deposundan Ankara deposuna sevk",
  "items": [
    {
      "product_id": "uuid",
      "requested_qty": 100.0,
      "unit_cost": 45.50,
      "notes": "5 kolli"
    }
  ]
}
```
**Response:**
```json
{
  "id": "uuid",
  "transfer_number": "TRF-2026-000001",
  "status": "DRAFT",
  "total_amount": 4550.00,
  "total_items": 1,
  "approval_chain": [
    {"order": 1, "role": "WAREHOUSE_MANAGER", "status": "PENDING"}
  ],
  "created_at": "2026-07-29T10:00:00Z"
}
```

#### POST `/api/v1/approvals/{id}/approve`
**Request:**
```json
{
  "decision_notes": "Stok kontrol edildi, uygundur",
  "approve_all_items": true
}
```
**Response:**
```json
{
  "approval_id": "uuid",
  "status": "APPROVED",
  "decision_at": "2026-07-29T11:30:00Z",
  "next_approver": {
    "order": 2,
    "role": "SALES_DIRECTOR",
    "assigned_to": "uuid"
  },
  "transfer_status": "IN_APPROVAL"
}
```

#### POST `/api/v1/transfers/{id}/ship`
**Request:**
```json
{
  "shipped_at": "2026-08-05T09:00:00Z",
  "items": [
    {"transfer_item_id": "uuid", "shipped_qty": 100.0}
  ],
  "cargo_company": "Aras Kargo",
  "tracking_number": "A123456789"
}
```

#### POST `/api/v1/transfers/{id}/receive`
**Request:**
```json
{
  "received_at": "2026-08-07T14:00:00Z",
  "items": [
    {"transfer_item_id": "uuid", "received_qty": 98.0, "notes": "2 adet ezik geldi, fire olarak kaydedildi"}
  ]
}
```

---

## 6. İş Kuralları

### 6.1 Transfer Oluşturma Kuralları
| Kural | Açıklama |
|-------|----------|
| IK-01 | Kaynak ve hedef depo farklı olmalıdır |
| IK-02 | Transfer numarası formatı: TRF-YYYY-NNNNNN |
| IK-03 | DRAFT durumunda transfer silinebilir veya güncellenebilir |
| IK-04 | SUBMITTED sonrası sadece onay zincirindekiler güncelleyebilir |
| IK-05 | Aynı ürün için birden fazla satır eklenebilir (farklı lot no gibi) |

### 6.2 Onay Zinciri Kuralları
| Kural | Açıklama |
|-------|----------|
| IK-06 | Tutara göre onay zinciri atanır (10K-50K: 1 onaycı, 50K-200K: 2 onaycı, 200K+: 3 onaycı) |
| IK-07 | Zincir sıralıdır: Önce 1. onaycı karar verir, sonra 2. devreye girer |
| IK-08 | 1. onaycı reddederse transfer doğrudan reddedilir (zincir kırılır) |
| IK-09 | 1. onaycı revizyon isterse transfer DRAFT'a döner, düzeltilip tekrar gönderilir |
| IK-10 | Her onaycı kendisine atanan approval kaydına sahiptir |
| IK-11 | Onaycı devir yapabilir, ancak devir kaydı log'lanır |
| IK-12 | 24 saat içinde karar verilmezse reminder gönderilir |
| IK-13 | 72 saat sonunda hala bekliyorsa bir üst yöneticiye bildirim |

### 6.3 Stok Rezervasyon Kuralları
| Kural | Açıklama |
|-------|----------|
| IK-14 | Transfer SUBMITTED olunca kaynak depodan stok rezerve edilir (reserved_qty) |
| IK-15 | Transfer REDDETTİğinde rezerve iptal edilir |
| IK-16 | Transfer APPROVED olunca reserved → shipped dönüşür |
| IK-17 | Transfer tamamlandığında hedef depoya quantity artırılır |
| IK-18 | Received miktar < Shipped miktar ise fark fire olarak kaydedilir |

### 6.4 Stok Hareketleri
| Kural | Açıklama |
|-------|----------|
| IK-19 | Shipped: Kaynak depodan `shipped_qty` kadar düşülür |
| IK-20 | Received: Hedef depoya `received_qty` kadar eklenir |
| IK-21 | Fire farkı: (shipped - received) fire olarak kaydedilir |
| IK-22 | Transfer tamamlanmadan hedef depo stok güncellenemez |

### 6.5 Politika Eşleştirme Kuralları
```
Policy öncelik sırasına göre değerlendirilir:
1. WAREHOUSE_PAIR (kaynak+hedef belirli) 
2. PRODUCT_CATEGORY (ürün grubuna göre)
3. AMOUNT_BAND (tutar aralığı)
4. GENERIC (genel)
5. is_default (hiçbiri eşleşmezse)
```

---

## 7. Durum Makinesi

### 7.1 Transfer Ana Durumları
```
[DRAFT] ---submit---> [SUBMITTED] ---first-approval---> [IN_APPROVAL]
   ^                     |                                  |
   |                     +---reject--->[REJECTED]           |
   |                     |                                  |
   |                     +---revision-->[DRAFT] (revision requested)
   |                                                         |
   |                     +---all-approved----------------->[APPROVED]
   |                                                         |
   |                                                         v
   |                                                   [SHIPPED]
   |                                                         |
   |                                                         v
   |                                                   [PARTIALLY_SHIPPED] (opsiyonel)
   |                                                         |
   |                                                         v
   +-------------------cancel---------------------------->[CANCELLED]
   |                                                         |
                                                         v
                                                    [RECEIVED]
                                                         |
                                                         v
                                                   [COMPLETED]
```

### 7.2 Detaylı Durum Tablosu

| Durum | Açıklama | Geçiş Koşulu |
|-------|----------|--------------|
| DRAFT | Taslak, düzenlenebilir | Submit, Delete, Cancel |
| SUBMITTED | Onaya gönderildi, ilk onaycı atandı | First approval, Reject, Revision request |
| IN_APPROVAL | Zincir devam ediyor | Next approval, Reject, Revision |
| APPROVED | Tüm onaylardan geçti | Ship |
| REJECTED | Reddedildi | — (terminal) |
| REVISION_REQUESTED | Revizyon istendi | DRAFT'a dön, tekrar submit |
| CANCELLED | İptal edildi | — (terminal) |
| SHIPPED | Kaynak depodan sevk edildi | Receive |
| PARTIALLY_SHIPPED | Kısmi sevk | Receive, Ship remaining |
| RECEIVED | Hedef depoya ulaştı | — → COMPLETED |
| COMPLETED | Transfer tamamlandı | — (terminal) |

### 7.3 Onay Durumları
```
[PENDING] --approve--> [APPROVED]
    |                      |
    +--reject-->[REJECTED]
    |
    +--revision-->[REVISION_REQUESTED]
    |
    +--delegate-->[PENDING] (yeni approver atanır)
    |
    +--timeout(72h)-->[ESCALATED] (üst yöneticiye yönlendir)
```

### 7.4 Otomatik Geçiş Tetikleyicileri
| Tetikleyici | Durum Değişimi |
|-------------|----------------|
| Submit | DRAFT → SUBMITTED, approval atanır |
| Tüm onaylar tamamlandı | IN_APPROVAL → APPROVED |
| Herhangi bir red | → REJECTED, rezerve iptal |
| Revizyon isteği | → DRAFT (notes ile) |
| Ship işlemi | APPROVED → SHIPPED, reserved düşülür |
| Receive işlemi | SHIPPED → RECEIVED |
| Receive + mismatch | → COMPLETED, fire kaydı oluşur |
| 72 saat onaysız bekleme | PENDING → ESCALATED |

---

## 8. Acceptance Criteria

### 8.1 Transfer Talebi
- [ ] AC-01: Kullanıcı transfer talebi oluşturabilir, kaynak/hedef depo seçebilir
- [ ] AC-02: Talep DRAFT durumundayken ürün ekleme/silme/güncelleme yapılabilir
- [ ] AC-03: Toplam tutar otomatik hesaplanır (qty * unit_cost)
- [ ] AC-04: Submit edildiğinde uygun onay zinciri otomatik atanır

### 8.2 Onay Zinciri
- [ ] AC-05: Tutara göre doğru sayıda onaycı atanır (10K:1, 50K:2, 200K:3)
- [ ] AC-06: Onaycı sadece kendisine atanan transferleri görür
- [ ] AC-07: Onaycı approve/reject/revision seçeneklerini görebilir
- [ ] AC-08: Revizyon istendiğinde transfer DRAFT'a döner, not gösterilir
- [ ] AC-09: Delegation yapıldığında log kaydı tutulur

### 8.3 Stok Yönetimi
- [ ] AC-10: Submit edildiğinde kaynak depodan rezerve edilir
- [ ] AC-11: Reddedildiğinde rezerve iptal edilir
- [ ] AC-12: Ship edildiğinde reserved düşülür, shipped artar
- [ ] AC-13: Received edildiğinde hedef depo stok artar
- [ ] AC-14: Shipped - Received farkı fire olarak kaydedilir

### 8.4 Takip ve Bildirim
- [ ] AC-15: Bekleyen onaylar dashboard'da gösterilir
- [ ] AC-16: 24 saat geçen onaylar için reminder e-postası gider
- [ ] AC-17: Transfer her durum değiştiğinde talep sahibi bilgilendirilir
- [ ] AC-18: Onay süresi (saat) raporlanabilir

### 8.5 Raporlama
- [ ] AC-19: Transfer istatistikleri (sayı, tutar, onay süresi) görüntülenebilir
- [ ] AC-20: Red oranı kullanıcı bazlı çekilebilir
- [ ] AC-21: Bekleyen transferler (age) listesi alınabilir

### 8.6 Yetkilendirme
- [ ] AC-22: Sadece WAREHOUSE_MANAGER rolü transfer oluşturabilir
- [ ] AC-23: Onay yetkisi rol bazlı kontrol edilir
- [ ] AC-24: Admin olmayan kullanıcı onay zinciri kuralı değiştiremez

---

## 9. Teknik Notlar

### 9.1 Onay Zinciri Motoru
```python
def assign_approval_chain(transfer: Transfer) -> List[ApprovalChain]:
    """Policy matching engine"""
    policies = get_active_policies(order_by='priority ASC')
    
    for policy in policies:
        if matches_policy(transfer, policy):
            chains = get_chains_for_policy(policy.id)
            return sort_chains_by_order(chains)
    
    # Default fallback
    default_policy = get_default_policy()
    return get_chains_for_policy(default_policy.id)

def matches_policy(transfer: Transfer, policy: ApprovalPolicy) -> bool:
    for condition in policy.conditions:
        field = get_field(transfer, condition['field'])
        if not evaluate(field, condition['operator'], condition['value']):
            return False
    return True
```

### 9.2 Stok Rezervasyon
```sql
-- Rezerve et (submit anında)
UPDATE inventory_stock
SET reserved_qty = reserved_qty + :qty,
    available_qty = quantity - (reserved_qty + :qty)
WHERE product_id = :product_id
  AND warehouse_id = :source_warehouse_id;

-- Reservasyonu kaldır (reject anında)
UPDATE inventory_stock
SET reserved_qty = reserved_qty - :qty,
    available_qty = quantity - (reserved_qty - :qty)
WHERE product_id = :product_id
  AND warehouse_id = :source_warehouse_id;

-- Ship (kesin düşüm)
UPDATE inventory_stock
SET quantity = quantity - :shipped_qty,
    reserved_qty = reserved_qty - :shipped_qty,
    updated_at = NOW()
WHERE product_id = :product_id
  AND warehouse_id = :source_warehouse_id;

-- Receive (hedef depo giriş)
UPDATE inventory_stock
SET quantity = quantity + :received_qty,
    updated_at = NOW()
WHERE product_id = :product_id
  AND warehouse_id = :target_warehouse_id;
```

### 9.3 Notification Template
```
Konu: [ERP] Transfer #{transfer_number} - {status_change}
Body:
  Sayın {user_name},
  
  {transfer_number} numaralı transfer için bir işlem yapıldı.
  
  Durum: {new_status}
  Talep Eden: {requested_by}
  Kaynak: {source_warehouse}
  Hedef: {target_warehouse}
  Tutar: {total_amount} TL
  
  Detaylar: {app_url}/transfers/{id}
```

### 9.4 Kullanıcı Rol Tanımları
| Rol | Yetki |
|-----|-------|
| WAREHOUSE_STAFF | Transfer oluşturamaz, sadece ship/receive yapabilir |
| WAREHOUSE_MANAGER | Transfer oluşturabilir, 1. onaycı olabilir |
| SALES_DIRECTOR | 2. onaycı olabilir |
| FINANCE_DIRECTOR | 2. onaycı olabilir |
| GENERAL_MANAGER | 3. onaycı, her şeyi onaylayabilir |
| ADMIN | Tüm işlemler, kural yönetimi |
