"""
Notification system models
"""
from sqlalchemy import Column, String, Text, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class Bildirim(Base):
    """Notification record."""

    __tablename__ = "bildirimler"

    bildirim_tipi = Column(String(50), nullable=False)  # STOK_KRITIK, STOK_DUSUK, LOT_SK_TARIHI, URETIM_FIRE, TEDARIKCI_PERFORMANS, ONAY_BEKLEYEN, etc.
    baslik = Column(String(255), nullable=False)
    icerik = Column(Text, nullable=False)

    # Priority
    oncelik = Column(String(20), nullable=False, default="NORMAL")  # DUSUK, NORMAL, YUKSEK, KRITIK

    # Status
    durum = Column(String(20), nullable=False, default="GORULMEMIŞ")  # GORULMEMIŞ, GORULDU, OKUNDU

    # Sender/Recipient
    gonderen_id = Column(UUID(as_uuid=True), nullable=True)  # null = system
    gonderen_ad = Column(String(255), nullable=True)
    alici_id = Column(UUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=False)

    # Reference
    referans_tip = Column(String(50), nullable=True)  # STOK, URETIM, TEDARIKCI, SATIS, etc.
    referans_id = Column(UUID(as_uuid=True), nullable=True)

    # Channels
    kanallar = Column(JSONB, default=list)  # ["IN_APP", "EMAIL", "SMS"]
    gonderim_durumu = Column(JSONB, default=dict)  # {"IN_APP": "GONDERILDI", "EMAIL": "BASARISIZ"}

    # Read
    gorulme_tarihi = Column(String(50), nullable=True)
    okunma_tarihi = Column(String(50), nullable=True)

    # Action
    action_url = Column(String(500), nullable=True)
    action_label = Column(String(100), nullable=True)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    gonderim_tarihi = Column(String(50), nullable=True)

    # Relationships
    alici = relationship("Kullanici", back_populates="bildirimler")
    gonderimler = relationship("BildirimGonderim", back_populates="bildirim")


class BildirimSablon(Base):
    """Notification template."""

    __tablename__ = "bildirim_sablonlari"

    sablon_adi = Column(String(100), nullable=False, unique=True)
    bildirim_tipi = Column(String(50), nullable=False)  # matches Bildirim.bildirim_tipi

    # Content
    varsayilan_baslik = Column(String(255), nullable=False)
    varsayilan_icerik = Column(Text, nullable=False)

    # Channels
    kanallar = Column(JSONB, default=list)  # ["IN_APP", "EMAIL", "SMS"]

    # Email specific
    email_sablon_html = Column(Text, nullable=True)
    email_subject = Column(String(255), nullable=True)

    # SMS specific
    sms_sablon = Column(String(500), nullable=True)  # max 160 chars for SMS

    # Variables
    degiskenler = Column(JSONB, default=list)  # ["{{stok_id}}", "{{miktar}}"]

    # Status
    aktif = Column(Boolean, default=True, nullable=False)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)
    guncelleme_tarihi = Column(String(50), nullable=False)
    olusturan_kullanici_id = Column(UUID(as_uuid=True), nullable=False)


class BildirimGonderim(Base):
    """Notification delivery log."""

    __tablename__ = "bildirim_gonderimleri"

    bildirim_id = Column(UUID(as_uuid=True), ForeignKey("bildirimler.id"), nullable=False)

    kanal = Column(String(20), nullable=False)  # IN_APP, EMAIL, SMS
    durum = Column(String(30), nullable=False, default="BEKLEMEDE")  # BEKLEMEDE, GONDERILIYOR, GONDERILDI, BASARISIZ

    gonderim_tarihi = Column(String(50), nullable=True)
    teslim_tarihi = Column(String(50), nullable=True)

    # Error
    hata_kodu = Column(String(20), nullable=True)
    hata_mesaji = Column(Text, nullable=True)

    # Email specific
    email_adresi = Column(String(255), nullable=True)
    email_message_id = Column(String(255), nullable=True)

    # SMS specific
    telefon = Column(String(20), nullable=True)
    sms_message_id = Column(String(100), nullable=True)

    # Metadata
    olusturma_tarihi = Column(String(50), nullable=False)

    # Relationships
    bildirim = relationship("Bildirim", back_populates="gonderimler")


class BildirimKullaniciTercih(Base):
    """Per-user notification preferences."""

    __tablename__ = "bildirim_kullanicari"

    kullanici_id = Column(UUID(as_uuid=True), ForeignKey("kullanicilar.id"), primary_key=True)

    # Channel preferences
    in_app_aktif = Column(Boolean, default=True)
    email_aktif = Column(Boolean, default=True)
    sms_aktif = Column(Boolean, default=False)

    # Type preferences (notification type -> enabled)
    tercihler = Column(JSONB, default=dict)  # {"STOK_KRITIK": true, "LOT_SK_TARIHI": false}

    # Quiet hours
    sessiz_mod_baslangic = Column(String(10), nullable=True)  # HH:MM
    sessiz_mod_bitis = Column(String(10), nullable=True)

    # Metadata
    guncelleme_tarihi = Column(String(50), nullable=False)

    # Relationships
    kullanici = relationship("Kullanici")
