"""
Label and barcode printing models
"""
from sqlalchemy import Column, String, Text, Boolean, Integer, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class EtiketSablon(Base):
    """Label template definition."""

    __tablename__ = "etiket_sablonleri"

    ad = Column(String(100), nullable=False)
    sablon_tipi = Column(String(30), nullable=False)  # LOT, URUN, BARKOD, QR
    kullanım_yeri = Column(String(30), nullable=True)  # DEPO, SATIS, URETIM, TEDARIKCI

    # Dimensions (mm)
    genislik_mm = Column(Numeric(10, 2), nullable=False, default=100)
    yukseklik_mm = Column(Numeric(10, 2), nullable=False, default=50)

    # Format
    cikti_format = Column(String(10), nullable=False, default="PDF")  # PDF, ZPL, PNG

    # Template content
    template_data = Column(JSONB, default=dict)  # layout, fields, styles
    zpl_sablon = Column(Text, nullable=True)  # raw ZPL code

    # Fields
    alanlar = Column(JSONB, default=list)  # list of field definitions

    aktif = Column(Boolean, default=True, nullable=False)
    varsayilan = Column(Boolean, default=False)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    guncelleme_tarihi = Column(String(50), nullable=False)
    silme_tarihi = Column(String(50), nullable=True)
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)

    # Relationships
    alanlar_relation = relationship("EtiketAlan", back_populates="sablon")


class EtiketAlan(Base):
    """Label field definitions."""

    __tablename__ = "etiket_alanlari"

    sablon_id = Column(UUID(as_uuid=True), ForeignKey("etiket_sablonleri.id"), nullable=False)

    alan_adi = Column(String(50), nullable=False)  # lot_no, tarih, skt, urun_ad
    goruntu_ad = Column(String(100), nullable=False)  # Lot No, Tarih, SKT, Ürün Adı

    # Position (mm from top-left)
    x_mm = Column(Numeric(10, 2), nullable=False)
    y_mm = Column(Numeric(10, 2), nullable=False)
    genislik_mm = Column(Numeric(10, 2), nullable=True)
    yukseklik_mm = Column(Numeric(10, 2), nullable=True)

    # Font
    font_adi = Column(String(50), nullable=True, default="Arial")
    font_boyutu = Column(Integer, nullable=True, default=10)
    font_rengi = Column(String(20), nullable=True, default="#000000")

    # Content
    deger_kaynagi = Column(String(50), nullable=True)  # field name or static text
    bicim = Column(String(100), nullable=True)  # format pattern

    # Barcode specific
    barcode_tipi = Column(String(20), nullable=True)  # EAN13, CODE128, QR, PDF417
    barcode_genislik = Column(Integer, nullable=True)
    barcode_yukseklik = Column(Integer, nullable=True)

    siralama = Column(Integer, default=0)
    aktif = Column(Boolean, default=True, nullable=False)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)

    # Relationships
    sablon = relationship("EtiketSablon", back_populates="alanlar_relation")
