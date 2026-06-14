# Lógica de seguridad: hashing de contraseñas y manejo de JWT.
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext

# En producción, mover a variable de entorno (.env).
SECRET_KEY = "CAMBIAR_ESTA_CLAVE_POR_UNA_SEGURA_64_CHARS"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Contexto de hashing con bcrypt.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain: str, hashed: str) -> bool:
    """Compara una contraseña en texto plano contra su hash almacenado."""
    return pwd_context.verify(plain, hashed)


def get_password_hash(password: str) -> str:
    """Genera el hash bcrypt de una contraseña."""
    return pwd_context.hash(password)


def create_access_token(data: dict) -> str:
    """Construye un JWT firmado con expiración configurable."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> str | None:
    """Valida la firma del token y devuelve el 'sub' (username) o None si es inválido."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


def decode_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        return None

