import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/useToast'

interface MusteriCreate {
  ad: string
  telefon?: string
  eposta?: string
  adres?: string
  vergi_no?: string
  musteri_tipi?: 'BIREYSEL' | 'KURUMSAL'
  musteri_sinifi?: 'A' | 'B' | 'C'
  teslimat_adresi?: string
  il?: string
  ilce?: string
  odeme_vadesi?: number
}

const schema = yup.object({
  ad: yup.string().required('Müşteri adı zorunludur'),
  telefon: yup.string().optional(),
  eposta: yup.string().email('Geçerli bir e-posta adresi giriniz').optional(),
  adres: yup.string().optional(),
  vergi_no: yup.string().optional(),
  musteri_tipi: yup.string().oneOf(['BIREYSEL', 'KURUMSAL']).optional(),
  musteri_sinifi: yup.string().oneOf(['A', 'B', 'C']).optional(),
  teslimat_adresi: yup.string().optional(),
  il: yup.string().optional(),
  ilce: yup.string().optional(),
  odeme_vadesi: yup.number().oneOf([7, 14, 30, 60, 90]).optional(),
})

export default function MusteriCreatePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<MusteriCreate>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      ad: '',
      telefon: '',
      eposta: '',
      adres: '',
      vergi_no: '',
      musteri_tipi: undefined,
      musteri_sinifi: undefined,
      teslimat_adresi: '',
      il: '',
      ilce: '',
      odeme_vadesi: undefined,
    },
  })

  const musteriTipiValue = watch('musteri_tipi')
  const musteriSinifiValue = watch('musteri_sinifi')
  const odemeVadesiValue = watch('odeme_vadesi')

  const createMusteri = useMutation({
    mutationFn: async (data: MusteriCreate) => {
      const response = await api.post('/musteriler', data)
      return response.data
    },
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Müşteri başarıyla eklendi.',
        variant: 'default',
      })
      reset()
      navigate('/musteriler')
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Müşteri eklenirken bir hata oluştu.'
      setServerError(errorMessage)
      toast({
        title: 'Hata',
        description: errorMessage,
        variant: 'destructive',
      })
    },
  })

  const onSubmit = (data: MusteriCreate) => {
    setServerError(null)
    const payload: MusteriCreate = { ...data }
    if (!payload.musteri_tipi) delete payload.musteri_tipi
    if (!payload.musteri_sinifi) delete payload.musteri_sinifi
    if (!payload.odeme_vadesi) delete payload.odeme_vadesi
    createMusteri.mutate(payload)
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/musteriler')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Button>
        <h1 className="text-2xl font-semibold">Yeni Müşteri Ekle</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {serverError && (
              <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
                {serverError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ad">
                  Ad <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ad"
                  {...register('ad')}
                  placeholder="Müşteri adı"
                />
                {errors.ad && (
                  <p className="text-sm text-red-500">{errors.ad.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefon">Telefon</Label>
                <Input
                  id="telefon"
                  {...register('telefon')}
                  placeholder="0 (5XX) XXX XX XX"
                />
                {errors.telefon && (
                  <p className="text-sm text-red-500">{errors.telefon.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eposta">E-posta</Label>
              <Input
                id="eposta"
                type="email"
                {...register('eposta')}
                placeholder="ornek@email.com"
              />
              {errors.eposta && (
                <p className="text-sm text-red-500">{errors.eposta.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="adres">Adres</Label>
              <Input
                id="adres"
                {...register('adres')}
                placeholder="Tam adres"
              />
              {errors.adres && (
                <p className="text-sm text-red-500">{errors.adres.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vergi_no">Vergi No</Label>
                <Input
                  id="vergi_no"
                  {...register('vergi_no')}
                  placeholder="Vergi numarası"
                />
                {errors.vergi_no && (
                  <p className="text-sm text-red-500">{errors.vergi_no.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="musteri_tipi">Müşteri Tipi</Label>
                <Select
                  value={musteriTipiValue}
                  onValueChange={(value: 'BIREYSEL' | 'KURUMSAL') =>
                    setValue('musteri_tipi', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BIREYSEL">Bireysel</SelectItem>
                    <SelectItem value="KURUMSAL">Kurumsal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="musteri_sinifi">Sınıf</Label>
                <Select
                  value={musteriSinifiValue}
                  onValueChange={(value: 'A' | 'B' | 'C') =>
                    setValue('musteri_sinifi', value)
                  }
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

              <div className="space-y-2">
                <Label htmlFor="odeme_vadesi">Ödeme Vadesi (Gün)</Label>
                <Select
                  value={odemeVadesiValue?.toString() || ''}
                  onValueChange={(value) =>
                    setValue('odeme_vadesi', parseInt(value, 10))
                  }
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="teslimat_adresi">Teslimat Adresi</Label>
              <Input
                id="teslimat_adresi"
                {...register('teslimat_adresi')}
                placeholder="Teslimat adresi"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="il">İl</Label>
                <Input
                  id="il"
                  {...register('il')}
                  placeholder="İl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ilce">İlçe</Label>
                <Input
                  id="ilce"
                  {...register('ilce')}
                  placeholder="İlçe"
                />
              </div>
            </div>

            <div className="flex gap-4 justify-end pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/musteriler')}
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={createMusteri.isPending}
              >
                {createMusteri.isPending ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Ekleniyor...
                  </>
                ) : (
                  'Kaydet'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
