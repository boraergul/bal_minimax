"""
Ürün Dönüşüm Modelleri
Product-to-Product Conversion
"""
from sqlalchemy import Column, String, Numeric, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class UrunDonusum(Base):
    """Product-to-Product Conversion Model.

    Defines conversion rates between source and target products
    for production planning and inventory management.
    """

    __tablename__ = "urun_donusum"

    kaynak_urun_id = Column(
        UUID(as_uuid=True),
        ForeignKey("urunler.id"),
        nullable=False
    )
    hedef_urun_id = Column(
        UUID(as_uuid=True),
        ForeignKey("urunler.id"),
        nullable=False
    )
    donusum_orani = Column(Numeric(20, 10), nullable=False)
    aktif = Column(Boolean, default=True, nullable=False)
    olusturma_tarihi = Column(String(50), nullable=False)
    guncelleme_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(
        UUID(as_uuid=True),
        ForeignKey("kullanicilar.id"),
        nullable=False
    )
    baslangic_tarihi = Column(String(20), nullable=True)
    bitis_tarihi = Column(String(20), nullable=True)

    # Relationships
    kaynak_urun = relationship(
        "Urun",
        foreign_keys=[kaynak_urun_id],
        back_populates="donusumler_kaynak"
    )
    hedef_urun = relationship(
        "Urun",
        foreign_keys=[hedef_urun_id],
        back_populates="donusumler_hedef"
    )
    olusturan = relationship("Kullanici")
