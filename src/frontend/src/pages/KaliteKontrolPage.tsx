import { Card, CardContent } from '@/components/ui/card'
import { ClipboardCheck } from 'lucide-react'

export function KaliteKontrolPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12 text-secondary">
            <ClipboardCheck className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-medium mb-2">Kalite Kontrol</p>
            <p className="text-sm">Kalite kontrol sayfası yakında eklenecek</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
