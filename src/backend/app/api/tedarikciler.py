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
from app.models.tedarikci import Tedarikci, TedarikciUrun, TedarikciDegerlendirme
from app.models.urun import Urun

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


# Supplier Products Schemas
class TedarikciUrunResponse(BaseModel):
    id: str
    tedarikci_id: str
    urun_id: str
    urun_ad: Optional[str] = None
    urun_kodu: Optional[str] = None
    kategori: Optional[str] = None
    varsayilan_fiyat: Optional[float] = None
    minimum_siparis_miktari: Optional[float] = None
    teslimat_suresi: Optional[int] = None
    aktif: bool = True
    olusturma_tarihi: Optional[str] = None


class TedarikciUrunListResponse(BaseModel):
    data: List[TedarikciUrunResponse]
    total: int


class TedarikciUrunCreateRequest(BaseModel):
    urun_id: str
    varsayilan_fiyat: Optional[float] = None
    minimum_siparis_miktari: Optional[float] = None
    teslimat_suresi: Optional[int] = None


class TedarikciUrunUpdateRequest(BaseModel):
    varsayilan_fiyat: Optional[float] = None
    minimum_siparis_miktari: Optional[float] = None
    teslimat_suresi: Optional[int] = None
    aktif: Optional[bool] = None


# Supplier Evaluation Schemas
class TedarikciDegerlendirmeResponse(BaseModel):
    id: str
    tedarikci_id: str
    degerlendirme_tarihi: Optional[str]
    fiyat_puani: Optional[float]
    hizmet_puani: Optional[float]
    genel_puan: Optional[float]
    sertifikalar: Optional[list]
    resmi_dosyalar: Optional[list]


class TedarikciDegerlendirmeCreateRequest(BaseModel):
    degerlendirme_tarihi: str
    kalite_puani: float
    fiyat_puani: Optional[float] = None
    hizmet_puani: Optional[float] = None
    genel_puan: Optional[float] = None
    odeme_plani: Optional[str] = None
    sertifikalar: Optional[list] = None
    resmi_dosyalar: Optional[list] = None


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


def tedarikci_urun_to_response(tu: TedarikciUrun) -> TedarikciUrunResponse:
    return TedarikciUrunResponse(
        id=str(tu.id),
        tedarikci_id=str(tu.tedarikci_id),
        urun_id=str(tu.urun_id),
        urun_ad=tu.urun.ad if tu.urun else None,
        urun_kodu=tu.urun.kodu if tu.urun else None,
        kategori=tu.urun.kategori if tu.urun else None,
        varsayilan_fiyat=float(tu.varsayilan_fiyat) if tu.varsayilan_fiyat else None,
        minimum_siparis_miktari=float(tu.minimum_siparis_miktari) if tu.minimum_siparis_miktari else None,
        teslimat_suresi=tu.teslimat_suresi,
        aktif=tu.aktif,
        olusturma_tarihi=None
    )


def degerlendirme_to_response(d: TedarikciDegerlendirme) -> TedarikciDegerlendirmeResponse:
    return TedarikciDegerlendirmeResponse(
        id=str(d.id),
        tedarikci_id=str(d.tedarikci_id),
        degerlendirme_tarihi=d.degerlendirme_tarihi,
        fiyat_puani=float(d.fiyat_puani) if d.fiyat_puani else None,
        hizmet_puani=float(d.hizmet_puani) if d.hizmet_puani else None,
        genel_puan=float(d.genel_puan) if d.genel_puan else None,
        sertifikalar=d.sertifikalar or [],
        resmi_dosyalar=d.resmi_dosyalar or []
    )


# Supplier Products Endpoints
@router.get("/{tedarikci_id}/urunler", response_model=TedarikciUrunListResponse)
async def list_tedarikci_urunler(
    tedarikci_id: str,
    sayfa: int = Query(1, ge=1),
    sayfa_boyutu: int = Query(50, ge=1, le=100),
    aktif: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """List all products offered by a supplier."""
    # Verify supplier exists
    tedarikci = db.query(Tedarikci).filter(
        Tedarikci.id == tedarikci_id,
        Tedarikci.silme_tarihi.is_(None)
    ).first()
    
    if not tedarikci:
        raise HTTPException(status_code=404, detail="Tedarikçi bulunamadı")
    
    query = db.query(TedarikciUrun).filter(TedarikciUrun.tedarikci_id == tedarikci_id)
    
    if aktif is not None:
        query = query.filter(TedarikciUrun.aktif == aktif)
    
    total = query.count()
    urunler = query.order_by(TedarikciUrun.aktif.desc()).offset((sayfa - 1) * sayfa_boyutu).limit(sayfa_boyutu).all()
    
    return TedarikciUrunListResponse(
        data=[tedarikci_urun_to_response(u) for u in urunler],
        total=total
    )


@router.post("/{tedarikci_id}/urunler", response_model=TedarikciUrunResponse)
async def create_tedarikci_urun(
    tedarikci_id: str,
    urun_data: TedarikciUrunCreateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Add a product to supplier."""
    # Verify supplier exists
    tedarikci = db.query(Tedarikci).filter(
        Tedarikci.id == tedarikci_id,
        Tedarikci.silme_tarihi.is_(None)
    ).first()
    
    if not tedarikci:
        raise HTTPException(status_code=404, detail="Tedarikçi bulunamadı")
    
    # Verify product exists
    urun = db.query(Urun).filter(Urun.id == urun_data.urun_id).first()
    if not urun:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    # Check for duplicate
    existing = db.query(TedarikciUrun).filter(
        TedarikciUrun.tedarikci_id == tedarikci_id,
        TedarikciUrun.urun_id == urun_data.urun_id,
        TedarikciUrun.silme_tarihi.is_(None)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Bu ürün tedarikçiye zaten eklenmiş")
    
    tedarikci_urun = TedarikciUrun(
        tedarikci_id=tedarikci_id,
        urun_id=urun_data.urun_id,
        varsayilan_fiyat=urun_data.varsayilan_fiyat,
        minimum_siparis_miktari=urun_data.minimum_siparis_miktari,
        teslimat_suresi=urun_data.teslimat_suresi,
        aktif=True
    )
    
    db.add(tedarikci_urun)
    db.commit()
    db.refresh(tedarikci_urun)
    
    return tedarikci_urun_to_response(tedarikci_urun)


@router.get("/{tedarikci_id}/urunler/{urun_id}", response_model=TedarikciUrunResponse)
async def get_tedarikci_urun(
    tedarikci_id: str,
    urun_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Get specific supplier product."""
    tedarikci_urun = db.query(TedarikciUrun).filter(
        TedarikciUrun.tedarikci_id == tedarikci_id,
        TedarikciUrun.urun_id == urun_id,
        TedarikciUrun.silme_tarihi.is_(None)
    ).first()
    
    if not tedarikci_urun:
        raise HTTPException(status_code=404, detail="Tedarikçi ürünü bulunamadı")
    
    return tedarikci_urun_to_response(tedarikci_urun)


@router.put("/{tedarikci_id}/urunler/{urun_id}", response_model=TedarikciUrunResponse)
async def update_tedarikci_urun(
    tedarikci_id: str,
    urun_id: str,
    urun_data: TedarikciUrunUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Update supplier product."""
    tedarikci_urun = db.query(TedarikciUrun).filter(
        TedarikciUrun.tedarikci_id == tedarikci_id,
        TedarikciUrun.urun_id == urun_id,
        TedarikciUrun.silme_tarihi.is_(None)
    ).first()
    
    if not tedarikci_urun:
        raise HTTPException(status_code=404, detail="Tedarikçi ürünü bulunamadı")
    
    update_data = urun_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tedarikci_urun, key, value)
    
    db.commit()
    db.refresh(tedarikci_urun)
    
    return tedarikci_urun_to_response(tedarikci_urun)


@router.delete("/{tedarikci_id}/urunler/{urun_id}")
async def delete_tedarikci_urun(
    tedarikci_id: str,
    urun_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Remove product from supplier (soft delete)."""
    tedarikci_urun = db.query(TedarikciUrun).filter(
        TedarikciUrun.tedarikci_id == tedarikci_id,
        TedarikciUrun.urun_id == urun_id,
        TedarikciUrun.silme_tarihi.is_(None)
    ).first()
    
    if not tedarikci_urun:
        raise HTTPException(status_code=404, detail="Tedarikçi ürünü bulunamadı")
    
    tedarikci_urun.silme_tarihi = datetime.utcnow().isoformat()
    tedarikci_urun.aktif = False
    db.commit()
    
    return {"message": "Tedarikçi ürünü silindi"}


# Supplier Evaluation Endpoints
@router.get("/{tedarikci_id}/degerlendirme", response_model=Optional[TedarikciDegerlendirmeResponse])
async def get_tedarikci_degerlendirme(
    tedarikci_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Get latest supplier evaluation."""
    # Verify supplier exists
    tedarikci = db.query(Tedarikci).filter(
        Tedarikci.id == tedarikci_id,
        Tedarikci.silme_tarihi.is_(None)
    ).first()
    
    if not tedarikci:
        raise HTTPException(status_code=404, detail="Tedarikçi bulunamadı")
    
    degerlendirme = db.query(TedarikciDegerlendirme).filter(
        TedarikciDegerlendirme.tedarikci_id == tedarikci_id
    ).order_by(TedarikciDegerlendirme.degerlendirme_tarihi.desc()).first()
    
    if not degerlendirme:
        return None
    
    return degerlendirme_to_response(degerlendirme)


@router.post("/{tedarikci_id}/degerlendirme", response_model=TedarikciDegerlendirmeResponse)
async def create_tedarikci_degerlendirme(
    tedarikci_id: str,
    degerlendirme_data: TedarikciDegerlendirmeCreateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Create supplier evaluation."""
    # Verify supplier exists
    tedarikci = db.query(Tedarikci).filter(
        Tedarikci.id == tedarikci_id,
        Tedarikci.silme_tarihi.is_(None)
    ).first()
    
    if not tedarikci:
        raise HTTPException(status_code=404, detail="Tedarikçi bulunamadı")
    
    degerlendirme = TedarikciDegerlendirme(
        tedarikci_id=tedarikci_id,
        degerlendirme_tarihi=degerlendirme_data.degerlendirme_tarihi,
        kalite_puani=degerlendirme_data.kalite_puani,
        fiyat_puani=degerlendirme_data.fiyat_puani,
        hizmet_puani=degerlendirme_data.hizmet_puani,
        genel_puan=degerlendirme_data.genel_puan,
        odeme_plani=degerlendirme_data.odeme_plani,
        sertifikalar=degerlendirme_data.sertifikalar or [],
        resmi_dosyalar=degerlendirme_data.resmi_dosyalar or [],
        olusturan_kullanici_id=current_user.id
    )
    
    db.add(degerlendirme)
    db.commit()
    db.refresh(degerlendirme)
    
    return degerlendirme_to_response(degerlendirme)
