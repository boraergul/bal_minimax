"""
Stock API router - with FIFO logic
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from pydantic import BaseModel
from decimal import Decimal

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import Kullanici
from app.models.stok import StokKarti, StokHareket
from app.models.urun import Urun
from app.models.tedarikci import Tedarikci

router = APIRouter()


class StokResponse(BaseModel):
    id: str
    urun_id: str
    urun_ad: Optional[str]
    lot_no: str
    stok_tipi: str
    birim: str
    miktar: float
    birim_fiyat: float
    giris_tarihi: str
    uretim_tarihi: Optional[str]
    son_kullanma: Optional[str]
    konum: Optional[str]
    tedarikci_id: Optional[str]
    tedarikci_ad: Optional[str]
    durum: str
    kalite_notu: Optional[float]

    class Config:
        from_attributes = True


class StokListResponse(BaseModel):
    data: List[StokResponse]
    total: int
    sayfa: int
    sayfa_boyutu: int


class StokGirisRequest(BaseModel):
    urun_id: str
    tedarikci_id: Optional[str] = None
    miktar: float
    birim: str = "kg"
    birim_fiyat: float
    uretim_tarihi: Optional[str] = None
    son_kullanma: Optional[str] = None
    konum: Optional[str] = None
    giris_referans_no: Optional[str] = None
    kalite_notu: Optional[float] = None
    ozellikler: Optional[List[dict]] = None


class StokCikisRequest(BaseModel):
    urun_id: str
    miktar: float
    birim: str = "kg"
    referans_tipi: Optional[str] = None
    referans_id: Optional[str] = None
    musteri_id: Optional[str] = None
    fifo_zorla: bool = False  # Force FIFO override


class StokHareketResponse(BaseModel):
    id: str
    stok_id: str
    lot_no: str
    hareket_tipi: str
    miktar: float
    onceki_miktar: float
    sonraki_miktar: float
    birim_fiyat: Optional[float]
    tutar: Optional[float]
    referans_tipi: Optional[str]
    aciklama: Optional[str]
    olusturma_tarihi: str

    class Config:
        from_attributes = True


def generate_lot_no(db: Session, stok_tipi: str) -> str:
    """Generate unique lot number: LOT-YYYYMMDD-XXX"""
    today = datetime.utcnow().strftime("%Y%m%d")
    prefix = "LOT" if stok_tipi == "HAMMADDE" else "MAM"
    
    # Get count for today
    count_query = db.query(func.count(StokKarti.id)).filter(
        StokKarti.lot_no.like(f"{prefix}-{today}-%")
    )
    count = count_query.scalar() or 0
    
    return f"{prefix}-{today}-{str(count + 1).zfill(3)}"


def get_fifo_lot(db: Session, urun_id: str, miktar: float) -> Optional[StokKarti]:
    """Get FIFO lot for given product - oldest first by giris_tarihi."""
    lot = db.query(StokKarti).filter(
        StokKarti.urun_id == urun_id,
        StokKarti.stok_tipi == "HAMMADDE",
        StokKarti.durum == "AKTIF",
        StokKarti.miktar > 0,
        StokKarti.silme_tarihi.is_(None)
    ).order_by(StokKarti.giris_tarihi.asc()).first()
    
    return lot


@router.get("/", response_model=StokListResponse)
async def list_stok(
    sayfa: int = Query(1, ge=1),
    sayfa_boyutu: int = Query(20, ge=1, le=100),
    urun_id: Optional[str] = None,
    stok_tipi: Optional[str] = None,
    durum: Optional[str] = "AKTIF",
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """List stock cards with filters."""
    query = db.query(StokKarti).filter(StokKarti.silme_tarihi.is_(None))
    
    if urun_id:
        query = query.filter(StokKarti.urun_id == urun_id)
    if stok_tipi:
        query = query.filter(StokKarti.stok_tipi == stok_tipi)
    if durum:
        query = query.filter(StokKarti.durum == durum)
    
    total = query.count()
    stoklar = query.order_by(StokKarti.giris_tarihi.desc()).offset((sayfa - 1) * sayfa_boyutu).limit(sayfa_boyutu).all()
    
    result = []
    for s in stoklar:
        tedarikci_ad = None
        if s.tedarikci_id:
            ted = db.query(Tedarikci).filter(Tedarikci.id == s.tedarikci_id).first()
            tedarikci_ad = ted.ad if ted else None
        
        urun = db.query(Urun).filter(Urun.id == s.urun_id).first()
        
        result.append(StokResponse(
            id=str(s.id),
            urun_id=str(s.urun_id),
            urun_ad=urun.ad if urun else None,
            lot_no=s.lot_no,
            stok_tipi=s.stok_tipi,
            birim=s.birim,
            miktar=float(s.miktar),
            birim_fiyat=float(s.birim_fiyat),
            giris_tarihi=s.giris_tarihi,
            uretim_tarihi=s.uretim_tarihi,
            son_kullanma=s.son_kullanma,
            konum=s.konum,
            tedarikci_id=str(s.tedarikci_id) if s.tedarikci_id else None,
            tedarikci_ad=tedarikci_ad,
            durum=s.durum,
            kalite_notu=float(s.kalite_notu) if s.kalite_notu else None
        ))
    
    return StokListResponse(
        data=result,
        total=total,
        sayfa=sayfa,
        sayfa_boyutu=sayfa_boyutu
    )


@router.get("/anlik")
async def get_anlik_stok(
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Get current stock summary by product."""
    results = db.query(
        Urun.id,
        Urun.ad,
        Urun.kategori,
        func.coalesce(func.sum(StokKarti.miktar), 0).label("toplam_miktar")
    ).outerjoin(
        StokKarti,
        and_(
            StokKarti.urun_id == Urun.id,
            StokKarti.durum == "AKTIF",
            StokKarti.silme_tarihi.is_(None)
        )
    ).filter(
        Urun.aktif == True,
        Urun.silme_tarihi.is_(None)
    ).group_by(
        Urun.id, Urun.ad, Urun.kategori
    ).all()
    
    return {
        "data": [
            {
                "urun_id": str(r.id),
                "ad": r.ad,
                "kategori": r.kategori,
                "toplam_miktar": float(r.toplam_miktar)
            }
            for r in results
        ]
    }


@router.post("/giris", response_model=StokResponse)
async def stok_giris(
    request: StokGirisRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Create stock entry from supplier."""
    # Verify product exists
    urun = db.query(Urun).filter(Urun.id == request.urun_id).first()
    if not urun:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    # Generate lot number
    lot_no = generate_lot_no(db, "HAMMADDE")
    giris_tarihi = datetime.utcnow().isoformat()
    
    # Create stock card
    stok = StokKarti(
        urun_id=request.urun_id,
        lot_no=lot_no,
        tedarikci_id=request.tedarikci_id,
        stok_tipi="HAMMADDE",
        birim=request.birim,
        miktar=request.miktar,
        birim_fiyat=request.birim_fiyat,
        uretim_tarihi=request.uretim_tarihi,
        son_kullanma=request.son_kullanma,
        konum=request.konum,
        giris_tarihi=giris_tarihi,
        giris_referans_no=request.giris_referans_no,
        kalite_notu=request.kalite_notu,
        kalite_kontrol_edildi=request.kalite_notu is not None,
        kalite_kontrol_tarihi=giris_tarihi if request.kalite_notu else None,
        durum="AKTIF",
        olusturan_kullanici_id=current_user.id
    )
    
    db.add(stok)
    db.flush()
    
    # Create stock movement
    hareket = StokHareket(
        stok_id=stok.id,
        hareket_tipi="GIRIS",
        miktar=request.miktar,
        onceki_miktar=0,
        sonraki_miktar=request.miktar,
        birim_fiyat=request.birim_fiyat,
        tutar=request.miktar * request.birim_fiyat,
        referans_tipi="TEDARIK",
        tedarikci_id=request.tedarikci_id,
        lot_no=lot_no,
        olusturan_kullanici_id=current_user.id
    )
    db.add(hareket)
    db.commit()
    db.refresh(stok)
    
    # Get tedarikci name
    tedarikci_ad = None
    if request.tedarikci_id:
        ted = db.query(Tedarikci).filter(Tedarikci.id == request.tedarikci_id).first()
        tedarikci_ad = ted.ad if ted else None
    
    return StokResponse(
        id=str(stok.id),
        urun_id=str(stok.urun_id),
        urun_ad=urun.ad,
        lot_no=stok.lot_no,
        stok_tipi=stok.stok_tipi,
        birim=stok.birim,
        miktar=float(stok.miktar),
        birim_fiyat=float(stok.birim_fiyat),
        giris_tarihi=stok.giris_tarihi,
        uretim_tarihi=stok.uretim_tarihi,
        son_kullanma=stok.son_kullanma,
        konum=stok.konum,
        tedarikci_id=str(stok.tedarikci_id) if stok.tedarikci_id else None,
        tedarikci_ad=tedarikci_ad,
        durum=stok.durum,
        kalite_notu=float(stok.kalite_notu) if stok.kalite_notu else None
    )


@router.post("/cikis", response_model=dict)
async def stok_cikis(
    request: StokCikisRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Stock output with FIFO logic."""
    remaining = request.miktar
    lots_used = []
    
    # FIFO: Get lots ordered by entry date
    lots = db.query(StokKarti).filter(
        StokKarti.urun_id == request.urun_id,
        StokKarti.stok_tipi == "HAMMADDE",
        StokKarti.durum == "AKTIF",
        StokKarti.miktar > 0,
        StokKarti.silme_tarihi.is_(None)
    ).order_by(StokKarti.giris_tarihi.asc()).all()
    
    if not lots:
        raise HTTPException(status_code=400, detail="Stok yetersiz")
    
    for lot in lots:
        if remaining <= 0:
            break
        
        take = min(float(lot.miktar), remaining)
        
        # Create movement
        hareket = StokHareket(
            stok_id=lot.id,
            hareket_tipi="SATIS_CIKIS",
            miktar=-take,
            onceki_miktar=float(lot.miktar),
            sonraki_miktar=float(lot.miktar) - take,
            birim_fiyat=float(lot.birim_fiyat),
            tutar=take * float(lot.birim_fiyat),
            referans_tipi=request.referans_tipi,
            referans_id=request.referans_id,
            musteri_id=request.musteri_id,
            lot_no=lot.lot_no,
            fifo_ihlal_edildi=False,
            olusturan_kullanici_id=current_user.id
        )
        db.add(hareket)
        
        # Update lot quantity
        lot.miktar = float(lot.miktar) - take
        if lot.miktar <= 0:
            lot.durum = "BITTI"
        
        lots_used.append({
            "lot_no": lot.lot_no,
            "miktar": take
        })
        
        remaining -= take
    
    if remaining > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Yetersiz stok! Eksik: {remaining} {request.birim}"
        )
    
    db.commit()
    
    return {
        "message": "Stok çıkışı yapıldı",
        "kullanilan_lotlar": lots_used
    }


@router.get("/{stok_id}", response_model=StokResponse)
async def get_stok(
    stok_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Get stock card by ID."""
    stok = db.query(StokKarti).filter(
        StokKarti.id == stok_id,
        StokKarti.silme_tarihi.is_(None)
    ).first()
    
    if not stok:
        raise HTTPException(status_code=404, detail="Stok kartı bulunamadı")
    
    urun = db.query(Urun).filter(Urun.id == stok.urun_id).first()
    tedarikci_ad = None
    if stok.tedarikci_id:
        ted = db.query(Tedarikci).filter(Tedarikci.id == stok.tedarikci_id).first()
        tedarikci_ad = ted.ad if ted else None
    
    return StokResponse(
        id=str(stok.id),
        urun_id=str(stok.urun_id),
        urun_ad=urun.ad if urun else None,
        lot_no=stok.lot_no,
        stok_tipi=stok.stok_tipi,
        birim=stok.birim,
        miktar=float(stok.miktar),
        birim_fiyat=float(stok.birim_fiyat),
        giris_tarihi=stok.giris_tarihi,
        uretim_tarihi=stok.uretim_tarihi,
        son_kullanma=stok.son_kullanma,
        konum=stok.konum,
        tedarikci_id=str(stok.tedarikci_id) if stok.tedarikci_id else None,
        tedarikci_ad=tedarikci_ad,
        durum=stok.durum,
        kalite_notu=float(stok.kalite_notu) if stok.kalite_notu else None
    )


@router.get("/{stok_id}/hareketler", response_model=List[StokHareketResponse])
async def get_stok_hareketler(
    stok_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Get stock movement history."""
    hareketler = db.query(StokHareket).filter(
        StokHareket.stok_id == stok_id
    ).order_by(StokHareket.olusturma_tarihi.desc()).all()
    
    return [
        StokHareketResponse(
            id=str(h.id),
            stok_id=str(h.stok_id),
            lot_no=h.lot_no or "",
            hareket_tipi=h.hareket_tipi,
            miktar=float(h.miktar),
            onceki_miktar=float(h.onceki_miktar),
            sonraki_miktar=float(h.sonraki_miktar),
            birim_fiyat=float(h.birim_fiyat) if h.birim_fiyat else None,
            tutar=float(h.tutar) if h.tutar else None,
            referans_tipi=h.referans_tipi,
            aciklama=h.aciklama,
            olusturma_tarihi=h.olusturma_tarihi
        )
        for h in hareketler
    ]
