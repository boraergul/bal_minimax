"""
Production Cost Management API
"""
from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from pydantic import BaseModel

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import Kullanici
from app.models.maliyet import UretimIscilik, UretimEnerji, UretimBakim, UretimGenelGider
from app.models.uretim import UretimEmri, UretimDetay
from app.models.stok import StokKarti
from app.models.urun import Urun

router = APIRouter()


# ============== Pydantic Schemas ==============

class IscilikResponse(BaseModel):
    id: str
    uretim_id: str
    personel_id: Optional[str]
    personel_ad: Optional[str]
    baslangic_saat: str
    bitis_saat: Optional[str]
    toplam_sure_saat: Optional[float]
    birim_ucret: float
    toplam_tutar: float
    is_tipi: Optional[str]
    not_text: Optional[str]
    olusturma_tarihi: str

    class Config:
        from_attributes = True


class EnerjiResponse(BaseModel):
    id: str
    uretim_id: str
    enerji_tipi: str
    birim: str
    tuketim_miktari: float
    birim_fiyat: float
    toplam_tutar: float
    tarih: str
    donem: Optional[str]
    not_text: Optional[str]
    olusturma_tarihi: str

    class Config:
        from_attributes = True


class BakimResponse(BaseModel):
    id: str
    uretim_id: Optional[str]
    bakim_tipi: str
    bakim_aciklamasi: Optional[str]
    tutar: float
    tarih: str
    donem: Optional[str]
    not_text: Optional[str]
    olusturma_tarihi: str

    class Config:
        from_attributes = True


class GenelGiderResponse(BaseModel):
    id: str
    uretim_id: Optional[str]
    gider_turu: str
    gider_aciklamasi: Optional[str]
    tutar: float
    dagitim_tipi: Optional[str]
    dagitim_orani: Optional[float]
    dagitilan_tutar: Optional[float]
    donem: Optional[str]
    not_text: Optional[str]
    olusturma_tarihi: str

    class Config:
        from_attributes = True


class MaliyetOzetResponse(BaseModel):
    uretim_id: str
    uretim_no: str
    toplam_iscilik: float
    toplam_enerji: float
    toplam_bakim: float
    toplam_genel_gider: float
    toplam_hammadde: float
    toplam_fire: float
    toplam_maliyet: float
    birim_maliyet_kg: float
    uretim_miktari: float
    fire_orani_gercek: Optional[float]


class MaliyetDetayResponse(BaseModel):
    uretim_id: str
    uretim_no: str
    hammadeler: List[dict]
    iscilikler: List[IscilikResponse]
    enerjiler: List[EnerjiResponse]
    bakimlar: List[BakimResponse]
    genel_giderler: List[GenelGiderResponse]
    toplam_hammadde: float
    toplam_iscilik: float
    toplam_enerji: float
    toplam_bakim: float
    toplam_genel_gider: float
    toplam_fire: float
    toplam_maliyet: float


class IscilikCreateRequest(BaseModel):
    personel_id: Optional[str] = None
    personel_ad: Optional[str] = None
    baslangic_saat: str
    bitis_saat: Optional[str] = None
    birim_ucret: float
    is_tipi: Optional[str] = None
    not_text: Optional[str] = None


class EnerjiCreateRequest(BaseModel):
    enerji_tipi: str
    birim: str = "kWh"
    tuketim_miktari: float
    birim_fiyat: float
    tarih: str
    donem: Optional[str] = None
    not_text: Optional[str] = None


class GenelGiderCreateRequest(BaseModel):
    gider_turu: str
    tutar: float
    dagitim_tipi: Optional[str] = None
    dagitim_orani: Optional[float] = None
    dagitilan_tutar: Optional[float] = None
    donem: Optional[str] = None
    not_text: Optional[str] = None


class AylikMaliyetRaporuResponse(BaseModel):
    yil: int
    ay: int
    veriler: List[dict]
    toplam_maliyet: float


class UrunBazliMaliyetResponse(BaseModel):
    urun_id: Optional[str]
    urun_ad: Optional[str]
    uretim_sayisi: int
    toplam_maliyet: float
    toplam_miktar: float
    ortalama_birim_maliyet: float


# ============== Helper Functions ==============

def generate_iscilik_no(db: Session) -> str:
    """Generate unique işçilik record number."""
    today = datetime.utcnow().strftime("%Y%m%d")
    count = db.query(func.count(UretimIscilik.id)).filter(
        UretimIscilik.uretim_id.isnot(None)
    ).scalar() or 0
    return f"ISC-{today}-{str(count + 1).zfill(3)}"


def calculate_iscilik_totals(db: Session, uretim_id: str) -> float:
    """Calculate total labor cost for a production order."""
    result = db.query(func.sum(UretimIscilik.toplam_tutar)).filter(
        UretimIscilik.uretim_id == uretim_id
    ).scalar()
    return float(result) if result else 0.0


def calculate_enerji_totals(db: Session, uretim_id: str) -> float:
    """Calculate total energy cost for a production order."""
    result = db.query(func.sum(UretimEnerji.toplam_tutar)).filter(
        UretimEnerji.uretim_id == uretim_id
    ).scalar()
    return float(result) if result else 0.0


def calculate_bakim_totals(db: Session, uretim_id: str) -> float:
    """Calculate total maintenance cost for a production order."""
    result = db.query(func.sum(UretimBakim.tutar)).filter(
        UretimBakim.uretim_id == uretim_id
    ).scalar()
    return float(result) if result else 0.0


def calculate_genel_gider_totals(db: Session, uretim_id: str) -> float:
    """Calculate total overhead allocation for a production order."""
    result = db.query(func.sum(UretimGenelGider.dagitilan_tutar)).filter(
        UretimGenelGider.uretim_id == uretim_id,
        UretimGenelGider.dagitilan_tutar.isnot(None)
    ).scalar()
    return float(result) if result else 0.0


def calculate_hammadde_cost(db: Session, uretim_id: str) -> tuple[float, float]:
    """Calculate total raw material cost and fire cost."""
    detaylar = db.query(UretimDetay).filter(UretimDetay.uretim_id == uretim_id).all()
    
    hammadde_toplam = Decimal('0')
    fire_toplam = Decimal('0')
    
    for detay in detaylar:
        # Get lot info for unit price
        lot = db.query(StokKarti).filter(
            StokKarti.lot_no == detay.hammadde_lot_no
        ).first()
        
        birim_fiyat = lot.birim_fiyat if lot else Decimal('0')
        hammadde_maliyeti = Decimal(str(detay.hammadde_miktar)) * birim_fiyat
        hammadde_toplam += hammadde_maliyeti
        
        # Fire cost
        if detay.fire_miktari:
            fire_maliyeti = Decimal(str(detay.fire_miktari)) * birim_fiyat
            fire_toplam += fire_maliyeti
    
    return float(hammadde_toplam), float(fire_toplam)


def calculate_maliyet_ozet(db: Session, uretim_id: str) -> MaliyetOzetResponse:
    """Calculate complete cost summary for a production order."""
    emri = db.query(UretimEmri).filter(UretimEmri.id == uretim_id).first()
    if not emri:
        raise HTTPException(status_code=404, detail="Üretim emri bulunamadı")
    
    toplam_iscilik = calculate_iscilik_totals(db, uretim_id)
    toplam_enerji = calculate_enerji_totals(db, uretim_id)
    toplam_bakim = calculate_bakim_totals(db, uretim_id)
    toplam_genel_gider = calculate_genel_gider_totals(db, uretim_id)
    toplam_hammadde, toplam_fire = calculate_hammadde_cost(db, uretim_id)
    
    toplam_maliyet = (
        toplam_hammadde 
        + toplam_fire 
        + toplam_iscilik 
        + toplam_enerji 
        + toplam_bakim 
        + toplam_genel_gider
    )
    
    # Calculate unit cost
    toplam_mamul_miktar = db.query(func.sum(UretimDetay.mamul_miktar)).filter(
        UretimDetay.uretim_id == uretim_id
    ).scalar() or 0
    
    birim_maliyet = toplam_maliyet / float(toplam_mamul_miktar) if toplam_mamul_miktar > 0 else 0.0
    
    # Calculate actual fire rate
    toplam_hammadde_miktar = db.query(func.sum(UretimDetay.hammadde_miktar)).filter(
        UretimDetay.uretim_id == uretim_id
    ).scalar() or 0
    toplam_fire_miktar = db.query(func.sum(UretimDetay.fire_miktari)).filter(
        UretimDetay.uretim_id == uretim_id
    ).scalar() or 0
    
    fire_orani = None
    if toplam_hammadde_miktar > 0:
        fire_orani = float(toplam_fire_miktar) / float(toplam_hammadde_miktar + toplam_fire_miktar)
    
    return MaliyetOzetResponse(
        uretim_id=str(uretim_id),
        uretim_no=emri.uretim_no,
        toplam_iscilik=toplam_iscilik,
        toplam_enerji=toplam_enerji,
        toplam_bakim=toplam_bakim,
        toplam_genel_gider=toplam_genel_gider,
        toplam_hammadde=toplam_hammadde,
        toplam_fire=toplam_fire,
        toplam_maliyet=toplam_maliyet,
        birim_maliyet_kg=birim_maliyet,
        uretim_miktari=float(toplam_mamul_miktar),
        fire_orani_gercek=fire_orani
    )


# ============== Endpoints ==============

@router.get("/emir/{emir_id}", response_model=MaliyetOzetResponse)
async def get_emir_maliyet_ozeti(
    emir_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Get production order cost summary.
    
    Returns computed summary of all cost components for that production order:
    - toplam_iscilik, toplam_enerji, toplam_bakim, toplam_genel_gider
    - toplam_hammadde, toplam_fire
    - toplam_maliyet, birim_maliyet_kg
    """
    return calculate_maliyet_ozet(db, emir_id)


@router.get("/emir/{emir_id}/detay", response_model=MaliyetDetayResponse)
async def get_emir_maliyet_detay(
    emir_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Get detailed cost breakdown for a production order.
    
    Returns list of all cost records grouped by type:
    - hammadeler (raw materials)
    - iscilikler (labor)
    - enerjiler (energy)
    - bakimlar (maintenance)
    - genel_giderler (overhead)
    """
    # Verify production order exists
    emri = db.query(UretimEmri).filter(UretimEmri.id == emir_id).first()
    if not emri:
        raise HTTPException(status_code=404, detail="Üretim emri bulunamadı")
    
    # Get raw materials (hammadeler)
    detaylar = db.query(UretimDetay).filter(UretimDetay.uretim_id == emir_id).all()
    hammadeler = []
    for detay in detaylar:
        lot = db.query(StokKarti).filter(
            StokKarti.lot_no == detay.hammadde_lot_no
        ).first()
        urun = db.query(Urun).filter(Urun.id == detay.hammadde_urun_id).first()
        
        birim_fiyat = float(lot.birim_fiyat) if lot else 0.0
        hammadeler.append({
            "urun_id": str(detay.hammadde_urun_id),
            "urun_ad": urun.ad if urun else None,
            "lot_no": detay.hammadde_lot_no,
            "miktar": float(detay.hammadde_miktar),
            "birim_fiyat": birim_fiyat,
            "toplam": float(detay.hammadde_miktar) * birim_fiyat if detay.hammadde_miktar else 0.0,
            "fire_miktari": float(detay.fire_miktari) if detay.fire_miktari else 0.0,
            "fire_tutar": float(detay.fire_miktari) * birim_fiyat if detay.fire_miktari else 0.0
        })
    
    # Get labor records
    iscilikler = db.query(UretimIscilik).filter(
        UretimIscilik.uretim_id == emir_id
    ).all()
    iscilik_responses = [
        IscilikResponse(
            id=str(i.id),
            uretim_id=str(i.uretim_id),
            personel_id=str(i.personel_id) if i.personel_id else None,
            personel_ad=i.personel_ad,
            baslangic_saat=i.baslangic_saat,
            bitis_saat=i.bitis_saat,
            toplam_sure_saat=float(i.toplam_sure_saat) if i.toplam_sure_saat else None,
            birim_ucret=float(i.birim_ucret),
            toplam_tutar=float(i.toplam_tutar),
            is_tipi=i.is_tipi,
            not_text=i.not_text,
            olusturma_tarihi=i.olusturma_tarihi
        )
        for i in iscilikler
    ]
    
    # Get energy records
    enerjiler = db.query(UretimEnerji).filter(
        UretimEnerji.uretim_id == emir_id
    ).all()
    enerji_responses = [
        EnerjiResponse(
            id=str(e.id),
            uretim_id=str(e.uretim_id),
            enerji_tipi=e.enerji_tipi,
            birim=e.birim,
            tuketim_miktari=float(e.tuketim_miktari),
            birim_fiyat=float(e.birim_fiyat),
            toplam_tutar=float(e.toplam_tutar),
            tarih=e.tarih,
            donem=e.donem,
            not_text=e.not_text,
            olusturma_tarihi=e.olusturma_tarihi
        )
        for e in enerjiler
    ]
    
    # Get maintenance records
    bakimlar = db.query(UretimBakim).filter(
        UretimBakim.uretim_id == emir_id
    ).all()
    bakim_responses = [
        BakimResponse(
            id=str(b.id),
            uretim_id=str(b.uretim_id) if b.uretim_id else None,
            bakim_tipi=b.bakim_tipi,
            bakim_aciklamasi=b.bakim_aciklamasi,
            tutar=float(b.tutar),
            tarih=b.tarih,
            donem=b.donem,
            not_text=b.not_text,
            olusturma_tarihi=b.olusturma_tarihi
        )
        for b in bakimlar
    ]
    
    # Get overhead records
    genel_giderler = db.query(UretimGenelGider).filter(
        UretimGenelGider.uretim_id == emir_id
    ).all()
    gider_responses = [
        GenelGiderResponse(
            id=str(g.id),
            uretim_id=str(g.uretim_id) if g.uretim_id else None,
            gider_turu=g.gider_turu,
            gider_aciklamasi=g.gider_aciklamasi,
            tutar=float(g.tutar),
            dagitim_tipi=g.dagitim_tipi,
            dagitim_orani=float(g.dagitim_orani) if g.dagitim_orani else None,
            dagitilan_tutar=float(g.dagitilan_tutar) if g.dagitilan_tutar else None,
            donem=g.donem,
            not_text=g.not_text,
            olusturma_tarihi=g.olusturma_tarihi
        )
        for g in genel_giderler
    ]
    
    # Calculate totals
    toplam_hammadde = sum(h["toplam"] for h in hammadeler)
    toplam_fire = sum(h["fire_tutar"] for h in hammadeler)
    toplam_iscilik = sum(i.toplam_tutar for i in iscilik_responses)
    toplam_enerji = sum(e.toplam_tutar for e in enerji_responses)
    toplam_bakim = sum(b.tutar for b in bakim_responses)
    toplam_genel_gider = sum(g.dagitilan_tutar for g in gider_responses if g.dagitilan_tutar)
    
    toplam_maliyet = (
        toplam_hammadde 
        + toplam_fire 
        + toplam_iscilik 
        + toplam_enerji 
        + toplam_bakim 
        + toplam_genel_gider
    )
    
    return MaliyetDetayResponse(
        uretim_id=str(emir_id),
        uretim_no=emri.uretim_no,
        hammadeler=hammadeler,
        iscilikler=iscilik_responses,
        enerjiler=enerji_responses,
        bakimlar=bakim_responses,
        genel_giderler=gider_responses,
        toplam_hammadde=toplam_hammadde,
        toplam_iscilik=toplam_iscilik,
        toplam_enerji=toplam_enerji,
        toplam_bakim=toplam_bakim,
        toplam_genel_gider=toplam_genel_gider,
        toplam_fire=toplam_fire,
        toplam_maliyet=toplam_maliyet
    )


@router.post("/emir/{emir_id}/iscilik", response_model=IscilikResponse)
async def create_iscilik_kaydi(
    emir_id: str,
    request: IscilikCreateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Add labor cost record to a production order.
    
    Auto-computes:
    - toplam_sure_saat: Difference between baslangic_saat and bitis_saat
    - toplam_tutar: toplam_sure_saat × birim_ucret
    """
    # Verify production order exists
    emri = db.query(UretimEmri).filter(UretimEmri.id == emir_id).first()
    if not emri:
        raise HTTPException(status_code=404, detail="Üretim emri bulunamadı")
    
    # Calculate duration
    toplam_sure = None
    if request.baslangic_saat and request.bitis_saat:
        try:
            baslangic = datetime.fromisoformat(request.baslangic_saat.replace('Z', '+00:00'))
            bitis = datetime.fromisoformat(request.bitis_saat.replace('Z', '+00:00'))
            duration = bitis - baslangic
            toplam_sure = Decimal(str(duration.total_seconds() / 3600))
        except (ValueError, AttributeError):
            toplam_sure = None
    
    # Calculate total amount
    birim_ucret = Decimal(str(request.birim_ucret))
    toplam_tutar = toplam_sure * birim_ucret if toplam_sure else Decimal('0')
    
    # Create record
    iscilik = UretimIscilik(
        uretim_id=emir_id,
        personel_id=request.personel_id,
        personel_ad=request.personel_ad,
        baslangic_saat=request.baslangic_saat,
        bitis_saat=request.bitis_saat,
        toplam_sure_saat=toplam_sure,
        birim_ucret=request.birim_ucret,
        toplam_tutar=toplam_tutar,
        is_tipi=request.is_tipi,
        not_text=request.not_text,
        olusturma_tarihi=datetime.utcnow().isoformat(),
        olusturan_kullanici_id=current_user.id
    )
    
    db.add(iscilik)
    db.commit()
    db.refresh(iscilik)
    
    return IscilikResponse(
        id=str(iscilik.id),
        uretim_id=str(iscilik.uretim_id),
        personel_id=str(iscilik.personel_id) if iscilik.personel_id else None,
        personel_ad=iscilik.personel_ad,
        baslangic_saat=iscilik.baslangic_saat,
        bitis_saat=iscilik.bitis_saat,
        toplam_sure_saat=float(iscilik.toplam_sure_saat) if iscilik.toplam_sure_saat else None,
        birim_ucret=float(iscilik.birim_ucret),
        toplam_tutar=float(iscilik.toplam_tutar),
        is_tipi=iscilik.is_tipi,
        not_text=iscilik.not_text,
        olusturma_tarihi=iscilik.olusturma_tarihi
    )


@router.post("/emir/{emir_id}/enerji", response_model=EnerjiResponse)
async def create_enerji_kaydi(
    emir_id: str,
    request: EnerjiCreateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Add energy cost record to a production order.
    
    Auto-computes:
    - toplam_tutar: tuketim_miktari × birim_fiyat
    """
    # Verify production order exists
    emri = db.query(UretimEmri).filter(UretimEmri.id == emir_id).first()
    if not emri:
        raise HTTPException(status_code=404, detail="Üretim emri bulunamadı")
    
    # Calculate total
    tuketim = Decimal(str(request.tuketim_miktari))
    birim_fiyat = Decimal(str(request.birim_fiyat))
    toplam_tutar = tuketim * birim_fiyat
    
    # Set donem if not provided
    donem = request.donem
    if not donem and request.tarih:
        try:
            tarih = datetime.fromisoformat(request.tarih.replace('Z', '+00:00'))
            donem = f"{tarih.year}-{tarih.month:02d}"
        except (ValueError, AttributeError):
            donem = None
    
    # Create record
    enerji = UretimEnerji(
        uretim_id=emir_id,
        enerji_tipi=request.enerji_tipi,
        birim=request.birim,
        tuketim_miktari=request.tuketim_miktari,
        birim_fiyat=request.birim_fiyat,
        toplam_tutar=toplam_tutar,
        tarih=request.tarih,
        donem=donem,
        not_text=request.not_text,
        olusturma_tarihi=datetime.utcnow().isoformat(),
        olusturan_kullanici_id=current_user.id
    )
    
    db.add(enerji)
    db.commit()
    db.refresh(enerji)
    
    return EnerjiResponse(
        id=str(enerji.id),
        uretim_id=str(enerji.uretim_id),
        enerji_tipi=enerji.enerji_tipi,
        birim=enerji.birim,
        tuketim_miktari=float(enerji.tuketim_miktari),
        birim_fiyat=float(enerji.birim_fiyat),
        toplam_tutar=float(enerji.toplam_tutar),
        tarih=enerji.tarih,
        donem=enerji.donem,
        not_text=enerji.not_text,
        olusturma_tarihi=enerji.olusturma_tarihi
    )


@router.post("/emir/{emir_id}/genel-gider", response_model=GenelGiderResponse)
async def create_genel_gider_dagitim(
    emir_id: str,
    request: GenelGiderCreateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Add overhead allocation to a production order.
    
    Records general overhead expenses and their distribution across production orders.
    """
    # Verify production order exists
    emri = db.query(UretimEmri).filter(UretimEmri.id == emir_id).first()
    if not emri:
        raise HTTPException(status_code=404, detail="Üretim emri bulunamadı")
    
    # Create record
    gider = UretimGenelGider(
        uretim_id=emir_id,
        gider_turu=request.gider_turu,
        gider_aciklamasi=request.not_text,
        tutar=request.tutar,
        dagitim_tipi=request.dagitim_tipi,
        dagitim_orani=request.dagitim_orani,
        dagitilan_tutar=request.dagitilan_tutar or request.tutar,
        donem=request.donem,
        not_text=request.not_text,
        olusturma_tarihi=datetime.utcnow().isoformat(),
        olusturan_kullanici_id=current_user.id
    )
    
    db.add(gider)
    db.commit()
    db.refresh(gider)
    
    return GenelGiderResponse(
        id=str(gider.id),
        uretim_id=str(gider.uretim_id) if gider.uretim_id else None,
        gider_turu=gider.gider_turu,
        gider_aciklamasi=gider.gider_aciklamasi,
        tutar=float(gider.tutar),
        dagitim_tipi=gider.dagitim_tipi,
        dagitim_orani=float(gider.dagitim_orani) if gider.dagitim_orani else None,
        dagitilan_tutar=float(gider.dagitilan_tutar) if gider.dagitilan_tutar else None,
        donem=gider.donem,
        not_text=gider.not_text,
        olusturma_tarihi=gider.olusturma_tarihi
    )


@router.get("/rapor/aylik", response_model=AylikMaliyetRaporuResponse)
async def get_aylik_maliyet_raporu(
    yil: int = Query(..., ge=2020, le=2100),
    ay: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Get monthly cost report.
    
    Returns cost data grouped by uretim_id (production order) with totals.
    """
    # Find production orders for the given month
    emri_list = db.query(UretimEmri).filter(
        UretimEmri.durum == "TAMAMLANDI"
    ).all()
    
    veriler = []
    toplam_maliyet = 0.0
    
    for emri in emri_list:
        try:
            tarih = datetime.fromisoformat(emri.tarih.replace('Z', '+00:00'))
            if tarih.year != yil or tarih.month != ay:
                continue
        except (ValueError, AttributeError):
            continue
        
        ozet = calculate_maliyet_ozet(db, str(emri.id))
        
        veriler.append({
            "uretim_id": ozet.uretim_id,
            "uretim_no": ozet.uretim_no,
            "toplam_iscilik": ozet.toplam_iscilik,
            "toplam_enerji": ozet.toplam_enerji,
            "toplam_bakim": ozet.toplam_bakim,
            "toplam_genel_gider": ozet.toplam_genel_gider,
            "toplam_hammadde": ozet.toplam_hammadde,
            "toplam_fire": ozet.toplam_fire,
            "toplam_maliyet": ozet.toplam_maliyet,
            "birim_maliyet_kg": ozet.birim_maliyet_kg
        })
        
        toplam_maliyet += ozet.toplam_maliyet
    
    return AylikMaliyetRaporuResponse(
        yil=yil,
        ay=ay,
        veriler=veriler,
        toplam_maliyet=toplam_maliyet
    )


@router.get("/rapor/urun-bazli", response_model=List[UrunBazliMaliyetResponse])
async def get_urun_bazli_maliyet_raporu(
    urun_id: Optional[str] = None,
    baslangic_tarih: Optional[str] = None,
    bitis_tarih: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Get product-based cost report.
    
    Returns average unit costs grouped by product.
    
    Query params:
    - urun_id: Filter by specific product (optional)
    - baslangic_tarih: Start date filter (ISO format)
    - bitis_tarih: End date filter (ISO format)
    """
    query = db.query(UretimEmri).filter(
        UretimEmri.durum == "TAMAMLANDI"
    )
    
    # Date filters
    if baslangic_tarih:
        query = query.filter(UretimEmri.tarih >= baslangic_tarih)
    if bitis_tarih:
        query = query.filter(UretimEmri.tarih <= bitis_tarih)
    
    emri_list = query.all()
    
    # Group by product
    urun_maliyet = {}
    
    for emri in emri_list:
        detaylar = db.query(UretimDetay).filter(
            UretimDetay.uretim_id == str(emri.id)
        ).all()
        
        for detay in detaylar:
            key = str(detay.mamul_urun_id)
            
            if urun_id and key != urun_id:
                continue
            
            if key not in urun_maliyet:
                urun = db.query(Urun).filter(Urun.id == key).first()
                urun_maliyet[key] = {
                    "urun_id": key,
                    "urun_ad": urun.ad if urun else None,
                    "uretim_sayisi": 0,
                    "toplam_maliyet": 0.0,
                    "toplam_miktar": 0.0
                }
            
            ozet = calculate_maliyet_ozet(db, str(emri.id))
            urun_maliyet[key]["uretim_sayisi"] += 1
            urun_maliyet[key]["toplam_maliyet"] += ozet.toplam_maliyet
            urun_maliyet[key]["toplam_miktar"] += float(detay.mamul_miktar)
    
    result = []
    for data in urun_maliyet.values():
        ortalama = (
            data["toplam_maliyet"] / data["toplam_miktar"]
            if data["toplam_miktar"] > 0 else 0.0
        )
        result.append(UrunBazliMaliyetResponse(
            urun_id=data["urun_id"],
            urun_ad=data["urun_ad"],
            uretim_sayisi=data["uretim_sayisi"],
            toplam_maliyet=data["toplam_maliyet"],
            toplam_miktar=data["toplam_miktar"],
            ortalama_birim_maliyet=ortalama
        ))
    
    return result
