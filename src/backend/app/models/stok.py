"""
Stock and inventory models
"""
from sqlalchemy import Column, String, Boolean, Text, Numeric, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class StokKarti(Base):
    """Stock card / Lot model."""
    
    __tablename__ = "stok_kartlari"
    
    urun_id = Column(UUID(as_uuid=True), ForeignKey("urunler.id"), nullable=False)
    lot_no = Column(String(50), nullable=False, unique=True, index=True)
    
    tedarikci_id = Column(UUID(as_uuid=True), ForeignKey("tedarikciler.id"), nullable=True)
    kaynak_stok_id = Column(UUID(as_uuid=True), ForeignKey("stok_kartlari.id"), nullable=True)  # for production
    
    stok_tipi = Column(String(20), nullable=False)  # HAMMADDE, MAMUL
    birim = Column(String(20), nullable=False)  # kg, adet, paket
    
    # Dates
    uretim_tarihi = Column(String(20), nullable=True)  # YYYY-MM-DD
    son_kullanma = Column(String(20), nullable=True)  # YYYY-MM-DD
    giris_tarihi = Column(String(50), nullable=False)  # ISO datetime
    
    # Quantities
    miktar = Column(Numeric(15, 3), nullable=False, default=0)
    birim_fiyat = Column(Numeric(15, 4), nullable=False)
    
    # Location
    konum = Column(String(100), nullable=True)
    depo = Column(String(50), nullable=True)
    raf = Column(String(50), nullable=True)
    blok = Column(String(50), nullable=True)
    
    # Quality
    durum = Column(
        String(20),
        nullable=False,
        default="AKTIF"
    )  # AKTIF, BITTI, IPTAL, KALITE_KONTROL, DEPO_DISI, RET
    kalite_notu = Column(Numeric(3, 2), nullable=True)  # 1-5
    kalite_kontrol_tarihi = Column(String(50), nullable=True)
    kalite_kontrol_edildi = Column(Boolean, default=False)
    
    # Weight
    agirlik_birim = Column(String(20), nullable=True)  # brut, net
    brut_miktar = Column(Numeric(15, 3), nullable=True)
    net_miktar = Column(Numeric(15, 3), nullable=True)
    
    # Reference
    palet_no = Column(String(50), nullable=True)
    giris_referans_no = Column(String(100), nullable=True)
    
    # Tracking
    musteri_id = Column(UUID(as_uuid=True), ForeignKey("musteriler.id"), nullable=True)
    satis_hareket_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Metadata
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)
    silme_tarihi = Column(String(50), nullable=True)
    
    # Relationships
    urun = relationship("Urun", back_populates="stok_kartlari")
    tedarikci = relationship("Tedarikci", back_populates="stok_kartlari")
    kaynak_stok = relationship("StokKarti", remote_side="StokKarti.id", backref="uretilen_lotlar")
    hareketler = relationship("StokHareket", back_populates="stok_karti", order_by="desc(StokHareket.olusturma_tarihi)")
    ozellikler = relationship("LotOzellik", back_populates="stok_karti")
    fotograflar = relationship("LotFotograf", back_populates="stok_karti")
    kalite_kontroller = relationship("KaliteKontrol", back_populates="stok_karti")
    skt_islemler = relationship("SktIslem", back_populates="stok_karti")
    duzeltme_talepleri = relationship("StokDuzeltmeTalep", back_populates="stok_karti")
    # UretimLot backref
    uretim_lotlari = relationship("UretimLot", back_populates="stok_karti")


class StokHareket(Base):
    """Stock movement/transaction log."""
    
    __tablename__ = "stok_hareketleri"
    
    stok_id = Column(UUID(as_uuid=True), ForeignKey("stok_kartlari.id"), nullable=False)
    hareket_tipi = Column(
        String(30),
        nullable=False
    )  # GIRIS, URETIM_GIRIS, URETIM_CIKIS, SATIS_CIKIS, IADE, DUZELTME, TRANSFER
    
    miktar = Column(Numeric(15, 3), nullable=False)  # positive = in, negative = out
    birim_fiyat = Column(Numeric(15, 4), nullable=True)
    tutar = Column(Numeric(15, 4), nullable=True)
    
    onceki_miktar = Column(Numeric(15, 3), nullable=False)
    sonraki_miktar = Column(Numeric(15, 3), nullable=False)
    
    # Reference
    referans_id = Column(UUID(as_uuid=True), nullable=True)
    referans_tipi = Column(String(30), nullable=True)  # SATIS, URETIM, TEDARIK, DUZELTME
    aciklama = Column(Text, nullable=True)
    
    # For transfers
    karsi_stok_id = Column(UUID(as_uuid=True), nullable=True)
    
    # FIFO tracking
    fifo_ihlal_edildi = Column(Boolean, default=False)
    fifo_ihlal_nedeni = Column(Text, nullable=True)
    
    # References
    lot_no = Column(String(50), nullable=True)
    musteri_id = Column(UUID(as_uuid=True), nullable=True)
    tedarikci_id = Column(UUID(as_uuid=True), nullable=True)
    
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Relationships
    stok_karti = relationship("StokKarti", back_populates="hareketler")


class LotOzellik(Base):
    """Lot/Stock attribute values."""
    
    __tablename__ = "lot_ozellikleri"
    
    stok_id = Column(UUID(as_uuid=True), ForeignKey("stok_kartlari.id"), nullable=False)
    ozellik_id = Column(UUID(as_uuid=True), ForeignKey("urun_ozellikleri.id"), nullable=False)
    
    deger = Column(String(255), nullable=False)
    birim = Column(String(20), nullable=True)
    
    # Relationships
    stok_karti = relationship("StokKarti", back_populates="ozellikler")
    ozellik = relationship("UrunOzellik")


class LotFotograf(Base):
    """Lot/Stock photo attachments."""
    
    __tablename__ = "lot_fotograflari"
    
    stok_id = Column(UUID(as_uuid=True), ForeignKey("stok_kartlari.id"), nullable=False)
    
    foto_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    foto_tarihi = Column(String(50), nullable=False)  # ISO datetime
    not_text = Column(Text, nullable=True)
    
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Relationships
    stok_karti = relationship("StokKarti", back_populates="fotograflar")
