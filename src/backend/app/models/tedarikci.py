"""
Supplier models
"""
from sqlalchemy import Column, String, Boolean, Integer, Text, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class Tedarikci(Base):
    """Supplier model."""
    
    __tablename__ = "tedarikciler"
    
    ad = Column(String(255), nullable=False)
    vergi_no = Column(String(20), nullable=False, unique=True)
    telefon = Column(String(20), nullable=True)
    eposta = Column(String(255), nullable=True)
    adres = Column(Text, nullable=True)
    
    aktif = Column(Boolean, default=True, nullable=False)
    
    # Contact person
    faks = Column(String(20), nullable=True)
    yetkili_kisi = Column(String(255), nullable=True)
    yetkili_telefon = Column(String(20), nullable=True)
    yetkili_eposta = Column(String(255), nullable=True)
    
    # Banking
    banka_adi = Column(String(100), nullable=True)
    banka_sube = Column(String(100), nullable=True)
    hesap_no = Column(String(50), nullable=True)
    
    # Business info
    odeme_vadesi = Column(Integer, nullable=True)  # days
    tedarikci_sinifi = Column(String(1), nullable=True)  # A, B, C
    not_text = Column(Text, nullable=True)
    
    # Metadata
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)
    silme_tarihi = Column(String(50), nullable=True)  # ISO datetime string for soft delete
    
    # Relationships
    urunleri = relationship("TedarikciUrun", back_populates="tedarikci")
    stok_kartlari = relationship("StokKarti", back_populates="tedarikci")
    degerlendirmeler = relationship("TedarikciDegerlendirme", back_populates="tedarikci")


class TedarikciUrun(Base):
    """Supplier-Product relationship."""
    
    __tablename__ = "tedarikci_urunleri"
    
    tedarikci_id = Column(UUID(as_uuid=True), ForeignKey("tedarikciler.id"), nullable=False)
    urun_id = Column(UUID(as_uuid=True), ForeignKey("urunler.id"), nullable=False)
    
    varsayilan_fiyat = Column(Numeric(15, 4), nullable=True)
    minimum_siparis_miktari = Column(Numeric(15, 3), nullable=True)
    teslimat_suresi = Column(Integer, nullable=True)  # days
    
    aktif = Column(Boolean, default=True, nullable=False)
    silme_tarihi = Column(String(50), nullable=True)
    
    # Relationships
    tedarikci = relationship("Tedarikci", back_populates="urunleri")
    urun = relationship("Urun")
    fiyat_gecmisi = relationship("TedarikciFiyatGecmisi", back_populates="tedarikci_urun")


class TedarikciFiyatGecmisi(Base):
    """Supplier price history."""
    
    __tablename__ = "tedarikci_fiyat_gecmisi"
    
    tedarikci_urun_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tedarikci_urunleri.id"),
        nullable=False
    )
    birim_fiyat = Column(Numeric(15, 4), nullable=False)
    gecerlilik_baslangic = Column(String(20), nullable=False)  # YYYY-MM-DD
    gecerlilik_bitis = Column(String(20), nullable=True)
    
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Relationships
    tedarikci_urun = relationship("TedarikciUrun", back_populates="fiyat_gecmisi")


class TedarikciDegerlendirme(Base):
    """Supplier evaluation/scoring."""
    
    __tablename__ = "tedarikci_degerlendirmeleri"
    
    tedarikci_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tedarikciler.id"),
        nullable=False
    )
    degerlendirme_tarihi = Column(String(20), nullable=False)  # YYYY-MM-DD
    
    kalite_puani = Column(Numeric(3, 2), nullable=False)  # 1-5
    fiyat_puani = Column(Numeric(3, 2), nullable=True)
    hizmet_puani = Column(Numeric(3, 2), nullable=True)
    genel_puan = Column(Numeric(3, 2), nullable=True)
    
    odeme_plani = Column(String(50), nullable=True)
    sertifikalar = Column(JSONB, default=list)
    resmi_dosyalar = Column(JSONB, default=list)
    
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Relationships
    tedarikci = relationship("Tedarikci", back_populates="degerlendirmeler")
