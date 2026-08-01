import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Warehouse, ArrowRightLeft, Plus } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12 text-secondary">
              <ArrowRightLeft className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Depo Transferleri</p>
              <p className="text-sm">Transfer listesi yakında eklenecek</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
