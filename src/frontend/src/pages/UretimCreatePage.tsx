import { Card, CardContent } from '@/components/ui/card'
import { Factory } from 'lucide-react'

export function UretimCreatePage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12 text-secondary">
            <Factory className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-medium mb-2">Yeni Üretim</p>
            <p className="text-sm">Üretim oluşturma formu yakında eklenecek</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
