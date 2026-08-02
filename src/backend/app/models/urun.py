"""
Product models
"""
from sqlalchemy import Column, String, Boolean, Integer, Text, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class Urun(Base):
    """Product catalog model."""
    
    __tablename__ = "urunler"
    
    ad = Column(String(255), nullable=False)
    kategori = Column(
        String(20),
        nullable=False,
        index=True
    )  # MEYVE, BAL, KARSIM, KURUYEMIS, SEBZE, YAG, TURSUKU, DIGER
    birim_toptan = Column(String(10), nullable=False)  # kg, ton
    birim_perakende = Column(String(10), nullable=False)  # kg, gram, adet, paket
    
    aktif = Column(Boolean, default=True, nullable=False)
    
    # Product details
    stok_kodu = Column(String(50), nullable=True, index=True)  # SKU
    barkod = Column(String(50), nullable=True, index=True)  # EAN-13, UPC
    aciklama = Column(Text, nullable=True)
    gorsel_url = Column(String(500), nullable=True)
    
    # Dimensions
    agirlik = Column(Numeric(10, 3), nullable=True)  # gram
    hacim = Column(Numeric(10, 3), nullable=True)  # cm³
    
    # Stock levels
    minimum_stok_seviyesi = Column(Numeric(15, 3), nullable=True)
    maksimum_stok_seviyesi = Column(Numeric(15, 3), nullable=True)
    raf_omru_gun = Column(Integer, nullable=True)
    
    # Raw material link (for MAMUL products)
    hammadde_id = Column(UUID(as_uuid=True), ForeignKey("urunler.id"), nullable=True)
    
    # Metadata
    varsayilan_ozellikler = Column(JSONB, default=list)
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Relationships
    stok_kartlari = relationship("StokKarti", back_populates="urun")
    ozellikler = relationship("UrunOzellik", back_populates="urun")
    hammadde = relationship("Urun", remote_side="Urun.id", foreign_keys=[hammadde_id])
    # UrunDonusum backrefs
    donusumler_kaynak = relationship(
        "UrunDonusum",
        foreign_keys="UrunDonusum.kaynak_urun_id",
        back_populates="kaynak_urun"
    )
    donusumler_hedef = relationship(
        "UrunDonusum",
        foreign_keys="UrunDonusum.hedef_urun_id",
        back_populates="hedef_urun"
    )


class UrunOzellik(Base):
    """Product attribute/feature definitions."""
    
    __tablename__ = "urun_ozellikleri"
    
    urun_id = Column(UUID(as_uuid=True), ForeignKey("urunler.id"), nullable=True)  # null = tüm ürünler
    kategori = Column(String(20), nullable=False)  # MEYVE, BAL, TUML
    alan_adi = Column(String(50), nullable=False)  # veritabanı adı: renk, boyut
    goruntu_adi = Column(String(100), nullable=False)  # gösterim adı: Renk, Boyut
    
    tip = Column(String(20), nullable=False)  # METIN, SAYI, ENUM, BOOLEAN, TARIH
    zorunlu = Column(Boolean, default=False)
    etikette_goster = Column(Boolean, default=False)
    etikette_zorunlu = Column(Boolean, default=False)
    siralama = Column(Integer, default=0)
    
    varsayilan_deger = Column(String(255), nullable=True)
    enum_degerleri = Column(JSONB, default=list)
    
    # Relationships
    urun = relationship("Urun", back_populates="ozellikler")
