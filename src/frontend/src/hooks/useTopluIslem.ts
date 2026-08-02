import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

// Backend router is registered at /api/v1/toplu-islem (singular)
const API_BASE = '/api/v1/toplu-islem'

// Types — aligned with backend TopluIslemResponse
export interface TopluIslem {
  id: string
  islem_no: string
  islem_turu: 'IMPORT' | 'EXPORT' | 'BATCH_UPDATE'
  islem_alt_turu?: string
  durum: 'BEKLEMEDE' | 'ISLENIYOR' | 'TAMAMLANDI' | 'HATALAR_VAR' | 'IPTAL_EDILDI'
  dosya_adi?: string
  satir_sayisi?: number
  basarili_satir?: number
  basarisiz_satir?: number
  islenen_satir?: number
  sonuc_dosya_url?: string
  not_text?: string
  olusturma_tarihi: string
  olusturan_kullanici_id?: string
  olusturan_ad?: string
}

export interface TopluIslemSatir {
  id: string
  islem_id: string
  satir_numarasi: number
  satir_verisi: Record<string, unknown>
  durum: 'BASARILI' | 'BASARISIZ' | 'ATLANDI'
  hata_mesaji?: string
  olusturulan_kayit_id?: string
}

export interface TopluIslemIndirResponse {
  url: string
  dosya_adi: string
}

export interface TopluIslemOnayResponse {
  message: string
  durum: string
  onay_tarihi: string
}

// Query hooks
export function useTopluIslemler(params?: {
  sayfa?: number
  sayfa_boyutu?: number
  islem_turu?: string
  durum?: string
  baslangic_tarihi?: string
  bitis_tarihi?: string
}) {
  return useQuery({
    queryKey: ['toplu-islemler', params],
    queryFn: async () => {
      const response = await api.get(API_BASE, { params })
      return response.data
    },
  })
}

export function useTopluIslem(islemId: string) {
  return useQuery({
    queryKey: ['toplu-islem', islemId],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/${islemId}`)
      return response.data
    },
    enabled: !!islemId,
  })
}

export function useTopluIslemSatirlar(
  islemId: string,
  params?: { sayfa?: number; sayfa_boyutu?: number }
) {
  return useQuery({
    queryKey: ['toplu-islem-satirlar', islemId, params],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/${islemId}/satirlar`, { params })
      return response.data
    },
    enabled: !!islemId,
  })
}

export function useTopluIslemIndir(islemId: string) {
  return useQuery({
    queryKey: ['toplu-islem-indir', islemId],
    queryFn: async () => {
      const response = await api.get<TopluIslemIndirResponse>(`${API_BASE}/${islemId}/indir`)
      return response.data
    },
    enabled: false, // manual trigger
  })
}

// Mutation hooks
export function useTopluIslemMutations() {
  const queryClient = useQueryClient()

  const createImportAsync = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post<TopluIslem>(`${API_BASE}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toplu-islemler'] })
    },
  })

  const approveAsync = useMutation({
    mutationFn: async (islemId: string) => {
      const response = await api.post<TopluIslemOnayResponse>(`${API_BASE}/${islemId}/onayla`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toplu-islemler'] })
      queryClient.invalidateQueries({ queryKey: ['toplu-islem'] })
    },
  })

  const cancelAsync = useMutation({
    mutationFn: async ({ islemId, iptal_nedeni }: { islemId: string; iptal_nedeni?: string }) => {
      // Backend uses /reddet, not /iptal
      const response = await api.post<TopluIslem>(`${API_BASE}/${islemId}/reddet`, {
        iptal_nedeni,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toplu-islemler'] })
      queryClient.invalidateQueries({ queryKey: ['toplu-islem'] })
    },
  })

  const deleteAsync = useMutation({
    mutationFn: async (islemId: string) => {
      await api.delete(`${API_BASE}/${islemId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toplu-islemler'] })
    },
  })

  return { createImportAsync, approveAsync, cancelAsync, deleteAsync }
}
