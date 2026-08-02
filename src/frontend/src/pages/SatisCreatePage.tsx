import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ShoppingCart,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Calculator,
  Package,
  User,
} from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSatisMutations } from '@/hooks/useSatisMutations'
import type { Musteri, Urun, SatisCreateRequest } from '@/types'

// ==========================================
// TYPE DEFINITIONS
// ==========================================

type SatisTipi = 'PERAKENDE' | 'TOPTAN' | 'OZEL_SIPARIS'
type OdemeSekli = 'NAKIT' | 'CEK' | 'HAVALE' | 'KREDI_KARTI' | 'KAPIDA_ODEME'

interface SatisKalemForm {
  id: string
  urun_id: string
  urun_ad?: string
  miktar: number | string
  birim_fiyat: number | string
  tutar: number
}

interface FormErrors {
  musteri_id?: string
  tarih?: string
  kalemler?: string
  general?: string
}

const SATIS_TIPI_LABELS: Record<SatisTipi, string> = {
  PERAKENDE: 'Perakende',
  TOPTAN: 'Toptan',
  OZEL_SIPARIS: 'Özel Sipariş',
}

const ODEME_SEKLI_LABELS: Record<OdemeSekli, string> = {
  NAKIT: 'Nakit',
  CEK: 'Çek',
  HAVALE: 'Havale / EFT',
  KREDI_KARTI: 'Kredi Kartı',
  KAPIDA_ODEME: 'Kapıda Ödeme',
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function generateKalemId(): string {
  return `kalem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0]
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function SatisCreatePage() {
  const navigate = useNavigate()
  const { createAsync, isCreating } = useSatisMutations()

  // Form state
  const [musteri_id, setMusteriId] = useState<string>('')
  const [tarih, setTarih] = useState<string>(formatDateForInput(new Date()))
  const [teslimat_adresi, setTeslimatAdresi] = useState<string>('')
  const [satis_tipi, setSatisTipi] = useState<SatisTipi>('TOPTAN')
  const [odeme_sekli, setOdemeSekli] = useState<OdemeSekli>('NAKIT')
  const [not_text, setNotText] = useState<string>('')
  const [kalemler, setKalemler] = useState<SatisKalemForm[]>([
    { id: generateKalemId(), urun_id: '', miktar: 1, birim_fiyat: 0, tutar: 0 },
  ])
  const [errors, setErrors] = useState<FormErrors>({})
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Fetch customers for dropdown
  const { data: musterilerData, isLoading: musterilerLoading } = useQuery({
    queryKey: ['musteriler-dropdown'],
    queryFn: async () => {
      const response = await api.get('/musteriler', {
        params: { sayfa: 1, sayfa_boyutu: 100, sadece_aktif: true },
      })
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const musteriler: Musteri[] = musterilerData?.data || []

  // Calculate total
  const totalTutar = useMemo(() => {
    return kalemler.reduce((sum, kalem) => {
      const miktar = typeof kalem.miktar === 'string' ? parseFloat(kalem.miktar) || 0 : kalem.miktar
      const birimFiyat = typeof kalem.birim_fiyat === 'string' ? parseFloat(kalem.birim_fiyat) || 0 : kalem.birim_fiyat
      return sum + miktar * birimFiyat
    }, 0)
  }, [kalemler])

  // Handle kalem changes
  const updateKalem = useCallback((id: string, field: keyof SatisKalemForm, value: string | number) => {
    setKalemler((prev) =>
      prev.map((kalem) => {
        if (kalem.id !== id) return kalem

        const updated = { ...kalem, [field]: value }

        // Auto-calculate tutar
        if (field === 'miktar' || field === 'birim_fiyat') {
          const miktar = typeof updated.miktar === 'string' ? parseFloat(updated.miktar) || 0 : updated.miktar
          const birimFiyat = typeof updated.birim_fiyat === 'string' ? parseFloat(updated.birim_fiyat) || 0 : updated.birim_fiyat
          updated.tutar = miktar * birimFiyat
        }

        return updated
      })
    )
  }, [])

  // Add new kalem
  const addKalem = useCallback(() => {
    setKalemler((prev) => [
      ...prev,
      { id: generateKalemId(), urun_id: '', miktar: 1, birim_fiyat: 0, tutar: 0 },
    ])
  }, [])

  // Remove kalem
  const removeKalem = useCallback((id: string) => {
    setKalemler((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((kalem) => kalem.id !== id)
    })
  }, [])

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!musteri_id) {
      newErrors.musteri_id = 'Müşteri seçimi zorunludur'
    }

    if (!tarih) {
      newErrors.tarih = 'Tarih zorunludur'
    }

    // Validate kalemler
    const validKalemler = kalemler.filter((k) => k.urun_id && k.miktar > 0 && k.birim_fiyat > 0)
    if (validKalemler.length === 0) {
      newErrors.kalemler = 'En az bir geçerli kalem eklenmelidir'
    }

    // Check for duplicate products
    const urunIds = kalemler.filter((k) => k.urun_id).map((k) => k.urun_id)
    const duplicates = urunIds.filter((id, index) => urunIds.indexOf(id) !== index)
    if (duplicates.length > 0) {
      newErrors.kalemler = 'Aynı ürün birden fazla kez eklenemez'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return

    setShowConfirmDialog(true)
  }

  const confirmSubmit = async () => {
    setShowConfirmDialog(false)

    const validKalemler = kalemler.filter((k) => k.urun_id && k.miktar > 0 && k.birim_fiyat > 0)

    const payload: SatisCreateRequest = {
      musteri_id,
      kalemler: validKalemler.map((k) => ({
        urun_id: k.urun_id,
        miktar: typeof k.miktar === 'string' ? parseFloat(k.miktar) || 0 : k.miktar,
        birim_fiyat: typeof k.birim_fiyat === 'string' ? parseFloat(k.birim_fiyat) || 0 : k.birim_fiyat,
      })),
      teslimat_adresi: teslimat_adresi || undefined,
      odeme_sekli: odeme_sekli || undefined,
      not_text: not_text || undefined,
    }

    try {
      const result = await createAsync(payload)
      
      // Show success and navigate
      if (result?.id) {
        navigate(`/satis/${result.id}`)
      } else {
        navigate('/satis')
      }
    } catch (error: any) {
      setErrors({
        general: error.response?.data?.message || 'Satış oluşturulurken bir hata oluştu',
      })
    }
  }

  // Get selected customer info
  const selectedMusteri = musteriler.find((m) => m.id === musteri_id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Yeni Satış
          </h2>
          <p className="text-sm text-secondary">
            Yeni satış kaydı oluştur
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate('/satis')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Listeye Dön
          </Button>
        </div>
      </div>

      {/* General Error */}
      {errors.general && (
        <Card className="border-danger bg-danger/10">
          <CardContent className="p-4">
            <p className="text-sm text-danger">{errors.general}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Date Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Müşteri Bilgileri
              </CardTitle>
              <CardDescription>
                Satış yapılacak müşteriyi ve tarih bilgisini seçin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer Selection */}
                <div className="space-y-2">
                  <Label htmlFor="musteri_id">
                    Müşteri <span className="text-danger">*</span>
                  </Label>
                  <Select value={musteri_id} onValueChange={setMusteriId}>
                    <SelectTrigger className={errors.musteri_id ? 'border-danger' : ''}>
                      <SelectValue placeholder="Müşteri seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {musterilerLoading ? (
                        <SelectItem value="loading" disabled>
                          Yükleniyor...
                        </SelectItem>
                      ) : musteriler.length === 0 ? (
                        <SelectItem value="empty" disabled>
                          Müşteri bulunamadı
                        </SelectItem>
                      ) : (
                        musteriler.map((musteri) => (
                          <SelectItem key={musteri.id} value={musteri.id}>
                            {musteri.ad}
                            {musteri.firma_adi && ` (${musteri.firma_adi})`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.musteri_id && (
                    <p className="text-xs text-danger">{errors.musteri_id}</p>
                  )}
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="tarih">
                    Tarih <span className="text-danger">*</span>
                  </Label>
                  <Input
                    id="tarih"
                    type="date"
                    value={tarih}
                    onChange={(e) => setTarih(e.target.value)}
                    className={errors.tarih ? 'border-danger' : ''}
                  />
                  {errors.tarih && (
                    <p className="text-xs text-danger">{errors.tarih}</p>
                  )}
                </div>
              </div>

              {/* Selected Customer Info */}
              {selectedMusteri && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedMusteri.telefon && (
                      <div>
                        <span className="text-secondary">Tel:</span>{' '}
                        {selectedMusteri.telefon}
                      </div>
                    )}
                    {selectedMusteri.eposta && (
                      <div>
                        <span className="text-secondary">E-posta:</span>{' '}
                        {selectedMusteri.eposta}
                      </div>
                    )}
                    {selectedMusteri.adres && (
                      <div className="col-span-2">
                        <span className="text-secondary">Adres:</span>{' '}
                        {selectedMusteri.adres}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sales Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="satis_tipi">Satış Tipi</Label>
                  <Select value={satis_tipi} onValueChange={(v) => setSatisTipi(v as SatisTipi)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SATIS_TIPI_LABELS) as SatisTipi[]).map((tip) => (
                        <SelectItem key={tip} value={tip}>
                          {SATIS_TIPI_LABELS[tip]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="odeme_sekli">Ödeme Şekli</Label>
                  <Select value={odeme_sekli} onValueChange={(v) => setOdemeSekli(v as OdemeSekli)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ODEME_SEKLI_LABELS) as OdemeSekli[]).map((sekil) => (
                        <SelectItem key={sekil} value={sekil}>
                          {ODEME_SEKLI_LABELS[sekil]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="space-y-2">
                <Label htmlFor="teslimat_adresi">Teslimat Adresi</Label>
                <Textarea
                  id="teslimat_adresi"
                  placeholder="Teslimat adresini girin veya müşteri adresini kullanın..."
                  value={teslimat_adresi}
                  onChange={(e) => setTeslimatAdresi(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Satış Kalemleri
              </CardTitle>
              <CardDescription>
                Satılacak ürünleri ve miktarlarını ekleyin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errors.kalemler && (
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg">
                  <p className="text-sm text-danger">{errors.kalemler}</p>
                </div>
              )}

              {/* Line Items Table Header */}
              <div className="grid grid-cols-12 gap-2 px-1 text-sm font-medium text-secondary">
                <div className="col-span-4">Ürün</div>
                <div className="col-span-2">Miktar</div>
                <div className="col-span-2">Birim Fiyat</div>
                <div className="col-span-2">Tutar</div>
                <div className="col-span-2"></div>
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                {kalemler.map((kalem, index) => (
                  <KalemRow
                    key={kalem.id}
                    kalem={kalem}
                    index={index}
                    onUpdate={updateKalem}
                    onRemove={removeKalem}
                    canRemove={kalemler.length > 1}
                  />
                ))}
              </div>

              {/* Add Line Item Button */}
              <Button variant="outline" onClick={addKalem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Kalem Ekle
              </Button>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card>
            <CardHeader>
              <CardTitle>Notlar</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Satış ile ilgili notlarınızı girin..."
                value={not_text}
                onChange={(e) => setNotText(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Sipariş Özeti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary Stats */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Kalem Sayısı</span>
                  <span className="font-medium">
                    {kalemler.filter((k) => k.urun_id).length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Satış Tipi</span>
                  <Badge variant="secondary">{SATIS_TIPI_LABELS[satis_tipi]}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Ödeme</span>
                  <Badge variant="secondary">{ODEME_SEKLI_LABELS[odeme_sekli]}</Badge>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Toplam Tutar</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(totalTutar)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-4">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={isCreating}
                  loading={isCreating}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isCreating ? 'Kaydediliyor...' : 'Satışı Kaydet'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/satis')}
                >
                  İptal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Satışı Onayla</DialogTitle>
            <DialogDescription>
              Satış kaydını oluşturmak üzeresiniz. İşlemi onaylıyor musunuz?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-secondary">Müşteri:</span>
                <span className="font-medium">
                  {musteriler.find((m) => m.id === musteri_id)?.ad || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Tarih:</span>
                <span className="font-medium">
                  {tarih ? new Date(tarih).toLocaleDateString('tr-TR') : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Kalem Sayısı:</span>
                <span className="font-medium">
                  {kalemler.filter((k) => k.urun_id).length}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 mt-2">
                <span className="font-semibold">Toplam:</span>
                <span className="font-bold text-primary">
                  {formatCurrency(totalTutar)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              İptal
            </Button>
            <Button onClick={confirmSubmit} disabled={isCreating}>
              {isCreating ? 'Kaydediliyor...' : 'Onayla ve Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==========================================
// KALEM ROW COMPONENT
// ==========================================

interface KalemRowProps {
  kalem: SatisKalemForm
  index: number
  onUpdate: (id: string, field: keyof SatisKalemForm, value: string | number) => void
  onRemove: (id: string) => void
  canRemove: boolean
}

function KalemRow({ kalem, index, onUpdate, onRemove, canRemove }: KalemRowProps) {
  const [showDropdown, setShowDropdown] = useState(false)

  // Fetch products for dropdown
  const { data: urunlerData, isLoading: urunlerLoading } = useQuery({
    queryKey: ['urunler-dropdown'],
    queryFn: async () => {
      const response = await api.get('/urunler', {
        params: { sayfa: 1, sayfa_boyutu: 100, sadece_aktif: true },
      })
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const urunler: Urun[] = urunlerData?.data || []

  const selectedUrun = urunler.find((u) => u.id === kalem.urun_id)

  return (
    <div className="grid grid-cols-12 gap-2 items-start p-3 bg-muted/30 rounded-lg">
      {/* Product Selection */}
      <div className="col-span-4">
        <Select
          value={kalem.urun_id}
          onValueChange={(value) => onUpdate(kalem.id, 'urun_id', value)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Ürün seç..." />
          </SelectTrigger>
          <SelectContent>
            {urunlerLoading ? (
              <SelectItem value="loading" disabled>
                Yükleniyor...
              </SelectItem>
            ) : urunler.length === 0 ? (
              <SelectItem value="empty" disabled>
                Ürün bulunamadı
              </SelectItem>
            ) : (
              urunler.map((urun) => (
                <SelectItem key={urun.id} value={urun.id}>
                  <div className="flex flex-col">
                    <span>{urun.ad}</span>
                    <span className="text-xs text-secondary">{urun.kod || urun.stok_kodu}</span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Quantity */}
      <div className="col-span-2">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={kalem.miktar}
          onChange={(e) => onUpdate(kalem.id, 'miktar', e.target.value)}
          className="h-9"
          placeholder="Adet"
        />
      </div>

      {/* Unit Price */}
      <div className="col-span-2">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={kalem.birim_fiyat}
          onChange={(e) => onUpdate(kalem.id, 'birim_fiyat', e.target.value)}
          className="h-9"
          placeholder="Fiyat"
        />
      </div>

      {/* Total */}
      <div className="col-span-2 flex items-center">
        <span className="font-medium text-sm w-full">
          {formatCurrency(kalem.tutar)}
        </span>
      </div>

      {/* Actions */}
      <div className="col-span-2 flex items-center justify-end">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemove(kalem.id)}
          disabled={!canRemove}
          className="text-secondary hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
