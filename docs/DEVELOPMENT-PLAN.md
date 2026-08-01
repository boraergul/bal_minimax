# BAL ERP - Geliştirme Planı

**Versiyon:** 1.0  
**Tarih:** 2026-07-29  
**Durum:** Aktif Geliştirme

---

## Format Kuralları

| Alan | Format | Örnek |
|------|--------|-------|
| Tarih | `dd.MM.yyyy` | 29.07.2026 |
| Saat | `HH:mm` (24s) | 14:30 |
| Para (TL) | `₺#,##0.00` | ₺1.234,56 |
| Para (USD) | `$#,##0.00` | $123.45 |
| Sayı | Türkçe ondalık | 1.234,56 |
| UUID | lowercase | `550e8400-e29b-41d4-a716-446655440000` |

---

## Teknoloji Stack

### Backend
- **Runtime:** Python 3.11+
- **Framework:** FastAPI 0.104+
- **ORM:** SQLAlchemy 2.0 + Alembic
- **Validation:** Pydantic v2
- **Auth:** JWT (python-jose) + bcrypt
- **Database:** PostgreSQL 15

### Frontend
- **Framework:** React 18+ (Vite)
- **UI:** TailwindCSS + shadcn/ui
- **State:** Zustand + TanStack Query
- **Forms:** React Hook Form + Zod
- **Icons:** Lucide React
- **Routing:** React Router 6

### Infrastructure
- **Container:** Docker + Docker Compose
- **Cache:** Redis 7
- **File Storage:** MinIO (local) / S3 (prod)

---

## MVP Kapsamı

### Dahil Edilen
1. **Kimlik Doğrulama** - Login, JWT, RBAC (Admin, Depo, Satış)
2. **Ürün Kataloğu** - CRUD, Kategoriler (Meyve, Bal, Karışım, KuruYemiş, Sebze, Yağ, Turşu, Diğer)
3. **Tedarikçi Yönetimi** - CRUD, Temel bilgiler
4. **Müşteri Yönetimi** - CRUD, Temel bilgiler
5. **Stok Yönetimi** - Lot bazlı giriş/çıkış, FIFO, Hareket takibi
6. **Üretim** - Emir oluşturma, Hammadde→Mamul dönüşümü
7. **Satış** - Kayıt, FIFO lot seçimi, İptal/İade
8. **İzlenebilirlik** - Lot→Kaynak→Tedarikçi, Satış→Lot→Müşteri
9. **Dashboard** - Stok özeti, Kritik uyarılar

### Sonraki Fazda
- Raporlama & Analitik
- Kalite Kontrol
- Tedarikçi/Müşteri Değerlendirme
- Barkod/Etiket
- Bildirimler

---

## Geliştirme Aşamaları

### Faz 1: Altyapı
- [ ] Proje yapısı
- [ ] Docker Compose (PostgreSQL, Redis, MinIO)
- [ ] UI Tasarım sistemi
- [ ] DB migrations

### Faz 2: Backend
- [ ] Auth module
- [ ] CRUD API'leri
- [ ] Stok API + FIFO
- [ ] Üretim API
- [ ] Satış API

### Faz 3: Frontend
- [ ] Layout & Navigation
- [ ] Auth Pages
- [ ] Dashboard
- [ ] Stok Yönetimi
- [ ] Üretim Sayfaları
- [ ] Satış Sayfaları

### Faz 4: Entegrasyon
- [ ] E2E Test
- [ ] Docker Build
- [ ] Dokümantasyon

---

## UI Tasarım Prensipleri

1. **Minimalist:** Az karmaşıklık, net görünüm
2. **Consistent:** Tüm ekranlarda aynı layout yapısı
3. **Accessible:** WCAG uyumlu, temiz kontrast
4. **Responsive:** Desktop öncelikli (tablet uyumlu)

### Renk Paleti
- Primary: `#3B82F6` (Mavi)
- Secondary: `#10B981` (Yeşil - başarı/durum)
- Warning: `#F59E0B` (Turuncu)
- Error: `#EF4444` (Kırmızı)
- Background: `#FAFAFA` (Açık gri)
- Surface: `#FFFFFF`
- Text Primary: `#1F2937`
- Text Secondary: `#6B7280`

### Spacing
- Base unit: 4px
- Component padding: 16px (4 units)
- Section gap: 24px (6 units)
- Page margin: 32px (8 units)
