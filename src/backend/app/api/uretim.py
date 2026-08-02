"""
Production API router
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from decimal import Decimal

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import Kullanici
from app.models.uretim import UretimEmri, UretimDetay
from app.models.stok import StokKarti, StokHareket
from app.models.urun import Urun
from app.models.tedarikci import Tedarikci

router = APIRouter()


class UretimDetayRequest(BaseModel):
    mamul_urun_id: str
    mamul_miktar: float
    hammadde_urun_id: str
    hammadde_lot_no: Optional[str] = None
    hammadde_miktar: float


class UretimCreateRequest(BaseModel):
    not_text: Optional[str] = None
    oncelik: str = "NORMAL"
    planlanan_miktar: Optional[float] = None
    planlanan_tarih: Optional[str] = None
    detaylar: List[UretimDetayRequest]


class UretimUpdateRequest(BaseModel):
    not_text: Optional[str] = None
    oncelik: Optional[str] = None
    planlanan_miktar: Optional[float] = None
    planlanan_tarih: Optional[str] = None


class UretimDetayResponse(BaseModel):
    id: str
    mamul_urun_id: str
    mamul_urun_ad: Optional[str]
    mamul_miktar: float
    birim: Optional[str]  # from mamul product
    hammadde_urun_id: str
    hammadde_urun_ad: Optional[str]
    hammadde_lot_no: Optional[str]
    hammadde_miktar: float
    fire_miktari: Optional[float]

    class Config:
        from_attributes = True


class UretimResponse(BaseModel):
    id: str
    uretim_no: str
    tarih: str
    durum: str
    not_text: Optional[str]
    oncelik: str
    planlanan_miktar: Optional[float]
    gerceklesen_miktar: Optional[float]
    planlanan_tarih: Optional[str]
    tamamlama_tarihi: Optional[str]
    toplam_maliyet: Optional[float]
    detaylar: List[UretimDetayResponse]

    class Config:
        from_attributes = True


class UretimListResponse(BaseModel):
    data: List[UretimResponse]
    total: int
    sayfa: int
    sayfa_boyutu: int


def generate_uretim_no(db: Session) -> str:
    """Generate production order number: URET-YYYYMMDD-XXX"""
    today = datetime.utcnow().strftime("%Y%m%d")
    count = db.query(UretimEmri).filter(
        UretimEmri.uretim_no.like(f"URET-{today}-%")
    ).count()
    return f"URET-{today}-{str(count + 1).zfill(3)}"


def detay_to_response(d: UretimDetay, db: Session) -> UretimDetayResponse:
    mamul = db.query(Urun).filter(Urun.id == d.mamul_urun_id).first()
    hammadde = db.query(Urun).filter(Urun.id == d.hammadde_urun_id).first()
    
    return UretimDetayResponse(
        id=str(d.id),
        mamul_urun_id=str(d.mamul_urun_id),
        mamul_urun_ad=mamul.ad if mamul else None,
        mamul_miktar=float(d.mamul_miktar),
        birim=mamul.birim_toptan if mamul else None,
        hammadde_urun_id=str(d.hammadde_urun_id),
        hammadde_urun_ad=hammadde.ad if hammadde else None,
        hammadde_lot_no=d.hammadde_lot_no,
        hammadde_miktar=float(d.hammadde_miktar),
        fire_miktari=float(d.fire_miktari) if d.fire_miktari else None
    )


@router.get("/", response_model=UretimListResponse)
async def list_uretim(
    sayfa: int = Query(1, ge=1),
    sayfa_boyutu: int = Query(20, ge=1, le=100),
    durum: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """List production orders."""
    query = db.query(UretimEmri).filter(UretimEmri.silme_tarihi.is_(None))
    
    if durum:
        query = query.filter(UretimEmri.durum == durum)
    
    total = query.count()
    emirler = query.order_by(UretimEmri.tarih.desc()).offset((sayfa - 1) * sayfa_boyutu).limit(sayfa_boyutu).all()
    
    result = []
    for e in emirler:
        detaylar = db.query(UretimDetay).filter(UretimDetay.uretim_id == e.id).all()
        result.append(UretimResponse(
            id=str(e.id),
            uretim_no=e.uretim_no,
            tarih=e.tarih,
            durum=e.durum,
            not_text=e.not_text,
            oncelik=e.oncelik,
            planlanan_miktar=float(e.planlanan_miktar) if e.planlanan_miktar else None,
            gerceklesen_miktar=float(e.gerceklesen_miktar) if e.gerceklesen_miktar else None,
            planlanan_tarih=e.planlanan_tarih,
            tamamlama_tarihi=e.tamamlama_tarihi,
            toplam_maliyet=float(e.toplam_maliyet) if e.toplam_maliyet else None,
            detaylar=[detay_to_response(d, db) for d in detaylar]
        ))
    
    return UretimListResponse(
        data=result,
        total=total,
        sayfa=sayfa,
        sayfa_boyutu=sayfa_boyutu
    )


@router.post("/", response_model=UretimResponse)
async def create_uretim(
    request: UretimCreateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Create new production order."""
    uretim_no = generate_uretim_no(db)
    
    uretim = UretimEmri(
        uretim_no=uretim_no,
        tarih=datetime.utcnow().isoformat(),
        durum="BEKLEMEDE",
        not_text=request.not_text,
        oncelik=request.oncelik,
        planlanan_miktar=request.planlanan_miktar,
        planlanan_tarih=request.planlanan_tarih,
        olusturan_kullanici_id=current_user.id
    )
    
    db.add(uretim)
    db.flush()
    
    # Add details
    for d in request.detaylar:
        detay = UretimDetay(
            uretim_id=uretim.id,
            mamul_urun_id=d.mamul_urun_id,
            mamul_miktar=d.mamul_miktar,
            hammadde_urun_id=d.hammadde_urun_id,
            hammadde_lot_no=d.hammadde_lot_no,
            hammadde_miktar=d.hammadde_miktar
        )
        db.add(detay)
    
    db.commit()
    db.refresh(uretim)
    
    detaylar = db.query(UretimDetay).filter(UretimDetay.uretim_id == uretim.id).all()
    
    return UretimResponse(
        id=str(uretim.id),
        uretim_no=uretim.uretim_no,
        tarih=uretim.tarih,
        durum=uretim.durum,
        not_text=uretim.not_text,
        oncelik=uretim.oncelik,
        planlanan_miktar=float(uretim.planlanan_miktar) if uretim.planlanan_miktar else None,
        gerceklesen_miktar=None,  # Not set until production is completed
        planlanan_tarih=uretim.planlanan_tarih,
        tamamlama_tarihi=uretim.tamamlama_tarihi,
        toplam_maliyet=float(uretim.toplam_maliyet) if uretim.toplam_maliyet else None,
        detaylar=[detay_to_response(d, db) for d in detaylar]
    )


@router.post("/{uretim_id}/tamamla", response_model=dict)
async def tamamla_uretim(
    uretim_id: str,
    gerceklesen_miktar: float,
    fire_miktari: float = 0,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Complete production and create finished goods lot."""
    uretim = db.query(UretimEmri).filter(
        UretimEmri.id == uretim_id,
        UretimEmri.silme_tarihi.is_(None)
    ).first()
    
    if not uretim:
        raise HTTPException(status_code=404, detail="Üretim emri bulunamadı")
    
    if uretim.durum == "TAMAMLANDI":
        raise HTTPException(status_code=400, detail="Üretim zaten tamamlanmış")
    
    # Get details
    detaylar = db.query(UretimDetay).filter(UretimDetay.uretim_id == uretim.id).all()
    if not detaylar:
        raise HTTPException(status_code=400, detail="Üretim detayı bulunamadı")
    
    # First detail is the main product
    main_detay = detaylar[0]
    
    # Calculate total cost from raw materials
    toplam_maliyet = Decimal("0")
    
    for detay in detaylar:
        # Find and update raw material stock
        hammadde_lot = db.query(StokKarti).filter(
            StokKarti.lot_no == detay.hammadde_lot_no,
            StokKarti.silme_tarihi.is_(None)
        ).first()
        
        if not hammadde_lot:
            raise HTTPException(
                status_code=400,
                detail=f"Hammadde lotu bulunamadı: {detay.hammadde_lot_no}"
            )
        
        # Stock output for raw material
        onceki_miktar = float(hammadde_lot.miktar)
        hammadde_miktar_val = float(detay.hammadde_miktar)
        hammadde_lot.miktar = float(hammadde_lot.miktar) - hammadde_miktar_val
        if hammadde_lot.miktar <= 0:
            hammadde_lot.durum = "BITTI"
        
        hareket = StokHareket(
            stok_id=hammadde_lot.id,
            hareket_tipi="URETIM_CIKIS",
            miktar=-hammadde_miktar_val,
            onceki_miktar=onceki_miktar,
            sonraki_miktar=float(hammadde_lot.miktar),
            birim_fiyat=float(hammadde_lot.birim_fiyat),
            tutar=hammadde_miktar_val * float(hammadde_lot.birim_fiyat),
            referans_id=uretim.id,
            referans_tipi="URETIM",
            lot_no=detay.hammadde_lot_no,
            olusturan_kullanici_id=current_user.id
        )
        db.add(hareket)
        
        toplam_maliyet += Decimal(str(hammadde_miktar_val)) * hammadde_lot.birim_fiyat
        
        # Update fire tracking
        detay.fire_miktari = fire_miktari
    
    # Create finished goods lot
    mamul = db.query(Urun).filter(Urun.id == main_detay.mamul_urun_id).first()
    if not mamul:
        raise HTTPException(status_code=404, detail="Mamul ürün bulunamadı")
    
    # Get source raw material lot for traceability
    kaynak_stok = None
    if main_detay.hammadde_lot_no:
        kaynak_stok = db.query(StokKarti).filter(
            StokKarti.lot_no == main_detay.hammadde_lot_no,
            StokKarti.silme_tarihi.is_(None)
        ).first()
    
    # Generate lot number
    today = datetime.utcnow().strftime("%Y%m%d")
    count = db.query(StokKarti).filter(
        StokKarti.lot_no.like(f"MAM-{today}-%")
    ).count()
    lot_no = f"MAM-{today}-{str(count + 1).zfill(3)}"
    
    # Calculate unit price
    birim_fiyat = toplam_maliyet / Decimal(str(gerceklesen_miktar)) if gerceklesen_miktar > 0 else Decimal("0")
    
    # Calculate expiry date
    son_kullanma = None
    if mamul.raf_omru_gun:
        from datetime import timedelta
        son_kullanma = (datetime.utcnow() + timedelta(days=mamul.raf_omru_gun)).strftime("%Y-%m-%d")
    
    # Get birim from product
    birim = mamul.birim_toptan or "adet"
    
    mamul_stok = StokKarti(
        urun_id=main_detay.mamul_urun_id,
        lot_no=lot_no,
        stok_tipi="MAMUL",
        birim=birim,
        miktar=gerceklesen_miktar,
        birim_fiyat=float(birim_fiyat),
        uretim_tarihi=datetime.utcnow().strftime("%Y-%m-%d"),
        son_kullanma=son_kullanma,
        giris_tarihi=datetime.utcnow().isoformat(),
        kaynak_stok_id=kaynak_stok.id if kaynak_stok else None,  # Link to source lot for traceability
        tedarikci_id=kaynak_stok.tedarikci_id if kaynak_stok else None,  # Inherit supplier from raw material
        durum="AKTIF",
        olusturan_kullanici_id=current_user.id
    )
    
    db.add(mamul_stok)
    db.flush()
    
    # Stock entry for finished goods
    hareket_giris = StokHareket(
        stok_id=mamul_stok.id,
        hareket_tipi="URETIM_GIRIS",
        miktar=gerceklesen_miktar,
        onceki_miktar=0,
        sonraki_miktar=gerceklesen_miktar,
        birim_fiyat=float(birim_fiyat),
        tutar=float(toplam_maliyet),
        referans_id=uretim.id,
        referans_tipi="URETIM",
        lot_no=lot_no,
        olusturan_kullanici_id=current_user.id
    )
    db.add(hareket_giris)
    
    # Update production order
    uretim.durum = "TAMAMLANDI"
    uretim.tamamlama_tarihi = datetime.utcnow().isoformat()
    uretim.gerceklesen_miktar = gerceklesen_miktar
    uretim.fire_orani_gercek = fire_miktari / (gerceklesen_miktar + fire_miktari) if (gerceklesen_miktar + fire_miktari) > 0 else 0
    uretim.toplam_maliyet = float(toplam_maliyet)
    
    db.commit()
    
    # Build source lot info for traceability
    kaynak_lot_bilgisi = None
    if kaynak_stok:
        kaynak_urun = db.query(Urun).filter(Urun.id == kaynak_stok.urun_id).first()
        kaynak_tedarikci = db.query(Tedarikci).filter(Tedarikci.id == kaynak_stok.tedarikci_id).first() if kaynak_stok.tedarikci_id else None
        kaynak_lot_bilgisi = {
            "lot_no": kaynak_stok.lot_no,
            "urun_ad": kaynak_urun.ad if kaynak_urun else None,
            "tedarikci_ad": kaynak_tedarikci.ad if kaynak_tedarikci else None
        }
    
    return {
        "message": "Üretim tamamlandı",
        "uretim_no": uretim.uretim_no,
        "mamul_lot_no": lot_no,
        "miktar": gerceklesen_miktar,
        "toplam_maliyet": float(toplam_maliyet),
        "kaynak_lot": kaynak_lot_bilgisi
    }


@router.get("/{uretim_id}", response_model=UretimResponse)
async def get_uretim(
    uretim_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Get production order by ID."""
    uretim = db.query(UretimEmri).filter(
        UretimEmri.id == uretim_id,
        UretimEmri.silme_tarihi.is_(None)
    ).first()
    
    if not uretim:
        raise HTTPException(status_code=404, detail="Üretim emri bulunamadı")
    
    detaylar = db.query(UretimDetay).filter(UretimDetay.uretim_id == uretim.id).all()
    
    return UretimResponse(
        id=str(uretim.id),
        uretim_no=uretim.uretim_no,
        tarih=uretim.tarih,
        durum=uretim.durum,
        not_text=uretim.not_text,
        oncelik=uretim.oncelik,
        planlanan_miktar=float(uretim.planlanan_miktar) if uretim.planlanan_miktar else None,
        gerceklesen_miktar=float(uretim.gerceklesen_miktar) if uretim.gerceklesen_miktar else None,
        planlanan_tarih=uretim.planlanan_tarih,
        tamamlama_tarihi=uretim.tamamlama_tarihi,
        toplam_maliyet=float(uretim.toplam_maliyet) if uretim.toplam_maliyet else None,
        detaylar=[detay_to_response(d, db) for d in detaylar]
    )


@router.put("/{uretim_id}", response_model=UretimResponse)
async def update_uretim(
    uretim_id: str,
    request: UretimUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Update production order."""
    uretim = db.query(UretimEmri).filter(
        UretimEmri.id == uretim_id,
        UretimEmri.silme_tarihi.is_(None)
    ).first()
    
    if not uretim:
        raise HTTPException(status_code=404, detail="Üretim emri bulunamadı")
    
    if uretim.durum == "TAMAMLANDI":
        raise HTTPException(status_code=400, detail="Tamamlanmış üretim emri güncellenemez")
    
    # Update fields if provided
    if request.not_text is not None:
        uretim.not_text = request.not_text
    if request.oncelik is not None:
        uretim.oncelik = request.oncelik
    if request.planlanan_miktar is not None:
        uretim.planlanan_miktar = request.planlanan_miktar
    if request.planlanan_tarih is not None:
        uretim.planlanan_tarih = request.planlanan_tarih
    
    db.commit()
    db.refresh(uretim)
    
    detaylar = db.query(UretimDetay).filter(UretimDetay.uretim_id == uretim.id).all()
    
    return UretimResponse(
        id=str(uretim.id),
        uretim_no=uretim.uretim_no,
        tarih=uretim.tarih,
        durum=uretim.durum,
        not_text=uretim.not_text,
        oncelik=uretim.oncelik,
        planlanan_miktar=float(uretim.planlanan_miktar) if uretim.planlanan_miktar else None,
        gerceklesen_miktar=float(uretim.gerceklesen_miktar) if uretim.gerceklesen_miktar else None,
        planlanan_tarih=uretim.planlanan_tarih,
        tamamlama_tarihi=uretim.tamamlama_tarihi,
        toplam_maliyet=float(uretim.toplam_maliyet) if uretim.toplam_maliyet else None,
        detaylar=[detay_to_response(d, db) for d in detaylar]
    )


@router.delete("/{uretim_id}")
async def delete_uretim(
    uretim_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Soft delete production order."""
    uretim = db.query(UretimEmri).filter(
        UretimEmri.id == uretim_id,
        UretimEmri.silme_tarihi.is_(None)
    ).first()
    
    if not uretim:
        raise HTTPException(status_code=404, detail="Üretim emri bulunamadı")
    
    if uretim.durum == "TAMAMLANDI":
        raise HTTPException(status_code=400, detail="Tamamlanmış üretim emri silinemez")
    
    # Soft delete
    uretim.silme_tarihi = datetime.utcnow().isoformat()
    
    db.commit()
    
    return {"message": "Üretim emri silindi"}
