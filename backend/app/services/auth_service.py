from sqlalchemy.orm import Session
from datetime import datetime, timezone
from fastapi import HTTPException, status

from app.models.user import User
from app.schemas.user import UserRegister, UserLogin
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)


def register_user(db: Session, data: UserRegister) -> User:
    # Check if email already exists
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Store raw values — XSS prevention is the frontend's responsibility.
    # SQLAlchemy parameterised queries already prevent SQL injection.
    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        state=data.state,
        district=data.district,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login_user(db: Session, data: UserLogin) -> dict:
    user = db.query(User).filter(User.email == data.email).first()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    # Update last login
    user.last_login = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()

    # Update streak for active user (students only — update_streak guards internally)
    try:
        from app.services.ranking_service import update_streak
        update_streak(db, user)
    except Exception:
        pass  # streak update failure should not block login

    token_data = {"sub": str(user.id), "role": user.role.value}

    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer",
    }


def refresh_access_token(refresh_token: str) -> dict:
    payload = decode_token(refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    sub = payload.get("sub")
    role = payload.get("role")
    if not sub or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    # Handle case where role was stored as enum object instead of string
    if isinstance(role, dict):
        role = role.get("_value_", role.get("value", str(role)))

    token_data = {"sub": sub, "role": role}

    # Issue a new access token only — do NOT reissue the refresh token.
    # Reissuing it would reset the expiry clock and make it effectively immortal.
    # For full security, store refresh tokens in Redis and delete on use.
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": refresh_token,   # ← return the original, unchanged
        "token_type": "bearer",
    }