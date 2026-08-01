"""
SKT (Son Kullanma Tarihi) management API - FEFO+FIFO hybrid lot selection and SKT operations.
"""
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, func, and_
from pydantic import BaseModel
from decimal import Decimal

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import Kullanici
from app.models.stok import StokKarti, StokHareket
from app.models.skt import SktIslem
from app.models.urun import Urun
from app.models.tedarikci import Tedarikci

router = APIRouter()

# ---------------------------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------------------------

# ── Lot Önerisi ──────────────────────────────────────────────────────────────

class LotOneriItem(BaseModel):
    sira: int
    stok_id: str
    lot_no: str
    mevcut_miktar: float
    son_kullanma: Optional[str]
    durum: str
    oncelik_nedeni: str
    kullanim_miktar: float
    giris_tarihi: Optional[str]
    tedarikci_ad: Optional[str]

    class Config:
        from_attributes = True


class LotOneriResponse(BaseModel):
    urun_id: str
    toplam_miktar: float
    kullanilabilir_miktar: float
    lot_onerileri: List[LotOneriItem]
    fifo_ihlal_edildi: bool
    uyarilar: List[dict]


# ── SKT Rapor ───────────────────────────────────────────────────────────────

class SktRaporLotItem(BaseModel):
    stok_id: str
    lot_no: str
    urun_ad: Optional[str]
    urun_id: str
    miktar: float
    birim: str
    son_kullanma: Optional[str]
    durum: str
    giris_tarihi: Optional[str]
    skd_gun: Optional[int]
    tedarikci_ad: Optional[str]

    class Config:
        from_attributes = True


class SktRaporResponse(BaseModel):
    ozet: dict
    lotlar: List[SktRaporLotItem]


# ── SKT İşlem Oluştur ───────────────────────────────────────────────────────

class SktIslemCreateRequest(BaseModel):
    stok_id: str
    islem_turu: str  # IMHA, INDIRIM, DEVIR, IADE
    islem_miktari: Optional[float] = None
    gerekce: Optional[str] = None
    indirim_orani: Optional[float] = None
    indirimli_fiyat: Optional[float] = None
    devir_tarihi: Optional[str] = None
    devir_alana: Optional[str] = None
    imha_tarihi: Optional[str] = None
    imha_yontemi: Optional[str] = None
    imha_tutanagi_url: Optional[str] = None
    not_text: Optional[str] = None


class SktIslemResponse(BaseModel):
    islem_id: str
    stok_id: str
    islem_turu: str
    onceki_durum: str
    yeni_durum: str
    talep_durumu: str
    islem_miktari: Optional[float]
    birim: Optional[str]
    indirim_orani: Optional[float]
    talep_tarihi: str
    talep_eden_id: str
    gerekce: Optional[str]
    uyari: Optional[str]

    class Config:
        from_attributes = True


# ── SKT İşlem Durumu Güncelle ────────────────────────────────────────────────

class SktIslemDurumUpdateRequest(BaseModel):
    durum: str  # ONAYLANDI, REDDEDILDI, TAMAMLANDI
    ret_nedeni: Optional[str] = None


class SktIslemDurumResponse(BaseModel):
    islem_id: str
    onceki_durum: str
    yeni_durum: str
    talep_durumu: str
    onay_tarihi: Optional[str]
    ret_nedeni: Optional[str]

    class Config:
        from_attributes = True


# ── SKT Eşik ────────────────────────────────────────────────────────────────

class SktEsikResponse(BaseModel):
    deger: int
    kaynak: str  # "sistem" | "urun"

    class Config:
        from_attributes = True


class SktEsikUrunResponse(BaseModel):
    urun_id: str
    urun_ad: Optional[str]
    uyari_gun: int
    sistem_varsayilani: int
    aktif: bool

    class Config:
        from_attributes = True


class SktEsikUrunUpdateRequest(BaseModel):
    uyari_gun: int
    aktif: bool = True


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

def _get_skt_uyari_gun(db: Session) -> int:
    """
    Fetch SKT_UYARI_GUN from sistem_ayarlari table.
    Falls back to 30 days if the setting is not defined.
    """
    try:
        result = db.execute(
            text("SELECT deger FROM sistem_ayarlari WHERE ayar_adi = 'SKT_UYARI_GUN' LIMIT 1")
        ).fetchone()
        if result and result[0]:
            return int(result[0])
    except Exception:
        pass
    return 30


def _skt_durumu(skt_str: Optional[str], uyari_gun: int) -> str:
    """
    Compute SKT status string for a given son_kullanma date string.
    Returns: 'SON_KULLANIM_GECDI' | 'SON_KULLANIM_RISKLI' | 'AKTIF'
    """
    if not skt_str:
        return "AKTIF"
    try:
        skt_date = datetime.strptime(skt_str, "%Y-%m-%d").date()
    except ValueError:
        return "AKTIF"
    today = date.today()
    gun_farki = (skt_date - today).days
    if gun_farki < 0:
        return "SON_KULLANIM_GECDI"
    if gun_farki <= uyari_gun:
        return "SON_KULLANIM_RISKLI"
    return "AKTIF"


def _skd_gun(skt_str: Optional[str]) -> Optional[int]:
    """Days until/since SKT (negative = expired)."""
    if not skt_str:
        return None
    try:
        skt_date = datetime.strptime(skt_str, "%Y-%m-%d").date()
        return (skt_date - date.today()).days
    except ValueError:
        return None


BLOCKED_DURUMLAR = {
    "SON_KULLANIM_GECDI", "BITTI", "IPTAL",
    "DEPO_DISI", "RET", "KALITE_KONTROL"
}

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/lot-onerisi", response_model=LotOneriResponse)
async def get_lot_onerisi(
    urun_id: str = Query(..., description="Ürün ID"),
    miktar: float = Query(..., gt=0, description="İstenen miktar"),
    stok_tipi: str = Query("HAMMADDE", description="HAMMADDE veya MAMUL"),
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """
    FEFO+FIFO hibrit lot önerisi.

    3-tier öncelik sırası:
      1. SON_KULLANIM_GECDI → BLOCKED (seçilemez)
      2. SON_KULLANIM_RISKLI → FEFO (son_kullanma ASC)
      3. AKTIF             → FIFO  (giris_tarihi ASC)
    """
    uyari_gun = _get_skt_uyari_gun(db)

    # Verify product
    urun = db.query(Urun).filter(Urun.id == urun_id).first()
    if not urun:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")

    # Fetch all candidate lots (exclude blocked statuses)
    lots = db.query(StokKarti).filter(
        StokKarti.urun_id == urun_id,
        StokKarti.stok_tipi == stok_tipi,
        StokKarti.durum.notin_(BLOCKED_DURUMLAR),
        StokKarti.miktar > 0,
        StokKarti.silme_tarihi.is_(None),
    ).order_by(StokKarti.son_kullanma.asc()).all()

    if not lots:
        raise HTTPException(status_code=400, detail="Uygun lot bulunamadı")

    # Compute effective status per lot (live computation, not stored)
    riskli_lots = []
    normal_lots = []
    fifo_ihlal = False

    for lot in lots:
        eff_status = _skt_durumu(lot.son_kullanma, uyari_gun)
        if eff_status == "SON_KULLANIM_GECDI":
            continue  # skip blocked
        if eff_status == "SON_KULLANIM_RISKLI":
            riskli_lots.append((lot, eff_status))
            fifo_ihlal = True
        else:
            normal_lots.append((lot, eff_status))

    # Sort: riskli → FEFO (son_kullanma ASC), normal → FIFO (giris_tarihi ASC)
    riskli_lots.sort(key=lambda x: x[0].son_kullanma or "9999-12-31")
    normal_lots.sort(key=lambda x: x[0].giris_tarihi or "")

    ordered = riskli_lots + normal_lots

    # Build lot recommendations
    remaining = miktar
    kullanilabilir_toplam = sum(float(l.miktar) for l, _ in ordered)
    lot_onerileri: List[LotOneriItem] = []
    uyarilar: List[dict] = []

    for sira, (lot, eff_status) in enumerate(ordered, start=1):
        if remaining <= 0:
            break
        take = min(float(lot.miktar), remaining)

        # Lookup tedarikci name
        tedarikci_ad = None
        if lot.tedarikci_id:
            ted = db.query(Tedarikci).filter(Tedarikci.id == lot.tedarikci_id).first()
            tedarikci_ad = ted.ad if ted else None

        oncelik = (
            "FEFO: son kullanma tarihi yaklaşıyor"
            if eff_status == "SON_KULLANIM_RISKLI"
            else "FIFO: giriş sırası"
        )

        lot_onerileri.append(LotOneriItem(
            sira=sira,
            stok_id=str(lot.id),
            lot_no=lot.lot_no,
            mevcut_miktar=float(lot.miktar),
            son_kullanma=lot.son_kullanma,
            durum=lot.durum,
            oncelik_nedeni=oncelik,
            kullanim_miktar=take,
            giris_tarihi=lot.giris_tarihi,
            tedarikci_ad=tedarikci_ad,
        ))
        remaining -= take

    if fifo_ihlal and lot_onerileri:
        uyarilar.append({
            "kod": "FEFO_UYARI",
            "mesaj": "Son kullanma tarihi yaklaşan lotlar öncelikli olarak seçildi (FEFO kuralı).",
            "seviye": "UYARI",
        })

    if remaining > 0:
        uyarilar.append({
            "kod": "YETERSIZ_STOK",
            "mesaj": f"Yetersiz stok! Eksik: {remaining:.3f} {stok_tipi}",
            "seviye": "HATA",
        })

    return LotOneriResponse(
        urun_id=str(urun_id),
        toplam_miktar=float(sum(float(l.miktar) for l, _ in ordered)),
        kullanilabilir_miktar=kullanilabilir_toplam,
        lot_onerileri=lot_onerileri,
        fifo_ihlal_edildi=fifo_ihlal,
        uyarilar=uyarilar,
    )


@router.get("/rapor", response_model=SktRaporResponse)
async def get_skt_rapor(
    durum_filter: str = Query("HEPSI", description="GECEN | RISKLI | NORMAL | HEPSI"),
    urun_id: Optional[str] = Query(None, description="Ürün ID ile filtrele"),
    son_kullanma_baslangic: Optional[str] = Query(None, description="YYYY-MM-DD"),
    son_kullanma_bitis: Optional[str] = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """SKT durumu raporu — lotları SKT durumuna göre gruplar."""
    uyari_gun = _get_skt_uyari_gun(db)

    query = db.query(StokKarti).filter(
        StokKarti.miktar > 0,
        StokKarti.silme_tarihi.is_(None),
    )

    if urun_id:
        query = query.filter(StokKarti.urun_id == urun_id)
    if son_kullanma_baslangic:
        query = query.filter(StokKarti.son_kullanma >= son_kullanma_baslangic)
    if son_kullanma_bitis:
        query = query.filter(StokKarti.son_kullanma <= son_kullanma_bitis)

    lots = query.order_by(StokKarti.son_kullanma.asc()).all()

    gecen_count = 0
    riskli_count = 0
    normal_count = 0
    toplam_miktar = 0.0
    lotlar: List[SktRaporLotItem] = []

    for lot in lots:
        eff_status = _skt_durumu(lot.son_kullanma, uyari_gun)
        skd = _skd_gun(lot.son_kullanma)

        if durum_filter == "GECEN" and eff_status != "SON_KULLANIM_GECDI":
            continue
        if durum_filter == "RISKLI" and eff_status != "SON_KULLANIM_RISKLI":
            continue
        if durum_filter == "NORMAL" and eff_status != "AKTIF":
            continue

        # Count summary
        toplam_miktar += float(lot.miktar)
        if eff_status == "SON_KULLANIM_GECDI":
            gecen_count += 1
        elif eff_status == "SON_KULLANIM_RISKLI":
            riskli_count += 1
        else:
            normal_count += 1

        # Lookup names
        urun = db.query(Urun).filter(Urun.id == lot.urun_id).first()
        tedarikci_ad = None
        if lot.tedarikci_id:
            ted = db.query(Tedarikci).filter(Tedarikci.id == lot.tedarikci_id).first()
            tedarikci_ad = ted.ad if ted else None

        lotlar.append(SktRaporLotItem(
            stok_id=str(lot.id),
            lot_no=lot.lot_no,
            urun_ad=urun.ad if urun else None,
            urun_id=str(lot.urun_id),
            miktar=float(lot.miktar),
            birim=lot.birim,
            son_kullanma=lot.son_kullanma,
            durum=eff_status,
            giris_tarihi=lot.giris_tarihi,
            skd_gun=skd,
            tedarikci_ad=tedarikci_ad,
        ))

    return SktRaporResponse(
        ozet={
            "toplam_lot_sayisi": len(lotlar),
            "toplam_miktar_kg": toplam_miktar,
            "gecen_lot_sayisi": gecen_count,
            "riskli_lot_sayisi": riskli_count,
            "normal_lot_sayisi": normal_count,
        },
        lotlar=lotlar,
    )


@router.post("/islemler", response_model=SktIslemResponse, status_code=201)
async def create_skt_islem(
    request: SktIslemCreateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """
    SKT işlem başlat (imha / indirim / devir / iade).
    Stok durumunu SON_KULLANIM_ISLEM_GECICI olarak günceller.
    """
    valid_turler = {"IMHA", "INDIRIM", "DEVIR", "IADE"}
    if request.islem_turu not in valid_turler:
        raise HTTPException(
            status_code=400,
            detail=f"islem_turu şunlardan biri olmalıdır: {', '.join(valid_turler)}"
        )

    # Verify stock card exists
    stok = db.query(StokKarti).filter(
        StokKarti.id == request.stok_id,
        StokKarti.silme_tarihi.is_(None),
    ).first()
    if not stok:
        raise HTTPException(status_code=404, detail="Stok kartı bulunamadı")

    onceki_durum = stok.durum
    yeni_durum = "SON_KULLANIM_ISLEM_GECICI"
    simdi = datetime.utcnow().isoformat()

    # Create SKT işlem record
    islem = SktIslem(
        stok_id=request.stok_id,
        islem_turu=request.islem_turu,
        talep_durumu="BEKLIYOR",
        talep_eden_id=current_user.id,
        talep_tarihi=simdi,
        mevcut_miktar=stok.miktar,
        islem_miktari=request.islem_miktari or stok.miktar,
        birim=stok.birim,
        maliyet=stok.birim_fiyat * (request.islem_miktari or float(stok.miktar)),
        indirim_orani=request.indirim_orani,
        indirimli_fiyat=request.indirimli_fiyat,
        devir_tarihi=request.devir_tarihi,
        devir_alana=request.devir_alana,
        imha_tarihi=request.imha_tarihi,
        imha_yontemi=request.imha_yontemi,
        imha_tutanagi_url=request.imha_tutanagi_url,
        not_text=request.not_text,
        gerekce=request.gerekce,
        olusturma_tarihi=simdi,
    )
    db.add(islem)
    db.flush()

    # Update stock status
    if request.islem_turu == "IMHA":
        stok.durum = yeni_durum
        stok.miktar = Decimal("0")
    else:
        stok.durum = yeni_durum

    db.commit()
    db.refresh(islem)

    uyari = None
    if request.islem_turu == "IMHA":
        uyari = "İmha işlemi başlatıldı. Stok miktarı 0'a ayarlandı."
    elif request.islem_turu == "INDIRIM":
        uyari = f"İndirimli satış onayı bekleniyor. İndirim oranı: %{request.indirim_orani}"
    elif request.islem_turu == "DEVIR":
        uyari = f"Devir işlemi başlatıldı. Devir alan: {request.devir_alana}"

    return SktIslemResponse(
        islem_id=str(islem.id),
        stok_id=str(islem.stok_id),
        islem_turu=islem.islem_turu,
        onceki_durum=onceki_durum,
        yeni_durum=yeni_durum,
        talep_durumu=islem.talep_durumu,
        islem_miktari=float(islem.islem_miktari) if islem.islem_miktari else None,
        birim=islem.birim,
        indirim_orani=float(islem.indirim_orani) if islem.indirim_orani else None,
        talep_tarihi=islem.talep_tarihi,
        talep_eden_id=str(islem.talep_eden_id),
        gerekce=islem.gerekce,
        uyari=uyari,
    )


@router.get("/islemler/{islem_id}", response_model=SktIslemResponse)
async def get_skt_islem(
    islem_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """SKT işlem detayını getir."""
    islem = db.query(SktIslem).filter(SktIslem.id == islem_id).first()
    if not islem:
        raise HTTPException(status_code=404, detail="SKT işlemi bulunamadı")

    return SktIslemResponse(
        islem_id=str(islem.id),
        stok_id=str(islem.stok_id),
        islem_turu=islem.islem_turu,
        onceki_durum="SON_KULLANIM_ISLEM_GECICI",
        yeni_durum="SON_KULLANIM_ISLEM_GECICI",
        talep_durumu=islem.talep_durumu,
        islem_miktari=float(islem.islem_miktari) if islem.islem_miktari else None,
        birim=islem.birim,
        indirim_orani=float(islem.indirim_orani) if islem.indirim_orani else None,
        talep_tarihi=islem.talep_tarihi,
        talep_eden_id=str(islem.talep_eden_id),
        gerekce=islem.gerekce,
        uyari=None,
    )


@router.patch("/islemler/{islem_id}/durum", response_model=SktIslemDurumResponse)
async def update_skt_islem_durum(
    islem_id: str,
    request: SktIslemDurumUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """
    SKT işlem durumunu güncelle.
    ONAYLANDI  → Stok zaten SON_KULLANIM_ISLEM_GECICI, işlem onaylandı
    REDDEDILDI → Stok önceki durumuna döner, ret_nedeni kaydedilir
    TAMAMLANDI → İşlem tamamlandı olarak işaretlenir
    """
    valid_durumlar = {"ONAYLANDI", "REDDEDILDI", "TAMAMLANDI"}
    if request.durum not in valid_durumlar:
        raise HTTPException(
            status_code=400,
            detail=f"durum şunlardan biri olmalıdır: {', '.join(valid_durumlar)}"
        )

    islem = db.query(SktIslem).filter(SktIslem.id == islem_id).first()
    if not islem:
        raise HTTPException(status_code=404, detail="SKT işlemi bulunamadı")

    onceki_durum = islem.talep_durumu
    yeni_durum = request.durum
    simdi = datetime.utcnow().isoformat()

    # Update işlem record
    islem.talep_durumu = request.durum
    islem.onay_leyen_id = current_user.id
    islem.onay_tarihi = simdi
    if request.durum == "REDDEDILDI":
        islem.ret_nedeni = request.ret_nedeni

    # Update stock card
    stok = db.query(StokKarti).filter(
        StokKarti.id == islem.stok_id,
        StokKarti.silme_tarihi.is_(None),
    ).first()

    if stok:
        if request.durum == "REDDEDILDI":
            # Revert stock to AKTIF
            stok.durum = "AKTIF"
        elif request.durum == "ONAYLANDI":
            # Mark as completed, remain ISLEM_GECICI
            pass
        elif request.durum == "TAMAMLANDI":
            # If IMHA was already zeroed, stay at 0
            pass

    db.commit()
    db.refresh(islem)

    return SktIslemDurumResponse(
        islem_id=str(islem.id),
        onceki_durum=onceki_durum,
        yeni_durum=yeni_durum,
        talep_durumu=islem.talep_durumu,
        onay_tarihi=islem.onay_tarihi,
        ret_nedeni=islem.ret_nedeni,
    )


@router.get("/esik", response_model=SktEsikResponse)
async def get_skt_esik(
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Sistem varsayılanı SKT_UYARI_GUN değerini getir."""
    deger = _get_skt_uyari_gun(db)
    return SktEsikResponse(deger=deger, kaynak="sistem")


@router.patch("/esik/{urun_id}", response_model=SktEsikUrunResponse)
async def update_skt_esik_urun(
    urun_id: str,
    request: SktEsikUrunUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """
    Ürün bazlı SKT eşik güncelle (opsiyonel override).
    sistem_ayarlari tablosuna veya urun bazlı ayar tablosuna yazar.
    """
    if request.uyari_gun < 1:
        raise HTTPException(status_code=400, detail="uyari_gun en az 1 olmalıdır")

    # Verify product
    urun = db.query(Urun).filter(Urun.id == urun_id).first()
    if not urun:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")

    sistem_varsayilani = _get_skt_uyari_gun(db)

    # Upsert into sistem_ayarlari (urun_id ile anahtarlayarak)
    # We store it as ayar_adi = 'SKT_UYARI_GUN_URUN_<urun_id>'
    ayar_adi = f"SKT_UYARI_GUN_{str(urun_id).replace('-', '')}"

    existing = db.execute(
        text(
            "SELECT id FROM sistem_ayarlari WHERE ayar_adi = :ayar_adi AND aktif = TRUE"
        ),
        {"ayar_adi": ayar_adi},
    ).fetchone()

    simdi = datetime.utcnow().isoformat()

    if existing:
        db.execute(
            text(
                "UPDATE sistem_ayarlari SET deger = :deger, guncelleme_tarihi = :tarih "
                "WHERE ayar_adi = :ayar_adi"
            ),
            {"deger": str(request.uyari_gun), "tarih": simdi, "ayar_adi": ayar_adi},
        )
    else:
        db.execute(
            text(
                "INSERT INTO sistem_ayarlari (ayar_adi, deger, veri_tipi, kategori, aktif, olusturma_tarihi, guncelleme_tarihi) "
                "VALUES (:ayar_adi, :deger, 'INTEGER', 'SKT', TRUE, :tarih, :tarih)"
            ),
            {"ayar_adi": ayar_adi, "deger": str(request.uyari_gun), "tarih": simdi},
        )

    db.commit()

    return SktEsikUrunResponse(
        urun_id=str(urun_id),
        urun_ad=urun.ad,
        uyari_gun=request.uyari_gun,
        sistem_varsayilani=sistem_varsayilani,
        aktif=request.aktif,
    )
