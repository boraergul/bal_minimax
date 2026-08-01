"""
Warehouse/Depot Management API Router
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import Kullanici
from app.models.depo import (
    Depo,
    DepoBlok,
    DepoKonum,
    DepoTransfer,
    DepoTransferDetay,
    NakliyeTakip,
)
from app.models.stok import StokHareket, StokKarti

router = APIRouter()


# ============================================================================
# Pydantic Schemas
# ============================================================================

class DepoBlokResponse(BaseModel):
    id: str
    depo_id: str
    ad: str
    kod: str
    blok_tipi: Optional[str]
    kapasite_m2: Optional[float]
    doluluk_orani: Optional[float]
    aktif: bool
    olusturma_tarihi: str
    silme_tarihi: Optional[str]

    class Config:
        from_attributes = True


class DepoKonumResponse(BaseModel):
    id: str
    depo_id: str
    blok_id: Optional[str]
    konum_kodu: str
    kat: Optional[int]
    raf: Optional[str]
    sutun: Optional[int]
    doluluk_durumu: Optional[str]
    mevcut_stok_id: Optional[str]
    aktif: bool
    olusturma_tarihi: str
    silme_tarihi: Optional[str]

    class Config:
        from_attributes = True


class DepoKonumWithBlokResponse(BaseModel):
    id: str
    konum_kodu: str
    kat: Optional[int]
    raf: Optional[str]
    sutun: Optional[int]
    doluluk_durumu: Optional[str]
    mevcut_stok_id: Optional[str]
    blok: Optional[DepoBlokResponse]

    class Config:
        from_attributes = True


class DepoKonumCreate(BaseModel):
    blok_id: Optional[str] = None
    konum_kodu: str
    kat: Optional[int] = None
    raf: Optional[str] = None
    sutun: Optional[int] = None


class DepoKonumUpdate(BaseModel):
    konum_kodu: Optional[str] = None
    kat: Optional[int] = None
    raf: Optional[str] = None
    sutun: Optional[int] = None
    doluluk_durumu: Optional[str] = None


class DepoBlokCreate(BaseModel):
    ad: str
    kod: str
    blok_tipi: Optional[str] = None
    kapasite_m2: Optional[float] = None


class DepoBlokUpdate(BaseModel):
    ad: Optional[str] = None
    kod: Optional[str] = None
    blok_tipi: Optional[str] = None
    kapasite_m2: Optional[float] = None
    aktif: Optional[bool] = None


class DepoResponse(BaseModel):
    id: str
    ad: str
    kod: str
    depo_tipi: Optional[str]
    adres: Optional[str]
    il: Optional[str]
    ilce: Optional[str]
    kapasite_m2: Optional[float]
    doluluk_orani: Optional[float]
    aktif: bool
    olusturma_tarihi: str
    guncelleme_tarihi: str
    silme_tarihi: Optional[str]
    olusturan_kullanici_id: str

    class Config:
        from_attributes = True


class DepoCreate(BaseModel):
    ad: str
    kod: str
    depo_tipi: Optional[str] = None
    adres: Optional[str] = None
    il: Optional[str] = None
    ilce: Optional[str] = None
    kapasite_m2: Optional[float] = None


class DepoUpdate(BaseModel):
    ad: Optional[str] = None
    depo_tipi: Optional[str] = None
    adres: Optional[str] = None
    il: Optional[str] = None
    ilce: Optional[str] = None
    kapasite_m2: Optional[float] = None
    aktif: Optional[bool] = None


class DepoDolulukResponse(BaseModel):
    depo_id: str
    depo_adi: str
    toplam_kapasite_m2: Optional[float]
    doluluk_orani: Optional[float]
    toplam_konum: int
    dolu_konum: int
    bos_konum: int
    kismen_dolu_konum: int

    class Config:
        from_attributes = True


class TransferKalem(BaseModel):
    stok_id: str
    miktar: float
    kaynak_konum: Optional[str] = None
    hedef_konum: Optional[str] = None


class TransferDetayResponse(BaseModel):
    id: str
    transfer_id: str
    stok_id: str
    miktar: float
    birim: Optional[str]
    kaynak_konum: Optional[str]
    hedef_konum: Optional[str]
    durum: str
    olusturma_tarihi: str

    class Config:
        from_attributes = True


class NakliyeTakipResponse(BaseModel):
    id: str
    transfer_id: str
    firma_adi: Optional[str]
    sofor_ad: Optional[str]
    telefon: Optional[str]
    plaka: Optional[str]
    cikis_tarihi: Optional[str]
    varis_tarihi: Optional[str]
    durum: str
    irsaliye_no: Optional[str]
    teslimat_tutunagi_url: Optional[str]
    not_text: Optional[str]
    olusturma_tarihi: str
    olusturan_kullanici_id: str

    class Config:
        from_attributes = True


class TransferResponse(BaseModel):
    id: str
    transfer_no: str
    tarih: str
    kaynak_depo_id: str
    hedef_depo_id: str
    durum: str
    talep_eden_id: str
    talep_tarihi: str
    talep_aciklamasi: Optional[str]
    onay_leyen_id: Optional[str]
    onay_tarihi: Optional[str]
    red_nedeni: Optional[str]
    tamamlama_tarihi: Optional[str]
    not_text: Optional[str]
    olusturma_tarihi: str
    olusturan_kullanici_id: str
    silme_tarihi: Optional[str]
    detaylar: list[TransferDetayResponse] = []
    nakliye: Optional[NakliyeTakipResponse] = None

    class Config:
        from_attributes = True


class TransferCreate(BaseModel):
    kaynak_depo_id: str
    hedef_depo_id: str
    aciklama: Optional[str] = None
    kalemler: list[TransferKalem]


class TransferDurumUpdate(BaseModel):
    durum: str  # BEKLEMEDE, ONAYLANDI, REDDEDILDI, TAMAMLANDI, IPTAL_EDILDI


class TransferReddet(BaseModel):
    red_nedeni: str


class NakliyeTakipUpdate(BaseModel):
    firma_adi: Optional[str] = None
    sofor_ad: Optional[str] = None
    telefon: Optional[str] = None
    plaka: Optional[str] = None
    cikis_tarihi: Optional[str] = None
    varis_tarihi: Optional[str] = None
    durum: Optional[str] = None
    irsaliye_no: Optional[str] = None
    teslimat_tutunagi_url: Optional[str] = None
    not_text: Optional[str] = None


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    pages: int


# ============================================================================
# Helper Functions
# ============================================================================

def generate_transfer_no(db: Session) -> str:
    """Generate unique transfer number: TRF-YYYYMMDD-XXX"""
    today = datetime.utcnow().strftime("%Y%m%d")
    prefix = f"TRF-{today}-"
    
    last_transfer = (
        db.query(DepoTransfer)
        .filter(DepoTransfer.transfer_no.like(f"{prefix}%"))
        .order_by(DepoTransfer.transfer_no.desc())
        .first()
    )
    
    if last_transfer:
        last_seq = int(last_transfer.transfer_no.split("-")[-1])
        next_seq = last_seq + 1
    else:
        next_seq = 1
    
    return f"{prefix}{next_seq:03d}"


# ============================================================================
# Depo CRUD Endpoints (1-5)
# ============================================================================

@router.get("/", response_model=PaginatedResponse)
def list_depolar(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    depo_tipi: Optional[str] = None,
    aktif: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Depo listesi - pagination with optional filters."""
    query = db.query(Depo)
    
    if depo_tipi:
        query = query.filter(Depo.depo_tipi == depo_tipi)
    if aktif is not None:
        query = query.filter(Depo.aktif == aktif)
    
    total = query.count()
    pages = (total + page_size - 1) // page_size
    
    depolar = (
        query
        .order_by(Depo.olusturma_tarihi.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    
    return PaginatedResponse(
        items=[DepoResponse.model_validate(d) for d in depolar],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("/", response_model=DepoResponse, status_code=201)
def create_depo(
    data: DepoCreate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Yeni depo oluştur."""
    existing = db.query(Depo).filter(Depo.kod == data.kod).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu kodla depo zaten mevcut")
    
    now = datetime.utcnow().isoformat()
    depo = Depo(
        ad=data.ad,
        kod=data.kod,
        depo_tipi=data.depo_tipi,
        adres=data.adres,
        il=data.il,
        ilce=data.ilce,
        kapasite_m2=data.kapasite_m2,
        aktif=True,
        olusturma_tarihi=now,
        guncelleme_tarihi=now,
        olusturan_kullanici_id=current_user.id,
    )
    
    db.add(depo)
    db.commit()
    db.refresh(depo)
    
    return DepoResponse.model_validate(depo)


@router.get("/{depo_id}", response_model=DepoResponse)
def get_depo(
    depo_id: UUID,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Depo detay."""
    depo = db.query(Depo).filter(Depo.id == depo_id).first()
    if not depo:
        raise HTTPException(status_code=404, detail="Depo bulunamadı")
    return DepoResponse.model_validate(depo)


@router.put("/{depo_id}", response_model=DepoResponse)
def update_depo(
    depo_id: UUID,
    data: DepoUpdate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Depo güncelle."""
    depo = db.query(Depo).filter(Depo.id == depo_id).first()
    if not depo:
        raise HTTPException(status_code=404, detail="Depo bulunamadı")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(depo, field, value)
    
    depo.guncelleme_tarihi = datetime.utcnow().isoformat()
    
    db.commit()
    db.refresh(depo)
    
    return DepoResponse.model_validate(depo)


@router.delete("/{depo_id}")
def delete_depo(
    depo_id: UUID,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Depo sil (soft delete)."""
    depo = db.query(Depo).filter(Depo.id == depo_id).first()
    if not depo:
        raise HTTPException(status_code=404, detail="Depo bulunamadı")
    
    depo.aktif = False
    depo.silme_tarihi = datetime.utcnow().isoformat()
    
    db.commit()
    
    return {"message": "Depo başarıyla silindi"}


# ============================================================================
# Depo Konum Yönetimi (6-10)
# ============================================================================

@router.get("/{depo_id}/konumlar", response_model=list[DepoKonumWithBlokResponse])
def list_depo_konumlari(
    depo_id: UUID,
    blok_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Depo konumları (nested: bloklar → konumlar)."""
    depo = db.query(Depo).filter(Depo.id == depo_id).first()
    if not depo:
        raise HTTPException(status_code=404, detail="Depo bulunamadı")
    
    query = db.query(DepoKonum).filter(
        DepoKonum.depo_id == depo_id,
        DepoKonum.aktif == True
    )
    
    if blok_id:
        query = query.filter(DepoKonum.blok_id == blok_id)
    
    konumlar = query.order_by(DepoKonum.konum_kodu).all()
    
    return [DepoKonumWithBlokResponse.model_validate(k) for k in konumlar]


@router.post("/{depo_id}/konumlar", response_model=DepoKonumResponse, status_code=201)
def create_konum(
    depo_id: UUID,
    data: DepoKonumCreate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Konum ekle."""
    depo = db.query(Depo).filter(Depo.id == depo_id).first()
    if not depo:
        raise HTTPException(status_code=404, detail="Depo bulunamadı")
    
    if data.blok_id:
        blok = db.query(DepoBlok).filter(DepoBlok.id == data.blok_id).first()
        if not blok or str(blok.depo_id) != str(depo_id):
            raise HTTPException(status_code=400, detail="Blok bu depoya ait değil")
    
    existing = db.query(DepoKonum).filter(DepoKonum.konum_kodu == data.konum_kodu).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu konum kodu zaten mevcut")
    
    konum = DepoKonum(
        depo_id=depo_id,
        blok_id=UUID(data.blok_id) if data.blok_id else None,
        konum_kodu=data.konum_kodu,
        kat=data.kat,
        raf=data.raf,
        sutun=data.sutun,
        doluluk_durumu="BOS",
        aktif=True,
        olusturma_tarihi=datetime.utcnow().isoformat(),
    )
    
    db.add(konum)
    db.commit()
    db.refresh(konum)
    
    return DepoKonumResponse.model_validate(konum)


@router.get("/konumlar/{konum_id}", response_model=DepoKonumResponse)
def get_konum(
    konum_id: UUID,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Konum detay."""
    konum = db.query(DepoKonum).filter(DepoKonum.id == konum_id).first()
    if not konum:
        raise HTTPException(status_code=404, detail="Konum bulunamadı")
    return DepoKonumResponse.model_validate(konum)


@router.put("/konumlar/{konum_id}", response_model=DepoKonumResponse)
def update_konum(
    konum_id: UUID,
    data: DepoKonumUpdate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Konum güncelle."""
    konum = db.query(DepoKonum).filter(DepoKonum.id == konum_id).first()
    if not konum:
        raise HTTPException(status_code=404, detail="Konum bulunamadı")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(konum, field, value)
    
    db.commit()
    db.refresh(konum)
    
    return DepoKonumResponse.model_validate(konum)


@router.get("/{depo_id}/doluluk", response_model=DepoDolulukResponse)
def get_depo_doluluk(
    depo_id: UUID,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Depo doluluk oranı."""
    depo = db.query(Depo).filter(Depo.id == depo_id).first()
    if not depo:
        raise HTTPException(status_code=404, detail="Depo bulunamadı")
    
    konumlar = db.query(DepoKonum).filter(
        DepoKonum.depo_id == depo_id,
        DepoKonum.aktif == True
    ).all()
    
    total = len(konumlar)
    dolu = sum(1 for k in konumlar if k.doluluk_durumu == "DOLU")
    bos = sum(1 for k in konumlar if k.doluluk_durumu == "BOS")
    kismen_dolu = sum(1 for k in konumlar if k.doluluk_durumu == "KISMEN_DOLU")
    
    doluluk_orani = (dolu / total * 100) if total > 0 else 0
    
    return DepoDolulukResponse(
        depo_id=str(depo_id),
        depo_adi=depo.ad,
        toplam_kapasite_m2=float(depo.kapasite_m2) if depo.kapasite_m2 else None,
        doluluk_orani=float(doluluk_orani),
        toplam_konum=total,
        dolu_konum=dolu,
        bos_konum=bos,
        kismen_dolu_konum=kismen_dolu,
    )


# ============================================================================
# Blok Yönetimi (11-12)
# ============================================================================

@router.get("/{depo_id}/bloklar", response_model=list[DepoBlokResponse])
def list_bloklar(
    depo_id: UUID,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Blok listesi."""
    depo = db.query(Depo).filter(Depo.id == depo_id).first()
    if not depo:
        raise HTTPException(status_code=404, detail="Depo bulunamadı")
    
    bloklar = (
        db.query(DepoBlok)
        .filter(DepoBlok.depo_id == depo_id, DepoBlok.aktif == True)
        .order_by(DepoBlok.kod)
        .all()
    )
    
    return [DepoBlokResponse.model_validate(b) for b in bloklar]


@router.post("/{depo_id}/bloklar", response_model=DepoBlokResponse, status_code=201)
def create_blok(
    depo_id: UUID,
    data: DepoBlokCreate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Blok ekle."""
    depo = db.query(Depo).filter(Depo.id == depo_id).first()
    if not depo:
        raise HTTPException(status_code=404, detail="Depo bulunamadı")
    
    existing = db.query(DepoBlok).filter(
        DepoBlok.depo_id == depo_id,
        DepoBlok.kod == data.kod
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu kodla blok zaten mevcut")
    
    blok = DepoBlok(
        depo_id=depo_id,
        ad=data.ad,
        kod=data.kod,
        blok_tipi=data.blok_tipi,
        kapasite_m2=data.kapasite_m2,
        aktif=True,
        olusturma_tarihi=datetime.utcnow().isoformat(),
    )
    
    db.add(blok)
    db.commit()
    db.refresh(blok)
    
    return DepoBlokResponse.model_validate(blok)


# ============================================================================
# Transfer Yönetimi (13-19)
# ============================================================================

@router.get("/transferler", response_model=PaginatedResponse)
def list_transferler(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    durum: Optional[str] = None,
    kaynak_depo_id: Optional[UUID] = None,
    hedef_depo_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Transfer listesi with pagination and filters."""
    query = db.query(DepoTransfer).options(joinedload(DepoTransfer.detaylar))
    
    if durum:
        query = query.filter(DepoTransfer.durum == durum)
    if kaynak_depo_id:
        query = query.filter(DepoTransfer.kaynak_depo_id == kaynak_depo_id)
    if hedef_depo_id:
        query = query.filter(DepoTransfer.hedef_depo_id == hedef_depo_id)
    
    total = db.query(DepoTransfer).filter(
        DepoTransfer.kaynak_depo_id == kaynak_depo_id if kaynak_depo_id else True,
        DepoTransfer.hedef_depo_id == hedef_depo_id if hedef_depo_id else True,
        DepoTransfer.durum == durum if durum else True,
    ).count()
    
    pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    transferler = (
        query
        .order_by(DepoTransfer.olusturma_tarihi.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    
    return PaginatedResponse(
        items=[TransferResponse.model_validate(t) for t in transferler],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("/transferler", response_model=TransferResponse, status_code=201)
def create_transfer(
    data: TransferCreate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Yeni transfer oluştur."""
    kaynak = db.query(Depo).filter(Depo.id == data.kaynak_depo_id).first()
    if not kaynak:
        raise HTTPException(status_code=400, detail="Kaynak depo bulunamadı")
    
    hedef = db.query(Depo).filter(Depo.id == data.hedef_depo_id).first()
    if not hedef:
        raise HTTPException(status_code=400, detail="Hedef depo bulunamadı")
    
    now = datetime.utcnow().isoformat()
    
    transfer = DepoTransfer(
        transfer_no=generate_transfer_no(db),
        tarih=now,
        kaynak_depo_id=data.kaynak_depo_id,
        hedef_depo_id=data.hedef_depo_id,
        durum="OLUSTURULDU",
        talep_eden_id=current_user.id,
        talep_tarihi=now,
        talep_aciklamasi=data.aciklama,
        olusturma_tarihi=now,
        olusturan_kullanici_id=current_user.id,
    )
    
    db.add(transfer)
    db.flush()
    
    for kalem in data.kalemler:
        detay = DepoTransferDetay(
            transfer_id=transfer.id,
            stok_id=kalem.stok_id,
            miktar=kalem.miktar,
            kaynak_konum=kalem.kaynak_konum,
            hedef_konum=kalem.hedef_konum,
            durum="BEKLEMEDE",
            olusturma_tarihi=now,
        )
        db.add(detay)
    
    db.commit()
    db.refresh(transfer)
    
    return TransferResponse.model_validate(transfer)


@router.get("/transferler/{transfer_id}", response_model=TransferResponse)
def get_transfer(
    transfer_id: UUID,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Transfer detay (with detaylar)."""
    transfer = (
        db.query(DepoTransfer)
        .options(joinedload(DepoTransfer.detaylar), joinedload(DepoTransfer.nakliye))
        .filter(DepoTransfer.id == transfer_id)
        .first()
    )
    
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer bulunamadı")
    
    return TransferResponse.model_validate(transfer)


@router.patch("/transferler/{transfer_id}/durum", response_model=TransferResponse)
def update_transfer_durum(
    transfer_id: UUID,
    data: TransferDurumUpdate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Durum güncelle."""
    valid_durumlar = ["BEKLEMEDE", "ONAYLANDI", "REDDEDILDI", "TAMAMLANDI", "IPTAL_EDILDI"]
    if data.durum not in valid_durumlar:
        raise HTTPException(
            status_code=400,
            detail=f"Geçersiz durum. Şunlardan biri olmalı: {', '.join(valid_durumlar)}"
        )
    
    transfer = db.query(DepoTransfer).filter(DepoTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer bulunamadı")
    
    transfer.durum = data.durum
    db.commit()
    db.refresh(transfer)
    
    return TransferResponse.model_validate(transfer)


@router.post("/transferler/{transfer_id}/onayla", response_model=TransferResponse)
def approve_transfer(
    transfer_id: UUID,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Transfer onayla (yonetici)."""
    transfer = db.query(DepoTransfer).filter(DepoTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer bulunamadı")
    
    if transfer.durum not in ["OLUSTURULDU", "BEKLEMEDE"]:
        raise HTTPException(
            status_code=400,
            detail="Sadece oluşturulmuş veya bekleyen transferler onaylanabilir"
        )
    
    now = datetime.utcnow().isoformat()
    transfer.durum = "ONAYLANDI"
    transfer.onay_leyen_id = current_user.id
    transfer.onay_tarihi = now
    
    db.commit()
    db.refresh(transfer)
    
    return TransferResponse.model_validate(transfer)


@router.post("/transferler/{transfer_id}/reddet", response_model=TransferResponse)
def reject_transfer(
    transfer_id: UUID,
    data: TransferReddet,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Transfer reddet."""
    transfer = db.query(DepoTransfer).filter(DepoTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer bulunamadı")
    
    if transfer.durum not in ["OLUSTURULDU", "BEKLEMEDE", "ONAYLANDI"]:
        raise HTTPException(
            status_code=400,
            detail="Sadece onay bekleyen transferler reddedilebilir"
        )
    
    transfer.durum = "REDDEDILDI"
    transfer.red_nedeni = data.red_nedeni
    
    db.commit()
    db.refresh(transfer)
    
    return TransferResponse.model_validate(transfer)


@router.post("/transferler/{transfer_id}/tamamla", response_model=TransferResponse)
def complete_transfer(
    transfer_id: UUID,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Transfer tamamla (stok hareketi oluştur)."""
    transfer = (
        db.query(DepoTransfer)
        .options(joinedload(DepoTransfer.detaylar))
        .filter(DepoTransfer.id == transfer_id)
        .first()
    )
    
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer bulunamadı")
    
    if transfer.durum != "ONAYLANDI":
        raise HTTPException(
            status_code=400,
            detail="Sadece onaylanmış transferler tamamlanabilir"
        )
    
    now = datetime.utcnow().isoformat()
    
    for detay in transfer.detaylar:
        stok = db.query(StokKarti).filter(StokKarti.id == detay.stok_id).first()
        if not stok:
            continue
        
        onceki_miktar = float(stok.miktar)
        
        hareket = StokHareket(
            stok_id=detay.stok_id,
            hareket_tipi="TRANSFER",
            miktar=detay.miktar,
            onceki_miktar=onceki_miktar,
            sonraki_miktar=onceki_miktar,
            referans_id=transfer.id,
            referans_tipi="TRANSFER",
            aciklama=f"Transfer: {transfer.transfer_no}",
            karsi_stok_id=None,
            olusturan_kullanici_id=current_user.id,
        )
        db.add(hareket)
        
        detay.durum = "TRANSFER_EDILDI"
        
        if detay.hedef_konum:
            stok.konum = detay.hedef_konum
    
    transfer.durum = "TAMAMLANDI"
    transfer.tamamlama_tarihi = now
    
    db.commit()
    db.refresh(transfer)
    
    return TransferResponse.model_validate(transfer)


# ============================================================================
# Nakliye Takip (20)
# ============================================================================

@router.patch("/nakliye/{transfer_id}", response_model=NakliyeTakipResponse)
def update_nakliye(
    transfer_id: UUID,
    data: NakliyeTakipUpdate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Nakliye bilgilerini güncelle."""
    transfer = db.query(DepoTransfer).filter(DepoTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer bulunamadı")
    
    nakliye = db.query(NakliyeTakip).filter(NakliyeTakip.transfer_id == transfer_id).first()
    
    if not nakliye:
        now = datetime.utcnow().isoformat()
        nakliye = NakliyeTakip(
            transfer_id=transfer_id,
            durum="HAZIRLANIYOR",
            olusturma_tarihi=now,
            olusturan_kullanici_id=current_user.id,
        )
        db.add(nakliye)
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(nakliye, field, value)
    
    db.commit()
    db.refresh(nakliye)
    
    return NakliyeTakipResponse.model_validate(nakliye)
