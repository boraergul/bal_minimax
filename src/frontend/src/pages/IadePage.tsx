import { Card, CardContent } from '@/components/ui/card'
import { RotateCcw } from 'lucide-react'

export function IadePage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12 text-secondary">
            <RotateCcw className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-medium mb-2">İade Yönetimi</p>
            <p className="text-sm">Satış iadeleri yakında eklenecek</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
