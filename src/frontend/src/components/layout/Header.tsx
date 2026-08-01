import { useLocation } from 'react-router-dom'
import { Search, Bell } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/stok': 'Stok Yönetimi',
  '/uretim': 'Üretim Yönetimi',
  '/satis': 'Satış Yönetimi',
  '/urunler': 'Ürün Kataloğu',
  '/tedarikciler': 'Tedarikçiler',
  '/musteriler': 'Müşteriler',
}

export function Header() {
  const location = useLocation()
  
  const getPageTitle = () => {
    // Check exact match first
    if (pageTitles[location.pathname]) {
      return pageTitles[location.pathname]
    }
    
    // Check for partial matches
    for (const [path, title] of Object.entries(pageTitles)) {
      if (location.pathname.startsWith(path) && path !== '/') {
        return title
      }
    }
    
    return 'Dashboard'
  }

  return (
    <header className="sticky top-0 z-30 flex items-center h-16 px-6 bg-surface border-b border-border">
      <div className="flex-1">
        <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
          <Input
            type="search"
            placeholder="Arama..."
            className="w-64 pl-9"
          />
        </div>
        
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Button>
      </div>
    </header>
  )
}
