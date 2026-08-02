import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Users, Plus, Search } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Musteri {
  id: string
  ad: string
  soyad?: string
  firma_adi?: string
  telefon?: string
  eposta?: string
  aktif: boolean
}

export function MusterilerPage() {
  const [arama, setArama] = useState('')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['musteriler-listesi', page, arama],
    queryFn: async () => {
      const params: any = { sayfa: page, sayfa_boyutu: 20 }
      if (arama) params.arama = arama
      const response = await api.get('/musteriler', { params })
      return response.data
    },
  })

  const musteriler: Musteri[] = data?.data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Müşteriler
          </h2>
          <p className="text-sm text-secondary">
            {data?.toplam || 0} müşteri kayıtlı
          </p>
        </div>
        <Button onClick={() => navigate('/musteriler/yeni')}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Müşteri
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Müşteri adı veya firma ile ara..."
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
                    <th className="px-4 py-3 text-left text-sm font-medium">Ad Soyad</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Firma</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Telefon</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">E-posta</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {musteriler.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-secondary">
                        Müşteri bulunamadı
                      </td>
                    </tr>
                  ) : (
                    musteriler.map((musteri) => (
                      <tr key={musteri.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">
                          {musteri.ad} {musteri.soyad || ''}
                        </td>
                        <td className="px-4 py-3">{musteri.firma_adi || '-'}</td>
                        <td className="px-4 py-3">{musteri.telefon || '-'}</td>
                        <td className="px-4 py-3">{musteri.eposta || '-'}</td>
                        <td className="px-4 py-3">
                          <Badge className={musteri.aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {musteri.aktif ? 'Aktif' : 'Pasif'}
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
