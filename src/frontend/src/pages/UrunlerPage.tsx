import { useState } from 'react'
import { Package, Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useUrunler, useUrunMutations } from '@/hooks/useAuth'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/useToast'
import type { Urun } from '@/types'

// Product categories for the ERP system
const KATEGORILER = [
  { value: 'MEYVE', label: 'Meyve' },
  { value: 'BAL', label: 'Bal' },
  { value: 'KARSIM', label: 'Karışım' },
  { value: 'KURUYEMIS', label: 'Kuru Yemiş' },
  { value: 'SEBZE', label: 'Sebze' },
  { value: 'KURU_BAKLIYAT', label: 'Kuru Bakliyat' },
  { value: 'YAG', label: 'Yağ' },
  { value: 'TURSU', label: 'Turşu' },
  { value: 'DIGER', label: 'Diğer' },
] as const

type KategoriValue = typeof KATEGORILER[number]['value']

// Common units
const BIRIMLER = [
  { value: 'KG', label: 'Kilogram (KG)' },
  { value: 'G', label: 'Gram (G)' },
  { value: 'LT', label: 'Litre (LT)' },
  { value: 'ML', label: 'Mililitre (ML)' },
  { value: 'ADET', label: 'Adet' },
  { value: 'PAKET', label: 'Paket' },
  { value: 'KUTU', label: 'Kutu' },
  { value: 'TENGERE', label: 'Tenkere' },
  { value: 'KOVA', label: 'Kova' },
] as const

type BirimValue = typeof BIRIMLER[number]['value']

// Form type for create/edit
interface UrunFormData {
  ad: string
  kategori: KategoriValue | ''
  birim_toptan: BirimValue | ''
  birim_perakende: BirimValue | ''
  stok_kodu: string
  barkod: string
  aciklama: string
  agirlik: string
  minimum_stok_seviyesi: string
  maksimum_stok_seviyesi: string
  raf_omru_gun: string
  hammadde_id: string
  aktif: boolean
}

const emptyFormData: UrunFormData = {
  ad: '',
  kategori: '',
  birim_toptan: '',
  birim_perakende: '',
  stok_kodu: '',
  barkod: '',
  aciklama: '',
  agirlik: '',
  minimum_stok_seviyesi: '',
  maksimum_stok_seviyesi: '',
  raf_omru_gun: '',
  hammadde_id: '',
  aktif: true,
}

export function UrunlerPage() {
  const { toast } = useToast()
  
  // State
  const [arama, setArama] = useState('')
  const [kategoriFilter, setKategoriFilter] = useState<string>('')
  const [aktifFilter, setAktifFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const pageSize = 15
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedUrun, setSelectedUrun] = useState<Urun | null>(null)
  const [formData, setFormData] = useState<UrunFormData>(emptyFormData)
  
  // Fetch products
  const { data, isLoading, isFetching } = useUrunler({
    sayfa: page,
    sayfa_boyutu: pageSize,
    arama: arama || undefined,
    kategori: kategoriFilter || undefined,
    aktif: aktifFilter === 'true' ? true : aktifFilter === 'false' ? false : undefined,
  })
  
  const { createUrun, updateUrun, deleteUrun } = useUrunMutations()
  
  // Mutations state
  const isCreating = createUrun.isPending
  const isUpdating = updateUrun.isPending
  const isDeleting = deleteUrun.isPending
  
  // Computed values
  const urunler = data?.data || []
  const totalCount = data?.total || 0
  const totalPages = Math.ceil(totalCount / pageSize)
  
  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setArama(value)
    setPage(1)
  }
  
  const handleKategoriChange = (value: string) => {
    setKategoriFilter(value)
    setPage(1)
  }
  
  const handleAktifChange = (value: string) => {
    setAktifFilter(value)
    setPage(1)
  }
  
  // Form handlers
  const handleInputChange = (field: keyof UrunFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  const openCreateDialog = () => {
    setFormData(emptyFormData)
    setIsCreateOpen(true)
  }
  
  const openEditDialog = (urun: Urun) => {
    setSelectedUrun(urun)
    setFormData({
      ad: urun.ad || '',
      kategori: (urun.kategori as KategoriValue) || '',
      birim_toptan: (urun.birim_toptan as BirimValue) || '',
      birim_perakende: (urun.birim_perakende as BirimValue) || '',
      stok_kodu: urun.stok_kodu || '',
      barkod: urun.barkod || '',
      aciklama: urun.aciklama || '',
      agirlik: urun.agirlik?.toString() || '',
      minimum_stok_seviyesi: urun.minimum_stok_seviyesi?.toString() || '',
      maksimum_stok_seviyesi: urun.maksimum_stok_seviyesi?.toString() || '',
      raf_omru_gun: urun.raf_omru_gun?.toString() || '',
      hammadde_id: urun.hammadde_id || '',
      aktif: urun.aktif ?? true,
    })
    setIsEditOpen(true)
  }
  
  const openDeleteDialog = (urun: Urun) => {
    setSelectedUrun(urun)
    setIsDeleteOpen(true)
  }
  
  const prepareUpdateData = (): Partial<Urun> => {
    return {
      ad: formData.ad,
      kategori: formData.kategori || undefined,
      birim_toptan: formData.birim_toptan || undefined,
      birim_perakende: formData.birim_perakende || undefined,
      stok_kodu: formData.stok_kodu || undefined,
      barkod: formData.barkod || undefined,
      aciklama: formData.aciklama || undefined,
      agirlik: formData.agirlik ? parseFloat(formData.agirlik) : undefined,
      minimum_stok_seviyesi: formData.minimum_stok_seviyesi ? parseFloat(formData.minimum_stok_seviyesi) : undefined,
      maksimum_stok_seviyesi: formData.maksimum_stok_seviyesi ? parseFloat(formData.maksimum_stok_seviyesi) : undefined,
      raf_omru_gun: formData.raf_omru_gun ? parseInt(formData.raf_omru_gun) : undefined,
      hammadde_id: formData.hammadde_id || undefined,
      aktif: formData.aktif,
    }
  }
  
  const handleCreate = async () => {
    if (!formData.ad.trim()) {
      toast({ title: 'Hata', description: 'Ürün adı zorunludur', variant: 'error' })
      return
    }
    if (!formData.kategori) {
      toast({ title: 'Hata', description: 'Kategori seçimi zorunludur', variant: 'error' })
      return
    }
    
    try {
      await createUrun.mutateAsync({
        ad: formData.ad,
        kategori: formData.kategori,
        birim_toptan: formData.birim_toptan || undefined,
        birim_perakende: formData.birim_perakende || undefined,
        stok_kodu: formData.stok_kodu || undefined,
        barkod: formData.barkod || undefined,
        aciklama: formData.aciklama || undefined,
        agirlik: formData.agirlik ? parseFloat(formData.agirlik) : undefined,
        minimum_stok_seviyesi: formData.minimum_stok_seviyesi ? parseFloat(formData.minimum_stok_seviyesi) : undefined,
        maksimum_stok_seviyesi: formData.maksimum_stok_seviyesi ? parseFloat(formData.maksimum_stok_seviyesi) : undefined,
        raf_omru_gun: formData.raf_omru_gun ? parseInt(formData.raf_omru_gun) : undefined,
        hammadde_id: formData.hammadde_id || undefined,
        aktif: formData.aktif,
      })
      toast({ title: 'Başarılı', description: 'Ürün başarıyla oluşturuldu', variant: 'success' })
      setIsCreateOpen(false)
      setFormData(emptyFormData)
    } catch (error) {
      toast({ title: 'Hata', description: 'Ürün oluşturulurken bir hata oluştu', variant: 'error' })
    }
  }
  
  const handleUpdate = async () => {
    if (!selectedUrun) return
    if (!formData.ad.trim()) {
      toast({ title: 'Hata', description: 'Ürün adı zorunludur', variant: 'error' })
      return
    }
    
    try {
      await updateUrun.mutateAsync({
        id: selectedUrun.id,
        ...prepareUpdateData(),
      })
      toast({ title: 'Başarılı', description: 'Ürün başarıyla güncellendi', variant: 'success' })
      setIsEditOpen(false)
      setSelectedUrun(null)
      setFormData(emptyFormData)
    } catch (error) {
      toast({ title: 'Hata', description: 'Ürün güncellenirken bir hata oluştu', variant: 'error' })
    }
  }
  
  const handleDelete = async () => {
    if (!selectedUrun) return
    
    try {
      await deleteUrun.mutateAsync(selectedUrun.id)
      toast({ title: 'Başarılı', description: 'Ürün başarıyla silindi', variant: 'success' })
      setIsDeleteOpen(false)
      setSelectedUrun(null)
    } catch (error) {
      toast({ title: 'Hata', description: 'Ürün silinirken bir hata oluştu', variant: 'error' })
    }
  }
  
  // Get category label
  const getKategoriLabel = (kategori: string) => {
    return KATEGORILER.find(k => k.value === kategori)?.label || kategori
  }
  
  // Get category badge color
  const getKategoriBadgeClass = (kategori: string) => {
    const colors: Record<string, string> = {
      MEYVE: 'bg-orange-100 text-orange-800 border-orange-200',
      BAL: 'bg-amber-100 text-amber-800 border-amber-200',
      KARSIM: 'bg-purple-100 text-purple-800 border-purple-200',
      KURUYEMIS: 'bg-green-100 text-green-800 border-green-200',
      SEBZE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      KURU_BAKLIYAT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      YAG: 'bg-lime-100 text-lime-800 border-lime-200',
      TURSU: 'bg-teal-100 text-teal-800 border-teal-200',
      DIGER: 'bg-gray-100 text-gray-800 border-gray-200',
    }
    return colors[kategori] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Ürünler
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCount} ürün listelendi
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Ürün
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ürün adı veya kod ile ara..."
                value={arama}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Category Filter */}
            <Select value={kategoriFilter} onValueChange={handleKategoriChange}>
              <SelectTrigger>
                <SelectValue placeholder="Tüm Kategoriler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tüm Kategoriler</SelectItem>
                {KATEGORILER.map((kat) => (
                  <SelectItem key={kat.value} value={kat.value}>
                    {kat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Status Filter */}
            <Select value={aktifFilter} onValueChange={handleAktifChange}>
              <SelectTrigger>
                <SelectValue placeholder="Tüm Durumlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tüm Durumlar</SelectItem>
                <SelectItem value="true">Aktif</SelectItem>
                <SelectItem value="false">Pasif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading || isFetching ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Kod</TableHead>
                    <TableHead>Ürün Adı</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Toptan Birim</TableHead>
                    <TableHead>Perakende Birim</TableHead>
                    <TableHead className="w-[80px]">Durum</TableHead>
                    <TableHead className="w-[120px] text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {urunler.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p className="font-medium">Ürün bulunamadı</p>
                        <p className="text-sm mt-1">Arama kriterlerinizi değiştirmeyi deneyin</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    urunler.map((urun) => (
                      <TableRow key={urun.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-sm">{urun.stok_kodu || '-'}</TableCell>
                        <TableCell className="font-medium">{urun.ad}</TableCell>
                        <TableCell>
                          <Badge className={getKategoriBadgeClass(urun.kategori)}>
                            {getKategoriLabel(urun.kategori)}
                          </Badge>
                        </TableCell>
                        <TableCell>{urun.birim_toptan || '-'}</TableCell>
                        <TableCell>{urun.birim_perakende || '-'}</TableCell>
                        <TableCell>
                          <Badge className={urun.aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {urun.aktif ? 'Aktif' : 'Pasif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditDialog(urun)}
                              title="Düzenle"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openDeleteDialog(urun)}
                              className="text-destructive hover:text-destructive"
                              title="Sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Sayfa {page} / {totalPages} ({totalCount} kayıt)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Önceki
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Sonraki
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Ürün Ekle</DialogTitle>
            <DialogDescription>
              Yeni bir ürün oluşturmak için formu doldurun.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Temel Bilgiler
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-ad">Ürün Adı *</Label>
                  <Input
                    id="create-ad"
                    value={formData.ad}
                    onChange={(e) => handleInputChange('ad', e.target.value)}
                    placeholder="Örn: Çiçek Balı"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="create-kategori">Kategori *</Label>
                  <Select value={formData.kategori} onValueChange={(v) => handleInputChange('kategori', v)}>
                    <SelectTrigger id="create-kategori">
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      {KATEGORILER.map((kat) => (
                        <SelectItem key={kat.value} value={kat.value}>
                          {kat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-stok-kodu">Stok Kodu</Label>
                  <Input
                    id="create-stok-kodu"
                    value={formData.stok_kodu}
                    onChange={(e) => handleInputChange('stok_kodu', e.target.value)}
                    placeholder="Örn: BAL-001"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="create-barkod">Barkod</Label>
                  <Input
                    id="create-barkod"
                    value={formData.barkod}
                    onChange={(e) => handleInputChange('barkod', e.target.value)}
                    placeholder="Barkod numarası"
                  />
                </div>
              </div>
            </div>
            
            {/* Units */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Birim Bilgileri
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-birim-toptan">Toptan Birim</Label>
                  <Select value={formData.birim_toptan} onValueChange={(v) => handleInputChange('birim_toptan', v)}>
                    <SelectTrigger id="create-birim-toptan">
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      {BIRIMLER.map((birim) => (
                        <SelectItem key={birim.value} value={birim.value}>
                          {birim.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="create-birim-perakende">Perakende Birim</Label>
                  <Select value={formData.birim_perakende} onValueChange={(v) => handleInputChange('birim_perakende', v)}>
                    <SelectTrigger id="create-birim-perakende">
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      {BIRIMLER.map((birim) => (
                        <SelectItem key={birim.value} value={birim.value}>
                          {birim.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Stock Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Stok Ayarları
              </h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-min-stok">Minimum Stok</Label>
                  <Input
                    id="create-min-stok"
                    type="number"
                    value={formData.minimum_stok_seviyesi}
                    onChange={(e) => handleInputChange('minimum_stok_seviyesi', e.target.value)}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="create-max-stok">Maksimum Stok</Label>
                  <Input
                    id="create-max-stok"
                    type="number"
                    value={formData.maksimum_stok_seviyesi}
                    onChange={(e) => handleInputChange('maksimum_stok_seviyesi', e.target.value)}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="create-raf-omru">Raf Ömrü (Gün)</Label>
                  <Input
                    id="create-raf-omru"
                    type="number"
                    value={formData.raf_omru_gun}
                    onChange={(e) => handleInputChange('raf_omru_gun', e.target.value)}
                    placeholder="365"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-agirlik">Ağırlık (g)</Label>
                  <Input
                    id="create-agirlik"
                    type="number"
                    step="0.01"
                    value={formData.agirlik}
                    onChange={(e) => handleInputChange('agirlik', e.target.value)}
                    placeholder="500"
                  />
                </div>
              </div>
            </div>
            
            {/* Status */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Durum
              </h3>
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.aktif}
                    onChange={(e) => handleInputChange('aktif', e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Ürün aktif</span>
                </label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
              İptal
            </Button>
            <Button onClick={handleCreate} loading={isCreating}>
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ürün Düzenle</DialogTitle>
            <DialogDescription>
              Ürün bilgilerini güncellemek için formu doldun.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Temel Bilgiler
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-ad">Ürün Adı *</Label>
                  <Input
                    id="edit-ad"
                    value={formData.ad}
                    onChange={(e) => handleInputChange('ad', e.target.value)}
                    placeholder="Örn: Çiçek Balı"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-kategori">Kategori *</Label>
                  <Select value={formData.kategori} onValueChange={(v) => handleInputChange('kategori', v)}>
                    <SelectTrigger id="edit-kategori">
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      {KATEGORILER.map((kat) => (
                        <SelectItem key={kat.value} value={kat.value}>
                          {kat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-stok-kodu">Stok Kodu</Label>
                  <Input
                    id="edit-stok-kodu"
                    value={formData.stok_kodu}
                    onChange={(e) => handleInputChange('stok_kodu', e.target.value)}
                    placeholder="Örn: BAL-001"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-barkod">Barkod</Label>
                  <Input
                    id="edit-barkod"
                    value={formData.barkod}
                    onChange={(e) => handleInputChange('barkod', e.target.value)}
                    placeholder="Barkod numarası"
                  />
                </div>
              </div>
            </div>
            
            {/* Units */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Birim Bilgileri
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-birim-toptan">Toptan Birim</Label>
                  <Select value={formData.birim_toptan} onValueChange={(v) => handleInputChange('birim_toptan', v)}>
                    <SelectTrigger id="edit-birim-toptan">
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      {BIRIMLER.map((birim) => (
                        <SelectItem key={birim.value} value={birim.value}>
                          {birim.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-birim-perakende">Perakende Birim</Label>
                  <Select value={formData.birim_perakende} onValueChange={(v) => handleInputChange('birim_perakende', v)}>
                    <SelectTrigger id="edit-birim-perakende">
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      {BIRIMLER.map((birim) => (
                        <SelectItem key={birim.value} value={birim.value}>
                          {birim.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Stock Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Stok Ayarları
              </h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-min-stok">Minimum Stok</Label>
                  <Input
                    id="edit-min-stok"
                    type="number"
                    value={formData.minimum_stok_seviyesi}
                    onChange={(e) => handleInputChange('minimum_stok_seviyesi', e.target.value)}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-max-stok">Maksimum Stok</Label>
                  <Input
                    id="edit-max-stok"
                    type="number"
                    value={formData.maksimum_stok_seviyesi}
                    onChange={(e) => handleInputChange('maksimum_stok_seviyesi', e.target.value)}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-raf-omru">Raf Ömrü (Gün)</Label>
                  <Input
                    id="edit-raf-omru"
                    type="number"
                    value={formData.raf_omru_gun}
                    onChange={(e) => handleInputChange('raf_omru_gun', e.target.value)}
                    placeholder="365"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-agirlik">Ağırlık (g)</Label>
                  <Input
                    id="edit-agirlik"
                    type="number"
                    step="0.01"
                    value={formData.agirlik}
                    onChange={(e) => handleInputChange('agirlik', e.target.value)}
                    placeholder="500"
                  />
                </div>
              </div>
            </div>
            
            {/* Status */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Durum
              </h3>
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.aktif}
                    onChange={(e) => handleInputChange('aktif', e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Ürün aktif</span>
                </label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isUpdating}>
              İptal
            </Button>
            <Button onClick={handleUpdate} loading={isUpdating}>
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ürün Sil</DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz. <strong>{selectedUrun?.ad}</strong> ürününü silmek istediğinizden emin misiniz?
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDelete} loading={isDeleting}>
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
