"""
Authentication API router
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import Kullanici
from app.models.base import TimestampMixin

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


# Request/Response schemas
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    id: str
    kullanici_adi: str
    ad: str
    soyad: str
    eposta: str
    rol: str
    aktif: bool

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str
    password: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class RefreshRequest(BaseModel):
    refresh_token: str


# Helper functions
def authenticate_user(db: Session, username: str, password: str) -> Kullanici | None:
    """Authenticate user by username and password."""
    user = db.query(Kullanici).filter(
        Kullanici.kullanici_adi == username,
        Kullanici.aktif == True
    ).first()
    
    if not user:
        return None
    if not verify_password(password, user.sifre_hash):
        return None
    return user


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Kullanici:
    """Get current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz kimlik bilgileri",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
    
    if payload.get("type") != "access":
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    user = db.query(Kullanici).filter(Kullanici.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    if not user.aktif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Kullanıcı hesabı deaktif edilmiş"
        )
    
    return user


# Endpoints
@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """User login endpoint."""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı adı veya şifre hatalı",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get role name
    rol_ad = user.rol.ad if user.rol else "UNKNOWN"
    
    # Create tokens
    extra_claims = {
        "kullanici_adi": user.kullanici_adi,
        "rol": rol_ad,
        "yetkiler": user.rol.yetkiler if user.rol else []
    }
    
    access_token = create_access_token(
        subject=str(user.id),
        extra_claims=extra_claims
    )
    refresh_token = create_refresh_token(subject=str(user.id))
    
    # Update last login
    from datetime import datetime
    user.son_giris = datetime.utcnow().isoformat()
    user.giris_sayisi = str(int(user.giris_sayisi or "0") + 1)
    db.commit()
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshRequest,
    db: Session = Depends(get_db)
):
    """Refresh access token."""
    payload = decode_token(request.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz refresh token"
        )
    
    user_id: str = payload.get("sub")
    user = db.query(Kullanici).filter(Kullanici.id == user_id).first()
    
    if not user or not user.aktif:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı bulunamadı veya deaktif"
        )
    
    rol_ad = user.rol.ad if user.rol else "UNKNOWN"
    extra_claims = {
        "kullanici_adi": user.kullanici_adi,
        "rol": rol_ad,
        "yetkiler": user.rol.yetkiler if user.rol else []
    }
    
    access_token = create_access_token(
        subject=str(user.id),
        extra_claims=extra_claims
    )
    new_refresh_token = create_refresh_token(subject=str(user.id))
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: Kullanici = Depends(get_current_user)):
    """Get current user info."""
    return UserResponse(
        id=str(current_user.id),
        kullanici_adi=current_user.kullanici_adi,
        ad=current_user.ad,
        soyad=current_user.soyad,
        eposta=current_user.eposta,
        rol=current_user.rol.ad if current_user.rol else "UNKNOWN",
        aktif=current_user.aktif
    )


@router.post("/logout")
async def logout(current_user: Kullanici = Depends(get_current_user)):
    """Logout endpoint (client should discard tokens)."""
    return {"message": "Başarıyla çıkış yapıldı"}
