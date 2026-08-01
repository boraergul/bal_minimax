"""
Customers API router
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import Kullanici
from app.models.musteri import Musteri

router = APIRouter()


class MusteriResponse(BaseModel):
    id: str
    ad: str
    telefon: Optional[str]
    eposta: Optional[str]
    adres: Optional[str]
    vergi_no: Optional[str]
    musteri_tipi: Optional[str]
    musteri_sinifi: Optional[str]
    teslimat_adresi: Optional[str]
    il: Optional[str]
    ilce: Optional[str]
    odeme_vadesi: Optional[int]
    aktif: bool

    class Config:
        from_attributes = True


class MusteriListResponse(BaseModel):
    data: List[MusteriResponse]
    total: int
    sayfa: int
    sayfa_boyutu: int


class MusteriCreate(BaseModel):
    ad: str
    telefon: Optional[str] = None
    eposta: Optional[str] = None
    adres: Optional[str] = None
    vergi_no: Optional[str] = None
    musteri_tipi: Optional[str] = None
    musteri_sinifi: Optional[str] = None
    teslimat_adresi: Optional[str] = None
    il: Optional[str] = None
    ilce: Optional[str] = None
    odeme_vadesi: Optional[int] = None


class MusteriUpdate(BaseModel):
    ad: Optional[str] = None
    telefon: Optional[str] = None
    eposta: Optional[str] = None
    adres: Optional[str] = None
    vergi_no: Optional[str] = None
    musteri_tipi: Optional[str] = None
    musteri_sinifi: Optional[str] = None
    teslimat_adresi: Optional[str] = None
    il: Optional[str] = None
    ilce: Optional[str] = None
    odeme_vadesi: Optional[int] = None
    aktif: Optional[bool] = None


def musteri_to_response(m: Musteri) -> MusteriResponse:
    return MusteriResponse(
        id=str(m.id),
        ad=m.ad,
        telefon=m.telefon,
        eposta=m.eposta,
        adres=m.adres,
        vergi_no=m.vergi_no,
        musteri_tipi=m.musteri_tipi,
        musteri_sinifi=m.musteri_sinifi,
        teslimat_adresi=m.teslimat_adresi,
        il=m.il,
        ilce=m.ilce,
        odeme_vadesi=m.odeme_vadesi,
        aktif=m.aktif
    )


@router.get("/", response_model=MusteriListResponse)
async def list_musteriler(
    sayfa: int = Query(1, ge=1),
    sayfa_boyutu: int = Query(20, ge=1, le=100),
    arama: Optional[str] = None,
    aktif: Optional[bool] = True,
    tip: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """List all customers."""
    query = db.query(Musteri).filter(Musteri.silme_tarihi.is_(None))
    
    if arama:
        query = query.filter(
            (Musteri.ad.ilike(f"%{arama}%")) |
            (Musteri.telefon.ilike(f"%{arama}%")) |
            (Musteri.eposta.ilike(f"%{arama}%"))
        )
    
    if aktif is not None:
        query = query.filter(Musteri.aktif == aktif)
    
    if tip:
        query = query.filter(Musteri.musteri_tipi == tip)
    
    total = query.count()
    musteriler = query.order_by(Musteri.ad).offset((sayfa - 1) * sayfa_boyutu).limit(sayfa_boyutu).all()
    
    return MusteriListResponse(
        data=[musteri_to_response(m) for m in musteriler],
        total=total,
        sayfa=sayfa,
        sayfa_boyutu=sayfa_boyutu
    )


@router.get("/{musteri_id}", response_model=MusteriResponse)
async def get_musteri(
    musteri_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Get customer by ID."""
    musteri = db.query(Musteri).filter(
        Musteri.id == musteri_id,
        Musteri.silme_tarihi.is_(None)
    ).first()
    
    if not musteri:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    return musteri_to_response(musteri)


@router.post("/", response_model=MusteriResponse)
async def create_musteri(
    musteri_data: MusteriCreate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Create new customer."""
    musteri = Musteri(
        ad=musteri_data.ad,
        telefon=musteri_data.telefon,
        eposta=musteri_data.eposta,
        adres=musteri_data.adres,
        vergi_no=musteri_data.vergi_no,
        musteri_tipi=musteri_data.musteri_tipi,
        musteri_sinifi=musteri_data.musteri_sinifi,
        teslimat_adresi=musteri_data.teslimat_adresi,
        il=musteri_data.il,
        ilce=musteri_data.ilce,
        odeme_vadesi=musteri_data.odeme_vadesi,
        olusturan_kullanici_id=current_user.id
    )
    
    db.add(musteri)
    db.commit()
    db.refresh(musteri)
    
    return musteri_to_response(musteri)


@router.put("/{musteri_id}", response_model=MusteriResponse)
async def update_musteri(
    musteri_id: str,
    musteri_data: MusteriUpdate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Update customer."""
    musteri = db.query(Musteri).filter(
        Musteri.id == musteri_id,
        Musteri.silme_tarihi.is_(None)
    ).first()
    
    if not musteri:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    update_data = musteri_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(musteri, key, value)
    
    db.commit()
    db.refresh(musteri)
    
    return musteri_to_response(musteri)


@router.delete("/{musteri_id}")
async def delete_musteri(
    musteri_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Soft delete customer."""
    musteri = db.query(Musteri).filter(
        Musteri.id == musteri_id,
        Musteri.silme_tarihi.is_(None)
    ).first()
    
    if not musteri:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    musteri.silme_tarihi = datetime.utcnow().isoformat()
    musteri.aktif = False
    db.commit()
    
    return {"message": "Müşteri silindi"}
