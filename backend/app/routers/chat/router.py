# app/routers/chat/router.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.deps import get_db, get_current_user
from app.models import Mensaje, SalaChat, SalaParticipante, User

router = APIRouter(prefix="/chat", tags=["Chat"])


def _user_dict(u: User) -> dict:
    return {
        "id"           : u.id,
        "username"     : u.username,
        "nombre_real"  : u.nombre_real,
        "esta_en_linea": u.esta_en_linea,
        "ultimo_visto" : u.ultimo_visto.isoformat() if u.ultimo_visto else None,
    }


@router.get("/usuarios")
def listar_usuarios(q: str = Query(""), db: Session = Depends(get_db), yo: User = Depends(get_current_user)):
    query = db.query(User).filter(User.id != yo.id)
    q = q.strip()
    if q:
        like = f"%{q}%"
        query = query.filter(or_(User.username.ilike(like), User.nombre_real.ilike(like)))
    return [_user_dict(u) for u in query.order_by(User.esta_en_linea.desc(), User.username.asc()).limit(50).all()]


@router.get("/conversaciones")
def conversaciones(db: Session = Depends(get_db), yo: User = Depends(get_current_user)):
    salas_ids = [sp.sala_id for sp in db.query(SalaParticipante).filter(SalaParticipante.usuario_id == yo.id).all()]
    resultado = []
    for sala in (db.query(SalaChat).filter(SalaChat.id.in_(salas_ids)).all() if salas_ids else []):
        if sala.sala_key.startswith("0_"):
            continue
        otro_sp = next((p for p in sala.participantes if p.usuario_id != yo.id), None)
        if not otro_sp:
            continue
        otro = db.query(User).filter(User.id == otro_sp.usuario_id).first()
        if not otro:
            continue
        ultimo = db.query(Mensaje).filter(Mensaje.sala_id == sala.id).order_by(Mensaje.enviado_en.desc()).first()
        no_leidos = db.query(func.count(Mensaje.id)).filter(
            Mensaje.sala_id == sala.id, Mensaje.remitente_id == otro.id, Mensaje.leido == False).scalar()
        resultado.append({
            "usuario"       : _user_dict(otro),
            "ultimo_mensaje": ultimo.contenido if ultimo else "",
            "ultimo_es_mio" : (ultimo.remitente_id == yo.id) if ultimo else False,
            "ultimo_en"     : ultimo.enviado_en.isoformat() if ultimo else None,
            "no_leidos"     : no_leidos or 0,
        })
    resultado.sort(key=lambda x: x["ultimo_en"] or "", reverse=True)
    return resultado


@router.get("/historial/{destinatario_id}")
def historial_p2p(destinatario_id: int, db: Session = Depends(get_db), yo: User = Depends(get_current_user)):
    ids = sorted([yo.id, destinatario_id])
    sala = db.query(SalaChat).filter(SalaChat.sala_key == f"{ids[0]}_{ids[1]}").first()
    if not sala:
        return []
    msgs = db.query(Mensaje).filter(Mensaje.sala_id == sala.id).order_by(Mensaje.enviado_en.asc()).all()
    return [{
        "id"           : m.id,
        "remitente_id" : m.remitente_id,
        "contenido"    : m.contenido,
        "es_del_bot"   : m.es_del_bot,
        "es_sistema"   : m.remitente_id is None and not m.es_del_bot,
        "enviado_en"   : m.enviado_en.isoformat(),
        "es_mio"       : m.remitente_id == yo.id,
        "leido"        : m.leido,
    } for m in msgs]


@router.delete("/historial/{destinatario_id}", summary="Borrar historial P2P")
def borrar_historial(destinatario_id: int, db: Session = Depends(get_db), yo: User = Depends(get_current_user)):
    ids  = sorted([yo.id, destinatario_id])
    sala = db.query(SalaChat).filter(SalaChat.sala_key == f"{ids[0]}_{ids[1]}").first()
    if sala:
        db.query(Mensaje).filter(Mensaje.sala_id == sala.id).delete()
        db.commit()
    return {"ok": True}


@router.delete("/historial-bot", summary="Borrar chat con Panini Pal")
def borrar_historial_bot(db: Session = Depends(get_db), yo: User = Depends(get_current_user)):
    sala = db.query(SalaChat).filter(SalaChat.sala_key == f"0_{yo.id}").first()
    if sala:
        db.query(Mensaje).filter(Mensaje.sala_id == sala.id).delete()
        db.commit()
    return {"ok": True}


@router.get("/historial-bot")
def historial_bot(db: Session = Depends(get_db), yo: User = Depends(get_current_user)):
    sala = db.query(SalaChat).filter(SalaChat.sala_key == f"0_{yo.id}").first()
    if not sala:
        return []
    msgs = db.query(Mensaje).filter(Mensaje.sala_id == sala.id).order_by(Mensaje.enviado_en.asc()).all()
    return [{
        "id"        : m.id,
        "contenido" : m.contenido,
        "es_del_bot": m.es_del_bot,
        "es_mio"    : not m.es_del_bot,
        "enviado_en": m.enviado_en.isoformat(),
    } for m in msgs]
