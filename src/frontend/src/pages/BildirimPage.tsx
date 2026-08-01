import { Card, CardContent } from '@/components/ui/card'
import { Bell } from 'lucide-react'

export function BildirimPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12 text-secondary">
            <Bell className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-medium mb-2">Bildirimler</p>
            <p className="text-sm">Sistem bildirimleri yakında eklenecek</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
