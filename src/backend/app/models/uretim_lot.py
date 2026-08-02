"""
Üretim Lot Modelleri
Production Lot Output Tracking
"""
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class UretimLot(Base):
    """Production Lot Output Model.

    Tracks finished goods produced from a production order,
    including source lot information for traceability.
    """

    __tablename__ = "uretim_lot"

    uretim_emri_id = Column(
        UUID(as_uuid=True),
        ForeignKey("uretim_emirleri.id"),
        nullable=False
    )
    stok_id = Column(
        UUID(as_uuid=True),
        ForeignKey("stok_kartlari.id"),
        nullable=False
    )
    lot_no = Column(String(50), nullable=False)
    uretim_tarihi = Column(String(50), nullable=False)
    olusturma_tarihi = Column(String(50), nullable=False)
    guncelleme_tarihi = Column(String(50), nullable=False)
    kaynak_lot_bilgisi = Column(JSONB, nullable=True)  # For multiple source lots
    kalite_kontrol_id = Column(
        UUID(as_uuid=True),
        ForeignKey("kalite_kontroller.id"),
        nullable=True
    )

    # Relationships
    uretim_emri = relationship("UretimEmri", back_populates="uretim_lotlari")
    stok_karti = relationship("StokKarti", back_populates="uretim_lotlari")
    kalite_kontrol = relationship("KaliteKontrol")
