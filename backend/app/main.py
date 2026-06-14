# app/main.py
# Punto de entrada de la aplicación.
# Monta FastAPI (REST) + Socket.io (WebSocket) bajo una sola app ASGI.

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routers import auth, coleccion
from app.routers.chat.router import router as chat_router
from app.routers.intercambios import router as intercambios_router
from app.routers.deseos import router as deseos_router, LaminaDeseo  # noqa: F401 — registra modelo
from app.routers.chat.socket_manager import sio

import app.models  # Registra todos los modelos antes de create_all

# Crea las tablas nuevas si no existen (incluye SalaChat, Mensaje, etc.)
Base.metadata.create_all(bind=engine)

# ── FastAPI ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title       = "Album Mundial 2026 API",
    description = "REST + WebSocket. Autenticación JWT, CRUD láminas, chat P2P y chatbot.",
    version     = "2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# Routers REST
app.include_router(auth.router)
app.include_router(coleccion.router)
app.include_router(chat_router)
app.include_router(intercambios_router)
app.include_router(deseos_router)

# ── Socket.io wrapping ─────────────────────────────────────────────────────────
# socket_app es la app ASGI final que expone HTTP (FastAPI) y WebSocket (Socket.io)
# en el mismo proceso y puerto. Uvicorn debe apuntar a main:socket_app.
socket_app = socketio.ASGIApp(
    socketio_server = sio,
    other_asgi_app  = app,
    socketio_path   = "/socket.io",
)
