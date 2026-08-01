"""
Notification System API Router
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
from app.models.bildirim import (
    Bildirim,
    BildirimSablon,
    BildirimGonderim,
    BildirimKullaniciTercih,
)

router = APIRouter()


# ============================================================================
# Pydantic Schemas
# ============================================================================

class BildirimGonderimResponse(BaseModel):
    id: str
    bildirim_id: str
    kanal: str
    durum: str
    gonderim_tarihi: Optional[str]
    teslim_tarihi: Optional[str]
    hata_kodu: Optional[str]
    hata_mesaji: Optional[str]
    email_adresi: Optional[str]
    email_message_id: Optional[str]
    telefon: Optional[str]
    sms_message_id: Optional[str]
    olusturma_tarihi: str

    class Config:
        from_attributes = True


class BildirimResponse(BaseModel):
    id: str
    bildirim_tipi: str
    baslik: str
    icerik: str
    oncelik: str
    durum: str
    gonderen_id: Optional[str]
    gonderen_ad: Optional[str]
    alici_id: str
    referans_tip: Optional[str]
    referans_id: Optional[str]
    kanallar: list
    gonderim_durumu: dict
    gorulme_tarihi: Optional[str]
    okunma_tarihi: Optional[str]
    action_url: Optional[str]
    action_label: Optional[str]
    olusturma_tarihi: str
    gonderim_tarihi: Optional[str]
    gonderimler: list[BildirimGonderimResponse] = []

    class Config:
        from_attributes = True


class BildirimCreate(BaseModel):
    bildirim_tipi: str
    baslik: str
    icerik: str
    alici_id: str
    oncelik: str = "NORMAL"
    referans_tip: Optional[str] = None
    referans_id: Optional[str] = None
    kanallar: list[str] = ["IN_APP"]
    action_url: Optional[str] = None
    action_label: Optional[str] = None


class BildirimUpdate(BaseModel):
    baslik: Optional[str] = None
    icerik: Optional[str] = None
    oncelik: Optional[str] = None
    durum: Optional[str] = None
    action_url: Optional[str] = None
    action_label: Optional[str] = None


class BildirimSablonResponse(BaseModel):
    id: str
    sablon_adi: str
    bildirim_tipi: str
    varsayilan_baslik: str
    varsayilan_icerik: str
    kanallar: list
    email_sablon_html: Optional[str]
    email_subject: Optional[str]
    sms_sablon: Optional[str]
    degiskenler: list
    aktif: bool
    olusturma_tarihi: str
    guncelleme_tarihi: str
    olusturan_kullanici_id: str

    class Config:
        from_attributes = True


class BildirimSablonCreate(BaseModel):
    sablon_adi: str
    bildirim_tipi: str
    varsayilan_baslik: str
    varsayilan_icerik: str
    kanallar: list[str] = ["IN_APP"]
    email_sablon_html: Optional[str] = None
    email_subject: Optional[str] = None
    sms_sablon: Optional[str] = None
    degiskenler: list[str] = []


class BildirimSablonUpdate(BaseModel):
    sablon_adi: Optional[str] = None
    bildirim_tipi: Optional[str] = None
    varsayilan_baslik: Optional[str] = None
    varsayilan_icerik: Optional[str] = None
    kanallar: Optional[list[str]] = None
    email_sablon_html: Optional[str] = None
    email_subject: Optional[str] = None
    sms_sablon: Optional[str] = None
    degiskenler: Optional[list[str]] = None
    aktif: Optional[bool] = None


class BildirimTercihResponse(BaseModel):
    kullanici_id: str
    in_app_aktif: bool
    email_aktif: bool
    sms_aktif: bool
    tercihler: dict
    sessiz_mod_baslangic: Optional[str]
    sessiz_mod_bitis: Optional[str]
    guncelleme_tarihi: str

    class Config:
        from_attributes = True


class BildirimTercihUpdate(BaseModel):
    in_app_aktif: Optional[bool] = None
    email_aktif: Optional[bool] = None
    sms_aktif: Optional[bool] = None
    tercihler: Optional[dict] = None
    sessiz_mod_baslangic: Optional[str] = None
    sessiz_mod_bitis: Optional[str] = None


class ManualBildirimGonder(BaseModel):
    alici_id: str
    bildirim_tipi: str
    baslik: str
    icerik: str
    kanallar: list[str] = ["IN_APP"]
    referans_tip: Optional[str] = None
    referans_id: Optional[str] = None


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    pages: int


# ============================================================================
# Bildirim CRUD Endpoints (1-5)
# ============================================================================

@router.get("/", response_model=PaginatedResponse)
def list_bildirimler(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    durum: Optional[str] = None,
    bildirim_tipi: Optional[str] = None,
    oncelik: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Bildirim listesi (sadece current_user'a ait, pagination)."""
    query = db.query(Bildirim).filter(Bildirim.alici_id == current_user.id)
    
    if durum:
        query = query.filter(Bildirim.durum == durum)
    if bildirim_tipi:
        query = query.filter(Bildirim.bildirim_tipi == bildirim_tipi)
    if oncelik:
        query = query.filter(Bildirim.oncelik == oncelik)
    
    total = query.count()
    pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    bildirimler = (
        query
        .order_by(Bildirim.olusturma_tarihi.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    
    return PaginatedResponse(
        items=[BildirimResponse.model_validate(b) for b in bildirimler],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{bildirim_id}", response_model=BildirimResponse)
def get_bildirim(
    bildirim_id: UUID,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Bildirim detay."""
    bildirim = (
        db.query(Bildirim)
        .options(joinedload(Bildirim.gonderimler))
        .filter(Bildirim.id == bildirim_id)
        .first()
    )
    
    if not bildirim:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı")
    
    if bildirim.alici_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bu bildirimi görüntüleme yetkiniz yok")
    
    return BildirimResponse.model_validate(bildirim)


@router.patch("/{bildirim_id}/okundu", response_model=BildirimResponse)
def mark_as_read(
    bildirim_id: UUID,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Okundu işaretle (sets durum=OKUNDU, okunma_tarihi)."""
    bildirim = db.query(Bildirim).filter(Bildirim.id == bildirim_id).first()
    
    if not bildirim:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı")
    
    if bildirim.alici_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bu bildirimi güncelleme yetkiniz yok")
    
    bildirim.durum = "OKUNDU"
    bildirim.okunma_tarihi = datetime.utcnow().isoformat()
    
    db.commit()
    db.refresh(bildirim)
    
    return BildirimResponse.model_validate(bildirim)


@router.patch("/{bildirim_id}", response_model=BildirimResponse)
def update_bildirim(
    bildirim_id: UUID,
    data: BildirimUpdate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Bildirim güncelle."""
    bildirim = db.query(Bildirim).filter(Bildirim.id == bildirim_id).first()
    
    if not bildirim:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı")
    
    if bildirim.alici_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bu bildirimi güncelleme yetkiniz yok")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(bildirim, field, value)
    
    db.commit()
    db.refresh(bildirim)
    
    return BildirimResponse.model_validate(bildirim)


@router.delete("/{bildirim_id}")
def delete_bildirim(
    bildirim_id: UUID,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Bildirim sil."""
    bildirim = db.query(Bildirim).filter(Bildirim.id == bildirim_id).first()
    
    if not bildirim:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı")
    
    if bildirim.alici_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bu bildirimi silme yetkiniz yok")
    
    db.delete(bildirim)
    db.commit()
    
    return {"message": "Bildirim başarıyla silindi"}


# ============================================================================
# Şablon Yönetimi (6-9)
# ============================================================================

@router.get("/sablonlar", response_model=list[BildirimSablonResponse])
def list_sablonlar(
    bildirim_tipi: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Bildirim şablonları."""
    query = db.query(BildirimSablon).filter(BildirimSablon.aktif == True)
    
    if bildirim_tipi:
        query = query.filter(BildirimSablon.bildirim_tipi == bildirim_tipi)
    
    sablonlar = query.order_by(BildirimSablon.sablon_adi).all()
    
    return [BildirimSablonResponse.model_validate(s) for s in sablonlar]


@router.post("/sablonlar", response_model=BildirimSablonResponse, status_code=201)
def create_sablon(
    data: BildirimSablonCreate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Şablon oluştur."""
    existing = (
        db.query(BildirimSablon)
        .filter(BildirimSablon.sablon_adi == data.sablon_adi)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Bu isimle şablon zaten mevcut")
    
    now = datetime.utcnow().isoformat()
    
    sablon = BildirimSablon(
        sablon_adi=data.sablon_adi,
        bildirim_tipi=data.bildirim_tipi,
        varsayilan_baslik=data.varsayilan_baslik,
        varsayilan_icerik=data.varsayilan_icerik,
        kanallar=data.kanallar,
        email_sablon_html=data.email_sablon_html,
        email_subject=data.email_subject,
        sms_sablon=data.sms_sablon,
        degiskenler=data.degiskenler,
        aktif=True,
        olusturma_tarihi=now,
        guncelleme_tarihi=now,
        olusturan_kullanici_id=current_user.id,
    )
    
    db.add(sablon)
    db.commit()
    db.refresh(sablon)
    
    return BildirimSablonResponse.model_validate(sablon)


@router.put("/sablonlar/{sablon_id}", response_model=BildirimSablonResponse)
def update_sablon(
    sablon_id: UUID,
    data: BildirimSablonUpdate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Şablon güncelle."""
    sablon = db.query(BildirimSablon).filter(BildirimSablon.id == sablon_id).first()
    
    if not sablon:
        raise HTTPException(status_code=404, detail="Şablon bulunamadı")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sablon, field, value)
    
    sablon.guncelleme_tarihi = datetime.utcnow().isoformat()
    
    db.commit()
    db.refresh(sablon)
    
    return BildirimSablonResponse.model_validate(sablon)


@router.delete("/sablonlar/{sablon_id}")
def delete_sablon(
    sablon_id: UUID,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Şablon sil."""
    sablon = db.query(BildirimSablon).filter(BildirimSablon.id == sablon_id).first()
    
    if not sablon:
        raise HTTPException(status_code=404, detail="Şablon bulunamadı")
    
    sablon.aktif = False
    
    db.commit()
    
    return {"message": "Şablon başarıyla silindi"}


# ============================================================================
# Kullanıcı Tercihleri (10-11)
# ============================================================================

@router.get("/tercihler", response_model=BildirimTercihResponse)
def get_tercihler(
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Current user bildirim tercihlerini getir."""
    tercih = (
        db.query(BildirimKullaniciTercih)
        .filter(BildirimKullaniciTercih.kullanici_id == current_user.id)
        .first()
    )
    
    if not tercih:
        tercih = BildirimKullaniciTercih(
            kullanici_id=current_user.id,
            in_app_aktif=True,
            email_aktif=True,
            sms_aktif=False,
            tercihler={},
            guncelleme_tarihi=datetime.utcnow().isoformat(),
        )
        db.add(tercih)
        db.commit()
        db.refresh(tercih)
    
    return BildirimTercihResponse.model_validate(tercih)


@router.put("/tercihler", response_model=BildirimTercihResponse)
def update_tercihler(
    data: BildirimTercihUpdate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Tercihleri güncelle."""
    tercih = (
        db.query(BildirimKullaniciTercih)
        .filter(BildirimKullaniciTercih.kullanici_id == current_user.id)
        .first()
    )
    
    if not tercih:
        tercih = BildirimKullaniciTercih(
            kullanici_id=current_user.id,
            guncelleme_tarihi=datetime.utcnow().isoformat(),
        )
        db.add(tercih)
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tercih, field, value)
    
    tercih.guncelleme_tarihi = datetime.utcnow().isoformat()
    
    db.commit()
    db.refresh(tercih)
    
    return BildirimTercihResponse.model_validate(tercih)


# ============================================================================
# Gönderim Logları (12)
# ============================================================================

@router.get("/gonderimler", response_model=PaginatedResponse)
def list_gonderimler(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    bildirim_id: Optional[UUID] = None,
    kanal: Optional[str] = None,
    durum: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Gönderim logları (admin only)."""
    if current_user.rol.ad != "ADMIN":
        raise HTTPException(status_code=403, detail="Bu işlem için admin yetkisi gerekli")
    
    query = db.query(BildirimGonderim)
    
    if bildirim_id:
        query = query.filter(BildirimGonderim.bildirim_id == bildirim_id)
    if kanal:
        query = query.filter(BildirimGonderim.kanal == kanal)
    if durum:
        query = query.filter(BildirimGonderim.durum == durum)
    
    total = query.count()
    pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    gonderimler = (
        query
        .order_by(BildirimGonderim.olusturma_tarihi.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    
    return PaginatedResponse(
        items=[BildirimGonderimResponse.model_validate(g) for g in gonderimler],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


# ============================================================================
# Test/Manual Send (13)
# ============================================================================

@router.post("/gonder", response_model=BildirimResponse)
def send_manual_bildirim(
    data: ManualBildirimGonder,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Bildirim gönder (manual trigger)."""
    alici = db.query(Kullanici).filter(Kullanici.id == data.alici_id).first()
    if not alici:
        raise HTTPException(status_code=400, detail="Alıcı kullanıcı bulunamadı")
    
    now = datetime.utcnow().isoformat()
    
    bildirim = Bildirim(
        bildirim_tipi=data.bildirim_tipi,
        baslik=data.baslik,
        icerik=data.icerik,
        oncelik="NORMAL",
        durum="GORULMEMIŞ",
        gonderen_id=current_user.id,
        gonderen_ad=f"{current_user.ad} {current_user.soyad}",
        alici_id=data.alici_id,
        referans_tip=data.referans_tip,
        referans_id=UUID(data.referans_id) if data.referans_id else None,
        kanallar=data.kanallar,
        gonderim_durumu={kanal: "BEKLEMEDE" for kanal in data.kanallar},
        olusturma_tarihi=now,
        gonderim_tarihi=now,
    )
    
    db.add(bildirim)
    db.flush()
    
    for kanal in data.kanallar:
        gonderim = BildirimGonderim(
            bildirim_id=bildirim.id,
            kanal=kanal,
            durum="BEKLEMEDE",
            olusturma_tarihi=now,
        )
        
        if kanal == "EMAIL":
            gonderim.email_adresi = alici.eposta
        elif kanal == "SMS":
            gonderim.telefon = getattr(alici, "telefon", None)
        
        db.add(gonderim)
    
    bildirim.gonderim_durumu = {kanal: "GONDERILDI" for kanal in data.kanallar}
    
    db.commit()
    db.refresh(bildirim)
    
    return BildirimResponse.model_validate(bildirim)
