import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

const API_BASE = '/api/v1/raporlar/izlenebilirlik'

// Types
export interface IzlenebilirlikHareket {
  id: string
  hareket_turu: 'giris' | 'cikis' | 'transfer' | 'uretim' | 'kalite_kontrol'
  tarih: string
  kaynak_depo?: string
  hedef_depo?: string
  miktar: number
  birim: string
  lot_no?: string
  referans_no?: string
  kullanici: string
}

export interface IzlenebilirlikSatisKaydi {
  id: string
  satis_no: string
  musteri: string
  tarih: string
  miktar: number
  birim: string
  fatura_no?: string
  irsaliye_no?: string
}

export interface IzlenebilirlikTedarikci {
  id: string
  ad: string
  vergi_no?: string
  ulke?: string
  sertifikalar?: string[]
}

export interface IzlenebilirlikZincir {
  lot_no: string
  urun_id: string
  urun_ad: string
  urun_kodu?: string
  tedarikci?: IzlenebilirlikTedarikci
  uretim_tarihi: string
  SKT?: string
  hareketler: IzlenebilirlikHareket[]
  satis_kayitlari: IzlenebilirlikSatisKaydi[]
}

export interface IzlenebilirlikUretim {
  id: string
  uretim_no: string
  urun_ad: string
  lot_no: string
  baslangic_tarihi: string
  bitis_tarihi?: string
  planlanan_miktar: number
  gerceklesen_miktar?: number
  durum: string
  giris_malzeme?: { urun_ad: string; lot_no: string; miktar: number }[]
}

export interface IzlenebilirlikSatis {
  id: string
  satis_no: string
  musteri: string
  tarih: string
  toplam_tutar: number
  durum: string
  kalemler?: { urun_ad: string; lot_no: string; miktar: number }[]
}

export interface IzlenebilirlikLog {
  id: string
  islem_turu: 'lot_olusturma' | 'stok_giris' | 'stok_cikis' | 'transfer' | 'satis' | 'uretim'
  lot_no?: string
  urun_ad?: string
  miktar: number
  tarih: string
  kullanici: string
  referans_no?: string
  detay?: string
}

export interface IzlenebilirlikLogResponse {
  data: IzlenebilirlikLog[]
  toplam: number
  sayfa: number
  sayfa_boyutu: number
}

// Query hooks
export function useIzlenebilirlikByLot(lotNo: string) {
  return useQuery({
    queryKey: ['izlenebilirlik', 'lot', lotNo],
    queryFn: async () => {
      const response = await api.get<IzlenebilirlikZincir>(`${API_BASE}/lot/${lotNo}`)
      return response.data
    },
    enabled: !!lotNo,
  })
}

export function useIzlenebilirlikBySatis(satisId: string) {
  return useQuery({
    queryKey: ['izlenebilirlik', 'satis', satisId],
    queryFn: async () => {
      const response = await api.get<IzlenebilirlikZincir>(`${API_BASE}/satis/${satisId}`)
      return response.data
    },
    enabled: !!satisId,
  })
}

export function useIzlenebilirlikByUretim(uretimId: string) {
  return useQuery({
    queryKey: ['izlenebilirlik', 'uretim', uretimId],
    queryFn: async () => {
      const response = await api.get<IzlenebilirlikZincir>(`${API_BASE}/uretim/${uretimId}`)
      return response.data
    },
    enabled: !!uretimId,
  })
}

export function useIzlenebilirlikLog(params?: {
  sayfa?: number
  sayfa_boyutu?: number
  lot_no?: string
  islem_turu?: string
  baslangic_tarihi?: string
  bitis_tarihi?: string
  kullanici?: string
}) {
  return useQuery({
    queryKey: ['izlenebilirlik-log', params],
    queryFn: async () => {
      const response = await api.get<IzlenebilirlikLogResponse>(`${API_BASE}/log`, { params })
      return response.data
    },
  })
}

// Additional helper hooks
export function useIzlenebilirlikArama(arama: string) {
  return useQuery({
    queryKey: ['izlenebilirlik-arama', arama],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/ara`, {
        params: { q: arama },
      })
      return response.data
    },
    enabled: arama.length >= 3,
  })
}

export function useIzlenebilirlikRapor(params?: {
  baslangic_tarihi?: string
  bitis_tarihi?: string
  urun_kategori?: string
  tedarikci_id?: string
}) {
  return useQuery({
    queryKey: ['izlenebilirlik-rapor', params],
    queryFn: async () => {
      const response = await api.get(`${API_BASE}/rapor`, { params })
      return response.data
    },
  })
}
