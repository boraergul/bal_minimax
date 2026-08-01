"""
User and Role models
"""
from sqlalchemy import Column, String, Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class Rol(Base):
    """Role model for RBAC."""
    
    __tablename__ = "roller"
    
    ad = Column(String(50), unique=True, nullable=False)
    aciklama = Column(Text, nullable=True)
    yetkiler = Column(JSONB, default=list, nullable=False)  # ["*:crud", "stok:read"]
    
    # Relationships
    kullanicilar = relationship("Kullanici", back_populates="rol")


class Kullanici(Base):
    """User model."""
    
    __tablename__ = "kullanicilar"
    
    kullanici_adi = Column(String(100), unique=True, nullable=False, index=True)
    sifre_hash = Column(String(255), nullable=False)
    ad = Column(String(100), nullable=False)
    soyad = Column(String(100), nullable=False)
    eposta = Column(String(255), unique=True, nullable=False, index=True)
    
    rol_id = Column(UUID(as_uuid=True), ForeignKey("roller.id"), nullable=False)
    
    aktif = Column(Boolean, default=True, nullable=False)
    telefon = Column(String(20), nullable=True)
    
    # Security
    son_giris = Column(String(50), nullable=True)  # ISO datetime string
    giris_sayisi = Column(String(20), default="0")  # Stored as string for simplicity
    iki_factor_aktivate = Column(Boolean, default=False)
    
    # Profile
    avatar_url = Column(String(500), nullable=True)
    adres = Column(Text, nullable=True)
    dogum_tarihi = Column(String(20), nullable=True)  # YYYY-MM-DD
    bolum = Column(String(100), nullable=True)
    unvan = Column(String(100), nullable=True)
    
    # Relationships
    rol = relationship("Rol", back_populates="kullanicilar")
    bildirimler = relationship("Bildirim", back_populates="alici")
    
    @property
    def tam_ad(self) -> str:
        return f"{self.ad} {self.soyad}"
