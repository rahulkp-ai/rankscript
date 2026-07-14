from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Configure engine based on database type
engine_kwargs = {
    "pool_pre_ping": True,
}

# SQLite uses different connection parameters
if "sqlite" in settings.DATABASE_URL.lower():
    engine = create_engine(settings.DATABASE_URL, **engine_kwargs)
else:
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
    })
    engine = create_engine(settings.DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency — yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
