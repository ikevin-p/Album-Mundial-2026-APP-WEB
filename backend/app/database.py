# Configuración central de SQLAlchemy y la sesión de BD.
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite local en archivo. check_same_thread=False es necesario en FastAPI
# porque las peticiones pueden ejecutarse en distintos hilos.
# Ruta configurable por env var (en Docker apunta al volumen /app/data).
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mundial.db")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# Factory de sesiones: cada request abre y cierra su propia sesión.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base declarativa de la que heredan todos los modelos.
Base = declarative_base()
