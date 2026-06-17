# app/routers/chat/socket_manager.py
# Motor WebSocket del chat P2P. Gestiona conexiones, rooms, presencia,
# indicador de escritura y persistencia de mensajes.

import socketio
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import SessionLocal
from app.models import Mensaje, SalaChat, SalaParticipante, User
from app.security import decode_token
from app.routers.chat.chatbot import stream_respuesta_bot
from app.routers.chat.contexto import resumen_coleccion

# ── Servidor Socket.io asíncrono ───────────────────────────────────────────────
sio = socketio.AsyncServer(
    async_mode           = "asgi",
    cors_allowed_origins = "*",
    logger               = False,
    engineio_logger      = False,
)

# Mapa en memoria: socket_id → user_id (se limpia en disconnect)
sesiones_activas: dict[str, int] = {}

# Banderas de cancelación del bot por socket_id. Si está en True, el stream
# en curso para esa sesión se corta en la próxima iteración.
bot_cancelado: dict[str, bool] = {}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _sala_key(uid1: int, uid2: int) -> str:
    a, b = sorted([uid1, uid2])
    return f"{a}_{b}"


def _get_or_create_sala(db: Session, uid1: int, uid2: int) -> SalaChat:
    key  = _sala_key(uid1, uid2)
    sala = db.query(SalaChat).filter(SalaChat.sala_key == key).first()
    if not sala:
        sala = SalaChat(sala_key=key)
        db.add(sala)
        db.flush()
        for uid in [uid1, uid2]:
            db.add(SalaParticipante(sala_id=sala.id, usuario_id=uid))
        db.commit()
        db.refresh(sala)
    return sala


# ── Eventos de conexión / presencia ────────────────────────────────────────────

@sio.event
async def connect(sid: str, environ: dict, auth: dict):
    """Valida JWT en el handshake, registra sesión y anuncia presencia."""
    token = (auth or {}).get("token")
    if not token:
        raise ConnectionRefusedError("Token requerido")

    payload = decode_token(token)
    if not payload:
        raise ConnectionRefusedError("Token inválido")

    user_id = int(payload.get("sub", 0))
    sesiones_activas[sid] = user_id

    db = SessionLocal()
    try:
        u = db.query(User).filter(User.id == user_id).first()
        if u:
            u.esta_en_linea = True
            db.commit()
    finally:
        db.close()

    await sio.enter_room(sid, f"user_{user_id}")
    # Broadcast de presencia a todos los conectados
    await sio.emit("usuario_estado", {"user_id": user_id, "en_linea": True})
    print(f"[SOCKET] conectado uid={user_id} sid={sid}")


@sio.event
async def disconnect(sid: str):
    """Marca al usuario como desconectado, guarda último visto y anuncia."""
    uid = sesiones_activas.pop(sid, None)
    bot_cancelado.pop(sid, None)  # limpiamos la bandera de cancelación
    if uid:
        # Si el usuario tiene otra pestaña/dispositivo conectado, sigue en línea
        sigue_conectado = uid in sesiones_activas.values()
        if not sigue_conectado:
            ultimo = datetime.utcnow()
            db = SessionLocal()
            try:
                u = db.query(User).filter(User.id == uid).first()
                if u:
                    u.esta_en_linea = False
                    u.ultimo_visto  = ultimo
                    db.commit()
            finally:
                db.close()
            await sio.emit("usuario_estado", {
                "user_id": uid, "en_linea": False,
                "ultimo_visto": ultimo.isoformat(),
            })
        print(f"[SOCKET] desconectado uid={uid}")


# ── Indicador "escribiendo..." ─────────────────────────────────────────────────

@sio.on("escribiendo")
async def manejar_escribiendo(sid: str, data: dict):
    """Retransmite al destinatario que el remitente está escribiendo.
    data: { destinatario_id: int, escribiendo: bool }"""
    uid = sesiones_activas.get(sid)
    destino = data.get("destinatario_id")
    if not uid or not destino:
        return
    await sio.emit("usuario_escribiendo", {
        "user_id"    : uid,
        "escribiendo": bool(data.get("escribiendo", True)),
    }, room=f"user_{destino}")


# ── Mensajería P2P ─────────────────────────────────────────────────────────────

@sio.on("enviar_mensaje")
async def manejar_mensaje(sid: str, data: dict):
    """
    Recibe mensaje P2P, lo persiste y lo retransmite.
    data: { destinatario_id: int, contenido: str }
    El payload incluye destinatario_id para que el front filtre por conversación.
    """
    uid_remitente = sesiones_activas.get(sid)
    if not uid_remitente:
        await sio.emit("error", {"msg": "No autenticado"}, to=sid)
        return

    uid_destino = data.get("destinatario_id")
    contenido   = (data.get("contenido") or "").strip()
    if not contenido or not uid_destino:
        return

    db = SessionLocal()
    try:
        sala = _get_or_create_sala(db, uid_remitente, uid_destino)
        msg  = Mensaje(
            sala_id      = sala.id,
            remitente_id = uid_remitente,
            contenido    = contenido,
            es_del_bot   = False,
            enviado_en   = datetime.utcnow(),
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)

        payload = {
            "id"              : msg.id,
            "sala_id"         : sala.id,
            "remitente_id"    : uid_remitente,
            "destinatario_id" : uid_destino,
            "contenido"       : contenido,
            "enviado_en"      : msg.enviado_en.isoformat(),
            "es_del_bot"      : False,
            "es_sistema"      : False,
        }
        await sio.emit("nuevo_mensaje",   payload, room=f"user_{uid_destino}")
        await sio.emit("mensaje_enviado", payload, to=sid)
    finally:
        db.close()


@sio.on("reaccionar")
async def reaccionar(sid: str, data: dict):
    """Retransmite una reacción emoji a un mensaje, en tiempo real.
    data: { destinatario_id: int, mensaje_id: int, emoji: str }
    No se persiste en BD: es un realce visual efímero de la conversación."""
    uid = sesiones_activas.get(sid)
    destino = data.get("destinatario_id")
    mensaje_id = data.get("mensaje_id")
    emoji = (data.get("emoji") or "").strip()
    if not uid or not destino or not mensaje_id or not emoji:
        return
    payload = {"mensaje_id": mensaje_id, "emoji": emoji, "de_usuario": uid}
    # Eco al emisor (para que vea su propia reacción) y al destinatario.
    await sio.emit("reaccion", payload, to=sid)
    await sio.emit("reaccion", payload, room=f"user_{destino}")


@sio.on("marcar_leidos")
async def marcar_leidos(sid: str, data: dict):
    """Marca como leídos los mensajes recibidos de un usuario.
    data: { remitente_id: int }"""
    uid = sesiones_activas.get(sid)
    rid = data.get("remitente_id")
    if not uid or not rid:
        return
    db = SessionLocal()
    try:
        key  = _sala_key(uid, rid)
        sala = db.query(SalaChat).filter(SalaChat.sala_key == key).first()
        if sala:
            db.query(Mensaje).filter(
                Mensaje.sala_id == sala.id,
                Mensaje.remitente_id == rid,
                Mensaje.leido == False,  # noqa: E712
            ).update({"leido": True})
            db.commit()
            # Notificar al remitente que sus mensajes fueron leídos (doble check)
            await sio.emit("mensajes_leidos", {"lector_id": uid}, room=f"user_{rid}")
    finally:
        db.close()


# ── Chatbot ────────────────────────────────────────────────────────────────────

@sio.on("detener_bot")
async def detener_bot(sid: str, data: dict):
    """Marca la generación del bot como cancelada para esta sesión."""
    bot_cancelado[sid] = True


@sio.on("mensaje_al_bot")
async def manejar_bot(sid: str, data: dict):
    """Recibe mensaje para el chatbot, llama a la IA y retransmite la respuesta."""
    uid = sesiones_activas.get(sid)
    if not uid:
        return

    contenido = (data.get("contenido") or "").strip()
    if not contenido:
        return

    db = SessionLocal()
    try:
        sala_key = f"0_{uid}"
        sala = db.query(SalaChat).filter(SalaChat.sala_key == sala_key).first()
        if not sala:
            sala = SalaChat(sala_key=sala_key)
            db.add(sala)
            db.flush()
            db.commit()
            db.refresh(sala)

        db.add(Mensaje(sala_id=sala.id, remitente_id=uid, contenido=contenido, es_del_bot=False))
        db.commit()

        # Avisar al front que el bot está "escribiendo"
        await sio.emit("bot_escribiendo", {"escribiendo": True}, to=sid)

        historial_raw = (
            db.query(Mensaje)
            .filter(Mensaje.sala_id == sala.id)
            .order_by(Mensaje.enviado_en.desc())
            .limit(10)
            .all()
        )
        historial = [
            {"rol": "bot" if m.es_del_bot else "usuario", "contenido": m.contenido}
            for m in reversed(historial_raw)
        ]

        # Resumen REAL de la colección del usuario, para respuestas personalizadas.
        contexto = resumen_coleccion(db, uid)

        # ── STREAMING: emitimos cada fragmento a medida que el modelo lo genera ──
        # El front va concatenando 'bot_chunk' para mostrar la respuesta en vivo.
        bot_cancelado[sid] = False  # reiniciamos la bandera para esta generación
        respuesta_completa = ""
        primer_chunk = True
        async for fragmento in stream_respuesta_bot(contenido, historial, contexto):
            # Si el usuario pulsó "detener", cortamos el stream.
            if bot_cancelado.get(sid):
                break
            if primer_chunk:
                # Al llegar el primer token cortamos el indicador "escribiendo":
                # ya hay contenido visible apareciendo.
                await sio.emit("bot_escribiendo", {"escribiendo": False}, to=sid)
                primer_chunk = False
            respuesta_completa += fragmento
            await sio.emit("bot_chunk", {"fragmento": fragmento}, to=sid)

        await sio.emit("bot_escribiendo", {"escribiendo": False}, to=sid)
        respuesta_completa = respuesta_completa.strip()

        # Persistimos la respuesta final ya completa.
        msg_bot = Mensaje(sala_id=sala.id, remitente_id=None, contenido=respuesta_completa, es_del_bot=True)
        db.add(msg_bot)
        db.commit()
        db.refresh(msg_bot)

        # 'bot_fin' cierra el mensaje en el front (fija el contenido definitivo
        # y su timestamp). Mantiene 'respuesta_bot' por compatibilidad histórica.
        await sio.emit("bot_fin", {
            "contenido"  : respuesta_completa,
            "enviado_en" : msg_bot.enviado_en.isoformat(),
        }, to=sid)
    finally:
        db.close()
