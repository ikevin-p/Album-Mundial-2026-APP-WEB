from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class User(Base):
    """Usuario del sistema con nombre real para mostrar en el álbum."""
    __tablename__ = "users"

    id               = Column(Integer, primary_key=True, index=True)
    username         = Column(String, unique=True, index=True, nullable=False)
    nombre_real      = Column(String, nullable=False, default="")
    hashed_password  = Column(String, nullable=False)
    esta_en_linea    = Column(Boolean, default=False)
    ultimo_visto     = Column(DateTime, nullable=True)

    coleccion = relationship("Coleccion", back_populates="usuario", cascade="all, delete-orphan")
    mensajes_enviados  = relationship("Mensaje", foreign_keys="Mensaje.remitente_id", back_populates="remitente")
    salas_participadas = relationship("SalaParticipante", back_populates="usuario")


class LaminaMundial(Base):
    """Catálogo global de láminas. Compartido por todos los usuarios."""
    __tablename__ = "laminas"

    id               = Column(Integer, primary_key=True, index=True)
    codigo_lamina    = Column(String, unique=True, index=True, nullable=False)
    nombre_jugador   = Column(String, nullable=False)
    pais             = Column(String, nullable=False, default="")
    club             = Column(String, nullable=False, default="")
    es_lamina_brillante = Column(Boolean, default=False, nullable=False)

    entradas_coleccion = relationship("Coleccion", back_populates="lamina")


class Coleccion(Base):
    """Registro de qué láminas tiene cada usuario y cuántas repetidas."""
    __tablename__ = "coleccion"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    lamina_id       = Column(Integer, ForeignKey("laminas.id"), nullable=False)
    cantidad        = Column(Integer, default=1, nullable=False)

    usuario = relationship("User", back_populates="coleccion")
    lamina  = relationship("LaminaMundial", back_populates="entradas_coleccion")

    __table_args__ = (
        UniqueConstraint("user_id", "lamina_id", name="uq_user_lamina"),
    )


# ── Modelos de Chat ────────────────────────────────────────────────────────────

class SalaChat(Base):
    """Sala de chat P2P. La sala_key es determinista: IDs ordenados, ej: '1_3'."""
    __tablename__ = "salas_chat"

    id        = Column(Integer, primary_key=True, index=True)
    sala_key  = Column(String, unique=True, nullable=False)
    creada_en = Column(DateTime, default=datetime.utcnow)

    mensajes      = relationship("Mensaje",          back_populates="sala")
    participantes = relationship("SalaParticipante", back_populates="sala")


class SalaParticipante(Base):
    """Tabla pivote usuario <-> sala."""
    __tablename__ = "sala_participantes"

    id         = Column(Integer, primary_key=True, index=True)
    sala_id    = Column(Integer, ForeignKey("salas_chat.id"))
    usuario_id = Column(Integer, ForeignKey("users.id"))

    sala    = relationship("SalaChat", back_populates="participantes")
    usuario = relationship("User",     back_populates="salas_participadas")


class Mensaje(Base):
    """Mensaje individual en una sala. remitente_id=None indica que es del chatbot."""
    __tablename__ = "mensajes"

    id           = Column(Integer, primary_key=True, index=True)
    sala_id      = Column(Integer, ForeignKey("salas_chat.id"))
    remitente_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    contenido    = Column(Text, nullable=False)
    es_del_bot   = Column(Boolean, default=False)
    enviado_en   = Column(DateTime, default=datetime.utcnow)
    leido        = Column(Boolean, default=False)

    sala      = relationship("SalaChat", back_populates="mensajes")
    remitente = relationship("User", foreign_keys=[remitente_id], back_populates="mensajes_enviados")


# ── Modelo de Intercambios ─────────────────────────────────────────────────────

class Intercambio(Base):
    """
    Propuesta de intercambio de láminas entre dos usuarios.
    El proponente OFRECE una de sus repetidas y PIDE una repetida del receptor.
    Estados: pendiente → aceptado | rechazado | cancelado
    Al aceptar se ejecuta la transferencia atómica en la tabla coleccion.
    """
    __tablename__ = "intercambios"

    id                 = Column(Integer, primary_key=True, index=True)
    proponente_id      = Column(Integer, ForeignKey("users.id"),   nullable=False)
    receptor_id        = Column(Integer, ForeignKey("users.id"),   nullable=False)
    lamina_ofrecida_id = Column(Integer, ForeignKey("laminas.id"), nullable=False)
    lamina_pedida_id   = Column(Integer, ForeignKey("laminas.id"), nullable=False)
    estado             = Column(String, default="pendiente", nullable=False)
    mensaje            = Column(Text, default="")
    creado_en          = Column(DateTime, default=datetime.utcnow)
    respondido_en      = Column(DateTime, nullable=True)

    proponente      = relationship("User",          foreign_keys=[proponente_id])
    receptor        = relationship("User",          foreign_keys=[receptor_id])
    lamina_ofrecida = relationship("LaminaMundial", foreign_keys=[lamina_ofrecida_id])
    lamina_pedida   = relationship("LaminaMundial", foreign_keys=[lamina_pedida_id])
