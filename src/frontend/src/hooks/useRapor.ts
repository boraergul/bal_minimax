import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

const API_BASE = '/api/v1/raporlar'

// Types
export interface RaporTanim {
  id: string
  ad: string
  rapor_tipi: 'standart' | 'ozel' | 'grafik' | 'pivot'
  kategori: string
  aciklama?: string
  sorgu_sql?: string
  parametreler: RaporParametre[]
  aktif: boolean
  varsayilan: boolean
  olusturma_tarihi: string
  guncelleme_tarihi: string
}

export interface RaporParametre {
  ad: string
  etiket: string
  tur: 'string' | 'number' | 'date' | 'date_range' | 'select' | 'multi_select'
  zorunlu: boolean
  varsayilan_deger?: unknown
  secenekler?: { value: string; label: string }[]
}

export interface RaporCalistirRequest {
  tanim_id: string
  parametreler?: Record<string, unknown>
}

export interface RaporSonuc {
  sonuc_id: string
  tanim_id: string
  durum: 'hazirlaniyor' | 'hazir' | 'hata'
  baslangic_zamani: string
  bitis_zamani?: string
  toplam_satir?: number
  dosya_url?: string
  data?: Record<string, unknown>[]
}

export interface RaporCektirme {
  id: string
  tanim_id: string
  rapor_adi: string
  cektirme_zamani: string
  cektiren_kullanici: string
  parametreler?: Record<string, unknown>
  durum: 'basarili' | 'basarisiz'
}

export interface RaporSchedule {
  id: string
  tanim_id: string
  rapor_adi: string
  schedule_tipi: 'gunluk' | 'haftalik' | 'aylik'
  schedule_time: string
  schedule_days?: number[]
  alici_eposta?: string[]
  aktif: boolean
  son_calistirma?: string
  son_durum?: 'basarili' | 'basarisiz'
}

export interface RaporTanimCreateRequest {
  ad: string
  rapor_tipi: RaporTanim['rapor_tipi']
  kategori: string
  aciklama?: string
  sorgu_sql?: string
  parametreler?: RaporParametre[]
  aktif?: boolean
  varsayilan?: boolean
}

export interface RaporScheduleCreateRequest {
  tanim_id: string
  schedule_tipi: RaporSchedule['schedule_tipi']
  schedule_time: string
  schedule_days?: number[]
  alici_eposta?: string[]
  aktif?: boolean
}

// Query hooks
export function useRaporTanimlari(params?: { kategori?: string; rapor_tipi?: string; aktif?: boolean }) {
  return useQuery({
    queryKey: ['rapor-tanimlari', params],
    queryFn: async () => {
      const response = await api.get<RaporTanim[]>(`${API_BASE}/tanimlar`, { params })
      return response.data
    },
  })
}

export function useRaporTanim(tanimId: string) {
  return useQuery({
    queryKey: ['rapor-tanim', tanimId],
    queryFn: async () => {
      const response = await api.get<RaporTanim>(`${API_BASE}/tanimlar/${tanimId}`)
      return response.data
    },
    enabled: !!tanimId,
  })
}

export function useRaporSonuc(sonucId: string) {
  return useQuery({
    queryKey: ['rapor-sonuc', sonucId],
    queryFn: async () => {
      const response = await api.get<RaporSonuc>(`${API_BASE}/sonuc/${sonucId}`)
      return response.data
    },
    enabled: !!sonucId,
  })
}

export function useRaporCektirmeler(params?: { sayfa?: number; sayfa_boyutu?: number }) {
  return useQuery({
    queryKey: ['rapor-cektirmeler', params],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/cektirmeler`, { params })
      return response.data
    },
  })
}

export function useRaporSchedule() {
  return useQuery({
    queryKey: ['rapor-schedule'],
    queryFn: async () => {
      const response = await api.get<RaporSchedule[]>(`${API_BASE}/schedule`)
      return response.data
    },
  })
}

// Mutation hooks
export function useRaporCalistir() {
  return useMutation({
    mutationFn: async (data: RaporCalistirRequest) => {
      const response = await api.post<RaporSonuc>(`${API_BASE}/calistir`, data)
      return response.data
    },
  })
}

export function useRaporMutations() {
  const queryClient = useQueryClient()

  const createTanimAsync = useMutation({
    mutationFn: async (data: RaporTanimCreateRequest) => {
      const response = await api.post<RaporTanim>(`${API_BASE}/tanimlar`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapor-tanimlari'] })
    },
  })

  const updateTanimAsync = useMutation({
    mutationFn: async ({ id, ...data }: RaporTanimCreateRequest & { id: string }) => {
      const response = await api.put<RaporTanim>(`${API_BASE}/tanimlar/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapor-tanimlari'] })
    },
  })

  const deleteTanimAsync = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${API_BASE}/tanimlar/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapor-tanimlari'] })
    },
  })

  const copyTanimAsync = useMutation({
    mutationFn: async ({ id, yeni_ad }: { id: string; yeni_ad: string }) => {
      const response = await api.post<RaporTanim>(`${API_BASE}/tanimlar/${id}/kopyala`, { yeni_ad })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapor-tanimlari'] })
    },
  })

  return { createTanimAsync, updateTanimAsync, deleteTanimAsync, copyTanimAsync }
}

export function useRaporScheduleMutations() {
  const queryClient = useQueryClient()

  const createScheduleAsync = useMutation({
    mutationFn: async (data: RaporScheduleCreateRequest) => {
      const response = await api.post<RaporSchedule>(`${API_BASE}/schedule`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapor-schedule'] })
    },
  })

  const updateScheduleAsync = useMutation({
    mutationFn: async ({ id, ...data }: RaporScheduleCreateRequest & { id: string }) => {
      const response = await api.put<RaporSchedule>(`${API_BASE}/schedule/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapor-schedule'] })
    },
  })

  const deleteScheduleAsync = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${API_BASE}/schedule/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapor-schedule'] })
    },
  })

  const toggleScheduleAsync = useMutation({
    mutationFn: async ({ id, aktif }: { id: string; aktif: boolean }) => {
      const response = await api.patch<RaporSchedule>(`${API_BASE}/schedule/${id}/toggle`, { aktif })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapor-schedule'] })
    },
  })

  return { createScheduleAsync, updateScheduleAsync, deleteScheduleAsync, toggleScheduleAsync }
}
