import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Package, Plus, Search } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Urun {
  id: string
  ad: string
  kod: string
  kategori: string
  birim: string
  aktif: boolean
}

export function UrunlerPage() {
  const [arama, setArama] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['urunler-listesi', page, arama],
    queryFn: async () => {
      const params: any = { sayfa: page, sayfa_boyutu: 20 }
      if (arama) params.arama = arama
      const response = await api.get('/urunler', { params })
      return response.data
    },
  })

  const urunler: Urun[] = data?.data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Ürünler
          </h2>
          <p className="text-sm text-secondary">
            {data?.toplam || 0} ürün listelendi
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Ürün
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ürün adı veya kod ile ara..."
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
                    <th className="px-4 py-3 text-left text-sm font-medium">Kod</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Ürün Adı</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Kategori</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Birim</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {urunler.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-secondary">
                        Ürün bulunamadı
                      </td>
                    </tr>
                  ) : (
                    urunler.map((urun) => (
                      <tr key={urun.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-sm">{urun.kod}</td>
                        <td className="px-4 py-3 font-medium">{urun.ad}</td>
                        <td className="px-4 py-3">{urun.kategori || '-'}</td>
                        <td className="px-4 py-3">{urun.birim || '-'}</td>
                        <td className="px-4 py-3">
                          <Badge className={urun.aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {urun.aktif ? 'Aktif' : 'Pasif'}
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
