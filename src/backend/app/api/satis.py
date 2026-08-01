"""
Sales API router
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel
from decimal import Decimal

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import Kullanici
from app.models.satis import SatisKaydi, SatisKalemi
from app.models.stok import StokKarti, StokHareket
from app.models.urun import Urun
from app.models.musteri import Musteri

router = APIRouter()


class SatisKalemRequest(BaseModel):
    urun_id: str
    miktar: float
    birim_fiyat: float


class SatisCreateRequest(BaseModel):
    musteri_id: str
    kalemler: List[SatisKalemRequest]
    teslimat_adresi: Optional[str] = None
    odeme_sekli: Optional[str] = None
    not_text: Optional[str] = None


class SatisKalemResponse(BaseModel):
    id: str
    urun_id: str
    urun_ad: Optional[str]
    lot_no: Optional[str]
    miktar: float
    birim_fiyat: float
    tutar: float

    class Config:
        from_attributes = True


class SatisResponse(BaseModel):
    id: str
    satis_no: str
    musteri_id: str
    musteri_ad: Optional[str]
    tarih: str
    durum: str
    odeme_durumu: Optional[str]
    toplam_tutar: float
    indirim_tutari: Optional[float]
    not_text: Optional[str]
    kalemler: List[SatisKalemResponse]

    class Config:
        from_attributes = True


class SatisListResponse(BaseModel):
    data: List[SatisResponse]
    total: int
    sayfa: int
    sayfa_boyutu: int


def generate_satis_no(db: Session) -> str:
    """Generate sales number: SAT-YYYYMMDD-XXX"""
    today = datetime.utcnow().strftime("%Y%m%d")
    count = db.query(SatisKaydi).filter(
        SatisKaydi.satis_no.like(f"SAT-{today}-%")
    ).count()
    return f"SAT-{today}-{str(count + 1).zfill(3)}"


def kalem_to_response(k: SatisKalemi, db: Session) -> SatisKalemResponse:
    urun = db.query(Urun).filter(Urun.id == k.urun_id).first()
    return SatisKalemResponse(
        id=str(k.id),
        urun_id=str(k.urun_id),
        urun_ad=urun.ad if urun else None,
        lot_no=k.lot_no,
        miktar=float(k.miktar),
        birim_fiyat=float(k.birim_fiyat),
        tutar=float(k.tutar)
    )


@router.get("/", response_model=SatisListResponse)
async def list_satis(
    sayfa: int = Query(1, ge=1),
    sayfa_boyutu: int = Query(20, ge=1, le=100),
    musteri_id: Optional[str] = None,
    durum: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """List sales records."""
    query = db.query(SatisKaydi).filter(SatisKaydi.silme_tarihi.is_(None))
    
    if musteri_id:
        query = query.filter(SatisKaydi.musteri_id == musteri_id)
    if durum:
        query = query.filter(SatisKaydi.durum == durum)
    
    total = query.count()
    kayitlar = query.order_by(SatisKaydi.tarih.desc()).offset((sayfa - 1) * sayfa_boyutu).limit(sayfa_boyutu).all()
    
    result = []
    for s in kayitlar:
        musteri = db.query(Musteri).filter(Musteri.id == s.musteri_id).first()
        kalemler = db.query(SatisKalemi).filter(SatisKalemi.satis_id == s.id).all()
        
        result.append(SatisResponse(
            id=str(s.id),
            satis_no=s.satis_no,
            musteri_id=str(s.musteri_id),
            musteri_ad=musteri.ad if musteri else None,
            tarih=s.tarih,
            durum=s.durum,
            odeme_durumu=s.odeme_durumu,
            toplam_tutar=float(s.toplam_tutar),
            indirim_tutari=float(s.indirim_tutari) if s.indirim_tutari else None,
            not_text=s.not_text,
            kalemler=[kalem_to_response(k, db) for k in kalemler]
        ))
    
    return SatisListResponse(
        data=result,
        total=total,
        sayfa=sayfa,
        sayfa_boyutu=sayfa_boyutu
    )


@router.post("/", response_model=SatisResponse)
async def create_satis(
    request: SatisCreateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Create new sale with FIFO stock deduction."""
    # Verify customer
    musteri = db.query(Musteri).filter(
        Musteri.id == request.musteri_id,
        Musteri.silme_tarihi.is_(None)
    ).first()
    if not musteri:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    satis_no = generate_satis_no(db)
    
    # Calculate total and process each line with FIFO
    toplam_tutar = Decimal("0")
    kalemler_olustur = []
    
    for kalem in request.kalemler:
        urun = db.query(Urun).filter(Urun.id == kalem.urun_id).first()
        if not urun:
            raise HTTPException(status_code=404, detail=f"Ürün bulunamadı: {kalem.urun_id}")
        
        tutar = Decimal(str(kalem.miktar)) * Decimal(str(kalem.birim_fiyat))
        toplam_tutar += tutar
        
        # FIFO: Find and deduct stock
        remaining = kalem.miktar
        lots_used = []
        
        stoklar = db.query(StokKarti).filter(
            StokKarti.urun_id == kalem.urun_id,
            StokKarti.stok_tipi == "MAMUL",
            StokKarti.durum == "AKTIF",
            StokKarti.miktar > 0,
            StokKarti.silme_tarihi.is_(None)
        ).order_by(StokKarti.giris_tarihi.asc()).all()
        
        if not stoklar:
            raise HTTPException(
                status_code=400,
                detail=f"Ürün '{urun.ad}' için stok yetersiz"
            )
        
        for stok in stoklar:
            if remaining <= 0:
                break
            
            take = min(float(stok.miktar), remaining)
            
            # Create stock movement
            hareket = StokHareket(
                stok_id=stok.id,
                hareket_tipi="SATIS_CIKIS",
                miktar=-take,
                onceki_miktar=float(stok.miktar),
                sonraki_miktar=float(stok.miktar) - take,
                birim_fiyat=float(stok.birim_fiyat),
                tutar=take * float(stok.birim_fiyat),
                referans_tipi="SATIS",
                musteri_id=request.musteri_id,
                lot_no=stok.lot_no,
                olusturan_kullanici_id=current_user.id
            )
            db.add(hareket)
            
            # Update stock
            stok.miktar = float(stok.miktar) - take
            if stok.miktar <= 0:
                stok.durum = "BITTI"
            
            lots_used.append({
                "stok_id": str(stok.id),
                "lot_no": stok.lot_no,
                "miktar": take
            })
            remaining -= take
        
        if remaining > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Ürün '{urun.ad}' için yetersiz stok! Eksik: {remaining}"
            )
        
        # Record first lot used for this line
        birincil_lot = lots_used[0]["lot_no"] if lots_used else None
        
        kalemler_olustur.append({
            "urun_id": kalem.urun_id,
            "lot_no": birincil_lot,
            "miktar": kalem.miktar,
            "birim_fiyat": kalem.birim_fiyat,
            "tutar": float(tutar)
        })
    
    # Create sale record
    satis = SatisKaydi(
        satis_no=satis_no,
        musteri_id=request.musteri_id,
        tarih=datetime.utcnow().isoformat(),
        durum="TAMAMLANDI",
        toplam_tutar=float(toplam_tutar),
        teslimat_adresi=request.teslimat_adresi,
        odeme_sekli=request.odeme_sekli,
        not_text=request.not_text,
        olusturan_kullanici_id=current_user.id
    )
    db.add(satis)
    db.flush()
    
    # Create sale line items
    for k in kalemler_olustur:
        kalem = SatisKalemi(
            satis_id=satis.id,
            urun_id=k["urun_id"],
            lot_no=k["lot_no"],
            miktar=k["miktar"],
            birim_fiyat=k["birim_fiyat"],
            tutar=k["tutar"]
        )
        db.add(kalem)
    
    db.commit()
    db.refresh(satis)
    
    # Get created line items
    created_kalemler = db.query(SatisKalemi).filter(SatisKalemi.satis_id == satis.id).all()
    
    return SatisResponse(
        id=str(satis.id),
        satis_no=satis.satis_no,
        musteri_id=str(satis.musteri_id),
        musteri_ad=musteri.ad,
        tarih=satis.tarih,
        durum=satis.durum,
        odeme_durumu=satis.odeme_durumu,
        toplam_tutar=float(satis.toplam_tutar),
        indirim_tutari=float(satis.indirim_tutari) if satis.indirim_tutari else None,
        not_text=satis.not_text,
        kalemler=[kalem_to_response(k, db) for k in created_kalemler]
    )


@router.get("/{satis_id}", response_model=SatisResponse)
async def get_satis(
    satis_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Get sale by ID."""
    satis = db.query(SatisKaydi).filter(
        SatisKaydi.id == satis_id,
        SatisKaydi.silme_tarihi.is_(None)
    ).first()
    
    if not satis:
        raise HTTPException(status_code=404, detail="Satış kaydı bulunamadı")
    
    musteri = db.query(Musteri).filter(Musteri.id == satis.musteri_id).first()
    kalemler = db.query(SatisKalemi).filter(SatisKalemi.satis_id == satis.id).all()
    
    return SatisResponse(
        id=str(satis.id),
        satis_no=satis.satis_no,
        musteri_id=str(satis.musteri_id),
        musteri_ad=musteri.ad if musteri else None,
        tarih=satis.tarih,
        durum=satis.durum,
        odeme_durumu=satis.odeme_durumu,
        toplam_tutar=float(satis.toplam_tutar),
        indirim_tutari=float(satis.indirim_tutari) if satis.indirim_tutari else None,
        not_text=satis.not_text,
        kalemler=[kalem_to_response(k, db) for k in kalemler]
    )


@router.post("/{satis_id}/iptal")
async def iptal_satis(
    satis_id: str,
    iade_nedeni: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Cancel sale and return stock (simplified - returns to first available lot)."""
    satis = db.query(SatisKaydi).filter(
        SatisKaydi.id == satis_id,
        SatisKaydi.silme_tarihi.is_(None)
    ).first()
    
    if not satis:
        raise HTTPException(status_code=404, detail="Satış kaydı bulunamadı")
    
    if satis.durum == "IPTAL":
        raise HTTPException(status_code=400, detail="Satış zaten iptal edilmiş")
    
    # Get line items
    kalemler = db.query(SatisKalemi).filter(SatisKalemi.satis_id == satis.id).all()
    
    for kalem in kalemler:
        # Find any available lot for this product
        stok = db.query(StokKarti).filter(
            StokKarti.urun_id == kalem.urun_id,
            StokKarti.stok_tipi == "MAMUL",
            StokKarti.durum.in_(["AKTIF", "KALITE_KONTROL"]),
            StokKarti.silme_tarihi.is_(None)
        ).first()
        
        if stok:
            onceki = float(stok.miktar)
            stok.miktar = float(stok.miktar) + kalem.miktar
            
            hareket = StokHareket(
                stok_id=stok.id,
                hareket_tipi="IADE",
                miktar=kalem.miktar,
                onceki_miktar=onceki,
                sonraki_miktar=float(stok.miktar),
                birim_fiyat=float(kalem.birim_fiyat),
                tutar=float(kalem.tutar),
                referans_id=satis.id,
                referans_tipi="SATIS",
                musteri_id=satis.musteri_id,
                lot_no=stok.lot_no,
                aciklama=f"İade: {iade_nedeni}",
                olusturan_kullanici_id=current_user.id
            )
            db.add(hareket)
    
    satis.durum = "IPTAL"
    satis.iade_nedeni = iade_nedeni
    satis.iade_tarihi = datetime.utcnow().isoformat()
    
    db.commit()
    
    return {"message": "Satış iptal edildi", "satis_no": satis.satis_no}
