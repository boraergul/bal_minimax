"""
Warehouse management (depo yönetimi) models
"""
from sqlalchemy import Column, String, Text, Numeric, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class Depo(Base):
    """Warehouse/Depot definition."""

    __tablename__ = "depolar"

    ad = Column(String(100), nullable=False)
    kod = Column(String(20), nullable=False, unique=True)  # DEPO-A, DEPO-B
    depo_tipi = Column(String(30), nullable=True)  # HAMMADDE, MAMUL, KARISIM, GENEL

    adres = Column(Text, nullable=True)
    il = Column(String(50), nullable=True)
    ilce = Column(String(50), nullable=True)

    # Capacity
    kapasite_m2 = Column(Numeric(15, 2), nullable=True)
    doluluk_orani = Column(Numeric(5, 2), nullable=True)  # computed

    aktif = Column(Boolean, default=True, nullable=False)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    guncelleme_tarihi = Column(String(50), nullable=False)
    silme_tarihi = Column(String(50), nullable=True)
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)

    # Relationships
    bloklar = relationship("DepoBlok", back_populates="depo")
    konumlar = relationship("DepoKonum", back_populates="depo")


class DepoBlok(Base):
    """Warehouse block/zone."""

    __tablename__ = "depo_bloklar"

    depo_id = Column(UUID(as_uuid=True), ForeignKey("depolar.id"), nullable=False)

    ad = Column(String(100), nullable=False)
    kod = Column(String(20), nullable=False)  # A-01, A-02
    blok_tipi = Column(String(30), nullable=True)  # RAF, DOLAP, ALAN

    kapasite_m2 = Column(Numeric(15, 2), nullable=True)
    doluluk_orani = Column(Numeric(5, 2), nullable=True)

    aktif = Column(Boolean, default=True, nullable=False)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    silme_tarihi = Column(String(50), nullable=True)

    # Relationships
    depo = relationship("Depo", back_populates="bloklar")
    konumlar = relationship("DepoKonum", back_populates="blok")


class DepoKonum(Base):
    """Warehouse location (shelf/bin)."""

    __tablename__ = "depo_konumlari"

    depo_id = Column(UUID(as_uuid=True), ForeignKey("depolar.id"), nullable=False)
    blok_id = Column(UUID(as_uuid=True), ForeignKey("depo_bloklar.id"), nullable=True)

    konum_kodu = Column(String(50), nullable=False, unique=True)  # A-01-03
    kat = Column(Integer, nullable=True)
    raf = Column(String(20), nullable=True)
    sutun = Column(Integer, nullable=True)

    doluluk_durumu = Column(String(20), nullable=True)  # BOS, DOLU, KISMEN_DOLU
    mevcut_stok_id = Column(UUID(as_uuid=True), nullable=True)

    aktif = Column(Boolean, default=True, nullable=False)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    silme_tarihi = Column(String(50), nullable=True)

    # Relationships
    depo = relationship("Depo", back_populates="konumlar")
    blok = relationship("DepoBlok", back_populates="konumlar")


class DepoTransfer(Base):
    """Warehouse transfer request."""

    __tablename__ = "depo_transferleri"

    transfer_no = Column(String(50), nullable=False, unique=True)  # TRF-YYYYMMDD-XXX
    tarih = Column(String(50), nullable=False)

    kaynak_depo_id = Column(UUID(as_uuid=True), ForeignKey("depolar.id"), nullable=False)
    hedef_depo_id = Column(UUID(as_uuid=True), ForeignKey("depolar.id"), nullable=False)

    durum = Column(String(30), nullable=False, default="OLUSTURULDU")  # OLUŞTURULDU, BEKLEMEDE, ONAYLANDI, REDDEDILDI, TAMAMLANDI, IPTAL_EDILDI

    # Approval chain
    talep_eden_id = Column(UUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=False)
    talep_tarihi = Column(String(50), nullable=False)
    talep_aciklamasi = Column(Text, nullable=True)

    onay_leyen_id = Column(UUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=True)
    onay_tarihi = Column(String(50), nullable=True)
    red_nedeni = Column(Text, nullable=True)

    # Completion
    tamamlama_tarihi = Column(String(50), nullable=True)

    # Notes
    not_text = Column(Text, nullable=True)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)
    silme_tarihi = Column(String(50), nullable=True)

    # Relationships
    detaylar = relationship("DepoTransferDetay", back_populates="transfer")
    nakliye = relationship("NakliyeTakip", back_populates="transfer", uselist=False)


class DepoTransferDetay(Base):
    """Transfer line items."""

    __tablename__ = "depo_transfer_detaylari"

    transfer_id = Column(UUID(as_uuid=True), ForeignKey("depo_transferleri.id"), nullable=False)
    stok_id = Column(UUID(as_uuid=True), ForeignKey("stok_kartlari.id"), nullable=False)

    miktar = Column(Numeric(15, 3), nullable=False)
    birim = Column(String(20), nullable=True)

    # Location
    kaynak_konum = Column(String(50), nullable=True)
    hedef_konum = Column(String(50), nullable=True)

    # Status
    durum = Column(String(30), nullable=False, default="BEKLEMEDE")  # BEKLEMEDE, TRANSFER_EDILDI, IPTAL

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)

    # Relationships
    transfer = relationship("DepoTransfer", back_populates="detaylar")
    stok_karti = relationship("StokKarti")


class NakliyeTakip(Base):
    """Shipping/transportation tracking."""

    __tablename__ = "nakliye_takip"

    transfer_id = Column(UUID(as_uuid=True), ForeignKey("depo_transferleri.id"), nullable=False)

    firma_adi = Column(String(255), nullable=True)
    sofor_ad = Column(String(255), nullable=True)
    telefon = Column(String(20), nullable=True)
    plaka = Column(String(20), nullable=True)

    cikis_tarihi = Column(String(50), nullable=True)
    varis_tarihi = Column(String(50), nullable=True)

    durum = Column(String(30), nullable=False, default="HAZIRLANIYOR")  # HAZIRLANIYOR, YOLDA, TESLIM_EDILDI, IPTAL

    irsaliye_no = Column(String(50), nullable=True)
    teslimat_tutunagi_url = Column(String(500), nullable=True)

    not_text = Column(Text, nullable=True)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)

    # Relationships
    transfer = relationship("DepoTransfer", back_populates="nakliye")
