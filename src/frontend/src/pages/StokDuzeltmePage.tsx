import { Card, CardContent } from '@/components/ui/card'
import { Edit3 } from 'lucide-react'

export function StokDuzeltmePage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12 text-secondary">
            <Edit3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-medium mb-2">Stok Düzeltme</p>
            <p className="text-sm">Stok düzeltme talepleri yakında eklenecek</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
