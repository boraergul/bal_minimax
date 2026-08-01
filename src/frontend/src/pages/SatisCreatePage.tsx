import { Card, CardContent } from '@/components/ui/card'
import { ShoppingCart } from 'lucide-react'

export function SatisCreatePage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12 text-secondary">
            <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-medium mb-2">Yeni Satış</p>
            <p className="text-sm">Satış oluşturma formu yakında eklenecek</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
