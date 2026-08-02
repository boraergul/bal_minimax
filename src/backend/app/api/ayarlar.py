"""
Sistem Ayarları (System Settings) API.
CRUD endpoints for managing system-wide settings stored in sistem_ayarlari table.
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import Kullanici

router = APIRouter()

# Valid data types for settings
VALID_DATA_TYPES = {"STRING", "INTEGER", "FLOAT", "BOOLEAN", "JSON"}
VALID_KATEGORILER = {"GENEL", "SKT", "STOK", "SATIS", "URETIM", "SISTEM"}

# ---------------------------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------------------------

class AyarCreateRequest(BaseModel):
    ayar_adi: str
    deger: str
    veri_tipi: str = "STRING"  # STRING | INTEGER | FLOAT | BOOLEAN | JSON
    kategori: str = "GENEL"    # GENEL | SKT | STOK | SATIS | URETIM | SISTEM
    aciklama: Optional[str] = None


class AyarUpdateRequest(BaseModel):
    deger: Optional[str] = None
    veri_tipi: Optional[str] = None
    kategori: Optional[str] = None
    aktif: Optional[bool] = None
    aciklama: Optional[str] = None


class AyarResponse(BaseModel):
    id: str
    ayar_adi: str
    deger: Optional[str]
    veri_tipi: str
    kategori: str
    aktif: bool
    aciklama: Optional[str]
    olusturma_tarihi: str
    guncelleme_tarihi: Optional[str]

    class Config:
        from_attributes = True


class AyarListResponse(BaseModel):
    data: List[AyarResponse]
    total: int


class AyarValueResponse(BaseModel):
    """Single value response for quick lookups."""
    ayar_adi: str
    deger: Optional[str]
    veri_tipi: str

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

def _ayar_from_row(row) -> AyarResponse:
    """Convert a database row to AyarResponse."""
    return AyarResponse(
        id=str(row.id),
        ayar_adi=row.ayar_adi,
        deger=row.deger,
        veri_tipi=row.veri_tipi,
        kategori=row.kategori,
        aktif=row.aktif,
        aciklama=row.aciklama if hasattr(row, 'aciklama') else None,
        olusturma_tarihi=str(row.olusturma_tarihi),
        guncelleme_tarihi=str(row.guncelleme_tarihi) if row.guncelleme_tarihi else None,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/", response_model=AyarListResponse)
async def list_ayarlar(
    kategori: Optional[str] = Query(None, description="Kategori ile filtrele"),
    aktif: Optional[bool] = Query(None, description="Aktif/Pasif filtre"),
    search: Optional[str] = Query(None, description="Ayar adında arama"),
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """
    Tüm sistem ayarlarını listele.
    Varsayılan olarak sadece aktif ayarları döner.
    """
    sql = """
        SELECT id, ayar_adi, deger, veri_tipi, kategori, aktif,
               olusturma_tarihi, guncelleme_tarihi,
               NULL as aciklama
        FROM sistem_ayarlari
        WHERE 1=1
    """
    params = {}

    if aktif is not None:
        sql += " AND aktif = :aktif"
        params["aktif"] = aktif

    if kategori:
        sql += " AND kategori = :kategori"
        params["kategori"] = kategori

    if search:
        sql += " AND ayar_adi ILIKE :search"
        params["search"] = f"%{search}%"

    sql += " ORDER BY kategori, ayar_adi ASC"

    result = db.execute(text(sql), params).fetchall()
    total = len(result)

    return AyarListResponse(
        data=[_ayar_from_row(row) for row in result],
        total=total,
    )


@router.post("/", response_model=AyarResponse, status_code=201)
async def create_ayar(
    request: AyarCreateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Yeni sistem ayarı oluştur."""
    # Validate data type
    if request.veri_tipi not in VALID_DATA_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"veri_tipi şunlardan biri olmalıdır: {', '.join(VALID_DATA_TYPES)}"
        )

    # Validate category
    if request.kategori not in VALID_KATEGORILER:
        raise HTTPException(
            status_code=400,
            detail=f"kategori şunlardan biri olmalıdır: {', '.join(VALID_KATEGORILER)}"
        )

    # Check for duplicate
    existing = db.execute(
        text("SELECT id FROM sistem_ayarlari WHERE ayar_adi = :ayar_adi LIMIT 1"),
        {"ayar_adi": request.ayar_adi}
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Bu ayar adı zaten tanımlı")

    # Validate value based on data type
    if request.veri_tipi == "INTEGER":
        try:
            int(request.deger)
        except ValueError:
            raise HTTPException(status_code=400, detail="INTEGER tipi için geçerli bir sayı girilmeli")
    elif request.veri_tipi == "FLOAT":
        try:
            float(request.deger)
        except ValueError:
            raise HTTPException(status_code=400, detail="FLOAT tipi için geçerli bir ondalık sayı girilmeli")
    elif request.veri_tipi == "BOOLEAN":
        if request.deger.upper() not in ("TRUE", "FALSE", "1", "0"):
            raise HTTPException(status_code=400, detail="BOOLEAN tipi için deger TRUE/FALSE/1/0 olmalı")

    simdi = datetime.utcnow()

    sql = """
        INSERT INTO sistem_ayarlari (ayar_adi, deger, veri_tipi, kategori, aktif, olusturma_tarihi, guncelleme_tarihi)
        VALUES (:ayar_adi, :deger, :veri_tipi, :kategori, TRUE, :simdi, :simdi)
        RETURNING id, ayar_adi, deger, veri_tipi, kategori, aktif, olusturma_tarihi, guncelleme_tarihi
    """
    result = db.execute(text(sql), {
        "ayar_adi": request.ayar_adi,
        "deger": request.deger,
        "veri_tipi": request.veri_tipi,
        "kategori": request.kategori,
        "simdi": simdi,
    }).fetchone()
    db.commit()

    return _ayar_from_row(result)


@router.get("/{ayar_adi}", response_model=AyarResponse)
async def get_ayar(
    ayar_adi: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Ayar adına göre detay getir."""
    sql = """
        SELECT id, ayar_adi, deger, veri_tipi, kategori, aktif,
               olusturma_tarihi, guncelleme_tarihi,
               NULL as aciklama
        FROM sistem_ayarlari
        WHERE ayar_adi = :ayar_adi
    """
    row = db.execute(text(sql), {"ayar_adi": ayar_adi}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Ayar bulunamadı")

    return _ayar_from_row(row)


@router.get("/{ayar_adi}/deger", response_model=AyarValueResponse)
async def get_ayar_deger(
    ayar_adi: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """
    Sadece ayar değerini hızlıca getir.
    SKT_UYARI_GUN gibi sık kullanılan ayarlar için kullanışlıdır.
    """
    sql = """
        SELECT ayar_adi, deger, veri_tipi
        FROM sistem_ayarlari
        WHERE ayar_adi = :ayar_adi AND aktif = TRUE
    """
    row = db.execute(text(sql), {"ayar_adi": ayar_adi}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Ayar bulunamadı veya pasif")

    return AyarValueResponse(
        ayar_adi=row.ayar_adi,
        deger=row.deger,
        veri_tipi=row.veri_tipi,
    )


@router.put("/{ayar_adi}", response_model=AyarResponse)
async def update_ayar(
    ayar_adi: str,
    request: AyarUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Sistem ayarını güncelle."""
    # Check exists
    existing = db.execute(
        text("SELECT id FROM sistem_ayarlari WHERE ayar_adi = :ayar_adi"),
        {"ayar_adi": ayar_adi}
    ).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Ayar bulunamadı")

    # Build update fields
    updates = []
    params = {"ayar_adi": ayar_adi, "simdi": datetime.utcnow()}

    if request.deger is not None:
        # Validate based on existing or new data type
        veri_tipi = request.veri_tipi or "STRING"
        if veri_tipi == "INTEGER":
            try:
                int(request.deger)
            except ValueError:
                raise HTTPException(status_code=400, detail="INTEGER tipi için geçerli bir sayı girilmeli")
        elif veri_tipi == "FLOAT":
            try:
                float(request.deger)
            except ValueError:
                raise HTTPException(status_code=400, detail="FLOAT tipi için geçerli bir ondalık sayı girilmeli")
        elif veri_tipi == "BOOLEAN":
            if request.deger.upper() not in ("TRUE", "FALSE", "1", "0"):
                raise HTTPException(status_code=400, detail="BOOLEAN tipi için deger TRUE/FALSE/1/0 olmalı")
        updates.append("deger = :deger")
        params["deger"] = request.deger

    if request.veri_tipi is not None:
        if request.veri_tipi not in VALID_DATA_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"veri_tipi şunlardan biri olmalıdır: {', '.join(VALID_DATA_TYPES)}"
            )
        updates.append("veri_tipi = :veri_tipi")
        params["veri_tipi"] = request.veri_tipi

    if request.kategori is not None:
        if request.kategori not in VALID_KATEGORILER:
            raise HTTPException(
                status_code=400,
                detail=f"kategori şunlardan biri olmalıdır: {', '.join(VALID_KATEGORILER)}"
            )
        updates.append("kategori = :kategori")
        params["kategori"] = request.kategori

    if request.aktif is not None:
        updates.append("aktif = :aktif")
        params["aktif"] = request.aktif

    if not updates:
        raise HTTPException(status_code=400, detail="Güncellenecek alan belirtilmedi")

    updates.append("guncelleme_tarihi = :simdi")

    sql = f"""
        UPDATE sistem_ayarlari
        SET {', '.join(updates)}
        WHERE ayar_adi = :ayar_adi
        RETURNING id, ayar_adi, deger, veri_tipi, kategori, aktif,
                  olusturma_tarihi, guncelleme_tarihi,
                  NULL as aciklama
    """
    result = db.execute(text(sql), params).fetchone()
    db.commit()

    return _ayar_from_row(result)


@router.delete("/{ayar_adi}", status_code=204)
async def delete_ayar(
    ayar_adi: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """
    Sistem ayarını sil.
    Not: Kritik sistem ayarları (SKT_UYARI_GUN gibi) silinemez,
    bunun yerine pasif hale getirilmelidir.
    """
    PROTECTED_SETTINGS = {"SKT_UYARI_GUN"}

    if ayar_adi in PROTECTED_SETTINGS:
        raise HTTPException(
            status_code=403,
            detail=f"{ayar_adi} kritik bir sistem ayarıdır ve silinemez. "
                   f"Bunun yerine pasif hale getirmek için PUT isteği kullanın."
        )

    # Check exists
    existing = db.execute(
        text("SELECT id FROM sistem_ayarlari WHERE ayar_adi = :ayar_adi"),
        {"ayar_adi": ayar_adi}
    ).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Ayar bulunamadı")

    db.execute(
        text("DELETE FROM sistem_ayarlari WHERE ayar_adi = :ayar_adi"),
        {"ayar_adi": ayar_adi}
    )
    db.commit()
    return None


# ---------------------------------------------------------------------------
# Bulk Operations
# ---------------------------------------------------------------------------

class AyarBulkUpdateRequest(BaseModel):
    """Bulk update multiple settings at once."""
    updates: List[dict]  # [{"ayar_adi": "X", "deger": "Y"}, ...]


@router.post("/bulk-update", response_model=AyarListResponse)
async def bulk_update_ayarlar(
    request: AyarBulkUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """
    Birden fazla ayarı tek seferde güncelle.
    Her güncelleme sadece ayar_adi ve deger içermelidir.
    """
    if not request.updates:
        raise HTTPException(status_code=400, detail="En az bir güncelleme gerekli")

    results = []
    simdi = datetime.utcnow()

    for update in request.updates:
        if "ayar_adi" not in update or "deger" not in update:
            continue  # Skip invalid entries

        ayar_adi = update["ayar_adi"]
        deger = update["deger"]

        # Update if exists, skip if not
        result = db.execute(
            text("""
                UPDATE sistem_ayarlari
                SET deger = :deger, guncelleme_tarihi = :simdi
                WHERE ayar_adi = :ayar_adi
                RETURNING id, ayar_adi, deger, veri_tipi, kategori, aktif,
                          olusturma_tarihi, guncelleme_tarihi,
                          NULL as aciklama
            """),
            {"ayar_adi": ayar_adi, "deger": deger, "simdi": simdi}
        ).fetchone()

        if result:
            results.append(_ayar_from_row(result))

    db.commit()

    return AyarListResponse(data=results, total=len(results))
