"""
Gıda İzlenebilirlik Log Modelleri
Food Traceability Log (Legal Requirement - Turkish Food Law)
"""
from sqlalchemy import Column, String, Numeric, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class GidaIzlenebilirlikLog(Base):
    """Food Traceability Movement Log Model.

    Legal requirement per Turkish Food Law (Gıda Kanunu).
    Tracks complete lifecycle of food products from raw material to end customer.
    Enables complete backward and forward traceability.
    """

    __tablename__ = "gida_izlenebilirlik_log"

    lot_no = Column(String(50), nullable=False, index=True)
    hareket_tipi = Column(
        String(30),
        nullable=False,
        index=True
    )  # TEDARIKCI_GIRIS, URETIM_GIRIS, URETIM_CIKIS, SATIS_CIKIS, TRANSFER, IADE, KALITE_KONTROL

    urun_id = Column(
        UUID(as_uuid=True),
        ForeignKey("urunler.id"),
        nullable=True
    )
    stok_id = Column(
        UUID(as_uuid=True),
        ForeignKey("stok_kartlari.id"),
        nullable=True
    )
    miktar = Column(Numeric(15, 3), nullable=True)
    birim = Column(String(20), nullable=True)

    kaynak_lot_no = Column(String(50), nullable=True)
    hedef_lot_no = Column(String(50), nullable=True)

    tedarikci_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tedarikciler.id"),
        nullable=True
    )
    uretim_emri_id = Column(
        UUID(as_uuid=True),
        ForeignKey("uretim_emirleri.id"),
        nullable=True
    )
    satis_kaydi_id = Column(
        UUID(as_uuid=True),
        ForeignKey("satis_kayitlari.id"),
        nullable=True
    )

    aciklama = Column(Text, nullable=True)

    olusturma_tarihi = Column(String(50), nullable=False)
    guncelleme_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(
        UUID(as_uuid=True),
        ForeignKey("kullanicilar.id"),
        nullable=False
    )

    # Relationships
    urun = relationship("Urun")
    stok_karti = relationship("StokKarti")
    tedarikci = relationship("Tedarikci")
    uretim_emri = relationship("UretimEmri")
    satis_kaydi = relationship("SatisKaydi")
    olusturan = relationship("Kullanici")
