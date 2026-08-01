import { Card, CardContent } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

export function RaporlarGenisletilmisPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12 text-secondary">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-medium mb-2">Genişletilmiş Raporlar</p>
            <p className="text-sm">Rapor ve analizler yakında eklenecek</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
