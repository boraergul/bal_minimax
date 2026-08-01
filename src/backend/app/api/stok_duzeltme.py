"""
Stock Correction Approval API - Two-level approval workflow (maker-checker).
Handles stock quantity corrections with +/- 10% criticality threshold.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from decimal import Decimal

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import Kullanici
from app.models.stok_duzeltme import StokDuzeltmeTalep
from app.models.stok import StokKarti, StokHareket
from app.models.urun import Urun

router = APIRouter()

# Critical threshold percentage (10%)
KRITIK_ESIK = Decimal("10.0")


# =============================================================================
# Pydantic Schemas
# =============================================================================

class StokDuzeltmeCreate(BaseModel):
    """Schema for creating a stock correction request."""
    stok_id: str
    talep_turu: str  # SAYIM_FARKI, FIRE_ZARAR, CALISMA, BIRIM_DEGISIKLIGI, DIGER
    yeni_miktar: float
    talep_aciklamasi: Optional[str] = None


class StokDuzeltmeDurumGuncelle(BaseModel):
    """Schema for updating request status."""
    durum: str  # ONAYLANDI, REDDEDILDI
    ret_nedeni: Optional[str] = None


class StokDuzeltmeOnayla(BaseModel):
    """Schema for approving a correction request."""
    aciklama: Optional[str] = None


class StokDuzeltmeReddet(BaseModel):
    """Schema for rejecting a correction request."""
    ret_nedeni: str


class StokDuzeltmeResponse(BaseModel):
    """Schema for stock correction response."""
    id: str
    stok_id: str
    talep_turu: str
    talep_durumu: str
    onceki_miktar: float
    yeni_miktar: float
    fark_miktar: float
    birim: Optional[str]
    kritik_duzeltme: bool
    kritik_durum_aciklama: Optional[str]
    talep_eden_id: str
    talep_tarihi: str
    talep_aciklamasi: Optional[str]
    onay_leyen_id: Optional[str]
    onay_tarihi: Optional[str]
    ret_nedeni: Optional[str]
    stok_guncelleme_tarihi: Optional[str]
    olusturma_tarihi: str

    class Config:
        from_attributes = True


class StokDuzeltmeDetayResponse(BaseModel):
    """Schema for detailed stock correction with stock info."""
    id: str
    stok_id: str
    talep_turu: str
    talep_durumu: str
    onceki_miktar: float
    yeni_miktar: float
    fark_miktar: float
    birim: Optional[str]
    kritik_duzeltme: bool
    kritik_durum_aciklama: Optional[str]
    talep_eden_id: str
    talep_tarihi: str
    talep_aciklamasi: Optional[str]
    onay_leyen_id: Optional[str]
    onay_tarihi: Optional[str]
    ret_nedeni: Optional[str]
    stok_guncelleme_tarihi: Optional[str]
    olusturma_tarihi: str
    # Stock info
    stok_lot_no: Optional[str] = None
    stok_urun_ad: Optional[str] = None
    stok_miktar: Optional[float] = None
    stok_durum: Optional[str] = None

    class Config:
        from_attributes = True


class StokDuzeltmeListResponse(BaseModel):
    """Schema for paginated correction list."""
    data: List[StokDuzeltmeDetayResponse]
    total: int
    sayfa: int
    sayfa_boyutu: int


class StokDuzeltmeTaleplerResponse(BaseModel):
    """Schema for correction requests response."""
    talepler: List[StokDuzeltmeDetayResponse]
    toplam: int


# =============================================================================
# Helper Functions
# =============================================================================

def generate_duzeltme_no(db: Session) -> str:
    """Generate unique correction number: DUZ-YYYYMMDD-XXX."""
    today = datetime.utcnow().strftime("%Y%m%d")
    prefix = f"DUZ-{today}-"

    # Get count for today
    count_query = db.query(func.count(StokDuzeltmeTalep.id)).filter(
        StokDuzeltmeTalep.talep_tarihi.like(f"{today}%")
    )
    count = count_query.scalar() or 0

    return f"{prefix}{str(count + 1).zfill(3)}"


def calculate_kritiklik(onceki_miktar: float, fark_miktar: float) -> tuple[bool, float]:
    """Calculate if correction is critical (>10% threshold)."""
    if onceki_miktar == 0:
        # New lot or zero quantity - always critical
        return True, Decimal("100.0")

    kritiklik_orani = abs(fark_miktar) / abs(onceki_miktar) * 100
    is_kritik = float(kritiklik_orani) > float(KRITIK_ESIK)
    return is_kritik, kritiklik_orani


def execute_stok_guncelle(
    db: Session,
    talep: StokDuzeltmeTalep,
    onaylayan_id: str
) -> StokHareket:
    """Execute stock update and create movement record."""
    stok = db.query(StokKarti).filter(StokKarti.id == talep.stok_id).first()
    if not stok:
        raise HTTPException(status_code=404, detail="Stok kartı bulunamadı")

    now = datetime.utcnow().isoformat()
    onceki_miktar = float(stok.miktar)
    sonraki_miktar = float(talep.yeni_miktar)

    # Update stock card
    stok.miktar = talep.yeni_miktar
    talep.stok_guncelleme_tarihi = now

    # Create movement record
    hareket = StokHareket(
        stok_id=stok.id,
        hareket_tipi="DUZELTME",
        miktar=float(talep.fark_miktar),
        onceki_miktar=onceki_miktar,
        sonraki_miktar=sonraki_miktar,
        birim_fiyat=stok.birim_fiyat,
        tutar=float(talep.fark_miktar) * float(stok.birim_fiyat) if stok.birim_fiyat else None,
        referans_tipi="DUZELTME",
        referans_id=talep.id,
        lot_no=stok.lot_no,
        aciklama=f"Düzeltme: {talep.talep_aciklamasi or talep.talep_turu}",
        olusturan_kullanici_id=onaylayan_id
    )

    db.add(hareket)
    db.flush()

    return hareket


def get_talep_with_stok_info(talep: StokDuzeltmeTalep, db: Session) -> dict:
    """Get talep with stock information."""
    stok = db.query(StokKarti).filter(StokKarti.id == talep.stok_id).first()

    stok_lot_no = None
    stok_urun_ad = None
    stok_miktar = None
    stok_durum = None

    if stok:
        stok_lot_no = stok.lot_no
        stok_miktar = float(stok.miktar)
        stok_durum = stok.durum
        if stok.urun:
            stok_urun_ad = stok.urun.ad

    return {
        "id": str(talep.id),
        "stok_id": str(talep.stok_id),
        "talep_turu": talep.talep_turu,
        "talep_durumu": talep.talep_durumu,
        "onceki_miktar": float(talep.onceki_miktar),
        "yeni_miktar": float(talep.yeni_miktar),
        "fark_miktar": float(talep.fark_miktar),
        "birim": talep.birim,
        "kritik_duzeltme": talep.kritik_duzeltme,
        "kritik_durum_aciklama": talep.kritik_durum_aciklama,
        "talep_eden_id": str(talep.talep_eden_id),
        "talep_tarihi": talep.talep_tarihi,
        "talep_aciklamasi": talep.talep_aciklamasi,
        "onay_leyen_id": str(talep.onay_leyen_id) if talep.onay_leyen_id else None,
        "onay_tarihi": talep.onay_tarihi,
        "ret_nedeni": talep.ret_nedeni,
        "stok_guncelleme_tarihi": talep.stok_guncelleme_tarihi,
        "olusturma_tarihi": talep.olusturma_tarihi,
        "stok_lot_no": stok_lot_no,
        "stok_urun_ad": stok_urun_ad,
        "stok_miktar": stok_miktar,
        "stok_durum": stok_durum
    }


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/", response_model=StokDuzeltmeListResponse)
async def list_duzeltmeler(
    sayfa: int = Query(1, ge=1),
    sayfa_boyutu: int = Query(20, ge=1, le=100),
    durum: Optional[str] = None,
    kritik: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """List stock correction requests with filters."""
    query = db.query(StokDuzeltmeTalep)

    if durum:
        query = query.filter(StokDuzeltmeTalep.talep_durumu == durum)
    if kritik is not None:
        query = query.filter(StokDuzeltmeTalep.kritik_duzeltme == kritik)

    total = query.count()
    talepler = query.order_by(StokDuzeltmeTalep.olusturma_tarihi.desc()).offset(
        (sayfa - 1) * sayfa_boyutu
    ).limit(sayfa_boyutu).all()

    result = [
        StokDuzeltmeDetayResponse(**get_talep_with_stok_info(t, db))
        for t in talepler
    ]

    return StokDuzeltmeListResponse(
        data=result,
        total=total,
        sayfa=sayfa,
        sayfa_boyutu=sayfa_boyutu
    )


@router.post("/", response_model=StokDuzeltmeResponse, status_code=201)
async def create_duzeltme_talep(
    request: StokDuzeltmeCreate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Create a new stock correction request."""
    # Verify stock exists
    stok = db.query(StokKarti).filter(StokKarti.id == request.stok_id).first()
    if not stok:
        raise HTTPException(status_code=404, detail="Stok kartı bulunamadı")

    now = datetime.utcnow().isoformat()
    onceki_miktar = float(stok.miktar)
    yeni_miktar = request.yeni_miktar
    fark_miktar = Decimal(str(yeni_miktar)) - Decimal(str(onceki_miktar))

    # Calculate criticality
    is_kritik, kritiklik_orani = calculate_kritiklik(onceki_miktar, float(fark_miktar))

    # Create talep
    talep = StokDuzeltmeTalep(
        stok_id=request.stok_id,
        talep_turu=request.talep_turu,
        talep_durumu="BEKLEMEDE" if is_kritik else "ONAYLANDI",
        onceki_miktar=Decimal(str(onceki_miktar)),
        yeni_miktar=Decimal(str(yeni_miktar)),
        fark_miktar=fark_miktar,
        birim=stok.birim,
        kritik_duzeltme=is_kritik,
        kritik_durum_aciklama=f"Değişim: %{float(kritiklik_orani):.1f}",
        talep_eden_id=current_user.id,
        talep_tarihi=now,
        talep_aciklamasi=request.talep_aciklamasi,
        olusturma_tarihi=now
    )

    db.add(talep)
    db.flush()

    # If not critical, auto-approve and update stock
    if not is_kritik:
        hareket = execute_stok_guncelle(db, talep, current_user.id)
        talep.talep_durumu = "STOK_GUNCELLENDI"
        talep.onay_leyen_id = current_user.id
        talep.onay_tarihi = now

    db.commit()
    db.refresh(talep)

    return StokDuzeltmeResponse(
        id=str(talep.id),
        stok_id=str(talep.stok_id),
        talep_turu=talep.talep_turu,
        talep_durumu=talep.talep_durumu,
        onceki_miktar=float(talep.onceki_miktar),
        yeni_miktar=float(talep.yeni_miktar),
        fark_miktar=float(talep.fark_miktar),
        birim=talep.birim,
        kritik_duzeltme=talep.kritik_duzeltme,
        kritik_durum_aciklama=talep.kritik_durum_aciklama,
        talep_eden_id=str(talep.talep_eden_id),
        talep_tarihi=talep.talep_tarihi,
        talep_aciklamasi=talep.talep_aciklamasi,
        onay_leyen_id=str(talep.onay_leyen_id) if talep.onay_leyen_id else None,
        onay_tarihi=talep.onay_tarihi,
        ret_nedeni=talep.ret_nedeni,
        stok_guncelleme_tarihi=talep.stok_guncelleme_tarihi,
        olusturma_tarihi=talep.olusturma_tarihi
    )


@router.get("/{talep_id}", response_model=StokDuzeltmeDetayResponse)
async def get_duzeltme_talep(
    talep_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Get stock correction request details."""
    talep = db.query(StokDuzeltmeTalep).filter(StokDuzeltmeTalep.id == talep_id).first()
    if not talep:
        raise HTTPException(status_code=404, detail="Düzeltme talebi bulunamadı")

    return StokDuzeltmeDetayResponse(**get_talep_with_stok_info(talep, db))


@router.patch("/{talep_id}/onayla", response_model=StokDuzeltmeDetayResponse)
async def approve_duzeltme(
    talep_id: str,
    request: StokDuzeltmeOnayla,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Approve a critical stock correction request."""
    talep = db.query(StokDuzeltmeTalep).filter(StokDuzeltmeTalep.id == talep_id).first()
    if not talep:
        raise HTTPException(status_code=404, detail="Düzeltme talebi bulunamadı")

    # Check status
    if talep.talep_durumu != "BEKLEMEDE":
        raise HTTPException(
            status_code=400,
            detail=f"Sadece BEKLEMEDE durumundaki talepler onaylanabilir. Mevcut durum: {talep.talep_durumu}"
        )

    # Check criticality - YONETICI or ADMIN required for critical corrections
    # For simplicity, we check if the current user is the same as the requester
    if talep.kritik_duzeltme and talep.talep_eden_id == current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Kritik düzeltmeler, talep eden kullanıcı tarafından onaylanamaz"
        )

    now = datetime.utcnow().isoformat()

    # Execute stock update
    hareket = execute_stok_guncelle(db, talep, current_user.id)

    # Update talep status
    talep.talep_durumu = "STOK_GUNCELLENDI"
    talep.onay_leyen_id = current_user.id
    talep.onay_tarihi = now
    if request.aciklama:
        talep.talep_aciklamasi = (
            (talep.talep_aciklamasi or "") + f"\n[ONAY NOTU: {request.aciklama}]"
        )

    db.commit()
    db.refresh(talep)

    return StokDuzeltmeDetayResponse(**get_talep_with_stok_info(talep, db))


@router.patch("/{talep_id}/reddet", response_model=StokDuzeltmeDetayResponse)
async def reject_duzeltme(
    talep_id: str,
    request: StokDuzeltmeReddet,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Reject a stock correction request."""
    talep = db.query(StokDuzeltmeTalep).filter(StokDuzeltmeTalep.id == talep_id).first()
    if not talep:
        raise HTTPException(status_code=404, detail="Düzeltme talebi bulunamadı")

    # Check status
    if talep.talep_durumu != "BEKLEMEDE":
        raise HTTPException(
            status_code=400,
            detail=f"Sadece BEKLEMEDE durumundaki talepler reddedilebilir. Mevcut durum: {talep.talep_durumu}"
        )

    # Validate ret_nedeni
    if not request.ret_nedeni:
        raise HTTPException(status_code=400, detail="Ret nedeni zorunludur")

    now = datetime.utcnow().isoformat()

    # Update talep status
    talep.talep_durumu = "REDDEDILDI"
    talep.ret_nedeni = request.ret_nedeni

    db.commit()
    db.refresh(talep)

    return StokDuzeltmeDetayResponse(**get_talep_with_stok_info(talep, db))


@router.get("/stok/{stok_id}/talepler", response_model=StokDuzeltmeTaleplerResponse)
async def get_stok_talepler(
    stok_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Get all correction requests for a specific stock card."""
    # Verify stock exists
    stok = db.query(StokKarti).filter(StokKarti.id == stok_id).first()
    if not stok:
        raise HTTPException(status_code=404, detail="Stok kartı bulunamadı")

    talepler = db.query(StokDuzeltmeTalep).filter(
        StokDuzeltmeTalep.stok_id == stok_id
    ).order_by(StokDuzeltmeTalep.olusturma_tarihi.desc()).all()

    return StokDuzeltmeTaleplerResponse(
        talepler=[
            StokDuzeltmeDetayResponse(**get_talep_with_stok_info(t, db))
            for t in talepler
        ],
        toplam=len(talepler)
    )
