import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Tag,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  ChevronRight,
  Type,
  Hash,
  Calendar as CalendarIcon,
  ToggleLeft,
  List,
  Check,
  X
} from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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

// Types
interface Ozellik {
  id: string
  urun_id: string | null
  kategori: string
  alan_adi: string
  goruntu_adi: string
  tip: 'METIN' | 'SAYI' | 'ENUM' | 'BOOLEAN' | 'TARIH'
  zorunlu: boolean
  etikette_goster: boolean
  etikette_zorunlu: boolean
  siralama: number
  varsayilan_deger: string | null
  enum_degerleri: string[]
  aktif: boolean
}

interface OzellikFormData {
  alan_adi: string
  goruntu_adi: string
  tip: 'METIN' | 'SAYI' | 'ENUM' | 'BOOLEAN' | 'TARIH'
  zorunlu: boolean
  etikette_goster: boolean
  etikette_zorunlu: boolean
  siralama: number
  varsayilan_deger: string
  birim: string
  min_deger: number | null
  max_deger: number | null
  enum_degerleri: string[]
}

const KATEGORILER = [
  { value: 'MEYVE', label: 'Meyve' },
  { value: 'BAL', label: 'Bal' },
  { value: 'KURUYEMIS', label: 'Kuruyemiş' },
  { value: 'KARSIM', label: 'Karışım' },
  { value: 'SEBZE', label: 'Sebze' },
  { value: 'DIGER', label: 'Diğer' },
]

const TIPLER = [
  { value: 'METIN', label: 'Metin (String)', icon: Type },
  { value: 'SAYI', label: 'Sayı (Integer/Decimal)', icon: Hash },
  { value: 'ENUM', label: 'Seçim Listesi (Enum)', icon: List },
  { value: 'BOOLEAN', label: 'Evet/Hayır (Boolean)', icon: ToggleLeft },
  { value: 'TARIH', label: 'Tarih (Date)', icon: CalendarIcon },
]

export function OzelliklerPage() {
  const queryClient = useQueryClient()
  const [selectedKategori, setSelectedKategori] = useState<string>(KATEGORILER[0].value)
  const [selectedOzellik, setSelectedOzellik] = useState<Ozellik | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false)
  const [copyToKategori, setCopyToKategori] = useState<string>('')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Fetch Ozellikler by kategori
  const { data: ozelliklerData, isLoading } = useQuery({
    queryKey: ['ozellikler', selectedKategori],
    queryFn: async () => {
      const response = await api.get('/ozellikler', {
        params: { kategori: selectedKategori },
      })
      return response.data
    },
  })

  const ozellikler: Ozellik[] = ozelliklerData?.data || []

  // Create mutation
  const createOzellik = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/ozellikler', {
        ...data,
        kategori: selectedKategori,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ozellikler'] })
      setIsFormOpen(false)
      setSelectedOzellik(null)
    },
  })

  // Update mutation
  const updateOzellik = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await api.put(`/ozellikler/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ozellikler'] })
      setIsFormOpen(false)
      setSelectedOzellik(null)
    },
  })

  // Delete mutation
  const deleteOzellik = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/ozellikler/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ozellikler'] })
      setSelectedOzellik(null)
    },
  })

  // Copy mutation
  const copyOzellikler = useMutation({
    mutationFn: async ({ fromKategori, toKategori }: { fromKategori: string; toKategori: string }) => {
      const response = await api.post('/ozellikler/kopyala', {
        kaynak_kategori: fromKategori,
        hedef_kategori: toKategori,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ozellikler'] })
      setIsCopyDialogOpen(false)
    },
  })

  const handleNewOzellik = () => {
    setSelectedOzellik(null)
    setIsFormOpen(true)
  }

  const handleEditOzellik = (ozellik: Ozellik) => {
    setSelectedOzellik(ozellik)
    setIsFormOpen(true)
  }

  const handleDeleteOzellik = (ozellik: Ozellik) => {
    if (confirm(`"${ozellik.goruntu_adi}" özelliğini silmek istediğinizden emin misiniz?`)) {
      deleteOzellik.mutate(ozellik.id)
    }
  }

  const getTipIcon = (tip: string) => {
    const found = TIPLER.find((t) => t.value === tip)
    return found ? found.icon : Type
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Ürün Özellik Tanımları
          </h2>
          <p className="text-sm text-secondary">
            Ürün etiketlerinde gösterilecek özelliklerin tanımlanması
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCopyDialogOpen(true)}>
            <Copy className="h-4 w-4 mr-2" />
            Kategoriye Kopyala
          </Button>
          <Button variant="outline" onClick={() => setIsPreviewOpen(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Etiket Önizleme
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Panel - Category & Attributes List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Category Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kategoriler</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1">
                {KATEGORILER.map((kategori) => (
                  <button
                    key={kategori.value}
                    onClick={() => setSelectedKategori(kategori.value)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors',
                      selectedKategori === kategori.value
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    <span className="font-medium">{kategori.label}</span>
                    {selectedKategori === kategori.value && <ChevronRight className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Attributes List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                {KATEGORILER.find((k) => k.value === selectedKategori)?.label} Özellikleri
              </CardTitle>
              <Badge variant="secondary">{ozellikler.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="divide-y">
                  {ozellikler.length === 0 ? (
                    <div className="px-4 py-8 text-center text-secondary">
                      <p>Bu kategoride özellik tanımlanmamış.</p>
                      <Button variant="link" className="mt-2" onClick={handleNewOzellik}>
                        <Plus className="h-4 w-4 mr-2" />
                        İlk özelliği ekle
                      </Button>
                    </div>
                  ) : (
                    ozellikler.map((ozellik) => (
                      <div
                        key={ozellik.id}
                        className={cn(
                          'flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer',
                          selectedOzellik?.id === ozellik.id && 'bg-muted'
                        )}
                        onClick={() => setSelectedOzellik(ozellik)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {(() => {
                            const Icon = getTipIcon(ozellik.tip)
                            return <Icon className="h-4 w-4 text-secondary flex-shrink-0" />
                          })()}
                          <div className="min-w-0">
                            <p className="font-medium truncate">{ozellik.goruntu_adi}</p>
                            <p className="text-xs text-secondary">
                              {ozellik.alan_adi}
                              {ozellik.zorunlu && <span className="text-red-500 ml-1">*</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {ozellik.etikette_goster && (
                            <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200">
                              Etikette
                            </Badge>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditOzellik(ozellik)
                            }}
                            className="p-1 hover:bg-muted rounded"
                          >
                            <Edit className="h-4 w-4 text-secondary" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              <div className="p-4 border-t">
                <Button className="w-full" onClick={handleNewOzellik}>
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Özellik Ekle
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Attribute Form / Detail */}
        <div className="lg:col-span-2">
          {selectedOzellik ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Özellik Detayı
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditOzellik(selectedOzellik)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Düzenle
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-600"
                    onClick={() => handleDeleteOzellik(selectedOzellik)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Sil
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-secondary">Alan Adı</p>
                    <p className="font-mono font-medium">{selectedOzellik.alan_adi}</p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary">Görüntü Adı</p>
                    <p className="font-medium">{selectedOzellik.goruntu_adi}</p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary">Veri Tipi</p>
                    <Badge className="mt-1">
                      {TIPLER.find((t) => t.value === selectedOzellik.tip)?.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-secondary">Sıralama</p>
                    <p className="font-medium">{selectedOzellik.siralama}</p>
                  </div>
                </div>

                {/* Flags */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-secondary">Özellik Ayarları</p>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      {selectedOzellik.zorunlu ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-gray-300" />
                      )}
                      <span className="text-sm">Zorunlu</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedOzellik.etikette_goster ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-gray-300" />
                      )}
                      <span className="text-sm">Etikette Göster</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedOzellik.etikette_zorunlu ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-gray-300" />
                      )}
                      <span className="text-sm">Etikette Zorunlu</span>
                    </div>
                  </div>
                </div>

                {/* Default Value & Enum */}
                {selectedOzellik.tip === 'ENUM' && selectedOzellik.enum_degerleri.length > 0 && (
                  <div>
                    <p className="text-sm text-secondary mb-2">Enum Değerleri</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedOzellik.enum_degerleri.map((deger, idx) => (
                        <Badge key={idx} variant="outline">
                          {deger}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedOzellik.varsayilan_deger && (
                  <div>
                    <p className="text-sm text-secondary">Varsayılan Değer</p>
                    <p className="font-medium">{selectedOzellik.varsayilan_deger}</p>
                  </div>
                )}

                {/* Status */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Badge className={selectedOzellik.aktif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {selectedOzellik.aktif ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px] py-12">
                <Tag className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-lg font-medium text-secondary mb-2">Özellik Seçin</p>
                <p className="text-sm text-gray-500 text-center max-w-md">
                  Sol panelden bir özellik seçerek detaylarını görüntüleyebilir veya düzenleyebilirsiniz.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedOzellik ? 'Özellik Düzenle' : 'Yeni Özellik Ekle'}</DialogTitle>
            <DialogDescription>
              {selectedOzellik
                ? `"${selectedOzellik.goruntu_adi}" özelliğini düzenleyin.`
                : `${KATEGORILER.find((k) => k.value === selectedKategori)?.label} kategorisi için yeni özellik ekleyin.`}
            </DialogDescription>
          </DialogHeader>
          <OzellikForm
            initialData={selectedOzellik}
            onSubmit={(data) => {
              if (selectedOzellik) {
                updateOzellik.mutate({ id: selectedOzellik.id, ...data })
              } else {
                createOzellik.mutate(data)
              }
            }}
            onCancel={() => {
              setIsFormOpen(false)
              setSelectedOzellik(null)
            }}
            isLoading={createOzellik.isPending || updateOzellik.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Copy Dialog */}
      <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Özellikleri Kopyala</DialogTitle>
            <DialogDescription>
              "{KATEGORILER.find((k) => k.value === selectedKategori)?.label}" kategorisindeki 
              özellikleri başka bir kategoriye kopyalayın.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Hedef Kategori</label>
              <Select value={copyToKategori} onValueChange={setCopyToKategori}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {KATEGORILER.filter((k) => k.value !== selectedKategori).map((kategori) => (
                    <SelectItem key={kategori.value} value={kategori.value}>
                      {kategori.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-secondary">
              {ozellikler.length} özellik kopyalanacak. Hedef kategorideki mevcut özellikler korunacak.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCopyDialogOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={() =>
                copyOzellikler.mutate({
                  fromKategori: selectedKategori,
                  toKategori: copyToKategori,
                })
              }
              disabled={!copyToKategori || copyOzellikler.isPending}
            >
              {copyOzellikler.isPending ? 'Kopyalanıyor...' : 'Kopyala'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Etiket Önizleme</DialogTitle>
            <DialogDescription>
              Seçili kategorinin özelliklerinin etikette nasıl görüneceğini gösterir.
            </DialogDescription>
          </DialogHeader>
          <EtiketPreview ozellikler={ozellikler} kategori={selectedKategori} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Form Component
function OzellikForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initialData?: Ozellik | null
  onSubmit: (data: any) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState<OzellikFormData>({
    alan_adi: initialData?.alan_adi || '',
    goruntu_adi: initialData?.goruntu_adi || '',
    tip: initialData?.tip || 'METIN',
    zorunlu: initialData?.zorunlu || false,
    etikette_goster: initialData?.etikette_goster || false,
    etikette_zorunlu: initialData?.etikette_zorunlu || false,
    siralama: initialData?.siralama || 0,
    varsayilan_deger: initialData?.varsayilan_deger || '',
    birim: '',
    min_deger: null,
    max_deger: null,
    enum_degerleri: initialData?.enum_degerleri || [],
  })
  const [newEnumValue, setNewEnumValue] = useState('')

  const handleAlanAdiChange = (value: string) => {
    // Auto-generate from display name if empty
    const slug = value.toLowerCase().replace(/[^a-z0-9]/g, '_')
    setFormData({
      ...formData,
      alan_adi: slug,
      goruntu_adi: value,
    })
  }

  const addEnumValue = () => {
    if (newEnumValue.trim() && !formData.enum_degerleri.includes(newEnumValue.trim())) {
      setFormData({
        ...formData,
        enum_degerleri: [...formData.enum_degerleri, newEnumValue.trim()],
      })
      setNewEnumValue('')
    }
  }

  const removeEnumValue = (value: string) => {
    setFormData({
      ...formData,
      enum_degerleri: formData.enum_degerleri.filter((v) => v !== value),
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Fields */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium mb-2 block">Görüntü Adı *</label>
          <Input
            value={formData.goruntu_adi}
            onChange={(e) => handleAlanAdiChange(e.target.value)}
            placeholder="Örn: Organik Ürün"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Alan Adı *</label>
          <Input
            value={formData.alan_adi}
            onChange={(e) => setFormData({ ...formData, alan_adi: e.target.value })}
            placeholder="Örn: organik_urun"
            pattern="[a-z0-9_]+"
            title="Sadece küçük harf, rakam ve alt çizgi"
            required
          />
          <p className="text-xs text-secondary mt-1">Sadece küçük harf, rakam ve alt çizgi</p>
        </div>
      </div>

      {/* Type Selector */}
      <div>
        <label className="text-sm font-medium mb-2 block">Veri Tipi *</label>
        <div className="grid gap-2 md:grid-cols-3">
          {TIPLER.map((tip) => {
            const Icon = tip.icon
            return (
              <button
                key={tip.value}
                type="button"
                onClick={() => setFormData({ ...formData, tip: tip.value as any })}
                className={cn(
                  'flex items-center gap-2 p-3 rounded-lg border transition-colors',
                  formData.tip === tip.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{tip.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Enum Values */}
      {formData.tip === 'ENUM' && (
        <div>
          <label className="text-sm font-medium mb-2 block">Enum Değerleri *</label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newEnumValue}
              onChange={(e) => setNewEnumValue(e.target.value)}
              placeholder="Yeni değer ekle"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addEnumValue()
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addEnumValue}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.enum_degerleri.map((deger) => (
              <Badge key={deger} variant="secondary" className="gap-1 pr-1">
                {deger}
                <button
                  type="button"
                  onClick={() => removeEnumValue(deger)}
                  className="ml-1 hover:bg-muted rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Number Constraints */}
      {formData.tip === 'SAYI' && (
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Birim (opsiyonel)</label>
            <Input
              value={formData.birim}
              onChange={(e) => setFormData({ ...formData, birim: e.target.value })}
              placeholder="Örn: kg, %, °C"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Min Değer</label>
            <Input
              type="number"
              value={formData.min_deger ?? ''}
              onChange={(e) =>
                setFormData({ ...formData, min_deger: e.target.value ? parseFloat(e.target.value) : null })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Max Değer</label>
            <Input
              type="number"
              value={formData.max_deger ?? ''}
              onChange={(e) =>
                setFormData({ ...formData, max_deger: e.target.value ? parseFloat(e.target.value) : null })
              }
            />
          </div>
        </div>
      )}

      {/* Default Value */}
      {formData.tip !== 'ENUM' && (
        <div>
          <label className="text-sm font-medium mb-2 block">Varsayılan Değer (opsiyonel)</label>
          <Input
            value={formData.varsayilan_deger}
            onChange={(e) => setFormData({ ...formData, varsayilan_deger: e.target.value })}
            placeholder="Varsayılan değer"
          />
        </div>
      )}

      {/* Sort Order */}
      <div>
        <label className="text-sm font-medium mb-2 block">Sıralama</label>
        <Input
          type="number"
          min="0"
          value={formData.siralama}
          onChange={(e) => setFormData({ ...formData, siralama: parseInt(e.target.value) || 0 })}
          className="w-32"
        />
        <p className="text-xs text-secondary mt-1">Etikette görüntüleme sırası</p>
      </div>

      {/* Switches */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Zorunlu Alan</label>
            <p className="text-xs text-secondary">Bu alan ürün kaydında doldurulmalı</p>
          </div>
          <Switch
            checked={formData.zorunlu}
            onCheckedChange={(checked) => setFormData({ ...formData, zorunlu: checked })}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Etikette Göster</label>
            <p className="text-xs text-secondary">Bu alan ürün etiketinde görüntülenecek</p>
          </div>
          <Switch
            checked={formData.etikette_goster}
            onCheckedChange={(checked) => setFormData({ ...formData, etikette_goster: checked })}
          />
        </div>
        {formData.etikette_goster && (
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Etikette Zorunlu</label>
              <p className="text-xs text-secondary">Etikette boş bırakılamaz</p>
            </div>
            <Switch
              checked={formData.etikette_zorunlu}
              onCheckedChange={(checked) => setFormData({ ...formData, etikette_zorunlu: checked })}
            />
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          İptal
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Preview Component
function EtiketPreview({ ozellikler, kategori }: { ozellikler: Ozellik[]; kategori: string }) {
  const etiketOzellikler = ozellikler.filter((o) => o.etikette_goster)

  return (
    <div className="space-y-6">
      {/* Sample Label */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-white">
        <div className="text-center border-b pb-4 mb-4">
          <h3 className="text-lg font-bold">KURUTULMUŞ MEYVE ÜRÜNÜ</h3>
          <p className="text-sm text-secondary">Ürün Adı: Örnek Kurutulmuş Kayısı</p>
        </div>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <span className="text-secondary">İçindekiler:</span>
              <span className="ml-2">Kurutulmuş Kayısı, Şeker</span>
            </div>
            <div>
              <span className="text-secondary">Net:</span>
              <span className="ml-2">500 g</span>
            </div>
            <div>
              <span className="text-secondary">SKT:</span>
              <span className="ml-2">31.12.2025</span>
            </div>
            <div>
              <span className="text-secondary">Parti:</span>
              <span className="ml-2">LOT-2024-001</span>
            </div>
          </div>

          {/* Dynamic Attributes */}
          {etiketOzellikler.length > 0 && (
            <div className="border-t pt-3 mt-3">
              <p className="text-xs text-secondary mb-2 font-medium">ÜRÜN ÖZELLİKLERİ</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {etiketOzellikler.map((ozellik) => (
                  <div key={ozellik.id}>
                    <span className="text-secondary">{ozellik.goruntu_adi}:</span>
                    <span className="ml-2">
                      {ozellik.tip === 'BOOLEAN'
                        ? 'Evet'
                        : ozellik.varsayilan_deger || '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-3 mt-3 text-xs text-secondary text-center">
            Üretici: Örnek Gıda Ltd. Şti. | Tesis No: TR-1234567
            <br />
            İzlenebilirlik: izlenebilirlik.firma.com/verify/LOT-2024-001
          </div>
        </div>
      </div>

      {/* Attribute Summary */}
      {etiketOzellikler.length === 0 ? (
        <p className="text-center text-secondary py-4">
          Bu kategoride etikette gösterilecek özellik tanımlanmamış.
        </p>
      ) : (
        <div>
          <p className="text-sm font-medium mb-2">Etikette Gösterilecek Özellikler ({etiketOzellikler.length})</p>
          <div className="flex flex-wrap gap-2">
            {etiketOzellikler.map((ozellik) => (
              <Badge key={ozellik.id} variant="secondary">
                {ozellik.goruntu_adi}
                {ozellik.etikette_zorunlu && <span className="text-red-500 ml-1">*</span>}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
