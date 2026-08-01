"""
Sales return (satış iade) models
"""
from sqlalchemy import Column, String, Text, Numeric, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class SatisIade(Base):
    """Sales return record."""

    __tablename__ = "satis_iadeleri"

    satis_id = Column(UUID(as_uuid=True), ForeignKey("satis_kayitlari.id"), nullable=False)
    musteri_id = Column(UUID(as_uuid=True), ForeignKey("musteriler.id"), nullable=False)

    iade_no = Column(String(50), nullable=False, unique=True)  # IADE-YYYYMMDD-XXX
    iade_tarihi = Column(String(50), nullable=False)

    iade_durumu = Column(String(30), nullable=False, default="OLUSTURULDU")  # OLUŞTURULDU, KALITE_KONTROL, STOK_GIRISI, TAMAMLANDI, RET
    iade_nedeni = Column(String(30), nullable=False)  # KALITE_SORUNU, YANLIS_URUN, MIKTAR_FARKI, MUSERI_ISTEK, DIGER

    toplam_miktar = Column(Numeric(15, 3), nullable=False)
    toplam_tutar = Column(Numeric(15, 4), nullable=True)

    fire_miktari = Column(Numeric(15, 3), nullable=True)
    fire_orani = Column(Numeric(5, 4), nullable=True)
    fire_nedeni = Column(Text, nullable=True)

    # Quality control
    kalite_kontrol_id = Column(UUID(as_uuid=True), ForeignKey("kalite_kontroller.id"), nullable=True)
    kalite_kontrol_sonucu = Column(String(30), nullable=True)  # KABUL, RET

    # Stock entry
    stok_giris_id = Column(UUID(as_uuid=True), nullable=True)
    stok_giris_tarihi = Column(String(50), nullable=True)

    # Notes
    musteri_aciklamasi = Column(Text, nullable=True)
    yetkili_aciklama = Column(Text, nullable=True)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)
    silme_tarihi = Column(String(50), nullable=True)

    # Relationships
    satis_kaydi = relationship("SatisKaydi", back_populates="iadeler")
    numuneler = relationship("IadeNumune", back_populates="iade")


class IadeNumune(Base):
    """Return sample records."""

    __tablename__ = "iade_numuneleri"

    iade_id = Column(UUID(as_uuid=True), ForeignKey("satis_iadeleri.id"), nullable=False)

    numune_no = Column(String(50), nullable=False)
    numune_turu = Column(String(50), nullable=True)
    numune_aciklamasi = Column(Text, nullable=True)

    # Lab
    sonuc = Column(String(30), nullable=True)  # GECTI, KALDI
    sonuc_aciklamasi = Column(Text, nullable=True)

    foto_url = Column(String(500), nullable=True)

    olusturma_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)

    # Relationships
    iade = relationship("SatisIade", back_populates="numuneler")
