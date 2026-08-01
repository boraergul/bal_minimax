"""
Batch/Toplu İşlem API for bulk data import/export
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
from app.models.toplu_islem import TopluIslem, TopluIslemSatir

router = APIRouter()


# ============== Pydantic Schemas ==============

class SatirVeriRequest(BaseModel):
    """Single row data in batch operation."""
    satir_verisi: dict


class TopluIslemCreateRequest(BaseModel):
    """Request to create a new batch operation."""
    islem_turu: str  # STOK_GIRISI, URETIM_EMRI, MUSKAYIT, TEDARIKCI_KAYIT, STOK_DUZELTME, ETIKET_BASKI, SATIS_IRAC
    satir_verileri: List[dict]


class TopluIslemOnayRequest(BaseModel):
    """Request to approve a batch operation."""
    onay_leyen_id: str
    not_text: Optional[str] = None


class TopluIslemRedRequest(BaseModel):
    """Request to reject a batch operation."""
    ret_nedeni: str


class TopluIslemSatirResponse(BaseModel):
    """Batch operation line item response."""
    satir_id: str
    toplu_islem_id: str
    satir_no: int
    durum: str
    satir_verisi: dict
    islenen_veri: Optional[dict]
    olusturulan_id: Optional[str]
    hata_mesaji: Optional[str]
    olusturma_tarihi: str

    class Config:
        from_attributes = True


class TopluIslemResponse(BaseModel):
    """Batch operation master record response."""
    islem_id: str
    islem_turu: str
    islem_no: str
    durum: str
    dosya_adi: Optional[str]
    satir_sayisi: int
    basarili_satir: int
    basarisiz_satir: int
    islenen_satir: int
    validasyon_hatalari: Optional[List[dict]]
    onay_durumu: str
    onay_leyen_id: Optional[str]
    onay_tarihi: Optional[str]
    ret_nedeni: Optional[str]
    sonuc_dosya_url: Optional[str]
    not_text: Optional[str]
    olusturma_tarihi: str
    olusturan_kullanici_id: str

    class Config:
        from_attributes = True


class TopluIslemDetayResponse(BaseModel):
    """Batch operation detail with line summary."""
    islem: TopluIslemResponse
    satirlar_ozeti: dict


class TopluIslemListResponse(BaseModel):
    """Paginated batch operation list."""
    data: List[TopluIslemResponse]
    total: int
    sayfa: int
    sayfa_boyutu: int


class TopluIslemSatirListResponse(BaseModel):
    """Paginated line items list."""
    islem_id: str
    data: List[TopluIslemSatirResponse]
    total: int
    sayfa: int
    sayfa_boyutu: int


class TopluIslemIndirResponse(BaseModel):
    """Download result of processed rows."""
    islem_id: str
    durum: str
    dosya_adi: str
    satirlar: List[dict]


class TopluIslemOnayResponse(BaseModel):
    """Approval result."""
    islem_id: str
    durum: str
    onay_tarihi: str
    onaylayan: str


# ============== Helper Functions ==============

def generate_islem_no(db: Session) -> str:
    """Generate unique batch operation number: TIS-YYYYMMDD-XXX"""
    today = datetime.utcnow().strftime("%Y%m%d")
    
    count = db.query(func.count(TopluIslem.id)).filter(
        TopluIslem.islem_no.like(f"TIS-{today}-%")
    ).scalar() or 0
    
    return f"TIS-{today}-{str(count + 1).zfill(3)}"


def get_valid_islem_turleri() -> List[str]:
    """Get list of valid operation types."""
    return [
        "STOK_GIRISI",
        "URETIM_EMRI",
        "MUSKAYIT",
        "TEDARIKCI_KAYIT",
        "STOK_DUZELTME",
        "ETIKET_BASKI",
        "SATIS_IRAC"
    ]


def get_valid_durumlar() -> List[str]:
    """Get list of valid status values."""
    return [
        "BEKLEMEDE",
        "VALIDATING",
        "ISLENIYOR",
        "TAMAMLANDI",
        "HATALAR_VAR",
        "IPTAL_EDILDI"
    ]


def get_satir_valid_durumlar() -> List[str]:
    """Get list of valid line status values."""
    return [
        "BEKLEMEDE",
        "BASARILI",
        "BASARISIZ",
        "ATLANDI"
    ]


# ============== Endpoints ==============

@router.get("/", response_model=TopluIslemListResponse)
async def list_toplu_islemler(
    sayfa: int = Query(1, ge=1),
    sayfa_boyutu: int = Query(20, ge=1, le=100),
    islem_turu: Optional[str] = None,
    durum: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    List batch operations with pagination and filters.
    """
    query = db.query(TopluIslem).filter(
        TopluIslem.silme_tarihi.is_(None)
    )
    
    if islem_turu:
        query = query.filter(TopluIslem.islem_turu == islem_turu)
    if durum:
        query = query.filter(TopluIslem.durum == durum)
    
    total = query.count()
    islemler = query.order_by(TopluIslem.olusturma_tarihi.desc()).offset(
        (sayfa - 1) * sayfa_boyutu
    ).limit(sayfa_boyutu).all()
    
    result = [
        TopluIslemResponse(
            islem_id=str(i.id),
            islem_turu=i.islem_turu,
            islem_no=i.islem_no,
            durum=i.durum,
            dosya_adi=i.dosya_adi,
            satir_sayisi=i.satir_sayisi or 0,
            basarili_satir=i.basarili_satir or 0,
            basarisiz_satir=i.basarisiz_satir or 0,
            islenen_satir=i.islenen_satir or 0,
            validasyon_hatalari=i.validasyon_hatalari,
            onay_durumu=i.onay_durumu,
            onay_leyen_id=str(i.onay_leyen_id) if i.onay_leyen_id else None,
            onay_tarihi=i.onay_tarihi,
            ret_nedeni=i.ret_nedeni,
            sonuc_dosya_url=i.sonuc_dosya_url,
            not_text=i.not_text,
            olusturma_tarihi=i.olusturma_tarihi,
            olusturan_kullanici_id=str(i.olusturan_kullanici_id)
        )
        for i in islemler
    ]
    
    return TopluIslemListResponse(
        data=result,
        total=total,
        sayfa=sayfa,
        sayfa_boyutu=sayfa_boyutu
    )


@router.post("/", response_model=TopluIslemResponse)
async def create_toplu_islem(
    request: TopluIslemCreateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Create a new batch operation (file upload simulation).
    
    Auto-generates:
    - islem_no: TIS-YYYYMMDD-XXX format
    
    Auto-sets:
    - durum: VALIDATING
    - Creates TopluIslemSatir for each row
    """
    # Validate islem_turu
    valid_types = get_valid_islem_turleri()
    if request.islem_turu not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Geçersiz işlem türü. Geçerli değerler: {valid_types}"
        )
    
    if not request.satir_verileri:
        raise HTTPException(status_code=400, detail="En az bir satır verisi gerekli")
    
    # Generate operation number
    islem_no = generate_islem_no(db)
    olusturma_tarihi = datetime.utcnow().isoformat()
    
    # Create master record
    islem = TopluIslem(
        islem_turu=request.islem_turu,
        islem_no=islem_no,
        durum="VALIDATING",
        satir_sayisi=len(request.satir_verileri),
        validasyon_tarihi=olusturma_tarihi,
        olusturma_tarihi=olusturma_tarihi,
        olusturan_kullanici_id=current_user.id
    )
    
    db.add(islem)
    db.flush()
    
    # Create line items
    satir_count = 0
    for idx, satir_data in enumerate(request.satir_verileri, start=1):
        # Simulate validation - check required fields
        errors = []
        if request.islem_turu == "STOK_GIRISI":
            required = ["urun_id", "miktar", "birim_fiyat"]
            for field in required:
                if field not in satir_data:
                    errors.append(f"Eksik alan: {field}")
        
        durum = "BASARISIZ" if errors else "BEKLEMEDE"
        
        satir = TopluIslemSatir(
            toplu_islem_id=islem.id,
            satir_no=idx,
            satir_verisi=satir_data,
            durum=durum,
            hata_mesaji="; ".join(errors) if errors else None,
            olusturma_tarihi=olusturma_tarihi
        )
        db.add(satir)
        satir_count += 1
        
        if errors:
            islem.basarisiz_satir = (islem.basarisiz_satir or 0) + 1
        else:
            islem.basarili_satir = (islem.basarili_satir or 0) + 1
    
    # Update status based on validation
    if islem.basarisiz_satir > 0 and islem.basarili_satir == 0:
        islem.durum = "HATALAR_VAR"
    else:
        islem.durum = "ISLENIYOR"
    
    db.commit()
    db.refresh(islem)
    
    return TopluIslemResponse(
        islem_id=str(islem.id),
        islem_turu=islem.islem_turu,
        islem_no=islem.islem_no,
        durum=islem.durum,
        dosya_adi=islem.dosya_adi,
        satir_sayisi=islem.satir_sayisi or 0,
        basarili_satir=islem.basarili_satir or 0,
        basarisiz_satir=islem.basarisiz_satir or 0,
        islenen_satir=islem.islenen_satir or 0,
        validasyon_hatalari=islem.validasyon_hatalari,
        onay_durumu=islem.onay_durumu,
        onay_leyen_id=str(islem.onay_leyen_id) if islem.onay_leyen_id else None,
        onay_tarihi=islem.onay_tarihi,
        ret_nedeni=islem.ret_nedeni,
        sonuc_dosya_url=islem.sonuc_dosya_url,
        not_text=islem.not_text,
        olusturma_tarihi=islem.olusturma_tarihi,
        olusturan_kullanici_id=str(islem.olusturan_kullanici_id)
    )


@router.get("/{islem_id}", response_model=TopluIslemDetayResponse)
async def get_toplu_islem_detay(
    islem_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Get batch operation detail with line summary.
    """
    islem = db.query(TopluIslem).filter(
        TopluIslem.id == islem_id,
        TopluIslem.silme_tarihi.is_(None)
    ).first()
    
    if not islem:
        raise HTTPException(status_code=404, detail="Toplu işlem bulunamadı")
    
    # Get line summary
    satirlar = db.query(TopluIslemSatir).filter(
        TopluIslemSatir.toplu_islem_id == islem_id
    ).all()
    
    durum_sayilari = {}
    for s in satirlar:
        durum_sayilari[s.durum] = durum_sayilari.get(s.durum, 0) + 1
    
    satirlar_ozeti = {
        "toplam": len(satirlar),
        "durum_dagilimi": durum_sayilari,
        "basarili": durum_sayilari.get("BASARILI", 0),
        "basarisiz": durum_sayilari.get("BASARISIZ", 0),
        "atlandi": durum_sayilari.get("ATLANDI", 0),
        "beklemede": durum_sayilari.get("BEKLEMEDE", 0)
    }
    
    islem_response = TopluIslemResponse(
        islem_id=str(islem.id),
        islem_turu=islem.islem_turu,
        islem_no=islem.islem_no,
        durum=islem.durum,
        dosya_adi=islem.dosya_adi,
        satir_sayisi=islem.satir_sayisi or 0,
        basarili_satir=islem.basarili_satir or 0,
        basarisiz_satir=islem.basarisiz_satir or 0,
        islenen_satir=islem.islenen_satir or 0,
        validasyon_hatalari=islem.validasyon_hatalari,
        onay_durumu=islem.onay_durumu,
        onay_leyen_id=str(islem.onay_leyen_id) if islem.onay_leyen_id else None,
        onay_tarihi=islem.onay_tarihi,
        ret_nedeni=islem.ret_nedeni,
        sonuc_dosya_url=islem.sonuc_dosya_url,
        not_text=islem.not_text,
        olusturma_tarihi=islem.olusturma_tarihi,
        olusturan_kullanici_id=str(islem.olusturan_kullanici_id)
    )
    
    return TopluIslemDetayResponse(
        islem=islem_response,
        satirlar_ozeti=satirlar_ozeti
    )


@router.get("/{islem_id}/satirlar", response_model=TopluIslemSatirListResponse)
async def list_toplu_islem_satirlar(
    islem_id: str,
    sayfa: int = Query(1, ge=1),
    sayfa_boyutu: int = Query(50, ge=1, le=200),
    durum: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Get batch operation line items with pagination and filtering.
    """
    # Verify operation exists
    islem = db.query(TopluIslem).filter(
        TopluIslem.id == islem_id,
        TopluIslem.silme_tarihi.is_(None)
    ).first()
    
    if not islem:
        raise HTTPException(status_code=404, detail="Toplu işlem bulunamadı")
    
    query = db.query(TopluIslemSatir).filter(
        TopluIslemSatir.toplu_islem_id == islem_id
    )
    
    if durum:
        query = query.filter(TopluIslemSatir.durum == durum)
    
    total = query.count()
    satirlar = query.order_by(TopluIslemSatir.satir_no.asc()).offset(
        (sayfa - 1) * sayfa_boyutu
    ).limit(sayfa_boyutu).all()
    
    result = [
        TopluIslemSatirResponse(
            satir_id=str(s.id),
            toplu_islem_id=str(s.toplu_islem_id),
            satir_no=s.satir_no,
            durum=s.durum,
            satir_verisi=s.satir_verisi,
            islenen_veri=s.islenen_veri,
            olusturulan_id=str(s.olusturulan_id) if s.olusturulan_id else None,
            hata_mesaji=s.hata_mesaji,
            olusturma_tarihi=s.olusturma_tarihi
        )
        for s in satirlar
    ]
    
    return TopluIslemSatirListResponse(
        islem_id=str(islem_id),
        data=result,
        total=total,
        sayfa=sayfa,
        sayfa_boyutu=sayfa_boyutu
    )


@router.get("/{islem_id}/indir", response_model=TopluIslemIndirResponse)
async def indir_toplu_islem_sonuc(
    islem_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Download processed rows result (returns JSON of processed rows).
    """
    islem = db.query(TopluIslem).filter(
        TopluIslem.id == islem_id,
        TopluIslem.silme_tarihi.is_(None)
    ).first()
    
    if not islem:
        raise HTTPException(status_code=404, detail="Toplu işlem bulunamadı")
    
    satirlar = db.query(TopluIslemSatir).filter(
        TopluIslemSatir.toplu_islem_id == islem_id
    ).all()
    
    result_satirlar = []
    for s in satirlar:
        row = {
            "satir_no": s.satir_no,
            "durum": s.durum,
            "orijinal_veri": s.satir_verisi,
            "islenen_veri": s.islenen_veri,
            "olusturulan_id": str(s.olusturulan_id) if s.olusturulan_id else None,
            "hata_mesaji": s.hata_mesaji
        }
        result_satirlar.append(row)
    
    dosya_adi = f"{islem.islem_no}_sonuc.json"
    
    return TopluIslemIndirResponse(
        islem_id=str(islem.id),
        durum=islem.durum,
        dosya_adi=dosya_adi,
        satirlar=result_satirlar
    )


@router.post("/{islem_id}/onayla", response_model=TopluIslemOnayResponse)
async def onayla_toplu_islem(
    islem_id: str,
    request: TopluIslemOnayRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Approve batch operation by administrator.
    
    Updates:
    - onay_durumu: ONAYLANDI
    - onay_tarihi: current timestamp
    - durum: ISLENIYOR then TAMAMLANDI (simulated async)
    """
    islem = db.query(TopluIslem).filter(
        TopluIslem.id == islem_id,
        TopluIslem.silme_tarihi.is_(None)
    ).first()
    
    if not islem:
        raise HTTPException(status_code=404, detail="Toplu işlem bulunamadı")
    
    # Check if already approved or rejected
    if islem.onay_durumu in ["ONAYLANDI", "REDDEDILDI"]:
        raise HTTPException(
            status_code=400,
            detail=f"Bu işlem zaten {islem.onay_durumu.lower()}"
        )
    
    # Check if operation is in valid state for approval
    if islem.durum not in ["VALIDATING", "ISLENIYOR"]:
        raise HTTPException(
            status_code=400,
            detail="Bu durumdaki işlem onaylanamaz"
        )
    
    onay_tarihi = datetime.utcnow().isoformat()
    
    # Update approval info
    islem.onay_durumu = "ONAYLANDI"
    islem.onay_leyen_id = request.onay_leyen_id
    islem.onay_tarihi = onay_tarihi
    if request.not_text:
        islem.not_text = request.not_text
    
    # Simulate async processing
    islem.durum = "ISLENIYOR"
    islem.islem_baslangic = onay_tarihi
    
    db.commit()
    
    # Simulate completion (in real scenario, this would be async)
    # For now, just mark as completed
    bitis_tarihi = datetime.utcnow().isoformat()
    islem.durum = "TAMAMLANDI"
    islem.islem_bitis = bitis_tarihi
    
    # Update all pending lines to BASARILI
    db.query(TopluIslemSatir).filter(
        TopluIslemSatir.toplu_islem_id == islem_id,
        TopluIslemSatir.durum == "BEKLEMEDE"
    ).update({
        TopluIslemSatir.durum: "BASARILI",
        TopluIslemSatir.islenen_veri: TopluIslemSatir.satir_verisi
    })
    
    islem.islenen_satir = islem.satir_sayisi
    
    db.commit()
    db.refresh(islem)
    
    # Get approver name
    onaylayan = request.onay_leyen_id
    
    return TopluIslemOnayResponse(
        islem_id=str(islem.id),
        durum=islem.durum,
        onay_tarihi=onay_tarihi,
        onaylayan=onaylayan
    )


@router.post("/{islem_id}/reddet", response_model=TopluIslemResponse)
async def reddet_toplu_islem(
    islem_id: str,
    request: TopluIslemRedRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Reject batch operation.
    
    Updates:
    - onay_durumu: REDDEDILDI
    - ret_nedeni: rejection reason
    """
    islem = db.query(TopluIslem).filter(
        TopluIslem.id == islem_id,
        TopluIslem.silme_tarihi.is_(None)
    ).first()
    
    if not islem:
        raise HTTPException(status_code=404, detail="Toplu işlem bulunamadı")
    
    # Check if already processed
    if islem.onay_durumu in ["ONAYLANDI", "REDDEDILDI"]:
        raise HTTPException(
            status_code=400,
            detail=f"Bu işlem zaten {islem.onay_durumu.lower()}"
        )
    
    # Update rejection
    islem.onay_durumu = "REDDEDILDI"
    islem.ret_nedeni = request.ret_nedeni
    islem.durum = "IPTAL_EDILDI"
    
    db.commit()
    db.refresh(islem)
    
    return TopluIslemResponse(
        islem_id=str(islem.id),
        islem_turu=islem.islem_turu,
        islem_no=islem.islem_no,
        durum=islem.durum,
        dosya_adi=islem.dosya_adi,
        satir_sayisi=islem.satir_sayisi or 0,
        basarili_satir=islem.basarili_satir or 0,
        basarisiz_satir=islem.basarisiz_satir or 0,
        islenen_satir=islem.islenen_satir or 0,
        validasyon_hatalari=islem.validasyon_hatalari,
        onay_durumu=islem.onay_durumu,
        onay_leyen_id=str(islem.onay_leyen_id) if islem.onay_leyen_id else None,
        onay_tarihi=islem.onay_tarihi,
        ret_nedeni=islem.ret_nedeni,
        sonuc_dosya_url=islem.sonuc_dosya_url,
        not_text=islem.not_text,
        olusturma_tarihi=islem.olusturma_tarihi,
        olusturan_kullanici_id=str(islem.olusturan_kullanici_id)
    )


@router.delete("/{islem_id}", response_model=TopluIslemResponse)
async def iptal_toplu_islem(
    islem_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Cancel batch operation.
    
    Sets durum to IPTAL_EDILDI.
    """
    islem = db.query(TopluIslem).filter(
        TopluIslem.id == islem_id,
        TopluIslem.silme_tarihi.is_(None)
    ).first()
    
    if not islem:
        raise HTTPException(status_code=404, detail="Toplu işlem bulunamadı")
    
    # Cannot cancel completed operations
    if islem.durum == "TAMAMLANDI":
        raise HTTPException(
            status_code=400,
            detail="Tamamlanmış işlemler iptal edilemez"
        )
    
    iptal_tarihi = datetime.utcnow().isoformat()
    islem.durum = "IPTAL_EDILDI"
    islem.silme_tarihi = iptal_tarihi
    
    db.commit()
    db.refresh(islem)
    
    return TopluIslemResponse(
        islem_id=str(islem.id),
        islem_turu=islem.islem_turu,
        islem_no=islem.islem_no,
        durum=islem.durum,
        dosya_adi=islem.dosya_adi,
        satir_sayisi=islem.satir_sayisi or 0,
        basarili_satir=islem.basarili_satir or 0,
        basarisiz_satir=islem.basarisiz_satir or 0,
        islenen_satir=islem.islenen_satir or 0,
        validasyon_hatalari=islem.validasyon_hatalari,
        onay_durumu=islem.onay_durumu,
        onay_leyen_id=str(islem.onay_leyen_id) if islem.onay_leyen_id else None,
        onay_tarihi=islem.onay_tarihi,
        ret_nedeni=islem.ret_nedeni,
        sonuc_dosya_url=islem.sonuc_dosya_url,
        not_text=islem.not_text,
        olusturma_tarihi=islem.olusturma_tarihi,
        olusturan_kullanici_id=str(islem.olusturan_kullanici_id)
    )
