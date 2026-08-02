import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

const API_BASE = '/api/v1/toplu-islemler'

// Types
export interface TopluIslem {
  id: string
  islem_turu: 'import' | 'export' | 'batch_update'
  islem_alt_turu: string
  durum: 'beklemede' | 'isleniyor' | 'tamamlandi' | 'basarisiz' | 'iptal'
  dosya_adi: string
  toplam_satir: number
  basarili_satir: number
  basarisiz_satir: number
  olusturma_tarihi: string
  olusturan_ad: string
  tamamlanma_tarihi?: string
}

export interface TopluIslemSonuc {
  satir_id: string
  satir_numarasi: number
  durum: 'basarili' | 'basarisiz'
  satir_verisi: Record<string, unknown>
  hata_mesaji?: string
  olusturulan_kayit_id?: string
}

export interface TopluIslemSablon {
  sablon_id: string
  ad: string
  islem_alt_turu: string
  zorunlu_kolonlar: string[]
  maks_satir: number
  desteklenen_formatlar: ('xlsx' | 'csv')[]
}

export interface TopluIslemListResponse {
  data: TopluIslem[]
  toplam: number
  sayfa: number
  sayfa_boyutu: number
}

export interface ImportRequest {
  islem_alt_turu: string
  dosya: File | FormData
  sablon_id?: string
}

export interface ExportRequest {
  islem_alt_turu: string
  filtre?: Record<string, unknown>
  format: 'xlsx' | 'csv'
}

export interface ApproveRequest {
  islem_id: string
  onay_mesaji?: string
}

export interface CancelRequest {
  islem_id: string
  iptal_nedeni: string
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
      const response = await api.get<TopluIslemListResponse>(API_BASE, { params })
      return response.data
    },
  })
}

export function useTopluIslem(islemId: string) {
  return useQuery({
    queryKey: ['toplu-islem', islemId],
    queryFn: async () => {
      const response = await api.get<TopluIslem>(`${API_BASE}/${islemId}`)
      return response.data
    },
    enabled: !!islemId,
  })
}

export function useTopluIslemSonuc(islemId: string, params?: { sayfa?: number; sayfa_boyutu?: number; durum?: string }) {
  return useQuery({
    queryKey: ['toplu-islem-sonuc', islemId, params],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/${islemId}/sonuc`, { params })
      return response.data
    },
    enabled: !!islemId,
  })
}

export function useTopluIslemSablonlar() {
  return useQuery({
    queryKey: ['toplu-islem-sablonlar'],
    queryFn: async () => {
      const response = await api.get<TopluIslemSablon[]>(`${API_BASE}/sablonlar`)
      return response.data
    },
  })
}

export function useTopluIslemSablon(sablonId: string) {
  return useQuery({
    queryKey: ['toplu-islem-sablon', sablonId],
    queryFn: async () => {
      const response = await api.get<TopluIslemSablon>(`${API_BASE}/sablonlar/${sablonId}`)
      return response.data
    },
    enabled: !!sablonId,
  })
}

// Mutation hooks
export function useTopluIslemMutations() {
  const queryClient = useQueryClient()

  const createImportAsync = useMutation({
    mutationFn: async (data: ImportRequest) => {
      const formData = data.dosya instanceof File
        ? new FormData()
        : data.dosya as FormData
      
      if (data.dosya instanceof File) {
        formData.append('file', data.dosya)
        formData.append('islem_alt_turu', data.islem_alt_turu)
        if (data.sablon_id) formData.append('sablon_id', data.sablon_id)
      }
      
      const response = await api.post<TopluIslem>(`${API_BASE}/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toplu-islemler'] })
    },
  })

  const createExportAsync = useMutation({
    mutationFn: async (data: ExportRequest) => {
      const response = await api.post(`${API_BASE}/export`, data, {
        responseType: 'blob',
      })
      return response.data
    },
  })

  const approveAsync = useMutation({
    mutationFn: async (data: ApproveRequest) => {
      const response = await api.post(`${API_BASE}/${data.islem_id}/onayla`, {
        onay_mesaji: data.onay_mesaji,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toplu-islemler'] })
    },
  })

  const cancelAsync = useMutation({
    mutationFn: async (data: CancelRequest) => {
      const response = await api.post(`${API_BASE}/${data.islem_id}/iptal`, {
        iptal_nedeni: data.iptal_nedeni,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toplu-islemler'] })
    },
  })

  const retryAsync = useMutation({
    mutationFn: async (islemId: string) => {
      const response = await api.post(`${API_BASE}/${islemId}/yeniden-baslat`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toplu-islemler'] })
    },
  })

  return { createImportAsync, createExportAsync, approveAsync, cancelAsync, retryAsync }
}
