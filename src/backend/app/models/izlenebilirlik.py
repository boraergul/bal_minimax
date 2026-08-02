"""
Gıda İzlenebilirlik Log
Food traceability tracking
"""
from sqlalchemy import Column, String, Numeric, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class GidaIzlenebilirlikLog(Base):
    """Food traceability movement log.

    Tracks complete lifecycle of food products from raw material to end customer.
    """

    __tablename__ = "gida_izlenebilirlik_log"

    # Lot tracking
    lot_no = Column(String(50), nullable=False, index=True)
    hareket_tipi = Column(
        String(30),
        nullable=False,
        index=True
    )  # GIRIS, CIKIS, URETIM, TRANSFER, IADE

    # Reference tracking
    referans_id = Column(UUID(as_uuid=True), nullable=True)
    referans_tablo = Column(String(50), nullable=True)  # stok_kartlari, satis_kayitlari, etc.

    hareket_tarihi = Column(String(50), nullable=False)  # ISO datetime

    # Lot chain
    kaynak_lot_no = Column(String(50), nullable=True)
    hedef_lot_no = Column(String(50), nullable=True)

    # Business partners
    tedarikci_id = Column(UUID(as_uuid=True), ForeignKey("tedarikciler.id"), nullable=True)
    musteri_id = Column(UUID(as_uuid=True), ForeignKey("musteriler.id"), nullable=True)

    # Product reference
    urun_id = Column(UUID(as_uuid=True), ForeignKey("urunler.id"), nullable=True)

    # Quantity
    miktar = Column(Numeric(15, 3), nullable=True)
    birim = Column(String(20), nullable=True)

    # Location tracking
    konum = Column(String(100), nullable=True)
    onceki_konum = Column(String(100), nullable=True)
    sonraki_konum = Column(String(100), nullable=True)

    # Additional data
    not_text = Column(Text, nullable=True)
    irsaliye_no = Column(String(50), nullable=True)
    belge_url = Column(String(500), nullable=True)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    kullanici_id = Column(UUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=False)

    # Relationships
    tedarikci = relationship("Tedarikci")
    musteri = relationship("Musteri")
    urun = relationship("Urun")
    kullanici = relationship("Kullanici")
