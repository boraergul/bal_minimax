"""
Unit (birim) and unit conversion models
"""
from sqlalchemy import Column, String, Boolean, Numeric, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class Birim(Base):
    """Unit of measurement definition."""

    __tablename__ = "birimler"

    ad = Column(String(100), nullable=False)  # Kilogram, Adet, Paket
    kisa_ad = Column(String(20), nullable=False)  # kg, ad, pkt
    birim_tipi = Column(String(20), nullable=False)  # AGIRLIK, ADET, HACIM, OZEL

    aktif = Column(Boolean, default=True, nullable=False)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    silme_tarihi = Column(String(50), nullable=True)

    # Relationships
    donusumler = relationship(
        "BirimDonusum",
        back_populates="kaynak_birim",
        foreign_keys="BirimDonusum.kaynak_birim_id"
    )


class BirimDonusum(Base):
    """Unit conversion rates."""

    __tablename__ = "birim_donusumleri"

    kaynak_birim_id = Column(UUID(as_uuid=True), ForeignKey("birimler.id"), nullable=False)
    hedef_birim_id = Column(UUID(as_uuid=True), ForeignKey("birimler.id"), nullable=False)

    donusum_orani = Column(Numeric(20, 10), nullable=False)  # 1 kaynak = X hedef
    ters_oran = Column(Numeric(20, 10), nullable=True)  # 1 hedef = X kaynak (computed)

    aktif = Column(Boolean, default=True, nullable=False)

    # Date range
    baslangic_tarihi = Column(String(20), nullable=True)
    bitis_tarihi = Column(String(20), nullable=True)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    silme_tarihi = Column(String(50), nullable=True)

    # Relationships
    kaynak_birim = relationship(
        "Birim",
        foreign_keys=[kaynak_birim_id],
        back_populates="donusumler"
    )
    hedef_birim = relationship(
        "Birim",
        foreign_keys=[hedef_birim_id],
        back_populates="donusumler"
    )
