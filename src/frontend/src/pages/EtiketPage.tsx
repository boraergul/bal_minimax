import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Printer, Plus, Eye, Edit, Trash2, Download, Search,
  LayoutTemplate, Settings, FileText, Package, Barcode,
  Check, X, Save, RotateCcw
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

interface EtiketSablon {
  id: string
  sablon_adi: string
  sablon_tipi: 'HAMMADDE' | 'MAMUL' | 'GENEL'
  format: 'ZPL' | 'PDF' | 'PNG'
  genislik_mm: number
  yukseklik_mm: number
  varsayilan: boolean
  Alanlar: EtiketAlan[]
  aktif: boolean
  olusturma_tarihi: string
}

interface EtiketAlan {
  id: string
  alan_adi: string
  etiket_adi: string
  pozisyon_x: number
  pozisyon_y: number
  font_size: number
  Alan_tipi: 'METIN' | 'BARKOD' | 'QRKOD' | 'RESIM' | 'CIzgi'
  deger: string
  zorunlu: boolean
}

interface Stok {
  id: string
  lot_no: string
  urun_ad: string | null
  miktar: number
  birim: string
  stok_tipi: 'HAMMADDE' | 'MAMUL'
}

const tipLabels: Record<string, string> = {
  HAMMADDE: 'Hammadde',
  MAMUL: 'Mamul',
  GENEL: 'Genel',
}

const formatLabels: Record<string, string> = {
  ZPL: 'ZPL (Zebra)',
  PDF: 'PDF',
  PNG: 'PNG',
}

const tipColors: Record<string, string> = {
  HAMMADDE: 'bg-amber-100 text-amber-800',
  MAMUL: 'bg-blue-100 text-blue-800',
  GENEL: 'bg-gray-100 text-gray-800',
}

export function EtiketPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<string>('sablonlar')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSablonDialog, setShowSablonDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [showPrintDialog, setShowPrintDialog] = useState(false)
  const [selectedSablon, setSelectedSablon] = useState<EtiketSablon | null>(null)
  const [editingSablon, setEditingSablon] = useState<Partial<EtiketSablon> | null>(null)
  const [selectedStoklar, setSelectedStoklar] = useState<string[]>([])

  // Barkod generator state
  const [barkodValue, setBarkodValue] = useState('')
  const [barkodType, setBarkodType] = useState<'CODE128' | 'EAN13' | 'QR'>('CODE128')

  const { data: sablonlarData, isLoading: loadingSablonlar } = useQuery({
    queryKey: ['etiket-sablonlar'],
    queryFn: async () => {
      const response = await api.get('/etiket/sablonlar')
      return response.data
    },
  })

  const { data: stoklarData } = useQuery({
    queryKey: ['stok-for-etiket'],
    queryFn: async () => {
      const response = await api.get('/stok', { params: { sayfa_boyutu: 100, durum: 'AKTIF' } })
      return response.data
    },
  })

  const sablonlar: EtiketSablon[] = sablonlarData?.data || []
  const stoklar: Stok[] = stoklarData?.data || []

  const filteredSablonlar = sablonlar.filter((sablon) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return sablon.sablon_adi.toLowerCase().includes(query)
    }
    return true
  })

  const createSablonMutation = useMutation({
    mutationFn: async (data: Partial<EtiketSablon>) => {
      const response = await api.post('/etiket/sablonlar', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etiket-sablonlar'] })
      setShowSablonDialog(false)
      setEditingSablon(null)
    },
  })

  const updateSablonMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<EtiketSablon> & { id: string }) => {
      const response = await api.put(`/etiket/sablonlar/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etiket-sablonlar'] })
      setShowSablonDialog(false)
      setEditingSablon(null)
    },
  })

  const deleteSablonMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/etiket/sablonlar/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etiket-sablonlar'] })
    },
  })

  const setDefaultSablonMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/etiket/sablonlar/${id}/varsayilan`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etiket-sablonlar'] })
    },
  })

  const printMutation = useMutation({
    mutationFn: async ({ sablonId, stokIds }: { sablonId: string; stokIds: string[] }) => {
      const response = await api.post('/etiket/yazdir', {
        sablon_id: sablonId,
        stok_ids: stokIds,
      })
      return response.data
    },
  })

  const handleEditSablon = (sablon: EtiketSablon) => {
    setEditingSablon(sablon)
    setShowSablonDialog(true)
  }

  const handlePreview = (sablon: EtiketSablon) => {
    setSelectedSablon(sablon)
    setShowPreviewDialog(true)
  }

  const handlePrint = (sablon: EtiketSablon) => {
    setSelectedSablon(sablon)
    setShowPrintDialog(true)
  }

  const generateZPLPreview = (sablon: EtiketSablon) => {
    let zpl = `^XA
^CF0,30,30
^FO50,50^FD${sablon.sablon_adi}^FS
^FO50,100^BY2^BC^FDLOT123456^FS
^XZ`
    return zpl
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Etiket Yönetimi
          </h2>
          <p className="text-sm text-secondary">
            Barkod ve etiket şablonları
          </p>
        </div>
        <Button onClick={() => { setEditingSablon(null); setShowSablonDialog(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Şablon
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'sablonlar'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-foreground'
          }`}
          onClick={() => setActiveTab('sablonlar')}
        >
          <LayoutTemplate className="h-4 w-4 inline mr-1" />
          Şablonlar ({sablonlar.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'baski'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-foreground'
          }`}
          onClick={() => setActiveTab('baski')}
        >
          <Printer className="h-4 w-4 inline mr-1" />
          Baskı
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'ayarlar'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-foreground'
          }`}
          onClick={() => setActiveTab('ayarlar')}
        >
          <Settings className="h-4 w-4 inline mr-1" />
          Ayarlar
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'barkod'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-foreground'
          }`}
          onClick={() => setActiveTab('barkod')}
        >
          <Barcode className="h-4 w-4 inline mr-1" />
          Barkod
        </button>
      </div>

      {/* Sablonlar Tab */}
      {activeTab === 'sablonlar' && (
        <>
          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Şablon ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Templates Grid */}
          {loadingSablonlar ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredSablonlar.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-secondary">
                <LayoutTemplate className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Şablon bulunamadı</p>
                <p className="text-sm">Yeni bir şablon oluşturun</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSablonlar.map((sablon) => (
                <Card key={sablon.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    {/* Preview */}
                    <div className="aspect-[3/2] bg-white border rounded-lg mb-4 flex items-center justify-center p-4">
                      <div className="text-center">
                        <p className="text-xs text-secondary mb-1">{sablon.sablon_adi}</p>
                        <div className="w-16 h-8 border-2 border-black mx-auto mb-1 flex items-center justify-center">
                          <Barcode className="h-6 w-6" />
                        </div>
                        <p className="text-xs font-mono">LOT-0001</p>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{sablon.sablon_adi}</h4>
                        {sablon.varsayilan && (
                          <Badge className="bg-primary text-primary-foreground">Varsayılan</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={tipColors[sablon.sablon_tipi]}>
                          {tipLabels[sablon.sablon_tipi]}
                        </Badge>
                        <Badge variant="outline">
                          {formatLabels[sablon.format]}
                        </Badge>
                      </div>
                      <div className="text-xs text-secondary">
                        {sablon.genislik_mm}×{sablon.yukseklik_mm}mm • {sablon.Alanlar?.length || 0} alan
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handlePreview(sablon)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Önizle
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditSablon(sablon)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!sablon.varsayilan && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDefaultSablonMutation.mutate(sablon.id)}
                            title="Varsayılan yap"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSablonMutation.mutate(sablon.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Baski Tab */}
      {activeTab === 'baski' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Stok Selection */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Ürün Seçimi</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {stoklar.map((stok) => {
                  const isSelected = selectedStoklar.includes(stok.id)
                  return (
                    <div
                      key={stok.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedStoklar(selectedStoklar.filter((id) => id !== stok.id))
                        } else {
                          setSelectedStoklar([...selectedStoklar, stok.id])
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{stok.urun_ad || '-'}</p>
                          <p className="text-xs text-secondary font-mono">{stok.lot_no}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {stok.miktar} {stok.birim}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-secondary">
                  {selectedStoklar.length} ürün seçildi
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Print Settings */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Yazdırma Ayarları</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Şablon Seç</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Şablon seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {sablonlar.filter(s => s.aktif).map((sablon) => (
                        <SelectItem key={sablon.id} value={sablon.id}>
                          {sablon.sablon_adi} {sablon.varsayilan && '(Varsayılan)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Yazdırma Adedi</Label>
                  <Input type="number" min="1" defaultValue="1" />
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-secondary mb-2">Önizleme</p>
                  <div className="aspect-[3/2] bg-white border rounded flex items-center justify-center p-2">
                    <Barcode className="h-12 w-12 text-muted-foreground" />
                  </div>
                </div>
                <Button
                  className="w-full"
                  disabled={selectedStoklar.length === 0}
                  onClick={() => {
                    // TODO: Implement print
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Yazdır ({selectedStoklar.length})
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ayarlar Tab */}
      {activeTab === 'ayarlar' && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Etiket Ayarları</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Varsayılan Yazıcı</Label>
                  <Select defaultValue="zebra">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zebra">Zebra ZD420</SelectItem>
                      <SelectItem value="hp">HP LaserJet</SelectItem>
                      <SelectItem value="dymo">DYMO LabelWriter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Varsayılan Etiket Boyutu</Label>
                  <Select defaultValue="50x25">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50x25">50×25 mm</SelectItem>
                      <SelectItem value="70x37">70×37 mm</SelectItem>
                      <SelectItem value="100x50">100×50 mm</SelectItem>
                      <SelectItem value="100x150">100×150 mm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>ZPL Komut Seti</Label>
                  <Select defaultValue="zpl2">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zpl2">ZPL II</SelectItem>
                      <SelectItem value="zpl">ZPL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>DPI</Label>
                  <Select defaultValue="203">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="203">203 DPI</SelectItem>
                      <SelectItem value="300">300 DPI</SelectItem>
                      <SelectItem value="600">600 DPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t">
              <Button>
                <Save className="h-4 w-4 mr-2" />
                Ayarları Kaydet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Barkod Tab */}
      {activeTab === 'barkod' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Barkod Oluşturucu</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Barkod Tipi</Label>
                  <Select value={barkodType} onValueChange={(v: any) => setBarkodType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CODE128">Code 128</SelectItem>
                      <SelectItem value="EAN13">EAN-13</SelectItem>
                      <SelectItem value="QR">QR Code</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Değer</Label>
                  <Input
                    value={barkodValue}
                    onChange={(e) => setBarkodValue(e.target.value)}
                    placeholder="Barkod değeri girin..."
                  />
                </div>
                <div className="p-8 bg-white border rounded-lg flex items-center justify-center">
                  {barkodValue ? (
                    <div className="text-center">
                      <div className="w-48 h-24 mx-auto mb-2 bg-white flex items-center justify-center">
                        <Barcode className="h-16 w-16 text-black" />
                      </div>
                      <p className="font-mono text-sm">{barkodValue}</p>
                    </div>
                  ) : (
                    <div className="text-center text-secondary">
                      <Barcode className="h-16 w-16 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Barkod değeri girin</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    PNG İndir
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Printer className="h-4 w-4 mr-2" />
                    Yazdır
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Popüler Barkodlar</h3>
              <div className="space-y-2">
                {[
                  { name: 'Ürün Kodu', value: '8901234567890' },
                  { name: 'Lot Numarası', value: 'LOT-2024-0001' },
                  { name: 'Barkod', value: '123456789012' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setBarkodValue(item.value)}
                  >
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="font-mono text-xs text-secondary">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sablon Dialog */}
      <SablonDialog
        open={showSablonDialog}
        onOpenChange={setShowSablonDialog}
        sablon={editingSablon}
        onSave={(data) => {
          if (editingSablon?.id) {
            updateSablonMutation.mutate({ id: editingSablon.id, ...data })
          } else {
            createSablonMutation.mutate(data)
          }
        }}
        isLoading={createSablonMutation.isPending || updateSablonMutation.isPending}
      />

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Şablon Önizleme</DialogTitle>
            <DialogDescription>{selectedSablon?.sablon_adi}</DialogDescription>
          </DialogHeader>
          {selectedSablon && (
            <div className="space-y-4">
              <div
                className="bg-white border-2 border-dashed rounded-lg p-6 flex items-center justify-center"
                style={{
                  width: `${(selectedSablon.genislik_mm / 10)}rem`,
                  height: `${(selectedSablon.yukseklik_mm / 10)}rem`,
                }}
              >
                <div className="text-center">
                  <p className="text-lg font-bold mb-2">{selectedSablon.sablon_adi}</p>
                  <div className="w-24 h-12 border-2 border-black mx-auto mb-2 flex items-center justify-center">
                    <Barcode className="h-8 w-8" />
                  </div>
                  <p className="font-mono text-sm">LOT-123456</p>
                  <p className="text-xs text-secondary">Ürün Adı</p>
                </div>
              </div>

              {/* ZPL Code */}
              <div>
                <Label className="text-xs text-secondary">ZPL Kodu</Label>
                <pre className="mt-1 p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto">
                  {generateZPLPreview(selectedSablon)}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Etiket Yazdır</DialogTitle>
            <DialogDescription>{selectedSablon?.sablon_adi}</DialogDescription>
          </DialogHeader>
          {selectedSablon && (
            <div className="space-y-4">
              <p className="text-sm">
                {selectedStoklar.length} adet etiket yazdırılacak.
              </p>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Yazdırma Önizleme</p>
                <div className="w-32 h-20 bg-white border mx-auto flex items-center justify-center">
                  <Barcode className="h-8 w-8" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrintDialog(false)}>
              İptal
            </Button>
            <Button onClick={() => {
              // TODO: Implement print
              setShowPrintDialog(false)
            }}>
              <Printer className="h-4 w-4 mr-2" />
              Yazdır
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface SablonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sablon: Partial<EtiketSablon> | null
  onSave: (data: Partial<EtiketSablon>) => void
  isLoading: boolean
}

function SablonDialog({ open, onOpenChange, sablon, onSave, isLoading }: SablonDialogProps) {
  const [formData, setFormData] = useState({
    sablon_adi: '',
    sablon_tipi: 'GENEL' as const,
    format: 'ZPL' as const,
    genislik_mm: 50,
    yukseklik_mm: 25,
    Alanlar: [] as Partial<EtiketAlan>[],
  })

  // Reset form when dialog opens/closes
  useState(() => {
    if (sablon) {
      setFormData({
        sablon_adi: sablon.sablon_adi || '',
        sablon_tipi: sablon.sablon_tipi || 'GENEL',
        format: sablon.format || 'ZPL',
        genislik_mm: sablon.genislik_mm || 50,
        yukseklik_mm: sablon.yukseklik_mm || 25,
        Alanlar: sablon.Alanlar || [],
      })
    } else {
      setFormData({
        sablon_adi: '',
        sablon_tipi: 'GENEL',
        format: 'ZPL',
        genislik_mm: 50,
        yukseklik_mm: 25,
        Alanlar: [],
      })
    }
  })

  const addField = () => {
    const newField: Partial<EtiketAlan> = {
      id: `field_${Date.now()}`,
      alan_adi: '',
      etiket_adi: '',
      pozisyon_x: 10,
      pozisyon_y: formData.Alanlar.length * 30 + 10,
      font_size: 12,
      Alan_tipi: 'METIN',
      deger: '',
      zorunlu: false,
    }
    setFormData({ ...formData, Alanlar: [...formData.Alanlar, newField] })
  }

  const removeField = (index: number) => {
    setFormData({
      ...formData,
      Alanlar: formData.Alanlar.filter((_, i) => i !== index),
    })
  }

  const updateField = (index: number, updates: Partial<EtiketAlan>) => {
    const newAlanlar = [...formData.Alanlar]
    newAlanlar[index] = { ...newAlanlar[index], ...updates }
    setFormData({ ...formData, Alanlar: newAlanlar })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{sablon?.id ? 'Şablon Düzenle' : 'Yeni Şablon'}</DialogTitle>
            <DialogDescription>
              {sablon?.id ? 'Şablon bilgilerini güncelleyin' : 'Yeni etiket şablonu oluşturun'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sablon_adi">Şablon Adı</Label>
                <Input
                  id="sablon_adi"
                  value={formData.sablon_adi}
                  onChange={(e) => setFormData({ ...formData, sablon_adi: e.target.value })}
                  placeholder="Örn: Hammadde Etiketi"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sablon_tipi">Tip</Label>
                <Select
                  value={formData.sablon_tipi}
                  onValueChange={(value: any) => setFormData({ ...formData, sablon_tipi: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HAMMADDE">Hammadde</SelectItem>
                    <SelectItem value="MAMUL">Mamul</SelectItem>
                    <SelectItem value="GENEL">Genel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="format">Format</Label>
                <Select
                  value={formData.format}
                  onValueChange={(value: any) => setFormData({ ...formData, format: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZPL">ZPL (Zebra)</SelectItem>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="PNG">PNG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="boyut">Boyut (mm)</Label>
                <div className="flex gap-2">
                  <Input
                    id="genislik"
                    type="number"
                    value={formData.genislik_mm}
                    onChange={(e) => setFormData({ ...formData, genislik_mm: parseInt(e.target.value) })}
                    placeholder="En"
                  />
                  <span className="self-center">×</span>
                  <Input
                    id="yukseklik"
                    type="number"
                    value={formData.yukseklik_mm}
                    onChange={(e) => setFormData({ ...formData, yukseklik_mm: parseInt(e.target.value) })}
                    placeholder="Boy"
                  />
                </div>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Alanlar</Label>
                <Button type="button" variant="outline" size="sm" onClick={addField}>
                  <Plus className="h-4 w-4 mr-1" />
                  Alan Ekle
                </Button>
              </div>
              {formData.Alanlar.length === 0 ? (
                <div className="p-8 border border-dashed rounded-lg text-center text-secondary">
                  <p>Henüz alan eklenmedi</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {formData.Alanlar.map((alan, index) => (
                    <div key={alan.id} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Select
                          value={alan.Alan_tipi}
                          onValueChange={(value: any) => updateField(index, { Alan_tipi: value })}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="METIN">Metin</SelectItem>
                            <SelectItem value="BARKOD">Barkod</SelectItem>
                            <SelectItem value="QRKOD">QR Kod</SelectItem>
                            <SelectItem value="RESIM">Resim</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Alan adı"
                          value={alan.alan_adi || ''}
                          onChange={(e) => updateField(index, { alan_adi: e.target.value })}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Değer"
                          value={alan.deger || ''}
                          onChange={(e) => updateField(index, { deger: e.target.value })}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeField(index)}
                          className="text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Kaydediliyor...' : sablon?.id ? 'Güncelle' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
