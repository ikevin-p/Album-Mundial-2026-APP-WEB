# app/routers/deseos.py
# Lista de deseos: láminas que el usuario quiere conseguir.
# El sistema notifica en tiempo real cuando otro coleccionista
# tiene esa lámina como repetida disponible para cambio.

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
from pydantic import BaseModel
from app.deps import get_db, get_current_user
from app.models import User, LaminaMundial, Coleccion
from app.database import Base
from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship

# ── Modelo ────────────────────────────────────────────────────────────────────

class LaminaDeseo(Base):
    __tablename__ = "deseos"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"),   nullable=False)
    lamina_id  = Column(Integer, ForeignKey("laminas.id"), nullable=False)
    creado_en  = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("user_id", "lamina_id"),)

    usuario = relationship("User",          foreign_keys=[user_id])
    lamina  = relationship("LaminaMundial", foreign_keys=[lamina_id])


router = APIRouter(prefix="/deseos", tags=["Deseos"])


def _lamina_dict(l: LaminaMundial) -> dict:
    return {
        "id"                 : l.id,
        "codigo_lamina"      : l.codigo_lamina,
        "nombre_jugador"     : l.nombre_jugador,
        "pais"               : l.pais,
        "es_lamina_brillante": l.es_lamina_brillante,
    }


# ── GET /deseos/ ──────────────────────────────────────────────────────────────
@router.get("/", summary="Mis láminas deseadas")
def mis_deseos(db: Session = Depends(get_db), yo: User = Depends(get_current_user)):
    items = db.query(LaminaDeseo).filter(LaminaDeseo.user_id == yo.id).all()
    result = []
    for d in items:
        # Ver quién tiene esa lámina repetida disponible para cambio
        oferentes = (
            db.query(Coleccion)
            .filter(
                Coleccion.lamina_id == d.lamina_id,
                Coleccion.user_id != yo.id,
                Coleccion.cantidad >= 2,
            )
            .all()
        )
        result.append({
            "id"           : d.id,
            "lamina"       : _lamina_dict(d.lamina),
            "creado_en"    : d.creado_en.isoformat(),
            "disponible_en": [
                {"user_id": o.user_id, "cantidad_repetidas": o.cantidad - 1}
                for o in oferentes
            ],
        })
    return result


class DeseaIn(BaseModel):
    lamina_id: int


# ── POST /deseos/ ─────────────────────────────────────────────────────────────
@router.post("/", status_code=201, summary="Agregar lámina a deseos")
def agregar_deseo(body: DeseaIn, db: Session = Depends(get_db), yo: User = Depends(get_current_user)):
    lamina = db.query(LaminaMundial).filter(LaminaMundial.id == body.lamina_id).first()
    if not lamina:
        raise HTTPException(404, "Lámina no encontrada")
    existe = db.query(LaminaDeseo).filter(
        and_(LaminaDeseo.user_id == yo.id, LaminaDeseo.lamina_id == body.lamina_id)
    ).first()
    if existe:
        return {"msg": "Ya está en tu lista de deseos", "id": existe.id}
    deseo = LaminaDeseo(user_id=yo.id, lamina_id=body.lamina_id)
    db.add(deseo)
    db.commit()
    db.refresh(deseo)
    return {"msg": "Agregado a lista de deseos", "id": deseo.id}


# ── DELETE /deseos/{lamina_id} ────────────────────────────────────────────────
@router.delete("/{lamina_id}", summary="Quitar lámina de deseos")
def quitar_deseo(lamina_id: int, db: Session = Depends(get_db), yo: User = Depends(get_current_user)):
    deseo = db.query(LaminaDeseo).filter(
        and_(LaminaDeseo.user_id == yo.id, LaminaDeseo.lamina_id == lamina_id)
    ).first()
    if not deseo:
        raise HTTPException(404, "No está en tu lista de deseos")
    db.delete(deseo)
    db.commit()
    return {"msg": "Eliminado de la lista de deseos"}


# ── GET /deseos/oportunidades ─────────────────────────────────────────────────
@router.get("/oportunidades", summary="Quién tiene mis láminas deseadas")
def oportunidades_deseos(db: Session = Depends(get_db), yo: User = Depends(get_current_user)):
    """
    Para cada lámina en mi lista de deseos, devuelve los usuarios
    que tienen esa lámina repetida (cantidad >= 2) y pueden cambiarla.
    """
    deseos = db.query(LaminaDeseo).filter(LaminaDeseo.user_id == yo.id).all()
    resultado = []
    for d in deseos:
        oferentes = (
            db.query(Coleccion, User)
            .join(User, User.id == Coleccion.user_id)
            .filter(
                Coleccion.lamina_id == d.lamina_id,
                Coleccion.user_id   != yo.id,
                Coleccion.cantidad  >= 2,
            )
            .all()
        )
        if oferentes:
            resultado.append({
                "lamina"   : _lamina_dict(d.lamina),
                "oferentes": [
                    {
                        "id"               : u.id,
                        "username"         : u.username,
                        "nombre_real"      : u.nombre_real,
                        "cantidad_repetidas": c.cantidad - 1,
                    }
                    for c, u in oferentes
                ],
            })
    return resultado
