import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShoppingCart, Plus, Search } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Satis {
  id: string
  satis_no: string
  musteri_ad?: string
  tarih: string
  toplam_tutar: number
  durum: string
}

export function SatisListPage() {
  const [arama, setArama] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['satis-listesi', page, arama],
    queryFn: async () => {
      const params: any = { sayfa: page, sayfa_boyutu: 20 }
      if (arama) params.arama = arama
      const response = await api.get('/satis', { params })
      return response.data
    },
  })

  const satislar: Satis[] = data?.data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Satışlar
          </h2>
          <p className="text-sm text-secondary">
            {data?.toplam || 0} satış kaydı
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Satış
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Satış no veya müşteri ile ara..."
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
                    <th className="px-4 py-3 text-left text-sm font-medium">Satış No</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Müşteri</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tarih</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tutar</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {satislar.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-secondary">
                        Satış kaydı bulunamadı
                      </td>
                    </tr>
                  ) : (
                    satislar.map((satis) => (
                      <tr key={satis.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-sm">{satis.satis_no}</td>
                        <td className="px-4 py-3">{satis.musteri_ad || '-'}</td>
                        <td className="px-4 py-3">{satis.tarih ? new Date(satis.tarih).toLocaleDateString('tr-TR') : '-'}</td>
                        <td className="px-4 py-3">₺{satis.toplam_tutar?.toFixed(2) || '0.00'}</td>
                        <td className="px-4 py-3">
                          <Badge className={
                            satis.durum === 'TAMAMLANDI' ? 'bg-green-100 text-green-800' :
                            satis.durum === 'IPTAL' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {satis.durum}
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
