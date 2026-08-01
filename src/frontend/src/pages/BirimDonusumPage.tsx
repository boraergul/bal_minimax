import { Card, CardContent } from '@/components/ui/card'
import { Scale } from 'lucide-react'

export function BirimDonusumPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12 text-secondary">
            <Scale className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-medium mb-2">Birim Dönüşümleri</p>
            <p className="text-sm">Birim dönüşüm tablosu yakında eklenecek</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
