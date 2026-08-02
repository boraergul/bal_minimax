import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock,
  AlertTriangle,
  Trash2,
  Percent,
  RefreshCw,
  RotateCcw,
  Snowflake,
  Search,
  Filter,
  Eye,
  X,
} from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { cn } from '@/lib/utils'
import { format, parseISO, isValid } from 'date-fns'
import { tr } from 'date-fns/locale'

// ============ Types ============

export interface SktLot {
  id: string
  lot_no: string
  urun_id: string
  urun_ad: string
  stok_tipi: 'HAMMADDE' | 'MAMUL'
  miktar: number
  birim: string
  birim_fiyat: number
  giris_tarihi: string
  uretim_tarihi: string | null
  son_kullanma: string | null
  konum: string | null
  durum: string
  skt_durum: 'SON_KULLANIM_GECDI' | 'SON_KULLANIM_RISKLI' | 'NORMAL' | 'SKT_YOK'
  kalan_gun: number | null
}

export interface SktRapor {
  data: SktLot[]
  istatistikler: {
    toplam_lot: number
    gecmis_lot: number
    riskli_lot: number
    normal_lot: number
    sktsiz_lot: number
    toplam_deger: number
    riskli_deger: number
    gecmis_deger: number
  }
  uyari_esigi_gun: number
}

export interface SktIslem {
  id: string
  stok_id: string
  lot_no: string
  urun_ad: string
  islem_turu: 'IMHA' | 'INDIRIM' | 'DEVIR' | 'IADE' | 'DONURMA'
  talep_durumu: 'BEKLIYOR' | 'ONAYLANDI' | 'REDEDILDI' | 'TAMAMLANDI'
  talep_eden: string
  talep_tarihi: string
  mevcut_miktar: number
  islem_miktari: number
  birim: string
  indirim_orani: number | null
  gerekce: string | null
  not_text: string | null
}

export interface SktIslemCreateRequest {
  stok_id: string
  islem_turu: 'IMHA' | 'INDIRIM' | 'DEVIR' | 'IADE' | 'DONURMA'
  islem_miktari: number
  indirim_orani?: number
  gerekce: string
  not_text?: string
}

// ============ Helper Functions ============

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  try {
    const date = parseISO(dateStr)
    if (!isValid(date)) return '-'
    return format(date, 'dd MMM yyyy', { locale: tr })
  } catch {
    return '-'
  }
}

function getKalanGunLabel(kalanGun: number | null): { text: string; className: string } {
  if (kalanGun === null) return { text: 'SKT Yok', className: 'text-secondary' }
  if (kalanGun < 0) return { text: `${Math.abs(kalanGun)} gün geçmiş`, className: 'text-red-600 font-semibold' }
  if (kalanGun === 0) return { text: 'Bugün son', className: 'text-red-600 font-semibold' }
  if (kalanGun <= 30) return { text: `${kalanGun} gün kaldı`, className: 'text-orange-600 font-medium' }
  return { text: `${kalanGun} gün kaldı`, className: 'text-green-600' }
}

function getSktDurumBadge(sktDurum: SktLot['skt_durum']): { label: string; variant: 'destructive' | 'secondary' | 'default' } {
  switch (sktDurum) {
    case 'SON_KULLANIM_GECDI':
      return { label: 'Süresi Dolmuş', variant: 'destructive' }
    case 'SON_KULLANIM_RISKLI':
      return { label: 'Riskli', variant: 'default' }
    case 'NORMAL':
      return { label: 'Normal', variant: 'secondary' }
    case 'SKT_YOK':
    default:
      return { label: 'SKT Yok', variant: 'secondary' }
  }
}

// ============ Hooks ============

function useSktRapor(params?: { durum_filter?: string }) {
  return useQuery<SktRapor>({
    queryKey: ['skt-rapor', params],
    queryFn: async () => {
      const response = await api.get('/stok/skt/rapor', { params })
      return response.data
    },
  })
}

function useSktIslemler(params?: { sayfa?: number; sayfa_boyutu?: number }) {
  return useQuery<{ data: SktIslem[]; toplam: number }>({
    queryKey: ['skt-islemler', params],
    queryFn: async () => {
      const response = await api.get('/stok/skt/islemler', { params })
      return response.data
    },
  })
}

function useSktMutations() {
  const queryClient = useQueryClient()

  const createSktIslem = useMutation({
    mutationFn: async (data: SktIslemCreateRequest) => {
      const response = await api.post('/stok/skt/islemler', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skt-rapor'] })
      queryClient.invalidateQueries({ queryKey: ['skt-islemler'] })
    },
  })

  return { createSktIslem }
}

// ============ Sub-Components ============

interface StatsCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  alert?: boolean
}

function StatsCard({ title, value, subtitle, icon: Icon, iconColor, iconBg, alert }: StatsCardProps) {
  return (
    <Card className={cn('hover:shadow-md transition-shadow', alert && 'border-orange-300')}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-secondary">{title}</CardTitle>
        <div className={cn('p-2 rounded-lg', iconBg)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-secondary mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

interface IslemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lot: SktLot | null
  onSubmit: (data: SktIslemCreateRequest) => void
  isLoading: boolean
}

function IslemDialog({ open, onOpenChange, lot, onSubmit, isLoading }: IslemDialogProps) {
  const [islemTuru, setIslemTuru] = useState<SktIslemCreateRequest['islem_turu'] | ''>('')
  const [islemMiktari, setIslemMiktari] = useState<number>(0)
  const [indirimOrani, setIndirimOrani] = useState<number>(0)
  const [gereke, setGereke] = useState<string>('')
  const [notText, setNotText] = useState<string>('')

  const handleSubmit = () => {
    if (!lot || !islemTuru) return

    onSubmit({
      stok_id: lot.id,
      islem_turu: islemTuru,
      islem_miktari: islemMiktari || lot.miktar,
      indirim_orani: islemTuru === 'INDIRIM' ? indirimOrani : undefined,
      gerekce: gereke,
      not_text: notText || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>SKT İşlemi Oluştur</DialogTitle>
          <DialogDescription>
            {lot?.lot_no} - {lot?.urun_ad}
          </DialogDescription>
        </DialogHeader>

        {lot && (
          <div className="space-y-4 py-4">
            {/* Lot Info */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-xs text-secondary">Miktar</p>
                <p className="font-medium">{lot.miktar} {lot.birim}</p>
              </div>
              <div>
                <p className="text-xs text-secondary">SKT</p>
                <p className="font-medium">{formatDate(lot.son_kullanma)}</p>
              </div>
              <div>
                <p className="text-xs text-secondary">Kalan Gün</p>
                <p className={cn('font-medium', getKalanGunLabel(lot.kalan_gun).className)}>
                  {getKalanGunLabel(lot.kalan_gun).text}
                </p>
              </div>
              <div>
                <p className="text-xs text-secondary">Durum</p>
                <Badge variant={getSktDurumBadge(lot.skt_durum).variant}>
                  {getSktDurumBadge(lot.skt_durum).label}
                </Badge>
              </div>
            </div>

            {/* Operation Type */}
            <div className="space-y-2">
              <Label htmlFor="islem-turu">İşlem Türü *</Label>
              <Select
                value={islemTuru}
                onValueChange={(v) => setIslemTuru(v as SktIslemCreateRequest['islem_turu'])}
              >
                <SelectTrigger id="islem-turu">
                  <SelectValue placeholder="İşlem türü seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMHA">
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-red-500" />
                      <span>İmha</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="INDIRIM">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-orange-500" />
                      <span>İndirimli Satış</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="DEVIR">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-blue-500" />
                      <span>Devir</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="DONURMA">
                    <div className="flex items-center gap-2">
                      <Snowflake className="h-4 w-4 text-cyan-500" />
                      <span>Dondurma</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="IADE">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-purple-500" />
                      <span>İade</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="islem-miktari">İşlem Miktarı</Label>
              <Input
                id="islem-miktari"
                type="number"
                min={0}
                max={lot.miktar}
                value={islemMiktari || ''}
                onChange={(e) => setIslemMiktari(parseFloat(e.target.value) || 0)}
                placeholder={`Maksimum: ${lot.miktar} ${lot.birim}`}
              />
              <p className="text-xs text-secondary">
                Boş bırakılırsa tüm miktar ({lot.miktar} {lot.birim}) işleme alınır
              </p>
            </div>

            {/* Discount Rate (only for INDIRIM) */}
            {islemTuru === 'INDIRIM' && (
              <div className="space-y-2">
                <Label htmlFor="indirim-orani">İndirim Oranı (%)</Label>
                <Input
                  id="indirim-orani"
                  type="number"
                  min={0}
                  max={100}
                  value={indirimOrani || ''}
                  onChange={(e) => setIndirimOrani(parseFloat(e.target.value) || 0)}
                  placeholder="Örn: 50"
                />
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="gereke">Gerekçe *</Label>
              <Input
                id="gereke"
                value={gereke}
                onChange={(e) => setGereke(e.target.value)}
                placeholder="İşlem gerekçesini açıklayın"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="not-text">Notlar</Label>
              <Input
                id="not-text"
                value={notText}
                onChange={(e) => setNotText(e.target.value)}
                placeholder="Ek notlar (opsiyonel)"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!islemTuru || !gereke || isLoading}
            loading={isLoading}
          >
            İşlem Oluştur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface LotDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lot: SktLot | null
}

function LotDetailDialog({ open, onOpenChange, lot }: LotDetailDialogProps) {
  if (!lot) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Lot Detayı
          </DialogTitle>
          <DialogDescription>{lot.lot_no}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Banner */}
          <div
            className={cn(
              'p-4 rounded-lg',
              lot.skt_durum === 'SON_KULLANIM_GECDI' && 'bg-red-50 border border-red-200',
              lot.skt_durum === 'SON_KULLANIM_RISKLI' && 'bg-orange-50 border border-orange-200',
              lot.skt_durum === 'NORMAL' && 'bg-green-50 border border-green-200',
              lot.skt_durum === 'SKT_YOK' && 'bg-gray-50 border border-gray-200'
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {getSktDurumBadge(lot.skt_durum).label}
                </p>
                <p className={cn('text-lg font-bold mt-1', getKalanGunLabel(lot.kalan_gun).className)}>
                  {getKalanGunLabel(lot.kalan_gun).text}
                </p>
              </div>
              <Badge variant={getSktDurumBadge(lot.skt_durum).variant} className="text-sm">
                {getSktDurumBadge(lot.skt_durum).label}
              </Badge>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-secondary">Ürün</p>
              <p className="font-medium">{lot.urun_ad}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-secondary">Lot No</p>
              <p className="font-mono font-medium">{lot.lot_no}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-secondary">Miktar</p>
              <p className="font-medium">{lot.miktar} {lot.birim}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-secondary">Birim Fiyat</p>
              <p className="font-medium">₺{lot.birim_fiyat?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-secondary">Son Kullanma</p>
              <p className="font-medium">{formatDate(lot.son_kullanma)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-secondary">Giriş Tarihi</p>
              <p className="font-medium">{formatDate(lot.giris_tarihi)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-secondary">Üretim Tarihi</p>
              <p className="font-medium">{formatDate(lot.uretim_tarihi)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-secondary">Konum</p>
              <p className="font-medium">{lot.konum || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-secondary">Stok Tipi</p>
              <p className="font-medium">{lot.stok_tipi}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-secondary">Durum</p>
              <Badge
                variant={lot.durum === 'AKTIF' ? 'default' : 'secondary'}
                className={lot.durum === 'AKTIF' ? 'bg-green-100 text-green-800' : ''}
              >
                {lot.durum}
              </Badge>
            </div>
          </div>

          {/* Value */}
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-xs text-secondary">Toplam Değer</p>
            <p className="text-xl font-bold">₺{(lot.miktar * lot.birim_fiyat).toFixed(2)}</p>
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

// ============ Main Component ============

export function SktYonetimPage() {
  const [arama, setArama] = useState('')
  const [durumFilter, setDurumFilter] = useState<string>('TUMU')
  const [tab, setTab] = useState<'lotlar' | 'islemler'>('lotlar')
  const [selectedLot, setSelectedLot] = useState<SktLot | null>(null)
  const [islemDialogOpen, setIslemDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // Queries
  const { data: sktRapor, isLoading: raporLoading } = useSktRapor()
  const { data: islemlerData, isLoading: islemlerLoading } = useSktIslemler()
  const { createSktIslem } = useSktMutations()

  // Filtered lots
  const filteredLots = useMemo(() => {
    if (!sktRapor?.data) return []

    let lots = [...sktRapor.data]

    // Apply status filter
    if (durumFilter !== 'TUMU') {
      lots = lots.filter((lot) => {
        switch (durumFilter) {
          case 'GECMIS':
            return lot.skt_durum === 'SON_KULLANIM_GECDI'
          case 'RISKLI':
            return lot.skt_durum === 'SON_KULLANIM_RISKLI'
          case 'NORMAL':
            return lot.skt_durum === 'NORMAL'
          case 'SKTSIZ':
            return lot.skt_durum === 'SKT_YOK'
          default:
            return true
        }
      })
    }

    // Apply search filter
    if (arama) {
      const searchLower = arama.toLowerCase()
      lots = lots.filter(
        (lot) =>
          lot.lot_no.toLowerCase().includes(searchLower) ||
          lot.urun_ad?.toLowerCase().includes(searchLower) ||
          lot.konum?.toLowerCase().includes(searchLower)
      )
    }

    // Sort by SKT (FEFO - First Expire First Out)
    lots.sort((a, b) => {
      // Expired first
      if (a.skt_durum === 'SON_KULLANIM_GECDI' && b.skt_durum !== 'SON_KULLANIM_GECDI') return -1
      if (b.skt_durum === 'SON_KULLANIM_GECDI' && a.skt_durum !== 'SON_KULLANIM_GECDI') return 1

      // Then riskli
      if (a.skt_durum === 'SON_KULLANIM_RISKLI' && b.skt_durum === 'NORMAL') return -1
      if (b.skt_durum === 'SON_KULLANIM_RISKLI' && a.skt_durum === 'NORMAL') return 1

      // Sort by remaining days (ascending)
      const aDays = a.kalan_gun ?? Infinity
      const bDays = b.kalan_gun ?? Infinity
      return aDays - bDays
    })

    return lots
  }, [sktRapor?.data, durumFilter, arama])

  const istatistikler = sktRapor?.istatistikler
  const uyariEsigi = sktRapor?.uyari_esigi_gun || 30

  const handleOpenIslem = (lot: SktLot) => {
    setSelectedLot(lot)
    setIslemDialogOpen(true)
  }

  const handleOpenDetail = (lot: SktLot) => {
    setSelectedLot(lot)
    setDetailDialogOpen(true)
  }

  const handleCreateIslem = async (data: SktIslemCreateRequest) => {
    await createSktIslem.mutateAsync(data)
    setIslemDialogOpen(false)
    setSelectedLot(null)
  }

  const getIslemTuruIcon = (turu: SktIslem['islem_turu']) => {
    switch (turu) {
      case 'IMHA':
        return <Trash2 className="h-4 w-4 text-red-500" />
      case 'INDIRIM':
        return <Percent className="h-4 w-4 text-orange-500" />
      case 'DEVIR':
        return <RefreshCw className="h-4 w-4 text-blue-500" />
      case 'IADE':
        return <RotateCcw className="h-4 w-4 text-purple-500" />
      case 'DONURMA':
        return <Snowflake className="h-4 w-4 text-cyan-500" />
      default:
        return null
    }
  }

  const getIslemDurumBadge = (durum: SktIslem['talep_durumu']) => {
    switch (durum) {
      case 'BEKLIYOR':
        return <Badge variant="default">Bekliyor</Badge>
      case 'ONAYLANDI':
        return <Badge className="bg-blue-100 text-blue-800">Onaylandı</Badge>
      case 'REDEDILDI':
        return <Badge variant="destructive">Reddedildi</Badge>
      case 'TAMAMLANDI':
        return <Badge className="bg-green-100 text-green-800">Tamamlandı</Badge>
      default:
        return <Badge variant="secondary">{durum}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            SKT Yönetimi
          </h2>
          <p className="text-sm text-secondary">
            Son kullanma tarihi takibi ve lot yönetimi
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-secondary">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <span>Uyarı eşiği: {uyariEsigi} gün</span>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Geçmiş Lot"
          value={istatistikler?.gecmis_lot || 0}
          subtitle={`₺${istatistikler?.gecmis_deger?.toFixed(0) || 0}`}
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBg="bg-red-100"
          alert={!!(istatistikler?.gecmis_lot && istatistikler.gecmis_lot > 0)}
        />
        <StatsCard
          title="Riskli Lot"
          value={istatistikler?.riskli_lot || 0}
          subtitle={`₺${istatistikler?.riskli_deger?.toFixed(0) || 0}`}
          icon={CalendarClock}
          iconColor="text-orange-600"
          iconBg="bg-orange-100"
          alert={!!(istatistikler?.riskli_lot && istatistikler.riskli_lot > 0)}
        />
        <StatsCard
          title="Normal Lot"
          value={istatistikler?.normal_lot || 0}
          icon={Filter}
          iconColor="text-green-600"
          iconBg="bg-green-100"
        />
        <StatsCard
          title="SKT'siz Lot"
          value={istatistikler?.sktsiz_lot || 0}
          icon={X}
          iconColor="text-gray-600"
          iconBg="bg-gray-100"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            tab === 'lotlar'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-foreground'
          )}
          onClick={() => setTab('lotlar')}
        >
          Lot Listesi ({filteredLots.length})
        </button>
        <button
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            tab === 'islemler'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-foreground'
          )}
          onClick={() => setTab('islemler')}
        >
          İşlemler ({islemlerData?.toplam || 0})
        </button>
      </div>

      {tab === 'lotlar' && (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Lot no, ürün adı veya konum ara..."
                    value={arama}
                    onChange={(e) => setArama(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={durumFilter} onValueChange={setDurumFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Durum filtrele" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TUMU">Tümü</SelectItem>
                    <SelectItem value="GECMIS">Geçmiş</SelectItem>
                    <SelectItem value="RISKLI">Riskli</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="SKTSIZ">SKT'siz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Lots Table */}
          <Card>
            <CardContent className="p-0">
              {raporLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredLots.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-secondary">
                  <CalendarClock className="h-12 w-12 mb-4 opacity-50" />
                  <p>SKT kaydı bulunamadı</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">Lot No</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Ürün</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Miktar</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">SKT</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Kalan Gün</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Durum</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Konum</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLots.map((lot) => {
                        const kalanGunInfo = getKalanGunLabel(lot.kalan_gun)
                        const durumBadge = getSktDurumBadge(lot.skt_durum)

                        return (
                          <tr
                            key={lot.id}
                            className={cn(
                              'border-b hover:bg-muted/30 transition-colors',
                              lot.skt_durum === 'SON_KULLANIM_GECDI' && 'bg-red-50/50',
                              lot.skt_durum === 'SON_KULLANIM_RISKLI' && 'bg-orange-50/50'
                            )}
                          >
                            <td className="px-4 py-3 font-mono text-sm">{lot.lot_no}</td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium">{lot.urun_ad}</p>
                                <p className="text-xs text-secondary">{lot.stok_tipi}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {lot.miktar} {lot.birim}
                            </td>
                            <td className="px-4 py-3 text-sm">{formatDate(lot.son_kullanma)}</td>
                            <td className={cn('px-4 py-3 text-sm font-medium', kalanGunInfo.className)}>
                              {kalanGunInfo.text}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={durumBadge.variant}>{durumBadge.label}</Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">{lot.konum || '-'}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDetail(lot)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {(lot.skt_durum === 'SON_KULLANIM_GECDI' ||
                                  lot.skt_durum === 'SON_KULLANIM_RISKLI') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenIslem(lot)}
                                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                  >
                                    <AlertTriangle className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'islemler' && (
        <Card>
          <CardContent className="p-0">
            {islemlerLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : !islemlerData?.data?.length ? (
              <div className="flex flex-col items-center justify-center h-48 text-secondary">
                <AlertTriangle className="h-12 w-12 mb-4 opacity-50" />
                <p>SKT işlemi bulunamadı</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium">İşlem Türü</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Lot No</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Ürün</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Miktar</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Durum</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Tarih</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Talep Eden</th>
                    </tr>
                  </thead>
                  <tbody>
                    {islemlerData.data.map((islem) => (
                      <tr key={islem.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getIslemTuruIcon(islem.islem_turu)}
                            <span className="font-medium">{islem.islem_turu}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">{islem.lot_no}</td>
                        <td className="px-4 py-3">{islem.urun_ad}</td>
                        <td className="px-4 py-3">
                          {islem.islem_miktari} {islem.birim}
                        </td>
                        <td className="px-4 py-3">{getIslemDurumBadge(islem.talep_durumu)}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(islem.talep_tarihi)}</td>
                        <td className="px-4 py-3 text-sm">{islem.talep_eden}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <IslemDialog
        open={islemDialogOpen}
        onOpenChange={setIslemDialogOpen}
        lot={selectedLot}
        onSubmit={handleCreateIslem}
        isLoading={createSktIslem.isPending}
      />

      <LotDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        lot={selectedLot}
      />
    </div>
  )
}
