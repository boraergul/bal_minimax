"""
Production models
"""
from sqlalchemy import Column, String, Text, Numeric, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class UretimEmri(Base):
    """Production order model."""
    
    __tablename__ = "uretim_emirleri"
    
    uretim_no = Column(String(50), nullable=False, unique=True)  # URET-YYYYMMDD-XXX
    tarih = Column(String(50), nullable=False)  # ISO datetime
    durum = Column(
        String(20),
        nullable=False,
        default="BEKLEMEDE"
    )  # BEKLEMEDE, ONAYLANDI, TAMAMLANDI, IPTAL
    
    not_text = Column(Text, nullable=True)
    
    # Priority
    oncelik = Column(
        String(10),
        nullable=False,
        default="NORMAL"
    )  # DUSUK, NORMAL, YUKSEK, ACIL
    
    # Quantities
    planlanan_miktar = Column(Numeric(15, 3), nullable=True)
    gerceklesen_miktar = Column(Numeric(15, 3), nullable=True)
    
    # Dates
    planlanan_tarih = Column(String(20), nullable=True)  # YYYY-MM-DD
    planlanan_baslama = Column(String(50), nullable=True)  # ISO datetime
    gerceklesen_baslama = Column(String(50), nullable=True)
    tamamlama_tarihi = Column(String(50), nullable=True)
    son_tarih = Column(String(20), nullable=True)  # YYYY-MM-DD
    
    # Quality
    kalite_kontrol_onayi = Column(Boolean, default=False)
    kalite_kontrol_tarihi = Column(String(50), nullable=True)
    kalite_kontrol_eden_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Cost
    toplam_maliyet = Column(Numeric(15, 4), nullable=True)
    
    # Fire tracking
    fire_orani_planlanan = Column(Numeric(5, 4), nullable=True)
    fire_orani_gercek = Column(Numeric(5, 4), nullable=True)
    
    # References
    musteri_id = Column(UUID(as_uuid=True), ForeignKey("musteriler.id"), nullable=True)
    siparis_no = Column(String(50), nullable=True)
    
    # Metadata
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)
    silme_tarihi = Column(String(50), nullable=True)
    
    # Relationships
    detaylar = relationship("UretimDetay", back_populates="uretim_emri")
    kalite_kontroller = relationship("KaliteKontrol", back_populates="uretim_emri")
    iscilik_kayitlari = relationship("UretimIscilik", back_populates="uretim_emri")
    enerji_kayitlari = relationship("UretimEnerji", back_populates="uretim_emri")
    bakim_kayitlari = relationship("UretimBakim", back_populates="uretim_emri")
    genel_gider_kayitlari = relationship("UretimGenelGider", back_populates="uretim_emri")
    # UretimLot backref
    uretim_lotlari = relationship("UretimLot", back_populates="uretim_emri")


class UretimDetay(Base):
    """Production order detail - raw materials used."""
    
    __tablename__ = "uretim_detaylari"
    
    uretim_id = Column(
        UUID(as_uuid=True),
        ForeignKey("uretim_emirleri.id"),
        nullable=False
    )
    
    mamul_urun_id = Column(UUID(as_uuid=True), ForeignKey("urunler.id"), nullable=False)
    mamul_miktar = Column(Numeric(15, 3), nullable=False)
    
    hammadde_urun_id = Column(UUID(as_uuid=True), ForeignKey("urunler.id"), nullable=False)
    hammadde_lot_no = Column(String(50), nullable=True)
    hammadde_miktar = Column(Numeric(15, 3), nullable=False)
    fire_miktari = Column(Numeric(15, 3), nullable=True)
    
    # Relationships
    uretim_emri = relationship("UretimEmri", back_populates="detaylar")
    mamul_urun = relationship("Urun", foreign_keys=[mamul_urun_id])
    hammadde_urun = relationship("Urun", foreign_keys=[hammadde_urun_id])
