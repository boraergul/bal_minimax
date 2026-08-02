import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Calculator,
  Zap,
  Wrench,
  Users,
  FileText,
  PieChart,
  BarChart3,
  Calendar
} from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils'

// Types
interface MaliyetOzet {
  uretim_id: string
  uretim_no: string
  tarih: string
  urun_ad: string
  toplam_hammadde: number
  toplam_iscilik: number
  toplam_enerji: number
  toplam_bakim: number
  toplam_genel_gider: number
  toplam_maliyet: number
  birim_maliyet: number | null
  birim: string
}

interface IscilikGiris {
  id?: string
  uretim_id: string
  personel_id: string
  personel_ad: string
  saat: number
  birim_ucret: number
  tutar: number
  tarih: string
  aciklama?: string
}

interface EnerjiGiris {
  id?: string
  uretim_id: string
  enerji_tipi: 'ELEKTRIK' | 'DOGALGAZ' | 'SU'
  tuketim_miktari: number
  birim_fiyat: number
  tutar: number
  tarih: string
  aciklama?: string
}

interface BakimGiris {
  id?: string
  uretim_id: string
  bakim_tipi: string
  bakim_aciklamasi: string
  tutar: number
  tarih: string
}

interface GenelGiderGiris {
  id?: string
  uretim_id: string
  gider_tipi: string
  aciklama: string
  tutar: number
  tarih: string
}

export function UretimMaliyetPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('ozet')
  const [selectedUretim, setSelectedUretim] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<string>('')
  
  // Dialog states
  const [iscilikDialogOpen, setIscilikDialogOpen] = useState(false)
  const [enerjiDialogOpen, setEnerjiDialogOpen] = useState(false)
  const [bakimDialogOpen, setBakimDialogOpen] = useState(false)
  const [genelGiderDialogOpen, setGenelGiderDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)

  // Fetch Maliyet List
  const { data: maliyetData, isLoading } = useQuery({
    queryKey: ['uretim-maliyet-listesi', dateFilter],
    queryFn: async () => {
      const params: any = {}
      if (dateFilter) params.tarih = dateFilter
      const response = await api.get('/uretim/maliyet', { params })
      return response.data
    },
  })

  // Fetch single uretim maliyet
  const { data: detayliMaliyet } = useQuery({
    queryKey: ['uretim-maliyet-detay', selectedUretim],
    queryFn: async () => {
      const response = await api.get(`/uretim/maliyet/emir/${selectedUretim}`)
      return response.data
    },
    enabled: !!selectedUretim,
  })

  // Mutations
  const addIscilik = useMutation({
    mutationFn: async (data: IscilikGiris) => {
      const response = await api.post(`/uretim/maliyet/emir/${data.uretim_id}/iscilik`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uretim-maliyet'] })
      setIscilikDialogOpen(false)
    },
  })

  const addEnerji = useMutation({
    mutationFn: async (data: EnerjiGiris) => {
      const response = await api.post(`/uretim/maliyet/emir/${data.uretim_id}/enerji`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uretim-maliyet'] })
      setEnerjiDialogOpen(false)
    },
  })

  const addBakim = useMutation({
    mutationFn: async (data: BakimGiris) => {
      const response = await api.post(`/uretim/maliyet/emir/${data.uretim_id}/bakim`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uretim-maliyet'] })
      setBakimDialogOpen(false)
    },
  })

  const addGenelGider = useMutation({
    mutationFn: async (data: GenelGiderGiris) => {
      const response = await api.post(`/uretim/maliyet/emir/${data.uretim_id}/genel-gider`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uretim-maliyet'] })
      setGenelGiderDialogOpen(false)
    },
  })

  const maliyetler: MaliyetOzet[] = maliyetData?.data || []
  const toplamMaliyet = maliyetler.reduce((acc, m) => acc + m.toplam_maliyet, 0)

  // Calculate cost breakdown
  const maliyetBreakdown = {
    hammadde: maliyetler.reduce((acc, m) => acc + m.toplam_hammadde, 0),
    iscilik: maliyetler.reduce((acc, m) => acc + m.toplam_iscilik, 0),
    enerji: maliyetler.reduce((acc, m) => acc + m.toplam_enerji, 0),
    bakim: maliyetler.reduce((acc, m) => acc + m.toplam_bakim, 0),
    genelGider: maliyetler.reduce((acc, m) => acc + m.toplam_genel_gider, 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Üretim Maliyet Analizi
          </h2>
          <p className="text-sm text-secondary">
            Üretim maliyetlerinin detaylı analizi ve raporlanması
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard
          title="Toplam Maliyet"
          value={formatCurrency(toplamMaliyet)}
          icon={DollarSign}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatCard
          title="Hammadde"
          value={formatCurrency(maliyetBreakdown.hammadde)}
          icon={PieChart}
          color="text-orange-600"
          bgColor="bg-orange-100"
          percentage={toplamMaliyet > 0 ? ((maliyetBreakdown.hammadde / toplamMaliyet) * 100).toFixed(1) + '%' : '0%'}
        />
        <StatCard
          title="İşçilik"
          value={formatCurrency(maliyetBreakdown.iscilik)}
          icon={Users}
          color="text-purple-600"
          bgColor="bg-purple-100"
          percentage={toplamMaliyet > 0 ? ((maliyetBreakdown.iscilik / toplamMaliyet) * 100).toFixed(1) + '%' : '0%'}
        />
        <StatCard
          title="Enerji"
          value={formatCurrency(maliyetBreakdown.enerji)}
          icon={Zap}
          color="text-yellow-600"
          bgColor="bg-yellow-100"
          percentage={toplamMaliyet > 0 ? ((maliyetBreakdown.enerji / toplamMaliyet) * 100).toFixed(1) + '%' : '0%'}
        />
        <StatCard
          title="Diğer"
          value={formatCurrency(maliyetBreakdown.bakim + maliyetBreakdown.genelGider)}
          icon={TrendingUp}
          color="text-green-600"
          bgColor="bg-green-100"
          percentage={toplamMaliyet > 0 ? (((maliyetBreakdown.bakim + maliyetBreakdown.genelGider) / toplamMaliyet) * 100).toFixed(1) + '%' : '0%'}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ozet">Maliyet Özeti</TabsTrigger>
          <TabsTrigger value="iscilik">İşçilik</TabsTrigger>
          <TabsTrigger value="enerji">Enerji</TabsTrigger>
          <TabsTrigger value="bakim">Bakım</TabsTrigger>
          <TabsTrigger value="genelgider">Genel Gider</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="ozet" className="space-y-4">
          {/* Cost Breakdown Chart */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Maliyet Dağılımı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'Hammadde', value: maliyetBreakdown.hammadde, color: 'bg-orange-500', percentage: toplamMaliyet > 0 ? (maliyetBreakdown.hammadde / toplamMaliyet) * 100 : 0 },
                    { label: 'İşçilik', value: maliyetBreakdown.iscilik, color: 'bg-purple-500', percentage: toplamMaliyet > 0 ? (maliyetBreakdown.iscilik / toplamMaliyet) * 100 : 0 },
                    { label: 'Enerji', value: maliyetBreakdown.enerji, color: 'bg-yellow-500', percentage: toplamMaliyet > 0 ? (maliyetBreakdown.enerji / toplamMaliyet) * 100 : 0 },
                    { label: 'Bakım', value: maliyetBreakdown.bakim, color: 'bg-blue-500', percentage: toplamMaliyet > 0 ? (maliyetBreakdown.bakim / toplamMaliyet) * 100 : 0 },
                    { label: 'Genel Gider', value: maliyetBreakdown.genelGider, color: 'bg-green-500', percentage: toplamMaliyet > 0 ? (maliyetBreakdown.genelGider / toplamMaliyet) * 100 : 0 },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.label}</span>
                        <span className="text-secondary">
                          {formatCurrency(item.value)} ({item.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} transition-all duration-500`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Üretim Bazlı Maliyet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {maliyetler.slice(0, 5).map((maliyet) => (
                    <div key={maliyet.uretim_id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{maliyet.uretim_no}</p>
                        <p className="text-xs text-secondary">{maliyet.urun_ad}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(maliyet.toplam_maliyet)}</p>
                        <p className="text-xs text-secondary">
                          {maliyet.birim_maliyet ? formatCurrency(maliyet.birim_maliyet) + '/birim' : '-'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {maliyetler.length === 0 && (
                    <p className="text-center text-secondary py-8">Henüz maliyet kaydı bulunmuyor.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Full Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Maliyet Detay Tablosu</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium">Üretim No</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Tarih</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Ürün</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Hammadde</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">İşçilik</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Enerji</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Bakım</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Genel Gider</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Toplam</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Birim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maliyetler.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-secondary">
                          Maliyet kaydı bulunamadı
                        </td>
                      </tr>
                    ) : (
                      maliyetler.map((maliyet) => (
                        <tr key={maliyet.uretim_id} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono text-sm">{maliyet.uretim_no}</td>
                          <td className="px-4 py-3">{formatDate(maliyet.tarih)}</td>
                          <td className="px-4 py-3 max-w-[200px] truncate">{maliyet.urun_ad}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(maliyet.toplam_hammadde)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(maliyet.toplam_iscilik)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(maliyet.toplam_enerji)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(maliyet.toplam_bakim)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(maliyet.toplam_genel_gider)}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatCurrency(maliyet.toplam_maliyet)}</td>
                          <td className="px-4 py-3 text-right text-secondary">{formatCurrency(maliyet.birim_maliyet || 0)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-muted/30">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 font-semibold">TOPLAM</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(maliyetBreakdown.hammadde)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(maliyetBreakdown.iscilik)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(maliyetBreakdown.enerji)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(maliyetBreakdown.bakim)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(maliyetBreakdown.genelGider)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-lg">{formatCurrency(toplamMaliyet)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Labor Tab */}
        <TabsContent value="iscilik" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                İşçilik Maliyetleri
              </CardTitle>
              <Button onClick={() => { setEditingItem(null); setIscilikDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni İşçilik Ekle
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Personel</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tarih</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Saat</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Birim Ücret</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Tutar</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Açıklama</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {detayliMaliyet?.iscilik?.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-secondary">
                        İşçilik kaydı bulunamadı
                      </td>
                    </tr>
                  )}
                  {detayliMaliyet?.iscilik?.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3">{item.personel_ad}</td>
                      <td className="px-4 py-3">{formatDate(item.tarih)}</td>
                      <td className="px-4 py-3 text-right">{item.saat} saat</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.birim_ucret)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.tutar)}</td>
                      <td className="px-4 py-3 text-secondary">{item.aciklama || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setIscilikDialogOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Energy Tab */}
        <TabsContent value="enerji" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Enerji Maliyetleri
              </CardTitle>
              <Button onClick={() => { setEditingItem(null); setEnerjiDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Enerji Ekle
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Tür</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tarih</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Tüketim</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Birim Fiyat</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Tutar</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {detayliMaliyet?.enerji?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-secondary">
                        Enerji kaydı bulunamadı
                      </td>
                    </tr>
                  )}
                  {detayliMaliyet?.enerji?.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Badge className={
                          item.enerji_tipi === 'ELEKTRIK' ? 'bg-yellow-100 text-yellow-800' :
                          item.enerji_tipi === 'DOGALGAZ' ? 'bg-blue-100 text-blue-800' :
                          'bg-cyan-100 text-cyan-800'
                        }>
                          {item.enerji_tipi}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{formatDate(item.tarih)}</td>
                      <td className="px-4 py-3 text-right">{item.tuketim_miktari}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.birim_fiyat)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.tutar)}</td>
                      <td className="px-4 py-3 text-secondary">{item.aciklama || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="bakim" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-5 w-5 text-blue-600" />
                Bakım Maliyetleri
              </CardTitle>
              <Button onClick={() => { setEditingItem(null); setBakimDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Bakım Ekle
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Tarih</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tür</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Açıklama</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {detayliMaliyet?.bakim?.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-secondary">
                        Bakım kaydı bulunamadı
                      </td>
                    </tr>
                  )}
                  {detayliMaliyet?.bakim?.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3">{formatDate(item.tarih)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{item.bakim_tipi}</Badge>
                      </td>
                      <td className="px-4 py-3">{item.bakim_aciklamasi}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.tutar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overhead Tab */}
        <TabsContent value="genelgider" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Genel Gider Dağılımı
              </CardTitle>
              <Button onClick={() => { setEditingItem(null); setGenelGiderDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Gider Ekle
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Tarih</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Gider Türü</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Açıklama</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {detayliMaliyet?.genel_gider?.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-secondary">
                        Genel gider kaydı bulunamadı
                      </td>
                    </tr>
                  )}
                  {detayliMaliyet?.genel_gider?.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3">{formatDate(item.tarih)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{item.gider_tipi}</Badge>
                      </td>
                      <td className="px-4 py-3">{item.aciklama}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.tutar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Iscilik Dialog */}
      <Dialog open={iscilikDialogOpen} onOpenChange={setIscilikDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'İşçilik Düzenle' : 'Yeni İşçilik Ekle'}</DialogTitle>
            <DialogDescription>İşçilik maliyeti giriniz.</DialogDescription>
          </DialogHeader>
          <IscilikForm
            initialData={editingItem}
            onSubmit={(data) => addIscilik.mutate({ ...data, uretim_id: selectedUretim || '' })}
            onCancel={() => setIscilikDialogOpen(false)}
            isLoading={addIscilik.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Enerji Dialog */}
      <Dialog open={enerjiDialogOpen} onOpenChange={setEnerjiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Enerji Düzenle' : 'Yeni Enerji Ekle'}</DialogTitle>
            <DialogDescription>Enerji tüketim maliyeti giriniz.</DialogDescription>
          </DialogHeader>
          <EnerjiForm
            initialData={editingItem}
            onSubmit={(data) => addEnerji.mutate({ ...data, uretim_id: selectedUretim || '' })}
            onCancel={() => setEnerjiDialogOpen(false)}
            isLoading={addEnerji.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Bakim Dialog */}
      <Dialog open={bakimDialogOpen} onOpenChange={setBakimDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Bakım Düzenle' : 'Yeni Bakım Ekle'}</DialogTitle>
            <DialogDescription>Bakım maliyeti giriniz.</DialogDescription>
          </DialogHeader>
          <BakimForm
            initialData={editingItem}
            onSubmit={(data) => addBakim.mutate({ ...data, uretim_id: selectedUretim || '' })}
            onCancel={() => setBakimDialogOpen(false)}
            isLoading={addBakim.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Genel Gider Dialog */}
      <Dialog open={genelGiderDialogOpen} onOpenChange={setGenelGiderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Genel Gider Düzenle' : 'Yeni Genel Gider Ekle'}</DialogTitle>
            <DialogDescription>Genel gider giriniz.</DialogDescription>
          </DialogHeader>
          <GenelGiderForm
            initialData={editingItem}
            onSubmit={(data) => addGenelGider.mutate({ ...data, uretim_id: selectedUretim || '' })}
            onCancel={() => setGenelGiderDialogOpen(false)}
            isLoading={addGenelGider.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper Components
function StatCard({ title, value, icon: Icon, color, bgColor, percentage }: {
  title: string
  value: string
  icon: React.ElementType
  color: string
  bgColor: string
  percentage?: string
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-secondary">{title}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
            {percentage && <p className="text-xs text-secondary mt-1">{percentage}</p>}
          </div>
          <div className={`p-3 rounded-lg ${bgColor}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function IscilikForm({ initialData, onSubmit, onCancel, isLoading }: {
  initialData?: any
  onSubmit: (data: any) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    personel_ad: initialData?.personel_ad || '',
    saat: initialData?.saat || 0,
    birim_ucret: initialData?.birim_ucret || 0,
    tarih: initialData?.tarih || new Date().toISOString().split('T')[0],
    aciklama: initialData?.aciklama || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      tutar: formData.saat * formData.birim_ucret,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Personel Adı</label>
        <Input
          value={formData.personel_ad}
          onChange={(e) => setFormData({ ...formData, personel_ad: e.target.value })}
          placeholder="Personel adı"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Çalışma Saati</label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={formData.saat}
            onChange={(e) => setFormData({ ...formData, saat: parseFloat(e.target.value) })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Birim Ücret (₺)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.birim_ucret}
            onChange={(e) => setFormData({ ...formData, birim_ucret: parseFloat(e.target.value) })}
            required
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Tarih</label>
        <Input
          type="date"
          value={formData.tarih}
          onChange={(e) => setFormData({ ...formData, tarih: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">Açıklama</label>
        <Input
          value={formData.aciklama}
          onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
          placeholder="Açıklama (opsiyonel)"
        />
      </div>
      <div className="bg-muted p-3 rounded-lg">
        <div className="text-sm text-secondary">Toplam Tutar</div>
        <div className="text-xl font-bold">{formatCurrency(formData.saat * formData.birim_ucret)}</div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>İptal</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function EnerjiForm({ initialData, onSubmit, onCancel, isLoading }: {
  initialData?: any
  onSubmit: (data: any) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    enerji_tipi: initialData?.enerji_tipi || 'ELEKTRIK',
    tuketim_miktari: initialData?.tuketim_miktari || 0,
    birim_fiyat: initialData?.birim_fiyat || 0,
    tarih: initialData?.tarih || new Date().toISOString().split('T')[0],
    aciklama: initialData?.aciklama || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      tutar: formData.tuketim_miktari * formData.birim_fiyat,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Enerji Türü</label>
        <Select value={formData.enerji_tipi} onValueChange={(v) => setFormData({ ...formData, enerji_tipi: v as any })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ELEKTRIK">Elektrik</SelectItem>
            <SelectItem value="DOGALGAZ">Doğal Gaz</SelectItem>
            <SelectItem value="SU">Su</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Tüketim Miktarı</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.tuketim_miktari}
            onChange={(e) => setFormData({ ...formData, tuketim_miktari: parseFloat(e.target.value) })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Birim Fiyat (₺)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.birim_fiyat}
            onChange={(e) => setFormData({ ...formData, birim_fiyat: parseFloat(e.target.value) })}
            required
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Tarih</label>
        <Input
          type="date"
          value={formData.tarih}
          onChange={(e) => setFormData({ ...formData, tarih: e.target.value })}
          required
        />
      </div>
      <div className="bg-muted p-3 rounded-lg">
        <div className="text-sm text-secondary">Toplam Tutar</div>
        <div className="text-xl font-bold">{formatCurrency(formData.tuketim_miktari * formData.birim_fiyat)}</div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>İptal</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function BakimForm({ initialData, onSubmit, onCancel, isLoading }: {
  initialData?: any
  onSubmit: (data: any) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    bakim_tipi: initialData?.bakim_tipi || 'PLANLI',
    bakim_aciklamasi: initialData?.bakim_aciklamasi || '',
    tutar: initialData?.tutar || 0,
    tarih: initialData?.tarih || new Date().toISOString().split('T')[0],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Bakım Türü</label>
        <Select value={formData.bakim_tipi} onValueChange={(v) => setFormData({ ...formData, bakim_tipi: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PLANLI">Planlı Bakım</SelectItem>
            <SelectItem value="HATALI">Hatalı Bakım</SelectItem>
            <SelectItem value="PERIYODIK">Periyodik Bakım</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Açıklama</label>
        <Input
          value={formData.bakim_aciklamasi}
          onChange={(e) => setFormData({ ...formData, bakim_aciklamasi: e.target.value })}
          placeholder="Bakım açıklaması"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">Tutar (₺)</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={formData.tutar}
          onChange={(e) => setFormData({ ...formData, tutar: parseFloat(e.target.value) })}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">Tarih</label>
        <Input
          type="date"
          value={formData.tarih}
          onChange={(e) => setFormData({ ...formData, tarih: e.target.value })}
          required
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>İptal</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function GenelGiderForm({ initialData, onSubmit, onCancel, isLoading }: {
  initialData?: any
  onSubmit: (data: any) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    gider_tipi: initialData?.gider_tipi || 'KIRA',
    aciklama: initialData?.aciklama || '',
    tutar: initialData?.tutar || 0,
    tarih: initialData?.tarih || new Date().toISOString().split('T')[0],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Gider Türü</label>
        <Select value={formData.gider_tipi} onValueChange={(v) => setFormData({ ...formData, gider_tipi: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="KIRA">Kira</SelectItem>
            <SelectItem value="SIGORTA">Sigorta</SelectItem>
            <SelectItem value="VERGI">Vergi</SelectItem>
            <SelectItem value="YONETIM">Yönetim Gideri</SelectItem>
            <SelectItem value="NAKLIYE">Nakliye</SelectItem>
            <SelectItem value="DIGER">Diğer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Açıklama</label>
        <Input
          value={formData.aciklama}
          onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
          placeholder="Gider açıklaması"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">Tutar (₺)</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={formData.tutar}
          onChange={(e) => setFormData({ ...formData, tutar: parseFloat(e.target.value) })}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">Tarih</label>
        <Input
          type="date"
          value={formData.tarih}
          onChange={(e) => setFormData({ ...formData, tarih: e.target.value })}
          required
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>İptal</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </DialogFooter>
    </form>
  )
}
