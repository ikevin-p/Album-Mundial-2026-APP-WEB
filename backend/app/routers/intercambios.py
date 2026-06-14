# app/routers/intercambios.py
# Sistema completo de intercambio de láminas entre coleccionistas.
# Incluye: matching automático de oportunidades, propuestas, aceptar/rechazar
# con transferencia atómica, historial y notificaciones en tiempo real via Socket.io.

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel

from app.deps import get_db, get_current_user
from app.models import User, LaminaMundial, Coleccion, Intercambio, SalaChat, SalaParticipante, Mensaje
from app.routers.chat.socket_manager import sio

router = APIRouter(prefix="/intercambios", tags=["Intercambios"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class ProponerIn(BaseModel):
    receptor_id        : int
    lamina_ofrecida_id : int
    lamina_pedida_id   : int
    mensaje            : str = ""


class ResponderIn(BaseModel):
    aceptar: bool


# ── Helpers ────────────────────────────────────────────────────────────────────

def _lamina_dict(l: LaminaMundial, cantidad: int = 0) -> dict:
    return {
        "id"                 : l.id,
        "codigo_lamina"      : l.codigo_lamina,
        "nombre_jugador"     : l.nombre_jugador,
        "pais"               : l.pais,
        "es_lamina_brillante": l.es_lamina_brillante,
        "cantidad"           : cantidad,
    }


def _intercambio_dict(i: Intercambio, yo_id: int) -> dict:
    return {
        "id"             : i.id,
        "estado"         : i.estado,
        "mensaje"        : i.mensaje,
        "creado_en"      : i.creado_en.isoformat(),
        "respondido_en"  : i.respondido_en.isoformat() if i.respondido_en else None,
        "soy_proponente" : i.proponente_id == yo_id,
        "proponente"     : {"id": i.proponente.id, "username": i.proponente.username, "nombre_real": i.proponente.nombre_real},
        "receptor"       : {"id": i.receptor.id,   "username": i.receptor.username,   "nombre_real": i.receptor.nombre_real},
        "lamina_ofrecida": _lamina_dict(i.lamina_ofrecida),
        "lamina_pedida"  : _lamina_dict(i.lamina_pedida),
    }


def _get_or_create_sala(db: Session, uid1: int, uid2: int) -> SalaChat:
    a, b = sorted([uid1, uid2])
    key  = f"{a}_{b}"
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


def _mensaje_sistema(db: Session, uid1: int, uid2: int, texto: str) -> dict:
    """Inserta un mensaje de sistema en la sala P2P (queda en el historial del chat)."""
    sala = _get_or_create_sala(db, uid1, uid2)
    msg  = Mensaje(sala_id=sala.id, remitente_id=None, contenido=texto,
                   es_del_bot=False, enviado_en=datetime.utcnow())
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {
        "id"           : msg.id,
        "sala_id"      : sala.id,
        "remitente_id" : None,
        "contenido"    : texto,
        "enviado_en"   : msg.enviado_en.isoformat(),
        "es_del_bot"   : False,
        "es_sistema"   : True,
    }


# ── GET /intercambios/oportunidades/{usuario_id} ──────────────────────────────
@router.get("/oportunidades/{usuario_id}", summary="Matching automático de intercambio")
def oportunidades(
    usuario_id : int,
    db : Session = Depends(get_db),
    yo : User    = Depends(get_current_user),
):
    """
    Cruza ambas colecciones y devuelve:
    - yo_ofrezco : mis láminas con repetidas (cantidad>=2) que al otro le FALTAN
    - el_ofrece  : sus láminas con repetidas (cantidad>=2) que a mí me FALTAN
    """
    otro = db.query(User).filter(User.id == usuario_id).first()
    if not otro:
        raise HTTPException(404, "Usuario no encontrado")

    mias  = {c.lamina_id: c.cantidad for c in db.query(Coleccion).filter(Coleccion.user_id == yo.id).all()}
    suyas = {c.lamina_id: c.cantidad for c in db.query(Coleccion).filter(Coleccion.user_id == otro.id).all()}

    # IDs candidatos
    yo_repetidas  = {lid for lid, c in mias.items()  if c >= 2}
    el_repetidas  = {lid for lid, c in suyas.items() if c >= 2}
    yo_ofrezco_ids = {lid for lid in yo_repetidas if suyas.get(lid, 0) == 0}
    el_ofrece_ids  = {lid for lid in el_repetidas if mias.get(lid, 0) == 0}

    todas_ids = yo_ofrezco_ids | el_ofrece_ids
    laminas   = {l.id: l for l in db.query(LaminaMundial).filter(LaminaMundial.id.in_(todas_ids)).all()} if todas_ids else {}

    return {
        "usuario"   : {"id": otro.id, "username": otro.username, "nombre_real": otro.nombre_real},
        "yo_ofrezco": sorted([_lamina_dict(laminas[lid], mias[lid])  for lid in yo_ofrezco_ids if lid in laminas], key=lambda x: x["codigo_lamina"]),
        "el_ofrece" : sorted([_lamina_dict(laminas[lid], suyas[lid]) for lid in el_ofrece_ids  if lid in laminas], key=lambda x: x["codigo_lamina"]),
    }


# ── POST /intercambios/proponer ────────────────────────────────────────────────
@router.post("/proponer", status_code=status.HTTP_201_CREATED, summary="Proponer intercambio")
async def proponer(
    body : ProponerIn,
    db : Session = Depends(get_db),
    yo : User    = Depends(get_current_user),
):
    """Crea una propuesta pendiente. Valida repetidas de ambos lados y duplicados."""
    if body.receptor_id == yo.id:
        raise HTTPException(400, "No puedes intercambiar contigo mismo")

    receptor = db.query(User).filter(User.id == body.receptor_id).first()
    if not receptor:
        raise HTTPException(404, "Usuario no encontrado")

    ofrecida = db.query(LaminaMundial).filter(LaminaMundial.id == body.lamina_ofrecida_id).first()
    pedida   = db.query(LaminaMundial).filter(LaminaMundial.id == body.lamina_pedida_id).first()
    if not ofrecida or not pedida:
        raise HTTPException(404, "Lámina no encontrada")

    # Validar que YO tengo repetida la que ofrezco
    mi_entrada = db.query(Coleccion).filter(
        Coleccion.user_id == yo.id, Coleccion.lamina_id == ofrecida.id).first()
    if not mi_entrada or mi_entrada.cantidad < 2:
        raise HTTPException(409, "No tienes repetidas de la lámina que ofreces")

    # Validar que ÉL tiene repetida la que pido
    su_entrada = db.query(Coleccion).filter(
        Coleccion.user_id == receptor.id, Coleccion.lamina_id == pedida.id).first()
    if not su_entrada or su_entrada.cantidad < 2:
        raise HTTPException(409, "El otro coleccionista ya no tiene repetida esa lámina")

    # Evitar propuesta idéntica duplicada pendiente
    dup = db.query(Intercambio).filter(
        Intercambio.proponente_id      == yo.id,
        Intercambio.receptor_id        == receptor.id,
        Intercambio.lamina_ofrecida_id == ofrecida.id,
        Intercambio.lamina_pedida_id   == pedida.id,
        Intercambio.estado             == "pendiente",
    ).first()
    if dup:
        raise HTTPException(409, "Ya enviaste esta misma propuesta y está pendiente")

    inter = Intercambio(
        proponente_id      = yo.id,
        receptor_id        = receptor.id,
        lamina_ofrecida_id = ofrecida.id,
        lamina_pedida_id   = pedida.id,
        mensaje            = body.mensaje.strip()[:300],
    )
    db.add(inter)
    db.commit()
    db.refresh(inter)

    payload = _intercambio_dict(inter, yo.id)

    # Mensaje de sistema en el chat + notificación en vivo al receptor
    msg = _mensaje_sistema(db, yo.id, receptor.id,
        f"🔄 {yo.nombre_real or yo.username} propuso un intercambio: "
        f"ofrece {ofrecida.codigo_lamina} ({ofrecida.nombre_jugador}) "
        f"por {pedida.codigo_lamina} ({pedida.nombre_jugador})")

    await sio.emit("nueva_propuesta", payload, room=f"user_{receptor.id}")
    await sio.emit("nuevo_mensaje",   {**msg, "destinatario_id": receptor.id, "remitente_id": yo.id}, room=f"user_{receptor.id}")
    await sio.emit("mensaje_enviado", {**msg, "destinatario_id": receptor.id}, room=f"user_{yo.id}")

    return payload


# ── POST /intercambios/{id}/responder ──────────────────────────────────────────
@router.post("/{intercambio_id}/responder", summary="Aceptar o rechazar intercambio")
async def responder(
    intercambio_id : int,
    body : ResponderIn,
    db : Session = Depends(get_db),
    yo : User    = Depends(get_current_user),
):
    """
    Solo el receptor puede responder. Al ACEPTAR se ejecuta la transferencia atómica:
      proponente: ofrecida -1, pedida +1
      receptor  : pedida  -1, ofrecida +1
    Si alguna repetida ya se gastó, el intercambio se cancela automáticamente (409).
    """
    inter = db.query(Intercambio).filter(Intercambio.id == intercambio_id).first()
    if not inter:
        raise HTTPException(404, "Intercambio no encontrado")
    if inter.receptor_id != yo.id:
        raise HTTPException(403, "Solo el receptor puede responder esta propuesta")
    if inter.estado != "pendiente":
        raise HTTPException(409, f"La propuesta ya fue {inter.estado}")

    inter.respondido_en = datetime.utcnow()

    if not body.aceptar:
        inter.estado = "rechazado"
        db.commit()
        payload = _intercambio_dict(inter, yo.id)
        await sio.emit("propuesta_respondida", payload, room=f"user_{inter.proponente_id}")
        return payload

    # ── ACEPTAR: validar y transferir atómicamente ─────────────────────────────
    e_prop_ofr = db.query(Coleccion).filter(
        Coleccion.user_id == inter.proponente_id, Coleccion.lamina_id == inter.lamina_ofrecida_id).first()
    e_rec_ped  = db.query(Coleccion).filter(
        Coleccion.user_id == inter.receptor_id,   Coleccion.lamina_id == inter.lamina_pedida_id).first()

    if not e_prop_ofr or e_prop_ofr.cantidad < 2 or not e_rec_ped or e_rec_ped.cantidad < 2:
        inter.estado = "cancelado"
        db.commit()
        raise HTTPException(409, "Las repetidas ya no están disponibles. Propuesta cancelada.")

    def _sumar(user_id: int, lamina_id: int):
        e = db.query(Coleccion).filter(
            Coleccion.user_id == user_id, Coleccion.lamina_id == lamina_id).first()
        if e:
            e.cantidad += 1
        else:
            db.add(Coleccion(user_id=user_id, lamina_id=lamina_id, cantidad=1))

    e_prop_ofr.cantidad -= 1          # proponente entrega su repetida
    e_rec_ped.cantidad  -= 1          # receptor entrega su repetida
    _sumar(inter.proponente_id, inter.lamina_pedida_id)    # proponente recibe
    _sumar(inter.receptor_id,   inter.lamina_ofrecida_id)  # receptor recibe

    inter.estado = "aceptado"
    db.commit()
    db.refresh(inter)

    payload = _intercambio_dict(inter, yo.id)

    msg = _mensaje_sistema(db, inter.proponente_id, inter.receptor_id,
        f"✅ ¡Intercambio realizado! {inter.lamina_ofrecida.codigo_lamina} "
        f"({inter.lamina_ofrecida.nombre_jugador}) ⇄ {inter.lamina_pedida.codigo_lamina} "
        f"({inter.lamina_pedida.nombre_jugador})")

    await sio.emit("propuesta_respondida", payload, room=f"user_{inter.proponente_id}")
    await sio.emit("nuevo_mensaje", {**msg, "destinatario_id": inter.proponente_id, "remitente_id": yo.id}, room=f"user_{inter.proponente_id}")
    await sio.emit("mensaje_enviado", {**msg, "destinatario_id": inter.proponente_id}, room=f"user_{yo.id}")

    return payload


# ── GET /intercambios/ ─────────────────────────────────────────────────────────
@router.get("/", summary="Mis intercambios (enviados, recibidos, historial)")
def mis_intercambios(
    db : Session = Depends(get_db),
    yo : User    = Depends(get_current_user),
):
    items = (
        db.query(Intercambio)
        .filter((Intercambio.proponente_id == yo.id) | (Intercambio.receptor_id == yo.id))
        .order_by(Intercambio.creado_en.desc())
        .limit(100)
        .all()
    )
    return [_intercambio_dict(i, yo.id) for i in items]


# ── GET /intercambios/pendientes/count ─────────────────────────────────────────
@router.get("/pendientes/count", summary="Contador de propuestas recibidas pendientes")
def contador_pendientes(
    db : Session = Depends(get_db),
    yo : User    = Depends(get_current_user),
):
    n = db.query(Intercambio).filter(
        Intercambio.receptor_id == yo.id,
        Intercambio.estado == "pendiente",
    ).count()
    return {"pendientes": n}


# ── GET /intercambios/con/{usuario_id} ─────────────────────────────────────────
@router.get("/con/{usuario_id}", summary="Intercambios entre el usuario actual y otro")
def intercambios_con(
    usuario_id : int,
    db : Session = Depends(get_db),
    yo : User    = Depends(get_current_user),
):
    items = (
        db.query(Intercambio)
        .filter(
            ((Intercambio.proponente_id == yo.id) & (Intercambio.receptor_id == usuario_id)) |
            ((Intercambio.proponente_id == usuario_id) & (Intercambio.receptor_id == yo.id))
        )
        .order_by(Intercambio.creado_en.desc())
        .limit(50)
        .all()
    )
    return [_intercambio_dict(i, yo.id) for i in items]
