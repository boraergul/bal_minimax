"""
Customer models
"""
from sqlalchemy import Column, String, Boolean, Text, Numeric, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Musteri(Base):
    """Customer model."""
    
    __tablename__ = "musteriler"
    
    ad = Column(String(255), nullable=False)
    telefon = Column(String(20), nullable=True)
    eposta = Column(String(255), nullable=True)
    adres = Column(Text, nullable=True)
    vergi_no = Column(String(20), nullable=True)
    not_text = Column(Text, nullable=True)
    
    aktif = Column(Boolean, default=True, nullable=False)
    
    # Type and classification
    musteri_tipi = Column(String(20), nullable=True)  # BIREYSEL, KURUMSAL
    musteri_sinifi = Column(String(1), nullable=True)  # A, B, C
    
    # Additional info
    tc_kimlik = Column(String(11), nullable=True)
    faks = Column(String(20), nullable=True)
    teslimat_adresi = Column(Text, nullable=True)
    
    # Location
    il = Column(String(50), nullable=True)
    ilce = Column(String(50), nullable=True)
    posta_kodu = Column(String(10), nullable=True)
    
    # Business terms
    odeme_vadesi = Column(Integer, nullable=True)  # days
    kredi_limiti = Column(Numeric(15, 4), nullable=True)
    
    # Personal info (for individuals)
    dogum_tarihi = Column(String(20), nullable=True)  # YYYY-MM-DD
    cinsiyet = Column(String(1), nullable=True)  # E, K, D
    
    # Relationships
    satis_temsilcisi_id = Column(UUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=True)
    satis_temsilcisi = relationship("Kullanici", foreign_keys=[satis_temsilcisi_id])
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)
    silme_tarihi = Column(String(50), nullable=True)
    
    satis_kayitlari = relationship("SatisKaydi", back_populates="musteri")
