"""
Label and Barcode Printing API router
Etiket ve Barkod Yazdırma Sistemi
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from uuid import UUID
import uuid

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import Kullanici
from app.models.etiket import EtiketSablon, EtiketAlan
from app.models.stok import StokKarti
from app.models.urun import Urun

router = APIRouter()


# ==================== SCHEMAS ====================

class AlanDef(BaseModel):
    alan_adi: str
    goruntu_ad: str
    x_mm: float
    y_mm: float
    genislik_mm: Optional[float] = None
    yukseklik_mm: Optional[float] = None
    font_adi: Optional[str] = "Arial"
    font_boyutu: Optional[int] = 10
    font_rengi: Optional[str] = "#000000"
    deger_kaynagi: Optional[str] = None
    barcode_tipi: Optional[str] = None  # EAN13, CODE128, QR, PDF417


class SablonCreate(BaseModel):
    ad: str
    sablon_tipi: str  # LOT, URUN, BARKOD, QR
    kullanim_yeri: Optional[str] = None  # DEPO, SATIS, URETIM, TEDARIKCI
    genislik_mm: float = 100
    yukseklik_mm: float = 50
    cikti_format: str = "PDF"  # PDF, ZPL, PNG
    alanlar: List[AlanDef] = []
    varsayilan: bool = False


class SablonUpdate(BaseModel):
    ad: Optional[str] = None
    sablon_tipi: Optional[str] = None
    kullanim_yeri: Optional[str] = None
    genislik_mm: Optional[float] = None
    yukseklik_mm: Optional[float] = None
    cikti_format: Optional[str] = None
    alanlar: Optional[List[AlanDef]] = None
    varsayilan: Optional[bool] = None
    aktif: Optional[bool] = None


class AlanCreate(BaseModel):
    alan_adi: str
    goruntu_ad: str
    x_mm: float
    y_mm: float
    genislik_mm: Optional[float] = None
    yukseklik_mm: Optional[float] = None
    font_adi: Optional[str] = "Arial"
    font_boyutu: Optional[int] = 10
    font_rengi: Optional[str] = "#000000"
    deger_kaynagi: Optional[str] = None
    barcode_tipi: Optional[str] = None
    siralama: int = 0


class AlanUpdate(BaseModel):
    alan_adi: Optional[str] = None
    goruntu_ad: Optional[str] = None
    x_mm: Optional[float] = None
    y_mm: Optional[float] = None
    genislik_mm: Optional[float] = None
    yukseklik_mm: Optional[float] = None
    font_adi: Optional[str] = None
    font_boyutu: Optional[int] = None
    font_rengi: Optional[str] = None
    deger_kaynagi: Optional[str] = None
    barcode_tipi: Optional[str] = None
    siralama: Optional[int] = None
    aktif: Optional[bool] = None


class SablonResponse(BaseModel):
    id: str
    ad: str
    sablon_tipi: str
    kullanim_yeri: Optional[str]
    genislik_mm: float
    yukseklik_mm: float
    cikti_format: str
    alanlar: List[dict]
    aktif: bool
    varsayilan: bool
    olusturma_tarihi: str
    guncelleme_tarihi: Optional[str]

    class Config:
        from_attributes = True


class AlanResponse(BaseModel):
    id: str
    sablon_id: str
    alan_adi: str
    goruntu_ad: str
    x_mm: float
    y_mm: float
    genislik_mm: Optional[float]
    yukseklik_mm: Optional[float]
    font_adi: Optional[str]
    font_boyutu: Optional[int]
    font_rengi: Optional[str]
    deger_kaynagi: Optional[str]
    barcode_tipi: Optional[str]
    siralama: int
    aktif: bool
    olusturma_tarihi: str

    class Config:
        from_attributes = True


class BaskiRequest(BaseModel):
    sablon_id: str
    lot_id: Optional[str] = None
    urun_id: Optional[str] = None
    adet: int = 1


class OnizlemeResponse(BaseModel):
    sablon_id: str
    sablon_ad: str
    boyutlar: dict
    alanlar: List[dict]


# ==================== ENDPOINTS ====================

# Şablon Yönetimi

@router.get("/sablonlar", response_model=List[SablonResponse])
async def list_sablonlar(
    sablon_tipi: Optional[str] = Query(None, description="LOT, URUN, BARKOD, QR"),
    kullanim_yeri: Optional[str] = Query(None, description="DEPO, SATIS, URETIM, TEDARIKCI"),
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Etiket şablonları listesini getir."""
    query = db.query(EtiketSablon).filter(EtiketSablon.silme_tarihi.is_(None))
    
    if sablon_tipi:
        query = query.filter(EtiketSablon.sablon_tipi == sablon_tipi)
    if kullanim_yeri:
        query = query.filter(EtiketSablon.kullanim_yeri == kullanim_yeri)
    
    sablonlar = query.order_by(EtiketSablon.ad).all()
    
    return [
        SablonResponse(
            id=str(s.id),
            ad=s.ad,
            sablon_tipi=s.sablon_tipi,
            kullanim_yeri=s.kullanim_yeri,
            genislik_mm=float(s.genislik_mm),
            yukseklik_mm=float(s.yukseklik_mm),
            cikti_format=s.cikti_format,
            alanlar=s.alanlar or [],
            aktif=s.aktif,
            varsayilan=s.varsayilan,
            olusturma_tarihi=s.olusturma_tarihi,
            guncelleme_tarihi=s.guncelleme_tarihi
        )
        for s in sablonlar
    ]


@router.post("/sablonlar", response_model=SablonResponse)
async def create_sablon(
    sablon_data: SablonCreate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Yeni etiket şablonu oluştur."""
    now = datetime.utcnow().isoformat()
    
    # If this is set as default, unset others
    if sablon_data.varsayilan:
        db.query(EtiketSablon).filter(
            EtiketSablon.sablon_tipi == sablon_data.sablon_tipi,
            EtiketSablon.varsayilan == True
        ).update({"varsayilan": False})
    
    # Convert alanlar to JSONB format
    alanlar_json = [
        {
            "id": str(uuid.uuid4()),
            "alan_adi": a.alan_adi,
            "goruntu_ad": a.goruntu_ad,
            "x_mm": a.x_mm,
            "y_mm": a.y_mm,
            "genislik_mm": a.genislik_mm,
            "yukseklik_mm": a.yukseklik_mm,
            "font_adi": a.font_adi,
            "font_boyutu": a.font_boyutu,
            "font_rengi": a.font_rengi,
            "deger_kaynagi": a.deger_kaynagi,
            "barcode_tipi": a.barcode_tipi
        }
        for a in sablon_data.alanlar
    ]
    
    sablon = EtiketSablon(
        ad=sablon_data.ad,
        sablon_tipi=sablon_data.sablon_tipi,
        kullanim_yeri=sablon_data.kullanim_yeri,
        genislik_mm=sablon_data.genislik_mm,
        yukseklik_mm=sablon_data.yukseklik_mm,
        cikti_format=sablon_data.cikti_format,
        alanlar=alanlar_json,
        varsayilan=sablon_data.varsayilan,
        aktif=True,
        olusturma_tarihi=now,
        guncelleme_tarihi=now,
        olusturan_kullanici_id=current_user.id
    )
    
    db.add(sablon)
    db.commit()
    db.refresh(sablon)
    
    return SablonResponse(
        id=str(sablon.id),
        ad=sablon.ad,
        sablon_tipi=sablon.sablon_tipi,
        kullanim_yeri=sablon.kullanim_yeri,
        genislik_mm=float(sablon.genislik_mm),
        yukseklik_mm=float(sablon.yukseklik_mm),
        cikti_format=sablon.cikti_format,
        alanlar=sablon.alanlar or [],
        aktif=sablon.aktif,
        varsayilan=sablon.varsayilan,
        olusturma_tarihi=sablon.olusturma_tarihi,
        guncelleme_tarihi=sablon.guncelleme_tarihi
    )


@router.get("/sablonlar/{sablon_id}", response_model=SablonResponse)
async def get_sablon(
    sablon_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Şablon detayını getir."""
    sablon = db.query(EtiketSablon).filter(
        EtiketSablon.id == sablon_id,
        EtiketSablon.silme_tarihi.is_(None)
    ).first()
    
    if not sablon:
        raise HTTPException(status_code=404, detail="Şablon bulunamadı")
    
    return SablonResponse(
        id=str(sablon.id),
        ad=sablon.ad,
        sablon_tipi=sablon.sablon_tipi,
        kullanim_yeri=sablon.kullanim_yeri,
        genislik_mm=float(sablon.genislik_mm),
        yukseklik_mm=float(sablon.yukseklik_mm),
        cikti_format=sablon.cikti_format,
        alanlar=sablon.alanlar or [],
        aktif=sablon.aktif,
        varsayilan=sablon.varsayilan,
        olusturma_tarihi=sablon.olusturma_tarihi,
        guncelleme_tarihi=sablon.guncelleme_tarihi
    )


@router.put("/sablonlar/{sablon_id}", response_model=SablonResponse)
async def update_sablon(
    sablon_id: str,
    sablon_data: SablonUpdate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Şablon güncelle."""
    sablon = db.query(EtiketSablon).filter(
        EtiketSablon.id == sablon_id,
        EtiketSablon.silme_tarihi.is_(None)
    ).first()
    
    if not sablon:
        raise HTTPException(status_code=404, detail="Şablon bulunamadı")
    
    update_data = sablon_data.model_dump(exclude_unset=True)
    
    # Handle varsayilan
    if update_data.get("varsayilan"):
        db.query(EtiketSablon).filter(
            EtiketSablon.sablon_tipi == sablon.sablon_tipi,
            EtiketSablon.varsayilan == True,
            EtiketSablon.id != sablon_id
        ).update({"varsayilan": False})
    
    # Handle alanlar conversion
    if "alanlar" in update_data and update_data["alanlar"]:
        update_data["alanlar"] = [
            {
                "id": str(uuid.uuid4()),
                "alan_adi": a.alan_adi,
                "goruntu_ad": a.goruntu_ad,
                "x_mm": a.x_mm,
                "y_mm": a.y_mm,
                "genislik_mm": a.genislik_mm,
                "yukseklik_mm": a.yukseklik_mm,
                "font_adi": a.font_adi,
                "font_boyutu": a.font_boyutu,
                "font_rengi": a.font_rengi,
                "deger_kaynagi": a.deger_kaynagi,
                "barcode_tipi": a.barcode_tipi
            }
            for a in update_data["alanlar"]
        ]
    
    update_data["guncelleme_tarihi"] = datetime.utcnow().isoformat()
    
    for key, value in update_data.items():
        setattr(sablon, key, value)
    
    db.commit()
    db.refresh(sablon)
    
    return SablonResponse(
        id=str(sablon.id),
        ad=sablon.ad,
        sablon_tipi=sablon.sablon_tipi,
        kullanim_yeri=sablon.kullanim_yeri,
        genislik_mm=float(sablon.genislik_mm),
        yukseklik_mm=float(sablon.yukseklik_mm),
        cikti_format=sablon.cikti_format,
        alanlar=sablon.alanlar or [],
        aktif=sablon.aktif,
        varsayilan=sablon.varsayilan,
        olusturma_tarihi=sablon.olusturma_tarihi,
        guncelleme_tarihi=sablon.guncelleme_tarihi
    )


@router.delete("/sablonlar/{sablon_id}")
async def delete_sablon(
    sablon_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Şablon sil (soft delete)."""
    sablon = db.query(EtiketSablon).filter(
        EtiketSablon.id == sablon_id,
        EtiketSablon.silme_tarihi.is_(None)
    ).first()
    
    if not sablon:
        raise HTTPException(status_code=404, detail="Şablon bulunamadı")
    
    sablon.silme_tarihi = datetime.utcnow().isoformat()
    db.commit()
    
    return {"message": "Şablon silindi"}


@router.get("/sablonlar/{sablon_id}/alanlar", response_model=List[dict])
async def get_sablon_alanlar(
    sablon_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Şablon alanlarını listele."""
    sablon = db.query(EtiketSablon).filter(
        EtiketSablon.id == sablon_id,
        EtiketSablon.silme_tarihi.is_(None)
    ).first()
    
    if not sablon:
        raise HTTPException(status_code=404, detail="Şablon bulunamadı")
    
    return sablon.alanlar or []


@router.post("/sablonlar/{sablon_id}/alanlar", response_model=dict)
async def add_sablon_alan(
    sablon_id: str,
    alan_data: AlanCreate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Şablona alan ekle."""
    sablon = db.query(EtiketSablon).filter(
        EtiketSablon.id == sablon_id,
        EtiketSablon.silme_tarihi.is_(None)
    ).first()
    
    if not sablon:
        raise HTTPException(status_code=404, detail="Şablon bulunamadı")
    
    alanlar = sablon.alanlar or []
    
    yeni_alan = {
        "id": str(uuid.uuid4()),
        "alan_adi": alan_data.alan_adi,
        "goruntu_ad": alan_data.goruntu_ad,
        "x_mm": alan_data.x_mm,
        "y_mm": alan_data.y_mm,
        "genislik_mm": alan_data.genislik_mm,
        "yukseklik_mm": alan_data.yukseklik_mm,
        "font_adi": alan_data.font_adi,
        "font_boyutu": alan_data.font_boyutu,
        "font_rengi": alan_data.font_rengi,
        "deger_kaynagi": alan_data.deger_kaynagi,
        "barcode_tipi": alan_data.barcode_tipi,
        "siralama": alan_data.siralama
    }
    
    alanlar.append(yeni_alan)
    sablon.alanlar = alanlar
    sablon.guncelleme_tarihi = datetime.utcnow().isoformat()
    
    db.commit()
    
    return yeni_alan


@router.put("/sablonlar/{sablon_id}/alanlar/{alan_id}", response_model=dict)
async def update_sablon_alan(
    sablon_id: str,
    alan_id: str,
    alan_data: AlanUpdate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Alan güncelle."""
    sablon = db.query(EtiketSablon).filter(
        EtiketSablon.id == sablon_id,
        EtiketSablon.silme_tarihi.is_(None)
    ).first()
    
    if not sablon:
        raise HTTPException(status_code=404, detail="Şablon bulunamadı")
    
    alanlar = sablon.alanlar or []
    alan_index = None
    
    for i, a in enumerate(alanlar):
        if a.get("id") == alan_id:
            alan_index = i
            break
    
    if alan_index is None:
        raise HTTPException(status_code=404, detail="Alan bulunamadı")
    
    update_data = alan_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        alanlar[alan_index][key] = value
    
    sablon.alanlar = alanlar
    sablon.guncelleme_tarihi = datetime.utcnow().isoformat()
    
    db.commit()
    
    return alanlar[alan_index]


@router.delete("/sablonlar/{sablon_id}/alanlar/{alan_id}")
async def delete_sablon_alan(
    sablon_id: str,
    alan_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Alan sil."""
    sablon = db.query(EtiketSablon).filter(
        EtiketSablon.id == sablon_id,
        EtiketSablon.silme_tarihi.is_(None)
    ).first()
    
    if not sablon:
        raise HTTPException(status_code=404, detail="Şablon bulunamadı")
    
    alanlar = sablon.alanlar or []
    alanlar = [a for a in alanlar if a.get("id") != alan_id]
    
    sablon.alanlar = alanlar
    sablon.guncelleme_tarihi = datetime.utcnow().isoformat()
    
    db.commit()
    
    return {"message": "Alan silindi"}


# Önizleme ve Baskı

@router.get("/onizleme/{sablon_id}", response_model=OnizlemeResponse)
async def onizleme_sablon(
    sablon_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Şablon önizleme (simüle)."""
    sablon = db.query(EtiketSablon).filter(
        EtiketSablon.id == sablon_id,
        EtiketSablon.silme_tarihi.is_(None)
    ).first()
    
    if not sablon:
        raise HTTPException(status_code=404, detail="Şablon bulunamadı")
    
    # Generate sample values for preview
    sample_values = {
        "lot_no": "LOT-20240101-001",
        "urun_ad": "Örnek Ürün Adı",
        "urun_kodu": "SKU-001",
        "barkod": "1234567890123",
        "tarih": datetime.utcnow().strftime("%d.%m.%Y"),
        "skt": (datetime.utcnow().replace(year=datetime.utcnow().year + 1)).strftime("%d.%m.%Y"),
        "miktar": "10",
        "birim": "kg",
        "konum": "A-01-01",
        "tedarikci": "Örnek Tedarikçi",
        "uretim_tarihi": datetime.utcnow().strftime("%d.%m.%Y")
    }
    
    preview_alanlar = []
    for alan in (sablon.alanlar or []):
        alan_copy = alan.copy()
        kaynak = alan_copy.get("deger_kaynagi", "")
        alan_copy["ornek_deger"] = sample_values.get(kaynak, f"[{alan_copy.get('goruntu_ad', 'Alan')}]")
        preview_alanlar.append(alan_copy)
    
    return OnizlemeResponse(
        sablon_id=str(sablon.id),
        sablon_ad=sablon.ad,
        boyutlar={
            "genislik_mm": float(sablon.genislik_mm),
            "yukseklik_mm": float(sablon.yukseklik_mm)
        },
        alanlar=preview_alanlar
    )


@router.post("/bas")
async def baskik_bas(
    request: BaskiRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Etiket baskı (PDF/ZPL) - simülasyon."""
    sablon = db.query(EtiketSablon).filter(
        EtiketSablon.id == request.sablon_id,
        EtiketSablon.silme_tarihi.is_(None)
    ).first()
    
    if not sablon:
        raise HTTPException(status_code=404, detail="Şablon bulunamadı")
    
    # Get lot or product data if provided
    lot_data = None
    urun_data = None
    
    if request.lot_id:
        stok = db.query(StokKarti).filter(StokKarti.id == request.lot_id).first()
        if stok:
            urun = db.query(Urun).filter(Urun.id == stok.urun_id).first()
            lot_data = {
                "lot_no": stok.lot_no,
                "urun_ad": urun.ad if urun else None,
                "miktar": float(stok.miktar),
                "birim": stok.birim,
                "konum": stok.konum,
                "son_kullanma": stok.son_kullanma,
                "uretim_tarihi": stok.uretim_tarihi
            }
    
    if request.urun_id:
        urun = db.query(Urun).filter(Urun.id == request.urun_id).first()
        if urun:
            urun_data = {
                "ad": urun.ad,
                "stok_kodu": urun.stok_kodu,
                "barkod": urun.barkod,
                "kategori": urun.kategori
            }
    
    # Generate mock file URL
    file_id = str(uuid.uuid4())
    file_extension = sablon.cikti_format.lower()
    
    return {
        "message": "Baskı talebi alındı",
        "baski_id": file_id,
        "url": f"/api/v1/etiket/baski/{file_id}.{file_extension}",
        "sablon": {
            "id": str(sablon.id),
            "ad": sablon.ad,
            "format": sablon.cikti_format
        },
        "adet": request.adet,
        "lot_data": lot_data,
        "urun_data": urun_data,
        "not": "Bu bir simülasyondur. Gerçek PDF/ZPL üretimi için entegrasyon gereklidir."
    }


@router.get("/lot/{stok_id}")
async def lot_etiketi(
    stok_id: str,
    sablon_id: Optional[str] = Query(None, description="Şablon ID (opsiyonel, varsayılan kullanılır)"),
    adet: int = Query(1, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Lot etiketi oluştur (hızlı yazdırma)."""
    # Get stock card
    stok = db.query(StokKarti).filter(
        StokKarti.id == stok_id,
        StokKarti.silme_tarihi.is_(None)
    ).first()
    
    if not stok:
        raise HTTPException(status_code=404, detail="Stok kartı bulunamadı")
    
    # Get template
    sablon = None
    if sablon_id:
        sablon = db.query(EtiketSablon).filter(
            EtiketSablon.id == sablon_id,
            EtiketSablon.silme_tarihi.is_(None)
        ).first()
    else:
        # Use default LOT template
        sablon = db.query(EtiketSablon).filter(
            EtiketSablon.sablon_tipi == "LOT",
            EtiketSablon.varsayilan == True,
            EtiketSablon.silme_tarihi.is_(None)
        ).first()
        
        if not sablon:
            # Try any LOT template
            sablon = db.query(EtiketSablon).filter(
                EtiketSablon.sablon_tipi == "LOT",
                EtiketSablon.silme_tarihi.is_(None)
            ).first()
    
    if not sablon:
        raise HTTPException(status_code=404, detail="Uygun şablon bulunamadı")
    
    # Get product info
    urun = db.query(Urun).filter(Urun.id == stok.urun_id).first()
    
    return {
        "message": "Lot etiketi hazır",
        "sablon": {
            "id": str(sablon.id),
            "ad": sablon.ad,
            "format": sablon.cikti_format
        },
        "adet": adet,
        "lot": {
            "id": str(stok.id),
            "lot_no": stok.lot_no,
            "urun_ad": urun.ad if urun else None,
            "miktar": float(stok.miktar),
            "birim": stok.birim,
            "konum": stok.konum,
            "son_kullanma": stok.son_kullanma,
            "uretim_tarihi": stok.uretim_tarihi,
            "giris_tarihi": stok.giris_tarihi
        },
        "url": f"/api/v1/etiket/baski/lot_{stok.lot_no}.{sablon.cikti_format.lower()}",
        "not": "Bu bir simülasyondur."
    }


@router.get("/urun/{urun_id}")
async def urun_etiketi(
    urun_id: str,
    sablon_id: Optional[str] = Query(None),
    adet: int = Query(1, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Ürün etiketi oluştur (lot verisi olmadan)."""
    # Get product
    urun = db.query(Urun).filter(
        Urun.id == urun_id,
        Urun.silme_tarihi.is_(None)
    ).first()
    
    if not urun:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    # Get template
    sablon = None
    if sablon_id:
        sablon = db.query(EtiketSablon).filter(
            EtiketSablon.id == sablon_id,
            EtiketSablon.silme_tarihi.is_(None)
        ).first()
    else:
        # Use default URUN template
        sablon = db.query(EtiketSablon).filter(
            EtiketSablon.sablon_tipi == "URUN",
            EtiketSablon.varsayilan == True,
            EtiketSablon.silme_tarihi.is_(None)
        ).first()
        
        if not sablon:
            sablon = db.query(EtiketSablon).filter(
                EtiketSablon.sablon_tipi == "URUN",
                EtiketSablon.silme_tarihi.is_(None)
            ).first()
    
    if not sablon:
        raise HTTPException(status_code=404, detail="Uygun şablon bulunamadı")
    
    return {
        "message": "Ürün etiketi hazır",
        "sablon": {
            "id": str(sablon.id),
            "ad": sablon.ad,
            "format": sablon.cikti_format
        },
        "adet": adet,
        "urun": {
            "id": str(urun.id),
            "ad": urun.ad,
            "stok_kodu": urun.stok_kodu,
            "barkod": urun.barkod,
            "kategori": urun.kategori
        },
        "url": f"/api/v1/etiket/baski/urun_{urun.stok_kodu or urun.id}.{sablon.cikti_format.lower()}",
        "not": "Bu bir simülasyondur."
    }
