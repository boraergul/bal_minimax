import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Package, ArrowLeft, Save, MapPin, Calendar, Star, Building2 } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/useToast'

// ==========================================
// TYPE DEFINITIONS
// ==========================================

interface Urun {
  id: string
  ad: string
  stok_kodu: string | null
}

interface Tedarikci {
  id: string
  ad: string
}

interface StokGirisRequest {
  urun_id: string
  tedarikci_id?: string
  miktar: number
  birim?: string
  birim_fiyat: number
  uretim_tarihi?: string
  son_kullanma?: string
  konum?: string
  giris_referans_no?: string
  kalite_notu?: number
}

interface StokResponse {
  id: string
  urun_id: string
  urun_ad: string
  lot_no: string
  stok_tipi: string
  birim: string
  miktar: number
  birim_fiyat: number
  giris_tarihi: string
  uretim_tarihi?: string
  son_kullanma?: string
  konum?: string
  tedarikci_id?: string
  tedarikci_ad?: string
  durum: string
  kalite_notu?: number
}

// ==========================================
// YUP VALIDATION SCHEMA
// ==========================================

const schema = yup.object({
  urun_id: yup.string().required('Ürün seçimi zorunludur'),
  tedarikci_id: yup.string().optional(),
  miktar: yup.number().required('Miktar zorunludur').positive('Miktar sıfırdan büyük olmalıdır'),
  birim: yup.string().default('kg'),
  birim_fiyat: yup.number().required('Birim fiyat zorunludur').min(0, 'Birim fiyat negatif olamaz'),
  uretim_tarihi: yup.string().optional(),
  son_kullanma: yup.string().optional(),
  konum: yup.string().optional(),
  giris_referans_no: yup.string().optional(),
  kalite_notu: yup.number().optional().min(1, 'Kalite notu minimum 1 olmalıdır').max(10, 'Kalite notu maksimum 10 olabilir'),
})

type FormData = yup.InferType<typeof schema>

// ==========================================
// CONSTANTS
// ==========================================

const BIRIM_SECENEKLERI = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'adet', label: 'Adet' },
  { value: 'lt', label: 'Litre (lt)' },
  { value: 'gr', label: 'Gram (gr)' },
]

// ==========================================
// MAIN COMPONENT
// ==========================================

export function StokGirisPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  // Form with react-hook-form and yup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      birim: 'kg',
      miktar: 0,
      birim_fiyat: 0,
    },
  })

  // Watch selected values
  const selectedBirim = watch('birim')

  // Fetch products
  const { data: urunlerData, isLoading: urunlerLoading } = useQuery({
    queryKey: ['urunler-dropdown'],
    queryFn: async () => {
      const response = await api.get('/urunler', {
        params: { sayfa: 1, sayfa_boyutu: 100 },
      })
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Fetch suppliers
  const { data: tedarikcilerData, isLoading: tedarikcilerLoading } = useQuery({
    queryKey: ['tedarikciler-dropdown'],
    queryFn: async () => {
      const response = await api.get('/tedarikciler', {
        params: { sayfa: 1, sayfa_boyutu: 100 },
      })
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Stock entry mutation
  const stokGirisMutation = useMutation({
    mutationFn: async (data: StokGirisRequest) => {
      const response = await api.post('/stok/giris', data)
      return response.data as StokResponse
    },
    onSuccess: (data) => {
      toast({
        title: 'Stok Girişi Başarılı',
        description: `${data.urun_ad} ürünü için stok girişi yapıldı. Lot No: ${data.lot_no}`,
        variant: 'success',
      })
      navigate('/stok')
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Stok girişi sırasında bir hata oluştu',
        variant: 'error',
      })
    },
  })

  // Form handlers
  const onSubmit = (data: FormData) => {
    const requestData: StokGirisRequest = {
      urun_id: data.urun_id,
      tedarikci_id: data.tedarikci_id || undefined,
      miktar: data.miktar,
      birim: data.birim || 'kg',
      birim_fiyat: data.birim_fiyat,
      uretim_tarihi: data.uretim_tarihi || undefined,
      son_kullanma: data.son_kullanma || undefined,
      konum: data.konum || undefined,
      giris_referans_no: data.giris_referans_no || undefined,
      kalite_notu: data.kalite_notu || undefined,
    }

    stokGirisMutation.mutate(requestData)
  }

  // Data
  const urunler: Urun[] = urunlerData?.data || []
  const tedarikciler: Tedarikci[] = tedarikcilerData?.data || []
  const isLoading = urunlerLoading || tedarikcilerLoading || stokGirisMutation.isPending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Yeni Stok Girişi
          </h2>
          <p className="text-sm text-secondary">
            Yeni stok girişi kaydı oluştur
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate('/stok')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Listeye Dön
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Selection Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Ürün Bilgileri
                </CardTitle>
                <CardDescription>
                  Stok girişi yapılacak ürünü seçin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product Selection */}
                <div className="space-y-2">
                  <Label htmlFor="urun_id">
                    Ürün <span className="text-danger">*</span>
                  </Label>
                  <Select
                    onValueChange={(value) => setValue('urun_id', value)}
                  >
                    <SelectTrigger className={errors.urun_id ? 'border-danger' : ''}>
                      <SelectValue placeholder="Ürün seçin..." />
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
                            {urun.ad}
                            {urun.stok_kodu && ` (${urun.stok_kodu})`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.urun_id && (
                    <p className="text-xs text-danger">{errors.urun_id.message}</p>
                  )}
                </div>

                {/* Supplier Selection */}
                <div className="space-y-2">
                  <Label htmlFor="tedarikci_id" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Tedarikçi
                  </Label>
                  <Select
                    onValueChange={(value) => setValue('tedarikci_id', value === 'none' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tedarikçi seçin (opsiyonel)..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tedarikçi Yok</SelectItem>
                      {tedarikcilerLoading ? (
                        <SelectItem value="loading" disabled>
                          Yükleniyor...
                        </SelectItem>
                      ) : tedarikciler.length === 0 ? (
                        <SelectItem value="empty" disabled>
                          Tedarikçi bulunamadı
                        </SelectItem>
                      ) : (
                        tedarikciler.map((tedarikci) => (
                          <SelectItem key={tedarikci.id} value={tedarikci.id}>
                            {tedarikci.ad}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Quantity & Price Card */}
            <Card>
              <CardHeader>
                <CardTitle>Miktar ve Fiyat</CardTitle>
                <CardDescription>
                  Giriş miktarı ve birim fiyat bilgilerini girin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label htmlFor="miktar">
                      Miktar <span className="text-danger">*</span>
                    </Label>
                    <Input
                      id="miktar"
                      type="number"
                      min={0}
                      step="any"
                      placeholder="0.00"
                      {...register('miktar', { valueAsNumber: true })}
                      className={errors.miktar ? 'border-danger' : ''}
                    />
                    {errors.miktar && (
                      <p className="text-xs text-danger">{errors.miktar.message}</p>
                    )}
                  </div>

                  {/* Unit */}
                  <div className="space-y-2">
                    <Label htmlFor="birim">Birim</Label>
                    <Select
                      value={selectedBirim || 'kg'}
                      onValueChange={(value) => setValue('birim', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BIRIM_SECENEKLERI.map((birim) => (
                          <SelectItem key={birim.value} value={birim.value}>
                            {birim.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Unit Price */}
                <div className="space-y-2">
                  <Label htmlFor="birim_fiyat">
                    Birim Fiyat (TL) <span className="text-danger">*</span>
                  </Label>
                  <Input
                    id="birim_fiyat"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    {...register('birim_fiyat', { valueAsNumber: true })}
                    className={errors.birim_fiyat ? 'border-danger' : ''}
                  />
                  {errors.birim_fiyat && (
                    <p className="text-xs text-danger">{errors.birim_fiyat.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Dates & Location Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Tarih ve Konum Bilgileri
                </CardTitle>
                <CardDescription>
                  Üretim tarihi, SKT ve depolama konumu bilgilerini girin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Production Date */}
                  <div className="space-y-2">
                    <Label htmlFor="uretim_tarihi">Üretim Tarihi</Label>
                    <Input
                      id="uretim_tarihi"
                      type="date"
                      {...register('uretim_tarihi')}
                    />
                  </div>

                  {/* Expiry Date */}
                  <div className="space-y-2">
                    <Label htmlFor="son_kullanma">Son Kullanma Tarihi (SKT)</Label>
                    <Input
                      id="son_kullanma"
                      type="date"
                      {...register('son_kullanma')}
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="konum" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Konum
                  </Label>
                  <Input
                    id="konum"
                    placeholder="Depo, raf numarası veya konum bilgisi..."
                    {...register('konum')}
                  />
                </div>

                {/* Reference Number */}
                <div className="space-y-2">
                  <Label htmlFor="giris_referans_no">Giriş Referans No</Label>
                  <Input
                    id="giris_referans_no"
                    placeholder="Fatura numarası veya referans..."
                    {...register('giris_referans_no')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quality Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Kalite Bilgileri
                </CardTitle>
                <CardDescription>
                  Ürün kalitesi ile ilgili not ve değerlendirmeler
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="kalite_notu">
                    Kalite Notu <span className="text-secondary">(1-10)</span>
                  </Label>
                  <Input
                    id="kalite_notu"
                    type="number"
                    min={1}
                    max={10}
                    placeholder="1-10 arası bir değer girin"
                    {...register('kalite_notu', { valueAsNumber: true })}
                    className={errors.kalite_notu ? 'border-danger' : ''}
                  />
                  {errors.kalite_notu && (
                    <p className="text-xs text-danger">{errors.kalite_notu.message}</p>
                  )}
                  <p className="text-xs text-secondary">
                    Ürün kalitesini 1 ( düşük) ile 10 (yüksek) arasında değerlendirin
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Özet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary Info */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Birim</span>
                    <span className="font-medium">
                      {BIRIM_SECENEKLERI.find(b => b.value === selectedBirim)?.label || 'kg'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-4">
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isLoading}
                    loading={stokGirisMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {stokGirisMutation.isPending ? 'Kaydediliyor...' : 'Stok Girişini Kaydet'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      reset()
                      navigate('/stok')
                    }}
                  >
                    İptal
                  </Button>
                </div>

                {/* Help Text */}
                <div className="p-4 bg-muted/50 rounded-lg mt-4">
                  <h4 className="font-medium text-sm mb-2">Bilgi</h4>
                  <ul className="text-xs text-secondary space-y-1">
                    <li>• Zorunlu alanlar işaretlenmiştir</li>
                    <li>• SKT tarihi ileride uyarı verir</li>
                    <li>• Kalite notu 1-10 arası olmalıdır</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
