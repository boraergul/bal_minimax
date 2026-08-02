import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Factory, Plus, Trash2, ArrowLeft, Calculator, Users, Zap, Clock, Package } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { format } from 'date-fns'

// ============ Types ============

interface Urun {
  id: string
  ad: string
  kategori: string
  stok_kodu: string | null
  birim_toptan: string
  aktif: boolean
}

interface HammaddeStok {
  urun_id: string
  urun_ad: string
  toplam_miktar: number
  birim: string
}

interface BomItem {
  id: string
  hammadde_id: string
  hammadde_ad: string
  lot_no: string
  miktar: number
  mevcut_stok: number
}

interface UretimCreateRequest {
  not_text?: string
  oncelik?: string
  planlanan_miktar?: number
  planlanan_tarih?: string
  detaylar: {
    mamul_urun_id: string
    mamul_miktar: number
    hammadde_urun_id: string
    hammadde_lot_no?: string
    hammadde_miktar: number
  }[]
}

// ============ Hooks ============

function useUrunler(params?: { sayfa?: number; sayfa_boyutu?: number; arama?: string; kategori?: string; aktif?: boolean }) {
  return useQuery({
    queryKey: ['urunler', params],
    queryFn: async () => {
      const response = await api.get('/urunler', { params })
      return response.data
    },
  })
}

function useMusteriler(params?: { sayfa?: number; sayfa_boyutu?: number; arama?: string; aktif?: boolean }) {
  return useQuery({
    queryKey: ['musteriler', params],
    queryFn: async () => {
      const response = await api.get('/musteriler', { params })
      return response.data
    },
  })
}

function useAnlikStok() {
  return useQuery({
    queryKey: ['anlikStok'],
    queryFn: async () => {
      const response = await api.get('/stok/anlik')
      return response.data.data || []
    },
  })
}

function useUretimMutations() {
  const createUretim = useMutation({
    mutationFn: async (data: UretimCreateRequest) => {
      const response = await api.post('/uretim', data)
      return response.data
    },
  })

  return { createUretim }
}

// ============ Helper Functions ============

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function formatDateForInput(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

// ============ Sub-Components ============

interface UrunSecimDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (urun: Urun) => void
  urunler: Urun[]
  isLoading: boolean
}

function UrunSecimDialog({ open, onOpenChange, onSelect, urunler, isLoading }: UrunSecimDialogProps) {
  const [arama, setArama] = useState('')

  const filteredUrunler = useMemo(() => {
    if (!urunler) return []
    if (!arama) return urunler
    const searchLower = arama.toLowerCase()
    return urunler.filter(
      (u) =>
        u.ad.toLowerCase().includes(searchLower) ||
        u.stok_kodu?.toLowerCase().includes(searchLower) ||
        u.kategori.toLowerCase().includes(searchLower)
    )
  }, [urunler, arama])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Mamul Seçimi</DialogTitle>
          <DialogDescription>
            Üretilecek mamul ürünü seçin
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Input
            placeholder="Ürün adı veya kod ile ara..."
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            className="pr-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : filteredUrunler.length === 0 ? (
            <div className="text-center py-8 text-secondary">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Ürün bulunamadı</p>
            </div>
          ) : (
            filteredUrunler.map((urun) => (
              <button
                key={urun.id}
                className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                onClick={() => {
                  onSelect(urun)
                  onOpenChange(false)
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{urun.ad}</p>
                    <p className="text-sm text-secondary">
                      {urun.stok_kodu && <span className="mr-2">{urun.stok_kodu}</span>}
                      <Badge variant="outline" className="text-xs">{urun.kategori}</Badge>
                    </p>
                  </div>
                  <Badge variant="secondary">{urun.birim_toptan}</Badge>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface HammaddeSecimDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (hammadde: HammaddeStok) => void
  hammaddeler: HammaddeStok[]
  isLoading: boolean
}

function HammaddeSecimDialog({ open, onOpenChange, onSelect, hammaddeler, isLoading }: HammaddeSecimDialogProps) {
  const [arama, setArama] = useState('')

  const filteredHammaddeler = useMemo(() => {
    if (!hammaddeler) return []
    if (!arama) return hammaddeler
    const searchLower = arama.toLowerCase()
    return hammaddeler.filter(
      (h) =>
        h.urun_ad.toLowerCase().includes(searchLower) ||
        h.urun_id.toLowerCase().includes(searchLower)
    )
  }, [hammaddeler, arama])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Hammadde Seçimi</DialogTitle>
          <DialogDescription>
            Üretimde kullanılacak hammaddeyi seçin
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Input
            placeholder="Hammadde adı ile ara..."
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            className="pr-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : filteredHammaddeler.length === 0 ? (
            <div className="text-center py-8 text-secondary">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Hammadde bulunamadı</p>
            </div>
          ) : (
            filteredHammaddeler.map((h) => (
              <button
                key={h.urun_id}
                className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                onClick={() => {
                  onSelect(h)
                  onOpenChange(false)
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{h.urun_ad}</p>
                    <p className="text-xs text-secondary font-mono">{h.urun_id.substring(0, 8)}...</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{h.toplam_miktar} {h.birim}</p>
                    <p className="text-xs text-secondary">Mevcut</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============ Main Component ============

export function UretimCreatePage() {
  const navigate = useNavigate()

  // Form state
  const [mamulId, setMamulId] = useState('')
  const [mamulAd, setMamulAd] = useState('')
  const [tarih, setTarih] = useState(formatDateForInput(new Date()))
  const [planlananMiktar, setPlanlananMiktar] = useState<number>(0)
  const [planlananTarih, setPlanlananTarih] = useState<string>('')
  const [oncelik, setOncelik] = useState<string>('NORMAL')
  const [notlar, setNotlar] = useState('')
  const [musteriId, setMusteriId] = useState<string>('')
  const [siparisNo, setSiparisNo] = useState('')

  // BOM state
  const [bomItems, setBomItems] = useState<BomItem[]>([])

  // Dialog states
  const [mamulDialogOpen, setMamulDialogOpen] = useState(false)
  const [hammaddeDialogOpen, setHammaddeDialogOpen] = useState(false)
  const [editingBomItem, setEditingBomItem] = useState<string | null>(null)

  // Planning estimates
  const [tahminiSure, setTahminiSure] = useState<number>(8)
  const [gerekliIsgucu, setGerekliIsgucu] = useState<number>(2)
  const [gerekliEnerji, setGerekliEnerji] = useState<number>(100)

  // Queries
  const { data: urunlerData, isLoading: urunlerLoading } = useUrunler({ aktif: true })
  const { data: musterilerData, isLoading: musterilerLoading } = useMusteriler({ aktif: true })
  const { data: stokData, isLoading: stokLoading } = useAnlikStok()

  const { createUretim } = useUretimMutations()

  const urunler = urunlerData?.data || []
  const musteriler = musterilerData?.data || []
  const hammaddeler: HammaddeStok[] = stokData || []

  // Mamuller (finished products) - filter products that are not raw materials
  const mamuller = useMemo(() => {
    return urunler.filter((u) => u.kategori !== 'HAMMADDE' && u.kategori !== 'YARIMAMUL')
  }, [urunler])

  // Filter hammaddeler by category
  const hammaddeListesi = useMemo(() => {
    return hammaddeler.filter((h) => {
      const urun = urunler.find((u) => u.id === h.urun_id)
      return urun?.kategori === 'HAMMADDE'
    })
  }, [hammaddeler, urunler])

  // Calculate totals
  const toplamHammaddeMiktari = useMemo(() => {
    return bomItems.reduce((sum, item) => sum + item.miktar, 0)
  }, [bomItems])

  const eksikMalzemeler = useMemo(() => {
    return bomItems.filter((item) => item.miktar > item.mevcut_stok)
  }, [bomItems])

  // Handlers
  const handleSelectMamul = (urun: Urun) => {
    setMamulId(urun.id)
    setMamulAd(urun.ad)
  }

  const handleAddBomItem = (hammadde: HammaddeStok) => {
    const yeniItem: BomItem = {
      id: generateId(),
      hammadde_id: hammadde.urun_id,
      hammadde_ad: hammadde.urun_ad,
      lot_no: '',
      miktar: 0,
      mevcut_stok: hammadde.toplam_miktar,
    }
    setBomItems([...bomItems, yeniItem])
  }

  const handleUpdateBomItem = (id: string, alan: keyof BomItem, deger: string | number) => {
    setBomItems(
      bomItems.map((item) =>
        item.id === id ? { ...item, [alan]: deger } : item
      )
    )
  }

  const handleRemoveBomItem = (id: string) => {
    setBomItems(bomItems.filter((item) => item.id !== id))
  }

  const handleSubmit = async () => {
    // Validation
    if (!mamulId) {
      alert('Lütfen mamul seçin')
      return
    }
    if (!planlananMiktar || planlananMiktar <= 0) {
      alert('Lütfen geçerli bir planlanan miktar girin')
      return
    }
    if (bomItems.length === 0) {
      alert('Lütfen en az bir hammadde ekleyin')
      return
    }
    if (bomItems.some((item) => !item.miktar || item.miktar <= 0)) {
      alert('Lütfen tüm hammadde miktarlarını girin')
      return
    }

    const requestData: UretimCreateRequest = {
      not_text: notlar || undefined,
      oncelik: oncelik,
      planlanan_miktar: planlananMiktar,
      planlanan_tarih: planlananTarih || undefined,
      detaylar: bomItems.map((item) => ({
        mamul_urun_id: mamulId,
        mamul_miktar: planlananMiktar,
        hammadde_urun_id: item.hammadde_id,
        hammadde_lot_no: item.lot_no || undefined,
        hammadde_miktar: item.miktar,
      })),
    }

    try {
      await createUretim.mutateAsync(requestData)
      navigate('/uretim')
    } catch (error) {
      console.error('Üretim oluşturma hatası:', error)
      alert('Üretim oluşturulurken hata oluştu')
    }
  }

  const getOncelikBadge = (priority: string) => {
    switch (priority) {
      case 'ACIL':
        return <Badge className="bg-red-100 text-red-800">Acil</Badge>
      case 'YUKSEK':
        return <Badge className="bg-orange-100 text-orange-800">Yüksek</Badge>
      case 'NORMAL':
        return <Badge className="bg-blue-100 text-blue-800">Normal</Badge>
      case 'DUSUK':
        return <Badge className="bg-gray-100 text-gray-800">Düşük</Badge>
      default:
        return <Badge variant="secondary">{priority}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/uretim')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Yeni Üretim Emri
            </h2>
            <p className="text-sm text-secondary">
              Üretim emri oluştur ve planlama yap
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/uretim')}>
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={createUretim.isPending}>
            {createUretim.isPending ? 'Oluşturuluyor...' : 'Üretim Oluştur'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Temel Bilgiler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mamul Selection */}
              <div className="space-y-2">
                <Label htmlFor="mamul">Mamul *</Label>
                <div className="flex gap-2">
                  <Input
                    id="mamul"
                    value={mamulAd}
                    readOnly
                    placeholder="Mamul seçmek için tıklayın..."
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={() => setMamulDialogOpen(true)}>
                    <Package className="h-4 w-4 mr-2" />
                    Seç
                  </Button>
                </div>
              </div>

              {/* Date and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tarih">Tarih</Label>
                  <Input
                    id="tarih"
                    type="date"
                    value={tarih}
                    onChange={(e) => setTarih(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="oncelik">Öncelik</Label>
                  <Select value={oncelik} onValueChange={setOncelik}>
                    <SelectTrigger id="oncelik">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACIL">Acil</SelectItem>
                      <SelectItem value="YUKSEK">Yüksek</SelectItem>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="DUSUK">Düşük</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quantity and Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planlanan-miktar">Planlanan Miktar *</Label>
                  <Input
                    id="planlanan-miktar"
                    type="number"
                    min={0}
                    value={planlananMiktar || ''}
                    onChange={(e) => setPlanlananMiktar(parseFloat(e.target.value) || 0)}
                    placeholder="Miktar girin"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planlanan-tarih">Planlanan Tarih</Label>
                  <Input
                    id="planlanan-tarih"
                    type="date"
                    value={planlananTarih}
                    onChange={(e) => setPlanlananTarih(e.target.value)}
                  />
                </div>
              </div>

              {/* Customer and Order */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="musteri">Müşteri (Opsiyonel)</Label>
                  <Select value={musteriId} onValueChange={setMusteriId}>
                    <SelectTrigger id="musteri">
                      <SelectValue placeholder="Müşteri seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Müşteri Yok</SelectItem>
                      {musteriler.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.ad}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siparis-no">Sipariş No (Opsiyonel)</Label>
                  <Input
                    id="siparis-no"
                    value={siparisNo}
                    onChange={(e) => setSiparisNo(e.target.value)}
                    placeholder="Sipariş numarası"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notlar">Notlar</Label>
                <textarea
                  id="notlar"
                  value={notlar}
                  onChange={(e) => setNotlar(e.target.value)}
                  placeholder="Ek notlar..."
                  className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                />
              </div>
            </CardContent>
          </Card>

          {/* BOM Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Üretim Malzeme Listesi (BOM)</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setHammaddeDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Malzeme Ekle
              </Button>
            </CardHeader>
            <CardContent>
              {bomItems.length === 0 ? (
                <div className="text-center py-8 text-secondary">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Henüz malzeme eklenmedi</p>
                  <p className="text-sm">Yukarıdaki butondan hammadde ekleyin</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-2 text-sm font-medium text-secondary px-2">
                    <div className="col-span-4">Hammadde</div>
                    <div className="col-span-2">Lot No</div>
                    <div className="col-span-2">Miktar</div>
                    <div className="col-span-2">Mevcut</div>
                    <div className="col-span-1"></div>
                    <div className="col-span-1"></div>
                  </div>
                  {bomItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'grid grid-cols-12 gap-2 items-center p-2 rounded-lg',
                        item.miktar > item.mevcut_stok && 'bg-red-50 border border-red-200'
                      )}
                    >
                      <div className="col-span-4">
                        <p className="font-medium text-sm">{item.hammadde_ad}</p>
                      </div>
                      <div className="col-span-2">
                        <Input
                          value={item.lot_no}
                          onChange={(e) => handleUpdateBomItem(item.id, 'lot_no', e.target.value)}
                          placeholder="Lot no"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min={0}
                          value={item.miktar || ''}
                          onChange={(e) => handleUpdateBomItem(item.id, 'miktar', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <span className={cn(
                          'text-sm',
                          item.miktar > item.mevcut_stok ? 'text-red-600 font-medium' : 'text-secondary'
                        )}>
                          {item.mevcut_stok}
                        </span>
                      </div>
                      <div className="col-span-1 text-center">
                        {item.miktar > item.mevcut_stok && (
                          <Badge variant="destructive" className="text-xs">Yetersiz</Badge>
                        )}
                      </div>
                      <div className="col-span-1 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveBomItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Priority Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Öncelik</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center py-4">
                {getOncelikBadge(oncelik)}
              </div>
            </CardContent>
          </Card>

          {/* Planning Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Planlama Tahminleri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tahmini-sure" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-secondary" />
                  Tahmini Süre (saat)
                </Label>
                <Input
                  id="tahmini-sure"
                  type="number"
                  min={0}
                  value={tahminiSure}
                  onChange={(e) => setTahminiSure(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isgucu" className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-secondary" />
                  Gerekli İşgücü (kişi)
                </Label>
                <Input
                  id="isgucu"
                  type="number"
                  min={0}
                  value={gerekliIsgucu}
                  onChange={(e) => setGerekliIsgucu(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="enerji" className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-secondary" />
                  Gerekli Enerji (kWh)
                </Label>
                <Input
                  id="enerji"
                  type="number"
                  min={0}
                  value={gerekliEnerji}
                  onChange={(e) => setGerekliEnerji(parseInt(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Özet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Mamul:</span>
                <span className="font-medium">{mamulAd || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Miktar:</span>
                <span className="font-medium">{planlananMiktar || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Malzeme Sayısı:</span>
                <span className="font-medium">{bomItems.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Toplam Malzeme:</span>
                <span className="font-medium">{toplamHammaddeMiktari.toFixed(2)}</span>
              </div>
              {eksikMalzemeler.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <span className="font-medium">{eksikMalzemeler.length} malzeme yetersiz</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <UrunSecimDialog
        open={mamulDialogOpen}
        onOpenChange={setMamulDialogOpen}
        onSelect={handleSelectMamul}
        urunler={mamuller}
        isLoading={urunlerLoading}
      />

      <HammaddeSecimDialog
        open={hammaddeDialogOpen}
        onOpenChange={setHammaddeDialogOpen}
        onSelect={handleAddBomItem}
        hammaddeler={hammaddeListesi}
        isLoading={stokLoading}
      />
    </div>
  )
}
