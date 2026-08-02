import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell, Search, Filter, Plus, Check, Trash2,
  AlertTriangle, Package, Factory, Settings,
  CheckCircle, Info, AlertCircle, Calendar
} from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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

interface Bildirim {
  id: string
  bildirim_tipi: string
  baslik: string
  icerik: string
  oncelik: 'DUSUK' | 'NORMAL' | 'YUKSEK' | 'KRITIK'
  durum: 'GORULMEMIS' | 'GORULDU' | 'OKUNDU'
  gonderen_ad: string | null
  referans_tip: string | null
  referans_id: string | null
  action_url: string | null
  action_label: string | null
  olusturma_tarihi: string
}

const bildirimTipiIcons: Record<string, any> = {
  STOK_UYARI: Package,
  SKT_UYARI: AlertTriangle,
  KALITE_KONTROL: CheckCircle,
  SISTEM: Settings,
  URETIM: Factory,
  SATIS: Bell,
  default: Info,
}

const bildirimTipiLabels: Record<string, string> = {
  STOK_UYARI: 'Stok Uyarısı',
  SKT_UYARI: 'SKT Uyarısı',
  KALITE_KONTROL: 'Kalite Kontrol',
  SISTEM: 'Sistem',
  URETIM: 'Üretim',
  SATIS: 'Satış',
  default: 'Diğer',
}

const oncelikColors: Record<string, string> = {
  YUKSEK: 'bg-red-100 text-red-800 border-red-300',
  NORMAL: 'bg-orange-100 text-orange-800 border-orange-300',
  DUSUK: 'bg-gray-100 text-gray-600 border-gray-300',
  KRITIK: 'bg-red-200 text-red-900 border-red-400',
}

export function BildirimPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<string>('hepsi')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTip, setSelectedTip] = useState<string>('hepsi')
  const [selectedOncelik, setSelectedOncelik] = useState<string>('hepsi')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [page, setPage] = useState(1)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedBildirim, setSelectedBildirim] = useState<Bildirim | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  // Build query params
  const params: any = {
    sayfa: page,
    sayfa_boyutu: 20,
  }
  
  if (activeTab === 'okunmamis') {
    params.durum = 'GORULMEMIS'
  } else if (activeTab === 'onemli') {
    params.oncelik = 'YUKSEK,KRITIK'
  }
  if (searchQuery) params.arama = searchQuery
  if (selectedTip !== 'hepsi') params.bildirim_tipi = selectedTip
  if (selectedOncelik !== 'hepsi') params.oncelik = selectedOncelik
  if (dateFrom) params.baslangic_tarih = dateFrom
  if (dateTo) params.bitis_tarih = dateTo

  const { data, isLoading } = useQuery({
    queryKey: ['bildirimler', params],
    queryFn: async () => {
      const response = await api.get('/bildirim', { params })
      return response.data
    },
  })

  const { data: unreadCount } = useQuery({
    queryKey: ['bildirim-unread'],
    queryFn: async () => {
      const response = await api.get('/bildirim', { params: { durum: 'GORULMEMIS', sayfa_boyutu: 1 } })
      return response.data.total || 0
    },
    refetchInterval: 60000,
  })

  const bildirimler: Bildirim[] = data?.data || []

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/bildirim/${id}/okundu`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bildirimler'] })
      queryClient.invalidateQueries({ queryKey: ['bildirim-unread'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/bildirim/tumunu-okundu-isaretle')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bildirimler'] })
      queryClient.invalidateQueries({ queryKey: ['bildirim-unread'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/bildirim/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bildirimler'] })
      queryClient.invalidateQueries({ queryKey: ['bildirim-unread'] })
    },
  })

  const handleBildirimClick = (bildirim: Bildirim) => {
    setSelectedBildirim(bildirim)
    setShowDetailDialog(true)
    if (bildirim.durum === 'GORULMEMIS') {
      markReadMutation.mutate(bildirim.id)
    }
  }

  const getIcon = (tip: string) => {
    return bildirimTipiIcons[tip] || bildirimTipiIcons.default
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Bildirimler
          </h2>
          <p className="text-sm text-secondary">
            {unreadCount > 0 && (
              <span className="text-red-600 font-medium">{unreadCount} okunmamış bildirim</span>
            )}
            {unreadCount === 0 && 'Tüm bildirimler görüldü'}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <Check className="h-4 w-4 mr-2" />
              Tümünü Okundu İşaretle
            </Button>
          )}
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Bildirim
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="hepsi">Tümü</TabsTrigger>
          <TabsTrigger value="okunmamis" className="relative">
            Okunmamış
            {unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="onemli">Önemli</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Bildirim ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedTip} onValueChange={setSelectedTip}>
              <SelectTrigger>
                <SelectValue placeholder="Bildirim Tipi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hepsi">Tüm Tipler</SelectItem>
                <SelectItem value="STOK_UYARI">Stok Uyarısı</SelectItem>
                <SelectItem value="SKT_UYARI">SKT Uyarısı</SelectItem>
                <SelectItem value="KALITE_KONTROL">Kalite Kontrol</SelectItem>
                <SelectItem value="SISTEM">Sistem</SelectItem>
                <SelectItem value="URETIM">Üretim</SelectItem>
                <SelectItem value="SATIS">Satış</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedOncelik} onValueChange={setSelectedOncelik}>
              <SelectTrigger>
                <SelectValue placeholder="Öncelik" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hepsi">Tüm Öncelikler</SelectItem>
                <SelectItem value="KRITIK">Kritik</SelectItem>
                <SelectItem value="YUKSEK">Yüksek</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="DUSUK">Düşük</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('')
                setSelectedTip('hepsi')
                setSelectedOncelik('hepsi')
                setDateFrom('')
                setDateTo('')
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Temizle
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div>
              <Label className="text-xs text-secondary">Başlangıç Tarihi</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-secondary">Bitiş Tarihi</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : bildirimler.length === 0 ? (
            <div className="text-center py-12 text-secondary">
              <Bell className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Bildirim bulunamadı</p>
              <p className="text-sm">Seçili filtrelere uygun bildirim yok</p>
            </div>
          ) : (
            <div className="divide-y">
              {bildirimler.map((bildirim) => {
                const Icon = getIcon(bildirim.bildirim_tipi)
                const isUnread = bildirim.durum === 'GORULMEMIS'
                return (
                  <div
                    key={bildirim.id}
                    className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                      isUnread ? 'bg-blue-50/50' : ''
                    }`}
                    onClick={() => handleBildirimClick(bildirim)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        bildirim.bildirim_tipi === 'STOK_UYARI' ? 'bg-orange-100' :
                        bildirim.bildirim_tipi === 'SKT_UYARI' ? 'bg-red-100' :
                        bildirim.bildirim_tipi === 'KALITE_KONTROL' ? 'bg-green-100' :
                        bildirim.bildirim_tipi === 'SISTEM' ? 'bg-blue-100' :
                        'bg-gray-100'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          bildirim.bildirim_tipi === 'STOK_UYARI' ? 'text-orange-600' :
                          bildirim.bildirim_tipi === 'SKT_UYARI' ? 'text-red-600' :
                          bildirim.bildirim_tipi === 'KALITE_KONTROL' ? 'text-green-600' :
                          bildirim.bildirim_tipi === 'SISTEM' ? 'text-blue-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          )}
                          <h4 className={`font-medium text-sm ${isUnread ? 'text-blue-900' : ''}`}>
                            {bildirim.baslik}
                          </h4>
                          <Badge
                            className={`text-xs ${oncelikColors[bildirim.oncelik] || oncelikColors.DUSUK}`}
                          >
                            {bildirim.oncelik === 'YUKSEK' ? 'Yüksek' :
                             bildirim.oncelik === 'DUSUK' ? 'Düşük' :
                             bildirim.oncelik === 'KRITIK' ? 'Kritik' : 'Normal'}
                          </Badge>
                        </div>
                        <p className="text-sm text-secondary line-clamp-2 mb-2">
                          {bildirim.icerik}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-secondary">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(bildirim.olusturma_tarihi)}
                          </span>
                          {bildirim.gonderen_ad && (
                            <span>{bildirim.gonderen_ad}</span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {bildirimTipiLabels[bildirim.bildirim_tipi] || bildirim.bildirim_tipi}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            markReadMutation.mutate(bildirim.id)
                          }}
                          title="Okundu işaretle"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteMutation.mutate(bildirim.id)
                          }}
                          title="Sil"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
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

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedBildirim && (
                <>
                  {(() => {
                    const Icon = getIcon(selectedBildirim.bildirim_tipi)
                    return <Icon className="h-5 w-5" />
                  })()}
                  {selectedBildirim.baslik}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedBildirim && formatDate(selectedBildirim.olusturma_tarihi)}
            </DialogDescription>
          </DialogHeader>
          {selectedBildirim && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  className={`${oncelikColors[selectedBildirim.oncelik] || oncelikColors.DUSUK}`}
                >
                  Öncelik: {selectedBildirim.oncelik === 'YUKSEK' ? 'Yüksek' :
                           selectedBildirim.oncelik === 'DUSUK' ? 'Düşük' :
                           selectedBildirim.oncelik === 'KRITIK' ? 'Kritik' : 'Normal'}
                </Badge>
                <Badge variant="outline">
                  {bildirimTipiLabels[selectedBildirim.bildirim_tipi] || selectedBildirim.bildirim_tipi}
                </Badge>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{selectedBildirim.icerik}</p>
              </div>
              {selectedBildirim.gonderen_ad && (
                <div className="text-sm">
                  <span className="text-secondary">Gönderen: </span>
                  <span>{selectedBildirim.gonderen_ad}</span>
                </div>
              )}
              {selectedBildirim.referans_tip && (
                <div className="text-sm">
                  <span className="text-secondary">Referans: </span>
                  <span>{selectedBildirim.referans_tip} - {selectedBildirim.referans_id}</span>
                </div>
              )}
              {selectedBildirim.action_url && (
                <div className="pt-2">
                  <a
                    href={selectedBildirim.action_url}
                    className="text-primary hover:underline"
                  >
                    {selectedBildirim.action_label || 'İşleme Git'}
                  </a>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <CreateBildirimDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['bildirimler'] })
        }}
      />
    </div>
  )
}

interface CreateBildirimDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function CreateBildirimDialog({ open, onOpenChange, onSuccess }: CreateBildirimDialogProps) {
  const [formData, setFormData] = useState({
    bildirim_tipi: 'SISTEM',
    baslik: '',
    icerik: '',
    oncelik: 'NORMAL',
    alici_id: '',
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/bildirim', data)
      return response.data
    },
    onSuccess: () => {
      onSuccess()
      onOpenChange(false)
      setFormData({
        bildirim_tipi: 'SISTEM',
        baslik: '',
        icerik: '',
        oncelik: 'NORMAL',
        alici_id: '',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Yeni Bildirim Oluştur</DialogTitle>
            <DialogDescription>
              Sistem bildirimi oluşturun ve gönderin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tip">Bildirim Tipi</Label>
              <Select
                value={formData.bildirim_tipi}
                onValueChange={(value) => setFormData({ ...formData, bildirim_tipi: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SISTEM">Sistem</SelectItem>
                  <SelectItem value="STOK_UYARI">Stok Uyarısı</SelectItem>
                  <SelectItem value="SKT_UYARI">SKT Uyarısı</SelectItem>
                  <SelectItem value="KALITE_KONTROL">Kalite Kontrol</SelectItem>
                  <SelectItem value="URETIM">Üretim</SelectItem>
                  <SelectItem value="SATIS">Satış</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="baslik">Başlık</Label>
              <Input
                id="baslik"
                value={formData.baslik}
                onChange={(e) => setFormData({ ...formData, baslik: e.target.value })}
                placeholder="Bildirim başlığı"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icerik">İçerik</Label>
              <textarea
                id="icerik"
                value={formData.icerik}
                onChange={(e) => setFormData({ ...formData, icerik: e.target.value })}
                placeholder="Bildirim içeriği..."
                className="w-full min-h-[100px] px-3 py-2 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oncelik">Öncelik</Label>
              <Select
                value={formData.oncelik}
                onValueChange={(value) => setFormData({ ...formData, oncelik: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DUSUK">Düşük</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="YUKSEK">Yüksek</SelectItem>
                  <SelectItem value="KRITIK">Kritik</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Gönderiliyor...' : 'Gönder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
