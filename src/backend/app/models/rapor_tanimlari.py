"""
Rapor Tanımları Modelleri
Report Template Definitions
"""
from sqlalchemy import Column, String, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class RaporTanim(Base):
    """Report Template Definition Model.

    Defines report templates with query structures,
    parameters, and visualization options.
    """

    __tablename__ = "rapor_tanimlari"

    ad = Column(String(100), nullable=False)
    rapor_tipi = Column(
        String(50),
        nullable=False,
        index=True
    )  # STOK, SATIS, URETIM, FINANS, KPI, IZLENEBILIRLIK
    kategori = Column(String(30), nullable=True)

    tablo_yapisi = Column(JSONB, nullable=True)  # Columns definition
    sorgu_tanimi = Column(Text, nullable=True)  # SQL or description
    varsayilan_parametreler = Column(JSONB, nullable=True)

    grafik_tipi = Column(
        String(30),
        nullable=True
    )  # BAR, LINE, PIE, TABLE
    aktif = Column(Boolean, default=True, nullable=False)
    varsayilan = Column(Boolean, default=False, nullable=False)

    olusturma_tarihi = Column(String(50), nullable=False)
    guncelleme_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(
        UUID(as_uuid=True),
        ForeignKey("kullanicilar.id"),
        nullable=False
    )

    # Relationships
    olusturan = relationship("Kullanici")
    cektirmeler = relationship(
        "RaporCektirme",
        back_populates="rapor_tanim",
        cascade="all, delete-orphan"
    )
    schedule = relationship(
        "RaporSchedule",
        back_populates="rapor_tanim",
        uselist=False,
        cascade="all, delete-orphan"
    )
