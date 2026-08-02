import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileSpreadsheet, Upload, Download, Eye, Trash2,
  CheckCircle, XCircle, Clock, AlertTriangle, File,
  FileText, Search, RefreshCw, Play, History, LayoutTemplate
} from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
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

interface TopluIslem {
  id: string
  islem_turu: string
  islem_no: string
  durum: 'BEKLEMEDE' | 'VALIDATING' | 'ISLENIYOR' | 'TAMAMLANDI' | 'HATALAR_VAR' | 'IPTAL_EDILDI'
  dosya_adi: string | null
  dosya_url: string | null
  satir_sayisi: number | null
  basarili_satir: number
  basarisiz_satir: number
  islenen_satir: number
  onay_durumu: string
  sonuc_dosya_url: string | null
  not_text: string | null
  olusturma_tarihi: string
}

interface TopluIslemSablon {
  id: string
  sablon_adi: string
  islem_turu: string
  aciklama: string | null
  Alanlar: string[]
  aktif: boolean
}

const islemTuruLabels: Record<string, string> = {
  STOK_GIRISI: 'Stok Girişi',
  URETIM_EMRI: 'Üretim Emri',
  MUSKAYIT: 'Müşteri Kayıt',
  TEDARIKCI_KAYIT: 'Tedarikçi Kayıt',
  STOK_DUZELTME: 'Stok Düzeltme',
  ETIKET_BASKI: 'Etiket Baskı',
  SATIS_IRAC: 'Satış İrac',
}

const islemTuruIcons: Record<string, any> = {
  STOK_GIRISI: File,
  URETIM_EMRI: FileText,
  MUSKAYIT: File,
  TEDARIKCI_KAYIT: File,
  STOK_DUZELTME: File,
  ETIKET_BASKI: FileText,
  SATIS_IRAC: File,
}

const durumLabels: Record<string, string> = {
  BEKLEMEDE: 'Beklemede',
  VALIDATING: 'Doğrulanıyor',
  ISLENIYOR: 'İşleniyor',
  TAMAMLANDI: 'Tamamlandı',
  HATALAR_VAR: 'Hatalar Var',
  IPTAL_EDILDI: 'İptal Edildi',
}

const durumColors: Record<string, string> = {
  BEKLEMEDE: 'bg-blue-100 text-blue-800',
  VALIDATING: 'bg-yellow-100 text-yellow-800',
  ISLENIYOR: 'bg-orange-100 text-orange-800',
  TAMAMLANDI: 'bg-green-100 text-green-800',
  HATALAR_VAR: 'bg-red-100 text-red-800',
  IPTAL_EDILDI: 'bg-gray-100 text-gray-800',
}

const durumIcons: Record<string, any> = {
  BEKLEMEDE: Clock,
  VALIDATING: RefreshCw,
  ISLENIYOR: Play,
  TAMAMLANDI: CheckCircle,
  HATALAR_VAR: AlertTriangle,
  IPTAL_EDILDI: XCircle,
}

export function TopluIslemPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<string>('import')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedIslem, setSelectedIslem] = useState<TopluIslem | null>(null)

  // Import form state
  const [importType, setImportType] = useState<string>('STOK_GIRISI')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const params: any = {
    sayfa: page,
    sayfa_boyutu: 20,
  }
  if (searchQuery) params.arama = searchQuery

  const { data, isLoading } = useQuery({
    queryKey: ['toplu-islem', params],
    queryFn: async () => {
      const response = await api.get('/toplu-islem', { params })
      return response.data
    },
  })

  const { data: sablonlarData } = useQuery({
    queryKey: ['toplu-islem-sablonlar'],
    queryFn: async () => {
      const response = await api.get('/toplu-islem/sablonlar')
      return response.data
    },
  })

  const islemler: TopluIslem[] = data?.data || []
  const sablonlar: TopluIslemSablon[] = sablonlarData?.data || []

  const filteredIslemler = islemler.filter((islem) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        islem.islem_no.toLowerCase().includes(query) ||
        islem.dosya_adi?.toLowerCase().includes(query) ||
        islem.islem_turu.toLowerCase().includes(query)
      )
    }
    return true
  })

  const importMutation = useMutation({
    mutationFn: async ({ type, file }: { type: string; file: File }) => {
      const formData = new FormData()
      formData.append('islem_turu', type)
      formData.append('dosya', file)
      const response = await api.post('/toplu-islem/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toplu-islem'] })
      setShowImportDialog(false)
      setSelectedFile(null)
    },
  })

  const downloadSablonMutation = useMutation({
    mutationFn: async (islemTuru: string) => {
      const response = await api.get(`/toplu-islem/sablon/${islemTuru}/indir`, {
        responseType: 'blob',
      })
      return response.data
    },
  })

  const handleViewDetail = (islem: TopluIslem) => {
    setSelectedIslem(islem)
    setShowDetailDialog(true)
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
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

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Toplu İşlemler
          </h2>
          <p className="text-sm text-secondary">
            Excel/CSV ile toplu veri import/export işlemleri
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'import'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-foreground'
          }`}
          onClick={() => setActiveTab('import')}
        >
          <Upload className="h-4 w-4 inline mr-1" />
          Import
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'export'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-foreground'
          }`}
          onClick={() => setActiveTab('export')}
        >
          <Download className="h-4 w-4 inline mr-1" />
          Export
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-foreground'
          }`}
          onClick={() => setActiveTab('history')}
        >
          <History className="h-4 w-4 inline mr-1" />
          Geçmiş ({islemler.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'templates'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-foreground'
          }`}
          onClick={() => setActiveTab('templates')}
        >
          <LayoutTemplate className="h-4 w-4 inline mr-1" />
          Şablonlar
        </button>
      </div>

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Operation Type Selection */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Import İşlemi Seç</h3>
              <div className="grid gap-3">
                {Object.entries(islemTuruLabels).map(([key, label]) => {
                  const Icon = islemTuruIcons[key] || File
                  const isSelected = importType === key
                  return (
                    <button
                      key={key}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary'
                          : 'border-border hover:bg-muted hover:border-primary/50'
                      }`}
                      onClick={() => setImportType(key)}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="font-medium">{label}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Dosya Yükle</h3>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                {selectedFile ? (
                  <div className="space-y-2">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-secondary">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                    >
                      Kaldır
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Dosyayı sürükle bırak</p>
                    <p className="text-sm text-secondary">
                      veya dosya seçmek için tıkla
                    </p>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      Dosya Seç
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-secondary mt-4 text-center">
                Desteklenen formatlar: CSV, XLSX, XLS
              </p>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => downloadSablonMutation.mutate(importType)}
                  disabled={downloadSablonMutation.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Şablon İndir
                </Button>
                <Button
                  className="flex-1"
                  disabled={!selectedFile || importMutation.isPending}
                  onClick={() => importMutation.mutate({ type: importType, file: selectedFile! })}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {importMutation.isPending ? 'İşleniyor...' : 'Import Başlat'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Export İşlemi</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Export Türü</Label>
                <Select defaultValue="STOK">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STOK">Stok Listesi</SelectItem>
                    <SelectItem value="SATIS">Satış Listesi</SelectItem>
                    <SelectItem value="URETIM">Üretim Listesi</SelectItem>
                    <SelectItem value="MUSTERI">Müşteri Listesi</SelectItem>
                    <SelectItem value="TEDARIKCI">Tedarikçi Listesi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Başlangıç Tarihi</Label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <Label>Bitiş Tarihi</Label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <Select defaultValue="xlsx">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-6">
              <Button disabled>
                <Download className="h-4 w-4 mr-2" />
                Export Başlat
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <>
          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="İşlem no veya dosya adı ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
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
              ) : filteredIslemler.length === 0 ? (
                <div className="text-center py-12 text-secondary">
                  <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">İşlem kaydı bulunamadı</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">İşlem No</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Tür</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Dosya</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Satırlar</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Başarılı</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Hatalı</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Durum</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Tarih</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIslemler.map((islem) => {
                        const Icon = durumIcons[islem.durum] || Clock
                        return (
                          <tr key={islem.id} className="border-b hover:bg-muted/30">
                            <td className="px-4 py-3 font-mono text-sm">{islem.islem_no}</td>
                            <td className="px-4 py-3 text-sm">
                              {islemTuruLabels[islem.islem_turu] || islem.islem_turu}
                            </td>
                            <td className="px-4 py-3 text-sm">{islem.dosya_adi || '-'}</td>
                            <td className="px-4 py-3 text-right">{islem.satir_sayisi || '-'}</td>
                            <td className="px-4 py-3 text-right text-green-600">
                              {islem.basarili_satir}
                            </td>
                            <td className="px-4 py-3 text-right text-red-600">
                              {islem.basarisiz_satir}
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={durumColors[islem.durum]}>
                                <Icon className="h-3 w-3 mr-1" />
                                {durumLabels[islem.durum]}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {formatDate(islem.olusturma_tarihi)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDetail(islem)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {islem.durum === 'HATALAR_VAR' && islem.sonuc_dosya_url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => downloadFile(islem.sonuc_dosya_url!, 'hata_raporu.xlsx')}
                                    className="text-red-600"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
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
        </>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sablonlar.length === 0 ? (
            <div className="col-span-full text-center py-12 text-secondary">
              <LayoutTemplate className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Şablon bulunamadı</p>
            </div>
          ) : (
            sablonlar.map((sablon) => (
              <Card key={sablon.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <LayoutTemplate className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant="outline">
                      {islemTuruLabels[sablon.islem_turu] || sablon.islem_turu}
                    </Badge>
                  </div>
                  <h4 className="font-semibold mb-2">{sablon.sablon_adi}</h4>
                  {sablon.aciklama && (
                    <p className="text-sm text-secondary mb-4">{sablon.aciklama}</p>
                  )}
                  <div className="space-y-2 mb-4">
                    <p className="text-xs text-secondary">Alanlar:</p>
                    <div className="flex flex-wrap gap-1">
                      {sablon.Alanlar?.slice(0, 4).map((alan, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-muted rounded text-xs"
                        >
                          {alan}
                        </span>
                      ))}
                      {sablon.Alanlar?.length > 4 && (
                        <span className="px-2 py-0.5 text-xs text-secondary">
                          +{sablon.Alanlar.length - 4} daha
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => downloadSablonMutation.mutate(sablon.islem_turu)}
                    disabled={downloadSablonMutation.isPending}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    İndir
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Detail Dialog */}
      <IslemDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        islem={selectedIslem}
        onDownload={(url, name) => downloadFile(url, name)}
      />
    </div>
  )
}

interface IslemDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  islem: TopluIslem | null
  onDownload: (url: string, filename: string) => void
}

function IslemDetailDialog({ open, onOpenChange, islem, onDownload }: IslemDetailDialogProps) {
  if (!islem) return null

  const durumYuzdesi = islem.satir_sayiri
    ? Math.round((islem.islenen_satir / islem.satir_sayiri) * 100)
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>İşlem Detayı</DialogTitle>
          <DialogDescription>{islem.islem_no}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge className={durumColors[islem.durum]}>
              {durumLabels[islem.durum]}
            </Badge>
            <Badge variant="outline">
              {islemTuruLabels[islem.islem_turu] || islem.islem_turu}
            </Badge>
          </div>

          {/* Progress */}
          {islem.durum === 'ISLENIYOR' || islem.durum === 'VALIDATING' ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>İlerleme</span>
                <span>{durumYuzdesi}%</span>
              </div>
              <Progress value={durumYuzdesi} />
            </div>
          ) : null}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold">{islem.satir_sayiri || 0}</p>
              <p className="text-xs text-secondary">Toplam Satır</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{islem.basarili_satir}</p>
              <p className="text-xs text-secondary">Başarılı</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-600">{islem.basarisiz_satir}</p>
              <p className="text-xs text-secondary">Hatalı</p>
            </div>
          </div>

          {/* File Info */}
          {islem.dosya_adi && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <File className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{islem.dosya_adi}</p>
                    <p className="text-xs text-secondary">
                      {formatDate(islem.olusturma_tarihi)}
                    </p>
                  </div>
                </div>
                {islem.dosya_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDownload(islem.dosya_url!, islem.dosya_adi!)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {islem.not_text && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-secondary mb-1">Notlar</p>
              <p className="text-sm">{islem.not_text}</p>
            </div>
          )}

          {/* Error Report Download */}
          {islem.durum === 'HATALAR_VAR' && islem.sonuc_dosya_url && (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => onDownload(islem.sonuc_dosya_url!, 'hata_raporu.xlsx')}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Hata Raporunu İndir
            </Button>
          )}
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
