"""
Rapor Schedule Modelleri
Scheduled Report Execution
"""
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class RaporSchedule(Base):
    """Scheduled Report Execution Model.

    Defines automated report generation schedules
    with recipient lists for distribution.
    """

    __tablename__ = "rapor_schedule"

    rapor_tanim_id = Column(
        UUID(as_uuid=True),
        ForeignKey("rapor_tanimlari.id"),
        nullable=False,
        unique=True
    )
    schedule_tipi = Column(
        String(20),
        nullable=False
    )  # GUNLUK, HAFTALIK, AYLIK
    schedule_cron = Column(String(50), nullable=True)
    sonraki_calisma = Column(String(50), nullable=True)
    son_calisma = Column(String(50), nullable=True)
    aktif = Column(Boolean, default=True, nullable=False)
    alici_listesi = Column(JSONB, nullable=True)  # Email/user list

    olusturma_tarihi = Column(String(50), nullable=False)
    guncelleme_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(
        UUID(as_uuid=True),
        ForeignKey("kullanicilar.id"),
        nullable=False
    )

    # Relationships
    rapor_tanim = relationship("RaporTanim", back_populates="schedule")
    olusturan = relationship("Kullanici")
