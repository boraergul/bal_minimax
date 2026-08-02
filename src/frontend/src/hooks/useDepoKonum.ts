import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

const API_BASE = '/api/v1/depo'

// Types
export interface DepoKonum {
  id: string
  depo_id: string
  konum_kodu: string
  konum_ad: string
  blok?: string
  raf?: string
  sutun?: string
  kat?: number
  x_koordinat?: number
  y_koordinat?: number
  z_koordinat?: number
  konum_tipi: 'stok' | 'depo' | 'sevkiyat' | 'karantina' | 'iade'
  kapasite?: number
  mevcut_doluluk?: number
  sicaklik_tipi?: 'ambient' | 'chilled' | 'frozen'
  aktif: boolean
  depo_ad?: string
  depo_kodu?: string
}

export interface DepoBlok {
  id: string
  depo_id: string
  blok_kodu: string
  blok_ad: string
  kat_sayisi?: number
  raf_sayisi?: number
  kapasite?: number
  mevcut_doluluk?: number
  aktif: boolean
}

export interface DepoKonumListResponse {
  data: DepoKonum[]
  toplam: number
  sayfa: number
  sayfa_boyutu: number
}

export interface DepoBlokListResponse {
  data: DepoBlok[]
  toplam: number
}

export interface DepoKonumCreateRequest {
  depo_id: string
  konum_kodu: string
  konum_ad: string
  blok?: string
  raf?: string
  sutun?: string
  kat?: number
  x_koordinat?: number
  y_koordinat?: number
  z_koordinat?: number
  konum_tipi: DepoKonum['konum_tipi']
  kapasite?: number
  sicaklik_tipi?: DepoKonum['sicaklik_tipi']
  aktif?: boolean
}

export interface DepoBlokCreateRequest {
  depo_id: string
  blok_kodu: string
  blok_ad: string
  kat_sayisi?: number
  raf_sayisi?: number
  kapasite?: number
  aktif?: boolean
}

// Query hooks
export function useDepoKonumlari(depoId?: string, params?: {
  sayfa?: number
  sayfa_boyutu?: number
  blok?: string
  konum_tipi?: string
  aktif?: boolean
}) {
  return useQuery({
    queryKey: ['depo-konumlari', depoId, params],
    queryFn: async () => {
      const response = await api.get<DepoKonumListResponse>(`${API_BASE}/konumlar`, {
        params: { ...params, depo_id: depoId },
      })
      return response.data
    },
  })
}

export function useDepoKonum(konumId: string) {
  return useQuery({
    queryKey: ['depo-konum', konumId],
    queryFn: async () => {
      const response = await api.get<DepoKonum>(`${API_BASE}/konumlar/${konumId}`)
      return response.data
    },
    enabled: !!konumId,
  })
}

export function useDepoBloklar(depoId?: string) {
  return useQuery({
    queryKey: ['depo-bloklar', depoId],
    queryFn: async () => {
      const response = await api.get<DepoBlokListResponse>(`${API_BASE}/bloklar`, {
        params: depoId ? { depo_id: depoId } : {},
      })
      return response.data
    },
  })
}

export function useDepoBlok(blokId: string) {
  return useQuery({
    queryKey: ['depo-blok', blokId],
    queryFn: async () => {
      const response = await api.get<DepoBlok>(`${API_BASE}/bloklar/${blokId}`)
      return response.data
    },
    enabled: !!blokId,
  })
}

// Mutation hooks
export function useDepoKonumMutations() {
  const queryClient = useQueryClient()

  const createAsync = useMutation({
    mutationFn: async (data: DepoKonumCreateRequest) => {
      const response = await api.post<DepoKonum>(`${API_BASE}/konumlar`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depo-konumlari'] })
      queryClient.invalidateQueries({ queryKey: ['depo-konum'] })
    },
  })

  const updateAsync = useMutation({
    mutationFn: async ({ id, ...data }: DepoKonumCreateRequest & { id: string }) => {
      const response = await api.put<DepoKonum>(`${API_BASE}/konumlar/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depo-konumlari'] })
      queryClient.invalidateQueries({ queryKey: ['depo-konum'] })
    },
  })

  const deleteAsync = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${API_BASE}/konumlar/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depo-konumlari'] })
    },
  })

  const transferAsync = useMutation({
    mutationFn: async ({ konumId, stokId, miktar }: { konumId: string; stokId: string; miktar: number }) => {
      const response = await api.post(`${API_BASE}/konumlar/${konumId}/transfer`, {
        stok_id: stokId,
        miktar,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depo-konumlari'] })
      queryClient.invalidateQueries({ queryKey: ['stok'] })
    },
  })

  return { createAsync, updateAsync, deleteAsync, transferAsync }
}

export function useDepoBlokMutations() {
  const queryClient = useQueryClient()

  const createAsync = useMutation({
    mutationFn: async (data: DepoBlokCreateRequest) => {
      const response = await api.post<DepoBlok>(`${API_BASE}/bloklar`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depo-bloklar'] })
    },
  })

  const updateAsync = useMutation({
    mutationFn: async ({ id, ...data }: DepoBlokCreateRequest & { id: string }) => {
      const response = await api.put<DepoBlok>(`${API_BASE}/bloklar/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depo-bloklar'] })
      queryClient.invalidateQueries({ queryKey: ['depo-blok'] })
    },
  })

  const deleteAsync = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${API_BASE}/bloklar/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depo-bloklar'] })
    },
  })

  return { createAsync, updateAsync, deleteAsync }
}
