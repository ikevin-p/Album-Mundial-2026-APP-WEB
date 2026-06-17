# app/routers/chat/contexto.py
# Construye un resumen compacto de la colección de un usuario para inyectarlo
# en el prompt del chatbot. Así Panini Pal responde con datos REALES.

from sqlalchemy.orm import Session
from app.models import LaminaMundial, Coleccion


def resumen_coleccion(db: Session, user_id: int) -> str:
    """
    Devuelve un texto con el estado de la colección del usuario:
    total del álbum, cuántas tiene, cuántas le faltan, repetidas, brillantes
    y — clave — las faltantes AGRUPADAS POR PAÍS para que el bot pueda
    responder con precisión preguntas como "¿qué me falta de Argentina?".
    """
    total_album = db.query(LaminaMundial).count()
    if total_album == 0:
        return "El catálogo de láminas aún está vacío."

    entradas = (
        db.query(Coleccion, LaminaMundial)
        .join(LaminaMundial, Coleccion.lamina_id == LaminaMundial.id)
        .filter(Coleccion.user_id == user_id)
        .all()
    )

    tiene      = len(entradas)
    faltan     = total_album - tiene
    repetidas  = [(l.codigo_lamina, c.cantidad - 1) for c, l in entradas if c.cantidad > 1]
    brillantes = [l.codigo_lamina for c, l in entradas if l.es_lamina_brillante]
    progreso   = round(tiene / total_album * 100) if total_album else 0

    # IDs de láminas que el usuario YA tiene.
    ids_tiene = {l.id for c, l in entradas}

    # Catálogo completo (código + país) para calcular faltantes por selección.
    catalogo = db.query(
        LaminaMundial.id,
        LaminaMundial.codigo_lamina,
        LaminaMundial.pais,
    ).all()

    # Agrupar las faltantes por país: { "Argentina": ["ARG-01", "ARG-02"], ... }
    faltantes_por_pais: dict[str, list[str]] = {}
    for lid, cod, pais in catalogo:
        if lid in ids_tiene:
            continue
        clave = (pais or "Sin país").strip()
        faltantes_por_pais.setdefault(clave, []).append(cod)

    # ── Construcción del texto de contexto ──────────────────────────
    lineas = [
        f"- Álbum total: {total_album} láminas. Progreso: {tiene}/{total_album} ({progreso}%).",
        f"- Le faltan {faltan} láminas para completar.",
    ]

    if repetidas:
        muestra = ", ".join(f"{cod} (x{n})" for cod, n in repetidas[:10])
        lineas.append(f"- Repetidas para cambiar ({len(repetidas)}): {muestra}.")
    else:
        lineas.append("- No tiene láminas repetidas para cambiar.")

    if brillantes:
        lineas.append(
            f"- Láminas brillantes que posee ({len(brillantes)}): "
            f"{', '.join(brillantes[:10])}."
        )

    # Bloque CLAVE: faltantes por selección. El bot DEBE usar solo estos datos.
    if faltantes_por_pais:
        lineas.append("- Láminas que le faltan, agrupadas por selección:")
        for pais in sorted(faltantes_por_pais):
            codigos = sorted(faltantes_por_pais[pais])
            lineas.append(f"    · {pais}: {', '.join(codigos)}")
    else:
        lineas.append("- ¡Tiene el álbum completo! No le falta ninguna lámina.")

    return "\n".join(lineas)


def datos_coleccion(db: Session, user_id: int) -> dict:
    """
    Versión estructurada (dict) del estado de la colección, para la bienvenida
    proactiva y las sugerencias dinámicas del frontend.
    """
    total_album = db.query(LaminaMundial).count()
    entradas = (
        db.query(Coleccion, LaminaMundial)
        .join(LaminaMundial, Coleccion.lamina_id == LaminaMundial.id)
        .filter(Coleccion.user_id == user_id)
        .all()
    )
    tiene      = len(entradas)
    faltan     = max(total_album - tiene, 0)
    repetidas  = [l.codigo_lamina for c, l in entradas if c.cantidad > 1]
    brillantes = [l.codigo_lamina for c, l in entradas if l.es_lamina_brillante]
    progreso   = round(tiene / total_album * 100) if total_album else 0

    return {
        "total_album"     : total_album,
        "tiene"           : tiene,
        "faltan"          : faltan,
        "progreso"        : progreso,
        "n_repetidas"     : len(repetidas),
        "n_brillantes"    : len(brillantes),
        # Hasta 3 códigos repetidos: alimentan las sugerencias "¿con qué cambio X?"
        "repetidas_ej"    : repetidas[:3],
    }
