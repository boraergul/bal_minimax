import { Card, CardContent } from '@/components/ui/card'
import { Search } from 'lucide-react'

export function IzlenebilirlikPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12 text-secondary">
            <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-medium mb-2">İzlenebilirlik</p>
            <p className="text-sm">Lot no ile ürün takibi yakında eklenecek</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
