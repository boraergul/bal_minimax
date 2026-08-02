import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Scale, Plus, Search, Calculator, ArrowRight,
  Edit, Trash2, Download, Upload, RefreshCw, Check
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

interface Birim {
  id: string
  ad: string
  kisa_ad: string
  birim_tipi: 'AGIRLIK' | 'ADET' | ' HACIM' | 'OZEL'
  aktif: boolean
  olusturma_tarihi: string
}

interface BirimDonusum {
  id: string
  kaynak_birim_id: string
  hedef_birim_id: string
  kaynak_birim_ad: string
  hedef_birim_ad: string
  donusum_orani: number
  ters_oran: number | null
  aktif: boolean
}

const birimTipiLabels: Record<string, string> = {
  AGIRLIK: 'Ağırlık',
  ADET: 'Adet',
  HACIM: 'Hacim',
  OZEL: 'Özel',
}

const birimTipiColors: Record<string, string> = {
  AGIRLIK: 'bg-amber-100 text-amber-800',
  ADET: 'bg-blue-100 text-blue-800',
  HACIM: 'bg-purple-100 text-purple-800',
  OZEL: 'bg-gray-100 text-gray-800',
}

export function BirimDonusumPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'birimler' | 'donusumler'>('birimler')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTip, setFilterTip] = useState<string>('hepsi')
  const [showBirimDialog, setShowBirimDialog] = useState(false)
  const [showDonusumDialog, setShowDonusumDialog] = useState(false)
  const [editingBirim, setEditingBirim] = useState<Birim | null>(null)
  const [editingDonusum, setEditingDonusum] = useState<BirimDonusum | null>(null)

  // Calculator state
  const [calcValue, setCalcValue] = useState<string>('')
  const [calcFromUnit, setCalcFromUnit] = useState<string>('')
  const [calcToUnit, setCalcToUnit] = useState<string>('')
  const [calcResult, setCalcResult] = useState<number | null>(null)

  const params = {
    ...(filterTip !== 'hepsi' && { birim_tipi: filterTip }),
    aktif: true,
  }

  const { data: birimlerData, isLoading: loadingBirimler } = useQuery({
    queryKey: ['birimler', params],
    queryFn: async () => {
      const response = await api.get('/birim', { params })
      return response.data
    },
  })

  const { data: donusumlerData, isLoading: loadingDonusumler } = useQuery({
    queryKey: ['birim-donusum'],
    queryFn: async () => {
      const response = await api.get('/birim/donusum')
      return response.data
    },
  })

  const birimler: Birim[] = birimlerData?.data || []
  const donusumler: BirimDonusum[] = donusumlerData?.data || []

  const filteredBirimler = birimler.filter((birim) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        birim.ad.toLowerCase().includes(query) ||
        birim.kisa_ad.toLowerCase().includes(query)
      )
    }
    return true
  })

  const filteredDonusumler = donusumler.filter((donusum) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        donusum.kaynak_birim_ad.toLowerCase().includes(query) ||
        donusum.hedef_birim_ad.toLowerCase().includes(query)
      )
    }
    return true
  })

  // Find conversion for calculator
  const findConversion = () => {
    if (!calcFromUnit || !calcToUnit || !calcValue) {
      setCalcResult(null)
      return
    }

    const value = parseFloat(calcValue)
    if (isNaN(value)) {
      setCalcResult(null)
      return
    }

    // Find direct conversion
    const direct = donusumler.find(
      (d) =>
        d.kaynak_birim_id === calcFromUnit &&
        d.hedef_birim_id === calcToUnit
    )

    if (direct) {
      setCalcResult(value * direct.donusum_orani)
      return
    }

    // Find reverse conversion
    const reverse = donusumler.find(
      (d) =>
        d.kaynak_birim_id === calcToUnit &&
        d.hedef_birim_id === calcFromUnit
    )

    if (reverse && reverse.ters_oran) {
      setCalcResult(value * reverse.ters_oran)
      return
    }

    // Try through intermediate unit (e.g., kg -> g -> mg)
    for (const d1 of donusumler) {
      if (d1.kaynak_birim_id === calcFromUnit) {
        for (const d2 of donusumler) {
          if (d2.kaynak_birim_id === d1.hedef_birim_id && d2.hedef_birim_id === calcToUnit) {
            setCalcResult(value * d1.donusum_orani * d2.donusum_orani)
            return
          }
        }
      }
    }

    setCalcResult(null)
  }

  // Mutations
  const createBirimMutation = useMutation({
    mutationFn: async (data: Partial<Birim>) => {
      const response = await api.post('/birim', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['birimler'] })
      setShowBirimDialog(false)
      setEditingBirim(null)
    },
  })

  const updateBirimMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Birim> & { id: string }) => {
      const response = await api.put(`/birim/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['birimler'] })
      setShowBirimDialog(false)
      setEditingBirim(null)
    },
  })

  const deleteBirimMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/birim/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['birimler'] })
    },
  })

  const createDonusumMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/birim/donusum', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['birim-donusum'] })
      setShowDonusumDialog(false)
      setEditingDonusum(null)
    },
  })

  const deleteDonusumMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/birim/donusum/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['birim-donusum'] })
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Birim Dönüşümleri
          </h2>
          <p className="text-sm text-secondary">
            {birimler.length} birim, {donusumler.length} dönüşüm tanımı
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {}}>
            <Download className="h-4 w-4 mr-2" />
            Dışa Aktar
          </Button>
          <Button variant="outline" onClick={() => {}}>
            <Upload className="h-4 w-4 mr-2" />
            İçe Aktar
          </Button>
          <Button onClick={() => setShowBirimDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Birim
          </Button>
          <Button variant="outline" onClick={() => setShowDonusumDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Dönüşüm
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 border-b">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'birimler'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-secondary hover:text-foreground'
              }`}
              onClick={() => setActiveTab('birimler')}
            >
              Birimler ({birimler.length})
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'donusumler'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-secondary hover:text-foreground'
              }`}
              onClick={() => setActiveTab('donusumler')}
            >
              Dönüşümler ({donusumler.length})
            </button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {activeTab === 'birimler' && (
                  <Select value={filterTip} onValueChange={setFilterTip}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Birim Tipi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hepsi">Tüm Tipler</SelectItem>
                      <SelectItem value="AGIRLIK">Ağırlık</SelectItem>
                      <SelectItem value="ADET">Adet</SelectItem>
                      <SelectItem value="HACIM">Hacim</SelectItem>
                      <SelectItem value="OZEL">Özel</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Birimler Tab */}
          {activeTab === 'birimler' && (
            <Card>
              <CardContent className="p-0">
                {loadingBirimler ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredBirimler.length === 0 ? (
                  <div className="text-center py-12 text-secondary">
                    <Scale className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Birim bulunamadı</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-3 text-left text-sm font-medium">Birim Adı</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Kısa Ad</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Tip</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Durum</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBirimler.map((birim) => (
                          <tr key={birim.id} className="border-b hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium">{birim.ad}</td>
                            <td className="px-4 py-3 font-mono">{birim.kisa_ad}</td>
                            <td className="px-4 py-3">
                              <Badge className={birimTipiColors[birim.birim_tipi] || 'bg-gray-100'}>
                                {birimTipiLabels[birim.birim_tipi] || birim.birim_tipi}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={birim.aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {birim.aktif ? 'Aktif' : 'Pasif'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingBirim(birim)
                                    setShowBirimDialog(true)
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteBirimMutation.mutate(birim.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
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
          )}

          {/* Dönüşümler Tab */}
          {activeTab === 'donusumler' && (
            <Card>
              <CardContent className="p-0">
                {loadingDonusumler ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredDonusumler.length === 0 ? (
                  <div className="text-center py-12 text-secondary">
                    <RefreshCw className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Dönüşüm bulunamadı</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-3 text-left text-sm font-medium">Kaynak Birim</th>
                          <th className="px-4 py-3 text-center text-sm font-medium"></th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Hedef Birim</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Oran</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDonusumler.map((donusum) => (
                          <tr key={donusum.id} className="border-b hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono">{donusum.kaynak_birim_ad}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <ArrowRight className="h-4 w-4 text-muted-foreground inline" />
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono">{donusum.hedef_birim_ad}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              1 = {donusum.donusum_orani}
                              {donusum.ters_oran && (
                                <span className="text-xs text-secondary ml-2">
                                  (ters: 1 = {donusum.ters_oran.toFixed(6)})
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteDonusumMutation.mutate(donusum.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
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
          )}
        </div>

        {/* Calculator Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Çevirici</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Miktar</Label>
                  <Input
                    type="number"
                    value={calcValue}
                    onChange={(e) => {
                      setCalcValue(e.target.value)
                      setCalcResult(null)
                    }}
                    placeholder="Değer girin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kaynak Birim</Label>
                  <Select value={calcFromUnit} onValueChange={(v) => { setCalcFromUnit(v); setCalcResult(null) }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Birim seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {birimler.map((birim) => (
                        <SelectItem key={birim.id} value={birim.id}>
                          {birim.ad} ({birim.kisa_ad})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                </div>
                <div className="space-y-2">
                  <Label>Hedef Birim</Label>
                  <Select value={calcToUnit} onValueChange={(v) => { setCalcToUnit(v); setCalcResult(null) }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Birim seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {birimler.map((birim) => (
                        <SelectItem key={birim.id} value={birim.id}>
                          {birim.ad} ({birim.kisa_ad})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={findConversion}
                  disabled={!calcFromUnit || !calcToUnit || !calcValue}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Çevir
                </Button>
                {calcResult !== null && (
                  <div className="p-4 bg-primary/10 rounded-lg text-center">
                    <p className="text-2xl font-bold text-primary">
                      {calcResult.toLocaleString('tr-TR', { maximumFractionDigits: 6 })}
                    </p>
                    <p className="text-sm text-secondary">
                      {birimler.find((b) => b.id === calcToUnit)?.ad}
                    </p>
                  </div>
                )}
                {calcResult === null && calcFromUnit && calcToUnit && calcValue && (
                  <div className="p-4 bg-muted rounded-lg text-center text-sm text-secondary">
                    Dönüşüm tanımı bulunamadı
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Reference */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Popüler Dönüşümler</h3>
              <div className="space-y-3">
                {donusumler.slice(0, 5).map((donusum) => (
                  <div key={donusum.id} className="text-sm flex items-center justify-between">
                    <span className="text-secondary">
                      {donusum.kaynak_birim_ad} → {donusum.hedef_birim_ad}
                    </span>
                    <span className="font-mono">{donusum.donusum_orani}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Birim Dialog */}
      <BirimDialog
        open={showBirimDialog}
        onOpenChange={setShowBirimDialog}
        birim={editingBirim}
        onSave={(data) => {
          if (editingBirim) {
            updateBirimMutation.mutate({ id: editingBirim.id, ...data })
          } else {
            createBirimMutation.mutate(data)
          }
        }}
        isLoading={createBirimMutation.isPending || updateBirimMutation.isPending}
      />

      {/* Dönüşüm Dialog */}
      <DonusumDialog
        open={showDonusumDialog}
        onOpenChange={setShowDonusumDialog}
        donusum={editingDonusum}
        birimler={birimler}
        onSave={(data) => {
          createDonusumMutation.mutate(data)
        }}
        isLoading={createDonusumMutation.isPending}
      />
    </div>
  )
}

interface BirimDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  birim: Birim | null
  onSave: (data: Partial<Birim>) => void
  isLoading: boolean
}

function BirimDialog({ open, onOpenChange, birim, onSave, isLoading }: BirimDialogProps) {
  const [formData, setFormData] = useState({
    ad: '',
    kisa_ad: '',
    birim_tipi: 'AGIRLIK' as const,
    aktif: true,
  })

  // Reset form when dialog opens/closes or birim changes
  useState(() => {
    if (birim) {
      setFormData({
        ad: birim.ad,
        kisa_ad: birim.kisa_ad,
        birim_tipi: birim.birim_tipi,
        aktif: birim.aktif,
      })
    } else {
      setFormData({
        ad: '',
        kisa_ad: '',
        birim_tipi: 'AGIRLIK',
        aktif: true,
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{birim ? 'Birim Düzenle' : 'Yeni Birim'}</DialogTitle>
            <DialogDescription>
              {birim ? 'Birim bilgilerini güncelleyin' : 'Yeni birim tanımı oluşturun'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ad">Birim Adı</Label>
              <Input
                id="ad"
                value={formData.ad}
                onChange={(e) => setFormData({ ...formData, ad: e.target.value })}
                placeholder="Örn: Kilogram"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kisa_ad">Kısa Ad</Label>
              <Input
                id="kisa_ad"
                value={formData.kisa_ad}
                onChange={(e) => setFormData({ ...formData, kisa_ad: e.target.value })}
                placeholder="Örn: kg"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birim_tipi">Birim Tipi</Label>
              <Select
                value={formData.birim_tipi}
                onValueChange={(value: any) => setFormData({ ...formData, birim_tipi: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AGIRLIK">Ağırlık</SelectItem>
                  <SelectItem value="ADET">Adet</SelectItem>
                  <SelectItem value="HACIM">Hacim</SelectItem>
                  <SelectItem value="OZEL">Özel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Kaydediliyor...' : birim ? 'Güncelle' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface DonusumDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  donusum: BirimDonusum | null
  birimler: Birim[]
  onSave: (data: any) => void
  isLoading: boolean
}

function DonusumDialog({ open, onOpenChange, birimler, onSave, isLoading }: DonusumDialogProps) {
  const [formData, setFormData] = useState({
    kaynak_birim_id: '',
    hedef_birim_id: '',
    donusum_orani: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      kaynak_birim_id: formData.kaynak_birim_id,
      hedef_birim_id: formData.hedef_birim_id,
      donusum_orani: parseFloat(formData.donusum_orani),
    })
  }

  const swapUnits = () => {
    setFormData({
      ...formData,
      kaynak_birim_id: formData.hedef_birim_id,
      hedef_birim_id: formData.kaynak_birim_id,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Yeni Dönüşüm Tanımı</DialogTitle>
            <DialogDescription>
              İki birim arasında dönüşüm oranı tanımlayın
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="kaynak">Kaynak Birim</Label>
              <Select
                value={formData.kaynak_birim_id}
                onValueChange={(value) => setFormData({ ...formData, kaynak_birim_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Birim seçin" />
                </SelectTrigger>
                <SelectContent>
                  {birimler.map((birim) => (
                    <SelectItem key={birim.id} value={birim.id}>
                      {birim.ad} ({birim.kisa_ad})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-center">
              <Button type="button" variant="ghost" size="sm" onClick={swapUnits}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Değiştir
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hedef">Hedef Birim</Label>
              <Select
                value={formData.hedef_birim_id}
                onValueChange={(value) => setFormData({ ...formData, hedef_birim_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Birim seçin" />
                </SelectTrigger>
                <SelectContent>
                  {birimler.map((birim) => (
                    <SelectItem key={birim.id} value={birim.id}>
                      {birim.ad} ({birim.kisa_ad})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="oran">Dönüşüm Oranı</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-secondary">1 {birimler.find(b => b.id === formData.kaynak_birim_id)?.kisa_ad || '...'}</span>
                <span>=</span>
                <Input
                  id="oran"
                  type="number"
                  step="any"
                  value={formData.donusum_orani}
                  onChange={(e) => setFormData({ ...formData, donusum_orani: e.target.value })}
                  placeholder="örn: 1000"
                  className="flex-1"
                  required
                />
                <span className="text-sm text-secondary">{birimler.find(b => b.id === formData.hedef_birim_id)?.kisa_ad || '...'}</span>
              </div>
              <p className="text-xs text-secondary">
                Örn: 1 kg = 1000 g ise oran = 1000
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isLoading || !formData.kaynak_birim_id || !formData.hedef_birim_id}>
              {isLoading ? 'Kaydediliyor...' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
