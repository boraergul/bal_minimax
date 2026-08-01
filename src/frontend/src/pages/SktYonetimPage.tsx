import { Card, CardContent } from '@/components/ui/card'
import { CalendarClock } from 'lucide-react'

export function SktYonetimPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12 text-secondary">
            <CalendarClock className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-medium mb-2">SKT Yönetimi</p>
            <p className="text-sm">Son kullanma tarihi takibi yakında eklenecek</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
