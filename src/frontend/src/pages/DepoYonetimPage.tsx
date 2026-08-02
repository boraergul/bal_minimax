import { useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Warehouse, ArrowRightLeft, Plus, Truck, CheckCircle, XCircle, Clock, Package, FileText, Calendar, Phone, User } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Depo {
  id: string
  ad: string
  kod: string
  depo_tipi?: string
  il?: string
  doluluk_orani?: number
  aktif: boolean
}

export function DepoYonetimPage() {
  const [activeTab, setActiveTab] = useState<'depo' | 'transfer'>('depo')

  const { data: depolarData, isLoading: loadingDepo } = useQuery({
    queryKey: ['depolar'],
    queryFn: async () => {
      const response = await api.get('/depo')
      return response.data
    },
  })

  const depolar: Depo[] = depolarData?.data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            Depo Yönetimi
          </h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'depo' ? 'default' : 'outline'}
            onClick={() => setActiveTab('depo')}
          >
            <Warehouse className="h-4 w-4 mr-2" />
            Depolar
          </Button>
          <Button
            variant={activeTab === 'transfer' ? 'default' : 'outline'}
            onClick={() => setActiveTab('transfer')}
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transferler
          </Button>
          {activeTab === 'depo' && (
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Depo
            </Button>
          )}
        </div>
      </div>

      {activeTab === 'depo' ? (
        <Card>
          <CardContent className="p-0">
            {loadingDepo ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium">Kod</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Depo Adı</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Tür</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">İl</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Doluluk</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depolar.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-secondary">
                          Depo bulunamadı
                        </td>
                      </tr>
                    ) : (
                      depolar.map((depo) => (
                        <tr key={depo.id} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono text-sm">{depo.kod}</td>
                          <td className="px-4 py-3 font-medium">{depo.ad}</td>
                          <td className="px-4 py-3">{depo.depo_tipi || '-'}</td>
                          <td className="px-4 py-3">{depo.il || '-'}</td>
                          <td className="px-4 py-3">{depo.doluluk_orani ? `${depo.doluluk_orani}%` : '-'}</td>
                          <td className="px-4 py-3">
                            <Badge className={depo.aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {depo.aktif ? 'Aktif' : 'Pasif'}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <TransferTab />
      )}
    </div>
  )
}

// Transfer Tab Component
interface TransferItem {
  urun_id: string
  urun_ad?: string
  miktar: number
  birim?: string
}

interface Transfer {
  id: string
  transfer_no: string
  kaynak_depo_id: string
  kaynak_depo_ad?: string
  hedef_depo_id: string
  hedef_depo_ad?: string
  tarih: string
  durum: 'BEKLIYOR' | 'ONAYLANDI' | 'REDDEDILDI' | 'TAMAMLANDI'
  talep_eden?: string
  talep_eden_ad?: string
  kalemler?: TransferItem[]
  notlar?: string
  onay_tarihi?: string
  tamamlama_tarihi?: string
  red_nedeni?: string
  nakliye?: {
    firma?: string
    sofor_ad?: string
    sofor_tel?: string
    plaka?: string
    cikis_tarihi?: string
    varis_tarihi?: string
    irsaliye_no?: string
    teslim_tutan?: string
    teslim_tarihi?: string
  }
}

function TransferTab() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({
    durum: '',
    kaynak_depo_id: '',
    hedef_depo_id: '',
    baslangic_tarih: '',
    bitis_tarih: '',
  })
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)
  const [createForm, setCreateForm] = useState({
    kaynak_depo_id: '',
    hedef_depo_id: '',
    notlar: '',
    kalemler: [] as { urun_id: string; miktar: number }[],
  })
  const [showNakliyeDialog, setShowNakliyeDialog] = useState(false)
  const [nakliyeForm, setNakliyeForm] = useState({
    firma: '',
    sofor_ad: '',
    sofor_tel: '',
    plaka: '',
    cikis_tarihi: '',
    varis_tarihi: '',
    irsaliye_no: '',
  })

  // Fetch depolar
  const { data: depolarData } = useQuery({
    queryKey: ['depolar'],
    queryFn: async () => {
      const response = await api.get('/depo')
      return response.data
    },
  })
  const depolar = depolarData?.data || []

  // Fetch transfers
  const { data: transferlerData, isLoading } = useQuery({
    queryKey: ['depo-transferler', filters],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filters.durum) params.durum = filters.durum
      if (filters.kaynak_depo_id) params.kaynak_depo_id = filters.kaynak_depo_id
      if (filters.hedef_depo_id) params.hedef_depo_id = filters.hedef_depo_id
      if (filters.baslangic_tarih) params.baslangic_tarih = filters.baslangic_tarih
      if (filters.bitis_tarih) params.bitis_tarih = filters.bitis_tarih
      const response = await api.get('/depo/transferler', { params })
      return response.data
    },
  })
  const transferler: Transfer[] = transferlerData?.data || []

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await api.get('/auth/me')
      return response.data
    },
  })

  // Fetch urunler for item selection
  const { data: urunlerData } = useQuery({
    queryKey: ['urunler'],
    queryFn: async () => {
      const response = await api.get('/urunler', { params: { sayfa_boyutu: 100 } })
      return response.data
    },
  })
  const urunler = urunlerData?.data || []

  // Mutations
  const createTransferMutation = useMutation({
    mutationFn: async (data: typeof createForm) => {
      const response = await api.post('/depo/transferler', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depo-transferler'] })
      setShowCreateDialog(false)
      setCreateForm({ kaynak_depo_id: '', hedef_depo_id: '', notlar: '', kalemler: [] })
    },
  })

  const approveTransferMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/depo/transferler/${id}/onayla`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depo-transferler'] })
      if (selectedTransfer) {
        setSelectedTransfer({ ...selectedTransfer, durum: 'ONAYLANDI' })
      }
    },
  })

  const rejectTransferMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await api.post(`/depo/transferler/${id}/reddet`, { reason })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depo-transferler'] })
      if (selectedTransfer) {
        setSelectedTransfer({ ...selectedTransfer, durum: 'REDDEDILDI' })
      }
    },
  })

  const completeTransferMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/depo/transferler/${id}/tamamla`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depo-transferler'] })
      queryClient.invalidateQueries({ queryKey: ['stok'] })
      if (selectedTransfer) {
        setSelectedTransfer({ ...selectedTransfer, durum: 'TAMAMLANDI' })
      }
    },
  })

  const updateNakliyeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof nakliyeForm }) => {
      const response = await api.patch(`/depo/transferler/${id}/nakliye`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depo-transferler'] })
      setShowNakliyeDialog(false)
    },
  })

  const addItemToTransfer = () => {
    setCreateForm({
      ...createForm,
      kalemler: [...createForm.kalemler, { urun_id: '', miktar: 1 }],
    })
  }

  const updateItem = (index: number, field: 'urun_id' | 'miktar', value: string | number) => {
    const newKalemler = [...createForm.kalemler]
    newKalemler[index] = { ...newKalemler[index], [field]: value }
    setCreateForm({ ...createForm, kalemler: newKalemler })
  }

  const removeItem = (index: number) => {
    setCreateForm({
      ...createForm,
      kalemler: createForm.kalemler.filter((_, i) => i !== index),
    })
  }

  const handleCreateTransfer = () => {
    if (!createForm.kaynak_depo_id || !createForm.hedef_depo_id || createForm.kalemler.length === 0) {
      return
    }
    createTransferMutation.mutate(createForm)
  }

  const openDetail = (transfer: Transfer) => {
    setSelectedTransfer(transfer)
    setShowDetailDialog(true)
    if (transfer.nakliye) {
      setNakliyeForm({
        firma: transfer.nakliye.firma || '',
        sofor_ad: transfer.nakliye.sofor_ad || '',
        sofor_tel: transfer.nakliye.sofor_tel || '',
        plaka: transfer.nakliye.plaka || '',
        cikis_tarihi: transfer.nakliye.cikis_tarihi || '',
        varis_tarihi: transfer.nakliye.varis_tarihi || '',
        irsaliye_no: transfer.nakliye.irsaliye_no || '',
      })
    }
  }

  const getStatusBadge = (durum: string) => {
    switch (durum) {
      case 'BEKLIYOR':
        return <Badge className="bg-yellow-100 text-yellow-800">Bekliyor</Badge>
      case 'ONAYLANDI':
        return <Badge className="bg-green-100 text-green-800">Onaylandı</Badge>
      case 'REDDEDILDI':
        return <Badge className="bg-red-100 text-red-800">Reddedildi</Badge>
      case 'TAMAMLANDI':
        return <Badge className="bg-blue-100 text-blue-800">Tamamlandı</Badge>
      default:
        return <Badge variant="outline">{durum}</Badge>
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isManager = currentUser?.rol === 'yonetici' || currentUser?.rol === 'admin'

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Durum</label>
              <Select value={filters.durum} onValueChange={(v) => setFilters({ ...filters, durum: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tümü</SelectItem>
                  <SelectItem value="BEKLIYOR">Bekliyor</SelectItem>
                  <SelectItem value="ONAYLANDI">Onaylandı</SelectItem>
                  <SelectItem value="REDDEDILDI">Reddedildi</SelectItem>
                  <SelectItem value="TAMAMLANDI">Tamamlandı</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Kaynak Depo</label>
              <Select value={filters.kaynak_depo_id} onValueChange={(v) => setFilters({ ...filters, kaynak_depo_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tümü</SelectItem>
                  {depolar.map((d: Depo) => (
                    <SelectItem key={d.id} value={d.id}>{d.ad}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Hedef Depo</label>
              <Select value={filters.hedef_depo_id} onValueChange={(v) => setFilters({ ...filters, hedef_depo_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tümü</SelectItem>
                  {depolar.map((d: Depo) => (
                    <SelectItem key={d.id} value={d.id}>{d.ad}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Başlangıç</label>
              <Input
                type="date"
                value={filters.baslangic_tarih}
                onChange={(e) => setFilters({ ...filters, baslangic_tarih: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Bitiş</label>
              <Input
                type="date"
                value={filters.bitis_tarih}
                onChange={(e) => setFilters({ ...filters, bitis_tarih: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfer List */}
      <Card>
        <CardContent className="p-0">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="font-medium">Transfer Listesi</h3>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Transfer
            </Button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Transfer No</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Kaynak Depo</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Hedef Depo</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tarih</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Durum</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Talep Eden</th>
                  </tr>
                </thead>
                <tbody>
                  {transferler.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-secondary">
                        Transfer bulunamadı
                      </td>
                    </tr>
                  ) : (
                    transferler.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b hover:bg-muted/30 cursor-pointer"
                        onClick={() => openDetail(t)}
                      >
                        <td className="px-4 py-3 font-mono text-sm">{t.transfer_no}</td>
                        <td className="px-4 py-3">{t.kaynak_depo_ad || t.kaynak_depo_id}</td>
                        <td className="px-4 py-3">{t.hedef_depo_ad || t.hedef_depo_id}</td>
                        <td className="px-4 py-3">{formatDate(t.tarih)}</td>
                        <td className="px-4 py-3">{getStatusBadge(t.durum)}</td>
                        <td className="px-4 py-3">{t.talep_eden_ad || t.talep_eden || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Transfer Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Depo Transferi</DialogTitle>
            <DialogDescription>
              Kaynak depodan hedef depoya ürün transferi oluşturun.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Kaynak Depo *</label>
                <Select
                  value={createForm.kaynak_depo_id}
                  onValueChange={(v) => setCreateForm({ ...createForm, kaynak_depo_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {depolar.map((d: Depo) => (
                      <SelectItem key={d.id} value={d.id}>{d.ad}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Hedef Depo *</label>
                <Select
                  value={createForm.hedef_depo_id}
                  onValueChange={(v) => setCreateForm({ ...createForm, hedef_depo_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {depolar
                      .filter((d: Depo) => d.id !== createForm.kaynak_depo_id)
                      .map((d: Depo) => (
                        <SelectItem key={d.id} value={d.id}>{d.ad}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">Transfer Kalemleri *</label>
                <Button variant="outline" size="sm" onClick={addItemToTransfer}>
                  <Plus className="h-4 w-4 mr-1" /> Kalem Ekle
                </Button>
              </div>
              {createForm.kalemler.length === 0 ? (
                <div className="text-center py-4 text-secondary text-sm border rounded-md">
                  Kalem eklemek için yukarıdaki butonu kullanın
                </div>
              ) : (
                <div className="space-y-2">
                  {createForm.kalemler.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Select
                        value={item.urun_id}
                        onValueChange={(v) => updateItem(index, 'urun_id', v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Ürün seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {urunler.map((u: any) => (
                            <SelectItem key={u.id} value={u.id}>{u.ad}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Miktar"
                        value={item.miktar}
                        onChange={(e) => updateItem(index, 'miktar', parseInt(e.target.value) || 0)}
                        className="w-24"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="text-red-500"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Notlar</label>
              <Textarea
                value={createForm.notlar}
                onChange={(e) => setCreateForm({ ...createForm, notlar: e.target.value })}
                placeholder="Transfer ile ilgili notlar..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              İptal
            </Button>
            <Button
              onClick={handleCreateTransfer}
              disabled={
                !createForm.kaynak_depo_id ||
                !createForm.hedef_depo_id ||
                createForm.kalemler.length === 0 ||
                createTransferMutation.isPending
              }
            >
              {createTransferMutation.isPending ? 'Oluşturuluyor...' : 'Transfer Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedTransfer && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  Transfer Detayı
                  <span className="text-sm font-normal text-secondary">
                    {selectedTransfer.transfer_no}
                  </span>
                </DialogTitle>
              </DialogHeader>

              {/* Status & Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-sm text-secondary mb-1">Kaynak Depo</div>
                    <div className="font-medium">{selectedTransfer.kaynak_depo_ad || selectedTransfer.kaynak_depo_id}</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-sm text-secondary mb-1">Hedef Depo</div>
                    <div className="font-medium">{selectedTransfer.hedef_depo_ad || selectedTransfer.hedef_depo_id}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-secondary">Tarih</div>
                    <div className="font-medium">{formatDate(selectedTransfer.tarih)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-secondary">Durum</div>
                    <div className="mt-1">{getStatusBadge(selectedTransfer.durum)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-secondary">Talep Eden</div>
                    <div className="font-medium">{selectedTransfer.talep_eden_ad || selectedTransfer.talep_eden || '-'}</div>
                  </div>
                </div>

                {selectedTransfer.notlar && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-sm text-secondary mb-1">Notlar</div>
                    <div>{selectedTransfer.notlar}</div>
                  </div>
                )}

                {/* Status Timeline */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Durum Zaman Çizelgesi
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div>
                        <div className="font-medium text-sm">Oluşturuldu</div>
                        <div className="text-xs text-secondary">{formatDate(selectedTransfer.tarih)}</div>
                      </div>
                    </div>
                    {selectedTransfer.onay_tarihi && (
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${selectedTransfer.durum === 'REDDEDILDI' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                        <div>
                          <div className="font-medium text-sm">
                            {selectedTransfer.durum === 'REDDEDILDI' ? 'Reddedildi' : 'Onaylandı'}
                          </div>
                          <div className="text-xs text-secondary">{formatDate(selectedTransfer.onay_tarihi)}</div>
                          {selectedTransfer.red_nedeni && (
                            <div className="text-xs text-red-600 mt-1">Sebep: {selectedTransfer.red_nedeni}</div>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedTransfer.durum === 'TAMAMLANDI' && selectedTransfer.tamamlama_tarihi && (
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <div>
                          <div className="font-medium text-sm">Tamamlandı</div>
                          <div className="text-xs text-secondary">{formatDate(selectedTransfer.tamamlama_tarihi)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="border rounded-lg">
                  <div className="p-4 border-b bg-muted/30">
                    <h4 className="font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Transfer Kalemleri
                    </h4>
                  </div>
                  <div className="p-0">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/20">
                          <th className="px-4 py-2 text-left text-sm">Ürün</th>
                          <th className="px-4 py-2 text-right text-sm">Miktar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTransfer.kalemler?.map((item, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="px-4 py-2 text-sm">{item.urun_ad || item.urun_id}</td>
                            <td className="px-4 py-2 text-sm text-right">{item.miktar} {item.birim || ''}</td>
                          </tr>
                        )) || (
                          <tr>
                            <td colSpan={2} className="px-4 py-4 text-center text-secondary text-sm">
                              Kalem bilgisi yüklenemedi
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Nakliye Bilgileri (for completed transfers) */}
                {(selectedTransfer.durum === 'ONAYLANDI' || selectedTransfer.durum === 'TAMAMLANDI') && (
                  <div className="border rounded-lg">
                    <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
                      <h4 className="font-medium flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Nakliye Bilgileri
                      </h4>
                      {selectedTransfer.durum === 'ONAYLANDI' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowNakliyeDialog(true)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Düzenle
                        </Button>
                      )}
                    </div>
                    <div className="p-4">
                      {selectedTransfer.nakliye ? (
                        <div className="grid grid-cols-2 gap-4">
                          {selectedTransfer.nakliye.firma && (
                            <div>
                              <div className="text-sm text-secondary">Nakliye Firması</div>
                              <div className="font-medium">{selectedTransfer.nakliye.firma}</div>
                            </div>
                          )}
                          {selectedTransfer.nakliye.sofor_ad && (
                            <div>
                              <div className="text-sm text-secondary flex items-center gap-1">
                                <User className="h-3 w-3" /> Şoför Adı
                              </div>
                              <div className="font-medium">{selectedTransfer.nakliye.sofor_ad}</div>
                            </div>
                          )}
                          {selectedTransfer.nakliye.sofor_tel && (
                            <div>
                              <div className="text-sm text-secondary flex items-center gap-1">
                                <Phone className="h-3 w-3" /> Şoför Tel
                              </div>
                              <div className="font-medium">{selectedTransfer.nakliye.sofor_tel}</div>
                            </div>
                          )}
                          {selectedTransfer.nakliye.plaka && (
                            <div>
                              <div className="text-sm text-secondary">Plaka</div>
                              <div className="font-medium font-mono">{selectedTransfer.nakliye.plaka}</div>
                            </div>
                          )}
                          {selectedTransfer.nakliye.cikis_tarihi && (
                            <div>
                              <div className="text-sm text-secondary flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Çıkış Tarihi
                              </div>
                              <div className="font-medium">{formatDate(selectedTransfer.nakliye.cikis_tarihi)}</div>
                            </div>
                          )}
                          {selectedTransfer.nakliye.varis_tarihi && (
                            <div>
                              <div className="text-sm text-secondary flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Varış Tarihi
                              </div>
                              <div className="font-medium">{formatDate(selectedTransfer.nakliye.varis_tarihi)}</div>
                            </div>
                          )}
                          {selectedTransfer.nakliye.irsaliye_no && (
                            <div>
                              <div className="text-sm text-secondary">İrsaliye No</div>
                              <div className="font-medium font-mono">{selectedTransfer.nakliye.irsaliye_no}</div>
                            </div>
                          )}
                        </div>
                      ) : selectedTransfer.durum === 'ONAYLANDI' ? (
                        <div className="text-center py-4 text-secondary">
                          <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nakliye bilgisi girilmedi</p>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => setShowNakliyeDialog(true)}
                            className="mt-2"
                          >
                            Şimdi Ekle
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-secondary text-sm">
                          Nakliye bilgisi mevcut değil
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <DialogFooter className="flex-wrap gap-2">
                {selectedTransfer.durum === 'BEKLIYOR' && isManager && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const reason = prompt('Red nedeni:')
                        if (reason) {
                          rejectTransferMutation.mutate({ id: selectedTransfer.id, reason })
                        }
                      }}
                      disabled={rejectTransferMutation.isPending}
                      className="text-red-600"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reddet
                    </Button>
                    <Button
                      onClick={() => approveTransferMutation.mutate(selectedTransfer.id)}
                      disabled={approveTransferMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Onayla
                    </Button>
                  </>
                )}
                {selectedTransfer.durum === 'ONAYLANDI' && (
                  <Button
                    onClick={() => completeTransferMutation.mutate(selectedTransfer.id)}
                    disabled={completeTransferMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Tamamlandı İşaretle
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                  Kapat
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Nakliye Dialog */}
      <Dialog open={showNakliyeDialog} onOpenChange={setShowNakliyeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nakliye Bilgileri</DialogTitle>
            <DialogDescription>
              Transfer için nakliye detaylarını girin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nakliye Firması</label>
              <Input
                value={nakliyeForm.firma}
                onChange={(e) => setNakliyeForm({ ...nakliyeForm, firma: e.target.value })}
                placeholder="Firma adı"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Şoför Adı</label>
                <Input
                  value={nakliyeForm.sofor_ad}
                  onChange={(e) => setNakliyeForm({ ...nakliyeForm, sofor_ad: e.target.value })}
                  placeholder="Şoför adı"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Şoför Tel</label>
                <Input
                  value={nakliyeForm.sofor_tel}
                  onChange={(e) => setNakliyeForm({ ...nakliyeForm, sofor_tel: e.target.value })}
                  placeholder="05XX XXX XX XX"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Plaka</label>
              <Input
                value={nakliyeForm.plaka}
                onChange={(e) => setNakliyeForm({ ...nakliyeForm, plaka: e.target.value })}
                placeholder="XX 000 XX"
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Çıkış Tarihi</label>
                <Input
                  type="date"
                  value={nakliyeForm.cikis_tarihi}
                  onChange={(e) => setNakliyeForm({ ...nakliyeForm, cikis_tarihi: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Varış Tarihi</label>
                <Input
                  type="date"
                  value={nakliyeForm.varis_tarihi}
                  onChange={(e) => setNakliyeForm({ ...nakliyeForm, varis_tarihi: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">İrsaliye No</label>
              <Input
                value={nakliyeForm.irsaliye_no}
                onChange={(e) => setNakliyeForm({ ...nakliyeForm, irsaliye_no: e.target.value })}
                placeholder="İrsaliye numarası"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNakliyeDialog(false)}>
              İptal
            </Button>
            <Button
              onClick={() => {
                if (selectedTransfer) {
                  updateNakliyeMutation.mutate({ id: selectedTransfer.id, data: nakliyeForm })
                }
              }}
              disabled={updateNakliyeMutation.isPending}
            >
              {updateNakliyeMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
