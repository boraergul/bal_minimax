import { Card, CardContent } from '@/components/ui/card'
import { FileSpreadsheet } from 'lucide-react'

export function TopluIslemPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12 text-secondary">
            <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-medium mb-2">Toplu İşlemler</p>
            <p className="text-sm">Excel ile toplu veri girişi yakında eklenecek</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
