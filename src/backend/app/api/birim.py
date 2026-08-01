"""
Birim (Unit) and Birim Dönüşüm (Unit Conversion) API.
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import Kullanici
from app.models.birim import Birim, BirimDonusum

router = APIRouter()

# ---------------------------------------------------------------------------
# Request / Response Schemas — Birim
# ---------------------------------------------------------------------------

class BirimCreateRequest(BaseModel):
    ad: str
    kisa_ad: str
    birim_tipi: str  # AGIRLIK | ADET | HACIM | OZEL


class BirimUpdateRequest(BaseModel):
    ad: Optional[str] = None
    kisa_ad: Optional[str] = None
    birim_tipi: Optional[str] = None
    aktif: Optional[bool] = None


class BirimResponse(BaseModel):
    id: str
    ad: str
    kisa_ad: str
    birim_tipi: str
    aktif: bool
    olusturma_tarihi: str
    silme_tarihi: Optional[str]

    class Config:
        from_attributes = True


class BirimListResponse(BaseModel):
    data: List[BirimResponse]
    total: int


# ---------------------------------------------------------------------------
# Request / Response Schemas — Birim Dönüşüm
# ---------------------------------------------------------------------------

class BirimDonusumCreateRequest(BaseModel):
    kaynak_birim_id: str
    hedef_birim_id: str
    donusum_orani: float
    baslangic_tarihi: Optional[str] = None
    bitis_tarihi: Optional[str] = None


class BirimDonusumUpdateRequest(BaseModel):
    donusum_orani: Optional[float] = None
    baslangic_tarihi: Optional[str] = None
    bitis_tarihi: Optional[str] = None
    aktif: Optional[bool] = None


class BirimDonusumResponse(BaseModel):
    id: str
    kaynak_birim_id: str
    kaynak_birim_ad: str
    kaynak_birim_kisa_ad: str
    hedef_birim_id: str
    hedef_birim_ad: str
    hedef_birim_kisa_ad: str
    donusum_orani: float
    aktif: bool
    baslangic_tarihi: Optional[str]
    bitis_tarihi: Optional[str]
    olusturma_tarihi: str

    class Config:
        from_attributes = True


class BirimDonusumListResponse(BaseModel):
    data: List[BirimDonusumResponse]
    total: int


class BirimDonusumHesaplaRequest(BaseModel):
    kaynak_birim_id: str
    hedef_birim_id: str
    miktar: float


class BirimDonusumHesaplaResponse(BaseModel):
    kaynak_birim_id: str
    kaynak_birim_ad: str
    kaynak_birim_kisa_ad: str
    hedef_birim_id: str
    hedef_birim_ad: str
    hedef_birim_kisa_ad: str
    kaynak_miktar: float
    donusum_orani: float
    hedef_miktar: float


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _donusum_orani_bul(
    db: Session,
    kaynak_birim_id: str,
    hedef_birim_id: str,
) -> Optional[BirimDonusum]:
    """
    Find active conversion between two units.
    Checks direct and reverse direction.
    """
    donusum = db.query(BirimDonusum).filter(
        BirimDonusum.kaynak_birim_id == kaynak_birim_id,
        BirimDonusum.hedef_birim_id == hedef_birim_id,
        BirimDonusum.aktif == True,
        BirimDonusum.silme_tarihi.is_(None),
    ).first()

    if donusum:
        return donusum

    # Try reverse
    reverse = db.query(BirimDonusum).filter(
        BirimDonusum.kaynak_birim_id == hedef_birim_id,
        BirimDonusum.hedef_birim_id == kaynak_birim_id,
        BirimDonusum.aktif == True,
        BirimDonusum.silme_tarihi.is_(None),
    ).first()

    if reverse:
        # Return a proxy dict with inverted rate
        return reverse

    return None


# ---------------------------------------------------------------------------
# Endpoints — Birim
# ---------------------------------------------------------------------------

@router.get("/", response_model=BirimListResponse)
async def list_birim(
    birim_tipi: Optional[str] = Query(None, description="AGIRLIK | ADET | HACIM | OZEL"),
    aktif: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Birim listesi."""
    query = db.query(Birim).filter(Birim.silme_tarihi.is_(None))
    if birim_tipi:
        query = query.filter(Birim.birim_tipi == birim_tipi)
    if aktif is not None:
        query = query.filter(Birim.aktif == aktif)

    total = query.count()
    birimler = query.order_by(Birim.ad.asc()).all()

    return BirimListResponse(
        data=[
            BirimResponse(
                id=str(b.id),
                ad=b.ad,
                kisa_ad=b.kisa_ad,
                birim_tipi=b.birim_tipi,
                aktif=b.aktif,
                olusturma_tarihi=b.olusturma_tarihi,
                silme_tarihi=b.silme_tarihi,
            )
            for b in birimler
        ],
        total=total,
    )


@router.post("/", response_model=BirimResponse, status_code=201)
async def create_birim(
    request: BirimCreateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Yeni birim oluştur."""
    valid_tipler = {"AGIRLIK", "ADET", "HACIM", "OZEL"}
    if request.birim_tipi not in valid_tipler:
        raise HTTPException(
            status_code=400,
            detail=f"birim_tipi şunlardan biri olmalıdır: {', '.join(valid_tipler)}"
        )

    # Check duplicate kisa_ad
    existing = db.query(Birim).filter(
        Birim.kisa_ad == request.kisa_ad,
        Birim.silme_tarihi.is_(None),
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Bu kısa ad zaten kullanımda")

    simdi = datetime.utcnow().isoformat()
    birim = Birim(
        ad=request.ad,
        kisa_ad=request.kisa_ad,
        birim_tipi=request.birim_tipi,
        aktif=True,
        olusturma_tarihi=simdi,
    )
    db.add(birim)
    db.commit()
    db.refresh(birim)

    return BirimResponse(
        id=str(birim.id),
        ad=birim.ad,
        kisa_ad=birim.kisa_ad,
        birim_tipi=birim.birim_tipi,
        aktif=birim.aktif,
        olusturma_tarihi=birim.olusturma_tarihi,
        silme_tarihi=birim.silme_tarihi,
    )


@router.get("/{birim_id}", response_model=BirimResponse)
async def get_birim(
    birim_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Birim detay."""
    birim = db.query(Birim).filter(
        Birim.id == birim_id,
        Birim.silme_tarihi.is_(None),
    ).first()
    if not birim:
        raise HTTPException(status_code=404, detail="Birim bulunamadı")

    return BirimResponse(
        id=str(birim.id),
        ad=birim.ad,
        kisa_ad=birim.kisa_ad,
        birim_tipi=birim.birim_tipi,
        aktif=birim.aktif,
        olusturma_tarihi=birim.olusturma_tarihi,
        silme_tarihi=birim.silme_tarihi,
    )


@router.put("/{birim_id}", response_model=BirimResponse)
async def update_birim(
    birim_id: str,
    request: BirimUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Birim güncelle."""
    birim = db.query(Birim).filter(
        Birim.id == birim_id,
        Birim.silme_tarihi.is_(None),
    ).first()
    if not birim:
        raise HTTPException(status_code=404, detail="Birim bulunamadı")

    if request.kisa_ad and request.kisa_ad != birim.kisa_ad:
        conflict = db.query(Birim).filter(
            Birim.kisa_ad == request.kisa_ad,
            Birim.id != birim_id,
            Birim.silme_tarihi.is_(None),
        ).first()
        if conflict:
            raise HTTPException(status_code=409, detail="Bu kısa ad zaten kullanımda")
        birim.kisa_ad = request.kisa_ad

    if request.ad is not None:
        birim.ad = request.ad
    if request.birim_tipi is not None:
        valid_tipler = {"AGIRLIK", "ADET", "HACIM", "OZEL"}
        if request.birim_tipi not in valid_tipler:
            raise HTTPException(
                status_code=400,
                detail=f"birim_tipi şunlardan biri olmalıdır: {', '.join(valid_tipler)}"
            )
        birim.birim_tipi = request.birim_tipi
    if request.aktif is not None:
        birim.aktif = request.aktif

    db.commit()
    db.refresh(birim)

    return BirimResponse(
        id=str(birim.id),
        ad=birim.ad,
        kisa_ad=birim.kisa_ad,
        birim_tipi=birim.birim_tipi,
        aktif=birim.aktif,
        olusturma_tarihi=birim.olusturma_tarihi,
        silme_tarihi=birim.silme_tarihi,
    )


@router.delete("/{birim_id}", status_code=204)
async def delete_birim(
    birim_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Birim sil (soft delete)."""
    birim = db.query(Birim).filter(
        Birim.id == birim_id,
        Birim.silme_tarihi.is_(None),
    ).first()
    if not birim:
        raise HTTPException(status_code=404, detail="Birim bulunamadı")

    simdi = datetime.utcnow().isoformat()
    birim.silme_tarihi = simdi
    birim.aktif = False
    db.commit()
    return None


# ---------------------------------------------------------------------------
# Endpoints — Birim Dönüşüm
# ---------------------------------------------------------------------------

@router.get("/donusum", response_model=BirimDonusumListResponse)
async def list_donusum(
    kaynak_birim_id: Optional[str] = Query(None, description="Kaynak birim ID ile filtrele"),
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Dönüşüm tablosu (tüm aktif dönüşümler)."""
    query = db.query(BirimDonusum).filter(
        BirimDonusum.silme_tarihi.is_(None),
        BirimDonusum.aktif == True,
    )
    if kaynak_birim_id:
        query = query.filter(BirimDonusum.kaynak_birim_id == kaynak_birim_id)

    total = query.count()
    donusumler = query.order_by(BirimDonusum.olusturma_tarihi.desc()).all()

    result = []
    for d in donusumler:
        kaynak = db.query(Birim).filter(Birim.id == d.kaynak_birim_id).first()
        hedef = db.query(Birim).filter(Birim.id == d.hedef_birim_id).first()
        result.append(BirimDonusumResponse(
            id=str(d.id),
            kaynak_birim_id=str(d.kaynak_birim_id),
            kaynak_birim_ad=kaynak.ad if kaynak else "",
            kaynak_birim_kisa_ad=kaynak.kisa_ad if kaynak else "",
            hedef_birim_id=str(d.hedef_birim_id),
            hedef_birim_ad=hedef.ad if hedef else "",
            hedef_birim_kisa_ad=hedef.kisa_ad if hedef else "",
            donusum_orani=float(d.donusum_orani),
            aktif=d.aktif,
            baslangic_tarihi=d.baslangic_tarihi,
            bitis_tarihi=d.bitis_tarihi,
            olusturma_tarihi=d.olusturma_tarihi,
        ))

    return BirimDonusumListResponse(data=result, total=total)


@router.post("/donusum", response_model=BirimDonusumResponse, status_code=201)
async def create_donusum(
    request: BirimDonusumCreateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Dönüşüm kuralı ekle."""
    if request.kaynak_birim_id == request.hedef_birim_id:
        raise HTTPException(status_code=400, detail="Kaynak ve hedef birim aynı olamaz")

    # Verify both units exist
    kaynak = db.query(Birim).filter(
        Birim.id == request.kaynak_birim_id,
        Birim.silme_tarihi.is_(None),
    ).first()
    if not kaynak:
        raise HTTPException(status_code=404, detail="Kaynak birim bulunamadı")

    hedef = db.query(Birim).filter(
        Birim.id == request.hedef_birim_id,
        Birim.silme_tarihi.is_(None),
    ).first()
    if not hedef:
        raise HTTPException(status_code=404, detail="Hedef birim bulunamadı")

    # Check same type
    if kaynak.birim_tipi != hedef.birim_tipi:
        raise HTTPException(
            status_code=400,
            detail=f"Birim tipleri eşleşmiyor: {kaynak.birim_tipi} ≠ {hedef.birim_tipi}"
        )

    # Check duplicate
    existing = db.query(BirimDonusum).filter(
        BirimDonusum.kaynak_birim_id == request.kaynak_birim_id,
        BirimDonusum.hedef_birim_id == request.hedef_birim_id,
        BirimDonusum.silme_tarihi.is_(None),
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Bu dönüşüm zaten tanımlı")

    simdi = datetime.utcnow().isoformat()
    donusum = BirimDonusum(
        kaynak_birim_id=request.kaynak_birim_id,
        hedef_birim_id=request.hedef_birim_id,
        donusum_orani=request.donusum_orani,
        ters_oran=1.0 / request.donusum_orani if request.donusum_orani != 0 else None,
        aktif=True,
        baslangic_tarihi=request.baslangic_tarihi,
        bitis_tarihi=request.bitis_tarihi,
        olusturma_tarihi=simdi,
    )
    db.add(donusum)
    db.commit()
    db.refresh(donusum)

    return BirimDonusumResponse(
        id=str(donusum.id),
        kaynak_birim_id=str(donusum.kaynak_birim_id),
        kaynak_birim_ad=kaynak.ad,
        kaynak_birim_kisa_ad=kaynak.kisa_ad,
        hedef_birim_id=str(donusum.hedef_birim_id),
        hedef_birim_ad=hedef.ad,
        hedef_birim_kisa_ad=hedef.kisa_ad,
        donusum_orani=float(donusum.donusum_orani),
        aktif=donusum.aktif,
        baslangic_tarihi=donusum.baslangic_tarihi,
        bitis_tarihi=donusum.bitis_tarihi,
        olusturma_tarihi=donusum.olusturma_tarihi,
    )


@router.get("/donusum/{donusum_id}", response_model=BirimDonusumResponse)
async def get_donusum(
    donusum_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Dönüşüm detay."""
    donusum = db.query(BirimDonusum).filter(
        BirimDonusum.id == donusum_id,
        BirimDonusum.silme_tarihi.is_(None),
    ).first()
    if not donusum:
        raise HTTPException(status_code=404, detail="Dönüşüm bulunamadı")

    kaynak = db.query(Birim).filter(Birim.id == donusum.kaynak_birim_id).first()
    hedef = db.query(Birim).filter(Birim.id == donusum.hedef_birim_id).first()

    return BirimDonusumResponse(
        id=str(donusum.id),
        kaynak_birim_id=str(donusum.kaynak_birim_id),
        kaynak_birim_ad=kaynak.ad if kaynak else "",
        kaynak_birim_kisa_ad=kaynak.kisa_ad if kaynak else "",
        hedef_birim_id=str(donusum.hedef_birim_id),
        hedef_birim_ad=hedef.ad if hedef else "",
        hedef_birim_kisa_ad=hedef.kisa_ad if hedef else "",
        donusum_orani=float(donusum.donusum_orani),
        aktif=donusum.aktif,
        baslangic_tarihi=donusum.baslangic_tarihi,
        bitis_tarihi=donusum.bitis_tarihi,
        olusturma_tarihi=donusum.olusturma_tarihi,
    )


@router.put("/donusum/{donusum_id}", response_model=BirimDonusumResponse)
async def update_donusum(
    donusum_id: str,
    request: BirimDonusumUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Dönüşüm güncelle."""
    donusum = db.query(BirimDonusum).filter(
        BirimDonusum.id == donusum_id,
        BirimDonusum.silme_tarihi.is_(None),
    ).first()
    if not donusum:
        raise HTTPException(status_code=404, detail="Dönüşüm bulunamadı")

    if request.donusum_orani is not None:
        if request.donusum_orani == 0:
            raise HTTPException(status_code=400, detail="Dönüşüm oranı sıfır olamaz")
        donusum.donusum_orani = request.donusum_orani
        donusum.ters_oran = 1.0 / request.donusum_orani
    if request.baslangic_tarihi is not None:
        donusum.baslangic_tarihi = request.baslangic_tarihi
    if request.bitis_tarihi is not None:
        donusum.bitis_tarihi = request.bitis_tarihi
    if request.aktif is not None:
        donusum.aktif = request.aktif

    db.commit()
    db.refresh(donusum)

    kaynak = db.query(Birim).filter(Birim.id == donusum.kaynak_birim_id).first()
    hedef = db.query(Birim).filter(Birim.id == donusum.hedef_birim_id).first()

    return BirimDonusumResponse(
        id=str(donusum.id),
        kaynak_birim_id=str(donusum.kaynak_birim_id),
        kaynak_birim_ad=kaynak.ad if kaynak else "",
        kaynak_birim_kisa_ad=kaynak.kisa_ad if kaynak else "",
        hedef_birim_id=str(donusum.hedef_birim_id),
        hedef_birim_ad=hedef.ad if hedef else "",
        hedef_birim_kisa_ad=hedef.kisa_ad if hedef else "",
        donusum_orani=float(donusum.donusum_orani),
        aktif=donusum.aktif,
        baslangic_tarihi=donusum.baslangic_tarihi,
        bitis_tarihi=donusum.bitis_tarihi,
        olusturma_tarihi=donusum.olusturma_tarihi,
    )


@router.delete("/donusum/{donusum_id}", status_code=204)
async def delete_donusum(
    donusum_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Dönüşüm sil (soft delete)."""
    donusum = db.query(BirimDonusum).filter(
        BirimDonusum.id == donusum_id,
        BirimDonusum.silme_tarihi.is_(None),
    ).first()
    if not donusum:
        raise HTTPException(status_code=404, detail="Dönüşüm bulunamadı")

    simdi = datetime.utcnow().isoformat()
    donusum.silme_tarihi = simdi
    donusum.aktif = False
    db.commit()
    return None


@router.post("/donusum/hesapla", response_model=BirimDonusumHesaplaResponse)
async def hesapla_donusum(
    request: BirimDonusumHesaplaRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """
    Birim dönüşümü hesapla.
    Kaynak birim == hedef birim ise aynı miktarı döner.
    Dönüşüm bulunamazsa HTTP 400 hatası verir.
    """
    # Same unit → no conversion
    if request.kaynak_birim_id == request.hedef_birim_id:
        kaynak = db.query(Birim).filter(
            Birim.id == request.kaynak_birim_id,
            Birim.silme_tarihi.is_(None),
        ).first()
        if not kaynak:
            raise HTTPException(status_code=404, detail="Kaynak birim bulunamadı")
        return BirimDonusumHesaplaResponse(
            kaynak_birim_id=str(kaynak.id),
            kaynak_birim_ad=kaynak.ad,
            kaynak_birim_kisa_ad=kaynak.kisa_ad,
            hedef_birim_id=str(kaynak.id),
            hedef_birim_ad=kaynak.ad,
            hedef_birim_kisa_ad=kaynak.kisa_ad,
            kaynak_miktar=request.miktar,
            donusum_orani=1.0,
            hedef_miktar=request.miktar,
        )

    # Verify units exist
    kaynak = db.query(Birim).filter(
        Birim.id == request.kaynak_birim_id,
        Birim.silme_tarihi.is_(None),
    ).first()
    if not kaynak:
        raise HTTPException(status_code=404, detail="Kaynak birim bulunamadı")

    hedef = db.query(Birim).filter(
        Birim.id == request.hedef_birim_id,
        Birim.silme_tarihi.is_(None),
    ).first()
    if not hedef:
        raise HTTPException(status_code=404, detail="Hedef birim bulunamadı")

    # Same type check
    if kaynak.birim_tipi != hedef.birim_tipi:
        raise HTTPException(
            status_code=400,
            detail=f"Birim tipleri eşleşmiyor: {kaynak.birim_tipi} ≠ {hedef.birim_tipi}"
        )

    # Try direct conversion
    donusum = db.query(BirimDonusum).filter(
        BirimDonusum.kaynak_birim_id == request.kaynak_birim_id,
        BirimDonusum.hedef_birim_id == request.hedef_birim_id,
        BirimDonusum.aktif == True,
        BirimDonusum.silme_tarihi.is_(None),
    ).first()

    if not donusum:
        # Try reverse
        reverse = db.query(BirimDonusum).filter(
            BirimDonusum.kaynak_birim_id == request.hedef_birim_id,
            BirimDonusum.hedef_birim_id == request.kaynak_birim_id,
            BirimDonusum.aktif == True,
            BirimDonusum.silme_tarihi.is_(None),
        ).first()
        if reverse:
            hedef_miktar = request.miktar / float(reverse.donusum_orani)
            return BirimDonusumHesaplaResponse(
                kaynak_birim_id=str(kaynak.id),
                kaynak_birim_ad=kaynak.ad,
                kaynak_birim_kisa_ad=kaynak.kisa_ad,
                hedef_birim_id=str(hedef.id),
                hedef_birim_ad=hedef.ad,
                hedef_birim_kisa_ad=hedef.kisa_ad,
                kaynak_miktar=request.miktar,
                donusum_orani=float(reverse.donusum_orani),
                hedef_miktar=round(hedef_miktar, 6),
            )
        raise HTTPException(
            status_code=400,
            detail=f"Dönüşüm tanımlı değil: {kaynak.kisa_ad} → {hedef.kisa_ad}"
        )

    hedef_miktar = request.miktar * float(donusum.donusum_orani)
    return BirimDonusumHesaplaResponse(
        kaynak_birim_id=str(kaynak.id),
        kaynak_birim_ad=kaynak.ad,
        kaynak_birim_kisa_ad=kaynak.kisa_ad,
        hedef_birim_id=str(hedef.id),
        hedef_birim_ad=hedef.ad,
        hedef_birim_kisa_ad=hedef.kisa_ad,
        kaynak_miktar=request.miktar,
        donusum_orani=float(donusum.donusum_orani),
        hedef_miktar=round(hedef_miktar, 6),
    )
