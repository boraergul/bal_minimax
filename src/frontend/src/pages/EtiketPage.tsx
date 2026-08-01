import { Card, CardContent } from '@/components/ui/card'
import { Printer } from 'lucide-react'

export function EtiketPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12 text-secondary">
            <Printer className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-medium mb-2">Etiket Yönetimi</p>
            <p className="text-sm">Barkod ve etiket şablonları yakında eklenecek</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
