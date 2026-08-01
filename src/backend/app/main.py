"""
BAL ERP - FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings
from app.api import (
    auth, urunler, tedarikciler, musteriler, stok, uretim, satis, raporlar,
    kalite_kontrol, skt, stok_duzeltme, birim, bildirim, depo,
    toplu_islem, maliyet, iade, ozellikler, etiket, raporlar_genisletilmis,
)

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Kurutulmuş Meyve ve Bal Yönetim Sistemi",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["Kimlik Doğrulama"])
app.include_router(urunler.router, prefix=f"{settings.API_V1_PREFIX}/urunler", tags=["Ürünler"])
app.include_router(tedarikciler.router, prefix=f"{settings.API_V1_PREFIX}/tedarikciler", tags=["Tedarikçiler"])
app.include_router(musteriler.router, prefix=f"{settings.API_V1_PREFIX}/musteriler", tags=["Müşteriler"])
app.include_router(stok.router, prefix=f"{settings.API_V1_PREFIX}/stok", tags=["Stok"])
app.include_router(uretim.router, prefix=f"{settings.API_V1_PREFIX}/uretim", tags=["Üretim"])
app.include_router(satis.router, prefix=f"{settings.API_V1_PREFIX}/satis", tags=["Satış"])
app.include_router(raporlar.router, prefix=f"{settings.API_V1_PREFIX}/raporlar", tags=["Raporlar"])
app.include_router(raporlar_genisletilmis.router, prefix=f"{settings.API_V1_PREFIX}/raporlar", tags=["Raporlar (Genişletilmiş)"])
app.include_router(kalite_kontrol.router, prefix=f"{settings.API_V1_PREFIX}/kalite-kontrol", tags=["Kalite Kontrol"])
app.include_router(skt.router, prefix=f"{settings.API_V1_PREFIX}/stok/skt", tags=["SKT Yönetimi"])
app.include_router(stok_duzeltme.router, prefix=f"{settings.API_V1_PREFIX}/stok-duzeltme", tags=["Stok Düzeltme"])
app.include_router(birim.router, prefix=f"{settings.API_V1_PREFIX}/birim", tags=["Birim Dönüşüm"])
app.include_router(bildirim.router, prefix=f"{settings.API_V1_PREFIX}/bildirim", tags=["Bildirim Sistemi"])
app.include_router(depo.router, prefix=f"{settings.API_V1_PREFIX}/depo", tags=["Depo Yönetimi"])
app.include_router(toplu_islem.router, prefix=f"{settings.API_V1_PREFIX}/toplu-islem", tags=["Toplu İşlemler"])
app.include_router(maliyet.router, prefix=f"{settings.API_V1_PREFIX}/uretim/maliyet", tags=["Üretim Maliyet"])
app.include_router(iade.router, prefix=f"{settings.API_V1_PREFIX}/satis", tags=["Satış İade"])
app.include_router(ozellikler.router, prefix=f"{settings.API_V1_PREFIX}/ozellikler", tags=["Ürün Özellikleri"])
app.include_router(etiket.router, prefix=f"{settings.API_V1_PREFIX}/etiket", tags=["Barkod/Etiket"])


@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
