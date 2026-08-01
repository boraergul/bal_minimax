"""
Production cost tracking models
"""
from sqlalchemy import Column, String, Text, Numeric, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class UretimIscilik(Base):
    """Production labor cost records."""

    __tablename__ = "uretim_iscilik"

    uretim_id = Column(UUID(as_uuid=True), ForeignKey("uretim_emirleri.id"), nullable=False)

    personel_id = Column(UUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=True)
    personel_ad = Column(String(255), nullable=True)

    # Time tracking
    baslangic_saat = Column(String(50), nullable=False)
    bitis_saat = Column(String(50), nullable=True)
    toplam_sure_saat = Column(Numeric(10, 2), nullable=True)

    # Cost
    birim_ucret = Column(Numeric(15, 4), nullable=False)  # TL/saat
    toplam_tutar = Column(Numeric(15, 4), nullable=False)

    # Type
    is_tipi = Column(String(50), nullable=True)  # KURUTMA, PAKETLEME, KALITE, DIGER
    not_text = Column(Text, nullable=True)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)

    # Relationships
    uretim_emri = relationship("UretimEmri", back_populates="iscilik_kayitlari")


class UretimEnerji(Base):
    """Production energy cost records."""

    __tablename__ = "uretim_enerji"

    uretim_id = Column(UUID(as_uuid=True), ForeignKey("uretim_emirleri.id"), nullable=False)

    enerji_tipi = Column(String(30), nullable=False)  # ELEKTRIK, DOGALGAZ, MOTORIN, DIGER
    birim = Column(String(20), nullable=False)  # kWh, m³, litre

    tuketim_miktari = Column(Numeric(15, 4), nullable=False)
    birim_fiyat = Column(Numeric(15, 4), nullable=False)
    toplam_tutar = Column(Numeric(15, 4), nullable=False)

    # Date
    tarih = Column(String(20), nullable=False)
    donem = Column(String(20), nullable=True)  # YYYY-MM

    not_text = Column(Text, nullable=True)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)

    # Relationships
    uretim_emri = relationship("UretimEmri", back_populates="enerji_kayitlari")


class UretimBakim(Base):
    """Production maintenance cost records."""

    __tablename__ = "uretim_bakim"

    uretim_id = Column(UUID(as_uuid=True), ForeignKey("uretim_emirleri.id"), nullable=True)  # nullable = genel gider

    bakim_tipi = Column(String(50), nullable=False)  # PLANLI, HARCAMALI, ARIZA
    bakim_aciklamasi = Column(Text, nullable=True)

    tutar = Column(Numeric(15, 4), nullable=False)

    tarih = Column(String(20), nullable=False)
    donem = Column(String(20), nullable=True)

    not_text = Column(Text, nullable=True)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)

    # Relationships
    uretim_emri = relationship("UretimEmri", back_populates="bakim_kayitlari")


class UretimGenelGider(Base):
    """Production overhead allocation."""

    __tablename__ = "uretim_genel_gider"

    uretim_id = Column(UUID(as_uuid=True), ForeignKey("uretim_emirleri.id"), nullable=True)  # nullable = genel

    gider_turu = Column(String(50), nullable=False)  # KIRA, PERSONEL, ENERJI, BAKIM, DIGER
    gider_aciklamasi = Column(Text, nullable=True)

    tutar = Column(Numeric(15, 4), nullable=False)

    # Allocation
    dagitim_tipi = Column(String(30), nullable=True)  # URETIM_MIKTARI, ISCILIK_SURE, SABIT
    dagitim_orani = Column(Numeric(10, 6), nullable=True)
    dagitilan_tutar = Column(Numeric(15, 4), nullable=True)

    donem = Column(String(20), nullable=True)  # YYYY-MM

    not_text = Column(Text, nullable=True)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)

    # Relationships
    uretim_emri = relationship("UretimEmri", back_populates="genel_gider_kayitlari")
