import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth.store'
import { Layout } from './components/layout/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { StokListPage } from './pages/StokListPage'
import { UretimListPage } from './pages/UretimListPage'
import { UretimCreatePage } from './pages/UretimCreatePage'
import { SatisListPage } from './pages/SatisListPage'
import { SatisCreatePage } from './pages/SatisCreatePage'
import { UrunlerPage } from './pages/UrunlerPage'
import { TedarikcilerPage } from './pages/TedarikcilerPage'
import { MusterilerPage } from './pages/MusterilerPage'
import { IzlenebilirlikPage } from './pages/IzlenebilirlikPage'
// New Pages
import { KaliteKontrolPage } from './pages/KaliteKontrolPage'
import { DepoYonetimPage } from './pages/DepoYonetimPage'
import { BildirimPage } from './pages/BildirimPage'
import { BirimDonusumPage } from './pages/BirimDonusumPage'
import { SktYonetimPage } from './pages/SktYonetimPage'
import { UretimMaliyetPage } from './pages/UretimMaliyetPage'
import { TopluIslemPage } from './pages/TopluIslemPage'
import { IadePage } from './pages/IadePage'
import { OzelliklerPage } from './pages/OzelliklerPage'
import { StokDuzeltmePage } from './pages/StokDuzeltmePage'
import { EtiketPage } from './pages/EtiketPage'
import { RaporlarGenisletilmisPage } from './pages/RaporlarGenisletilmisPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="stok" element={<StokListPage />} />
        <Route path="stok/duzeltme" element={<StokDuzeltmePage />} />
        <Route path="izlenebilirlik" element={<IzlenebilirlikPage />} />
        <Route path="uretim" element={<UretimListPage />} />
        <Route path="uretim/yeni" element={<UretimCreatePage />} />
        <Route path="uretim/maliyet" element={<UretimMaliyetPage />} />
        <Route path="satis" element={<SatisListPage />} />
        <Route path="satis/yeni" element={<SatisCreatePage />} />
        <Route path="satis/iade" element={<IadePage />} />
        <Route path="urunler" element={<UrunlerPage />} />
        <Route path="urunler/ozellikler" element={<OzelliklerPage />} />
        <Route path="tedarikciler" element={<TedarikcilerPage />} />
        <Route path="musteriler" element={<MusterilerPage />} />
        {/* New Routes */}
        <Route path="kalite-kontrol" element={<KaliteKontrolPage />} />
        <Route path="depo" element={<DepoYonetimPage />} />
        <Route path="bildirim" element={<BildirimPage />} />
        <Route path="birim" element={<BirimDonusumPage />} />
        <Route path="skt" element={<SktYonetimPage />} />
        <Route path="toplu-islem" element={<TopluIslemPage />} />
        <Route path="etiket" element={<EtiketPage />} />
        <Route path="raporlar" element={<RaporlarGenisletilmisPage />} />
      </Route>
    </Routes>
  )
}

export default App
