"""
Database Configuration and Session Management
"""
import uuid
from sqlalchemy import create_engine, Column, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from datetime import datetime

from app.core.config import settings


# Create engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=settings.APP_DEBUG,
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Base class with common fields
class Base:
    """Base class with common fields."""
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    olusturma_tarihi = Column(DateTime, default=datetime.utcnow, nullable=False)
    guncelleme_tarihi = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# Convert to declarative base
Base = declarative_base(cls=Base)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get database session.
    Yields a session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
