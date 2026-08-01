"""
Sales Return (Satış İade) API
"""
from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import Kullanici
from app.models.iade import SatisIade, IadeNumune
from app.models.satis import SatisKaydi
from app.models.stok import StokKarti, StokHareket
from app.models.urun import Urun

router = APIRouter()


# ============== Pydantic Schemas ==============

class IadeKalemRequest(BaseModel):
    """Return item in create request."""
    urun_id: str
    miktar: float
    birim_fiyat: float
    aciklama: Optional[str] = None


class IadeCreateRequest(BaseModel):
    """Request to create a new return."""
    musteri_id: str
    iade_nedeni: str  # KALITE_SORUNU, YANLIS_URUN, MIKTAR_FARKI, MUSERI_ISTEK, DIGER
    kalemler: List[IadeKalemRequest]
    musteri_aciklamasi: Optional[str] = None


class IadeUpdateRequest(BaseModel):
    """Request to update a return."""
    iade_nedeni: Optional[str] = None
    musteri_aciklamasi: Optional[str] = None
    yetkili_aciklama: Optional[str] = None
    fire_miktari: Optional[float] = None
    fire_orani: Optional[float] = None
    fire_nedeni: Optional[str] = None


class IadeDurumUpdateRequest(BaseModel):
    """Request to update return status."""
    iade_durumu: str  # KALITE_KONTROL, STOK_GIRISI, TAMAMLANDI, RET
    fire_miktari: Optional[float] = None
    fire_nedeni: Optional[str] = None
    kalite_kontrol_sonucu: Optional[str] = None  # KABUL, RET


class IadeResponse(BaseModel):
    """Return record response."""
    id: str
    satis_id: str
    musteri_id: str
    iade_no: str
    iade_tarihi: str
    iade_durumu: str
    iade_nedeni: str
    toplam_miktar: float
    toplam_tutar: Optional[float]
    fire_miktari: Optional[float]
    fire_orani: Optional[float]
    fire_nedeni: Optional[str]
    kalite_kontrol_id: Optional[str]
    kalite_kontrol_sonucu: Optional[str]
    stok_giris_id: Optional[str]
    stok_giris_tarihi: Optional[str]
    musteri_aciklamasi: Optional[str]
    yetkili_aciklama: Optional[str]
    olusturma_tarihi: str

    class Config:
        from_attributes = True


class IadeDetayResponse(BaseModel):
    """Return detail with items."""
    iade: IadeResponse
    kalemler: List[dict]
    satis_bilgisi: Optional[dict]


class IadeListResponse(BaseModel):
    """Paginated return list."""
    data: List[IadeResponse]
    total: int
    sayfa: int
    sayfa_boyutu: int


class StokGirisResponse(BaseModel):
    """Stock entry result after return completion."""
    stok_giris_id: str
    lot_no: str
    iade_id: str
    toplam_miktar: float
    fire_miktari: float
    kabul_miktari: float


class LotKaynakResponse(BaseModel):
    """Return lot source information for traceability."""
    iade_id: str
    iade_no: str
    satis_id: str
    satis_lot_no: str
    satis_tarihi: str
    iade_lot_no: Optional[str]
    stok_giris_tarihi: Optional[str]
    kaynak_bilgisi: dict


# ============== Helper Functions ==============

def generate_iade_no(db: Session) -> str:
    """Generate unique return number: IADE-YYYYMMDD-XXX"""
    today = datetime.utcnow().strftime("%Y%m%d")
    
    # Count existing returns for today
    count = db.query(func.count(SatisIade.id)).filter(
        SatisIade.iade_no.like(f"IADE-{today}-%")
    ).scalar() or 0
    
    return f"IADE-{today}-{str(count + 1).zfill(3)}"


def calculate_iade_tutar(kalemler: List[IadeKalemRequest]) -> tuple[float, float]:
    """Calculate total amount and total quantity for return items."""
    toplam_tutar = sum(k.miktar * k.birim_fiyat for k in kalemler)
    toplam_miktar = sum(k.miktar for k in kalemler)
    return toplam_tutar, toplam_miktar


def create_stok_karti_from_iade(
    db: Session,
    iade: SatisIade,
    kalemler: List[IadeKalemRequest],
    current_user_id: str
) -> StokKarti:
    """Create stock card entry from accepted return items."""
    # Get first item's product for lot creation
    first_item = kalemler[0]
    urun = db.query(Urun).filter(Urun.id == first_item.urun_id).first()
    
    if not urun:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    # Generate lot number for return
    today = datetime.utcnow().strftime("%Y%m%d")
    count = db.query(func.count(StokKarti.id)).filter(
        StokKarti.lot_no.like(f"RET-{today}-%")
    ).scalar() or 0
    lot_no = f"RET-{today}-{str(count + 1).zfill(3)}"
    
    # Calculate quantities
    kabul_miktari = sum(k.miktar for k in kalemler)
    
    # Calculate average unit price (weighted)
    toplam_tutar = sum(k.miktar * k.birim_fiyat for k in kalemler)
    ortalama_birim_fiyat = toplam_tutar / kabul_miktari if kabul_miktari > 0 else 0
    
    giris_tarihi = datetime.utcnow().isoformat()
    
    # Create stock card with iade flag
    stok = StokKarti(
        urun_id=first_item.urun_id,
        lot_no=lot_no,
        stok_tipi="MAMUL",  # Returned product treated as mamul/inventory
        birim="kg",
        miktar=kabul_miktari,
        birim_fiyat=ortalama_birim_fiyat,
        giris_tarihi=giris_tarihi,
        giris_referans_no=f"IADE:{iade.iade_no}",
        konum="IADE_DEPO",
        durum="AKTIF",
        iade_id=str(iade.id),
        olusturan_kullanici_id=current_user_id
    )
    
    db.add(stok)
    db.flush()
    
    # Create stock movement
    hareket = StokHareket(
        stok_id=stok.id,
        hareket_tipi="IADE_GIRIS",
        miktar=kabul_miktari,
        onceki_miktar=0,
        sonraki_miktar=kabul_miktari,
        birim_fiyat=ortalama_birim_fiyat,
        tutar=toplam_tutar,
        referans_tipi="IADE",
        referans_id=str(iade.id),
        lot_no=lot_no,
        iade_id=str(iade.id),
        olusturan_kullanici_id=current_user_id
    )
    db.add(hareket)
    
    return stok


# ============== Endpoints ==============

@router.get("/satis/{satis_id}/iade", response_model=IadeListResponse)
async def list_satis_iadeleri(
    satis_id: str,
    sayfa: int = Query(1, ge=1),
    sayfa_boyutu: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    List all returns for a specific sale.
    """
    # Verify sale exists
    satis = db.query(SatisKaydi).filter(SatisKaydi.id == satis_id).first()
    if not satis:
        raise HTTPException(status_code=404, detail="Satış kaydı bulunamadı")
    
    query = db.query(SatisIade).filter(
        SatisIade.satis_id == satis_id,
        SatisIade.silme_tarihi.is_(None)
    )
    
    total = query.count()
    iadeler = query.order_by(SatisIade.olusturma_tarihi.desc()).offset(
        (sayfa - 1) * sayfa_boyutu
    ).limit(sayfa_boyutu).all()
    
    result = [
        IadeResponse(
            id=str(i.id),
            satis_id=str(i.satis_id),
            musteri_id=str(i.musteri_id),
            iade_no=i.iade_no,
            iade_tarihi=i.iade_tarihi,
            iade_durumu=i.iade_durumu,
            iade_nedeni=i.iade_nedeni,
            toplam_miktar=float(i.toplam_miktar),
            toplam_tutar=float(i.toplam_tutar) if i.toplam_tutar else None,
            fire_miktari=float(i.fire_miktari) if i.fire_miktari else None,
            fire_orani=float(i.fire_orani) if i.fire_orani else None,
            fire_nedeni=i.fire_nedeni,
            kalite_kontrol_id=str(i.kalite_kontrol_id) if i.kalite_kontrol_id else None,
            kalite_kontrol_sonucu=i.kalite_kontrol_sonucu,
            stok_giris_id=str(i.stok_giris_id) if i.stok_giris_id else None,
            stok_giris_tarihi=i.stok_giris_tarihi,
            musteri_aciklamasi=i.musteri_aciklamasi,
            yetkili_aciklama=i.yetkili_aciklama,
            olusturma_tarihi=i.olusturma_tarihi
        )
        for i in iadeler
    ]
    
    return IadeListResponse(
        data=result,
        total=total,
        sayfa=sayfa,
        sayfa_boyutu=sayfa_boyutu
    )


@router.post("/satis/{satis_id}/iade", response_model=IadeResponse)
async def create_iade(
    satis_id: str,
    request: IadeCreateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Create a new return record for a sale.
    
    Auto-generates:
    - iade_no: IADE-YYYYMMDD-XXX format
    
    Auto-sets:
    - iade_durumu: OLUSTURULDU
    """
    # Verify sale exists
    satis = db.query(SatisKaydi).filter(SatisKaydi.id == satis_id).first()
    if not satis:
        raise HTTPException(status_code=404, detail="Satış kaydı bulunamadı")
    
    # Check if sale is delivered (only delivered sales can be returned)
    if satis.durum != "TESLIM_EDILDI":
        raise HTTPException(
            status_code=400,
            detail="Sadece teslim edilmiş satışlar için iade oluşturulabilir"
        )
    
    # Validate items
    if not request.kalemler:
        raise HTTPException(status_code=400, detail="En az bir iade kalemi gerekli")
    
    # Calculate totals
    toplam_tutar, toplam_miktar = calculate_iade_tutar(request.kalemler)
    
    # Generate return number
    iade_no = generate_iade_no(db)
    iade_tarihi = datetime.utcnow().isoformat()
    
    # Create return record
    iade = SatisIade(
        satis_id=satis_id,
        musteri_id=request.musteri_id,
        iade_no=iade_no,
        iade_tarihi=iade_tarihi,
        iade_durumu="OLUSTURULDU",
        iade_nedeni=request.iade_nedeni,
        toplam_miktar=toplam_miktar,
        toplam_tutar=toplam_tutar,
        musteri_aciklamasi=request.musteri_aciklamasi,
        olusturma_tarihi=iade_tarihi,
        olusturan_kullanici_id=current_user.id
    )
    
    db.add(iade)
    db.commit()
    db.refresh(iade)
    
    return IadeResponse(
        id=str(iade.id),
        satis_id=str(iade.satis_id),
        musteri_id=str(iade.musteri_id),
        iade_no=iade.iade_no,
        iade_tarihi=iade.iade_tarihi,
        iade_durumu=iade.iade_durumu,
        iade_nedeni=iade.iade_nedeni,
        toplam_miktar=float(iade.toplam_miktar),
        toplam_tutar=float(iade.toplam_tutar) if iade.toplam_tutar else None,
        fire_miktari=float(iade.fire_miktari) if iade.fire_miktari else None,
        fire_orani=float(iade.fire_orani) if iade.fire_orani else None,
        fire_nedeni=iade.fire_nedeni,
        kalite_kontrol_id=str(iade.kalite_kontrol_id) if iade.kalite_kontrol_id else None,
        kalite_kontrol_sonucu=iade.kalite_kontrol_sonucu,
        stok_giris_id=str(iade.stok_giris_id) if iade.stok_giris_id else None,
        stok_giris_tarihi=iade.stok_giris_tarihi,
        musteri_aciklamasi=iade.musteri_aciklamasi,
        yetkili_aciklama=iade.yetkili_aciklama,
        olusturma_tarihi=iade.olusturma_tarihi
    )


@router.get("/{iade_id}", response_model=IadeDetayResponse)
async def get_iade_detay(
    iade_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Get return detail by ID.
    """
    iade = db.query(SatisIade).filter(
        SatisIade.id == iade_id,
        SatisIade.silme_tarihi.is_(None)
    ).first()
    
    if not iade:
        raise HTTPException(status_code=404, detail="İade kaydı bulunamadı")
    
    # Get sale info
    satis = db.query(SatisKaydi).filter(SatisKaydi.id == iade.satis_id).first()
    satis_bilgisi = None
    if satis:
        satis_bilgisi = {
            "satis_id": str(satis.id),
            "satis_no": satis.satis_no,
            "satis_tarihi": satis.satis_tarihi,
            "musteri_id": str(satis.musteri_id)
        }
    
    # Get samples
    numuneler = db.query(IadeNumune).filter(
        IadeNumune.iade_id == iade_id
    ).all()
    
    kalemler = []
    for numune in numuneler:
        kalemler.append({
            "numune_id": str(numune.id),
            "numune_no": numune.numune_no,
            "numune_turu": numune.numune_turu,
            "numune_aciklamasi": numune.numune_aciklamasi,
            "sonuc": numune.sonuc,
            "sonuc_aciklamasi": numune.sonuc_aciklamasi
        })
    
    iade_response = IadeResponse(
        id=str(iade.id),
        satis_id=str(iade.satis_id),
        musteri_id=str(iade.musteri_id),
        iade_no=iade.iade_no,
        iade_tarihi=iade.iade_tarihi,
        iade_durumu=iade.iade_durumu,
        iade_nedeni=iade.iade_nedeni,
        toplam_miktar=float(iade.toplam_miktar),
        toplam_tutar=float(iade.toplam_tutar) if iade.toplam_tutar else None,
        fire_miktari=float(iade.fire_miktari) if iade.fire_miktari else None,
        fire_orani=float(iade.fire_orani) if iade.fire_orani else None,
        fire_nedeni=iade.fire_nedeni,
        kalite_kontrol_id=str(iade.kalite_kontrol_id) if iade.kalite_kontrol_id else None,
        kalite_kontrol_sonucu=iade.kalite_kontrol_sonucu,
        stok_giris_id=str(iade.stok_giris_id) if iade.stok_giris_id else None,
        stok_giris_tarihi=iade.stok_giris_tarihi,
        musteri_aciklamasi=iade.musteri_aciklamasi,
        yetkili_aciklama=iade.yetkili_aciklama,
        olusturma_tarihi=iade.olusturma_tarihi
    )
    
    return IadeDetayResponse(
        iade=iade_response,
        kalemler=kalemler,
        satis_bilgisi=satis_bilgisi
    )


@router.put("/{iade_id}", response_model=IadeResponse)
async def update_iade(
    iade_id: str,
    request: IadeUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Update return record.
    """
    iade = db.query(SatisIade).filter(
        SatisIade.id == iade_id,
        SatisIade.silme_tarihi.is_(None)
    ).first()
    
    if not iade:
        raise HTTPException(status_code=404, detail="İade kaydı bulunamadı")
    
    # Only allow update for certain statuses
    if iade.iade_durumu not in ["OLUSTURULDU", "KALITE_KONTROL"]:
        raise HTTPException(
            status_code=400,
            detail="Bu durumdaki iadeler güncellenemez"
        )
    
    # Update fields
    if request.iade_nedeni:
        iade.iade_nedeni = request.iade_nedeni
    if request.musteri_aciklamasi is not None:
        iade.musteri_aciklamasi = request.musteri_aciklamasi
    if request.yetkili_aciklama is not None:
        iade.yetkili_aciklama = request.yetkili_aciklama
    if request.fire_miktari is not None:
        iade.fire_miktari = request.fire_miktari
    if request.fire_orani is not None:
        iade.fire_orani = request.fire_orani
    if request.fire_nedeni is not None:
        iade.fire_nedeni = request.fire_nedeni
    
    db.commit()
    db.refresh(iade)
    
    return IadeResponse(
        id=str(iade.id),
        satis_id=str(iade.satis_id),
        musteri_id=str(iade.musteri_id),
        iade_no=iade.iade_no,
        iade_tarihi=iade.iade_tarihi,
        iade_durumu=iade.iade_durumu,
        iade_nedeni=iade.iade_nedeni,
        toplam_miktar=float(iade.toplam_miktar),
        toplam_tutar=float(iade.toplam_tutar) if iade.toplam_tutar else None,
        fire_miktari=float(iade.fire_miktari) if iade.fire_miktari else None,
        fire_orani=float(iade.fire_orani) if iade.fire_orani else None,
        fire_nedeni=iade.fire_nedeni,
        kalite_kontrol_id=str(iade.kalite_kontrol_id) if iade.kalite_kontrol_id else None,
        kalite_kontrol_sonucu=iade.kalite_kontrol_sonucu,
        stok_giris_id=str(iade.stok_giris_id) if iade.stok_giris_id else None,
        stok_giris_tarihi=iade.stok_giris_tarihi,
        musteri_aciklamasi=iade.musteri_aciklamasi,
        yetkili_aciklama=iade.yetkili_aciklama,
        olusturma_tarihi=iade.olusturma_tarihi
    )


@router.patch("/{iade_id}/durum", response_model=IadeResponse)
async def update_iade_durum(
    iade_id: str,
    request: IadeDurumUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Update return status.
    
    Valid transitions:
    - OLUSTURULDU -> KALITE_KONTROL
    - KALITE_KONTROL -> STOK_GIRISI
    - KALITE_KONTROL -> RET
    - STOK_GIRISI -> TAMAMLANDI
    """
    iade = db.query(SatisIade).filter(
        SatisIade.id == iade_id,
        SatisIade.silme_tarihi.is_(None)
    ).first()
    
    if not iade:
        raise HTTPException(status_code=404, detail="İade kaydı bulunamadı")
    
    # Validate status transition
    valid_transitions = {
        "OLUSTURULDU": ["KALITE_KONTROL"],
        "KALITE_KONTROL": ["STOK_GIRISI", "RET"],
        "STOK_GIRISI": ["TAMAMLANDI"]
    }
    
    allowed = valid_transitions.get(iade.iade_durumu, [])
    if request.iade_durumu not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Geçersiz durum geçişi: {iade.iade_durumu} -> {request.iade_durumu}"
        )
    
    # Update status
    iade.iade_durumu = request.iade_durumu
    
    # Update fire info if provided
    if request.fire_miktari is not None:
        iade.fire_miktari = request.fire_miktari
    if request.fire_nedeni is not None:
        iade.fire_nedeni = request.fire_nedeni
    if request.kalite_kontrol_sonucu is not None:
        iade.kalite_kontrol_sonucu = request.kalite_kontrol_sonucu
    
    # Calculate fire rate if fire amount is set
    if iade.fire_miktari and iade.toplam_miktar:
        iade.fire_orani = float(iade.fire_miktari) / float(iade.toplam_miktar)
    
    db.commit()
    db.refresh(iade)
    
    return IadeResponse(
        id=str(iade.id),
        satis_id=str(iade.satis_id),
        musteri_id=str(iade.musteri_id),
        iade_no=iade.iade_no,
        iade_tarihi=iade.iade_tarihi,
        iade_durumu=iade.iade_durumu,
        iade_nedeni=iade.iade_nedeni,
        toplam_miktar=float(iade.toplam_miktar),
        toplam_tutar=float(iade.toplam_tutar) if iade.toplam_tutar else None,
        fire_miktari=float(iade.fire_miktari) if iade.fire_miktari else None,
        fire_orani=float(iade.fire_orani) if iade.fire_orani else None,
        fire_nedeni=iade.fire_nedeni,
        kalite_kontrol_id=str(iade.kalite_kontrol_id) if iade.kalite_kontrol_id else None,
        kalite_kontrol_sonucu=iade.kalite_kontrol_sonucu,
        stok_giris_id=str(iade.stok_giris_id) if iade.stok_giris_id else None,
        stok_giris_tarihi=iade.stok_giris_tarihi,
        musteri_aciklamasi=iade.musteri_aciklamasi,
        yetkili_aciklama=iade.yetkili_aciklama,
        olusturma_tarihi=iade.olusturma_tarihi
    )


@router.post("/{iade_id}/stok-giris", response_model=StokGirisResponse)
async def create_iade_stok_girisi(
    iade_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Create stock entry from return.
    
    When iade_durumu changes to STOK_GIRISI:
    - Create new StokKarti (lot with iade flag) or update existing
    - Set stok_giris_id, stok_giris_tarihi
    """
    iade = db.query(SatisIade).filter(
        SatisIade.id == iade_id,
        SatisIade.silme_tarihi.is_(None)
    ).first()
    
    if not iade:
        raise HTTPException(status_code=404, detail="İade kaydı bulunamadı")
    
    # Check if already processed
    if iade.stok_giris_id:
        raise HTTPException(
            status_code=400,
            detail="Bu iade için zaten stok girişi yapılmış"
        )
    
    # Update status to STOK_GIRISI
    iade.iade_durumu = "STOK_GIRISI"
    giris_tarihi = datetime.utcnow().isoformat()
    iade.stok_giris_tarihi = giris_tarihi
    
    # Get return items (from IadeNumune as proxy for items)
    numuneler = db.query(IadeNumune).filter(
        IadeNumune.iade_id == iade_id
    ).all()
    
    # If no items, create single lot with total iade amount
    if not numuneler:
        # Create mock items from iade record
        satir_tarihi = datetime.utcnow()
        satir_no_str = satir_tarihi.strftime("%Y%m%d")
        count = db.query(func.count(StokKarti.id)).filter(
            StokKarti.lot_no.like(f"RET-{satir_no_str}-%")
        ).scalar() or 0
        lot_no = f"RET-{satir_no_str}-{str(count + 1).zfill(3)}"
        
        # Calculate acceptance amount (total - fire)
        fire = float(iade.fire_miktari) if iade.fire_miktari else 0
        kabul_miktari = float(iade.toplam_miktar) - fire
        
        # Calculate unit price from total
        birim_fiyat = (
            float(iade.toplam_tutar) / float(iade.toplam_miktar)
            if iade.toplam_miktar > 0 else 0
        )
        
        # Create stock card
        stok = StokKarti(
            urun_id=iade.satis_id,  # Placeholder, should get from sale items
            lot_no=lot_no,
            stok_tipi="MAMUL",
            birim="kg",
            miktar=kabul_miktari,
            birim_fiyat=birim_fiyat,
            giris_tarihi=giris_tarihi,
            giris_referans_no=f"IADE:{iade.iade_no}",
            konum="IADE_DEPO",
            durum="AKTIF",
            iade_id=str(iade.id),
            olusturan_kullanici_id=current_user.id
        )
        db.add(stok)
        db.flush()
        
        # Update iade with stok reference
        iade.stok_giris_id = stok.id
        
        # Create movement
        hareket = StokHareket(
            stok_id=stok.id,
            hareket_tipi="IADE_GIRIS",
            miktar=kabul_miktari,
            onceki_miktar=0,
            sonraki_miktar=kabul_miktari,
            birim_fiyat=birim_fiyat,
            tutar=kabul_miktari * birim_fiyat,
            referans_tipi="IADE",
            referans_id=str(iade.id),
            lot_no=lot_no,
            iade_id=str(iade.id),
            olusturan_kullanici_id=current_user.id
        )
        db.add(hareket)
    else:
        # Multiple items - create multiple stock cards
        for numune in numuneler:
            # Similar logic for each sample
            pass
    
    db.commit()
    
    # Get the created stock entry
    stok = db.query(StokKarti).filter(
        StokKarti.iade_id == str(iade.id)
    ).first()
    
    if not stok:
        raise HTTPException(status_code=500, detail="Stok girişi oluşturulamadı")
    
    # Update iade reference
    iade.stok_giris_id = stok.id
    db.commit()
    
    fire_miktar = float(iade.fire_miktari) if iade.fire_miktari else 0
    kabul_miktar = float(iade.toplam_miktar) - fire_miktar
    
    return StokGirisResponse(
        stok_giris_id=str(stok.id),
        lot_no=stok.lot_no,
        iade_id=str(iade.id),
        toplam_miktar=float(iade.toplam_miktar),
        fire_miktari=fire_miktar,
        kabul_miktari=kabul_miktar
    )


@router.get("/{iade_id}/lot-kaynak", response_model=LotKaynakResponse)
async def get_iade_lot_kaynak(
    iade_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Get return lot source information for traceability.
    
    Returns:
    - Original sale lot information
    - Return lot (if created)
    - Full traceability chain
    """
    iade = db.query(SatisIade).filter(
        SatisIade.id == iade_id,
        SatisIade.silme_tarihi.is_(None)
    ).first()
    
    if not iade:
        raise HTTPException(status_code=404, detail="İade kaydı bulunamadı")
    
    # Get original sale
    satis = db.query(SatisKaydi).filter(SatisKaydi.id == iade.satis_id).first()
    
    # Get original stock entries for this sale
    original_lots = []
    if satis:
        hareketler = db.query(StokHareket).filter(
            StokHareket.referans_id == str(satis.id),
            StokHareket.hareket_tipi.in_(["SATIS_CIKIS", "GIRIS"])
        ).all()
        
        for h in hareketler:
            stok = db.query(StokKarti).filter(StokKarti.id == h.stok_id).first()
            if stok:
                original_lots.append({
                    "lot_no": stok.lot_no,
                    "urun_id": str(stok.urun_id),
                    "miktar": float(h.miktar) if h.miktar else 0,
                    "birim_fiyat": float(stok.birim_fiyat) if stok.birim_fiyat else 0,
                    "giris_tarihi": stok.giris_tarihi
                })
    
    # Get return lot (if created)
    return_lot = None
    if iade.stok_giris_id:
        stok = db.query(StokKarti).filter(StokKarti.id == iade.stok_giris_id).first()
        if stok:
            return_lot = {
                "lot_no": stok.lot_no,
                "miktar": float(stok.miktar),
                "birim_fiyat": float(stok.birim_fiyat) if stok.birim_fiyat else 0,
                "giris_tarihi": stok.giris_tarihi
            }
    
    satis_lot_no = original_lots[0]["lot_no"] if original_lots else None
    satis_tarihi = satis.satis_tarihi if satis else None
    
    kaynak_bilgisi = {
        "orijinal_lotlar": original_lots,
        "iade_lot": return_lot,
        "fire_miktari": float(iade.fire_miktari) if iade.fire_miktari else 0,
        "fire_orani": float(iade.fire_orani) if iade.fire_orani else 0,
        "fire_nedeni": iade.fire_nedeni,
        "kalite_kontrol_sonucu": iade.kalite_kontrol_sonucu
    }
    
    return LotKaynakResponse(
        iade_id=str(iade.id),
        iade_no=iade.iade_no,
        satis_id=str(iade.satis_id),
        satis_lot_no=satis_lot_no or "",
        satis_tarihi=satis_tarihi or "",
        iade_lot_no=return_lot["lot_no"] if return_lot else None,
        stok_giris_tarihi=iade.stok_giris_tarihi,
        kaynak_bilgisi=kaynak_bilgisi
    )
