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
  Check,
  XCircle,
  Settings,
  Lightbulb,
  Package,
  TrendingDown,
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
import { format, parseISO, isValid, differenceInDays } from 'date-fns'
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
  hedef_bolge?: string
  yeni_fiyat?: number
  imha_yontemi?: string
}

export interface SktIslemCreateRequest {
  stok_id: string
  islem_turu: 'IMHA' | 'INDIRIM' | 'DEVIR' | 'IADE' | 'DONURMA'
  islem_miktari: number
  indirim_orani?: number
  gerekce: string
  not_text?: string
  hedef_bolge?: string
  yeni_fiyat?: number
  imha_yontemi?: string
}

export interface LotOnerisi {
  lot_no: string
  stok_id: string
  urun_ad: string
  miktar: number
  birim: string
  kalan_gun: number
  skt: string
  konum: string | null
  strateji: 'FEFO' | 'FIFO'
  oncelik: number
}

export interface SktEsik {
  risk_esigi_gun: number
  kritik_esigi_gun: number
  urun_esikleri: {
    urun_id: string
    urun_ad: string
    risk_esigi: number
    kritik_esigi: number
  }[]
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

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '-'
  try {
    const date = parseISO(dateStr)
    if (!isValid(date)) return '-'
    return format(date, 'dd.MM.yyyy')
  } catch {
    return '-'
  }
}

function getKalanGunLabel(kalanGun: number | null): { text: string; className: string } {
  if (kalanGun === null) return { text: 'SKT Yok', className: 'text-secondary' }
  if (kalanGun < 0) return { text: `${Math.abs(kalanGun)} gün geçmiş`, className: 'text-red-600 font-semibold' }
  if (kalanGun === 0) return { text: 'Bugün son', className: 'text-red-600 font-semibold' }
  if (kalanGun <= 7) return { text: `${kalanGun} gün kaldı`, className: 'text-red-600 font-semibold' }
  if (kalanGun <= 30) return { text: `${kalanGun} gün kaldı`, className: 'text-orange-600 font-medium' }
  if (kalanGun <= 60) return { text: `${kalanGun} gün kaldı`, className: 'text-yellow-600' }
  return { text: `${kalanGun} gün kaldı`, className: 'text-green-600' }
}

function getSktDurumBadge(sktDurum: SktLot['skt_durum']): { label: string; variant: 'destructive' | 'secondary' | 'default'; className: string } {
  switch (sktDurum) {
    case 'SON_KULLANIM_GECDI':
      return { label: 'Süresi Dolmuş', variant: 'destructive', className: 'bg-red-100 text-red-800' }
    case 'SON_KULLANIM_RISKLI':
      return { label: 'Riskli', variant: 'default', className: 'bg-orange-100 text-orange-800' }
    case 'NORMAL':
      return { label: 'Normal', variant: 'secondary', className: 'bg-green-100 text-green-800' }
    case 'SKT_YOK':
    default:
      return { label: 'SKT Yok', variant: 'secondary', className: 'bg-gray-100 text-gray-800' }
  }
}

function getRowColor(kalanGun: number | null, esik: number): string {
  if (kalanGun === null) return ''
  if (kalanGun < 0) return 'bg-red-50'
  if (kalanGun < 7) return 'bg-red-50'
  if (kalanGun < 30) return 'bg-orange-50'
  if (kalanGun < 60) return 'bg-yellow-50'
  return ''
}

// ============ Hooks ============

function useSktRapor(params?: { durum_filter?: string; urun_id?: string; depo_id?: string; baslangic?: string; bitis?: string }) {
  return useQuery<SktRapor>({
    queryKey: ['skt-rapor', params],
    queryFn: async () => {
      const response = await api.get('/stok/skt/rapor', { params })
      return response.data
    },
  })
}

function useSktLotOnerisi(urunId: string, miktar: number, stokTipi?: string) {
  return useQuery<{ data: LotOnerisi[] }>({
    queryKey: ['skt-lot-onerisi', urunId, miktar, stokTipi],
    queryFn: async () => {
      const response = await api.get('/stok/skt/lot-onerisi', {
        params: { urun_id: urunId, miktar, stok_tipi: stokTipi },
      })
      return response.data
    },
    enabled: !!urunId && !!miktar,
  })
}

function useSktIslemler(params?: { sayfa?: number; sayfa_boyutu?: number; durum?: string }) {
  return useQuery<{ data: SktIslem[]; toplam: number }>({
    queryKey: ['skt-islemler', params],
    queryFn: async () => {
      const response = await api.get('/stok/skt/islemler', { params })
      return response.data
    },
  })
}

function useSktEsik() {
  return useQuery<SktEsik>({
    queryKey: ['skt-esik'],
    queryFn: async () => {
      const response = await api.get('/stok/skt/esik')
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

  const approveIslem = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/stok/skt/islemler/${id}/onayla`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skt-rapor'] })
      queryClient.invalidateQueries({ queryKey: ['skt-islemler'] })
    },
  })

  const rejectIslem = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/stok/skt/islemler/${id}/reddet`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skt-islemler'] })
    },
  })

  const updateEsik = useMutation({
    mutationFn: async (data: { risk_esigi_gun?: number; kritik_esigi_gun?: number }) => {
      const response = await api.put('/stok/skt/esik', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skt-esik'] })
      queryClient.invalidateQueries({ queryKey: ['skt-rapor'] })
    },
  })

  return { createSktIslem, approveIslem, rejectIslem, updateEsik }
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
  const [hedefBolge, setHedefBolge] = useState<string>('')
  const [imhaYontemi, setImhaYontemi] = useState<string>('')
  const [gereke, setGereke] = useState<string>('')
  const [notText, setNotText] = useState<string>('')

  const handleSubmit = () => {
    if (!lot || !islemTuru) return

    onSubmit({
      stok_id: lot.id,
      islem_turu: islemTuru,
      islem_miktari: islemMiktari || lot.miktar,
      indirim_orani: islemTuru === 'INDIRIM' ? indirimOrani : undefined,
      hedef_bolge: islemTuru === 'DEVIR' ? hedefBolge : undefined,
      imha_yontemi: islemTuru === 'IMHA' ? imhaYontemi : undefined,
      gerekce: gereke,
      not_text: notText || undefined,
    })

    // Reset form
    setIslemTuru('')
    setIslemMiktari(0)
    setIndirimOrani(0)
    setHedefBolge('')
    setImhaYontemi('')
    setGereke('')
    setNotText('')
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
                <p className="font-medium">{formatDateShort(lot.son_kullanma)}</p>
              </div>
              <div>
                <p className="text-xs text-secondary">Kalan Gün</p>
                <p className={cn('font-medium', getKalanGunLabel(lot.kalan_gun).className)}>
                  {getKalanGunLabel(lot.kalan_gun).text}
                </p>
              </div>
              <div>
                <p className="text-xs text-secondary">Durum</p>
                <Badge className={getSktDurumBadge(lot.skt_durum).className}>
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

            {/* Target Area (only for DEVIR) */}
            {islemTuru === 'DEVIR' && (
              <div className="space-y-2">
                <Label htmlFor="hedef-bolge">Hedef Bölge</Label>
                <Input
                  id="hedef-bolge"
                  value={hedefBolge}
                  onChange={(e) => setHedefBolge(e.target.value)}
                  placeholder="Örn: İndirimli Ürünler Rafı"
                />
              </div>
            )}

            {/* Destruction Method (only for IMHA) */}
            {islemTuru === 'IMHA' && (
              <div className="space-y-2">
                <Label htmlFor="imha-yontemi">İmha Yöntemi</Label>
                <Select value={imhaYontemi} onValueChange={setImhaYontemi}>
                  <SelectTrigger id="imha-yontemi">
                    <SelectValue placeholder="İmha yöntemi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GERI_DONUSUM">Geri Dönüşüm</SelectItem>
                    <SelectItem value="YAKMA">Yakma</SelectItem>
                    <SelectItem value="ZORUNLU_DEPOLAMA">Zorunlu Depolama</SelectItem>
                    <SelectItem value="DIGER">Diğer</SelectItem>
                  </SelectContent>
                </Select>
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
              <Badge className={getSktDurumBadge(lot.skt_durum).className}>
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

interface LotOnerisiDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  urunId: string
  miktar: number
  stokTipi?: string
}

function LotOnerisiDialog({ open, onOpenChange, urunId, miktar, stokTipi }: LotOnerisiDialogProps) {
  const { data: oneriler, isLoading } = useSktLotOnerisi(urunId, miktar, stokTipi)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Lot Önerisi
          </DialogTitle>
          <DialogDescription>
            {miktar} birim için FEFO/FIFO stratejisine göre önerilen lotlar
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : !oneriler?.data?.length ? (
            <div className="text-center py-8 text-secondary">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Bu ürün için uygun lot bulunamadı</p>
            </div>
          ) : (
            <div className="space-y-3">
              {oneriler.data.map((oneri, index) => (
                <div
                  key={`${oneri.lot_no}-${index}`}
                  className={cn(
                    'p-4 rounded-lg border',
                    oneri.strateji === 'FEFO' ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold',
                        oneri.strateji === 'FEFO' ? 'bg-blue-500' : 'bg-purple-500'
                      )}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-mono font-medium">{oneri.lot_no}</p>
                        <p className="text-sm text-secondary">
                          {oneri.miktar} {oneri.birim} • {oneri.konum || 'Konum belirtilmemiş'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={oneri.strateji === 'FEFO' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                        {oneri.strateji}
                      </Badge>
                      <p className={cn('text-sm mt-1', getKalanGunLabel(oneri.kalan_gun).className)}>
                        {getKalanGunLabel(oneri.kalan_gun).text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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

interface EsikAyarlariDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  esik: SktEsik | undefined
  onUpdate: (data: { risk_esigi_gun?: number; kritik_esigi_gun?: number }) => void
  isLoading: boolean
}

function EsikAyarlariDialog({ open, onOpenChange, esik, onUpdate, isLoading }: EsikAyarlariDialogProps) {
  const [riskEsigi, setRiskEsigi] = useState<number>(esik?.risk_esigi_gun || 30)
  const [kritikEsigi, setKritikEsigi] = useState<number>(esik?.kritik_esigi_gun || 7)

  const handleSave = () => {
    onUpdate({
      risk_esigi_gun: riskEsigi,
      kritik_esigi_gun: kritikEsigi,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Eşik Ayarları
          </DialogTitle>
          <DialogDescription>
            SKT uyarı eşiklerini yapılandırın
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
            <div className="space-y-2">
              <Label htmlFor="risk-esigi" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Risk Eşiği (gün)
              </Label>
              <Input
                id="risk-esigi"
                type="number"
                min={1}
                max={365}
                value={riskEsigi}
                onChange={(e) => setRiskEsigi(parseInt(e.target.value) || 30)}
              />
              <p className="text-xs text-secondary">
                Bu gün sayısından az SKT kalan lotlar "Riskli" olarak işaretlenir
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <div className="space-y-2">
              <Label htmlFor="kritik-esigi" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Kritik Eşik (gün)
              </Label>
              <Input
                id="kritik-esigi"
                type="number"
                min={1}
                max={365}
                value={kritikEsigi}
                onChange={(e) => setKritikEsigi(parseInt(e.target.value) || 7)}
              />
              <p className="text-xs text-secondary">
                Bu gün sayısından az SKT kalan lotlar "Kritik" olarak işaretlenir
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={handleSave} disabled={isLoading} loading={isLoading}>
            Kaydet
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
  const [tab, setTab] = useState<'rapor' | 'islemler' | 'esikler'>('rapor')
  const [selectedLot, setSelectedLot] = useState<SktLot | null>(null)
  const [islemDialogOpen, setIslemDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [onerisiDialogOpen, setOnerisiDialogOpen] = useState(false)
  const [esikDialogOpen, setEsikDialogOpen] = useState(false)
  const [onerisiUrunId, setOnerisiUrunId] = useState<string>('')
  const [onerisiMiktar, setOnerisiMiktar] = useState<number>(0)
  const [onerisiStokTipi, setOnerisiStokTipi] = useState<string>('')

  // Filters
  const [urunFilter, setUrunFilter] = useState<string>('')
  const [depoFilter, setDepoFilter] = useState<string>('')
  const [tarihBaslangic, setTarihBaslangic] = useState<string>('')
  const [tarihBitis, setTarihBitis] = useState<string>('')

  // Queries
  const { data: sktRapor, isLoading: raporLoading } = useSktRapor({
    durum_filter: durumFilter !== 'TUMU' ? durumFilter : undefined,
    urun_id: urunFilter || undefined,
    depo_id: depoFilter || undefined,
    baslangic: tarihBaslangic || undefined,
    bitis: tarihBitis || undefined,
  })
  const { data: islemlerData, isLoading: islemlerLoading } = useSktIslemler({
    durum: 'BEKLIYOR',
  })
  const { data: esikData, isLoading: esikLoading } = useSktEsik()
  const { createSktIslem, approveIslem, rejectIslem, updateEsik } = useSktMutations()

  // Filtered lots
  const filteredLots = useMemo(() => {
    if (!sktRapor?.data) return []

    let lots = [...sktRapor.data]

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

  const handleOpenOnerisi = (lot?: SktLot) => {
    setOnerisiUrunId(lot?.urun_id || '')
    setOnerisiMiktar(lot?.miktar || 0)
    setOnerisiStokTipi(lot?.stok_tipi || '')
    setOnerisiDialogOpen(true)
  }

  const handleCreateIslem = async (data: SktIslemCreateRequest) => {
    await createSktIslem.mutateAsync(data)
    setIslemDialogOpen(false)
    setSelectedLot(null)
  }

  const handleApprove = async (id: string) => {
    await approveIslem.mutateAsync(id)
  }

  const handleReject = async (id: string) => {
    await rejectIslem.mutateAsync(id)
  }

  const handleUpdateEsik = (data: { risk_esigi_gun?: number; kritik_esigi_gun?: number }) => {
    updateEsik.mutate(data)
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
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Bekliyor</Badge>
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

  // Get unique products for filter
  const uniqueUrunler = useMemo(() => {
    if (!sktRapor?.data) return []
    const map = new Map<string, string>()
    sktRapor.data.forEach((lot) => {
      if (!map.has(lot.urun_id)) {
        map.set(lot.urun_id, lot.urun_ad)
      }
    })
    return Array.from(map.entries()).map(([id, ad]) => ({ id, ad }))
  }, [sktRapor?.data])

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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-secondary">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span>Risk eşiği: {uyariEsigi} gün</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEsikDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Eşik Ayarları
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Toplam Lot"
          value={istatistikler?.toplam_lot || 0}
          subtitle={`₺${istatistikler?.toplam_deger?.toFixed(0) || 0}`}
          icon={Package}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
        />
        <StatsCard
          title="Kritik (SKT < 7)"
          value={istatistikler?.gecmis_lot || 0}
          subtitle={`₺${istatistikler?.gecmis_deger?.toFixed(0) || 0}`}
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBg="bg-red-100"
          alert={!!(istatistikler?.gecmis_lot && istatistikler.gecmis_lot > 0)}
        />
        <StatsCard
          title="Riskli (SKT < 30)"
          value={istatistikler?.riskli_lot || 0}
          subtitle={`₺${istatistikler?.riskli_deger?.toFixed(0) || 0}`}
          icon={TrendingDown}
          iconColor="text-orange-600"
          iconBg="bg-orange-100"
          alert={!!(istatistikler?.riskli_lot && istatistikler.riskli_lot > 0)}
        />
        <StatsCard
          title="Bekleyen İşlem"
          value={islemlerData?.toplam || 0}
          icon={Settings}
          iconColor="text-yellow-600"
          iconBg="bg-yellow-100"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            tab === 'rapor'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-foreground'
          )}
          onClick={() => setTab('rapor')}
        >
          SKT Raporu
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
          İşlemler
        </button>
        <button
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            tab === 'esikler'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-foreground'
          )}
          onClick={() => setTab('esikler')}
        >
          Eşik Ayarları
        </button>
      </div>

      {/* SKT Raporu Tab */}
      {tab === 'rapor' && (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
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
                  <SelectTrigger className="w-full lg:w-[180px]">
                    <SelectValue placeholder="Durum filtrele" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TUMU">Tümü</SelectItem>
                    <SelectItem value="GECMIS">Kritik</SelectItem>
                    <SelectItem value="RISKLI">Riskli</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="SKTSIZ">SKT'siz</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => handleOpenOnerisi()}>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Lot Önerisi Al
                </Button>
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
                        <th className="px-4 py-3 text-left text-sm font-medium">Gün Kaldı</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Durum</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Konum</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLots.map((lot) => {
                        const kalanGunInfo = getKalanGunLabel(lot.kalan_gun)
                        const durumBadge = getSktDurumBadge(lot.skt_durum)
                        const rowColor = getRowColor(lot.kalan_gun, uyariEsigi)

                        return (
                          <tr
                            key={lot.id}
                            className={cn(
                              'border-b hover:bg-muted/30 transition-colors',
                              rowColor
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
                            <td className="px-4 py-3 text-sm">{formatDateShort(lot.son_kullanma)}</td>
                            <td className={cn('px-4 py-3 text-sm font-medium', kalanGunInfo.className)}>
                              {kalanGunInfo.text}
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={durumBadge.className}>
                                {durumBadge.label}
                              </Badge>
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenOnerisi(lot)}
                                  title="Lot önerisi al"
                                >
                                  <Lightbulb className="h-4 w-4" />
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

      {/* İşlemler Tab */}
      {tab === 'islemler' && (
        <>
          {/* Pending Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bekleyen Talepler</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {islemlerLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : !islemlerData?.data?.length ? (
                <div className="flex flex-col items-center justify-center h-32 text-secondary">
                  <Check className="h-12 w-12 mb-4 opacity-50" />
                  <p>Bekleyen işlem talebi yok</p>
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
                        <th className="px-4 py-3 text-left text-sm font-medium">Talep Eden</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Tarih</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Onay/Red</th>
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
                          <td className="px-4 py-3 text-sm">{islem.talep_eden}</td>
                          <td className="px-4 py-3 text-sm">{formatDateShort(islem.talep_tarihi)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleApprove(islem.id)}
                                disabled={approveIslem.isPending}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Onayla
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleReject(islem.id)}
                                disabled={rejectIslem.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reddet
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Talep Geçmişi</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
                    {islemlerLoading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                        </td>
                      </tr>
                    ) : (
                      islemlerData?.data?.map((islem) => (
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
                          <td className="px-4 py-3 text-sm">{formatDateShort(islem.talep_tarihi)}</td>
                          <td className="px-4 py-3 text-sm">{islem.talep_eden}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Eşik Ayarları Tab */}
      {tab === 'esikler' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Mevcut Eşik Ayarları
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="p-6 rounded-lg bg-orange-50 border border-orange-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <AlertTriangle className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Risk Eşiği</p>
                      <p className="text-sm text-secondary">Riskli lot uyarısı için gün limiti</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-orange-600">
                    {esikData?.risk_esigi_gun || 30} gün
                  </div>
                </div>

                <div className="p-6 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-red-100">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Kritik Eşik</p>
                      <p className="text-sm text-secondary">Kritik lot uyarısı için gün limiti</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-red-600">
                    {esikData?.kritik_esigi_gun || 7} gün
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Button variant="outline" onClick={() => setEsikDialogOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Eşikleri Düzenle
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Color Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Durum Renk Kodları</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-red-500"></div>
                  <div>
                    <p className="font-medium">Kritik (SKT &lt; 7 gün veya süresi dolmuş)</p>
                    <p className="text-sm text-secondary">Hemen işlem yapılması gerekiyor</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-orange-500"></div>
                  <div>
                    <p className="font-medium">Riskli (SKT &lt; 30 gün)</p>
                    <p className="text-sm text-secondary">Planlama yapılması öneriliyor</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-yellow-500"></div>
                  <div>
                    <p className="font-medium">Dikkat (SKT &lt; 60 gün)</p>
                    <p className="text-sm text-secondary">İzlenmesi gereken lotlar</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-green-500"></div>
                  <div>
                    <p className="font-medium">Normal (SKT ≥ 60 gün)</p>
                    <p className="text-sm text-secondary">Güvenli stok durumu</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
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

      <LotOnerisiDialog
        open={onerisiDialogOpen}
        onOpenChange={setOnerisiDialogOpen}
        urunId={onerisiUrunId}
        miktar={onerisiMiktar}
        stokTipi={onerisiStokTipi}
      />

      <EsikAyarlariDialog
        open={esikDialogOpen}
        onOpenChange={setEsikDialogOpen}
        esik={esikData}
        onUpdate={handleUpdateEsik}
        isLoading={updateEsik.isPending}
      />
    </div>
  )
}
