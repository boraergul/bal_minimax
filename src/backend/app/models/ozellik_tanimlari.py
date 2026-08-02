"""
Özellik Tanımları Modelleri
Attribute Definitions Schema
"""
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class OzellikTanim(Base):
    """Product Attribute Definition Model.

    Defines attribute schemas for products by category.
    Supports STRING, INTEGER, DECIMAL, BOOLEAN, DATE, ENUM types.
    """

    __tablename__ = "ozellik_tanimlari"

    kategori = Column(
        String(20),
        nullable=True,
        index=True
    )  # MEYVE, BAL, KARSIM, KURUYEMIS, SEBZE, KURU_BAKLIYAT, YAG, TURSU, DIGER - NULL means all

    alan_adi = Column(String(50), nullable=False)
    goruntu_ad = Column(String(100), nullable=True)
    tip = Column(
        String(20),
        nullable=False
    )  # STRING, INTEGER, DECIMAL, BOOLEAN, DATE, ENUM
    zorunlu = Column(Boolean, default=False, nullable=False)
    etikette_goster = Column(Boolean, default=False, nullable=False)
    etikette_zorunlu = Column(Boolean, default=False, nullable=False)
    siralama = Column(Integer, default=0, nullable=True)
    varsayilan_deger = Column(String(255), nullable=True)
    enum_degerleri = Column(JSONB, nullable=True)  # JSON array for ENUM type
    birim = Column(String(20), nullable=True)
    min_deger = Column(JSONB, nullable=True)  # For INTEGER/DECIMAL validation
    max_deger = Column(JSONB, nullable=True)  # For INTEGER/DECIMAL validation
    aktif = Column(Boolean, default=True, nullable=False)

    olusturma_tarihi = Column(String(50), nullable=False)
    guncelleme_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(
        UUID(as_uuid=True),
        ForeignKey("kullanicilar.id"),
        nullable=False
    )

    # Relationships
    olusturan = relationship("Kullanici")
