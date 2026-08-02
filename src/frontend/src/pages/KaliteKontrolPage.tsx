import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Beaker,
  FileText,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  Check,
  X,
} from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

// ==========================================
// TYPES
// ==========================================

type KKDurum = 'BEKLIYOR' | 'KONTROL_EDILIYOR' | 'KABUL' | 'KISMEN_KABUL' | 'RET'
type KontrolTipi = 'GIRIS_KONTROL' | 'URETIM' | 'SEVK' | 'IADE' | 'PERIYODIK' | 'SIPARIS_KONTROL'
type AmbalajDurumu = 'IYI' | 'ORTA' | 'ZAYIF'
type Sonuc = 'UYGUN' | 'SINIRDA' | 'UYGUNSIZ'

interface KaliteKontrol {
  kalite_id: string
  stok_id: string | null
  urun_ad?: string
  lot_no?: string
  uretim_id: string | null
  kontrol_tipi: KontrolTipi
  kontrol_eden_id: string
  kontrol_eden_ad?: string
  kontrol_tarihi: string
  durum: KKDurum
  sonuc?: Sonuc
  gorsel_kontrol: boolean | null
  ambalaj_durumu: AmbalajDurumu | null
  etiket_okunakli: boolean | null
  son_kullanma_tarihi: string | null
  laboratuvar_sonuclari: Record<string, number> | null
  fiziksel_puan?: number
  laboratuvar_puan?: number
  genel_puan?: number
  ret_nedeni: string | null
  ret_kriterleri: string[] | null
  sonuc_aciklamasi: string | null
  onay_durumu?: string
  onay_leyen_id: string | null
  onay_tarihi: string | null
  olusturma_tarihi: string
  olusturan_kullanici_id: string
}

interface KaliteKontrolListResponse {
  data: KaliteKontrol[]
  toplam: number
  sayfa: number
  sayfa_boyutu: number
}

interface StokForKK {
  id: string
  lot_no: string
  urun_ad: string
  miktar: number
  birim: string
  durum: string
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

const durumLabel: Record<KKDurum, string> = {
  BEKLIYOR: 'Bekliyor',
  KONTROL_EDILIYOR: 'Kontrol Ediliyor',
  KABUL: 'Kabul',
  KISMEN_KABUL: 'Kısmen Kabul',
  RET: 'Red',
}

const durumColor: Record<KKDurum, string> = {
  BEKLIYOR: 'bg-yellow-100 text-yellow-800',
  KONTROL_EDILIYOR: 'bg-blue-100 text-blue-800',
  KABUL: 'bg-green-100 text-green-800',
  KISMEN_KABUL: 'bg-orange-100 text-orange-800',
  RET: 'bg-red-100 text-red-800',
}

const kontrolTipiLabel: Record<KontrolTipi, string> = {
  GIRIS_KONTROL: 'Giriş Kontrol',
  URETIM: 'Üretim Kontrol',
  SEVK: 'Sevk Kontrol',
  IADE: 'İade Kontrol',
  PERIYODIK: 'Periyodik Kontrol',
  SIPARIS_KONTROL: 'Sipariş Kontrol',
}

const sonucLabel: Record<Sonuc, string> = {
  UYGUN: 'Uygun',
  SINIRDA: 'Sınırda',
  UYGUNSIZ: 'Uygunsuz',
}

const sonucColor: Record<Sonuc, string> = {
  UYGUN: 'bg-green-100 text-green-800',
  SINIRDA: 'bg-yellow-100 text-yellow-800',
  UYGUNSIZ: 'bg-red-100 text-red-800',
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function calculateGenelPuan(fiziksel: number | undefined, laboratuvar: number | undefined): number | null {
  if (fiziksel === undefined) return null
  if (laboratuvar === undefined) return fiziksel
  return (fiziksel + laboratuvar) / 2
}

function determineResult(puan: number | null): KKDurum | null {
  if (puan === null) return null
  if (puan >= 4.0) return 'KABUL'
  if (puan >= 3.0) return 'KISMEN_KABUL'
  return 'RET'
}

// ==========================================
// HOOKS
// ==========================================

function useKaliteKontroller(params?: {
  sayfa?: number
  sayfa_boyutu?: number
  durum?: string
  kontrol_tipi?: string
  arama?: string
}) {
  return useQuery({
    queryKey: ['kalite-kontrol', params],
    queryFn: async () => {
      const response = await api.get<KaliteKontrolListResponse>('/kalite-kontrol', { params })
      return response.data
    },
  })
}

function useKaliteKontrol(id: string) {
  return useQuery({
    queryKey: ['kalite-kontrol', id],
    queryFn: async () => {
      const response = await api.get<KaliteKontrol>(`/kalite-kontrol/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

function useKaliteKontrolMutations() {
  const queryClient = useQueryClient()

  const createKK = useMutation({
    mutationFn: async (data: { stok_id: string; kontrol_tipi: KontrolTipi }) => {
      const response = await api.post('/kalite-kontrol', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kalite-kontrol'] })
    },
  })

  const updateKK = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<KaliteKontrol>) => {
      const response = await api.put(`/kalite-kontrol/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kalite-kontrol'] })
    },
  })

  const updateDurum = useMutation({
    mutationFn: async ({
      id,
      durum,
      ret_nedeni,
      sonuc_aciklamasi,
    }: {
      id: string
      durum: KKDurum
      ret_nedeni?: string
      sonuc_aciklamasi?: string
    }) => {
      const response = await api.patch(`/kalite-kontrol/${id}/durum`, {
        durum,
        ret_nedeni,
        sonuc_aciklamasi,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kalite-kontrol'] })
      queryClient.invalidateQueries({ queryKey: ['stok'] })
    },
  })

  const submitKontrol = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      gorsel_kontrol: boolean
      ambalaj_durumu: AmbalajDurumu
      etiket_okunakli: boolean
      son_kullanma_tarihi?: string
      laboratuvar_sonuclari?: Record<string, number>
      fiziksel_puan: number
      laboratuvar_puan?: number
    }) => {
      const response = await api.patch(`/kalite-kontrol/${id}/kontrol`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kalite-kontrol'] })
    },
  })

  const submitSonuc = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      durum: KKDurum
      ret_nedeni?: string
      ret_kriterleri?: string[]
      sonuc_aciklamasi?: string
    }) => {
      const response = await api.post(`/kalite-kontrol/${id}/sonuc`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kalite-kontrol'] })
      queryClient.invalidateQueries({ queryKey: ['stok'] })
    },
  })

  const yoneticiOnay = useMutation({
    mutationFn: async ({
      id,
      onaylandi,
      sonuc_aciklamasi,
    }: {
      id: string
      onaylandi: boolean
      sonuc_aciklamasi?: string
    }) => {
      const response = await api.post(`/kalite-kontrol/${id}/onay`, {
        onaylandi,
        sonuc_aciklamasi,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kalite-kontrol'] })
      queryClient.invalidateQueries({ queryKey: ['stok'] })
    },
  })

  return {
    createKK,
    updateKK,
    updateDurum,
    submitKontrol,
    submitSonuc,
    yoneticiOnay,
  }
}

function useStokForKK() {
  return useQuery({
    queryKey: ['stok-for-kk'],
    queryFn: async () => {
      const response = await api.get<{ data: StokForKK[] }>('/stok', {
        params: { durum: 'KALITE_KONTROL', sayfa_boyutu: 100 },
      })
      return response.data.data
    },
  })
}

// ==========================================
// COMPONENTS
// ==========================================

function StatusBadge({ durum }: { durum: KKDurum }) {
  return (
    <Badge className={durumColor[durum]}>
      {durum === 'BEKLIYOR' && <Clock className="h-3 w-3 mr-1" />}
      {durum === 'KONTROL_EDILIYOR' && <RefreshCw className="h-3 w-3 mr-1" />}
      {durum === 'KABUL' && <CheckCircle className="h-3 w-3 mr-1" />}
      {durum === 'KISMEN_KABUL' && <AlertTriangle className="h-3 w-3 mr-1" />}
      {durum === 'RET' && <XCircle className="h-3 w-3 mr-1" />}
      {durumLabel[durum]}
    </Badge>
  )
}

function SonucBadge({ sonuc }: { sonuc?: Sonuc }) {
  if (!sonuc) return null
  return (
    <Badge className={sonucColor[sonuc]}>
      {sonucLabel[sonuc]}
    </Badge>
  )
}

function WorkflowStep({
  step,
  currentStep,
  label,
  icon: Icon,
}: {
  step: number
  currentStep: number
  label: string
  icon: React.ElementType
}) {
  const isCompleted = step < currentStep
  const isCurrent = step === currentStep
  const isPending = step > currentStep

  return (
    <div className="flex items-center gap-3">
      <div
        className={`
          w-10 h-10 rounded-full flex items-center justify-center
          ${isCompleted ? 'bg-green-500 text-white' : ''}
          ${isCurrent ? 'bg-blue-500 text-white animate-pulse' : ''}
          ${isPending ? 'bg-gray-200 text-gray-400' : ''}
        `}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${isPending ? 'text-gray-400' : 'text-foreground'}`}>
          {label}
        </span>
        {isCompleted && <span className="text-xs text-green-600">Tamamlandı</span>}
        {isCurrent && <span className="text-xs text-blue-600">Devam Ediyor</span>}
        {isPending && <span className="text-xs text-gray-400">Bekliyor</span>}
      </div>
      {step < 5 && (
        <ChevronRight className={`h-5 w-5 ml-auto ${isPending ? 'text-gray-300' : 'text-gray-400'}`} />
      )}
    </div>
  )
}

function getWorkflowStep(durum: KKDurum): number {
  switch (durum) {
    case 'BEKLIYOR':
      return 1 // Numune Alma
    case 'KONTROL_EDILIYOR':
      return 2 // Fiziksel Kontrol
    default:
      return 3 // Sonuç
  }
}

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================

export function KaliteKontrolPage() {
  // State
  const [page, setPage] = useState(1)
  const [arama, setArama] = useState('')
  const [durumFilter, setDurumFilter] = useState<string>('')
  const [kontrolTipiFilter, setKontrolTipiFilter] = useState<string>('')

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [kontrolDialogOpen, setKontrolDialogOpen] = useState(false)
  const [sonucDialogOpen, setSonucDialogOpen] = useState(false)
  const [onayDialogOpen, setOnayDialogOpen] = useState(false)

  // Selected item
  const [selectedKK, setSelectedKK] = useState<KaliteKontrol | null>(null)

  // Mutations
  const { createKK, updateDurum, submitKontrol, submitSonuc, yoneticiOnay } = useKaliteKontrolMutations()

  // Query params
  const queryParams = useMemo(
    () => ({
      sayfa: page,
      sayfa_boyutu: 20,
      durum: durumFilter || undefined,
      kontrol_tipi: kontrolTipiFilter || undefined,
      arama: arama || undefined,
    }),
    [page, durumFilter, kontrolTipiFilter, arama]
  )

  // Queries
  const { data, isLoading, refetch } = useKaliteKontroller(queryParams)
  const { data: stoklar } = useStokForKK()

  const kaliteKontroller: KaliteKontrol[] = data?.data || []

  // Handlers
  const handleViewDetail = (kk: KaliteKontrol) => {
    setSelectedKK(kk)
    setDetailDialogOpen(true)
  }

  const handleStartKontrol = async (kk: KaliteKontrol) => {
    await updateDurum.mutateAsync({ id: kk.kalite_id, durum: 'KONTROL_EDILIYOR' })
    setDetailDialogOpen(false)
  }

  const handleSonucResult = (kk: KaliteKontrol) => {
    setSelectedKK(kk)
    setSonucDialogOpen(true)
  }

  const handleYoneticiOnay = async (onaylandi: boolean) => {
    if (!selectedKK) return
    await yoneticiOnay.mutateAsync({
      id: selectedKK.kalite_id,
      onaylandi,
      sonuc_aciklamasi: selectedKK.sonuc_aciklamasi || undefined,
    })
    setOnayDialogOpen(false)
    setDetailDialogOpen(false)
    setSelectedKK(null)
  }

  // Stats
  const stats = useMemo(() => {
    const bekleyen = kaliteKontroller.filter((k) => k.durum === 'BEKLIYOR').length
    const kontrolEdiliyor = kaliteKontroller.filter((k) => k.durum === 'KONTROL_EDILIYOR').length
    const kabul = kaliteKontroller.filter((k) => k.durum === 'KABUL').length
    const kismenKabul = kaliteKontroller.filter((k) => k.durum === 'KISMEN_KABUL').length
    const ret = kaliteKontroller.filter((k) => k.durum === 'RET').length
    return { bekleyen, kontrolEdiliyor, kabul, kismenKabul, ret, toplam: data?.toplam || 0 }
  }, [kaliteKontroller, data])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Kalite Kontrol
          </h2>
          <p className="text-sm text-muted-foreground">
            {stats.toplam} kayıt bulundu
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Kontrol Başlat
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.bekleyen}</p>
              <p className="text-xs text-muted-foreground">Bekliyor</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <RefreshCw className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.kontrolEdiliyor}</p>
              <p className="text-xs text-muted-foreground">Kontrol Ediliyor</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.kabul}</p>
              <p className="text-xs text-muted-foreground">Kabul</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.kismenKabul}</p>
              <p className="text-xs text-muted-foreground">Kısmen Kabul</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.ret}</p>
              <p className="text-xs text-muted-foreground">Ret</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Lot no veya ürün adı ile ara..."
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={durumFilter} onValueChange={setDurumFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tüm Durumlar</SelectItem>
                <SelectItem value="BEKLIYOR">Bekliyor</SelectItem>
                <SelectItem value="KONTROL_EDILIYOR">Kontrol Ediliyor</SelectItem>
                <SelectItem value="KABUL">Kabul</SelectItem>
                <SelectItem value="KISMEN_KABUL">Kısmen Kabul</SelectItem>
                <SelectItem value="RET">Ret</SelectItem>
              </SelectContent>
            </Select>
            <Select value={kontrolTipiFilter} onValueChange={setKontrolTipiFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Kontrol Tipi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tüm Tipler</SelectItem>
                <SelectItem value="GIRIS_KONTROL">Giriş Kontrol</SelectItem>
                <SelectItem value="URETIM">Üretim Kontrol</SelectItem>
                <SelectItem value="SEVK">Sevk Kontrol</SelectItem>
                <SelectItem value="IADE">İade Kontrol</SelectItem>
                <SelectItem value="PERIYODIK">Periyodik Kontrol</SelectItem>
                <SelectItem value="SIPARIS_KONTROL">Sipariş Kontrol</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Yenile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lot No</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Kontrol Tipi</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Puan</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kaliteKontroller.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Kalite kontrol kaydı bulunamadı
                    </TableCell>
                  </TableRow>
                ) : (
                  kaliteKontroller.map((kk) => (
                    <TableRow key={kk.kalite_id}>
                      <TableCell className="font-mono text-sm">{kk.lot_no || '-'}</TableCell>
                      <TableCell>{kk.urun_ad || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{kontrolTipiLabel[kk.kontrol_tipi]}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(kk.kontrol_tarihi)}</TableCell>
                      <TableCell>
                        <StatusBadge durum={kk.durum} />
                      </TableCell>
                      <TableCell>
                        {kk.genel_puan ? (
                          <span className={`font-medium ${
                            kk.genel_puan >= 4 ? 'text-green-600' :
                            kk.genel_puan >= 3 ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {kk.genel_puan.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => handleViewDetail(kk)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Detay
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.toplam > 20 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Önceki
          </Button>
          <span className="px-4 py-2 text-sm">
            Sayfa {page} / {Math.ceil(data.toplam / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil(data.toplam / 20)}
            onClick={() => setPage(page + 1)}
          >
            Sonraki
          </Button>
        </div>
      )}

      {/* Create Dialog */}
      <CreateKKDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        stoklar={stoklar || []}
        onCreate={async (stokId, kontrolTipi) => {
          await createKK.mutateAsync({ stok_id: stokId, kontrol_tipi: kontrolTipi })
          setCreateDialogOpen(false)
        }}
        isLoading={createKK.isPending}
      />

      {/* Detail Dialog */}
      {selectedKK && (
        <KKDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          kk={selectedKK}
          onStartKontrol={() => handleStartKontrol(selectedKK)}
          onOpenKontrol={() => {
            setDetailDialogOpen(false)
            setKontrolDialogOpen(true)
          }}
          onOpenSonuc={() => {
            setDetailDialogOpen(false)
            setSonucDialogOpen(true)
          }}
          onOpenOnay={() => setOnayDialogOpen(true)}
          isUpdating={updateDurum.isPending}
        />
      )}

      {/* Kontrol Dialog */}
      {selectedKK && (
        <KKKontrolDialog
          open={kontrolDialogOpen}
          onOpenChange={setKontrolDialogOpen}
          kk={selectedKK}
          onSubmit={async (data) => {
            await submitKontrol.mutateAsync({ id: selectedKK.kalite_id, ...data })
            setKontrolDialogOpen(false)
          }}
          isLoading={submitKontrol.isPending}
        />
      )}

      {/* Sonuc Dialog */}
      {selectedKK && (
        <KKSonucDialog
          open={sonucDialogOpen}
          onOpenChange={setSonucDialogOpen}
          kk={selectedKK}
          onSubmit={async (data) => {
            await submitSonuc.mutateAsync({ id: selectedKK.kalite_id, ...data })
            setSonucDialogOpen(false)
          }}
          isLoading={submitSonuc.isPending}
        />
      )}

      {/* Onay Dialog */}
      <Dialog open={onayDialogOpen} onOpenChange={setOnayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yönetici Onayı</DialogTitle>
            <DialogDescription>
              Bu kalite kontrol kaydı kısmen kabul edilmiş ve yönetici onayı bekliyor.
              Kabul etmek stok durumunu AKTIF, reddetmek RET yapacaktır.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Onay açıklaması (opsiyonel)"
              value={selectedKK?.sonuc_aciklamasi || ''}
              onChange={(e) => setSelectedKK((prev) => prev ? { ...prev, sonuc_aciklamasi: e.target.value } : null)}
            />
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => handleYoneticiOnay(false)}>
              <X className="h-4 w-4 mr-2" />
              Reddet
            </Button>
            <Button variant="success" onClick={() => handleYoneticiOnay(true)}>
              <Check className="h-4 w-4 mr-2" />
              Kabul Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==========================================
// SUB COMPONENTS
// ==========================================

function CreateKKDialog({
  open,
  onOpenChange,
  stoklar,
  onCreate,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  stoklar: StokForKK[]
  onCreate: (stokId: string, kontrolTipi: KontrolTipi) => void
  isLoading: boolean
}) {
  const [stokId, setStokId] = useState('')
  const [kontrolTipi, setKontrolTipi] = useState<KontrolTipi>('GIRIS_KONTROL')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (stokId && kontrolTipi) {
      onCreate(stokId, kontrolTipi)
      setStokId('')
      setKontrolTipi('GIRIS_KONTROL')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Kalite Kontrol Başlat</DialogTitle>
          <DialogDescription>
            Kalite kontrol sürecini başlatmak için stok seçin ve kontrol tipini belirleyin.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stok">Stok Seç</Label>
            <Select value={stokId} onValueChange={setStokId}>
              <SelectTrigger>
                <SelectValue placeholder="Stok seçin..." />
              </SelectTrigger>
              <SelectContent>
                {stoklar.length === 0 ? (
                  <SelectItem value="" disabled>
                    Kalite kontrole hazır stok bulunamadı
                  </SelectItem>
                ) : (
                  stoklar.map((stok) => (
                    <SelectItem key={stok.id} value={stok.id}>
                      {stok.lot_no} - {stok.urun_ad} ({stok.miktar} {stok.birim})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kontrolTipi">Kontrol Tipi</Label>
            <Select value={kontrolTipi} onValueChange={(v) => setKontrolTipi(v as KontrolTipi)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GIRIS_KONTROL">Giriş Kontrol</SelectItem>
                <SelectItem value="URETIM">Üretim Kontrol</SelectItem>
                <SelectItem value="SEVK">Sevk Kontrol</SelectItem>
                <SelectItem value="IADE">İade Kontrol</SelectItem>
                <SelectItem value="PERIYODIK">Periyodik Kontrol</SelectItem>
                <SelectItem value="SIPARIS_KONTROL">Sipariş Kontrol</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={!stokId || isLoading}>
              {isLoading ? 'Oluşturuluyor...' : 'Başlat'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function KKDetailDialog({
  open,
  onOpenChange,
  kk,
  onStartKontrol,
  onOpenKontrol,
  onOpenSonuc,
  onOpenOnay,
  isUpdating,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kk: KaliteKontrol
  onStartKontrol: () => void
  onOpenKontrol: () => void
  onOpenSonuc: () => void
  onOpenOnay: () => void
  isUpdating: boolean
}) {
  const workflowStep = getWorkflowStep(kk.durum)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kalite Kontrol Detayı</DialogTitle>
          <DialogDescription>
            Lot: {kk.lot_no || '-'} | Ürün: {kk.urun_ad || '-'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <StatusBadge durum={kk.durum} />
            <SonucBadge sonuc={kk.sonuc} />
          </div>

          {/* Workflow */}
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-4">İş Akışı</h4>
            <div className="space-y-4">
              <WorkflowStep
                step={1}
                currentStep={workflowStep}
                label="Numune Alma"
                icon={Beaker}
              />
              <WorkflowStep
                step={2}
                currentStep={workflowStep}
                label="Fiziksel Kontrol"
                icon={Eye}
              />
              <WorkflowStep
                step={3}
                currentStep={workflowStep}
                label="Laboratuvar Testi"
                icon={FileText}
              />
              <WorkflowStep
                step={4}
                currentStep={workflowStep}
                label="Puanlama"
                icon={ClipboardCheck}
              />
              <WorkflowStep
                step={5}
                currentStep={workflowStep}
                label="Onay/Red"
                icon={kk.durum === 'KABUL' || kk.durum === 'KISMEN_KABUL' ? CheckCircle : XCircle}
              />
            </div>
          </Card>

          {/* Details */}
          <Tabs defaultValue="genel">
            <TabsList>
              <TabsTrigger value="genel">Genel Bilgiler</TabsTrigger>
              <TabsTrigger value="kontrol">Kontrol Sonuçları</TabsTrigger>
              <TabsTrigger value="laboratuvar">Laboratuvar</TabsTrigger>
            </TabsList>

            <TabsContent value="genel" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Kontrol Tipi</Label>
                  <p className="font-medium">{kontrolTipiLabel[kk.kontrol_tipi]}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Kontrol Eden</Label>
                  <p className="font-medium">{kk.kontrol_eden_ad || kk.kontrol_eden_id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Kontrol Tarihi</Label>
                  <p className="font-medium">{formatDate(kk.kontrol_tarihi)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Son Kullanma</Label>
                  <p className="font-medium">{kk.son_kullanma_tarihi || '-'}</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="kontrol" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Görsel Kontrol</Label>
                  <p className="font-medium">
                    {kk.gorsel_kontrol === null ? 'Belirtilmedi' : kk.gorsel_kontrol ? 'Uygun' : 'Uygun Değil'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Ambalaj Durumu</Label>
                  <p className="font-medium">{kk.ambalaj_durumu || 'Belirtilmedi'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Etiket Okunaklı</Label>
                  <p className="font-medium">
                    {kk.etiket_okunakli === null ? 'Belirtilmedi' : kk.etiket_okunakli ? 'Evet' : 'Hayır'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fiziksel Puan</Label>
                  <p className="font-medium">
                    {kk.fiziksel_puan !== undefined ? `${kk.fiziksel_puan}/5` : 'Belirtilmedi'}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="laboratuvar" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Laboratuvar Puan</Label>
                  <p className="font-medium">
                    {kk.laboratuvar_puan !== undefined ? `${kk.laboratuvar_puan}/5` : 'Belirtilmedi'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Genel Puan</Label>
                  <p className="font-medium">
                    {kk.genel_puan !== undefined ? `${kk.genel_puan.toFixed(1)}/5` : 'Belirtilmedi'}
                  </p>
                </div>
              </div>
              {kk.laboratuvar_sonuclari && Object.keys(kk.laboratuvar_sonuclari).length > 0 && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Laboratuvar Sonuçları</Label>
                  <div className="bg-muted rounded-lg p-4 space-y-2">
                    {Object.entries(kk.laboratuvar_sonuclari).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-sm">{key}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Ret Info */}
          {kk.durum === 'RET' && kk.ret_nedeni && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <Label className="text-red-800">Ret Nedeni</Label>
              <p className="text-sm text-red-700 mt-1">{kk.ret_nedeni}</p>
              {kk.ret_kriterleri && kk.ret_kriterleri.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {kk.ret_kriterleri.map((kriter, i) => (
                    <Badge key={i} variant="destructive" className="text-xs">
                      {kriter}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sonuc Aciklamasi */}
          {kk.sonuc_aciklamasi && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Label className="text-blue-800">Sonuç Açıklaması</Label>
              <p className="text-sm text-blue-700 mt-1">{kk.sonuc_aciklamasi}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            {kk.durum === 'BEKLIYOR' && (
              <Button onClick={onStartKontrol} disabled={isUpdating}>
                <Beaker className="h-4 w-4 mr-2" />
                Kontrole Başla
              </Button>
            )}
            {kk.durum === 'KONTROL_EDILIYOR' && (
              <>
                <Button onClick={onOpenKontrol}>
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Kontrol Sonuçlarını Gir
                </Button>
                <Button variant="success" onClick={onOpenSonuc}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Sonucu Belirle
                </Button>
              </>
            )}
            {kk.durum === 'KISMEN_KABUL' && (
              <Button onClick={onOpenOnay}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Yönetici Onayı
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function KKKontrolDialog({
  open,
  onOpenChange,
  kk,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kk: KaliteKontrol
  onSubmit: (data: {
    gorsel_kontrol: boolean
    ambalaj_durumu: AmbalajDurumu
    etiket_okunakli: boolean
    son_kullanma_tarihi?: string
    laboratuvar_sonuclari?: Record<string, number>
    fiziksel_puan: number
    laboratuvar_puan?: number
  }) => void
  isLoading: boolean
}) {
  const [gorselKontrol, setGorselKontrol] = useState<boolean>(true)
  const [ambalajDurumu, setAmbalajDurumu] = useState<AmbalajDurumu>('IYI')
  const [etiketOkunakli, setEtiketOkunakli] = useState<boolean>(true)
  const [skt, setSkt] = useState<string>('')
  const [nemOrani, setNemOrani] = useState<string>('')
  const [ph, setPh] = useState<string>('')
  const [fizikselPuan, setFizikselPuan] = useState<number>(4)
  const [laboratuvarPuan, setLaboratuvarPuan] = useState<number>(4)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const laboratuvarSonuclari: Record<string, number> = {}
    if (nemOrani) laboratuvarSonuclari.nem_orani = parseFloat(nemOrani)
    if (ph) laboratuvarSonuclari.ph = parseFloat(ph)

    onSubmit({
      gorsel_kontrol: gorselKontrol,
      ambalaj_durumu: ambalajDurumu,
      etiket_okunakli: etiketOkunakli,
      son_kullanma_tarihi: skt || undefined,
      laboratuvar_sonuclari: Object.keys(laboratuvarSonuclari).length > 0 ? laboratuvarSonuclari : undefined,
      fiziksel_puan: fizikselPuan,
      laboratuvar_puan: laboratuvarPuan,
    })
  }

  const genelPuan = calculateGenelPuan(fizikselPuan, laboratuvarPuan)
  const otomatikSonuc = determineResult(genelPuan)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Kontrol Sonuçlarını Gir</DialogTitle>
          <DialogDescription>
            Lot: {kk.lot_no} | Ürün: {kk.urun_ad}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fiziksel Kontrol */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Fiziksel Kontrol</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <Label>Görsel Kontrol</Label>
                <Button
                  type="button"
                  size="sm"
                  variant={gorselKontrol ? 'success' : 'destructive'}
                  onClick={() => setGorselKontrol(!gorselKontrol)}
                >
                  {gorselKontrol ? 'Uygun' : 'Değil'}
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <Label>Etiket Okunaklı</Label>
                <Button
                  type="button"
                  size="sm"
                  variant={etiketOkunakli ? 'success' : 'destructive'}
                  onClick={() => setEtiketOkunakli(!etiketOkunakli)}
                >
                  {etiketOkunakli ? 'Evet' : 'Hayır'}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ambalaj Durumu</Label>
              <Select value={ambalajDurumu} onValueChange={(v) => setAmbalajDurumu(v as AmbalajDurumu)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IYI">İyi</SelectItem>
                  <SelectItem value="ORTA">Orta</SelectItem>
                  <SelectItem value="ZAYIF">Zayıf</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Son Kullanma Tarihi</Label>
              <Input
                type="date"
                value={skt}
                onChange={(e) => setSkt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fiziksel Puan (1-5)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={fizikselPuan}
                onChange={(e) => setFizikselPuan(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          {/* Laboratuvar */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-base font-semibold">Laboratuvar Sonuçları</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nem Oranı (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="12.5"
                  value={nemOrani}
                  onChange={(e) => setNemOrani(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>pH</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="4.0"
                  value={ph}
                  onChange={(e) => setPh(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Laboratuvar Puan (1-5)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={laboratuvarPuan}
                onChange={(e) => setLaboratuvarPuan(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          {/* Preview */}
          {genelPuan !== null && (
            <div className={`p-4 rounded-lg ${
              otomatikSonuc === 'KABUL' ? 'bg-green-50 border border-green-200' :
              otomatikSonuc === 'KISMEN_KABUL' ? 'bg-orange-50 border border-orange-200' :
              'bg-red-50 border border-red-200'
            }`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Hesaplanan Genel Puan</p>
                  <p className="text-2xl font-bold">{genelPuan.toFixed(1)} / 5</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Otomatik Sonuç</p>
                  <StatusBadge durum={otomatikSonuc!} />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Kaydediliyor...' : 'Kaydet ve Devam Et'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function KKSonucDialog({
  open,
  onOpenChange,
  kk,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kk: KaliteKontrol
  onSubmit: (data: {
    durum: KKDurum
    ret_nedeni?: string
    ret_kriterleri?: string[]
    sonuc_aciklamasi?: string
  }) => void
  isLoading: boolean
}) {
  const [durum, setDurum] = useState<KKDurum>(
    kk.genel_puan ? determineResult(kk.genel_puan) || 'KABUL' : 'KABUL'
  )
  const [retNedeni, setRetNedeni] = useState<string>('')
  const [aciklama, setAciklama] = useState<string>('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const retKriterleri: string[] = []
    if (durum === 'RET') {
      // Check for automatic ret criteria
      if (kk.son_kullanma_tarihi && new Date(kk.son_kullanma_tarihi) < new Date()) {
        retKriterleri.push('SKT_GECMIS')
      }
      if (kk.ambalaj_durumu === 'ZAYIF') {
        retKriterleri.push('AMBAALAJ_HASAR')
      }
      if (kk.gorsel_kontrol === false) {
        retKriterleri.push('GORSEL_UYGUN_DEGIL')
      }
    }
    onSubmit({
      durum,
      ret_nedeni: durum === 'RET' ? retNedeni : undefined,
      ret_kriterleri: durum === 'RET' && retKriterleri.length > 0 ? retKriterleri : undefined,
      sonuc_aciklamasi: aciklama || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sonuç Belirle</DialogTitle>
          <DialogDescription>
            Kalite kontrol sonucunu kesinleştirin. Otomatik hesaplanan sonuca göre seçim yapabilirsiniz.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Score */}
          {kk.genel_puan !== undefined && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Mevcut Genel Puan</p>
              <p className="text-2xl font-bold">{kk.genel_puan.toFixed(1)} / 5</p>
              <p className="text-xs text-muted-foreground mt-1">
                Puan aralığı: ≥4.0 KABUL, 3.0-4.0 KISMEN_KABUL, &lt;3.0 RET
              </p>
            </div>
          )}

          {/* Result Selection */}
          <div className="space-y-2">
            <Label>Sonuç</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={durum === 'KABUL' ? 'success' : 'outline'}
                className="h-auto py-3 flex flex-col"
                onClick={() => setDurum('KABUL')}
              >
                <CheckCircle className="h-5 w-5 mb-1" />
                <span>Kabul</span>
              </Button>
              <Button
                type="button"
                variant={durum === 'KISMEN_KABUL' ? 'warning' : 'outline'}
                className="h-auto py-3 flex flex-col"
                onClick={() => setDurum('KISMEN_KABUL')}
              >
                <AlertTriangle className="h-5 w-5 mb-1" />
                <span>Kısmen Kabul</span>
              </Button>
              <Button
                type="button"
                variant={durum === 'RET' ? 'destructive' : 'outline'}
                className="h-auto py-3 flex flex-col"
                onClick={() => setDurum('RET')}
              >
                <XCircle className="h-5 w-5 mb-1" />
                <span>Ret</span>
              </Button>
            </div>
          </div>

          {/* Ret Reason (if RET) */}
          {durum === 'RET' && (
            <div className="space-y-2">
              <Label>Ret Nedeni *</Label>
              <Textarea
                placeholder="Ret nedenini açıklayın..."
                value={retNedeni}
                onChange={(e) => setRetNedeni(e.target.value)}
                required
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label>Sonuç Açıklaması (opsiyonel)</Label>
            <Textarea
              placeholder="Ek açıklamalar..."
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (durum === 'RET' && !retNedeni)}
            >
              {isLoading ? 'Kaydediliyor...' : 'Sonucu Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default KaliteKontrolPage
