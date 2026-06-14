from pydantic import BaseModel, Field, ConfigDict


# ── Auth ──────────────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterIn(BaseModel):
    username:    str = Field(..., min_length=3, max_length=30)
    nombre_real: str = Field(..., min_length=2, max_length=60)
    password:    str = Field(..., min_length=4)


class UserOut(BaseModel):
    id:          int
    username:    str
    nombre_real: str
    model_config = ConfigDict(from_attributes=True)


# ── Catálogo ──────────────────────────────────────────────────────────────────
class LaminaOut(BaseModel):
    id:                  int
    codigo_lamina:       str
    nombre_jugador:      str
    pais:                str
    club:                str
    es_lamina_brillante: bool
    model_config = ConfigDict(from_attributes=True)


# ── Colección del usuario ─────────────────────────────────────────────────────
class LaminaConEstado(BaseModel):
    """Lámina del catálogo enriquecida con el estado del usuario."""
    id:                  int
    codigo_lamina:       str
    nombre_jugador:      str
    pais:                str
    club:                str
    es_lamina_brillante: bool
    cantidad:            int   # 0=no la tiene, 1=la tiene, 2+=repetidas


class ToggleIn(BaseModel):
    """PATCH: toggle rápido de cantidad (usado por la app al tocar una lámina)."""
    cantidad: int = Field(..., ge=0, le=10,
                          description="0=quitar, 1=marcar como pegada, 2-10=repetidas")


class ColeccionCreateIn(BaseModel):
    """POST: agregar una lámina nueva a la colección."""
    lamina_id: int = Field(..., description="ID de la lámina del catálogo")
    cantidad:  int = Field(default=1, ge=1, le=10,
                           description="Cantidad inicial (mínimo 1)")


class ColeccionUpdateIn(BaseModel):
    """PUT: reemplazar la cantidad completa de una lámina."""
    cantidad: int = Field(..., ge=0, le=10,
                          description="Nueva cantidad. 0=eliminar de la colección")
