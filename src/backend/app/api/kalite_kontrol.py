"""
Quality Control API - 6-step quality control workflow.
Handles incoming material inspection, production output QC, and shipment QC.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import Kullanici
from app.models.kalite_kontrol import KaliteKontrol, KaliteNumune
from app.models.stok import StokKarti, StokHareket

router = APIRouter()


# =============================================================================
# Pydantic Schemas
# =============================================================================

class KaliteNumuneCreate(BaseModel):
    """Schema for creating a sample record."""
    numune_no: str
    numune_turu: Optional[str] = None  # FIZIKSEL, KIMYASAL, MIKROBIYOLOJIK
    numune_aciklamasi: Optional[str] = None
    sonuc: Optional[str] = None  # GECTI, KALDI, BEKLEMEDE
    sonuc_deger: Optional[str] = None
    referans_deger: Optional[str] = None
    birim: Optional[str] = None
    rapor_url: Optional[str] = None
    foto_url: Optional[str] = None
    kontrol_eden_lab: Optional[str] = None
    lab_rapor_no: Optional[str] = None


class KaliteNumuneResponse(BaseModel):
    """Schema for sample record response."""
    id: str
    kalite_kontrol_id: str
    numune_no: str
    numune_turu: Optional[str]
    numune_aciklamasi: Optional[str]
    sonuc: Optional[str]
    sonuc_deger: Optional[str]
    referans_deger: Optional[str]
    birim: Optional[str]
    rapor_url: Optional[str]
    foto_url: Optional[str]
    kontrol_eden_lab: Optional[str]
    lab_rapor_no: Optional[str]
    olusturma_tarihi: str
    olusturan_kullanici_id: str

    class Config:
        from_attributes = True


class KaliteKontrolCreate(BaseModel):
    """Schema for creating a quality control record."""
    stok_id: str
    kontrol_turu: str  # MAL_KABUL, URETIM, SEVK, RAFSURE
    kontrol_tarihi: Optional[str] = None
    gorsel_kontrol: Optional[bool] = None
    ambalaj_durumu: Optional[str] = None  # IYI, ORTA, ZAYIF
    etiket_okunakli: Optional[bool] = None
    son_kullanma_tarihi: Optional[str] = None
    laboratuvar_sonuclari: Optional[dict] = None
    not_text: Optional[str] = None


class KaliteKontrolUpdate(BaseModel):
    """Schema for updating a quality control record (form data)."""
    gorsel_kontrol: Optional[bool] = None
    ambalaj_durumu: Optional[str] = None
    etiket_okunakli: Optional[bool] = None
    son_kullanma_tarihi: Optional[str] = None
    laboratuvar_sonuclari: Optional[dict] = None
    not_text: Optional[str] = None


class DurumGuncelleRequest(BaseModel):
    """Schema for updating quality control status."""
    durum: str  # KABUL, KISMEN_KABUL, RET
    ret_nedeni: Optional[str] = None
    ret_kriterleri: Optional[List[str]] = None  # ["SKT_GECMIS", "AMBALAJ_HASAR"]
    sonuc_aciklamasi: Optional[str] = None


class OnaylaRequest(BaseModel):
    """Schema for manager approval."""
    onay_leyen_id: str
    onay_notu: Optional[str] = None


class ReddetRequest(BaseModel):
    """Schema for manager rejection."""
    ret_nedeni: str


class KaliteKontrolResponse(BaseModel):
    """Schema for quality control response."""
    id: str
    stok_id: Optional[str]
    uretim_id: Optional[str]
    kontrol_turu: str
    kontrol_eden_id: str
    kontrol_tarihi: str
    durum: str
    gorsel_kontrol: Optional[bool]
    ambalaj_durumu: Optional[str]
    etiket_okunakli: Optional[bool]
    son_kullanma_tarihi: Optional[str]
    laboratuvar_sonuclari: Optional[dict]
    ret_nedeni: Optional[str]
    ret_kriterleri: Optional[List[str]]
    sonuc_aciklamasi: Optional[str]
    onay_durumu: Optional[str]
    onay_leyen_id: Optional[str]
    onay_tarihi: Optional[str]
    olusturma_tarihi: str
    olusturan_kullanici_id: str

    class Config:
        from_attributes = True


class KaliteKontrolListResponse(BaseModel):
    """Schema for paginated quality control list."""
    data: List[KaliteKontrolResponse]
    total: int
    sayfa: int
    sayfa_boyutu: int


class KaliteKontrolDetayResponse(BaseModel):
    """Schema for detailed quality control with samples."""
    id: str
    stok_id: Optional[str]
    uretim_id: Optional[str]
    kontrol_turu: str
    kontrol_eden_id: str
    kontrol_tarihi: str
    durum: str
    gorsel_kontrol: Optional[bool]
    ambalaj_durumu: Optional[str]
    etiket_okunakli: Optional[bool]
    son_kullanma_tarihi: Optional[str]
    laboratuvar_sonuclari: Optional[dict]
    ret_nedeni: Optional[str]
    ret_kriterleri: Optional[List[str]]
    sonuc_aciklamasi: Optional[str]
    onay_durumu: Optional[str]
    onay_leyen_id: Optional[str]
    onay_tarihi: Optional[str]
    olusturma_tarihi: str
    olusturan_kullanici_id: str
    numuneler: List[KaliteNumuneResponse]
    stok_lot_no: Optional[str] = None
    stok_urun_ad: Optional[str] = None

    class Config:
        from_attributes = True


# =============================================================================
# Helper Functions
# =============================================================================

def update_stok_durum(db: Session, stok_id: str, yeni_durum: str) -> None:
    """Update stock card status based on quality control result."""
    stok = db.query(StokKarti).filter(StokKarti.id == stok_id).first()
    if not stok:
        return

    now = datetime.utcnow().isoformat()

    if yeni_durum == "KABUL":
        stok.durum = "AKTIF"
        stok.kalite_kontrol_edildi = True
        stok.kalite_kontrol_tarihi = now
    elif yeni_durum == "RET":
        stok.durum = "RET"
    elif yeni_durum == "KISMEN_KABUL":
        stok.durum = "KALITE_KONTROL"

    db.flush()


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/", response_model=KaliteKontrolListResponse)
async def list_kalite_kontroller(
    sayfa: int = Query(1, ge=1),
    sayfa_boyutu: int = Query(20, ge=1, le=100),
    durum: Optional[str] = None,
    kontrol_turu: Optional[str] = None,
    stok_id: Optional[str] = None,
    tarih: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """List quality control records with filters."""
    query = db.query(KaliteKontrol)

    if durum:
        query = query.filter(KaliteKontrol.durum == durum)
    if kontrol_turu:
        query = query.filter(KaliteKontrol.kontrol_turu == kontrol_turu)
    if stok_id:
        query = query.filter(KaliteKontrol.stok_id == stok_id)
    if tarih:
        query = query.filter(KaliteKontrol.kontrol_tarihi.like(f"{tarih}%"))

    total = query.count()
    kontroller = query.order_by(KaliteKontrol.olusturma_tarihi.desc()).offset(
        (sayfa - 1) * sayfa_boyutu
    ).limit(sayfa_boyutu).all()

    result = [
        KaliteKontrolResponse(
            id=str(k.id),
            stok_id=str(k.stok_id) if k.stok_id else None,
            uretim_id=str(k.uretim_id) if k.uretim_id else None,
            kontrol_turu=k.kontrol_turu,
            kontrol_eden_id=str(k.kontrol_eden_id),
            kontrol_tarihi=k.kontrol_tarihi,
            durum=k.durum,
            gorsel_kontrol=k.gorsel_kontrol,
            ambalaj_durumu=k.ambalaj_durumu,
            etiket_okunakli=k.etiket_okunakli,
            son_kullanma_tarihi=k.son_kullanma_tarihi,
            laboratuvar_sonuclari=k.laboratuvar_sonuclari,
            ret_nedeni=k.ret_nedeni,
            ret_kriterleri=k.ret_kriterleri,
            sonuc_aciklamasi=k.sonuc_aciklamasi,
            onay_durumu=k.onay_durumu,
            onay_leyen_id=str(k.onay_leyen_id) if k.onay_leyen_id else None,
            onay_tarihi=k.onay_tarihi,
            olusturma_tarihi=k.olusturma_tarihi,
            olusturan_kullanici_id=str(k.olusturan_kullanici_id)
        )
        for k in kontroller
    ]

    return KaliteKontrolListResponse(
        data=result,
        total=total,
        sayfa=sayfa,
        sayfa_boyutu=sayfa_boyutu
    )


@router.post("/", response_model=KaliteKontrolResponse, status_code=201)
async def create_kalite_kontrol(
    request: KaliteKontrolCreate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Create a new quality control record."""
    # Check for existing pending record for same stock
    if request.stok_id:
        existing = db.query(KaliteKontrol).filter(
            KaliteKontrol.stok_id == request.stok_id,
            KaliteKontrol.durum.in_(["BEKLIYOR", "KONTROL_EDILIYOR"])
        ).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail="Bu stok için bekleyen kalite kontrol kaydı zaten mevcut"
            )

        # Update stock status to KALITE_KONTROL
        stok = db.query(StokKarti).filter(StokKarti.id == request.stok_id).first()
        if not stok:
            raise HTTPException(status_code=404, detail="Stok kartı bulunamadı")
        stok.durum = "KALITE_KONTROL"

    now = datetime.utcnow().isoformat()
    kontrol_tarihi = request.kontrol_tarihi or now

    kalite_kontrol = KaliteKontrol(
        stok_id=request.stok_id,
        kontrol_turu=request.kontrol_turu,
        kontrol_eden_id=current_user.id,
        kontrol_tarihi=kontrol_tarihi,
        durum="BEKLIYOR",
        gorsel_kontrol=request.gorsel_kontrol,
        ambalaj_durumu=request.ambalaj_durumu,
        etiket_okunakli=request.etiket_okunakli,
        son_kullanma_tarihi=request.son_kullanma_tarihi,
        laboratuvar_sonuclari=request.laboratuvar_sonuclari or {},
        ret_nedeni=None,
        ret_kriterleri=[],
        sonuc_aciklamasi=request.not_text,
        onay_durumu="OTOMATIK",
        olusturan_kullanici_id=current_user.id
    )

    db.add(kalite_kontrol)
    db.commit()
    db.refresh(kalite_kontrol)

    return KaliteKontrolResponse(
        id=str(kalite_kontrol.id),
        stok_id=str(kalite_kontrol.stok_id) if kalite_kontrol.stok_id else None,
        uretim_id=str(kalite_kontrol.uretim_id) if kalite_kontrol.uretim_id else None,
        kontrol_turu=kalite_kontrol.kontrol_turu,
        kontrol_eden_id=str(kalite_kontrol.kontrol_eden_id),
        kontrol_tarihi=kalite_kontrol.kontrol_tarihi,
        durum=kalite_kontrol.durum,
        gorsel_kontrol=kalite_kontrol.gorsel_kontrol,
        ambalaj_durumu=kalite_kontrol.ambalaj_durumu,
        etiket_okunakli=kalite_kontrol.etiket_okunakli,
        son_kullanma_tarihi=kalite_kontrol.son_kullanma_tarihi,
        laboratuvar_sonuclari=kalite_kontrol.laboratuvar_sonuclari,
        ret_nedeni=kalite_kontrol.ret_nedeni,
        ret_kriterleri=kalite_kontrol.ret_kriterleri,
        sonuc_aciklamasi=kalite_kontrol.sonuc_aciklamasi,
        onay_durumu=kalite_kontrol.onay_durumu,
        onay_leyen_id=str(kalite_kontrol.onay_leyen_id) if kalite_kontrol.onay_leyen_id else None,
        onay_tarihi=kalite_kontrol.onay_tarihi,
        olusturma_tarihi=kalite_kontrol.olusturma_tarihi,
        olusturan_kullanici_id=str(kalite_kontrol.olusturan_kullanici_id)
    )


@router.get("/{kk_id}", response_model=KaliteKontrolDetayResponse)
async def get_kalite_kontrol(
    kk_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Get quality control record details with samples."""
    kalite_kontrol = db.query(KaliteKontrol).filter(KaliteKontrol.id == kk_id).first()
    if not kalite_kontrol:
        raise HTTPException(status_code=404, detail="Kalite kontrol kaydı bulunamadı")

    # Get samples
    numuneler = db.query(KaliteNumune).filter(
        KaliteNumune.kalite_kontrol_id == kk_id
    ).order_by(KaliteNumune.olusturma_tarihi.desc()).all()

    # Get stock info
    stok_lot_no = None
    stok_urun_ad = None
    if kalite_kontrol.stok_id:
        stok = db.query(StokKarti).filter(StokKarti.id == kalite_kontrol.stok_id).first()
        if stok:
            stok_lot_no = stok.lot_no
            if stok.urun:
                stok_urun_ad = stok.urun.ad

    return KaliteKontrolDetayResponse(
        id=str(kalite_kontrol.id),
        stok_id=str(kalite_kontrol.stok_id) if kalite_kontrol.stok_id else None,
        uretim_id=str(kalite_kontrol.uretim_id) if kalite_kontrol.uretim_id else None,
        kontrol_turu=kalite_kontrol.kontrol_turu,
        kontrol_eden_id=str(kalite_kontrol.kontrol_eden_id),
        kontrol_tarihi=kalite_kontrol.kontrol_tarihi,
        durum=kalite_kontrol.durum,
        gorsel_kontrol=kalite_kontrol.gorsel_kontrol,
        ambalaj_durumu=kalite_kontrol.ambalaj_durumu,
        etiket_okunakli=kalite_kontrol.etiket_okunakli,
        son_kullanma_tarihi=kalite_kontrol.son_kullanma_tarihi,
        laboratuvar_sonuclari=kalite_kontrol.laboratuvar_sonuclari,
        ret_nedeni=kalite_kontrol.ret_nedeni,
        ret_kriterleri=kalite_kontrol.ret_kriterleri,
        sonuc_aciklamasi=kalite_kontrol.sonuc_aciklamasi,
        onay_durumu=kalite_kontrol.onay_durumu,
        onay_leyen_id=str(kalite_kontrol.onay_leyen_id) if kalite_kontrol.onay_leyen_id else None,
        onay_tarihi=kalite_kontrol.onay_tarihi,
        olusturma_tarihi=kalite_kontrol.olusturma_tarihi,
        olusturan_kullanici_id=str(kalite_kontrol.olusturan_kullanici_id),
        numuneler=[
            KaliteNumuneResponse(
                id=str(n.id),
                kalite_kontrol_id=str(n.kalite_kontrol_id),
                numune_no=n.numune_no,
                numune_turu=n.numune_turu,
                numune_aciklamasi=n.numune_aciklamasi,
                sonuc=n.sonuc,
                sonuc_deger=n.sonuc_deger,
                referans_deger=n.referans_deger,
                birim=n.birim,
                rapor_url=n.rapor_url,
                foto_url=n.foto_url,
                kontrol_eden_lab=n.kontrol_eden_lab,
                lab_rapor_no=n.lab_rapor_no,
                olusturma_tarihi=n.olusturma_tarihi,
                olusturan_kullanici_id=str(n.olusturan_kullanici_id)
            )
            for n in numuneler
        ],
        stok_lot_no=stok_lot_no,
        stok_urun_ad=stok_urun_ad
    )


@router.put("/{kk_id}", response_model=KaliteKontrolResponse)
async def update_kalite_kontrol(
    kk_id: str,
    request: KaliteKontrolUpdate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Update quality control record (form data)."""
    kalite_kontrol = db.query(KaliteKontrol).filter(KaliteKontrol.id == kk_id).first()
    if not kalite_kontrol:
        raise HTTPException(status_code=404, detail="Kalite kontrol kaydı bulunamadı")

    # Only allow update for BEKLIYOR or KONTROL_EDILIYOR status
    if kalite_kontrol.durum not in ["BEKLIYOR", "KONTROL_EDILIYOR"]:
        raise HTTPException(
            status_code=400,
            detail=f"Kalem güncellenemez. Mevcut durum: {kalite_kontrol.durum}"
        )

    # Update fields if provided
    if request.gorsel_kontrol is not None:
        kalite_kontrol.gorsel_kontrol = request.gorsel_kontrol
    if request.ambalaj_durumu is not None:
        kalite_kontrol.ambalaj_durumu = request.ambalaj_durumu
    if request.etiket_okunakli is not None:
        kalite_kontrol.etiket_okunakli = request.etiket_okunakli
    if request.son_kullanma_tarihi is not None:
        kalite_kontrol.son_kullanma_tarihi = request.son_kullanma_tarihi
    if request.laboratuvar_sonuclari is not None:
        kalite_kontrol.laboratuvar_sonuclari = request.laboratuvar_sonuclari
    if request.not_text is not None:
        kalite_kontrol.sonuc_aciklamasi = request.not_text

    # Set status to KONTROL_EDILIYOR if still BEKLIYOR
    if kalite_kontrol.durum == "BEKLIYOR":
        kalite_kontrol.durum = "KONTROL_EDILIYOR"

    db.commit()
    db.refresh(kalite_kontrol)

    return KaliteKontrolResponse(
        id=str(kalite_kontrol.id),
        stok_id=str(kalite_kontrol.stok_id) if kalite_kontrol.stok_id else None,
        uretim_id=str(kalite_kontrol.uretim_id) if kalite_kontrol.uretim_id else None,
        kontrol_turu=kalite_kontrol.kontrol_turu,
        kontrol_eden_id=str(kalite_kontrol.kontrol_eden_id),
        kontrol_tarihi=kalite_kontrol.kontrol_tarihi,
        durum=kalite_kontrol.durum,
        gorsel_kontrol=kalite_kontrol.gorsel_kontrol,
        ambalaj_durumu=kalite_kontrol.ambalaj_durumu,
        etiket_okunakli=kalite_kontrol.etiket_okunakli,
        son_kullanma_tarihi=kalite_kontrol.son_kullanma_tarihi,
        laboratuvar_sonuclari=kalite_kontrol.laboratuvar_sonuclari,
        ret_nedeni=kalite_kontrol.ret_nedeni,
        ret_kriterleri=kalite_kontrol.ret_kriterleri,
        sonuc_aciklamasi=kalite_kontrol.sonuc_aciklamasi,
        onay_durumu=kalite_kontrol.onay_durumu,
        onay_leyen_id=str(kalite_kontrol.onay_leyen_id) if kalite_kontrol.onay_leyen_id else None,
        onay_tarihi=kalite_kontrol.onay_tarihi,
        olusturma_tarihi=kalite_kontrol.olusturma_tarihi,
        olusturan_kullanici_id=str(kalite_kontrol.olusturan_kullanici_id)
    )


@router.patch("/{kk_id}/durum", response_model=KaliteKontrolResponse)
async def update_durum(
    kk_id: str,
    request: DurumGuncelleRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Update quality control status (KABUL/KISMEN_KABUL/RET)."""
    kalite_kontrol = db.query(KaliteKontrol).filter(KaliteKontrol.id == kk_id).first()
    if not kalite_kontrol:
        raise HTTPException(status_code=404, detail="Kalite kontrol kaydı bulunamadı")

    # Validate transition
    if kalite_kontrol.durum not in ["BEKLIYOR", "KONTROL_EDILIYOR"]:
        raise HTTPException(
            status_code=400,
            detail=f"Durum değiştirilemez. Mevcut durum: {kalite_kontrol.durum}"
        )

    # Validate RET requires ret_nedeni and ret_kriterleri
    if request.durum == "RET":
        if not request.ret_nedeni:
            raise HTTPException(status_code=400, detail="Ret durumunda ret_nedeni zorunludur")
        if not request.ret_kriterleri:
            raise HTTPException(status_code=400, detail="Ret durumunda ret_kriterleri zorunludur")

    # Update status
    kalite_kontrol.durum = request.durum
    kalite_kontrol.ret_nedeni = request.ret_nedeni
    kalite_kontrol.ret_kriterleri = request.ret_kriterleri or []
    kalite_kontrol.sonuc_aciklamasi = request.sonuc_aciklamasi

    # Set approval type for KISMEN_KABUL
    if request.durum == "KISMEN_KABUL":
        kalite_kontrol.onay_durumu = "YONETICI_ONAYI"
    elif request.durum == "KABUL":
        kalite_kontrol.onay_durumu = "OTOMATIK"

    # Update stock card status
    if kalite_kontrol.stok_id:
        update_stok_durum(db, kalite_kontrol.stok_id, request.durum)

    db.commit()
    db.refresh(kalite_kontrol)

    return KaliteKontrolResponse(
        id=str(kalite_kontrol.id),
        stok_id=str(kalite_kontrol.stok_id) if kalite_kontrol.stok_id else None,
        uretim_id=str(kalite_kontrol.uretim_id) if kalite_kontrol.uretim_id else None,
        kontrol_turu=kalite_kontrol.kontrol_turu,
        kontrol_eden_id=str(kalite_kontrol.kontrol_eden_id),
        kontrol_tarihi=kalite_kontrol.kontrol_tarihi,
        durum=kalite_kontrol.durum,
        gorsel_kontrol=kalite_kontrol.gorsel_kontrol,
        ambalaj_durumu=kalite_kontrol.ambalaj_durumu,
        etiket_okunakli=kalite_kontrol.etiket_okunakli,
        son_kullanma_tarihi=kalite_kontrol.son_kullanma_tarihi,
        laboratuvar_sonuclari=kalite_kontrol.laboratuvar_sonuclari,
        ret_nedeni=kalite_kontrol.ret_nedeni,
        ret_kriterleri=kalite_kontrol.ret_kriterleri,
        sonuc_aciklamasi=kalite_kontrol.sonuc_aciklamasi,
        onay_durumu=kalite_kontrol.onay_durumu,
        onay_leyen_id=str(kalite_kontrol.onay_leyen_id) if kalite_kontrol.onay_leyen_id else None,
        onay_tarihi=kalite_kontrol.onay_tarihi,
        olusturma_tarihi=kalite_kontrol.olusturma_tarihi,
        olusturan_kullanici_id=str(kalite_kontrol.olusturan_kullanici_id)
    )


@router.post("/{kk_id}/numune", response_model=KaliteNumuneResponse, status_code=201)
async def add_numune(
    kk_id: str,
    request: KaliteNumuneCreate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Add a sample record to quality control."""
    kalite_kontrol = db.query(KaliteKontrol).filter(KaliteKontrol.id == kk_id).first()
    if not kalite_kontrol:
        raise HTTPException(status_code=404, detail="Kalite kontrol kaydı bulunamadı")

    now = datetime.utcnow().isoformat()

    numune = KaliteNumune(
        kalite_kontrol_id=kk_id,
        numune_no=request.numune_no,
        numune_turu=request.numune_turu,
        numune_aciklamasi=request.numune_aciklamasi,
        sonuc=request.sonuc,
        sonuc_deger=request.sonuc_deger,
        referans_deger=request.referans_deger,
        birim=request.birim,
        rapor_url=request.rapor_url,
        foto_url=request.foto_url,
        kontrol_eden_lab=request.kontrol_eden_lab,
        lab_rapor_no=request.lab_rapor_no,
        olusturma_tarihi=now,
        olusturan_kullanici_id=current_user.id
    )

    db.add(numune)
    db.commit()
    db.refresh(numune)

    return KaliteNumuneResponse(
        id=str(numune.id),
        kalite_kontrol_id=str(numune.kalite_kontrol_id),
        numune_no=numune.numune_no,
        numune_turu=numune.numune_turu,
        numune_aciklamasi=numune.numune_aciklamasi,
        sonuc=numune.sonuc,
        sonuc_deger=numune.sonuc_deger,
        referans_deger=numune.referans_deger,
        birim=numune.birim,
        rapor_url=numune.rapor_url,
        foto_url=numune.foto_url,
        kontrol_eden_lab=numune.kontrol_eden_lab,
        lab_rapor_no=numune.lab_rapor_no,
        olusturma_tarihi=numune.olusturma_tarihi,
        olusturan_kullanici_id=str(numune.olusturan_kullanici_id)
    )


@router.get("/{kk_id}/numuneler", response_model=List[KaliteNumuneResponse])
async def list_numuneler(
    kk_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """List samples for a quality control record."""
    kalite_kontrol = db.query(KaliteKontrol).filter(KaliteKontrol.id == kk_id).first()
    if not kalite_kontrol:
        raise HTTPException(status_code=404, detail="Kalite kontrol kaydı bulunamadı")

    numuneler = db.query(KaliteNumune).filter(
        KaliteNumune.kalite_kontrol_id == kk_id
    ).order_by(KaliteNumune.olusturma_tarihi.desc()).all()

    return [
        KaliteNumuneResponse(
            id=str(n.id),
            kalite_kontrol_id=str(n.kalite_kontrol_id),
            numune_no=n.numune_no,
            numune_turu=n.numune_turu,
            numune_aciklamasi=n.numune_aciklamasi,
            sonuc=n.sonuc,
            sonuc_deger=n.sonuc_deger,
            referans_deger=n.referans_deger,
            birim=n.birim,
            rapor_url=n.rapor_url,
            foto_url=n.foto_url,
            kontrol_eden_lab=n.kontrol_eden_lab,
            lab_rapor_no=n.lab_rapor_no,
            olusturma_tarihi=n.olusturma_tarihi,
            olusturan_kullanici_id=str(n.olusturan_kullanici_id)
        )
        for n in numuneler
    ]


@router.post("/{kk_id}/onayla", response_model=KaliteKontrolResponse)
async def approve_kalite_kontrol(
    kk_id: str,
    request: OnaylaRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Manager approval for KISMEN_KABUL quality control (maker-checker)."""
    kalite_kontrol = db.query(KaliteKontrol).filter(KaliteKontrol.id == kk_id).first()
    if not kalite_kontrol:
        raise HTTPException(status_code=404, detail="Kalite kontrol kaydı bulunamadı")

    # Only allow approval for KISMEN_KABUL status
    if kalite_kontrol.durum != "KISMEN_KABUL":
        raise HTTPException(
            status_code=400,
            detail=f"Sadece KISMEN_KABUL durumundaki kayıtlar onaylanabilir. Mevcut durum: {kalite_kontrol.durum}"
        )

    now = datetime.utcnow().isoformat()

    # Update approval info
    kalite_kontrol.durum = "KABUL"
    kalite_kontrol.onay_leyen_id = request.onay_leyen_id
    kalite_kontrol.onay_tarihi = now
    if request.onay_notu:
        kalite_kontrol.sonuc_aciklamasi = (
            (kalite_kontrol.sonuc_aciklamasi or "") + f"\n[ONAY NOTU: {request.onay_notu}]"
        )

    # Update stock card status
    if kalite_kontrol.stok_id:
        update_stok_durum(db, kalite_kontrol.stok_id, "KABUL")

    db.commit()
    db.refresh(kalite_kontrol)

    return KaliteKontrolResponse(
        id=str(kalite_kontrol.id),
        stok_id=str(kalite_kontrol.stok_id) if kalite_kontrol.stok_id else None,
        uretim_id=str(kalite_kontrol.uretim_id) if kalite_kontrol.uretim_id else None,
        kontrol_turu=kalite_kontrol.kontrol_turu,
        kontrol_eden_id=str(kalite_kontrol.kontrol_eden_id),
        kontrol_tarihi=kalite_kontrol.kontrol_tarihi,
        durum=kalite_kontrol.durum,
        gorsel_kontrol=kalite_kontrol.gorsel_kontrol,
        ambalaj_durumu=kalite_kontrol.ambalaj_durumu,
        etiket_okunakli=kalite_kontrol.etiket_okunakli,
        son_kullanma_tarihi=kalite_kontrol.son_kullanma_tarihi,
        laboratuvar_sonuclari=kalite_kontrol.laboratuvar_sonuclari,
        ret_nedeni=kalite_kontrol.ret_nedeni,
        ret_kriterleri=kalite_kontrol.ret_kriterleri,
        sonuc_aciklamasi=kalite_kontrol.sonuc_aciklamasi,
        onay_durumu=kalite_kontrol.onay_durumu,
        onay_leyen_id=str(kalite_kontrol.onay_leyen_id) if kalite_kontrol.onay_leyen_id else None,
        onay_tarihi=kalite_kontrol.onay_tarihi,
        olusturma_tarihi=kalite_kontrol.olusturma_tarihi,
        olusturan_kullanici_id=str(kalite_kontrol.olusturan_kullanici_id)
    )


@router.post("/{kk_id}/reddet", response_model=KaliteKontrolResponse)
async def reject_kalite_kontrol(
    kk_id: str,
    request: ReddetRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Manager rejection for quality control."""
    kalite_kontrol = db.query(KaliteKontrol).filter(KaliteKontrol.id == kk_id).first()
    if not kalite_kontrol:
        raise HTTPException(status_code=404, detail="Kalite kontrol kaydı bulunamadı")

    # Only allow rejection for KISMEN_KABUL status
    if kalite_kontrol.durum != "KISMEN_KABUL":
        raise HTTPException(
            status_code=400,
            detail=f"Sadece KISMEN_KABUL durumundaki kayıtlar reddedilebilir. Mevcut durum: {kalite_kontrol.durum}"
        )

    # Update to RET status
    kalite_kontrol.durum = "RET"
    kalite_kontrol.ret_nedeni = request.ret_nedeni
    kalite_kontrol.ret_kriterleri = kalite_kontrol.ret_kriterleri or ["YONETICI_RET"]

    # Update stock card status
    if kalite_kontrol.stok_id:
        update_stok_durum(db, kalite_kontrol.stok_id, "RET")

    db.commit()
    db.refresh(kalite_kontrol)

    return KaliteKontrolResponse(
        id=str(kalite_kontrol.id),
        stok_id=str(kalite_kontrol.stok_id) if kalite_kontrol.stok_id else None,
        uretim_id=str(kalite_kontrol.uretim_id) if kalite_kontrol.uretim_id else None,
        kontrol_turu=kalite_kontrol.kontrol_turu,
        kontrol_eden_id=str(kalite_kontrol.kontrol_eden_id),
        kontrol_tarihi=kalite_kontrol.kontrol_tarihi,
        durum=kalite_kontrol.durum,
        gorsel_kontrol=kalite_kontrol.gorsel_kontrol,
        ambalaj_durumu=kalite_kontrol.ambalaj_durumu,
        etiket_okunakli=kalite_kontrol.etiket_okunakli,
        son_kullanma_tarihi=kalite_kontrol.son_kullanma_tarihi,
        laboratuvar_sonuclari=kalite_kontrol.laboratuvar_sonuclari,
        ret_nedeni=kalite_kontrol.ret_nedeni,
        ret_kriterleri=kalite_kontrol.ret_kriterleri,
        sonuc_aciklamasi=kalite_kontrol.sonuc_aciklamasi,
        onay_durumu=kalite_kontrol.onay_durumu,
        onay_leyen_id=str(kalite_kontrol.onay_leyen_id) if kalite_kontrol.onay_leyen_id else None,
        onay_tarihi=kalite_kontrol.onay_tarihi,
        olusturma_tarihi=kalite_kontrol.olusturma_tarihi,
        olusturan_kullanici_id=str(kalite_kontrol.olusturan_kullanici_id)
    )
