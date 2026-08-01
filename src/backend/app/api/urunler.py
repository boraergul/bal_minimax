"""
Products API router
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from uuid import UUID

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import Kullanici
from app.models.urun import Urun, UrunOzellik

router = APIRouter()


# Enums
class UrunKategori(str):
    MEYVE = "MEYVE"
    BAL = "BAL"
    KARSIM = "KARSIM"
    KURUYEMIS = "KURUYEMIS"
    SEBZE = "SEBZE"
    YAG = "YAG"
    TURSUKU = "TURSUKU"
    DIGER = "DIGER"


# Response schemas
class UrunResponse(BaseModel):
    id: str
    ad: str
    kategori: str
    birim_toptan: str
    birim_perakende: str
    stok_kodu: Optional[str]
    barkod: Optional[str]
    aciklama: Optional[str]
    gorsel_url: Optional[str]
    agirlik: Optional[float]
    minimum_stok_seviyesi: Optional[float]
    maksimum_stok_seviyesi: Optional[float]
    raf_omru_gun: Optional[int]
    hammadde_id: Optional[str]
    hammadde_ad: Optional[str]
    aktif: bool

    class Config:
        from_attributes = True


class UrunListResponse(BaseModel):
    data: List[UrunResponse]
    total: int
    sayfa: int
    sayfa_boyutu: int


class UrunCreate(BaseModel):
    ad: str
    kategori: str
    birim_toptan: str
    birim_perakende: str
    stok_kodu: Optional[str] = None
    barkod: Optional[str] = None
    aciklama: Optional[str] = None
    gorsel_url: Optional[str] = None
    agirlik: Optional[float] = None
    minimum_stok_seviyesi: Optional[float] = None
    maksimum_stok_seviyesi: Optional[float] = None
    raf_omru_gun: Optional[int] = None
    hammadde_id: Optional[str] = None


class UrunUpdate(BaseModel):
    ad: Optional[str] = None
    kategori: Optional[str] = None
    birim_toptan: Optional[str] = None
    birim_perakende: Optional[str] = None
    stok_kodu: Optional[str] = None
    barkod: Optional[str] = None
    aciklama: Optional[str] = None
    gorsel_url: Optional[str] = None
    agirlik: Optional[float] = None
    minimum_stok_seviyesi: Optional[float] = None
    maksimum_stok_seviyesi: Optional[float] = None
    raf_omru_gun: Optional[int] = None
    hammadde_id: Optional[str] = None
    aktif: Optional[bool] = None


# Endpoints
@router.get("/", response_model=UrunListResponse)
async def list_urunler(
    sayfa: int = Query(1, ge=1),
    sayfa_boyutu: int = Query(20, ge=1, le=100),
    arama: Optional[str] = None,
    kategori: Optional[str] = None,
    aktif: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """List all products with pagination."""
    query = db.query(Urun)
    
    if arama:
        query = query.filter(
            (Urun.ad.ilike(f"%{arama}%")) |
            (Urun.stok_kodu.ilike(f"%{arama}%")) |
            (Urun.barkod.ilike(f"%{arama}%"))
        )
    
    if kategori:
        query = query.filter(Urun.kategori == kategori)
    
    if aktif is not None:
        query = query.filter(Urun.aktif == aktif)
    
    total = query.count()
    urunler = query.order_by(Urun.ad).offset((sayfa - 1) * sayfa_boyutu).limit(sayfa_boyutu).all()
    
    # Get hammadde names
    urun_map = {str(u.id): u for u in urunler}
    hammadde_ids = [str(u.hammadde_id) for u in urunler if u.hammadde_id]
    hammaddeler = db.query(Urun).filter(Urun.id.in_(hammadde_ids)).all() if hammadde_ids else []
    hammadde_map = {str(h.id): h.ad for h in hammaddeler}
    
    return UrunListResponse(
        data=[UrunResponse(
            id=str(u.id),
            ad=u.ad,
            kategori=u.kategori,
            birim_toptan=u.birim_toptan,
            birim_perakende=u.birim_perakende,
            stok_kodu=u.stok_kodu,
            barkod=u.barkod,
            aciklama=u.aciklama,
            gorsel_url=u.gorsel_url,
            agirlik=float(u.agirlik) if u.agirlik else None,
            minimum_stok_seviyesi=float(u.minimum_stok_seviyesi) if u.minimum_stok_seviyesi else None,
            maksimum_stok_seviyesi=float(u.maksimum_stok_seviyesi) if u.maksimum_stok_seviyesi else None,
            raf_omru_gun=u.raf_omru_gun,
            hammadde_id=str(u.hammadde_id) if u.hammadde_id else None,
            hammadde_ad=hammadde_map.get(str(u.hammadde_id)),
            aktif=u.aktif
        ) for u in urunler],
        total=total,
        sayfa=sayfa,
        sayfa_boyutu=sayfa_boyutu
    )


@router.get("/{urun_id}", response_model=UrunResponse)
async def get_urun(
    urun_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Get product by ID."""
    urun = db.query(Urun).filter(Urun.id == urun_id).first()
    if not urun:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    # Get hammadde name
    hammadde_ad = None
    if urun.hammadde_id:
        hammadde = db.query(Urun).filter(Urun.id == urun.hammadde_id).first()
        hammadde_ad = hammadde.ad if hammadde else None
    
    return UrunResponse(
        id=str(urun.id),
        ad=urun.ad,
        kategori=urun.kategori,
        birim_toptan=urun.birim_toptan,
        birim_perakende=urun.birim_perakende,
        stok_kodu=urun.stok_kodu,
        barkod=urun.barkod,
        aciklama=urun.aciklama,
        gorsel_url=urun.gorsel_url,
        agirlik=float(urun.agirlik) if urun.agirlik else None,
        minimum_stok_seviyesi=float(urun.minimum_stok_seviyesi) if urun.minimum_stok_seviyesi else None,
        maksimum_stok_seviyesi=float(urun.maksimum_stok_seviyesi) if urun.maksimum_stok_seviyesi else None,
        raf_omru_gun=urun.raf_omru_gun,
        hammadde_id=str(urun.hammadde_id) if urun.hammadde_id else None,
        hammadde_ad=hammadde_ad,
        aktif=urun.aktif
    )


@router.post("/", response_model=UrunResponse)
async def create_urun(
    urun_data: UrunCreate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Create new product."""
    urun = Urun(
        ad=urun_data.ad,
        kategori=urun_data.kategori,
        birim_toptan=urun_data.birim_toptan,
        birim_perakende=urun_data.birim_perakende,
        stok_kodu=urun_data.stok_kodu,
        barkod=urun_data.barkod,
        aciklama=urun_data.aciklama,
        gorsel_url=urun_data.gorsel_url,
        agirlik=urun_data.agirlik,
        minimum_stok_seviyesi=urun_data.minimum_stok_seviyesi,
        maksimum_stok_seviyesi=urun_data.maksimum_stok_seviyesi,
        raf_omru_gun=urun_data.raf_omru_gun,
        hammadde_id=UUID(urun_data.hammadde_id) if urun_data.hammadde_id else None,
        olusturan_kullanici_id=current_user.id
    )
    
    db.add(urun)
    db.commit()
    db.refresh(urun)
    
    # Get hammadde name
    hammadde_ad = None
    if urun.hammadde_id:
        hammadde = db.query(Urun).filter(Urun.id == urun.hammadde_id).first()
        hammadde_ad = hammadde.ad if hammadde else None
    
    return UrunResponse(
        id=str(urun.id),
        ad=urun.ad,
        kategori=urun.kategori,
        birim_toptan=urun.birim_toptan,
        birim_perakende=urun.birim_perakende,
        stok_kodu=urun.stok_kodu,
        barkod=urun.barkod,
        aciklama=urun.aciklama,
        gorsel_url=urun.gorsel_url,
        agirlik=float(urun.agirlik) if urun.agirlik else None,
        minimum_stok_seviyesi=float(urun.minimum_stok_seviyesi) if urun.minimum_stok_seviyesi else None,
        maksimum_stok_seviyesi=float(urun.maksimum_stok_seviyesi) if urun.maksimum_stok_seviyesi else None,
        raf_omru_gun=urun.raf_omru_gun,
        hammadde_id=str(urun.hammadde_id) if urun.hammadde_id else None,
        hammadde_ad=hammadde_ad,
        aktif=urun.aktif
    )


@router.put("/{urun_id}", response_model=UrunResponse)
async def update_urun(
    urun_id: str,
    urun_data: UrunUpdate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Update product."""
    urun = db.query(Urun).filter(Urun.id == urun_id).first()
    if not urun:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    update_data = urun_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == 'hammadde_id' and value:
            value = UUID(value)
        setattr(urun, key, value)
    
    db.commit()
    db.refresh(urun)
    
    # Get hammadde name
    hammadde_ad = None
    if urun.hammadde_id:
        hammadde = db.query(Urun).filter(Urun.id == urun.hammadde_id).first()
        hammadde_ad = hammadde.ad if hammadde else None
    
    return UrunResponse(
        id=str(urun.id),
        ad=urun.ad,
        kategori=urun.kategori,
        birim_toptan=urun.birim_toptan,
        birim_perakende=urun.birim_perakende,
        stok_kodu=urun.stok_kodu,
        barkod=urun.barkod,
        aciklama=urun.aciklama,
        gorsel_url=urun.gorsel_url,
        agirlik=float(urun.agirlik) if urun.agirlik else None,
        minimum_stok_seviyesi=float(urun.minimum_stok_seviyesi) if urun.minimum_stok_seviyesi else None,
        maksimum_stok_seviyesi=float(urun.maksimum_stok_seviyesi) if urun.maksimum_stok_seviyesi else None,
        raf_omru_gun=urun.raf_omru_gun,
        hammadde_id=str(urun.hammadde_id) if urun.hammadde_id else None,
        hammadde_ad=hammadde_ad,
        aktif=urun.aktif
    )


@router.get("/hammaddeler/liste")
async def list_hammaddeler(
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """List all raw materials for dropdown (non-MAMUL products)."""
    hammaddeler = db.query(Urun).filter(
        Urun.kategori != 'MAMUL',
        Urun.aktif == True
    ).order_by(Urun.ad).all()
    
    return [
        {"id": str(h.id), "ad": h.ad, "kategori": h.kategori, "stok_kodu": h.stok_kodu}
        for h in hammaddeler
    ]


@router.delete("/{urun_id}")
async def delete_urun(
    urun_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Soft delete product."""
    urun = db.query(Urun).filter(Urun.id == urun_id).first()
    if not urun:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    from datetime import datetime
    urun.silme_tarihi = datetime.utcnow().isoformat()
    urun.aktif = False
    db.commit()
    
    return {"message": "Ürün silindi"}
