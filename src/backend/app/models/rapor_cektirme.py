"""
Rapor Çektirme Modelleri
Report Execution Log
"""
from sqlalchemy import Column, String, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class RaporCektirme(Base):
    """Report Execution/Run Log Model.

    Tracks report generation executions, including
    parameters, output files, and execution status.
    """

    __tablename__ = "rapor_cektirme"

    rapor_tanim_id = Column(
        UUID(as_uuid=True),
        ForeignKey("rapor_tanimlari.id"),
        nullable=False
    )
    parametreler = Column(JSONB, nullable=True)
    sonuc_dosya_yolu = Column(String(500), nullable=True)
    cikti_format = Column(
        String(20),
        nullable=False
    )  # PDF, XLSX, CSV
    durum = Column(
        String(20),
        nullable=False,
        default="HAZIRLANIYOR"
    )  # HAZIRLANIYOR, TAMAMLANDI, HATALAR_VAR

    calisma_suresi_sn = Column(Integer, nullable=True)
    hata_mesaji = Column(Text, nullable=True)

    olusturma_tarihi = Column(String(50), nullable=False)
    guncelleme_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(
        UUID(as_uuid=True),
        ForeignKey("kullanicilar.id"),
        nullable=False
    )

    # Relationships
    rapor_tanim = relationship("RaporTanim", back_populates="cektirmeler")
    olusturan = relationship("Kullanici")
