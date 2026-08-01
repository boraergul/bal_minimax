import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Package, 
  Factory, 
  ShoppingCart, 
  Box, 
  Truck, 
  Users, 
  LogOut,
  Menu,
  X,
  GitBranch,
  ClipboardCheck,
  Warehouse,
  Bell,
  Scale,
  AlertTriangle,
  DollarSign,
  Layers,
  RotateCcw,
  Settings2,
  Tag,
  BarChart3
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/stok', label: 'Stok', icon: Package },
  { path: '/stok/duzeltme', label: 'Stok Düzeltme', icon: AlertTriangle },
  { path: '/uretim', label: 'Üretim', icon: Factory },
  { path: '/uretim/maliyet', label: 'Üretim Maliyet', icon: DollarSign },
  { path: '/satis', label: 'Satış', icon: ShoppingCart },
  { path: '/satis/iade', label: 'İadeler', icon: RotateCcw },
  { path: '/urunler', label: 'Ürünler', icon: Box },
  { path: '/urunler/ozellikler', label: 'Özellikler', icon: Settings2 },
  { path: '/izlenebilirlik', label: 'İzlenebilirlik', icon: GitBranch },
  { path: '/kalite-kontrol', label: 'Kalite Kontrol', icon: ClipboardCheck },
  { path: '/depo', label: 'Depo Yönetimi', icon: Warehouse },
  { path: '/birim', label: 'Birim Çeviri', icon: Scale },
  { path: '/skt', label: 'SKT Yönetimi', icon: AlertTriangle },
  { path: '/toplu-islem', label: 'Toplu İşlem', icon: Layers },
  { path: '/tedarikciler', label: 'Tedarikçiler', icon: Truck },
  { path: '/musteriler', label: 'Müşteriler', icon: Users },
  { path: '/bildirim', label: 'Bildirimler', icon: Bell },
  { path: '/etiket', label: 'Etiketler', icon: Tag },
  { path: '/raporlar', label: 'Raporlar', icon: BarChart3 },
]

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 bg-surface border-r border-border transition-transform duration-300 lg:translate-x-0 overflow-y-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-border">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <span className="font-semibold text-lg">BAL ERP</span>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={onToggle}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Menu */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path))
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    if (window.innerWidth < 1024) onToggle()
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {user?.ad?.[0]}{user?.soyad?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.ad} {user?.soyad}
                </p>
                <p className="text-xs text-secondary truncate">
                  {user?.rol}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Çıkış Yap
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile toggle button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 left-4 z-30 shadow-lg lg:hidden"
        onClick={onToggle}
      >
        <Menu className="h-5 w-5" />
      </Button>
    </>
  )
}
