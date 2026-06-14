# Dockerfile — Backend Álbum Mundial 2026
# Imagen base Python 3.12 slim para mantener el tamaño pequeño
FROM python:3.12-slim

# Variables de entorno: sin buffer en logs y sin archivos .pyc
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar dependencias del sistema para bcrypt y SQLite
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código de la aplicación
COPY . .

# Crear directorio para la base de datos persistente
RUN mkdir -p /data

# Exponer el puerto del backend
EXPOSE 8000

# Comando de inicio: Uvicorn apuntando a socket_app (FastAPI + Socket.io)
CMD ["python", "-m", "uvicorn", "app.main:socket_app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1"]
