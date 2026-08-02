import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Search, 
  QrCode, 
  FileText, 
  Download, 
  Truck, 
  Factory, 
  Package, 
  ShoppingCart,
  MapPin,
  Calendar,
  User,
  Phone,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils'

// Types
interface IzlenebilirlikVeri {
  lot_no: string
  stok_tipi: 'HAMMADDE' | 'MAMUL'
  urun_ad: string
  miktar: number
  birim: string
  giris_tarihi: string
  son_kullanma: string | null
  tedarikci?: {
    ad: string
    vergi_no: string
    yetkili_kisi: string
    telefon: string
    adres: string
  }
  uretim?: {
    uretim_no: string
    tarih: string
    personel: string
    mamul_lot_no: string
  }
  satislar?: {
    satis_no: string
    musteri_ad: string
    tarih: string
    miktar: number
    birim: string
  }[]
  gida zinciri?: {
    hayvansal_kaynak: boolean
    gdo: boolean
    alerjenler: string[]
    muamekki_kimlik: string
  }
}

export function IzlenebilirlikPage() {
  const [lotNo, setLotNo] = useState('')
  const [aramaYapildi, setAramaYapildi] = useState(false)

  const { data: izlenebilirlik, isLoading, error } = useQuery({
    queryKey: ['izlenebilirlik', lotNo],
    queryFn: async () => {
      const response = await api.get<IzlenebilirlikVeri>(`/raporlar/izlenebilirlik/lot/${lotNo}`)
      return response.data
    },
    enabled: !!lotNo && aramaYapildi,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (lotNo.trim()) {
      setAramaYapildi(true)
    }
  }

  const exportPdf = () => {
    // In a real implementation, this would call the API to generate a PDF
    window.open(`/api/v1/raporlar/izlenebilirlik/lot/${lotNo}/pdf`, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Gıda İzlenebilirlik
          </h2>
          <p className="text-sm text-secondary">
            Gıda İzlenebilirlik Tebliği kapsamında lot bazlı takip
          </p>
        </div>
      </div>

      {/* Search Card */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Lot numarası giriniz (örn: LOT-2024-001)..."
                value={lotNo}
                onChange={(e) => setLotNo(e.target.value)}
                className="pl-10 font-mono"
              />
            </div>
            <Button type="submit" disabled={!lotNo.trim() || isLoading}>
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Ara
                </>
              )}
            </Button>
            {izlenebilirlik && (
              <Button variant="outline" onClick={exportPdf}>
                <Download className="h-4 w-4 mr-2" />
                PDF İndir
              </Button>
            )}
          </form>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-blue-50">
              <CheckCircle className="h-3 w-3 mr-1 text-blue-600" />
              Yasal Uyumlu
            </Badge>
            <Badge variant="outline" className="bg-green-50">
              <FileText className="h-3 w-3 mr-1 text-green-600" />
              CİZDENSİZ MÜLKİYET
            </Badge>
            <Badge variant="outline" className="bg-purple-50">
              <QrCode className="h-3 w-3 mr-1 text-purple-600" />
              QR Doğrulama
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading && (
        <Card>
          <CardContent className="p-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && aramaYapildi && !isLoading && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertTriangle className="h-6 w-6" />
              <div>
                <p className="font-medium">Lot bulunamadı</p>
                <p className="text-sm">Girilen lot numarası sistemde kayıtlı değil.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {izlenebilirlik && !isLoading && (
        <>
          {/* Traceability Chain Visualization */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                İzlenebilirlik Zinciri
              </h3>
              
              <div className="relative">
                {/* Timeline */}
                <div className="hidden md:flex items-center justify-between">
                  <TraceabilityStep 
                    icon={Truck} 
                    label="Tedarikçi" 
                    active={!!izlenebilirlik.tedarikci}
                    completed={!!izlenebilirlik.uretim}
                  />
                  <div className="flex-1 h-1 bg-border mx-2 relative">
                    <div className={`absolute inset-0 ${izlenebilirlik.uretim ? 'bg-green-500' : 'bg-border'}`} />
                  </div>
                  <TraceabilityStep 
                    icon={Package} 
                    label="Hammadde Girişi" 
                    active={true}
                    completed={!!izlenebilirlik.uretim}
                  />
                  <div className="flex-1 h-1 bg-border mx-2 relative">
                    <div className={`absolute inset-0 ${izlenebilirlik.uretim ? 'bg-green-500' : 'bg-border'}`} />
                  </div>
                  <TraceabilityStep 
                    icon={Factory} 
                    label="Üretim" 
                    active={!!izlenebilirlik.uretim}
                    completed={!!izlenebilirlik.satislar?.length}
                  />
                  <div className="flex-1 h-1 bg-border mx-2 relative">
                    <div className={`absolute inset-0 ${izlenebilirlik.satislar?.length ? 'bg-green-500' : 'bg-border'}`} />
                  </div>
                  <TraceabilityStep 
                    icon={ShoppingCart} 
                    label="Satış" 
                    active={!!izlenebilirlik.satislar?.length}
                    completed={false}
                  />
                </div>

                {/* Mobile timeline */}
                <div className="md:hidden space-y-3">
                  <MobileTraceStep label="Tedarikçi" data={izlenebilirlik.tedarikci?.ad} />
                  <MobileTraceStep label="Hammadde" data={izlenebilirlik.urun_ad} />
                  <MobileTraceStep label="Üretim" data={izlenebilirlik.uretim?.uretim_no} />
                  <MobileTraceStep label="Satış" data={izlenebilirlik.satislar?.length ? `${izlenebilirlik.satislar.length} satış` : '-'} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detail Cards */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Supplier Info */}
            {izlenebilirlik.tedarikci && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-600" />
                    Tedarikçi Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow label="Firma Adı" value={izlenebilirlik.tedarikci.ad} />
                  <InfoRow label="Vergi No" value={izlenebilirlik.tedarikci.vergi_no} />
                  <InfoRow label="Yetkili Kişi" value={izlenebilirlik.tedarikci.yetkili_kisi} />
                  <InfoRow label="Telefon" value={izlenebilirlik.tedarikci.telefon} icon={Phone} />
                  <InfoRow label="Adres" value={izlenebilirlik.tedarikci.adres} />
                </CardContent>
              </Card>
            )}

            {/* Raw Material Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-600" />
                  Hammadde Lot Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Lot No" value={izlenebilirlik.lot_no} highlight />
                <InfoRow label="Ürün" value={izlenebilirlik.urun_ad} />
                <InfoRow label="Miktar" value={`${izlenebilirlik.miktar} ${izlenebilirlik.birim}`} />
                <InfoRow label="Giriş Tarihi" value={formatDate(izlenebilirlik.giris_tarihi)} icon={Calendar} />
                {izlenebilirlik.son_kullanma && (
                  <InfoRow 
                    label="Son Kullanma" 
                    value={formatDate(izlenebilirlik.son_kullanma)} 
                    icon={Clock}
                    warning={new Date(izlenebilirlik.son_kullanma) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
                  />
                )}
              </CardContent>
            </Card>

            {/* Production Info */}
            {izlenebilirlik.uretim && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Factory className="h-5 w-5 text-purple-600" />
                    Üretim Emri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow label="Üretim No" value={izlenebilirlik.uretim.uretim_no} highlight />
                  <InfoRow label="Tarih" value={formatDate(izlenebilirlik.uretim.tarih)} icon={Calendar} />
                  <InfoRow label="Personel" value={izlenebilirlik.uretim.personel} icon={User} />
                  <InfoRow label="Mamül Lot" value={izlenebilirlik.uretim.mamul_lot_no} highlight />
                </CardContent>
              </Card>
            )}

            {/* Food Chain Info */}
            {izlenebilirlik.gida_zinciri && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    CİZDENSİZ MÜLKİYET BİLDİRİMİ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={izlenebilirlik.gida_zinciri.hayvansal_kaynak ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {izlenebilirlik.gida_zinciri.hayvansal_kaynak ? 'Hayvansal Kaynaklı' : 'Bitkisel Kaynaklı'}
                    </Badge>
                    <Badge className={izlenebilirlik.gida_zinciri.gdo ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {izlenebilirlik.gida_zinciri.gdo ? 'GDO' : 'GDO İçermez'}
                    </Badge>
                  </div>
                  {izlenebilirlik.gida_zinciri.alerjenler.length > 0 && (
                    <div>
                      <p className="text-sm text-secondary mb-1">Alerjenler:</p>
                      <div className="flex flex-wrap gap-1">
                        {izlenebilirlik.gida_zinciri.alerjenler.map((alerjen, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {alerjen}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <InfoRow label="Müşammerki Kimlik" value={izlenebilirlik.gida_zinciri.muamekki_kimlik} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sales Records */}
          {izlenebilirlik.satislar && izlenebilirlik.satislar.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-green-600" />
                  Satış Kayıtları
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">Satış No</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Müşteri</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Tarih</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Miktar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {izlenebilirlik.satislar.map((satis, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono text-sm">{satis.satis_no}</td>
                          <td className="px-4 py-3">{satis.musteri_ad}</td>
                          <td className="px-4 py-3">{formatDate(satis.tarih)}</td>
                          <td className="px-4 py-3">{satis.miktar} {satis.birim}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* QR Code Section */}
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                    <QrCode className="h-16 w-16 text-gray-400" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    QR Kod ile Doğrulama
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Bu QR kodu tarayarak ürünün izlenebilirlik bilgilerine web üzerinden erişebilirsiniz. 
                    Tüketiciye sunulan etikette bu kod bulunmalıdır.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    <Badge className="bg-blue-100 text-blue-800">
                      Doğrulama Linki: izlenebilirlik.firma.com/verify/{lotNo}
                    </Badge>
                  </div>
                </div>
                <Button variant="outline" className="flex-shrink-0">
                  <Download className="h-4 w-4 mr-2" />
                  QR İndir
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!aramaYapildi && !isLoading && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <QrCode className="h-20 w-20 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                İzlenebilirlik Araması
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Yukarıdaki arama kutusuna lot numarasını girerek ürünün tüm izlenebilirlik 
                bilgilerine ulaşabilirsiniz. Gıda İzlenebilirlik Tebliği kapsamında tüm 
                tedarik zinciri görüntülenebilir.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper Components
function TraceabilityStep({ 
  icon: Icon, 
  label, 
  active, 
  completed 
}: { 
  icon: React.ElementType
  label: string
  active: boolean
  completed: boolean
}) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${
        completed 
          ? 'bg-green-500 border-green-500 text-white' 
          : active 
            ? 'bg-blue-500 border-blue-500 text-white' 
            : 'bg-gray-100 border-gray-300 text-gray-400'
      }`}>
        <Icon className="h-6 w-6" />
      </div>
      <span className={`text-xs mt-2 font-medium ${active ? 'text-gray-900' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  )
}

function MobileTraceStep({ label, data }: { label: string; data?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
      <div className="w-2 h-2 rounded-full bg-blue-500" />
      <div className="flex-1">
        <p className="text-xs text-secondary">{label}</p>
        <p className="text-sm font-medium">{data || '-'}</p>
      </div>
    </div>
  )
}

function InfoRow({ 
  label, 
  value, 
  icon: Icon, 
  highlight, 
  warning 
}: { 
  label: string
  value: string
  icon?: React.ElementType
  highlight?: boolean
  warning?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-sm text-secondary min-w-[120px]">{label}</span>
      <span className={`flex items-center gap-1 text-sm font-medium ${
        highlight ? 'font-mono bg-blue-50 px-2 py-0.5 rounded' : ''
      } ${warning ? 'text-red-600' : ''}`}>
        {Icon && <Icon className="h-3 w-3" />}
        {value || '-'}
      </span>
    </div>
  )
}
