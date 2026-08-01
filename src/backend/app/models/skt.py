"""
SKT (Son Kullanma Tarihi) management models
"""
from sqlalchemy import Column, String, Text, Numeric, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class SktIslem(Base):
    """SKT expired/expiring lot action requests."""

    __tablename__ = "skt_islemler"

    stok_id = Column(UUID(as_uuid=True), ForeignKey("stok_kartlari.id"), nullable=False)

    islem_turu = Column(String(30), nullable=False)  # IMHA, INDIRIM, DEVIR, IADE
    talep_durumu = Column(String(30), nullable=False, default="BEKLIYOR")  # BEKLIYOR, ONAYLANDI, REDDEDILDI, TAMAMLANDI

    talep_eden_id = Column(UUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=False)
    talep_tarihi = Column(String(50), nullable=False)

    onay_leyen_id = Column(UUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=True)
    onay_tarihi = Column(String(50), nullable=True)
    ret_nedeni = Column(Text, nullable=True)

    # Details
    mevcut_miktar = Column(Numeric(15, 3), nullable=True)
    islem_miktari = Column(Numeric(15, 3), nullable=True)
    birim = Column(String(20), nullable=True)
    maliyet = Column(Numeric(15, 4), nullable=True)

    # Indirim specific
    indirim_orani = Column(Numeric(5, 2), nullable=True)
    indirimli_fiyat = Column(Numeric(15, 4), nullable=True)

    # Devir specific
    devir_tarihi = Column(String(20), nullable=True)
    devir_alana = Column(String(255), nullable=True)

    # Imha specific
    imha_tarihi = Column(String(50), nullable=True)
    imha_yontemi = Column(String(100), nullable=True)
    imha_tutanagi_url = Column(String(500), nullable=True)

    # Notes
    not_text = Column(Text, nullable=True)
    gerekce = Column(Text, nullable=True)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)

    # Relationships
    stok_karti = relationship("StokKarti", back_populates="skt_islemler")
