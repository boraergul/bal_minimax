"""
Quality control models
"""
from sqlalchemy import Column, String, Text, Boolean, Numeric, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class KaliteKontrol(Base):
    """Quality control record - triggered on stock entry or production completion."""

    __tablename__ = "kalite_kontroller"

    # References
    stok_id = Column(UUID(as_uuid=True), ForeignKey("stok_kartlari.id"), nullable=True)
    uretim_id = Column(UUID(as_uuid=True), ForeignKey("uretim_emirleri.id"), nullable=True)

    kontrol_turu = Column(String(30), nullable=False)  # MAL_KABUL, URETIM, SEVK, RAFSURE
    kontrol_eden_id = Column(UUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=False)
    kontrol_tarihi = Column(String(50), nullable=False)  # ISO datetime

    durum = Column(String(30), nullable=False, default="BEKLIYOR")  # BEKLIYOR, KONTROL_EDILIYOR, KABUL, KISMEN_KABUL, RET

    # Physical inspection
    gorsel_kontrol = Column(Boolean, nullable=True)
    ambalaj_durumu = Column(String(20), nullable=True)  # IYI, ORTA, ZAYIF
    etiket_okunakli = Column(Boolean, nullable=True)
    son_kullanma_tarihi = Column(String(20), nullable=True)

    # Lab results
    laboratuvar_sonuclari = Column(JSONB, default=dict)  # {"nem_orani": 12.5, "tuzluluk": 3.2}

    # Result
    ret_nedeni = Column(Text, nullable=True)
    ret_kriterleri = Column(JSONB, default=list)  # ["SKT_GECMIS", "AMBALAJ_HASAR"]
    sonuc_aciklamasi = Column(Text, nullable=True)

    # Approval
    onay_durumu = Column(String(30), default="OTOMATIK")  # OTOMATIK, YONETICI_ONAYI
    onay_leyen_id = Column(UUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=True)
    onay_tarihi = Column(String(50), nullable=True)

    # Metadata
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)

    # Relationships
    stok_karti = relationship("StokKarti", back_populates="kalite_kontroller")
    uretim_emri = relationship("UretimEmri", back_populates="kalite_kontroller")
    numuneler = relationship("KaliteNumune", back_populates="kalite_kontrol")


class KaliteNumune(Base):
    """Quality control sample records."""

    __tablename__ = "kalite_numuneleri"

    kalite_kontrol_id = Column(UUID(as_uuid=True), ForeignKey("kalite_kontroller.id"), nullable=False)

    numune_no = Column(String(50), nullable=False)
    numune_turu = Column(String(50), nullable=True)  # FIZIKSEL, KIMYASAL, MIKROBIYOLOJIK
    numune_aciklamasi = Column(Text, nullable=True)

    # Lab results
    sonuc = Column(String(30), nullable=True)  # GECTI, KALDI, BEKLEMEDE
    sonuc_deger = Column(String(100), nullable=True)  # actual measured value
    referans_deger = Column(String(100), nullable=True)  # expected value
    birim = Column(String(20), nullable=True)

    # File
    rapor_url = Column(String(500), nullable=True)
    foto_url = Column(String(500), nullable=True)

    kontrol_eden_lab = Column(String(255), nullable=True)
    lab_rapor_no = Column(String(100), nullable=True)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)

    # Relationships
    kalite_kontrol = relationship("KaliteKontrol", back_populates="numuneler")
