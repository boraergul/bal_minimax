"""
Batch/Toplu işlem models
"""
from sqlalchemy import Column, String, Text, Numeric, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class TopluIslem(Base):
    """Batch operation master record."""

    __tablename__ = "toplu_islemler"

    islem_turu = Column(String(50), nullable=False)  # STOK_GIRISI, URETIM_EMRI, MUSKAYIT, TEDARIKCI_KAYIT, STOK_DUZELTME, ETIKET_BASKI, SATIS_IRAC
    islem_no = Column(String(50), nullable=False, unique=True)  # TIS-YYYYMMDD-XXX

    durum = Column(String(30), nullable=False, default="BEKLEMEDE")  # BEKLEMEDE, VALIDATING, ISLENIYOR, TAMAMLANDI, HATALAR_VAR, IPTAL_EDILDI

    # File
    dosya_adi = Column(String(255), nullable=True)
    dosya_url = Column(String(500), nullable=True)
    satir_sayisi = Column(Integer, nullable=True)

    # Results
    basarili_satir = Column(Integer, default=0)
    basarisiz_satir = Column(Integer, default=0)
    islenen_satir = Column(Integer, default=0)

    # Validation
    validasyon_hatalari = Column(JSONB, default=list)
    validasyon_tarihi = Column(String(50), nullable=True)

    # Processing
    islem_baslangic = Column(String(50), nullable=True)
    islem_bitis = Column(String(50), nullable=True)

    # Approval
    onay_durumu = Column(String(30), default="BEKLEMEDE")  # BEKLEMEDE, ONAYLANDI, REDDEDILDI
    onay_leyen_id = Column(UUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=True)
    onay_tarihi = Column(String(50), nullable=True)
    ret_nedeni = Column(Text, nullable=True)

    # Output
    sonuc_dosya_url = Column(String(500), nullable=True)

    # Notes
    not_text = Column(Text, nullable=True)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)
    silme_tarihi = Column(String(50), nullable=True)

    # Relationships
    satirlar = relationship("TopluIslemSatir", back_populates="toplu_islem")


class TopluIslemSatir(Base):
    """Batch operation line items."""

    __tablename__ = "toplu_islem_satirlari"

    toplu_islem_id = Column(UUID(as_uuid=True), ForeignKey("toplu_islemler.id"), nullable=False)

    satir_no = Column(Integer, nullable=False)
    satir_verisi = Column(JSONB, default=dict)  # original row data

    durum = Column(String(30), nullable=False, default="BEKLEMEDE")  # BEKLEMEDE, BASARILI, BASARISIZ, ATLANDI

    # Result
    islenen_veri = Column(JSONB, default=dict)
    olusturulan_id = Column(UUID(as_uuid=True), nullable=True)  # created record ID
    hata_mesaji = Column(Text, nullable=True)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)

    # Relationships
    toplu_islem = relationship("TopluIslem", back_populates="satirlar")
