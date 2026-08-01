"""
Product Attributes API router
Ürün Özellik Tanımlama ve Lot Özellik Değerleri Yönetimi
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from uuid import UUID

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import Kullanici
from app.models.urun import Urun, UrunOzellik
from app.models.stok import StokKarti, LotOzellik

router = APIRouter()


# ==================== SCHEMAS ====================

class OzellikTip(str):
    METIN = "METIN"
    SAYI = "SAYI"
    ENUM = "ENUM"
    BOOLEAN = "BOOLEAN"
    TARIH = "TARIH"


class Kategori(str):
    MEYVE = "MEYVE"
    BAL = "BAL"
    TUML = "TUML"
    KARSIM = "KARSIM"


class OzellikCreate(BaseModel):
    kategori: str
    alan_adi: str
    goruntu_adi: str
    tip: str  # METIN, SAYI, ENUM, BOOLEAN, TARIH
    zorunlu: bool = False
    etikette_goster: bool = False
    etikette_zorunlu: bool = False
    siralama: int = 0
    varsayilan_deger: Optional[str] = None
    enum_degerleri: List[str] = []


class OzellikUpdate(BaseModel):
    kategori: Optional[str] = None
    alan_adi: Optional[str] = None
    goruntu_adi: Optional[str] = None
    tip: Optional[str] = None
    zorunlu: Optional[bool] = None
    etikette_goster: Optional[bool] = None
    etikette_zorunlu: Optional[bool] = None
    siralama: Optional[int] = None
    varsayilan_deger: Optional[str] = None
    enum_degerleri: Optional[List[str]] = None


class OzellikResponse(BaseModel):
    id: str
    urun_id: Optional[str]
    kategori: str
    alan_adi: str
    goruntu_adi: str
    tip: str
    zorunlu: bool
    etikette_goster: bool
    etikette_zorunlu: bool
    siralama: int
    varsayilan_deger: Optional[str]
    enum_degerleri: List[str]

    class Config:
        from_attributes = True


class LotOzellikCreate(BaseModel):
    ozellik_id: str
    deger: str
    birim: Optional[str] = None


class LotOzellikUpdate(BaseModel):
    deger: Optional[str] = None
    birim: Optional[str] = None


class LotOzellikItem(BaseModel):
    ozellik_id: str
    deger: str
    birim: Optional[str] = None


class LotOzellikTopluUpdate(BaseModel):
    ozellikler: List[LotOzellikItem]


class LotOzellikResponse(BaseModel):
    id: str
    stok_id: str
    ozellik_id: str
    ozellik_adi: str
    ozellik_goruntu_adi: str
    ozellik_tip: str
    deger: str
    birim: Optional[str]

    class Config:
        from_attributes = True


# ==================== ENDPOINTS ====================

# Özellik Tanımları

@router.get("/", response_model=List[OzellikResponse])
async def list_ozellikler(
    kategori: Optional[str] = Query(None, description="Filtreleme: MEYVE, BAL, TUML"),
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Tüm özellik tanımlarını listele."""
    query = db.query(UrunOzellik)
    
    if kategori:
        # Also include TUML (universal) attributes
        query = query.filter(
            (UrunOzellik.kategori == kategori) | 
            (UrunOzellik.kategori == "TUML")
        )
    
    ozellikler = query.order_by(UrunOzellik.kategori, UrunOzellik.siralama).all()
    
    return [
        OzellikResponse(
            id=str(o.id),
            urun_id=str(o.urun_id) if o.urun_id else None,
            kategori=o.kategori,
            alan_adi=o.alan_adi,
            goruntu_adi=o.goruntu_adi,
            tip=o.tip,
            zorunlu=o.zorunlu,
            etikette_goster=o.etikette_goster,
            etikette_zorunlu=o.etikette_zorunlu,
            siralama=o.siralama,
            varsayilan_deger=o.varsayilan_deger,
            enum_degerleri=o.enum_degerleri or []
        )
        for o in ozellikler
    ]


@router.post("/", response_model=OzellikResponse)
async def create_ozellik(
    ozellik_data: OzellikCreate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Yeni özellik tanımı oluştur."""
    # Check for duplicate
    existing = db.query(UrunOzellik).filter(
        UrunOzellik.kategori == ozellik_data.kategori,
        UrunOzellik.alan_adi == ozellik_data.alan_adi
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"'{ozellik_data.alan_adi}' özelliği '{ozellik_data.kategori}' kategorisinde zaten mevcut"
        )
    
    ozellik = UrunOzellik(
        kategori=ozellik_data.kategori,
        alan_adi=ozellik_data.alan_adi,
        goruntu_adi=ozellik_data.goruntu_adi,
        tip=ozellik_data.tip,
        zorunlu=ozellik_data.zorunlu,
        etikette_goster=ozellik_data.etikette_goster,
        etikette_zorunlu=ozellik_data.etikette_zorunlu,
        siralama=ozellik_data.siralama,
        varsayilan_deger=ozellik_data.varsayilan_deger,
        enum_degerleri=ozellik_data.enum_degerleri
    )
    
    db.add(ozellik)
    db.commit()
    db.refresh(ozellik)
    
    return OzellikResponse(
        id=str(ozellik.id),
        urun_id=None,
        kategori=ozellik.kategori,
        alan_adi=ozellik.alan_adi,
        goruntu_adi=ozellik.goruntu_adi,
        tip=ozellik.tip,
        zorunlu=ozellik.zorunlu,
        etikette_goster=ozellik.etikette_goster,
        etikette_zorunlu=ozellik.etikette_zorunlu,
        siralama=ozellik.siralama,
        varsayilan_deger=ozellik.varsayilan_deger,
        enum_degerleri=ozellik.enum_degerleri or []
    )


@router.get("/{ozellik_id}", response_model=OzellikResponse)
async def get_ozellik(
    ozellik_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Özellik detayını getir."""
    ozellik = db.query(UrunOzellik).filter(UrunOzellik.id == ozellik_id).first()
    
    if not ozellik:
        raise HTTPException(status_code=404, detail="Özellik bulunamadı")
    
    return OzellikResponse(
        id=str(ozellik.id),
        urun_id=str(ozellik.urun_id) if ozellik.urun_id else None,
        kategori=ozellik.kategori,
        alan_adi=ozellik.alan_adi,
        goruntu_adi=ozellik.goruntu_adi,
        tip=ozellik.tip,
        zorunlu=ozellik.zorunlu,
        etikette_goster=ozellik.etikette_goster,
        etikette_zorunlu=ozellik.etikette_zorunlu,
        siralama=ozellik.siralama,
        varsayilan_deger=ozellik.varsayilan_deger,
        enum_degerleri=ozellik.enum_degerleri or []
    )


@router.put("/{ozellik_id}", response_model=OzellikResponse)
async def update_ozellik(
    ozellik_id: str,
    ozellik_data: OzellikUpdate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Özellik güncelle."""
    ozellik = db.query(UrunOzellik).filter(UrunOzellik.id == ozellik_id).first()
    
    if not ozellik:
        raise HTTPException(status_code=404, detail="Özellik bulunamadı")
    
    update_data = ozellik_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(ozellik, key, value)
    
    db.commit()
    db.refresh(ozellik)
    
    return OzellikResponse(
        id=str(ozellik.id),
        urun_id=str(ozellik.urun_id) if ozellik.urun_id else None,
        kategori=ozellik.kategori,
        alan_adi=ozellik.alan_adi,
        goruntu_adi=ozellik.goruntu_adi,
        tip=ozellik.tip,
        zorunlu=ozellik.zorunlu,
        etikette_goster=ozellik.etikette_goster,
        etikette_zorunlu=ozellik.etikette_zorunlu,
        siralama=ozellik.siralama,
        varsayilan_deger=ozellik.varsayilan_deger,
        enum_degerleri=ozellik.enum_degerleri or []
    )


@router.delete("/{ozellik_id}")
async def delete_ozellik(
    ozellik_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Özellik sil (soft delete - sadece aktif flag)."""
    ozellik = db.query(UrunOzellik).filter(UrunOzellik.id == ozellik_id).first()
    
    if not ozellik:
        raise HTTPException(status_code=404, detail="Özellik bulunamadı")
    
    # Note: UrunOzellik model doesn't have silme_tarihi or aktif field
    # Just delete for now, or we can add a note
    db.delete(ozellik)
    db.commit()
    
    return {"message": "Özellik silindi"}


@router.get("/kategori/{kategori}", response_model=List[OzellikResponse])
async def get_kategori_ozellikler(
    kategori: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Belirli bir kategoriye ait özellikleri listele."""
    ozellikler = db.query(UrunOzellik).filter(
        (UrunOzellik.kategori == kategori) | 
        (UrunOzellik.kategori == "TUML")
    ).order_by(UrunOzellik.siralama).all()
    
    return [
        OzellikResponse(
            id=str(o.id),
            urun_id=str(o.urun_id) if o.urun_id else None,
            kategori=o.kategori,
            alan_adi=o.alan_adi,
            goruntu_adi=o.goruntu_adi,
            tip=o.tip,
            zorunlu=o.zorunlu,
            etikette_goster=o.etikette_goster,
            etikette_zorunlu=o.etikette_zorunlu,
            siralama=o.siralama,
            varsayilan_deger=o.varsayilan_deger,
            enum_degerleri=o.enum_degerleri or []
        )
        for o in ozellikler
    ]


# Kategori Şablonları

@router.get("/kategori/{kategori}/sablon", response_model=List[OzellikResponse])
async def get_kategori_sablon(
    kategori: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Kategori varsayılan şablonunu getir."""
    # Varsayılan şablon: kategorinin kendi özellikleri + TUML özellikleri
    ozellikler = db.query(UrunOzellik).filter(
        (UrunOzellik.kategori == kategori) | 
        (UrunOzellik.kategori == "TUML")
    ).order_by(UrunOzellik.siralama).all()
    
    return [
        OzellikResponse(
            id=str(o.id),
            urun_id=str(o.urun_id) if o.urun_id else None,
            kategori=o.kategori,
            alan_adi=o.alan_adi,
            goruntu_adi=o.goruntu_adi,
            tip=o.tip,
            zorunlu=o.zorunlu,
            etikette_goster=o.etikette_goster,
            etikette_zorunlu=o.etikette_zorunlu,
            siralama=o.siralama,
            varsayilan_deger=o.varsayilan_deger,
            enum_degerleri=o.enum_degerleri or []
        )
        for o in ozellikler
    ]


@router.post("/kategori/{kategori}/seed")
async def seed_kategori_ozellikler(
    kategori: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Kategori varsayılan özelliklerini oluştur (seed data)."""
    
    seed_data = {
        "MEYVE": [
            {"alan_adi": "Renk", "goruntu_adi": "Renk", "tip": "ENUM", 
             "enum_degerleri": ["Sarı", "Turuncu", "Kırmızı", "Yeşil", "Kahverengi", "Mor"],
             "siralama": 1, "zorunlu": True, "etikette_goster": True},
            {"alan_adi": "Boyut", "goruntu_adi": "Boyut", "tip": "ENUM",
             "enum_degerleri": ["Çok Küçük", "Küçük", "Orta", "Büyük", "Çok Büyük"],
             "siralama": 2, "zorunlu": False, "etikette_goster": False},
            {"alan_adi": "Parca_Buyuklugu", "goruntu_adi": "Parça Büyüklüğü", "tip": "ENUM",
             "enum_degerleri": ["Toz", "Kırık", "Yarım", "Tam"],
             "siralama": 3, "zorunlu": True, "etikette_goster": True},
            {"alan_adi": "Nem_Orani", "goruntu_adi": "Nem Oranı (%)", "tip": "SAYI",
             "siralama": 4, "zorunlu": True, "etikette_goster": False},
            {"alan_adi": "Asitlik", "goruntu_adi": "Asitlik (pH)", "tip": "SAYI",
             "siralama": 5, "zorunlu": False, "etikette_goster": False},
            {"alan_adi": "Kukurtlu", "goruntu_adi": "Kükürtlü", "tip": "BOOLEAN",
             "siralama": 6, "zorunlu": False, "etikette_goster": False},
            {"alan_adi": "Seiker_Orani", "goruntu_adi": "Şeker Oranı (%)", "tip": "SAYI",
             "siralama": 7, "zorunlu": False, "etikette_goster": False},
        ],
        "BAL": [
            {"alan_adi": "Renk", "goruntu_adi": "Renk", "tip": "ENUM",
             "enum_degerleri": ["Açık Sarı", "Sarı", "Koyu Sarı", "Kahverengi", "Siyah"],
             "siralama": 1, "zorunlu": True, "etikette_goster": True},
            {"alan_adi": "Kristalizasyon", "goruntu_adi": "Kristalizasyon", "tip": "ENUM",
             "enum_degerleri": ["Sıvı", "Kremamsı", "Kristal", "Yarı Kristal"],
             "siralama": 2, "zorunlu": True, "etikette_goster": True},
            {"alan_adi": "Koken", "goruntu_adi": "Köken", "tip": "ENUM",
             "enum_degerleri": ["Çiçek", "Çam", "Kestane", "Akasya", "Narenciye", "Karakılçık"],
             "siralama": 3, "zorunlu": False, "etikette_goster": True},
            {"alan_adi": "pH_Degeri", "goruntu_adi": "pH Değeri", "tip": "SAYI",
             "siralama": 4, "zorunlu": False, "etikette_goster": False},
            {"alan_adi": "Nem_Orani", "goruntu_adi": "Nem Oranı (%)", "tip": "SAYI",
             "siralama": 5, "zorunlu": True, "etikette_goster": False},
            {"alan_adi": "Diastaz_Sayisi", "goruntu_adi": "Diastaz Sayısı (DN)", "tip": "SAYI",
             "siralama": 6, "zorunlu": True, "etikette_goster": True},
            {"alan_adi": "HMF_Degeri", "goruntu_adi": "HMF Değeri (mg/kg)", "tip": "SAYI",
             "siralama": 7, "zorunlu": True, "etikette_goster": True},
        ],
        "KARSIM": [
            {"alan_adi": "Renk", "goruntu_adi": "Renk", "tip": "ENUM",
             "enum_degerleri": ["Doğal", "Kaplamalı", "Renklendirilmiş"],
             "siralama": 1, "zorunlu": True, "etikette_goster": True},
            {"alan_adi": "Gramaj", "goruntu_adi": "Gramaj (g)", "tip": "SAYI",
             "siralama": 2, "zorunlu": True, "etikette_goster": True},
        ],
    }
    
    if kategori not in seed_data:
        raise HTTPException(status_code=400, detail=f"{kategori} kategorisi için seed verisi tanımlanmamış")
    
    created = []
    skipped = []
    
    for data in seed_data[kategori]:
        # Check if already exists
        existing = db.query(UrunOzellik).filter(
            UrunOzellik.kategori == kategori,
            UrunOzellik.alan_adi == data["alan_adi"]
        ).first()
        
        if existing:
            skipped.append(data["alan_adi"])
            continue
        
        ozellik = UrunOzellik(
            kategori=kategori,
            alan_adi=data["alan_adi"],
            goruntu_adi=data["goruntu_adi"],
            tip=data["tip"],
            zorunlu=data.get("zorunlu", False),
            etikette_goster=data.get("etikette_goster", False),
            etikette_zorunlu=data.get("etikette_zorunlu", False),
            siralama=data.get("siralama", 0),
            enum_degerleri=data.get("enum_degerleri", [])
        )
        db.add(ozellik)
        created.append(data["alan_adi"])
    
    db.commit()
    
    return {
        "message": f"{kategori} kategorisi için {len(created)} özellik oluşturuldu",
        "olusturulan": created,
        "atlanan": skipped
    }


# Lot Özellik Değerleri

@router.get("/lot/{stok_id}", response_model=List[LotOzellikResponse])
async def get_lot_ozellikler(
    stok_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Lota ait özellik değerlerini listele."""
    # Verify stok exists
    stok = db.query(StokKarti).filter(StokKarti.id == stok_id).first()
    if not stok:
        raise HTTPException(status_code=404, detail="Stok kartı bulunamadı")
    
    lot_ozellikler = db.query(LotOzellik).filter(
        LotOzellik.stok_id == stok_id
    ).all()
    
    result = []
    for lo in lot_ozellikler:
        ozellik = db.query(UrunOzellik).filter(UrunOzellik.id == lo.ozellik_id).first()
        if ozellik:
            result.append(LotOzellikResponse(
                id=str(lo.id),
                stok_id=str(lo.stok_id),
                ozellik_id=str(lo.ozellik_id),
                ozellik_adi=ozellik.alan_adi,
                ozellik_goruntu_adi=ozellik.goruntu_adi,
                ozellik_tip=ozellik.tip,
                deger=lo.deger,
                birim=lo.birim
            ))
    
    return result


@router.post("/lot/{stok_id}", response_model=LotOzellikResponse)
async def add_lot_ozellik(
    stok_id: str,
    ozellik_data: LotOzellikCreate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Lot özellik değeri ekle."""
    # Verify stok exists
    stok = db.query(StokKarti).filter(StokKarti.id == stok_id).first()
    if not stok:
        raise HTTPException(status_code=404, detail="Stok kartı bulunamadı")
    
    # Verify ozellik exists
    ozellik = db.query(UrunOzellik).filter(UrunOzellik.id == ozellik_data.ozellik_id).first()
    if not ozellik:
        raise HTTPException(status_code=404, detail="Özellik bulunamadı")
    
    # Check for duplicate
    existing = db.query(LotOzellik).filter(
        LotOzellik.stok_id == stok_id,
        LotOzellik.ozellik_id == ozellik_data.ozellik_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="Bu özellik zaten bu lot için tanımlı"
        )
    
    lot_ozellik = LotOzellik(
        stok_id=stok_id,
        ozellik_id=ozellik_data.ozellik_id,
        deger=ozellik_data.deger,
        birim=ozellik_data.birim
    )
    
    db.add(lot_ozellik)
    db.commit()
    db.refresh(lot_ozellik)
    
    return LotOzellikResponse(
        id=str(lot_ozellik.id),
        stok_id=str(lot_ozellik.stok_id),
        ozellik_id=str(lot_ozellik.ozellik_id),
        ozellik_adi=ozellik.alan_adi,
        ozellik_goruntu_adi=ozellik.goruntu_adi,
        ozellik_tip=ozellik.tip,
        deger=lot_ozellik.deger,
        birim=lot_ozellik.birim
    )


@router.put("/lot/{stok_id}/{ozellik_id}", response_model=LotOzellikResponse)
async def update_lot_ozellik(
    stok_id: str,
    ozellik_id: str,
    ozellik_data: LotOzellikUpdate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Lot özellik değeri güncelle."""
    lot_ozellik = db.query(LotOzellik).filter(
        LotOzellik.stok_id == stok_id,
        LotOzellik.ozellik_id == ozellik_id
    ).first()
    
    if not lot_ozellik:
        raise HTTPException(status_code=404, detail="Lot özellik değeri bulunamadı")
    
    if ozellik_data.deger is not None:
        lot_ozellik.deger = ozellik_data.deger
    if ozellik_data.birim is not None:
        lot_ozellik.birim = ozellik_data.birim
    
    db.commit()
    db.refresh(lot_ozellik)
    
    # Get ozellik info
    ozellik = db.query(UrunOzellik).filter(UrunOzellik.id == ozellik_id).first()
    
    return LotOzellikResponse(
        id=str(lot_ozellik.id),
        stok_id=str(lot_ozellik.stok_id),
        ozellik_id=str(lot_ozellik.ozellik_id),
        ozellik_adi=ozellik.alan_adi if ozellik else "",
        ozellik_goruntu_adi=ozellik.goruntu_adi if ozellik else "",
        ozellik_tip=ozellik.tip if ozellik else "",
        deger=lot_ozellik.deger,
        birim=lot_ozellik.birim
    )


@router.delete("/lot/{stok_id}/{ozellik_id}")
async def delete_lot_ozellik(
    stok_id: str,
    ozellik_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Lot özellik değeri sil."""
    lot_ozellik = db.query(LotOzellik).filter(
        LotOzellik.stok_id == stok_id,
        LotOzellik.ozellik_id == ozellik_id
    ).first()
    
    if not lot_ozellik:
        raise HTTPException(status_code=404, detail="Lot özellik değeri bulunamadı")
    
    db.delete(lot_ozellik)
    db.commit()
    
    return {"message": "Lot özellik değeri silindi"}


@router.put("/lot/{stok_id}/toplu", response_model=List[LotOzellikResponse])
async def toplu_guncelle_lot_ozellikler(
    stok_id: str,
    request: LotOzellikTopluUpdate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Lot özelliklerini toplu güncelle (upsert)."""
    # Verify stok exists
    stok = db.query(StokKarti).filter(StokKarti.id == stok_id).first()
    if not stok:
        raise HTTPException(status_code=404, detail="Stok kartı bulunamadı")
    
    result = []
    
    for item in request.ozellikler:
        # Check if exists
        existing = db.query(LotOzellik).filter(
            LotOzellik.stok_id == stok_id,
            LotOzellik.ozellik_id == item.ozellik_id
        ).first()
        
        if existing:
            # Update
            existing.deger = item.deger
            if item.birim is not None:
                existing.birim = item.birim
            lot_ozellik = existing
        else:
            # Insert
            lot_ozellik = LotOzellik(
                stok_id=stok_id,
                ozellik_id=item.ozellik_id,
                deger=item.deger,
                birim=item.birim
            )
            db.add(lot_ozellik)
        
        # Get ozellik info
        ozellik = db.query(UrunOzellik).filter(UrunOzellik.id == item.ozellik_id).first()
        
        result.append(LotOzellikResponse(
            id=str(lot_ozellik.id),
            stok_id=str(lot_ozellik.stok_id),
            ozellik_id=str(lot_ozellik.ozellik_id),
            ozellik_adi=ozellik.alan_adi if ozellik else "",
            ozellik_goruntu_adi=ozellik.goruntu_adi if ozellik else "",
            ozellik_tip=ozellik.tip if ozellik else "",
            deger=lot_ozellik.deger,
            birim=lot_ozellik.birim
        ))
    
    db.commit()
    
    return result
