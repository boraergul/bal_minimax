# BAL ERP - Frontend

Kurutulmuş Meyve ve Bal Yönetim Sistemi - React Frontend Uygulaması

## Teknolojiler

- **React 18** + TypeScript
- **Vite 5** - Build tool
- **TailwindCSS 3** - Styling
- **shadcn/ui** - UI bileşenleri
- **Zustand** - State management
- **TanStack Query** - Server state
- **React Router 6** - Routing
- **React Hook Form** + **Zod** - Form yönetimi
- **Lucide React** - İkonlar
- **date-fns** - Tarih formatlama
- **Axios** - HTTP client

## Kurulum

### Gereksinimler

- Node.js 18+
- npm veya yarn

### Adımlar

1. Bağımlılıkları yükleyin:

```bash
cd src/frontend
npm install
```

2. Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

3. Tarayıcıda açın: http://localhost:5173

## Proje Yapısı

```
src/
├── components/
│   ├── ui/           # Temel UI bileşenleri (Button, Input, Card, vb.)
│   └── layout/       # Layout bileşenleri (Sidebar, Header, Layout)
├── hooks/            # React Query hooks
├── lib/              # Yardımcı fonksiyonlar (API client, utils)
├── pages/            # Sayfa bileşenleri
├── stores/           # Zustand store'ları
├── types/            # TypeScript tipleri
├── App.tsx           # Ana uygulama
└── main.tsx          # Giriş noktası
```

## Sayfalar

| Sayfa | Yol | Açıklama |
|-------|-----|----------|
| Giriş | `/login` | Kimlik doğrulama |
| Dashboard | `/` | Özet bilgiler ve hızlı işlemler |
| Stok | `/stok` | Stok listesi ve yönetimi |
| Üretim | `/uretim` | Üretim emirleri |
| Satış | `/satis` | Satış kayıtları |
| Ürünler | `/urunler` | Ürün kataloğu CRUD |
| Tedarikçiler | `/tedarikciler` | Tedarikçi CRUD |
| Müşteriler | `/musteriler` | Müşteri CRUD |

## API Entegrasyonu

Backend API'si varsayılan olarak `http://localhost:8000/api/v1` adresinde çalışmalıdır.

### Ortam Değişkenleri

`.env` dosyası oluşturarak API URL'sini değiştirebilirsiniz:

```
VITE_API_URL=http://localhost:8000/api/v1
```

## Özellikler

- JWT tabanlı kimlik doğrulama
- Otomatik token yenileme
- Sayfalandırmalı listeler
- Filtreleme ve arama
- Form validasyonu
- Responsive tasarım
- Türkçe dil desteği
- FIFO stok yönetimi
- Kritik uyarılar

## Build

Üretim build'i oluşturmak için:

```bash
npm run build
```

Build çıktısı `dist/` klasöründe oluşturulur.
