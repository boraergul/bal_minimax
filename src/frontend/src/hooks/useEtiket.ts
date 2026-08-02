import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

const API_BASE = '/api/v1/etiket'

// Types
export interface EtiketSablon {
  id: string
  ad: string
  sablon_tipi: 'urun' | 'lot' | 'musteri' | 'tedarikci'
  kullanim_yeri: string
  genislik_mm: number
  yukseklik_mm: number
  cikti_format: 'pdf' | 'zpl' | 'png' | 'jpg'
  zpl_sablon?: string
  alanlar: EtiketAlan[]
  aktif: boolean
  varsayilan: boolean
}

export interface EtiketAlan {
  id: string
  sablon_id: string
  alan_adi: string
  goruntu_ad: string
  x_mm: number
  y_mm: number
  genislik_mm: number
  yukseklik_mm: number
  font_adi: string
  font_boyutu: number
  barcode_tipi?: 'code128' | 'code39' | 'ean13' | 'qrcode'
}

export interface BarkodOlusturRequest {
  urun_id: string
  lot_no?: string
}

export interface BarkodResponse {
  barkod: string
  format: string
  data_url?: string
}

export interface EtiketYazdirRequest {
  stok_id: string
  sablon_id: string
  miktar?: number
}

export interface LotYazdirRequest {
  lot_no: string
  sablon_id: string
  miktar?: number
}

// Query hooks
export function useEtiketSablonlar() {
  return useQuery({
    queryKey: ['etiket-sablonlar'],
    queryFn: async () => {
      const response = await api.get<EtiketSablon[]>(`${API_BASE}/sablonlar`)
      return response.data
    },
  })
}

export function useEtiketSablon(sablonId: string) {
  return useQuery({
    queryKey: ['etiket-sablon', sablonId],
    queryFn: async () => {
      const response = await api.get<EtiketSablon>(`${API_BASE}/sablonlar/${sablonId}`)
      return response.data
    },
    enabled: !!sablonId,
  })
}

export function useEtiketAlanlar(sablonId: string) {
  return useQuery({
    queryKey: ['etiket-alanlar', sablonId],
    queryFn: async () => {
      const response = await api.get<EtiketAlan[]>(`${API_BASE}/sablonlar/${sablonId}/alanlar`)
      return response.data
    },
    enabled: !!sablonId,
  })
}

// Mutation hooks
export function useEtiketYazdir() {
  return useMutation({
    mutationFn: async (data: EtiketYazdirRequest) => {
      const response = await api.post(`${API_BASE}/yazdir`, data)
      return response.data
    },
  })
}

export function useEtiketLotYazdir() {
  return useMutation({
    mutationFn: async (data: LotYazdirRequest) => {
      const response = await api.post(`${API_BASE}/lot-yazdir`, data)
      return response.data
    },
  })
}

export function useBarkodOlustur() {
  return useMutation({
    mutationFn: async (data: BarkodOlusturRequest) => {
      const response = await api.post<BarkodResponse>(`${API_BASE}/barkod-olustur`, data)
      return response.data
    },
  })
}

export function useEtiketMutations() {
  const queryClient = useQueryClient()

  const createAsync = useMutation({
    mutationFn: async (data: Partial<EtiketSablon>) => {
      const response = await api.post<EtiketSablon>(`${API_BASE}/sablonlar`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etiket-sablonlar'] })
    },
  })

  const updateAsync = useMutation({
    mutationFn: async ({ id, ...data }: Partial<EtiketSablon> & { id: string }) => {
      const response = await api.put<EtiketSablon>(`${API_BASE}/sablonlar/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etiket-sablonlar'] })
    },
  })

  const deleteAsync = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${API_BASE}/sablonlar/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etiket-sablonlar'] })
    },
  })

  const updateAlanAsync = useMutation({
    mutationFn: async ({ sablonId, alanId, ...data }: { sablonId: string; alanId: string; [key: string]: unknown }) => {
      const response = await api.put<EtiketAlan>(`${API_BASE}/sablonlar/${sablonId}/alanlar/${alanId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etiket-alanlar'] })
    },
  })

  return { createAsync, updateAsync, deleteAsync, updateAlanAsync }
}
