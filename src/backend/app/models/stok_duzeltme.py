"""
Stock correction (stok düzeltme) approval workflow models
"""
from sqlalchemy import Column, String, Text, Numeric, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class StokDuzeltmeTalep(Base):
    """Stock correction request - maker-checker pattern."""

    __tablename__ = "stok_duzeltme_talepleri"

    stok_id = Column(UUID(as_uuid=True), ForeignKey("stok_kartlari.id"), nullable=False)

    talep_turu = Column(String(30), nullable=False)  # SAYIM_FARKI, FIRE_ZARAR, CALISMA, BIRIM_degisikligi
    talep_durumu = Column(String(30), nullable=False, default="OLUSTURULDU")  # OLUSTURULDU, BEKLEMEDE, ONAYLANDI, REDDEDILDI, STOK_GUNCELLENDI

    onceki_miktar = Column(Numeric(15, 3), nullable=False)
    yeni_miktar = Column(Numeric(15, 3), nullable=False)
    fark_miktar = Column(Numeric(15, 3), nullable=False)  # pozitif veya negatif

    birim = Column(String(20), nullable=True)

    kritik_duzeltme = Column(Boolean, default=False)  # +/- %10 uzeri
    kritik_durum_aciklama = Column(Text, nullable=True)

    # Maker
    talep_eden_id = Column(UUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=False)
    talep_tarihi = Column(String(50), nullable=False)
    talep_aciklamasi = Column(Text, nullable=True)

    # Checker
    onay_leyen_id = Column(UUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=True)
    onay_tarihi = Column(String(50), nullable=True)
    ret_nedeni = Column(Text, nullable=True)

    # Execute
    stok_guncelleme_tarihi = Column(String(50), nullable=True)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)

    # Relationships
    stok_karti = relationship("StokKarti", back_populates="duzeltme_talepleri")
