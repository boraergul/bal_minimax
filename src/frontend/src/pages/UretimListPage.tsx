import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Factory, Plus, Search } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Uretim {
  id: string
  uretim_no: string
  tarih: string
  durum: string
  planlanan_miktar?: number
  gerceklesen_miktar?: number
  toplam_maliyet?: number
}

export function UretimListPage() {
  const [arama, setArama] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['uretim-listesi', page, arama],
    queryFn: async () => {
      const params: any = { sayfa: page, sayfa_boyutu: 20 }
      if (arama) params.arama = arama
      const response = await api.get('/uretim', { params })
      return response.data
    },
  })

  const uretimler: Uretim[] = data?.data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Üretim Emirleri
          </h2>
          <p className="text-sm text-secondary">
            {data?.toplam || 0} üretim emri
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Üretim
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Üretim no ile ara..."
              value={arama}
              onChange={(e) => setArama(e.target.value)}
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
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Üretim No</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tarih</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Miktar</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Maliyet</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {uretimler.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-secondary">
                        Üretim emri bulunamadı
                      </td>
                    </tr>
                  ) : (
                    uretimler.map((uretim) => (
                      <tr key={uretim.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-sm">{uretim.uretim_no}</td>
                        <td className="px-4 py-3">{uretim.tarih ? new Date(uretim.tarih).toLocaleDateString('tr-TR') : '-'}</td>
                        <td className="px-4 py-3">
                          {uretim.gerceklesen_miktar || 0} / {uretim.planlanan_miktar || 0}
                        </td>
                        <td className="px-4 py-3">₺{uretim.toplam_maliyet?.toFixed(2) || '0.00'}</td>
                        <td className="px-4 py-3">
                          <Badge className={
                            uretim.durum === 'TAMAMLANDI' ? 'bg-green-100 text-green-800' :
                            uretim.durum === 'ONAYLANDI' ? 'bg-blue-100 text-blue-800' :
                            uretim.durum === 'DEVAM_EDIYOR' ? 'bg-purple-100 text-purple-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {uretim.durum}
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
    </div>
  )
}
