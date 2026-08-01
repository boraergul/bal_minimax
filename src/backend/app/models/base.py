"""
Base models and mixins
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declared_attr


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps."""
    
    olusturma_tarihi = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    guncelleme_tarihi = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


class BaseModel:
    """Base model with common fields."""
    
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    
    @declared_attr
    def __tablename__(cls):
        """Auto-generate table name from class name."""
        return cls.__name__.lower()
