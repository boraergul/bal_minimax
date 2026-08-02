import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useForm, SubmitHandler } from 'react-hook-form'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Loader2, Save, AlertCircle, CheckCircle } from 'lucide-react'

interface TedarikciCreate {
  ad: string
  vergi_no: string
  telefon?: string
  eposta?: string
  adres?: string
  faks?: string
  yetkili_kisi?: string
  yetkili_telefon?: string
  yetkili_eposta?: string
  banka_adi?: string
  banka_sube?: string
  hesap_no?: string
  odeme_vadesi?: number
  tedarikci_sinifi?: string
  not_text?: string
}

export function TedarikciCreatePage() {
  const navigate = useNavigate()
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TedarikciCreate>({
    defaultValues: {
      odeme_vadesi: undefined,
      tedarikci_sinifi: undefined,
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: TedarikciCreate) => {
      const response = await api.post('/tedarikciler', data)
      return response.data
    },
    onSuccess: () => {
      setSubmitSuccess(true)
      setSubmitError(null)
      setTimeout(() => {
        navigate('/tedarikciler')
      }, 1500)
    },
    onError: (error: any) => {
      setSubmitError(
        error?.response?.data?.message ||
        error?.message ||
        'Tedarikçi eklenirken bir hata oluştu'
      )
      setSubmitSuccess(false)
    },
  })

  const onSubmit: SubmitHandler<TedarikciCreate> = (data) => {
    setSubmitSuccess(false)
    setSubmitError(null)
    mutation.mutate(data)
  }

  const odemeVadesiValue = watch('odeme_vadesi')
  const tedarikciSinifiValue = watch('tedarikci_sinifi')

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/tedarikciler')}
            className="mb-4 pl-0 hover:bg-transparent hover:text-primary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tedarikçiler
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">
            Yeni Tedarikçi Ekle
          </h1>
        </div>

        {/* Success Message */}
        {submitSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800">Tedarikçi başarıyla eklendi. Yönlendiriliyorsunuz...</span>
          </div>
        )}

        {/* Error Message */}
        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800">{submitError}</span>
          </div>
        )}

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Temel Bilgiler */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Temel Bilgiler</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Firma Adı */}
                  <div className="md:col-span-2">
                    <Label htmlFor="ad" className="text-red-500">
                      Firma Adı <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="ad"
                      {...register('ad', { required: 'Firma adı zorunludur' })}
                      placeholder="Firma adını giriniz"
                      className={errors.ad ? 'border-red-500' : ''}
                    />
                    {errors.ad && (
                      <p className="mt-1 text-sm text-red-500">{errors.ad.message}</p>
                    )}
                  </div>

                  {/* Vergi No */}
                  <div className="md:col-span-2">
                    <Label htmlFor="vergi_no" className="text-red-500">
                      Vergi No <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="vergi_no"
                      {...register('vergi_no', { required: 'Vergi numarası zorunludur' })}
                      placeholder="Vergi numarasını giriniz"
                      className={errors.vergi_no ? 'border-red-500' : ''}
                    />
                    {errors.vergi_no && (
                      <p className="mt-1 text-sm text-red-500">{errors.vergi_no.message}</p>
                    )}
                  </div>

                  {/* Telefon */}
                  <div>
                    <Label htmlFor="telefon">Telefon</Label>
                    <Input
                      id="telefon"
                      {...register('telefon')}
                      placeholder="0212 XXX XX XX"
                    />
                  </div>

                  {/* E-posta */}
                  <div>
                    <Label htmlFor="eposta">E-posta</Label>
                    <Input
                      id="eposta"
                      type="email"
                      {...register('eposta', {
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Geçerli bir e-posta adresi giriniz',
                        },
                      })}
                      placeholder="ornek@firma.com"
                      className={errors.eposta ? 'border-red-500' : ''}
                    />
                    {errors.eposta && (
                      <p className="mt-1 text-sm text-red-500">{errors.eposta.message}</p>
                    )}
                  </div>

                  {/* Adres */}
                  <div className="md:col-span-2">
                    <Label htmlFor="adres">Adres</Label>
                    <Input
                      id="adres"
                      {...register('adres')}
                      placeholder="Tam adres bilgisi"
                    />
                  </div>

                  {/* Faks */}
                  <div>
                    <Label htmlFor="faks">Faks</Label>
                    <Input
                      id="faks"
                      {...register('faks')}
                      placeholder="Faks numarası"
                    />
                  </div>
                </div>
              </div>

              {/* Yetkili Kişi */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Yetkili Kişi</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Yetkili Kişi */}
                  <div>
                    <Label htmlFor="yetkili_kisi">Yetkili Kişi</Label>
                    <Input
                      id="yetkili_kisi"
                      {...register('yetkili_kisi')}
                      placeholder="Yetkili kişi adı"
                    />
                  </div>

                  {/* Yetkili Telefon */}
                  <div>
                    <Label htmlFor="yetkili_telefon">Yetkili Telefon</Label>
                    <Input
                      id="yetkili_telefon"
                      {...register('yetkili_telefon')}
                      placeholder="Yetkili telefon"
                    />
                  </div>

                  {/* Yetkili E-posta */}
                  <div className="md:col-span-2">
                    <Label htmlFor="yetkili_eposta">Yetkili E-posta</Label>
                    <Input
                      id="yetkili_eposta"
                      type="email"
                      {...register('yetkili_eposta', {
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Geçerli bir e-posta adresi giriniz',
                        },
                      })}
                      placeholder="Yetkili e-posta adresi"
                      className={errors.yetkili_eposta ? 'border-red-500' : ''}
                    />
                    {errors.yetkili_eposta && (
                      <p className="mt-1 text-sm text-red-500">{errors.yetkili_eposta.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Banka Bilgileri */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Banka Bilgileri</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Banka Adı */}
                  <div>
                    <Label htmlFor="banka_adi">Banka Adı</Label>
                    <Input
                      id="banka_adi"
                      {...register('banka_adi')}
                      placeholder="Banka adı"
                    />
                  </div>

                  {/* Banka Şube */}
                  <div>
                    <Label htmlFor="banka_sube">Banka Şube</Label>
                    <Input
                      id="banka_sube"
                      {...register('banka_sube')}
                      placeholder="Şube adı/kodu"
                    />
                  </div>

                  {/* Hesap No */}
                  <div className="md:col-span-2">
                    <Label htmlFor="hesap_no">Hesap No</Label>
                    <Input
                      id="hesap_no"
                      {...register('hesap_no')}
                      placeholder="IBAN veya hesap numarası"
                    />
                  </div>
                </div>
              </div>

              {/* Tedarikçi Sınıfı ve Ödeme Vadesi */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Sınıflandırma ve Ödeme</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Ödeme Vadesi */}
                  <div>
                    <Label htmlFor="odeme_vadesi">Ödeme Vadesi (Gün)</Label>
                    <Select
                      value={odemeVadesiValue?.toString() || ''}
                      onValueChange={(value) => setValue('odeme_vadesi', value ? parseInt(value) : undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seçiniz" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 Gün</SelectItem>
                        <SelectItem value="14">14 Gün</SelectItem>
                        <SelectItem value="30">30 Gün</SelectItem>
                        <SelectItem value="60">60 Gün</SelectItem>
                        <SelectItem value="90">90 Gün</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tedarikçi Sınıfı */}
                  <div>
                    <Label htmlFor="tedarikci_sinifi">Sınıf</Label>
                    <Select
                      value={tedarikciSinifiValue || ''}
                      onValueChange={(value) => setValue('tedarikci_sinifi', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seçiniz" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A Sınıfı</SelectItem>
                        <SelectItem value="B">B Sınıfı</SelectItem>
                        <SelectItem value="C">C Sınıfı</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Not */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Notlar</h2>
                <div>
                  <Label htmlFor="not_text">Not</Label>
                  <textarea
                    id="not_text"
                    {...register('not_text')}
                    placeholder="Tedarikçi ile ilgili notlar..."
                    rows={4}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/tedarikciler')}
                  disabled={mutation.isPending}
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="min-w-[120px]"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Kaydet
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default TedarikciCreatePage
