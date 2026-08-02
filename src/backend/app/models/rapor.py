"""
Raporlama Modelleri
"""
from sqlalchemy import Column, String, Text, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class RaporTanimi(Base):
    """Report definition template."""

    __tablename__ = "rapor_tanimlari"

    rapor_adi = Column(String(255), nullable=False)
    rapor_turu = Column(
        String(30),
        nullable=False,
        index=True
    )  # STOK, SATIS, URETIM, TEDARIKCI, MUSTERI, MALIYET, IZLENEBILIRLIK

    sorgu_template = Column(Text, nullable=False)  # SQL or template
    parametreler = Column(JSONB, default=list)  # [{name, type, required, default}]

    grafik_turu = Column(
        String(30),
        nullable=True
    )  # BAR, LINE, PIE, TABLE, AREA, DONUT

    aktif = Column(Boolean, default=True, nullable=False)

    # Access control
    rol_bazli_erisim = Column(JSONB, default=list)  # role IDs

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    guncelleme_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(UUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=False)

    # Relationships
    olusturan = relationship("Kullanici", foreign_keys=[olusturan_kullanici_id])
    cektirmeler = relationship("RaporCektirme", back_populates="rapor")
    schedule = relationship("RaporSchedule", back_populates="rapor", uselist=False)


class RaporCektirme(Base):
    """Report execution/run log."""

    __tablename__ = "rapor_cektirmeler"

    rapor_id = Column(UUID(as_uuid=True), ForeignKey("rapor_tanimlari.id"), nullable=False)

    parametre_degerleri = Column(JSONB, default=dict)  # {param_name: value}

    cikti_format = Column(
        String(20),
        nullable=False
    )  # PDF, EXCEL, CSV, HTML

    cikti_url = Column(String(500), nullable=True)
    cikti_dosya_adi = Column(String(255), nullable=True)

    calisma_zamani = Column(String(50), nullable=True)  # ISO datetime when started
    calisma_suresi_sn = Column(Integer, nullable=True)

    durum = Column(
        String(20),
        nullable=False,
        default="BEKLEMEDE"
    )  # BEKLEMEDE, CALISIYOR, TAMAMLANDI, HATA, IPTAL

    hata_mesaji = Column(Text, nullable=True)

    # Results metadata
    satir_sayisi = Column(Integer, nullable=True)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(UUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=False)

    # Relationships
    rapor = relationship("RaporTanimi", back_populates="cektirmeler")
    olusturan = relationship("Kullanici", foreign_keys=[olusturan_kullanici_id])


class RaporSchedule(Base):
    """Report scheduling for automated generation."""

    __tablename__ = "rapor_schedule"

    rapor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("rapor_tanimlari.id"),
        nullable=False,
        unique=True
    )

    schedule_tipi = Column(
        String(20),
        nullable=False
    )  # DAILY, WEEKLY, MONTHLY

    schedule_time = Column(String(10), nullable=False)  # HH:MM
    schedule_hafta_gun = Column(String(10), nullable=True)  # for WEEKLY: MON, TUE, etc.
    schedule_ay_gun = Column(Integer, nullable=True)  # for MONTHLY: 1-31

    aktif = Column(Boolean, default=True, nullable=False)

    # Last run
    son_calisma = Column(String(50), nullable=True)
    son_sonuc = Column(String(20), nullable=True)  # BASARILI, HATA
    son_hata = Column(Text, nullable=True)

    # Recipients
    alicilar = Column(JSONB, default=list)  # [{type: EMAIL|USER, value: email|user_id}]

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    guncelleme_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(UUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=False)

    # Relationships
    rapor = relationship("RaporTanimi", back_populates="schedule")
    olusturan = relationship("Kullanici", foreign_keys=[olusturan_kullanici_id])
