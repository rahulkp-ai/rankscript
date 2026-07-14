from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.user import UserRegister, UserLogin, UserResponse, Token, TokenRefresh
from app.services.auth_service import register_user, login_user, refresh_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user (student, mentor, or admin)."""
    return register_user(db, data)


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Login and receive access + refresh tokens."""
    return login_user(db, data)


@router.post("/refresh", response_model=Token)
def refresh(data: TokenRefresh):
    """Get a new access token using a refresh token."""
    return refresh_access_token(data.refresh_token)