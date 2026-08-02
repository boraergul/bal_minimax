import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Download,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Warehouse,
  Grid3X3,
  PieChart,
  Activity
} from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDate, formatNumber, getKategoriLabel } from '@/lib/utils'

// Types
interface StokDegerItem {
  urun_id: string
  urun_ad: string
  kategori: string
  toplam_miktar: number
  birim: string
  birim_fiyat: number
  toplam_deger: number
}

interface YaslandirmaItem {
  bucket: string // 0-30 | 31-60 | 61-90 | 91+
  bucket_label: string
  lot_sayisi: number
  toplam_miktar: number
  oran: number
}

interface FireAnalizItem {
  uretim_id: string
  uretim_no: string
  tarih: string
  urun_ad: string
  planlanan_miktar: number
  gerceklesen_miktar: number
  fire_miktari: number
  fire_orani: number
  beklenen_fire_orani: number
}

interface KaliteOzetItem {
  ay: string
  yil: number
  kabul: number
  ret: number
  kismen_kabul: number
  toplam: number
  kabul_orani: number
}

interface DepoDolulukItem {
  depo_id: string
  depo_ad: string
  depo_kod: string
  kapasite: number
  dolu_alan: number
  doluluk_orani: number
  bloklar?: {
    blok_id: string
    blok_ad: string
    kapasite: number
    dolu_alan: number
    doluluk_orani: number
  }[]
}

export function RaporlarGenisletilmisPage() {
  const [dateRange, setDateRange] = useState<string>('this_month')
  const [selectedDepo, setSelectedDepo] = useState<string>('all')

  // Fetch Stok Deger
  const { data: stokDegerData, isLoading: loadingStokDeger } = useQuery({
    queryKey: ['stok-deger-raporu'],
    queryFn: async () => {
      const response = await api.get('/raporlar/stok/deger')
      return response.data
    },
  })

  // Fetch Yaslandirma
  const { data: yaslandirmaData, isLoading: loadingYaslandirma } = useQuery({
    queryKey: ['stok-yaslandirma'],
    queryFn: async () => {
      const response = await api.get('/raporlar/stok/yaslandirma')
      return response.data
    },
  })

  // Fetch Fire Analiz
  const { data: fireAnalizData, isLoading: loadingFireAnaliz } = useQuery({
    queryKey: ['fire-analiz', dateRange],
    queryFn: async () => {
      const response = await api.get('/raporlar/uretim/fire-analiz', {
        params: { tarih_araligi: dateRange },
      })
      return response.data
    },
  })

  // Fetch Kalite Ozet
  const { data: kaliteOzetData, isLoading: loadingKaliteOzet } = useQuery({
    queryKey: ['kalite-ozet', dateRange],
    queryFn: async () => {
      const response = await api.get('/raporlar/kalite/ozet', {
        params: { tarih_araligi: dateRange },
      })
      return response.data
    },
  })

  // Fetch Depo Doluluk
  const { data: depoDolulukData, isLoading: loadingDepoDoluluk } = useQuery({
    queryKey: ['depo-doluluk', selectedDepo],
    queryFn: async () => {
      const response = await api.get('/raporlar/depo/doluluk', {
        params: selectedDepo !== 'all' ? { depo_id: selectedDepo } : {},
      })
      return response.data
    },
  })

  const stokDegerleri: StokDegerItem[] = stokDegerData?.data || []
  const yaslandirma: YaslandirmaItem[] = yaslandirmaData?.data || []
  const fireAnalizleri: FireAnalizItem[] = fireAnalizData?.data || []
  const kaliteOzet: KaliteOzetItem[] = kaliteOzetData?.data || []
  const depoDoluluk: DepoDolulukItem[] = depoDolulukData?.data || []

  // Calculate totals
  const toplamStokDeger = stokDegerleri.reduce((acc, item) => acc + item.toplam_deger, 0)
  const toplamFire = fireAnalizleri.reduce((acc, item) => acc + item.fire_miktari, 0)
  const ortalamaFireOrani = fireAnalizleri.length > 0
    ? fireAnalizleri.reduce((acc, item) => acc + item.fire_orani, 0) / fireAnalizleri.length
    : 0

  // Group by category
  const kategoriGruplari = stokDegerleri.reduce((acc, item) => {
    const kategori = item.kategori || 'DIGER'
    if (!acc[kategori]) {
      acc[kategori] = { toplam_miktar: 0, toplam_deger: 0 }
    }
    acc[kategori].toplam_miktar += item.toplam_miktar
    acc[kategori].toplam_deger += item.toplam_deger
    return acc
  }, {} as Record<string, { toplam_miktar: number; toplam_deger: number }>)

  // Risk lots (expiring within 30 days)
  const riskliLotlar = yaslandirma.find((y) => y.bucket === '0-30')

  const exportExcel = (type: string) => {
    window.open(`/api/v1/raporlar/${type}/export/excel`, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Genişletilmiş Raporlar
          </h2>
          <p className="text-sm text-secondary">
            Stok, kalite ve depo analizleri
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">Bu Ay</SelectItem>
              <SelectItem value="last_month">Geçen Ay</SelectItem>
              <SelectItem value="this_quarter">Bu Çeyrek</SelectItem>
              <SelectItem value="this_year">Bu Yıl</SelectItem>
              <SelectItem value="all">Tüm Zamanlar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="deger" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deger">Stok Değeri</TabsTrigger>
          <TabsTrigger value="yaslandirma">Yaşlandırma</TabsTrigger>
          <TabsTrigger value="fire">Fire Analizi</TabsTrigger>
          <TabsTrigger value="kalite">Kalite Özeti</TabsTrigger>
          <TabsTrigger value="doluluk">Depo Doluluk</TabsTrigger>
        </TabsList>

        {/* Stok Deger Tab */}
        <TabsContent value="deger" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-secondary">Toplam Stok Değeri</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(toplamStokDeger)}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-secondary">Ürün Çeşidi</p>
                    <p className="text-2xl font-bold mt-1">{stokDegerleri.length}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Grid3X3 className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-secondary">Toplam Miktar</p>
                    <p className="text-2xl font-bold mt-1">
                      {formatNumber(stokDegerleri.reduce((acc, i) => acc + i.toplam_miktar, 0), 0)} birim
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* By Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Kategori Dağılımı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(kategoriGruplari)
                    .sort((a, b) => b[1].toplam_deger - a[1].toplam_deger)
                    .map(([kategori, data]) => (
                      <div key={kategori} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{getKategoriLabel(kategori)}</span>
                          <span className="text-secondary">{formatCurrency(data.toplam_deger)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{
                              width: `${(data.toplam_deger / toplamStokDeger) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Ürün Bazlı Stok Değeri</CardTitle>
                <Button variant="outline" size="sm" onClick={() => exportExcel('stok-deger')}>
                  <Download className="h-4 w-4 mr-2" />
                  Excel
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">Ürün</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Kategori</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Miktar</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Birim Fiyat</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Toplam Değer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingStokDeger ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          </td>
                        </tr>
                      ) : stokDegerleri.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-secondary">
                            Stok verisi bulunamadı
                          </td>
                        </tr>
                      ) : (
                        stokDegerleri.map((item) => (
                          <tr key={item.urun_id} className="border-b hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium">{item.urun_ad}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">{getKategoriLabel(item.kategori)}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatNumber(item.toplam_miktar, 0)} {item.birim}
                            </td>
                            <td className="px-4 py-3 text-right">{formatCurrency(item.birim_fiyat)}</td>
                            <td className="px-4 py-3 text-right font-semibold">
                              {formatCurrency(item.toplam_deger)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Yaslandirma Tab */}
        <TabsContent value="yaslandirma" className="space-y-4">
          {/* Risk Alert */}
          {riskliLotlar && riskliLotlar.lot_sayisi > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                  <div>
                    <p className="font-medium text-red-800">
                      Kritik: {riskliLotlar.lot_sayisi} lot {riskliLotlar.bucket_label} gün içinde son kullanma tarihine ulaşıyor
                    </p>
                    <p className="text-sm text-red-600">
                      Toplam {formatNumber(riskliLotlar.toplam_miktar, 0)} birim ürün risk altında
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chart */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  SKT Yaşlandırma Grafiği
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {yaslandirma.map((item) => {
                    const isRisk = item.bucket === '0-30' || item.bucket === '31-60'
                    return (
                      <div key={item.bucket} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className={isRisk ? 'text-red-600 font-medium' : ''}>
                            {item.bucket_label}
                          </span>
                          <span className={isRisk ? 'text-red-600 font-semibold' : 'text-secondary'}>
                            {item.lot_sayisi} lot | {formatNumber(item.toplam_miktar, 0)} birim
                          </span>
                        </div>
                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              item.bucket === '0-30'
                                ? 'bg-red-500'
                                : item.bucket === '31-60'
                                  ? 'bg-orange-500'
                                  : item.bucket === '61-90'
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                            }`}
                            style={{ width: `${item.oran}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk Durumu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      <span className="text-sm">Kritik (0-30 gün)</span>
                    </div>
                    <Badge className="bg-red-100 text-red-800">
                      {riskliLotlar?.lot_sayisi || 0} lot
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full" />
                      <span className="text-sm">Yaklaşan (31-60 gün)</span>
                    </div>
                    <Badge className="bg-orange-100 text-orange-800">
                      {yaslandirma.find((y) => y.bucket === '31-60')?.lot_sayisi || 0} lot
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                      <span className="text-sm">Orta (61-90 gün)</span>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {yaslandirma.find((y) => y.bucket === '61-90')?.lot_sayisi || 0} lot
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <span className="text-sm">Güvenli (91+ gün)</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {yaslandirma.find((y) => y.bucket === '91+')?.lot_sayisi || 0} lot
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kritik Lotlar</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Lot No</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Ürün</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">SKT</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Kalan Gün</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Miktar</th>
                  </tr>
                </thead>
                <tbody>
                  {riskliLotlar && riskliLotlar.lot_sayisi > 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-secondary">
                        Detaylı lot listesi için SKT Yönetimi sayfasını ziyaret edin
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-secondary">
                        Kritik lot bulunmuyor
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fire Analizi Tab */}
        <TabsContent value="fire" className="space-y-4">
          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-secondary">Toplam Fire</p>
                <p className="text-2xl font-bold mt-1">{formatNumber(toplamFire, 2)} birim</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-secondary">Ortalama Fire Oranı</p>
                <p className="text-2xl font-bold mt-1">{formatNumber(ortalamaFireOrani, 2)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-secondary">Üretim Sayısı</p>
                <p className="text-2xl font-bold mt-1">{fireAnalizleri.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-secondary">Fire Maliyeti</p>
                <p className="text-2xl font-bold mt-1 text-red-600">
                  {formatCurrency(toplamFire * 50)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Fire Analiz Detay</CardTitle>
              <Button variant="outline" size="sm" onClick={() => exportExcel('fire-analiz')}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Üretim No</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tarih</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Ürün</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Planlanan</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Gerçekleşen</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Fire</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Fire %</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingFireAnaliz ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      </td>
                    </tr>
                  ) : fireAnalizleri.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-secondary">
                        Fire analiz verisi bulunamadı
                      </td>
                    </tr>
                  ) : (
                    fireAnalizleri.map((item) => {
                      const fireDurumu =
                        item.fire_orani > item.beklenen_fire_orani * 1.5
                          ? 'high'
                          : item.fire_orani > item.beklenen_fire_orani
                            ? 'warning'
                            : 'normal'
                      return (
                        <tr key={item.uretim_id} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono text-sm">{item.uretim_no}</td>
                          <td className="px-4 py-3">{formatDate(item.tarih)}</td>
                          <td className="px-4 py-3">{item.urun_ad}</td>
                          <td className="px-4 py-3 text-right">{formatNumber(item.planlanan_miktar, 2)}</td>
                          <td className="px-4 py-3 text-right">{formatNumber(item.gerceklesen_miktar, 2)}</td>
                          <td className="px-4 py-3 text-right">{formatNumber(item.fire_miktari, 2)}</td>
                          <td className="px-4 py-3 text-right">
                            <Badge
                              className={
                                fireDurumu === 'high'
                                  ? 'bg-red-100 text-red-800'
                                  : fireDurumu === 'warning'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                              }
                            >
                              %{formatNumber(item.fire_orani, 2)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {fireDurumu === 'high' ? (
                              <TrendingUp className="h-4 w-4 text-red-600 inline" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-green-600 inline" />
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kalite Ozeti Tab */}
        <TabsContent value="kalite" className="space-y-4">
          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-secondary">Toplam Kontrol</p>
                <p className="text-2xl font-bold mt-1">
                  {kaliteOzet.reduce((acc, i) => acc + i.toplam, 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-secondary">Ortalama Kabul Oranı</p>
                <p className="text-2xl font-bold mt-1 text-green-600">
                  {formatNumber(
                    kaliteOzet.length > 0
                      ? kaliteOzet.reduce((acc, i) => acc + i.kabul_orani, 0) / kaliteOzet.length
                      : 0,
                    1
                  )}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-secondary">Ret Oranı</p>
                <p className="text-2xl font-bold mt-1 text-red-600">
                  {formatNumber(
                    kaliteOzet.length > 0
                      ? (kaliteOzet.reduce((acc, i) => acc + i.ret, 0) /
                          kaliteOzet.reduce((acc, i) => acc + i.toplam, 0)) *
                        100
                      : 0,
                    1
                  )}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-secondary">Kısmi Kabul</p>
                <p className="text-2xl font-bold mt-1 text-yellow-600">
                  {kaliteOzet.reduce((acc, i) => acc + i.kismen_kabul, 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Kalite Kontrol Trendi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {kaliteOzet.slice(-6).map((item) => (
                    <div key={`${item.yil}-${item.ay}`} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>
                          {item.ay}/{item.yil}
                        </span>
                        <span className="text-secondary">
                          Kabul: {item.kabul} | Ret: {item.ret} | Kısmi: {item.kismen_kabul}
                        </span>
                      </div>
                      <div className="h-6 bg-gray-100 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${item.kabul_orani}%` }}
                        />
                        <div
                          className="h-full bg-yellow-500 transition-all"
                          style={{
                            width: `${((item.toplam - item.kabul - item.ret) / item.toplam) * 100}%`,
                          }}
                        />
                        <div
                          className="h-full bg-red-500 transition-all"
                          style={{ width: `${((item.ret / item.toplam) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded" />
                    <span>Kabul</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded" />
                    <span>Kısmen Kabul</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded" />
                    <span>Ret</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sonuç Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      label: 'Kabul',
                      value: kaliteOzet.reduce((acc, i) => acc + i.kabul, 0),
                      color: 'bg-green-500',
                      bgColor: 'bg-green-50',
                      icon: CheckCircle,
                    },
                    {
                      label: 'Ret',
                      value: kaliteOzet.reduce((acc, i) => acc + i.ret, 0),
                      color: 'bg-red-500',
                      bgColor: 'bg-red-50',
                      icon: AlertTriangle,
                    },
                    {
                      label: 'Kısmen Kabul',
                      value: kaliteOzet.reduce((acc, i) => acc + i.kismen_kabul, 0),
                      color: 'bg-yellow-500',
                      bgColor: 'bg-yellow-50',
                      icon: Clock,
                    },
                  ].map((item) => {
                    const Icon = item.icon
                    const total = kaliteOzet.reduce((acc, i) => acc + i.toplam, 0)
                    const percentage = total > 0 ? (item.value / total) * 100 : 0
                    return (
                      <div
                        key={item.label}
                        className={`flex items-center justify-between p-4 rounded-lg ${item.bgColor}`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`h-5 w-5 ${item.color.replace('bg-', 'text-')}`} />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">{item.value}</p>
                          <p className="text-sm text-secondary">{formatNumber(percentage, 1)}%</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Depo Doluluk Tab */}
        <TabsContent value="doluluk" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedDepo} onValueChange={setSelectedDepo}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Depo seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Depolar</SelectItem>
                {depoDoluluk.map((depo) => (
                  <SelectItem key={depo.depo_id} value={depo.depo_id}>
                    {depo.depo_ad}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => exportExcel('depo-doluluk')}>
              <Download className="h-4 w-4 mr-2" />
              Rapor İndir
            </Button>
          </div>

          {/* Depo Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loadingDepoDoluluk ? (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="p-12">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </CardContent>
              </Card>
            ) : depoDoluluk.length === 0 ? (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="p-12 text-center text-secondary">
                  Depo doluluk verisi bulunamadı
                </CardContent>
              </Card>
            ) : (
              depoDoluluk.map((depo) => {
                const dolulukRengi =
                  depo.doluluk_orani >= 90
                    ? 'text-red-600'
                    : depo.doluluk_orani >= 70
                      ? 'text-yellow-600'
                      : 'text-green-600'
                const dolulukBg =
                  depo.doluluk_orani >= 90
                    ? 'bg-red-100'
                    : depo.doluluk_orani >= 70
                      ? 'bg-yellow-100'
                      : 'bg-green-100'

                return (
                  <Card key={depo.depo_id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Warehouse className="h-5 w-5" />
                          {depo.depo_ad}
                        </span>
                        <Badge variant="outline">{depo.depo_kod}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Progress */}
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Doluluk</span>
                            <span className={`font-semibold ${dolulukRengi}`}>
                              {formatNumber(depo.doluluk_orani, 1)}%
                            </span>
                          </div>
                          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${dolulukBg.replace('bg-', 'bg-')}`}
                              style={{ width: `${Math.min(depo.doluluk_orani, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-secondary">Kapasite</p>
                            <p className="font-medium">{formatNumber(depo.kapasite, 0)} m²</p>
                          </div>
                          <div>
                            <p className="text-secondary">Kullanılan</p>
                            <p className="font-medium">{formatNumber(depo.dolu_alan, 0)} m²</p>
                          </div>
                        </div>

                        {/* Blocks */}
                        {depo.bloklar && depo.bloklar.length > 0 && (
                          <div className="border-t pt-4">
                            <p className="text-sm font-medium mb-2">Bloklar</p>
                            <div className="grid grid-cols-2 gap-2">
                              {depo.bloklar.map((blok) => (
                                <div
                                  key={blok.blok_id}
                                  className="p-2 bg-muted rounded text-xs"
                                >
                                  <div className="flex justify-between">
                                    <span>{blok.blok_ad}</span>
                                    <span className="text-secondary">
                                      {formatNumber(blok.doluluk_orani, 0)}%
                                    </span>
                                  </div>
                                  <div className="h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                                    <div
                                      className="h-full bg-primary"
                                      style={{ width: `${blok.doluluk_orani}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {/* Visual Grid */}
          {selectedDepo === 'all' && depoDoluluk.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Grid3X3 className="h-5 w-5" />
                  Depo Doluluk Karşılaştırması
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {depoDoluluk.map((depo) => {
                    const height = Math.max(50, depo.doluluk_orani * 2)
                    return (
                      <div key={depo.depo_id} className="flex flex-col items-center">
                        <div className="flex items-end">
                          <div
                            className="w-16 rounded-t transition-all"
                            style={{
                              height: `${height}px`,
                              backgroundColor:
                                depo.doluluk_orani >= 90
                                  ? '#ef4444'
                                  : depo.doluluk_orani >= 70
                                    ? '#eab308'
                                    : '#22c55e',
                            }}
                          />
                        </div>
                        <p className="text-xs mt-2 font-medium">{depo.depo_kod}</p>
                        <p className="text-xs text-secondary">
                          {formatNumber(depo.doluluk_orani, 0)}%
                        </p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
