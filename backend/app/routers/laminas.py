# CRUD completo de LaminaMundial. Todas las rutas protegidas por JWT.
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.models import LaminaMundial, User
from app.schemas import LaminaCreate, LaminaUpdate, LaminaOut

# get_current_user a nivel de router => todas las rutas exigen token válido.
router = APIRouter(
    prefix="/laminas",
    tags=["Mantenedor Láminas"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=list[LaminaOut])
def listar_laminas(db: Session = Depends(get_db)):
    """READ (lista): devuelve toda la colección."""
    return db.query(LaminaMundial).order_by(LaminaMundial.id).all()


@router.get("/{lamina_id}", response_model=LaminaOut)
def obtener_lamina(lamina_id: int, db: Session = Depends(get_db)):
    """READ (detalle): busca una lámina por id o lanza 404."""
    lamina = db.get(LaminaMundial, lamina_id)
    if not lamina:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lámina no encontrada")
    return lamina


@router.post("/", response_model=LaminaOut, status_code=status.HTTP_201_CREATED)
def crear_lamina(payload: LaminaCreate, db: Session = Depends(get_db)):
    """CREATE: registra una nueva lámina. Valida código duplicado (409)."""
    existe = db.query(LaminaMundial).filter(
        LaminaMundial.codigo_lamina == payload.codigo_lamina
    ).first()
    if existe:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una lámina con ese código",
        )

    lamina = LaminaMundial(**payload.model_dump())
    db.add(lamina)
    db.commit()
    db.refresh(lamina)  # Recarga el id autogenerado
    return lamina


@router.put("/{lamina_id}", response_model=LaminaOut)
def actualizar_lamina(lamina_id: int, payload: LaminaUpdate, db: Session = Depends(get_db)):
    """UPDATE: edita campos enviados (parcial). 404 si no existe."""
    lamina = db.get(LaminaMundial, lamina_id)
    if not lamina:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lámina no encontrada")

    # exclude_unset: solo aplica los campos efectivamente enviados.
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(lamina, campo, valor)

    db.commit()
    db.refresh(lamina)
    return lamina


@router.delete("/{lamina_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_lamina(lamina_id: int, db: Session = Depends(get_db)):
    """DELETE: elimina una lámina. 404 si no existe."""
    lamina = db.get(LaminaMundial, lamina_id)
    if not lamina:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lámina no encontrada")
    db.delete(lamina)
    db.commit()
    return None
