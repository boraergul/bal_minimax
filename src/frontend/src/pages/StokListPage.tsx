import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Package, Plus, Search, Filter } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'

interface StokItem {
  id: string
  lot_no: string
  urun_ad?: string
  miktar: number
  birim: string
  birim_fiyat: number
  durum: string
  konum?: string
  giris_tarihi: string
}

export function StokListPage() {
  const [arama, setArama] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['stok-listesi', page, arama],
    queryFn: async () => {
      const params: any = { sayfa: page, sayfa_boyutu: 20 }
      if (arama) params.arama = arama
      const response = await api.get('/stok', { params })
      return response.data
    },
  })

  const stoklar: StokItem[] = data?.data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stok Listesi
          </h2>
          <p className="text-sm text-secondary">
            {data?.toplam || 0} kayıt bulundu
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Stok Girişi
        </Button>
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
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Lot No</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Ürün</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Miktar</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Birim Fiyat</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Konum</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {stoklar.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-secondary">
                        Stok kaydı bulunamadı
                      </td>
                    </tr>
                  ) : (
                    stoklar.map((stok) => (
                      <tr key={stok.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-sm">{stok.lot_no}</td>
                        <td className="px-4 py-3">{stok.urun_ad || '-'}</td>
                        <td className="px-4 py-3">
                          {stok.miktar} {stok.birim}
                        </td>
                        <td className="px-4 py-3">₺{stok.birim_fiyat?.toFixed(2) || '0.00'}</td>
                        <td className="px-4 py-3">{stok.konum || '-'}</td>
                        <td className="px-4 py-3">
                          <Badge className={
                            stok.durum === 'AKTIF' ? 'bg-green-100 text-green-800' :
                            stok.durum === 'BITTI' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {stok.durum}
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
    </div>
  )
}
