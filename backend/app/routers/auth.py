from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
import secrets
import re
from app.deps import get_db, get_current_user
from app.models import User
from app.schemas import Token, RegisterIn, UserOut
from app.security import verify_password, get_password_hash, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


class GoogleLoginIn(BaseModel):
    email: str


@router.post("/google", response_model=Token)
def login_google(data: GoogleLoginIn, db: Session = Depends(get_db)):
    """
    Acceso con cuenta de Google (flujo simplificado para entorno académico).
    Recibe el correo Gmail, crea la cuenta automáticamente si no existe
    y devuelve el JWT. En producción se validaría el id_token de Google
    (OAuth 2.0) registrando la app en Google Cloud Console.
    """
    email = data.email.strip().lower()
    # Validación básica de formato de correo Google
    if not re.fullmatch(r"[a-z0-9._%+-]+@(gmail|googlemail)\.com", email):
        raise HTTPException(status_code=422, detail="Ingresa un correo Gmail válido")

    # El email completo actúa como username único
    user = db.query(User).filter(User.username == email).first()
    if not user:
        nombre = email.split("@")[0].replace(".", " ").replace("_", " ").title()
        user = User(
            username=email,
            nombre_real=nombre,
            # Contraseña aleatoria irrecuperable: la cuenta solo entra vía Google
            hashed_password=get_password_hash(secrets.token_urlsafe(24)),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return {"access_token": create_access_token({"sub": str(user.id)}), "token_type": "bearer"}


class ActualizarPerfilIn(BaseModel):
    nombre_real: str


@router.patch("/perfil", response_model=UserOut)
def actualizar_perfil(
    data: ActualizarPerfilIn,
    db  : Session = Depends(get_db),
    yo  : User    = Depends(get_current_user),
):
    """Actualiza el nombre real del usuario autenticado."""
    yo.nombre_real = data.nombre_real.strip()
    db.commit()
    db.refresh(yo)
    return yo


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    """Devuelve los datos del usuario autenticado (para el frontend)."""
    return current_user


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Credenciales incorrectas")
    return {"access_token": create_access_token({"sub": str(user.id)}), "token_type": "bearer"}


@router.post("/register", response_model=UserOut, status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=409, detail="Nombre de usuario ya existe")
    user = User(
        username=data.username,
        nombre_real=data.nombre_real,
        hashed_password=get_password_hash(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
