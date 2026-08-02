import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Edit3, Plus, Search, Eye, Check, X, AlertTriangle,
  Package, Clock, CheckCircle, History, Filter
} from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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

interface StokDuzeltmeTalep {
  id: string
  stok_id: string
  talep_turu: 'SAYIM_FARKI' | 'FIRE_ZARAR' | 'CALISMA' | 'BIRIM_DEGISIKLIGI'
  talep_durumu: 'OLUSTURULDU' | 'BEKLEMEDE' | 'ONAYLANDI' | 'REDDEDILDI' | 'STOK_GUNCELLENDI'
  onceki_miktar: number
  yeni_miktar: number
  fark_miktar: number
  birim: string | null
  kritik_duzeltme: boolean
  kritik_durum_aciklama: string | null
  talep_eden_id: string
  talep_eden_ad?: string
  talep_tarihi: string
  talep_aciklamasi: string | null
  onay_leyen_id: string | null
  onay_leyen_ad?: string
  onay_tarihi: string | null
  ret_nedeni: string | null
  stok_guncelleme_tarihi: string | null
  olusturma_tarihi: string
  // Relations
  stok_lot_no?: string
  stok_urun_ad?: string
}

interface Stok {
  id: string
  lot_no: string
  urun_ad: string | null
  miktar: number
  birim: string
  durum: string
}

const durumLabels: Record<string, string> = {
  OLUSTURULDU: 'Oluşturuldu',
  BEKLEMEDE: 'Beklemede',
  ONAYLANDI: 'Onaylandı',
  REDDEDILDI: 'Reddedildi',
  STOK_GUNCELLENDI: 'Tamamlandı',
}

const durumColors: Record<string, string> = {
  OLUSTURULDU: 'bg-blue-100 text-blue-800',
  BEKLEMEDE: 'bg-orange-100 text-orange-800',
  ONAYLANDI: 'bg-green-100 text-green-800',
  REDDEDILDI: 'bg-red-100 text-red-800',
  STOK_GUNCELLENDI: 'bg-gray-100 text-gray-800',
}

const turLabels: Record<string, string> = {
  SAYIM_FARKI: 'Sayım Farkı',
  FIRE_ZARAR: 'Fire/Zarar',
  CALISMA: 'Çalışma',
  BIRIM_DEGISIKLIGI: 'Birim Değişikliği',
}

export function StokDuzeltmePage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<string>('talepler')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [selectedTalep, setSelectedTalep] = useState<StokDuzeltmeTalep | null>(null)
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve')

  const params: any = {
    sayfa: page,
    sayfa_boyutu: 20,
  }
  
  if (activeTab === 'talepler') {
    params.durum = 'OLUSTURULDU,BEKLEMEDE'
  } else if (activeTab === 'onay') {
    params.durum = 'BEKLEMEDE'
  } else if (activeTab === 'tamamlanan') {
    params.durum = 'ONAYLANDI,REDDEDILDI,STOK_GUNCELLENDI'
  }
  if (searchQuery) params.arama = searchQuery

  const { data, isLoading } = useQuery({
    queryKey: ['stok-duzeltme', params],
    queryFn: async () => {
      const response = await api.get('/stok-duzeltme', { params })
      return response.data
    },
  })

  const { data: stoklarData } = useQuery({
    queryKey: ['stok-for-duzeltme'],
    queryFn: async () => {
      const response = await api.get('/stok', { params: { sayfa_boyutu: 100, durum: 'AKTIF' } })
      return response.data
    },
  })

  const talepler: StokDuzeltmeTalep[] = data?.data || []
  const stoklar: Stok[] = stoklarData?.data || []

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/stok-duzeltme', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stok-duzeltme'] })
      setShowCreateDialog(false)
    },
  })

  const approveMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await api.patch(`/stok-duzeltme/${id}/onayla`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stok-duzeltme'] })
      queryClient.invalidateQueries({ queryKey: ['stok'] })
      setShowApprovalDialog(false)
      setSelectedTalep(null)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ id, ret_nedeni }: { id: string; ret_nedeni: string }) => {
      const response = await api.patch(`/stok-duzeltme/${id}/reddet`, { ret_nedeni })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stok-duzeltme'] })
      setShowApprovalDialog(false)
      setSelectedTalep(null)
    },
  })

  const handleViewDetail = (talep: StokDuzeltmeTalep) => {
    setSelectedTalep(talep)
    setShowDetailDialog(true)
  }

  const handleApproval = (talep: StokDuzeltmeTalep, action: 'approve' | 'reject') => {
    setSelectedTalep(talep)
    setApprovalAction(action)
    setShowApprovalDialog(true)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Stok Düzeltme
          </h2>
          <p className="text-sm text-secondary">
            {data?.total || 0} düzeltme talebi
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Düzeltme Talebi
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'talepler'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-foreground'
          }`}
          onClick={() => { setActiveTab('talepler'); setPage(1) }}
        >
          Talepler
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'onay'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-foreground'
          }`}
          onClick={() => { setActiveTab('onay'); setPage(1) }}
        >
          Onay Bekleyen
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'tamamlanan'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-foreground'
          }`}
          onClick={() => { setActiveTab('tamamlanan'); setPage(1) }}
        >
          Tamamlanan
        </button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Lot no veya ürün adı ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtrele
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
          ) : talepler.length === 0 ? (
            <div className="text-center py-12 text-secondary">
              <Edit3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Düzeltme talebi bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Lot No</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Ürün</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tür</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Önceki</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Yeni</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Fark</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Durum</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {talepler.map((talep) => (
                    <tr key={talep.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-sm">
                        <div className="flex items-center gap-2">
                          {talep.kritik_duzeltme && (
                            <AlertTriangle className="h-4 w-4 text-red-500" title="Kritik Düzeltme" />
                          )}
                          {talep.stok_lot_no || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">{talep.stok_urun_ad || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {turLabels[talep.talep_turu] || talep.talep_turu}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {talep.onceki_miktar} {talep.birim}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {talep.yeni_miktar} {talep.birim}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono ${
                        talep.fark_miktar > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {talep.fark_miktar > 0 ? '+' : ''}{talep.fark_miktar}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={durumColors[talep.talep_durumu]}>
                          {durumLabels[talep.talep_durumu]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(talep)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {talep.talep_durumu === 'BEKLEMEDE' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApproval(talep, 'approve')}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApproval(talep, 'reject')}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.toplam_sayfa > 1 && (
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
            Sayfa {page} / {data.toplam_sayfa}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.toplam_sayfa}
            onClick={() => setPage(page + 1)}
          >
            Sonraki
          </Button>
        </div>
      )}

      {/* Create Dialog */}
      <CreateDuzeltmeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        stoklar={stoklar}
        onSave={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {/* Detail Dialog */}
      <TalepDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        talep={selectedTalep}
      />

      {/* Approval Dialog */}
      <ApprovalDialog
        open={showApprovalDialog}
        onOpenChange={setShowApprovalDialog}
        talep={selectedTalep}
        action={approvalAction}
        onApprove={(id, data) => approveMutation.mutate({ id, ...data })}
        onReject={(id, ret_nedeni) => rejectMutation.mutate({ id, ret_nedeni })}
        isLoading={approveMutation.isPending || rejectMutation.isPending}
      />
    </div>
  )
}

interface CreateDuzeltmeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stoklar: Stok[]
  onSave: (data: any) => void
  isLoading: boolean
}

function CreateDuzeltmeDialog({ open, onOpenChange, stoklar, onSave, isLoading }: CreateDuzeltmeDialogProps) {
  const [formData, setFormData] = useState({
    stok_id: '',
    talep_turu: 'SAYIM_FARKI' as const,
    yeni_miktar: '',
    talep_aciklamasi: '',
    kritik_duzeltme: false,
  })

  const selectedStok = stoklar.find((s) => s.id === formData.stok_id)
  const oncekiMiktar = selectedStok?.miktar || 0
  const yeniMiktar = parseFloat(formData.yeni_miktar) || 0
  const farkMiktar = yeniMiktar - oncekiMiktar

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      stok_id: formData.stok_id,
      talep_turu: formData.talep_turu,
      onceki_miktar: oncekiMiktar,
      yeni_miktar: yeniMiktar,
      fark_miktar: farkMiktar,
      birim: selectedStok?.birim,
      talep_aciklamasi: formData.talep_aciklamasi,
      kritik_duzeltme: formData.kritik_duzeltme,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Yeni Düzeltme Talebi</DialogTitle>
            <DialogDescription>
              Stok miktarı düzeltme talebi oluşturun
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stok">Stok Seç</Label>
              <Select
                value={formData.stok_id}
                onValueChange={(value) => setFormData({ ...formData, stok_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Stok seçin" />
                </SelectTrigger>
                <SelectContent>
                  {stoklar.map((stok) => (
                    <SelectItem key={stok.id} value={stok.id}>
                      {stok.lot_no} - {stok.urun_ad || '-'} ({stok.miktar} {stok.birim})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedStok && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Mevcut Miktar:</span>
                  <span className="font-mono font-medium">{oncekiMiktar} {selectedStok.birim}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Durum:</span>
                  <Badge>{selectedStok.durum}</Badge>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="yeni_miktar">Yeni Miktar</Label>
              <Input
                id="yeni_miktar"
                type="number"
                min="0"
                step="any"
                value={formData.yeni_miktar}
                onChange={(e) => setFormData({ ...formData, yeni_miktar: e.target.value })}
                placeholder="Yeni miktar"
                required
              />
            </div>

            {formData.yeni_miktar && (
              <div className={`p-3 rounded-lg text-center ${
                farkMiktar > 0 ? 'bg-green-50 text-green-800' :
                farkMiktar < 0 ? 'bg-red-50 text-red-800' :
                'bg-gray-50 text-gray-800'
              }`}>
                <p className="text-lg font-bold">
                  {farkMiktar > 0 ? '+' : ''}{farkMiktar.toFixed(2)} {selectedStok?.birim}
                </p>
                <p className="text-xs">
                  {farkMiktar > 0 ? 'Stok artışı' : farkMiktar < 0 ? 'Stok azalışı' : 'Değişiklik yok'}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tur">Talep Türü</Label>
              <Select
                value={formData.talep_turu}
                onValueChange={(value: any) => setFormData({ ...formData, talep_turu: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAYIM_FARKI">Sayım Farkı</SelectItem>
                  <SelectItem value="FIRE_ZARAR">Fire/Zarar</SelectItem>
                  <SelectItem value="CALISMA">Çalışma</SelectItem>
                  <SelectItem value="BIRIM_DEGISIKLIGI">Birim Değişikliği</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aciklama">Açıklama</Label>
              <textarea
                id="aciklama"
                value={formData.talep_aciklamasi}
                onChange={(e) => setFormData({ ...formData, talep_aciklamasi: e.target.value })}
                placeholder="Düzeltme nedeni..."
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                required
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Kritik Düzeltme</p>
                  <p className="text-xs text-yellow-600">Büyük miktarlı değişiklikler için</p>
                </div>
              </div>
              <Switch
                checked={formData.kritik_duzeltme}
                onCheckedChange={(checked) => setFormData({ ...formData, kritik_duzeltme: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isLoading || !formData.stok_id || !formData.yeni_miktar}>
              {isLoading ? 'Gönderiliyor...' : 'Talep Oluştur'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface TalepDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  talep: StokDuzeltmeTalep | null
}

function TalepDetailDialog({ open, onOpenChange, talep }: TalepDetailDialogProps) {
  if (!talep) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Düzeltme Detayı
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Status and Type */}
          <div className="flex items-center gap-2">
            <Badge className={durumColors[talep.talep_durumu]}>
              {durumLabels[talep.talep_durumu]}
            </Badge>
            <Badge variant="outline">
              {turLabels[talep.talep_turu] || talep.talep_turu}
            </Badge>
            {talep.kritik_duzeltme && (
              <Badge className="bg-red-100 text-red-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Kritik
              </Badge>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-secondary">Lot No</p>
              <p className="text-sm font-mono font-medium">{talep.stok_lot_no || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-secondary">Ürün</p>
              <p className="text-sm font-medium">{talep.stok_urun_ad || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-secondary">Önceki Miktar</p>
              <p className="text-sm font-mono">{talep.onceki_miktar} {talep.birim}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-secondary">Yeni Miktar</p>
              <p className="text-sm font-mono font-bold">{talep.yeni_miktar} {talep.birim}</p>
            </div>
            <div className="space-y-1 col-span-2">
              <p className="text-xs text-secondary">Fark</p>
              <p className={`text-lg font-bold ${
                talep.fark_miktar > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {talep.fark_miktar > 0 ? '+' : ''}{talep.fark_miktar} {talep.birim}
              </p>
            </div>
          </div>

          {/* Description */}
          {talep.talep_aciklamasi && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-secondary mb-1">Açıklama</p>
              <p className="text-sm">{talep.talep_aciklamasi}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-3">
            <p className="text-sm font-medium">İşlem Geçmişi</p>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm">Talep Oluşturuldu</p>
                  <p className="text-xs text-secondary">{talep.talep_eden_ad || 'Bilinmiyor'}</p>
                  <p className="text-xs text-secondary">{formatDate(talep.talep_tarihi)}</p>
                </div>
              </div>
              {talep.onay_tarihi && (
                <div className="flex items-start gap-3">
                  <CheckCircle className={`h-4 w-4 mt-0.5 ${
                    talep.talep_durumu === 'REDDEDILDI' ? 'text-red-500' : 'text-green-500'
                  }`} />
                  <div>
                    <p className="text-sm">
                      {talep.talep_durumu === 'REDDEDILDI' ? 'Reddedildi' : 'Onaylandı'}
                    </p>
                    <p className="text-xs text-secondary">{talep.onay_leyen_ad || 'Bilinmiyor'}</p>
                    <p className="text-xs text-secondary">{formatDate(talep.onay_tarihi)}</p>
                    {talep.ret_nedeni && (
                      <p className="text-xs text-red-600 mt-1">Nedeni: {talep.ret_nedeni}</p>
                    )}
                  </div>
                </div>
              )}
              {talep.stok_guncelleme_tarihi && (
                <div className="flex items-start gap-3">
                  <Package className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm">Stok Güncellendi</p>
                    <p className="text-xs text-secondary">{formatDate(talep.stok_guncelleme_tarihi)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ApprovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  talep: StokDuzeltmeTalep | null
  action: 'approve' | 'reject'
  onApprove: (id: string, data: any) => void
  onReject: (id: string, ret_nedeni: string) => void
  isLoading: boolean
}

function ApprovalDialog({ open, onOpenChange, talep, action, onApprove, onReject, isLoading }: ApprovalDialogProps) {
  const [retNedeni, setRetNedeni] = useState('')

  if (!talep) return null

  const handleSubmit = () => {
    if (action === 'approve') {
      onApprove(talep.id, {})
    } else {
      if (!retNedeni.trim()) {
        return
      }
      onReject(talep.id, retNedeni)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action === 'approve' ? 'Talebi Onayla' : 'Talebi Reddet'}
          </DialogTitle>
          <DialogDescription>
            {action === 'approve'
              ? 'Bu düzeltme talebini onaylamak istediğinizden emin misiniz?'
              : 'Reddetme nedenini belirtiniz.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Talep Info */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Lot No:</span>
              <span className="font-mono">{talep.stok_lot_no || '-'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Değişiklik:</span>
              <span className="font-mono">
                {talep.onceki_miktar} → {talep.yeni_miktar} ({talep.fark_miktar > 0 ? '+' : ''}{talep.fark_miktar})
              </span>
            </div>
          </div>

          {action === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="ret_nedeni">Red Nedeni</Label>
              <textarea
                id="ret_nedeni"
                value={retNedeni}
                onChange={(e) => setRetNedeni(e.target.value)}
                placeholder="Reddetme nedenini açıklayın..."
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                required
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          {action === 'approve' ? (
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? 'Onaylanıyor...' : 'Onayla'}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={isLoading || !retNedeni.trim()}
            >
              {isLoading ? 'Reddediliyor...' : 'Reddet'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
