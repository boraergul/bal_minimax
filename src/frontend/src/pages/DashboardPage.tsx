import { useDashboard } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, ShoppingCart, Factory, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export function DashboardPage() {
  const { data: dashboard, isLoading } = useDashboard()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const stats = [
    {
      title: 'Toplam Stok Değeri',
      value: formatCurrency(dashboard?.stok.toplam_deger || 0),
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: '+12%',
      trend: 'up',
    },
    {
      title: 'Bugünkü Satışlar',
      value: dashboard?.satis.bugunku || 0,
      suffix: 'adet',
      icon: ShoppingCart,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: '+8%',
      trend: 'up',
    },
    {
      title: 'Bekleyen Üretimler',
      value: dashboard?.uretim.bekleyen || 0,
      suffix: 'adet',
      icon: Factory,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      change: '-3%',
      trend: 'down',
    },
    {
      title: 'Düşük Stok Uyarıları',
      value: dashboard?.uyarilar.dusuk_stok || 0,
      suffix: 'adet',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      change: '+5',
      trend: 'up',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-secondary">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  {stat.suffix && (
                    <span className="text-sm text-secondary">{stat.suffix}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {stat.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-xs ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change} geçen haftadan
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Son Hareketler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { time: '14:30', action: 'Stok Girişi', desc: 'Kurutulmuş Elma - 50 kg', user: 'Ahmet Yılmaz' },
                { time: '13:45', action: 'Satış', desc: 'SAT-2024-007 - 12 adet', user: 'Fatma Demir' },
                { time: '11:20', action: 'Üretim', desc: 'URET-2024-003 Tamamlandı', user: 'Mehmet Kaya' },
                { time: '10:15', action: 'Stok Çıkışı', desc: 'Kurutulmuş Üzüm - 25 kg', user: 'Ahmet Yılmaz' },
                { time: '09:00', action: 'Kalite Kontrol', desc: 'LOT-2024-045 Onaylandı', user: 'Ayşe Özkan' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-secondary">{item.time}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className="text-sm text-secondary truncate">{item.desc}</p>
                  </div>
                  <span className="text-xs text-secondary">{item.user}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Kritik Uyarılar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { type: 'warning', title: 'Düşük Stok', desc: 'Kurutulmuş Kayısı minimum seviyenin altında', time: '2 saat önce' },
                { type: 'danger', title: 'Son Kullanma Uyarısı', desc: 'LOT-2024-012 son kullanma: 3 gün', time: '5 saat önce' },
                { type: 'info', title: 'Kalite Kontrol', desc: 'LOT-2024-018 kalite kontrol bekliyor', time: '1 gün önce' },
              ].map((alert, idx) => (
                <div key={idx} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    alert.type === 'danger' ? 'bg-red-500' :
                    alert.type === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-sm text-secondary">{alert.desc}</p>
                  </div>
                  <span className="text-xs text-secondary whitespace-nowrap">{alert.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Hızlı İşlemler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <button className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-left">
              <Package className="h-6 w-6 text-primary mb-2" />
              <p className="font-medium">Stok Girişi</p>
              <p className="text-sm text-secondary">Yeni hammadde ekle</p>
            </button>
            <button className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-left">
              <Factory className="h-6 w-6 text-primary mb-2" />
              <p className="font-medium">Üretim Başlat</p>
              <p className="text-sm text-secondary">Yeni üretim emri</p>
            </button>
            <button className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-left">
              <ShoppingCart className="h-6 w-6 text-primary mb-2" />
              <p className="font-medium">Satış Yap</p>
              <p className="text-sm text-secondary">Yeni satış kaydı</p>
            </button>
            <button className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-left">
              <AlertTriangle className="h-6 w-6 text-primary mb-2" />
              <p className="font-medium">Rapor Oluştur</p>
              <p className="text-sm text-secondary">Günlük raporlar</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
