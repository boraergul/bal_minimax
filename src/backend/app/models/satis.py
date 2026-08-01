"""
Sales models
"""
from sqlalchemy import Column, String, Text, Numeric, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class SatisKaydi(Base):
    """Sales record model."""
    
    __tablename__ = "satis_kayitlari"
    
    satis_no = Column(String(50), nullable=False, unique=True)  # SAT-YYYYMMDD-XXX
    musteri_id = Column(UUID(as_uuid=True), ForeignKey("musteriler.id"), nullable=False)
    
    tarih = Column(String(50), nullable=False)  # ISO datetime
    durum = Column(
        String(20),
        nullable=False,
        default="TAMAMLANDI"
    )  # TAMAMLANDI, IPTAL, IADE, BEKLEMEDE
    
    toplam_tutar = Column(Numeric(15, 4), nullable=False)
    indirim_tutari = Column(Numeric(15, 4), nullable=True)
    not_text = Column(Text, nullable=True)
    
    # Delivery
    teslimat_adresi = Column(Text, nullable=True)
    odeme_sekli = Column(
        String(20),
        nullable=True
    )  # NAKIT, CEK, HAVALE, KREDI_KARTI, KAPIDA_ODEME
    odeme_durumu = Column(
        String(20),
        nullable=True
    )  # BEKLIYOR, ODENDI, KISMEN_ODENDI, VADE_GECIKTI
    vade_tarihi = Column(String(20), nullable=True)  # YYYY-MM-DD
    
    # Invoice
    fatura_kesildi = Column(Boolean, default=False)
    fatura_no = Column(String(50), nullable=True)
    fatura_tarihi = Column(String(20), nullable=True)
    
    # Shipping
    kargo_bilgileri = Column(String(255), nullable=True)
    satis_tipi = Column(
        String(20),
        nullable=True
    )  # PERAKENDE, TOPTAN, OZEL_SIPARIS
    
    # Dates
    teslimat_tarihi = Column(String(20), nullable=True)  # planned
    teslim_tarihi = Column(String(20), nullable=True)  # actual
    teslim_eden_id = Column(UUID(as_uuid=True), nullable=True)
    teslim_alan = Column(String(255), nullable=True)
    
    # Return info
    iade_nedeni = Column(Text, nullable=True)
    iade_tarihi = Column(String(50), nullable=True)
    
    # Metadata
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)
    silme_tarihi = Column(String(50), nullable=True)
    
    # Relationships
    musteri = relationship("Musteri", back_populates="satis_kayitlari")
    kalemler = relationship("SatisKalemi", back_populates="satis_kaydi")
    iadeler = relationship("SatisIade", back_populates="satis_kaydi")


class SatisKalemi(Base):
    """Sales line item model."""
    
    __tablename__ = "satis_kalemleri"
    
    satis_id = Column(
        UUID(as_uuid=True),
        ForeignKey("satis_kayitlari.id"),
        nullable=False
    )
    
    urun_id = Column(UUID(as_uuid=True), ForeignKey("urunler.id"), nullable=False)
    lot_no = Column(String(50), nullable=True)
    
    miktar = Column(Numeric(15, 3), nullable=False)
    birim_fiyat = Column(Numeric(15, 4), nullable=False)
    tutar = Column(Numeric(15, 4), nullable=False)
    
    # Relationships
    satis_kaydi = relationship("SatisKaydi", back_populates="kalemler")
    urun = relationship("Urun")
