"""
Suppliers API router
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import Kullanici
from app.models.tedarikci import Tedarikci

router = APIRouter()


# Response schemas
class TedarikciResponse(BaseModel):
    id: str
    ad: str
    vergi_no: str
    telefon: Optional[str]
    eposta: Optional[str]
    adres: Optional[str]
    faks: Optional[str]
    yetkili_kisi: Optional[str]
    yetkili_telefon: Optional[str]
    yetkili_eposta: Optional[str]
    banka_adi: Optional[str]
    banka_sube: Optional[str]
    hesap_no: Optional[str]
    odeme_vadesi: Optional[int]
    tedarikci_sinifi: Optional[str]
    not_text: Optional[str]
    aktif: bool

    class Config:
        from_attributes = True


class TedarikciListResponse(BaseModel):
    data: List[TedarikciResponse]
    total: int
    sayfa: int
    sayfa_boyutu: int


class TedarikciCreate(BaseModel):
    ad: str
    vergi_no: str
    telefon: Optional[str] = None
    eposta: Optional[str] = None
    adres: Optional[str] = None
    faks: Optional[str] = None
    yetkili_kisi: Optional[str] = None
    yetkili_telefon: Optional[str] = None
    yetkili_eposta: Optional[str] = None
    banka_adi: Optional[str] = None
    banka_sube: Optional[str] = None
    hesap_no: Optional[str] = None
    odeme_vadesi: Optional[int] = None
    tedarikci_sinifi: Optional[str] = None
    not_text: Optional[str] = None


class TedarikciUpdate(BaseModel):
    ad: Optional[str] = None
    vergi_no: Optional[str] = None
    telefon: Optional[str] = None
    eposta: Optional[str] = None
    adres: Optional[str] = None
    faks: Optional[str] = None
    yetkili_kisi: Optional[str] = None
    yetkili_telefon: Optional[str] = None
    yetkili_eposta: Optional[str] = None
    banka_adi: Optional[str] = None
    banka_sube: Optional[str] = None
    hesap_no: Optional[str] = None
    odeme_vadesi: Optional[int] = None
    tedarikci_sinifi: Optional[str] = None
    not_text: Optional[str] = None
    aktif: Optional[bool] = None


def tedarikci_to_response(t: Tedarikci) -> TedarikciResponse:
    return TedarikciResponse(
        id=str(t.id),
        ad=t.ad,
        vergi_no=t.vergi_no,
        telefon=t.telefon,
        eposta=t.eposta,
        adres=t.adres,
        faks=t.faks,
        yetkili_kisi=t.yetkili_kisi,
        yetkili_telefon=t.yetkili_telefon,
        yetkili_eposta=t.yetkili_eposta,
        banka_adi=t.banka_adi,
        banka_sube=t.banka_sube,
        hesap_no=t.hesap_no,
        odeme_vadesi=t.odeme_vadesi,
        tedarikci_sinifi=t.tedarikci_sinifi,
        not_text=t.not_text,
        aktif=t.aktif
    )


# Endpoints
@router.get("/", response_model=TedarikciListResponse)
async def list_tedarikciler(
    sayfa: int = Query(1, ge=1),
    sayfa_boyutu: int = Query(20, ge=1, le=100),
    arama: Optional[str] = None,
    aktif: Optional[bool] = True,
    sinif: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """List all suppliers."""
    query = db.query(Tedarikci).filter(Tedarikci.silme_tarihi.is_(None))
    
    if arama:
        query = query.filter(
            (Tedarikci.ad.ilike(f"%{arama}%")) |
            (Tedarikci.vergi_no.ilike(f"%{arama}%")) |
            (Tedarikci.telefon.ilike(f"%{arama}%"))
        )
    
    if aktif is not None:
        query = query.filter(Tedarikci.aktif == aktif)
    
    if sinif:
        query = query.filter(Tedarikci.tedarikci_sinifi == sinif)
    
    total = query.count()
    tedarikciler = query.order_by(Tedarikci.ad).offset((sayfa - 1) * sayfa_boyutu).limit(sayfa_boyutu).all()
    
    return TedarikciListResponse(
        data=[tedarikci_to_response(t) for t in tedarikciler],
        total=total,
        sayfa=sayfa,
        sayfa_boyutu=sayfa_boyutu
    )


@router.get("/{tedarikci_id}", response_model=TedarikciResponse)
async def get_tedarikci(
    tedarikci_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Get supplier by ID."""
    tedarikci = db.query(Tedarikci).filter(
        Tedarikci.id == tedarikci_id,
        Tedarikci.silme_tarihi.is_(None)
    ).first()
    
    if not tedarikci:
        raise HTTPException(status_code=404, detail="Tedarikçi bulunamadı")
    
    return tedarikci_to_response(tedarikci)


@router.post("/", response_model=TedarikciResponse)
async def create_tedarikci(
    tedarikci_data: TedarikciCreate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Create new supplier."""
    # Check for duplicate vergi no
    existing = db.query(Tedarikci).filter(
        Tedarikci.vergi_no == tedarikci_data.vergi_no,
        Tedarikci.silme_tarihi.is_(None)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Bu vergi numarası ile kayıtlı tedarikçi zaten mevcut")
    
    tedarikci = Tedarikci(
        ad=tedarikci_data.ad,
        vergi_no=tedarikci_data.vergi_no,
        telefon=tedarikci_data.telefon,
        eposta=tedarikci_data.eposta,
        adres=tedarikci_data.adres,
        faks=tedarikci_data.faks,
        yetkili_kisi=tedarikci_data.yetkili_kisi,
        yetkili_telefon=tedarikci_data.yetkili_telefon,
        yetkili_eposta=tedarikci_data.yetkili_eposta,
        banka_adi=tedarikci_data.banka_adi,
        banka_sube=tedarikci_data.banka_sube,
        hesap_no=tedarikci_data.hesap_no,
        odeme_vadesi=tedarikci_data.odeme_vadesi,
        tedarikci_sinifi=tedarikci_data.tedarikci_sinifi,
        not_text=tedarikci_data.not_text,
        olusturan_kullanici_id=current_user.id
    )
    
    db.add(tedarikci)
    db.commit()
    db.refresh(tedarikci)
    
    return tedarikci_to_response(tedarikci)


@router.put("/{tedarikci_id}", response_model=TedarikciResponse)
async def update_tedarikci(
    tedarikci_id: str,
    tedarikci_data: TedarikciUpdate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Update supplier."""
    tedarikci = db.query(Tedarikci).filter(
        Tedarikci.id == tedarikci_id,
        Tedarikci.silme_tarihi.is_(None)
    ).first()
    
    if not tedarikci:
        raise HTTPException(status_code=404, detail="Tedarikçi bulunamadı")
    
    update_data = tedarikci_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tedarikci, key, value)
    
    db.commit()
    db.refresh(tedarikci)
    
    return tedarikci_to_response(tedarikci)


@router.delete("/{tedarikci_id}")
async def delete_tedarikci(
    tedarikci_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Soft delete supplier."""
    tedarikci = db.query(Tedarikci).filter(
        Tedarikci.id == tedarikci_id,
        Tedarikci.silme_tarihi.is_(None)
    ).first()
    
    if not tedarikci:
        raise HTTPException(status_code=404, detail="Tedarikçi bulunamadı")
    
    tedarikci.silme_tarihi = datetime.utcnow().isoformat()
    tedarikci.aktif = False
    db.commit()
    
    return {"message": "Tedarikçi silindi"}
