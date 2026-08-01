# Bildirim Sistemi — Detaylı Tasarım Dokümanı

**Versiyon:** 1.0  
**Tarih:** 2026-07-29  
**Seviye:** 1.2.2 Orta Düzey  
**Kaynak:** SRS-Kurutulmus-Meyve-Bal-ERP.md, DB-Design-Kurutulmus-Meyve-Bal-ERP.md, URETIMLIK_HAZIRLIK_GAP-ANALIZI-RAPORU.md

---

## 1. Bildirim Türleri ve Öncelik Seviyeleri

### 1.1 Bildirim Türleri

| Tür | Kod | Kanallar | Öncelik | Açıklama |
|-----|-----|----------|---------|----------|
| Stok Kritik | `STOK_KRITIK` | E-posta, SMS, Uygulama | 🔴 Kritik | Minimum stok eşiğinin altına düşüldüğünde |
| Stok Düşük | `STOK_DUSUK` | Uygulama, E-posta | 🟡 Yüksek | Stok minimum eşiğe yaklaştığında |
| Son Kullanma Uyarısı | `LOT_SK_TARIHI` | Uygulama, E-posta | 🟡 Yüksek | Lot'un son kullanma tarihi yaklaştığında (30 gün) |
| Fire Oranı Uyarısı | `URETIM_FIRE` | Uygulama | 🟡 Yüksek | Fire oranı eşiği aşıldığında |
| Plansız Üretim | `PLANSIZ_URETIM` | Uygulama, E-posta | 🔴 Kritik | Plansız üretim emri oluştuğunda |
| Tedarikçi Performans | `TEDARIKCI_PERFORMANS` | E-posta, Uygulama | 🟡 Yüksek | Kalite sorunu veya performans düşüşü |
| Tedarikçi Onay Bekleyen | `TEDARIKCI_BEKLEYEN` | Uygulama | 🟢 Normal | Yeni tedarikçi onayı beklemede |
| Sistem Yedekleme | `SISTEM_YEDEKLEME` | E-posta, Uygulama | 🟢 Normal | Yedekleme tamamlandığında |
| Sistem Hata | `SISTEM_HATA` | E-posta, SMS, Uygulama | 🔴 Kritik | Sistem hatası oluştuğunda |
| Veri İhlali | `VERI_IHLALI` | E-posta, SMS, Uygulama | 🔴 Acil | Veri ihlali tespit edildiğinde |
| Geri Çağırma | `GERI_CAGIRMA` | E-posta, SMS, Uygulama | 🔴 Acil | Ürün geri çağırma kararı |
| Onay Bekleyen | `ONAY_BEKLEYEN` | Uygulama, E-posta | 🟡 Yüksek | Yönetici onayı gereken işlem |
| Kullanıcı Oluşturuldu | `KULLANICI_OLUSTU` | Uygulama | 🟢 Normal | Yeni kullanıcı hesabı oluştuğunda |
| Şifre Değişikliği | `SIFRE_DEGISIKLIGI` | E-posta | 🟢 Normal | Şifre değiştirildiğinde |
| MFA Etkinleştirme | `MFA_AKTIF` | E-posta | 🟢 Normal | MFA etkinleştirildiğinde |

### 1.2 Öncelik Tanımları

```json
{
  "oncelik_seviyeleri": {
    "ACIL": {
      "deger": 1,
      "etiket": "Acil",
      "renk": "#DC2626",
      "sms_gonder": true,
      "uygulama_anlik": true,
      "eposta_anlik": true,
      "sesli_bildirim": true
    },
    "KRITIK": {
      "deger": 2,
      "etiket": "Kritik",
      "renk": "#EA580C",
      "sms_gonder": true,
      "uygulama_anlik": true,
      "eposta_anlik": true,
      "sesli_bildirim": false
    },
    "YUKSEK": {
      "deger": 3,
      "etiket": "Yüksek",
      "renk": "#CA8A04",
      "sms_gonder": false,
      "uygulama_anlik": true,
      "eposta_anlik": true,
      "sesli_bildirim": false
    },
    "NORMAL": {
      "deger": 4,
      "etiket": "Normal",
      "renk": "#2563EB",
      "sms_gonder": false,
      "uygulama_anlik": true,
      "eposta_anlik": false,
      "eposta_ozet": true,
      "sesli_bildirim": false
    },
    "BILGI": {
      "deger": 5,
      "etiket": "Bilgi",
      "renk": "#6B7280",
      "sms_gonder": false,
      "uygulama_anlik": false,
      "uygulama_ozet": true,
      "eposta_ozet": true,
      "sesli_bildirim": false
    }
  }
}
```

---

## 2. Bildirim Template Sistemi

### 2.1 Template Tablosu (Veritabanı)

```sql
CREATE TABLE bildirim_sablonlari (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kod             VARCHAR(50) UNIQUE NOT NULL,  -- örn: 'STOK_KRITIK'
    baslik_sablon   VARCHAR(255) NOT NULL,       -- '{urun_adi} stok kritik!'
    icerik_sablon   TEXT NOT NULL,                -- HTML destekli
    oncelik         VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    kanallar        VARCHAR(20)[] NOT NULL DEFAULT ARRAY['UYGULAMA'],
    aktif           BOOLEAN DEFAULT TRUE,
    olusturan_id    UUID REFERENCES kullanicilar(id),
    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 Sistem Template'leri (Başlangıç Verisi)

```sql
INSERT INTO bildirim_sablonlari (kod, baslik_sablon, icerik_sablon, oncelik, kanallar) VALUES
-- Stok Bildirimleri
('STOK_KRITIK',
 '<i class="fas fa-exclamation-triangle"></i> {urun_adi} Stok Kritik!',
 '<p><strong>{urun_adi}</strong> ({urun_kodu}) için <span style="color:red">kritik stok seviyesi</span> rapor edilmiştir.</p>
  <ul>
    <li><strong>Mevcut Stok:</strong> {miktar} {birim}</li>
    <li><strong>Minimum Eşik:</strong> {esik_degeri} {birim}</li>
    <li><strong>Depo:</strong> {depo_adi}</li>
    <li><strong>Tarih:</strong> {tarih}</li>
  </ul>
  <p><a href="{bildirim_url}">Stok Yönetimine Git</a></p>',
 'KRITIK',
 ARRAY['EPOSTA','SMS','UYGULAMA']),

('STOK_DUSUK',
 '<i class="fas fa-box-open"></i> {urun_adi} Stok Düşük',
 '<p><strong>{urun_adi}</strong> için düşük stok uyarısı.</p>
  <ul>
    <li><strong>Mevcut Stok:</strong> {miktar} {birim}</li>
    <li><strong>Minimum Eşik:</strong> {esik_degeri} {birim}</li>
    <li><strong>Depo:</strong> {depo_adi}</li>
  </ul>',
 'YUKSEK',
 ARRAY['EPOSTA','UYGULAMA']),

('LOT_SK_TARIHI',
 '<i class="fas fa-clock"></i> Son Kullanma Tarihi Yaklaşıyor',
 '<p><strong>{lot_no}</strong> numaralı lot için son kullanma tarihi yaklaşmaktadır.</p>
  <ul>
    <li><strong>Ürün:</strong> {urun_adi}</li>
    <li><strong>Lot:</strong> {lot_no}</li>
    <li><strong>SKT:</strong> {sk_tarih} ({gun_kaldi} gün kaldı)</li>
    <li><strong>Miktar:</strong> {miktar} {birim}</li>
  </ul>',
 'YUKSEK',
 ARRAY['EPOSTA','UYGULAMA']),

-- Üretim Bildirimleri
('URETIM_FIRE',
 '<i class="fas fa-percentage"></i> Fire Oranı Yüksek!',
 '<p><strong>{uretim_emri_no}</strong> numaralı üretim emri için fire oranı eşiği aşıldı.</p>
  <ul>
    <li><strong>Planlanan Fire:</strong> %{planlanan_fire}</li>
    <li><strong>Gerçekleşen Fire:</strong> %{gerceklesen_fire}</li>
    <li><strong>Ürün:</strong> {urun_adi}</li>
    <li><strong>Tarih:</strong> {tarih}</li>
  </ul>',
 'YUKSEK',
 ARRAY['UYGULAMA']),

('PLANSIZ_URETIM',
 '<i class="fas fa-exclamation-circle"></i> Plansız Üretim Oluşturuldu',
 '<p>Yeni bir <strong>plansız üretim emri</strong> oluşturuldu ve onayınızı bekliyor.</p>
  <ul>
    <li><strong>Emir No:</strong> {uretim_emri_no}</li>
    <li><strong>Ürün:</strong> {urun_adi}</li>
    <li><strong>Miktar:</strong> {miktar} {birim}</li>
    <li><strong>Başlangıç:</strong> {baslangic_tarih}</li>
    <li><strong>Oluşturan:</strong> {olusturan_kullanici}</li>
  </ul>',
 'KRITIK',
 ARRAY['EPOSTA','UYGULAMA']),

-- Tedarikçi Bildirimleri
('TEDARIKCI_PERFORMANS',
 '<i class="fas fa-chart-line"></i> Tedarikçi Performans Uyarısı',
 '<p><strong>{tedarikci_adi}</strong> için performans sorunu tespit edildi.</p>
  <ul>
    <li><strong>Sorun Tipi:</strong> {sorun_tipi}</li>
    <li><strong>Tarih:</strong> {tarih}</li>
    <li><strong>Detay:</strong> {detay}</li>
  </ul>',
 'YUKSEK',
 ARRAY['EPOSTA','UYGULAMA']),

-- Sistem Bildirimleri
('SISTEM_YEDEKLEME',
 '<i class="fas fa-check-circle"></i> Yedekleme Tamamlandı',
 '<p>Sistemi yedeklemesi başarıyla tamamlandı.</p>
  <ul>
    <li><strong>Yedek Türü:</strong> {yedek_turu}</li>
    <li><strong>Boyut:</strong> {boyut}</li>
    <li><strong>Tarih:</strong> {tarih}</li>
  </ul>',
 'BILGI',
 ARRAY['EPOSTA','UYGULAMA']),

('SISTEM_HATA',
 '<i class="fas fa-times-circle"></i> Sistem Hatası',
 '<p>Sistemde bir <strong>hata</strong> oluştu.</p>
  <ul>
    <li><strong>Hata Mesajı:</strong> {hata_mesaji}</li>
    <li><strong>Modül:</strong> {modul}</li>
    <li><strong>Tarih:</strong> {timestamp}</li>
  </ul>',
 'KRITIK',
 ARRAY['EPOSTA','SMS','UYGULAMA']),

-- Onay Bildirimleri
('ONAY_BEKLEYEN',
 '<i class="fas fa-clock"></i> Onay Bekleyen İşlem',
 '<p><strong>{islem_tipi}</strong> işlemi onayınızı bekliyor.</p>
  <ul>
    <li><strong>İşlem:</strong> {islem_detay}</li>
    <li><strong>Oluşturan:</strong> {olusturan_kullanici}</li>
    <li><strong>Tarih:</strong> {tarih}</li>
  </ul>
  <p><a href="{onay_url}">Onayla / Reddet</a></p>',
 'YUKSEK',
 ARRAY['EPOSTA','UYGULAMA']);
```

### 2.3 Template Değişken Sözlüğü

| Değişken | Açıklama | Örnek |
|----------|----------|-------|
| `{urun_adi}` | Ürün adı | Ayşe Finem Kahvaltılık İncir |
| `{urun_kodu}` | Ürün SKU/kodu | AF-KI-500 |
| `{miktar}` | Mevcut miktar | 45 |
| `{birim}` | Birim | kg, adet, lt |
| `{esik_degeri}` | Minimum eşik değeri | 100 |
| `{depo_adi}` | Depo adı | Merkez Depo |
| `{lot_no}` | Lot numarası | LOT-2026-0045 |
| `{sk_tarih}` | Son kullanma tarihi | 2026-08-15 |
| `{gun_kaldi}` | Kalan gün sayısı | 17 |
| `{uretim_emri_no}` | Üretim emri numarası | URET-2026-0089 |
| `{planlanan_fire}` | Planlanan fire oranı (%) | 2.5 |
| `{gerceklesen_fire}` | Gerçekleşen fire oranı (%) | 7.8 |
| `{baslangic_tarih}` | Başlangıç tarihi | 2026-07-29 08:00 |
| `{tedarikci_adi}` | Tedarikçi adı | Doğal Ürünler Ltd. |
| `{sorun_tipi}` | Sorun tipi | Gecikme, Kalite |
| `{detay}` | Detay açıklama | Geçen ay teslimat %30 gecikti |
| `{yedek_turu}` | Yedekleme türü | Günlük, Haftalık |
| `{boyut}` | Yedek boyutu | 2.4 GB |
| `{hata_mesaji}` | Hata mesajı | Connection timeout |
| `{modul}` | Hata alan modül | Stok Yönetimi |
| `{timestamp}` | Zaman damgası | 2026-07-29 14:32:15 |
| `{islem_tipi}` | İşlem tipi | Satınalma Onayı |
| `{islem_detay}` | İşlem detayı | 500kg kuru incir tedariği |
| `{olusturan_kullanici}` | Oluşturan kullanıcı adı | Mehmet Yılmaz |
| `{tarih}` | Tarih/saat | 2026-07-29 |
| `{bildirim_url}` | İlgili URL | /stok/yonetimi |
| `{onay_url}` | Onay sayfası URL | /onay/uretim/URET-2026-0089 |

### 2.4 Template İşleme Kuralları

```
1. Değişkenler {DEGISKEN_ADI} formatında yazılır
2. Eksik değişkenler için boş string ('') kullanılır — hata fırlatılmaz
3. XSS koruması: HTML template'lerde tüm değişken değerleri HTML-encoder'dan geçirilir
4. Şablon doğrulama: her kayıtta kod + değişken eşleşmesi kontrol edilir
5. Lokalizasyon: dil kodu eklenerek çok dil desteği sağlanabilir (ileri aşama)
```

---

## 3. Bildirim Tercihleri Veri Yapısı (JSONB Şeması)

### 3.1 Kullanıcı Tercihleri Tablosu Alanı

**Tablo:** `kullanicilar`  
**Alan:** `bildirim_tercihleri` (JSONB)  
**Önceki durum:** Tanımlı ama kullanımı dokümante değil

### 3.2 JSONB Şema Tanımı

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "Bildirim Tercihleri Şeması",
  "description": "Kullanıcı başına bildirim tercihleri - JSONB",
  "default": {},
  "examples": [{
    "kanal_ayarlari": {
      "eposta": { "aktif": true, "adres": "user@example.com" },
      "sms": { "aktif": true, "numara": "+905321234567" },
      "uygulama": { "aktif": true }
    },
    "oncelik_filtresi": {
      "eposta": ["ACIL", "KRITIK", "YUKSEK", "NORMAL", "BILGI"],
      "sms": ["ACIL", "KRITIK"],
      "uygulama": ["ACIL", "KRITIK", "YUKSEK", "NORMAL", "BILGI"]
    },
    "bildirim_saatleri": {
      "aktif": true,
      "baslangic": "08:00",
      "bitis": "18:00",
      "hafta_sonu_aktif": false,
      "ayrili_gunler": []
    },
    "gruplandirma": {
      "tur": "OZET",
      "aralik_dakika": 60,
      "eposta_ozet_saati": "09:00"
    },
    "kategori_ayarlari": {
      "STOK": { "aktif": true, "kanallar": ["eposta", "uygulama"] },
      "URETIM": { "aktif": true, "kanallar": ["uygulama"] },
      "TEDARIKCI": { "aktif": true, "kanallar": ["eposta", "uygulama"] },
      "SISTEM": { "aktif": true, "kanallar": ["eposta", "sms", "uygulama"] },
      "ONAY": { "aktif": true, "kanallar": ["uygulama"] },
      "GUVENLIK": { "aktif": true, "kanallar": ["eposta", "sms", "uygulama"] }
    },
    "sessiz_mod": {
      "aktif": false,
      "baslangic": null,
      "bitis": null
    },
    "dil": "tr"
  }],
  "required": ["kanal_ayarlari"],
  "additionalProperties": false,
  "properties": {
    "kanal_ayarlari": {
      "type": "object",
      "description": "Her kanal için temel aktiflik ve adres/numara bilgisi",
      "properties": {
        "eposta": {
          "type": "object",
          "properties": {
            "aktif": { "type": "boolean", "default": true },
            "adres": { "type": "string", "format": "email" },
            "dogrulanmis": { "type": "boolean", "default": false }
          }
        },
        "sms": {
          "type": "object",
          "properties": {
            "aktif": { "type": "boolean", "default": false },
            "numara": { "type": "string", "pattern": "^\\+[1-9]\\d{1,14}$" },
            "dogrulanmis": { "type": "boolean", "default": false }
          }
        },
        "uygulama": {
          "type": "object",
          "properties": {
            "aktif": { "type": "boolean", "default": true },
            "bildirim_sesi": { "type": "boolean", "default": true },
            "titreşim": { "type": "boolean", "default": true }
          }
        }
      }
    },
    "oncelik_filtresi": {
      "type": "object",
      "description": "Her kanal için hangi öncelik seviyelerinin gönderileceği",
      "properties": {
        "eposta": {
          "type": "array",
          "items": { "type": "string", "enum": ["ACIL", "KRITIK", "YUKSEK", "NORMAL", "BILGI"] },
          "default": ["ACIL", "KRITIK", "YUKSEK", "NORMAL", "BILGI"]
        },
        "sms": {
          "type": "array",
          "items": { "type": "string", "enum": ["ACIL", "KRITIK", "YUKSEK", "NORMAL", "BILGI"] },
          "default": ["ACIL", "KRITIK"]
        },
        "uygulama": {
          "type": "array",
          "items": { "type": "string", "enum": ["ACIL", "KRITIK", "YUKSEK", "NORMAL", "BILGI"] },
          "default": ["ACIL", "KRITIK", "YUKSEK", "NORMAL", "BILGI"]
        }
      }
    },
    "bildirim_saatleri": {
      "type": "object",
      "description": "Bildirim gönderim saat kısıtlamaları (mesai dışı kapalı)",
      "properties": {
        "aktif": { "type": "boolean", "default": false },
        "baslangic": { "type": "string", "pattern": "^([01]\\d|2[0-3]):([0-5]\\d)$", "example": "08:00" },
        "bitis": { "type": "string", "pattern": "^([01]\\d|2[0-3]):([0-5]\\d)$", "example": "18:00" },
        "hafta_sonu_aktif": { "type": "boolean", "default": false },
        "ayrili_gunler": {
          "type": "array",
          "items": { "type": "string", "format": "date" },
          "description": "Yıl içinde tatil günleri (ULusal bayram, vb.)"
        }
      }
    },
    "gruplandirma": {
      "type": "object",
      "description": "Bildirim gruplama/özet ayarları",
      "properties": {
        "tur": {
          "type": "string",
          "enum": ["ANLIK", "OZET"],
          "default": "ANLIK",
          "description": "ANLIK: her bildirimi anında gönder; OZET: belirli aralıklarla özet gönder"
        },
        "aralik_dakika": {
          "type": "integer",
          "minimum": 15,
          "maximum": 1440,
          "default": 60,
          "description": "Özet gönderim aralığı (dakika)"
        },
        "eposta_ozet_saati": {
          "type": "string",
          "pattern": "^([01]\\d|2[0-3]):([0-5]\\d)$",
          "description": "Günlük e-posta özeti saatı"
        },
        "haftalik_ozet_gun": {
          "type": "string",
          "enum": ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"],
          "description": "Haftalık özet gönderim günü"
        }
      }
    },
    "kategori_ayarlari": {
      "type": "object",
      "description": "Her bildirim kategorisi için özel kanal ayarları",
      "properties": {
        "STOK": {
          "type": "object",
          "properties": {
            "aktif": { "type": "boolean" },
            "kanallar": { "type": "array", "items": { "type": "string", "enum": ["eposta", "sms", "uygulama"] } }
          }
        },
        "URETIM": {
          "type": "object",
          "properties": {
            "aktif": { "type": "boolean" },
            "kanallar": { "type": "array", "items": { "type": "string", "enum": ["eposta", "sms", "uygulama"] } }
          }
        },
        "TEDARIKCI": {
          "type": "object",
          "properties": {
            "aktif": { "type": "boolean" },
            "kanallar": { "type": "array", "items": { "type": "string", "enum": ["eposta", "sms", "uygulama"] } }
          }
        },
        "SISTEM": {
          "type": "object",
          "properties": {
            "aktif": { "type": "boolean" },
            "kanallar": { "type": "array", "items": { "type": "string", "enum": ["eposta", "sms", "uygulama"] } }
          }
        },
        "ONAY": {
          "type": "object",
          "properties": {
            "aktif": { "type": "boolean" },
            "kanallar": { "type": "array", "items": { "type": "string", "enum": ["eposta", "sms", "uygulama"] } }
          }
        },
        "GUVENLIK": {
          "type": "object",
          "properties": {
            "aktif": { "type": "boolean" },
            "kanallar": { "type": "array", "items": { "type": "string", "enum": ["eposta", "sms", "uygulama"] } }
          }
        }
      }
    },
    "sessiz_mod": {
      "type": "object",
      "description": "Geçici sessiz mod (tatil, toplantı vb.)",
      "properties": {
        "aktif": { "type": "boolean", "default": false },
        "baslangic": { "type": "string", "format": "date-time", "nullable": true },
        "bitis": { "type": "string", "format": "date-time", "nullable": true },
        "aciklama": { "type": "string", "nullable": true }
      }
    },
    "dil": {
      "type": "string",
      "enum": ["tr", "en"],
      "default": "tr",
      "description": "Bildirim dili"
    }
  }
}
```

### 3.3 Varsayılan Değerler (Yeni Kullanıcı)

```json
{
  "kanal_ayarlari": {
    "eposta": { "aktif": true },
    "sms": { "aktif": false },
    "uygulama": { "aktif": true, "bildirim_sesi": true, "titreşim": true }
  },
  "oncelik_filtresi": {
    "eposta": ["KRITIK", "YUKSEK", "NORMAL"],
    "sms": ["ACIL", "KRITIK"],
    "uygulama": ["ACIL", "KRITIK", "YUKSEK", "NORMAL"]
  },
  "bildirim_saatleri": {
    "aktif": false,
    "baslangic": "08:00",
    "bitis": "18:00",
    "hafta_sonu_aktif": false,
    "ayrili_gunler": []
  },
  "gruplandirma": {
    "tur": "ANLIK",
    "aralik_dakika": 60,
    "eposta_ozet_saati": "09:00"
  },
  "kategori_ayarlari": {
    "STOK": { "aktif": true, "kanallar": ["eposta", "uygulama"] },
    "URETIM": { "aktif": true, "kanallar": ["uygulama"] },
    "TEDARIKCI": { "aktif": true, "kanallar": ["eposta", "uygulama"] },
    "SISTEM": { "aktif": true, "kanallar": ["eposta", "uygulama"] },
    "ONAY": { "aktif": true, "kanallar": ["uygulama"] },
    "GUVENLIK": { "aktif": true, "kanallar": ["eposta", "sms", "uygulama"] }
  },
  "sessiz_mod": {
    "aktif": false
  },
  "dil": "tr"
}
```

### 3.4 Tercih Okuma/Yazama Kuralları

```
OKUMA:
- Tercih alanı NULL ise varsayılan değerler uygulanır (no-fiil prensibi)
- Eksik JSONB alanları için üst seviye varsayılan kullanılır

YAZMA:
- Kısmi güncelleme desteklenir (sadece değişen alanlar gönderilir)
- JSONB Merge Patch (RFC 7396) uygulanır
- sunucu_tarafı: bildirim_saatleri.baslangic/bitis timezone-aware olmalı

VALİDASYON:
- E-posta adresi format kontrolü
- SMS numarası E.164 format kontrolü
- Saat değerleri 00:00-23:59 arasında olmalı
```

---

## 4. Bildirim Gönderim API'si (Internal Gateway)

### 4.1 Veritabanı Tabloları

```sql
-- Bildirimler Tablosu
CREATE TABLE bildirimler (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ref_id              UUID,                              -- Tetikleyen kaynağa referans
    ref_turu            VARCHAR(50),                      -- 'stok', 'uretim', 'tedarikci', vb.
    kod                 VARCHAR(50) NOT NULL REFERENCES bildirim_sablonlari(kod),
    baslik              VARCHAR(255) NOT NULL,
    icerik              TEXT NOT NULL,
    oncelik             VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    gonderim_durumu     VARCHAR(20) NOT NULL DEFAULT 'HAZIR',
    okundu              BOOLEAN DEFAULT FALSE,
    okunma_tarihi       TIMESTAMP,
    kullanici_id        UUID NOT NULL REFERENCES kullanicilar(id),
    olusturma_tarihi    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gonderim_tarihi     TIMESTAMP,
    gonderim_hatasi     TEXT
);

-- Bildirim Gönderim Durumu Tablosu
CREATE TABLE bildirim_gonderimleri (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bildirim_id         UUID NOT NULL REFERENCES bildirimler(id),
    kanal               VARCHAR(20) NOT NULL,              -- 'EPOSTA', 'SMS', 'UYGULAMA'
    durum               VARCHAR(20) NOT NULL DEFAULT 'BEKLIYOR',  -- BEKLIYOR, GONDERILIYOR, BASARILI, BASARISIZ
    deneme_sayisi       INTEGER DEFAULT 0,
    son_deneme          TIMESTAMP,
    son_hata            TEXT,
    harici_bildirim_id  VARCHAR(255),                     -- E-posta/SMS servisinden dönen ID
    gonderim_tarihi     TIMESTAMP,
    teslim_tarihi       TIMESTAMP,
   CONSTRAINT bildirim_gonderimleri_bildirim_id_fkey
        FOREIGN KEY (bildirim_id) REFERENCES bildirimler(id) ON DELETE CASCADE
);

-- Gönderim durumu enum
CREATE TYPE gonderim_durumu AS ENUM (
    'BEKLIYOR',
    'GONDERILIYOR',
    'BASARILI',
    'BASARISIZ',
    'IPTAL_EDILDI'
);

CREATE INDEX idx_bildirimler_kullanici ON bildirimler(kullanici_id, okundu);
CREATE INDEX idx_bildirimler_ref ON bildirimler(ref_turu, ref_id);
CREATE INDEX idx_bildirimler_olusturma ON bildirimler(olusturma_tarihi DESC);
CREATE INDEX idx_bildirim_gonderimleri_bildirim ON bildirim_gonderimleri(bildirim_id, kanal);
```

### 4.2 Internal API: Bildirim Gönderim Servisi

```
Servis Sınıfı: BildirimServisi
Dil: TypeScript / Node.js
Konum: src/services/BildirimServisi.ts
```

#### 4.2.1 Bildirim Gönderimi (Main Entry)

```typescript
// GÖVDE: BildirimGonderRequest
interface BildirimGonderRequest {
  refId?: string;           // Tetikleyen entity ID (stok_id, uretim_id, vb.)
  refTuru?: string;         // 'stok', 'uretim', 'tedarikci', 'sistem'
  kod: string;              // Template kodu: 'STOK_KRITIK', 'LOT_SK_TARIHI', vb.
  degiskenler: Record<string, string>;  // Template değişkenleri
  oncelik?: OncelikSeviyesi;
  hedefKullaniciId: string; // Alıcı kullanıcı UUID
  kanallar?: string[];      // Belirtilmezse kullanıcı tercihlerinden çekilir
  zamanlanmisTarih?: Date;  // Opsiyonel: gelecekte gönder
}

// DÖNÜŞ: BildirimGonderResponse
interface BildirimGonderResponse {
  bildirimId: string;
  gonderimler: {
    kanal: string;
    durum: string;
    gonderimId?: string;
  }[];
  gonderimDurumu: 'BASARILI' | 'KISMEN_BASARILI' | 'BASARISIZ';
}
```

#### 4.2.2 Servis Metodları

```
1. bildirimGonder(request: BildirimGonderRequest): Promise<BildirimGonderResponse>
   --------------------------------------------------------------
   1.1  Template'yi veritabanından kod ile çek
   1.2  Template değişkenlerini işle (placeholder replacement)
   1.3  Başlık ve içerik oluştur
   1.4  Kullanıcı bildirim tercihlerini JSONB'den çek
   1.5  Kanal listesini belirle (request.kanallar ?? tercihler)
   1.6  Öncelik + kanal filtrelemesi uygula
   1.7  Bildirim saatleri kontrolü → mesai dışı ise ertele veya atla
   1.8  Sessiz mod kontrolü → aktif ise uygulama bildirimini sessize al
   1.9  Gruplandırma kontrolü → OZET ise mevcut özet grubuna ekle
   1.10 bildirimler tablosuna kaydet (durum: HAZIR)
   1.11 bildirim_gonderimleri tablosuna her kanal için kayıt oluştur
   1.12 Kanal adapter'larını çağır (e-posta, SMS, uygulama)
   1.13 Dönüş: bildirimId + gönderim sonuçları

2. bildirimleriGetir(kullaniciId: string, filtre?: BildirimFiltre): Promise<BildirimListResponse>
   --------------------------------------------------------------
   filtre: { okundu?: boolean, oncelik?: string, tarihAraligi?: {...}, limit?: number, offset?: number }

3. bildirimiOku(bildirimId: string, kullaniciId: string): Promise<void>
   --------------------------------------------------------------
   - okundu = true, okunma_tarihi = now

4. bildirimleriTopluOkunduIsaretle(kullaniciId: string, bildirimIds?: string[]): Promise<void>
   --------------------------------------------------------------
   - IDs verilirse sadece onlar, verilmezse tümü

5. bildirimTercihleriniGetir(kullaniciId: string): Promise<BildirimTercihleri>
6. bildirimTercihleriniGuncelle(kullaniciId: string, tercihler: KismiTercihler): Promise<void>
```

#### 4.2.3 Akış Diyagramı (Metin)

```
[İş Katmanı Tetikler]
       │
       ▼
[BildirimServisi.bildirimGonder()]
       │
       ▼
┌─ Template Çek ──────────────────────────┐
│  bildirim_sablonlari tablosu           │
│  ❌ Bulunamazsa → Hata fırlat           │
└────────────────────────────────────────┘
       │
       ▼
┌─ Değişken İşleme ──────────────────────┐
│  {urun_adi} → "Ayşe Finem Kahvaltılık" │
│  XSS koruması (htmlEncode)             │
└────────────────────────────────────────┘
       │
       ▼
┌─ Tercih Kontrolü ──────────────────────┐
│  kullanicilar.bildirim_tercihleri      │
│  Kanal filtresi (öncelik + kategori)  │
│  Bildirim saati uygun mu?             │
└────────────────────────────────────────┘
       │
       ├─── Saat dışı ───→ [Zamanlayıcı Kuyruğa Ekle] ──(ileri aşama)──┐
       │                                                                  │
       ▼                                                                  │
┌─ Gruplandırma Kontrolü ─────┐                                          │
│  gruplandirma.tur == OZET?  │                                          │
│  → Mevcut özet grubuna ekle │                                          │
└─────────────────────────────┘                                          │
       │                                                                  │
       ▼                                                                  ▼
┌─ Veritabanı Kayıt ──────────────────────┐              ┌─ Kanal Adapter ───────────────┐
│  bildirimler (durum: HAZIR)            │              │  EpostaAdapter.saniyeGonder()  │
│  bildirim_gonderimleri (her kanal)     │              │  SMSAdapter.gonder()           │
└─────────────────────────────────────────┘              │  UygulamaAdapter.gonder()      │
       │                                            └─────────────────────────────────────┘
       ▼                                                      │
┌─ Async Gönderim (Kuyruk) ───────────────┐                   │
│  BildirimKuyrukServisi                  │                   │
│  → Kanal adapter'ları async çağır      │                   │
│  → Retry mekanizması (3 deneme, exp.)   │                   │
│  → Harici ID'yi bildirim_gonderimleri' │                   │
│    ne kaydet                            │                   │
└─────────────────────────────────────────┘                   │
                                                                │
       ◄────────────────────────────────────────────────────────┘
```

### 4.3 Kanal Adapter Arayüzü

```typescript
interface BildirimAdapter {
  readonly kanal: 'EPOSTA' | 'SMS' | 'UYGULAMA';

  gonder(bildirim: {
    aliciAdres: string;   // E-posta, telefon, veya push token
    baslik: string;
    icerik: string;       // HTML veya düz metin
    öncelik: string;
    hariciBildirimId?: string;
  }): Promise<{
    basarili: boolean;
    hariciId?: string;
    hata?: string;
  }>;
}

// Adapter Implementations
// EpostaAdapter → Nodemailer / SendGrid
// SMSAdapter → Netgsm, İleti Merkezi, Twilio
// UygulamaAdapter → WebSocket + PWA Push
```

### 4.4 Retry Mekanizması

```
Exponential Backoff:
  Deneme 1: 0 sn gecikme
  Deneme 2: 30 sn gecikme
  Deneme 3: 120 sn gecikme
  Deneme 4: 300 sn gecikme (opsiyonel)

Sonuç:
  3 deneme sonrası hâlâ başarısız → durum = BASARISIZ
  Bildirim kaydında gonderim_hatasi alanı güncellenir
  Kullanıcıya uygulama içi bildirim olarak "Gönderilemedi" gösterilir
```

---

## 5. E-posta / SMS Entegrasyon Notları

### 5.1 E-posta Entegrasyonu

**Öncelikli Sağlayıcı:** SendGrid API (esneklik ve Türkiye uyumu açısından)

```
ENV değişkenleri:
  EMAIL_PROVIDER=sendgrid          # veya 'smtp', 'mailgun'
  SENDGRID_API_KEY=SG.xxxxxx
  EMAIL_FROM_ADRES=noreply@bal-erp.com
  EMAIL_FROM_ISIM=Bal ERP Sistemi
  EMAIL_REPLY_TO=destek@bal-erp.com
```

**SMTP Fallback (alternatif):**
```
  SMTP_HOST=smtp.example.com
  SMTP_PORT=587
  SMTP_SECURE=false
  SMTP_USER=user
  SMTP_PASS=pass
```

**E-posta Şablon Entegrasyonu:**
```
- SendGrid Dynamic Templates kullanılabilir (Handlebars syntax)
- Veya: kendi bildirim_sablonlari tablosu üzerinden işlenmiş HTML gönderilir
- Her e-postada footer: "{sistem_adi} • Bu e-posta {kullanici_ad} için gönderilmiştir."
- Gönderim adedi sınırları: SendGrid free tier = 100/day
```

**SPF/DKIM/DMARC:**
```
- SPF: v=spf1 include:sendgrid.net ~all
- DKIM: SendGrid üzerinden otomatik
- DMARC: başlangıçta relaxed (quarantine), sonra strict'e geçiş
```

### 5.2 SMS Entegrasyonu

**Öncelikli Sağlayıcı:** Netgsm (Türkiye local desteği)

```
ENV değişkenleri:
  SMS_PROVIDER=netgsm                  # veya 'iletimerkezi', 'twilio'
  NETGSM_USER=usernames
  NETGSM_PASS=password
  NETGSM_SENDER=0850XXXXXXX            # Onaylı başlık
  SMS_API_URL=https://www.netgsm.com.tr/xmlapi/
```

**Mesaj Format Kuralları:**
```
- Tek SMS: 160 karakter (GSM-7) / 70 karakter (Unicode/Türkçe)
- Çoklu SMS: 153 karakter/mesaj (GSM-7)
- Türkçe karakterler Unicode sayılır → dikkat
- Kısa URL kullanılmalı (bit.ly vb.) uzun link karakter yer
```

**Alıcı Doğrulama:**
```
- Türkiye numaraları: E.164 formatı zorunlu
  → +905321234567 (başında + ile)
- Doğrulama: kullanicilar.telefon alanı doğrulanmış olmalı
  (SMS ile OTP gönderilerek doğrulama)
```

### 5.3 Webhook Entegrasyonu (Sistem Dışı)

```
Kullanım senaryosu:
  - Slack kanallarına bildirim
  - PagerDuty / Opsgenie: acil sistem uyarıları
  - Harici ERP sistemleri: tedarikçi bildirimleri

ENV:
  WEBHOOK_URL_SLACK=https://hooks.slack.com/services/XXX
  WEBHOOK_URL_PAGERDUTY=https://events.pagerduty.com/v2/enqueue

Webhook payload (örnek - Slack):
{
  "channel": "#erp-alerts",
  "username": "Bal ERP Bildirim",
  "icon_emoji": ":warning:",
  "attachments": [{
    "color": "#DC2626",
    "title": "{baslik}",
    "text": "{icerik}",
    "footer": "Bal ERP • {tarih}"
  }]
}
```

### 5.4 Uygulama İçi Bildirim (PWA/WebSocket)

```
Teknik:
  - WebSocket (src/lib/websocket.ts) ile gerçek zamanlı gönderim
  - PWA Service Worker + Push API (tarayıcı bildirimi izni gerekli)
  - Token-based: FCM (Firebase Cloud Messaging) veya
    kendi WebSocket server (Socket.io / ws)

Push Notification:
  - Sadece KRITIK ve ACIL öncelikliler için tarayıcı push
  - Kullanıcı tarayıcıda "bildirim izni" vermiş olmalı
  - Service Worker kayıtlı olmalı
```

### 5.5 Entegrasyon Sıralaması (Öncelik)

```
Aşama 1 — Minimum (MVP):
  ✅ Uygulama içi bildirimler (veritabanı tablosu + API + frontend polling)
  ✅ Bildirim tercihleri veritabanı kaydı
  ✅ Bildirim template sistemi (veritabanı + işleme)

Aşama 2 — E-posta:
  ✅ E-posta gönderimi (SMTP veya SendGrid)
  ✅ E-posta ile bildirim tercihleri entegrasyonu

Aşama 3 — SMS:
  ⚠️ SMS gönderimi (Netgsm veya alternatif)
  ⚠️ Telefon doğrulama (OTP)

Aşama 4 — İleri:
  ⚠️ Webhook / Slack entegrasyonu
  ⚠️ PWA Push Notifications
  ⚠️ Günlük/Haftalık e-posta özeti
  ⚠️ Bildirim zamanlama (mesai dışı erteleme)
  ⚠️ Bildirim gruplandırma (saatlik özet)
```

---

## 6. İlgili Mevcut Tanımlar (Referans)

### 6.1 SRS'deki Mevcut Bildirim Sistemi Bölümü (Bölüm 10)

SRS'de (satır 1786–1812) aşağıdaki bölümler mevcut:

- **10.1 Bildirim Türleri:** Tür/Kanal/Açıklama tablosu (5 satır)
- **10.2 Bildirim Kanalları:** Uygulama İçi, E-posta, SMS, Webhook
- **10.3 Bildirim Tercihleri:** Kullanıcı bazlı tercihler, saat kısıtlaması, gruplandırma (madde listesi)
- **10.4 Bildirim Şablonları:** Template/Değişken/Açıklama tablosu (5 satır)

Bu doküman, mevcut bölüm 10'un üzerine detay ekleyerek tam kapsamlı bir teknik tasarım sunar.

### 6.2 DB Design'daki Mevcut Alan

```sql
-- kullanicilar tablosu
bildirim_tercihleri JSONB  -- (P2) E-posta, SMS, uygulama bildirim tercihleri
telefon VARCHAR(20)         -- (P2) Kullanıcı telefonu (bildirimler için)
```

Bu alanlar mevcut olup; bu doküman `bildirim_tercihleri` JSONB şemasını ve kullanımını tam olarak tanımlar.

---

## 7. Açık Noktalar ve İleri Aşama Notları

```
1. Bildirim zamanlama: şu an anlık gönderim var; mesai-dışı erteleme
   ve crontab/ZamanlanmisGorev tablosu ileri aşamada eklenmeli.

2. Özet bildirimler: gruplandırma tablosu (bildirim_ozet_gruplari) ve
   periyodik özet oluşturucu (her saat veya günlük) ileri aşamada.

3. Bildirim okunma webhook: harici sistemlere okundu bilgisi
   (opsiyonel — geri çağırma senaryosu için).

4. Çoklu dil desteği: bildirim_sablonlari'nda dil kolonu eklenerek
   her template'in tr/en versiyonu saklanabilir.

5. Toplu bildirim: aynı bildirimi birden fazla kullanıcıya gönderme
   (ör: tüm yöneticilere sistem hatası) → toplu_gonderim_id ile grupla.
```

---

*Bu doküman, 1.2.2 Bildirim Sistemi Detaysız GAP maddesini detaylandırır. Mevcut SRS Bölüm 10 ve DB Design bildirim_tercihleri JSONB alanı üzerine inşa edilmiştir.*
