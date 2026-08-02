import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  RotateCcw, Plus, Search, Eye, CheckCircle, XCircle,
  Package, AlertTriangle, Calendar, Filter, Download
} from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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

interface SatisIade {
  id: string
  satis_id: string
  musteri_id: string
  musteri_ad?: string
  iade_no: string
  iade_tarihi: string
  iade_durumu: 'OLUSTURULDU' | 'KALITE_KONTROL' | 'STOK_GIRISI' | 'TAMAMLANDI' | 'RET'
  iade_nedeni: 'KALITE_SORUNU' | 'YANLIS_URUN' | 'MIKTAR_FARKI' | 'MUSTERI_ISTEK' | 'DIGER'
  toplam_miktar: number
  toplam_tutar: number | null
  fire_miktari: number | null
  fire_orani: number | null
  fire_nedeni: string | null
  olusturma_tarihi: string
}

interface Satis {
  id: string
  satis_no: string
  musteri_ad: string | null
  tarih: string
  toplam_tutar: number
  durum: string
}

interface Musteri {
  id: string
  ad: string
}

const durumLabels: Record<string, string> = {
  OLUSTURULDU: 'Oluşturuldu',
  KALITE_KONTROL: 'Kalite Kontrolde',
  STOK_GIRISI: 'Stok Girişi',
  TAMAMLANDI: 'Tamamlandı',
  RET: 'Reddedildi',
}

const durumColors: Record<string, string> = {
  OLUSTURULDU: 'bg-blue-100 text-blue-800',
  KALITE_KONTROL: 'bg-orange-100 text-orange-800',
  STOK_GIRISI: 'bg-purple-100 text-purple-800',
  TAMAMLANDI: 'bg-green-100 text-green-800',
  RET: 'bg-red-100 text-red-800',
}

const nedenLabels: Record<string, string> = {
  KALITE_SORUNU: 'Kalite Sorunu',
  YANLIS_URUN: 'Yanlış Ürün',
  MIKTAR_FARKI: 'Miktar Farkı',
  MUSTERI_ISTEK: 'Müşteri İsteği',
  DIGER: 'Diğer',
}

export function IadePage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<string>('hepsi')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedIade, setSelectedIade] = useState<SatisIade | null>(null)

  const params: any = {
    sayfa: page,
    sayfa_boyutu: 20,
  }
  
  if (activeTab === 'bekleyen') {
    params.durum = 'OLUSTURULDU,KALITE_KONTROL'
  } else if (activeTab === 'tamamlanan') {
    params.durum = 'TAMAMLANDI,RET'
  }
  if (searchQuery) params.arama = searchQuery

  const { data, isLoading } = useQuery({
    queryKey: ['iade', params],
    queryFn: async () => {
      const response = await api.get('/iade', { params })
      return response.data
    },
  })

  const iadeler: SatisIade[] = data?.data || []

  const { data: satislarData } = useQuery({
    queryKey: ['satislar-for-iade'],
    queryFn: async () => {
      const response = await api.get('/satis', { params: { sayfa_boyutu: 100, durum: 'TAMAMLANDI' } })
      return response.data
    },
  })

  const { data: musterilerData } = useQuery({
    queryKey: ['musteriler'],
    queryFn: async () => {
      const response = await api.get('/musteriler', { params: { sayfa_boyutu: 100 } })
      return response.data
    },
  })

  const satislar: Satis[] = satislarData?.data || []
  const musteriler: Musteri[] = musterilerData?.data || []

  const createIadeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/iade', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iade'] })
      queryClient.invalidateQueries({ queryKey: ['stok'] })
      setShowCreateDialog(false)
    },
  })

  const updateDurumMutation = useMutation({
    mutationFn: async ({ id, durum }: { id: string; durum: string }) => {
      const response = await api.patch(`/iade/${id}/durum`, { durum })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iade'] })
      queryClient.invalidateQueries({ queryKey: ['stok'] })
      setShowDetailDialog(false)
      setSelectedIade(null)
    },
  })

  const handleViewDetail = (iade: SatisIade) => {
    setSelectedIade(iade)
    setShowDetailDialog(true)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-'
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            İade Yönetimi
          </h2>
          <p className="text-sm text-secondary">
            {data?.total || 0} iade kaydı
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Rapor İndir
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni İade
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'hepsi'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-foreground'
          }`}
          onClick={() => { setActiveTab('hepsi'); setPage(1) }}
        >
          Tüm İadeler ({data?.total || 0})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'bekleyen'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-foreground'
          }`}
          onClick={() => { setActiveTab('bekleyen'); setPage(1) }}
        >
          Bekleyen
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'tamamlanan'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-foreground'
          }`}
          onClick={() => { setActiveTab('tamamlanan'); setPage(1) }}
        >
          Tamamlanan
        </button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="İade no, müşteri veya satış no ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtrele
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : iadeler.length === 0 ? (
            <div className="text-center py-12 text-secondary">
              <RotateCcw className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">İade kaydı bulunamadı</p>
              <p className="text-sm">Seçili filtrelere uygun iade yok</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">İade No</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Satış No</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Müşteri</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tarih</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Miktar</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Durum</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Neden</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {iadeler.map((iade) => (
                    <tr key={iade.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-sm">{iade.iade_no}</td>
                      <td className="px-4 py-3 font-mono text-sm">{iade.satis_id}</td>
                      <td className="px-4 py-3">{iade.musteri_ad || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(iade.iade_tarihi)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{iade.toplam_miktar}</td>
                      <td className="px-4 py-3">
                        <Badge className={durumColors[iade.iade_durumu]}>
                          {durumLabels[iade.iade_durumu]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {nedenLabels[iade.iade_nedeni]}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(iade)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.toplam_sayfa > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Önceki
          </Button>
          <span className="px-4 py-2 text-sm">
            Sayfa {page} / {data.toplam_sayfa}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.toplam_sayfa}
            onClick={() => setPage(page + 1)}
          >
            Sonraki
          </Button>
        </div>
      )}

      {/* Create Dialog */}
      <CreateIadeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        satislar={satislar}
        musteriler={musteriler}
        onSave={(data) => createIadeMutation.mutate(data)}
        isLoading={createIadeMutation.isPending}
      />

      {/* Detail Dialog */}
      <IadeDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        iade={selectedIade}
        onUpdateDurum={(id, durum) => updateDurumMutation.mutate({ id, durum })}
        isUpdating={updateDurumMutation.isPending}
      />
    </div>
  )
}

interface CreateIadeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  satislar: Satis[]
  musteriler: Musteri[]
  onSave: (data: any) => void
  isLoading: boolean
}

function CreateIadeDialog({ open, onOpenChange, satislar, musteriler, onSave, isLoading }: CreateIadeDialogProps) {
  const [formData, setFormData] = useState({
    satis_id: '',
    iade_nedeni: 'DIGER' as const,
    toplam_miktar: '',
    notes: '',
  })

  const selectedSatis = satislar.find((s) => s.id === formData.satis_id)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      satis_id: formData.satis_id,
      iade_nedeni: formData.iade_nedeni,
      toplam_miktar: parseFloat(formData.toplam_miktar),
      not_text: formData.notes,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Yeni İade Oluştur</DialogTitle>
            <DialogDescription>
              Satış iadesi kaydı oluşturun
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="satis">Satış Seç</Label>
              <Select
                value={formData.satis_id}
                onValueChange={(value) => setFormData({ ...formData, satis_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Satış seçin" />
                </SelectTrigger>
                <SelectContent>
                  {satislar.map((satis) => (
                    <SelectItem key={satis.id} value={satis.id}>
                      {satis.satis_no} - {satis.musteri_ad || '-'} ({formatDate(satis.tarih)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSatis && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Satış No:</span>
                  <span className="font-mono">{selectedSatis.satis_no}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Müşteri:</span>
                  <span>{selectedSatis.musteri_ad || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Tutar:</span>
                  <span>{formatCurrency(selectedSatis.toplam_tutar)}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="miktar">İade Miktarı</Label>
              <Input
                id="miktar"
                type="number"
                min="1"
                value={formData.toplam_miktar}
                onChange={(e) => setFormData({ ...formData, toplam_miktar: e.target.value })}
                placeholder="İade edilecek miktar"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="neden">İade Nedeni</Label>
              <Select
                value={formData.iade_nedeni}
                onValueChange={(value: any) => setFormData({ ...formData, iade_nedeni: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KALITE_SORUNU">Kalite Sorunu</SelectItem>
                  <SelectItem value="YANLIS_URUN">Yanlış Ürün</SelectItem>
                  <SelectItem value="MIKTAR_FARKI">Miktar Farkı</SelectItem>
                  <SelectItem value="MUSTERI_ISTEK">Müşteri İsteği</SelectItem>
                  <SelectItem value="DIGER">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notlar</Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="İade ile ilgili notlar..."
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isLoading || !formData.satis_id}>
              {isLoading ? 'Oluşturuluyor...' : 'İade Oluştur'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface IadeDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  iade: SatisIade | null
  onUpdateDurum: (id: string, durum: string) => void
  isUpdating: boolean
}

function IadeDetailDialog({ open, onOpenChange, iade, onUpdateDurum, isUpdating }: IadeDetailDialogProps) {
  if (!iade) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            İade Detayı
          </DialogTitle>
          <DialogDescription>
            {iade.iade_no}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-secondary">Durum</span>
            <Badge className={durumColors[iade.iade_durumu]}>
              {durumLabels[iade.iade_durumu]}
            </Badge>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-secondary">İade Nedeni</p>
              <p className="text-sm font-medium">{nedenLabels[iade.iade_nedeni]}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-secondary">İade Miktarı</p>
              <p className="text-sm font-medium">{iade.toplam_miktar}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-secondary">İade Tutarı</p>
              <p className="text-sm font-medium">{formatCurrency(iade.toplam_tutar)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-secondary">Tarih</p>
              <p className="text-sm font-medium">{formatDate(iade.iade_tarihi)}</p>
            </div>
          </div>

          {/* Fire Info */}
          {iade.fire_miktari !== null && iade.fire_miktari > 0 && (
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">Fire Bilgisi</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-secondary">Giriş</p>
                  <p className="font-medium">{iade.toplam_miktar}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary">Çıkış</p>
                  <p className="font-medium">{iade.toplam_miktar - (iade.fire_miktari || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary">Fire</p>
                  <p className="font-medium text-red-600">{iade.fire_miktari} ({((iade.fire_orani || 0) * 100).toFixed(1)}%)</p>
                </div>
              </div>
              {iade.fire_nedeni && (
                <p className="text-xs text-secondary mt-2">Nedeni: {iade.fire_nedeni}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <p className="text-sm font-medium">İşlemler</p>
            <div className="flex flex-wrap gap-2">
              {iade.iade_durumu === 'OLUSTURULDU' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => onUpdateDurum(iade.id, 'KALITE_KONTROL')}
                    disabled={isUpdating}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Kalite Kontrole Gönder
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onUpdateDurum(iade.id, 'RET')}
                    disabled={isUpdating}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reddet
                  </Button>
                </>
              )}
              {iade.iade_durumu === 'KALITE_KONTROL' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => onUpdateDurum(iade.id, 'STOK_GIRISI')}
                    disabled={isUpdating}
                  >
                    <Package className="h-4 w-4 mr-1" />
                    Stok Girişi Yap
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onUpdateDurum(iade.id, 'RET')}
                    disabled={isUpdating}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reddet
                  </Button>
                </>
              )}
              {iade.iade_durumu === 'STOK_GIRISI' && (
                <Button
                  size="sm"
                  onClick={() => onUpdateDurum(iade.id, 'TAMAMLANDI')}
                  disabled={isUpdating}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Tamamla
                </Button>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(value: number | null) {
  if (value === null) return '-'
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(value)
}
