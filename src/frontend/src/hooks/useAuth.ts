import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { 
  TokenResponse, 
  User, 
  Stok, 
  StokListResponse, 
  StokGirisRequest, 
  StokCikisRequest,
  StokHareket,
  AnlikStok,
  Urun,
  UrunListResponse,
  Tedarikci,
  TedarikciListResponse,
  Musteri,
  MusteriListResponse,
  Uretim,
  UretimListResponse,
  UretimCreateRequest,
  Satis,
  SatisListResponse,
  SatisCreateRequest,
  DashboardData
} from '@/types'

const API_BASE = ''

// Auth hooks
export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const formData = new URLSearchParams()
      formData.append('username', credentials.username)
      formData.append('password', credentials.password)
      
      const response = await api.post<TokenResponse>(`${API_BASE}/auth/login`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      return response.data
    },
  })
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await api.get<User>(`${API_BASE}/auth/me`)
      return response.data
    },
  })
}

// Dashboard hooks
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get<DashboardData>(`${API_BASE}/raporlar/dashboard`)
      return response.data
    },
  })
}

// Stok hooks
export function useStokList(params?: { sayfa?: number; sayfa_boyutu?: number; urun_id?: string; stok_tipi?: string; durum?: string }) {
  return useQuery({
    queryKey: ['stok', params],
    queryFn: async () => {
      const response = await api.get<StokListResponse>(`${API_BASE}/stok`, { params })
      return response.data
    },
  })
}

export function useAnlikStok() {
  return useQuery({
    queryKey: ['anlikStok'],
    queryFn: async () => {
      const response = await api.get<{ data: AnlikStok[] }>(`${API_BASE}/stok/anlik`)
      return response.data.data
    },
  })
}

export function useStokHareketler(stokId: string) {
  return useQuery({
    queryKey: ['stokHareketler', stokId],
    queryFn: async () => {
      const response = await api.get<StokHareket[]>(`${API_BASE}/stok/${stokId}/hareketler`)
      return response.data
    },
    enabled: !!stokId,
  })
}

export function useStokGiris() {
  return useMutation({
    mutationFn: async (data: StokGirisRequest) => {
      const response = await api.post<Stok>(`${API_BASE}/stok/giris`, data)
      return response.data
    },
  })
}

export function useStokCikis() {
  return useMutation({
    mutationFn: async (data: StokCikisRequest) => {
      const response = await api.post(`${API_BASE}/stok/cikis`, data)
      return response.data
    },
  })
}

// Urun hooks
export function useUrunler(params?: { sayfa?: number; sayfa_boyutu?: number; arama?: string; kategori?: string; aktif?: boolean }) {
  return useQuery({
    queryKey: ['urunler', params],
    queryFn: async () => {
      const response = await api.get<UrunListResponse>(`${API_BASE}/urunler`, { params })
      return response.data
    },
  })
}

export function useUrun(id: string) {
  return useQuery({
    queryKey: ['urun', id],
    queryFn: async () => {
      const response = await api.get<Urun>(`${API_BASE}/urunler/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useUrunMutations() {
  const queryClient = useQueryClient()
  
  const createUrun = useMutation({
    mutationFn: async (data: Partial<Urun>) => {
      const response = await api.post<Urun>(`${API_BASE}/urunler`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urunler'] })
    },
  })
  
  const updateUrun = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Urun> & { id: string }) => {
      const response = await api.put<Urun>(`${API_BASE}/urunler/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urunler'] })
    },
  })
  
  const deleteUrun = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${API_BASE}/urunler/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urunler'] })
    },
  })
  
  return { createUrun, updateUrun, deleteUrun }
}

// Tedarikci hooks
export function useTedarikciler(params?: { sayfa?: number; sayfa_boyutu?: number; arama?: string; aktif?: boolean }) {
  return useQuery({
    queryKey: ['tedarikciler', params],
    queryFn: async () => {
      const response = await api.get<TedarikciListResponse>(`${API_BASE}/tedarikciler`, { params })
      return response.data
    },
  })
}

export function useTedarikciMutations() {
  const queryClient = useQueryClient()
  
  const createTedarikci = useMutation({
    mutationFn: async (data: Partial<Tedarikci>) => {
      const response = await api.post<Tedarikci>(`${API_BASE}/tedarikciler`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tedarikciler'] })
    },
  })
  
  const updateTedarikci = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Tedarikci> & { id: string }) => {
      const response = await api.put<Tedarikci>(`${API_BASE}/tedarikciler/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tedarikciler'] })
    },
  })
  
  const deleteTedarikci = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${API_BASE}/tedarikciler/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tedarikciler'] })
    },
  })
  
  return { createTedarikci, updateTedarikci, deleteTedarikci }
}

// Musteri hooks
export function useMusteriler(params?: { sayfa?: number; sayfa_boyutu?: number; arama?: string; aktif?: boolean }) {
  return useQuery({
    queryKey: ['musteriler', params],
    queryFn: async () => {
      const response = await api.get<MusteriListResponse>(`${API_BASE}/musteriler`, { params })
      return response.data
    },
  })
}

export function useMusteriMutations() {
  const queryClient = useQueryClient()
  
  const createMusteri = useMutation({
    mutationFn: async (data: Partial<Musteri>) => {
      const response = await api.post<Musteri>(`${API_BASE}/musteriler`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['musteriler'] })
    },
  })
  
  const updateMusteri = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Musteri> & { id: string }) => {
      const response = await api.put<Musteri>(`${API_BASE}/musteriler/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['musteriler'] })
    },
  })
  
  const deleteMusteri = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${API_BASE}/musteriler/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['musteriler'] })
    },
  })
  
  return { createMusteri, updateMusteri, deleteMusteri }
}

// Uretim hooks
export function useUretimList(params?: { sayfa?: number; sayfa_boyutu?: number; durum?: string }) {
  return useQuery({
    queryKey: ['uretim', params],
    queryFn: async () => {
      const response = await api.get<UretimListResponse>(`${API_BASE}/uretim`, { params })
      return response.data
    },
  })
}

export function useUretim(id: string) {
  return useQuery({
    queryKey: ['uretim', id],
    queryFn: async () => {
      const response = await api.get<Uretim>(`${API_BASE}/uretim/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useUretimMutations() {
  const queryClient = useQueryClient()
  
  const createUretim = useMutation({
    mutationFn: async (data: UretimCreateRequest) => {
      const response = await api.post<Uretim>(`${API_BASE}/uretim`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uretim'] })
      queryClient.invalidateQueries({ queryKey: ['stok'] })
    },
  })
  
  const tamamlaUretim = useMutation({
    mutationFn: async ({ id, gerceklesen_miktar, fire_miktari }: { id: string; gerceklesen_miktar: number; fire_miktari?: number }) => {
      const response = await api.post(`${API_BASE}/uretim/${id}/tamamla`, null, {
        params: { gerceklesen_miktar, fire_miktari: fire_miktari || 0 },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uretim'] })
      queryClient.invalidateQueries({ queryKey: ['stok'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
  
  return { createUretim, tamamlaUretim }
}

// Satis hooks
export function useSatisList(params?: { sayfa?: number; sayfa_boyutu?: number; musteri_id?: string; durum?: string }) {
  return useQuery({
    queryKey: ['satis', params],
    queryFn: async () => {
      const response = await api.get<SatisListResponse>(`${API_BASE}/satis`, { params })
      return response.data
    },
  })
}

export function useSatis(id: string) {
  return useQuery({
    queryKey: ['satis', id],
    queryFn: async () => {
      const response = await api.get<Satis>(`${API_BASE}/satis/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useSatisMutations() {
  const queryClient = useQueryClient()
  
  const createSatis = useMutation({
    mutationFn: async (data: SatisCreateRequest) => {
      const response = await api.post<Satis>(`${API_BASE}/satis`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['satis'] })
      queryClient.invalidateQueries({ queryKey: ['stok'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
  
  const iptalSatis = useMutation({
    mutationFn: async ({ id, iade_nedeni }: { id: string; iade_nedeni: string }) => {
      const response = await api.post(`${API_BASE}/satis/${id}/iptal`, { iade_nedeni })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['satis'] })
      queryClient.invalidateQueries({ queryKey: ['stok'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
  
  return { createSatis, iptalSatis }
}

// ============ NEW HOOKS FOR ERP MODULES ============

// Kalite Kontrol hooks
export function useKaliteKontroller(params?: { sayfa?: number; sayfa_boyutu?: number; durum?: string; kontrol_turu?: string }) {
  return useQuery({
    queryKey: ['kalite-kontrol', params],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/kalite-kontrol`, { params })
      return response.data
    },
  })
}

export function useKaliteKontrol(id: string) {
  return useQuery({
    queryKey: ['kalite-kontrol', id],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/kalite-kontrol/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useKaliteKontrolMutations() {
  const queryClient = useQueryClient()
  
  const create = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`${API_BASE}/kalite-kontrol`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kalite-kontrol'] })
    },
  })
  
  const updateDurum = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await api.patch(`${API_BASE}/kalite-kontrol/${id}/durum`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kalite-kontrol'] })
      queryClient.invalidateQueries({ queryKey: ['stok'] })
    },
  })
  
  const addNumune = useMutation({
    mutationFn: async ({ kkId, ...data }: any) => {
      const response = await api.post(`${API_BASE}/kalite-kontrol/${kkId}/numune`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kalite-kontrol'] })
    },
  })
  
  return { create, updateDurum, addNumune }
}

// SKT hooks
export function useSktLotOnerisi(urunId: string, miktar: number, stokTipi?: string) {
  return useQuery({
    queryKey: ['skt-lot-onerisi', urunId, miktar, stokTipi],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/stok/skt/lot-onerisi`, {
        params: { urun_id: urunId, miktar, stok_tipi: stokTipi },
      })
      return response.data
    },
    enabled: !!urunId && !!miktar,
  })
}

export function useSktRapor(params?: { durum_filter?: string }) {
  return useQuery({
    queryKey: ['skt-rapor', params],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/stok/skt/rapor`, { params })
      return response.data
    },
  })
}

export function useSktIslemler(params?: { sayfa?: number; sayfa_boyutu?: number }) {
  return useQuery({
    queryKey: ['skt-islemler', params],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/stok/skt/islemler`, { params })
      return response.data
    },
  })
}

// Stok Düzeltme hooks
export function useStokDuzeltmeList(params?: { sayfa?: number; sayfa_boyutu?: number; durum?: string }) {
  return useQuery({
    queryKey: ['stok-duzeltme', params],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/stok-duzeltme`, { params })
      return response.data
    },
  })
}

export function useStokDuzeltmeMutations() {
  const queryClient = useQueryClient()
  
  const create = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`${API_BASE}/stok-duzeltme`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stok-duzeltme'] })
      queryClient.invalidateQueries({ queryKey: ['stok'] })
    },
  })
  
  const approve = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await api.patch(`${API_BASE}/stok-duzeltme/${id}/onayla`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stok-duzeltme'] })
      queryClient.invalidateQueries({ queryKey: ['stok'] })
    },
  })
  
  const reject = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await api.patch(`${API_BASE}/stok-duzeltme/${id}/reddet`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stok-duzeltme'] })
    },
  })
  
  return { create, approve, reject }
}

// Birim hooks
export function useBirimler(params?: { birim_tipi?: string; aktif?: boolean }) {
  return useQuery({
    queryKey: ['birimler', params],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/birim`, { params })
      return response.data
    },
  })
}

export function useBirimDonusumler(kaynakBirimId?: string) {
  return useQuery({
    queryKey: ['birim-donusum', kaynakBirimId],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/birim/donusum`, {
        params: kaynakBirimId ? { kaynak_birim_id: kaynakBirimId } : {},
      })
      return response.data
    },
  })
}

export function useBirimMutations() {
  const queryClient = useQueryClient()
  
  const create = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`${API_BASE}/birim`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['birimler'] })
      queryClient.invalidateQueries({ queryKey: ['birim-donusum'] })
    },
  })
  
  const update = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await api.put(`${API_BASE}/birim/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['birimler'] })
    },
  })
  
  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${API_BASE}/birim/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['birimler'] })
    },
  })
  
  return { create, update, remove }
}

// Depo hooks
export function useDepolar() {
  return useQuery({
    queryKey: ['depolar'],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/depo`)
      return response.data
    },
  })
}

export function useDepo(id: string) {
  return useQuery({
    queryKey: ['depo', id],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/depo/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useDepoTransferler(params?: { sayfa?: number; sayfa_boyutu?: number; durum?: string }) {
  return useQuery({
    queryKey: ['depo-transferler', params],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/depo/transferler`, { params })
      return response.data
    },
  })
}

export function useDepoMutations() {
  const queryClient = useQueryClient()
  
  const createDepo = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`${API_BASE}/depo`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depolar'] })
    },
  })
  
  const createTransfer = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`${API_BASE}/depo/transferler`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depo-transferler'] })
    },
  })
  
  const approveTransfer = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`${API_BASE}/depo/transferler/${id}/onayla`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depo-transferler'] })
      queryClient.invalidateQueries({ queryKey: ['stok'] })
    },
  })
  
  return { createDepo, createTransfer, approveTransfer }
}

// Bildirim hooks
export function useBildirimler(params?: { sayfa?: number; sayfa_boyutu?: number; durum?: string; bildirim_tipi?: string }) {
  return useQuery({
    queryKey: ['bildirimler', params],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/bildirim`, { params })
      return response.data
    },
  })
}

export function useBildirimUnreadCount() {
  return useQuery({
    queryKey: ['bildirim-unread'],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/bildirim`, { params: { durum: 'GORULMEMIŞ', sayfa_boyutu: 1 } })
      return response.data.total || 0
    },
    refetchInterval: 60000, // Refresh every minute
  })
}

export function useBildirimMutations() {
  const queryClient = useQueryClient()
  
  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`${API_BASE}/bildirim/${id}/okundu`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bildirimler'] })
      queryClient.invalidateQueries({ queryKey: ['bildirim-unread'] })
    },
  })
  
  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${API_BASE}/bildirim/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bildirimler'] })
      queryClient.invalidateQueries({ queryKey: ['bildirim-unread'] })
    },
  })
  
  return { markRead, remove }
}

// Maliyet hooks
export function useUretimMaliyet(uretimId: string) {
  return useQuery({
    queryKey: ['uretim-maliyet', uretimId],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/uretim/maliyet/emir/${uretimId}`)
      return response.data
    },
    enabled: !!uretimId,
  })
}

export function useMaliyetMutations() {
  const queryClient = useQueryClient()
  
  const addIscilik = useMutation({
    mutationFn: async ({ uretimId, ...data }: any) => {
      const response = await api.post(`${API_BASE}/uretim/maliyet/emir/${uretimId}/iscilik`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uretim-maliyet'] })
    },
  })
  
  const addEnerji = useMutation({
    mutationFn: async ({ uretimId, ...data }: any) => {
      const response = await api.post(`${API_BASE}/uretim/maliyet/emir/${uretimId}/enerji`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uretim-maliyet'] })
    },
  })
  
  return { addIscilik, addEnerji }
}

// İade hooks
export function useIadeList(satisId?: string) {
  return useQuery({
    queryKey: ['iade', satisId],
    queryFn: async () => {
      if (satisId) {
        const response = await api.get(`${API_BASE}/satis/${satisId}/iade`)
        return response.data
      }
      return []
    },
    enabled: !!satisId,
  })
}

export function useIadeMutations() {
  const queryClient = useQueryClient()
  
  const create = useMutation({
    mutationFn: async ({ satisId, ...data }: any) => {
      const response = await api.post(`${API_BASE}/satis/${satisId}/iade`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iade'] })
      queryClient.invalidateQueries({ queryKey: ['satis'] })
    },
  })
  
  return { create }
}

// Özellik hooks
export function useOzellikler(kategori?: string) {
  return useQuery({
    queryKey: ['ozellikler', kategori],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/ozellikler`, {
        params: kategori ? { kategori } : {},
      })
      return response.data
    },
  })
}

export function useLotOzellikler(stokId: string) {
  return useQuery({
    queryKey: ['lot-ozellik', stokId],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/ozellikler/lot/${stokId}`)
      return response.data
    },
    enabled: !!stokId,
  })
}

export function useOzellikMutations() {
  const queryClient = useQueryClient()
  
  const createOzellik = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`${API_BASE}/ozellikler`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ozellikler'] })
    },
  })
  
  const addLotOzellik = useMutation({
    mutationFn: async ({ stokId, ...data }: any) => {
      const response = await api.post(`${API_BASE}/ozellikler/lot/${stokId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lot-ozellik'] })
    },
  })
  
  return { createOzellik, addLotOzellik }
}

// Rapor hooks
export function useStokDegerRaporu() {
  return useQuery({
    queryKey: ['stok-deger-raporu'],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/raporlar/stok/deger`)
      return response.data
    },
  })
}

export function useStokYaslandirma() {
  return useQuery({
    queryKey: ['stok-yaslandirma'],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/raporlar/stok/yaslandirma`)
      return response.data
    },
  })
}

export function useIzlenebilirlik(lotNo: string) {
  return useQuery({
    queryKey: ['izlenebilirlik', lotNo],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/raporlar/izlenebilirlik/lot/${lotNo}`)
      return response.data
    },
    enabled: !!lotNo,
  })
}

// Toplu işlem hooks
export function useTopluIslemler(params?: { sayfa?: number; sayfa_boyutu?: number; islem_turu?: string; durum?: string }) {
  return useQuery({
    queryKey: ['toplu-islem', params],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/toplu-islem`, { params })
      return response.data
    },
  })
}

// Etiket hooks
export function useEtiketSablonlar() {
  return useQuery({
    queryKey: ['etiket-sablonlar'],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/etiket/sablonlar`)
      return response.data
    },
  })
}

export function useEtiketMutations() {
  const queryClient = useQueryClient()
  
  const createSablon = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`${API_BASE}/etiket/sablonlar`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etiket-sablonlar'] })
    },
  })
  
  const updateSablon = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await api.put(`${API_BASE}/etiket/sablonlar/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etiket-sablonlar'] })
    },
  })
  
  const deleteSablon = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${API_BASE}/etiket/sablonlar/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etiket-sablonlar'] })
    },
  })
  
  return { createSablon, updateSablon, deleteSablon }
}

// Depo Blok hooks
export function useDepoBloklar(depoId: string) {
  return useQuery({
    queryKey: ['depo-bloklar', depoId],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/depo/${depoId}/bloklar`)
      return response.data
    },
    enabled: !!depoId,
  })
}

export function useDepoBlokMutations(depoId: string) {
  const queryClient = useQueryClient()
  
  const createBlok = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`${API_BASE}/depo/${depoId}/bloklar`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depo-bloklar', depoId] })
    },
  })
  
  const updateBlok = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await api.put(`${API_BASE}/depo/bloklar/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depo-bloklar', depoId] })
    },
  })
  
  return { createBlok, updateBlok }
}

// Depo Konum hooks
export function useDepoKonumlar(blokId: string) {
  return useQuery({
    queryKey: ['depo-konumlar', blokId],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/depo/konumlar`, { params: { blok_id: blokId } })
      return response.data
    },
    enabled: !!blokId,
  })
}

// Sistem Ayarlar hooks
export function useSistemAyarlar() {
  return useQuery({
    queryKey: ['sistem-ayarlar'],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/ayarlar`)
      return response.data
    },
  })
}

export function useSistemAyarlarMutations() {
  const queryClient = useQueryClient()
  
  const updateAyar = useMutation({
    mutationFn: async ({ key, ...data }: any) => {
      const response = await api.put(`${API_BASE}/ayarlar/${key}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sistem-ayarlar'] })
    },
  })
  
  return { updateAyar }
}
