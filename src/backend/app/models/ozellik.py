"""
Özellik Tanımları (Attribute Schema)
"""
from sqlalchemy import Column, String, Boolean, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class OzellikTanimi(Base):
    """Product attribute definitions schema."""

    __tablename__ = "ozellik_tanimlari"

    urun_kategori = Column(
        String(20),
        nullable=False,
        index=True
    )  # MEYVE, BAL, KARSIM, KURUYEMIS, SEBZE, YAG, TURSUKU, DIGER, TUML

    ozellik_adi = Column(String(100), nullable=False)
    veri_tipi = Column(
        String(20),
        nullable=False
    )  # STRING, NUMBER, DATE, BOOLEAN, ENUM

    birim = Column(String(20), nullable=True)  # kg, adet, lt, %, etc.
    zorunlu = Column(Boolean, default=False, nullable=False)

    varsayilan_deger = Column(String(255), nullable=True)
    enum_degerleri = Column(String(500), nullable=True)  # JSON array as string for ENUM

    siralama = Column(Integer, default=0)
    etikette_goster = Column(Boolean, default=False)
    aktif = Column(Boolean, default=True, nullable=False)

    # Reference to product (null = applies to all products in category)
    urun_id = Column(UUID(as_uuid=True), ForeignKey("urunler.id"), nullable=True)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    guncelleme_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)

    # Relationships
    urun = relationship("Urun", foreign_keys=[urun_id])
