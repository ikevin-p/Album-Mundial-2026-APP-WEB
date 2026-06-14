from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.deps import get_db, get_current_user
from app.models import LaminaMundial, Coleccion, User
from app.schemas import LaminaConEstado, ToggleIn, ColeccionCreateIn, ColeccionUpdateIn

router = APIRouter(prefix="/coleccion", tags=["coleccion"])


def _build_response(lamina: LaminaMundial, cantidad: int) -> LaminaConEstado:
    return LaminaConEstado(
        id=lamina.id,
        codigo_lamina=lamina.codigo_lamina,
        nombre_jugador=lamina.nombre_jugador,
        pais=lamina.pais,
        club=lamina.club,
        es_lamina_brillante=lamina.es_lamina_brillante,
        cantidad=cantidad,
    )


def _get_entrada(db: Session, user_id: int, lamina_id: int) -> Coleccion | None:
    return db.query(Coleccion).filter(
        Coleccion.user_id == user_id,
        Coleccion.lamina_id == lamina_id,
    ).first()


# ── GET /coleccion/ ──────────────────────────────────────────────────────────
@router.get("/", response_model=List[LaminaConEstado], summary="Listar colección")
def listar_coleccion(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Devuelve todo el catálogo enriquecido con el estado del usuario actual.
    - `cantidad = 0` → no la tiene
    - `cantidad = 1` → la tiene pegada
    - `cantidad > 1` → tiene repetidas para cambiar
    """
    laminas = db.query(LaminaMundial).order_by(LaminaMundial.codigo_lamina).all()
    mis_entradas = {
        c.lamina_id: c.cantidad
        for c in db.query(Coleccion).filter(Coleccion.user_id == current_user.id).all()
    }
    return [_build_response(l, mis_entradas.get(l.id, 0)) for l in laminas]


# ── GET /coleccion/{lamina_id} ───────────────────────────────────────────────
@router.get("/{lamina_id}", response_model=LaminaConEstado, summary="Obtener lámina")
def obtener_lamina(
    lamina_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Devuelve una lámina específica con el estado del usuario actual."""
    lamina = db.query(LaminaMundial).filter(LaminaMundial.id == lamina_id).first()
    if not lamina:
        raise HTTPException(status_code=404, detail="Lámina no encontrada")
    entrada = _get_entrada(db, current_user.id, lamina_id)
    return _build_response(lamina, entrada.cantidad if entrada else 0)


# ── POST /coleccion/ ─────────────────────────────────────────────────────────
@router.post("/", response_model=LaminaConEstado, status_code=status.HTTP_201_CREATED,
             summary="Agregar lámina a la colección")
def agregar_lamina(
    body: ColeccionCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marca una lámina como poseída por el usuario.
    Si ya existe en su colección, devuelve 409.
    """
    lamina = db.query(LaminaMundial).filter(LaminaMundial.id == body.lamina_id).first()
    if not lamina:
        raise HTTPException(status_code=404, detail="Lámina no encontrada")
    if _get_entrada(db, current_user.id, body.lamina_id):
        raise HTTPException(status_code=409, detail="La lámina ya está en tu colección")
    entrada = Coleccion(
        user_id=current_user.id,
        lamina_id=body.lamina_id,
        cantidad=body.cantidad,
    )
    db.add(entrada)
    db.commit()
    return _build_response(lamina, body.cantidad)


# ── PUT /coleccion/{lamina_id} ───────────────────────────────────────────────
@router.put("/{lamina_id}", response_model=LaminaConEstado, summary="Actualizar cantidad completa")
def actualizar_lamina(
    lamina_id: int,
    body: ColeccionUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reemplaza la cantidad de una lámina en la colección del usuario.
    Si no existe, la crea. Si cantidad=0, la elimina.
    """
    lamina = db.query(LaminaMundial).filter(LaminaMundial.id == lamina_id).first()
    if not lamina:
        raise HTTPException(status_code=404, detail="Lámina no encontrada")
    entrada = _get_entrada(db, current_user.id, lamina_id)
    if body.cantidad == 0:
        if entrada:
            db.delete(entrada)
            db.commit()
        return _build_response(lamina, 0)
    if entrada:
        entrada.cantidad = body.cantidad
    else:
        entrada = Coleccion(user_id=current_user.id, lamina_id=lamina_id, cantidad=body.cantidad)
        db.add(entrada)
    db.commit()
    return _build_response(lamina, body.cantidad)


# ── PATCH /coleccion/{lamina_id} ─────────────────────────────────────────────
@router.patch("/{lamina_id}", response_model=LaminaConEstado, summary="Toggle rápido (+1 o reset)")
def toggle_lamina(
    lamina_id: int,
    body: ToggleIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Actualización parcial rápida. Usado por la app al tocar una lámina.
    - `cantidad = 0` → quitar de la colección
    - `cantidad >= 1` → marcar/actualizar repetidas (máx 10)
    """
    lamina = db.query(LaminaMundial).filter(LaminaMundial.id == lamina_id).first()
    if not lamina:
        raise HTTPException(status_code=404, detail="Lámina no encontrada")
    entrada = _get_entrada(db, current_user.id, lamina_id)
    if body.cantidad == 0:
        if entrada:
            db.delete(entrada)
            db.commit()
        return _build_response(lamina, 0)
    if entrada:
        entrada.cantidad = body.cantidad
    else:
        entrada = Coleccion(user_id=current_user.id, lamina_id=lamina_id, cantidad=body.cantidad)
        db.add(entrada)
    db.commit()
    return _build_response(lamina, body.cantidad)


# ── DELETE /coleccion/{lamina_id} ────────────────────────────────────────────
@router.delete("/{lamina_id}", status_code=status.HTTP_204_NO_CONTENT,
               summary="Eliminar lámina de la colección")
def eliminar_lamina(
    lamina_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Elimina una lámina de la colección del usuario. Devuelve 204 sin contenido.
    Si no existe en su colección, devuelve 404.
    """
    entrada = _get_entrada(db, current_user.id, lamina_id)
    if not entrada:
        raise HTTPException(status_code=404, detail="Lámina no está en tu colección")
    db.delete(entrada)
    db.commit()
