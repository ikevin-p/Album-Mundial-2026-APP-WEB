# app/routers/chat/chatbot.py
# Chatbot temático "Panini Pal" — Asistente del Álbum del Mundial.
# Usa Ollama corriendo localmente (gratis, sin API key).
# Ollama expone su API en http://localhost:11434

import os
import json
import httpx
from typing import AsyncGenerator

# URL base del servidor Ollama (sin path, para reutilizar en varios endpoints).
# Configurable por variable de entorno:
# - Local (sin Docker): localhost
# - En Docker: host.docker.internal (Ollama corre en el host Windows)
OLLAMA_BASE = os.getenv("OLLAMA_BASE", "http://localhost:11434")
OLLAMA_CHAT_URL = f"{OLLAMA_BASE}/api/chat"

# Modelo liviano (3B) priorizando VELOCIDAD en CPU.
# llama3.2:3b responde 2-3x más rápido que 8b con buen español para soporte.
# Se puede sobrescribir por variable de entorno sin tocar código.
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

# Límite de tokens de salida. 512 da respuestas completas sin truncar
# (el valor anterior de 300 cortaba respuestas a media frase).
NUM_PREDICT = int(os.getenv("OLLAMA_NUM_PREDICT", "512"))

SYSTEM_PROMPT = """
Eres "Panini Pal", el asistente virtual del Gestor de Álbum del Mundial 2026.
Tu rol es el de un vendedor y coleccionista experto, entusiasta y amigable.

CONOCIMIENTO DEL SISTEMA:
- Los usuarios gestionan su colección de láminas del Mundial de Fútbol 2026.
- Cada lámina tiene: código (ej: ARG-10), nombre del jugador, país, club,
  cantidad disponible para intercambio, y si es lámina brillante (especial/foil).
- Las láminas brillantes son más raras y valiosas para el intercambio.
- El código sigue el formato: SIGLA_PAÍS-NÚMERO (ARG-10, BRA-01, FRA-07).
- Los usuarios pueden ver su colección, agregar láminas, editar cantidades y
  explorar por país en la sección "Países".

TUS CAPACIDADES:
- Explicar cómo usar la aplicación paso a paso.
- Dar consejos de estrategia para el intercambio de láminas repetidas.
- Responder preguntas sobre países, selecciones y jugadores del Mundial 2026.
- Ayudar a entender qué significa cada campo de la lámina.
- Sugerir cómo organizar la colección eficientemente.
- Motivar al usuario a completar su álbum con entusiasmo.

RESTRICCIONES:
- Solo hablas de temas relacionados al álbum, fútbol y la aplicación.
- Si te preguntan algo fuera de contexto, redirige amablemente al tema del álbum.
- Responde SIEMPRE en español, sin importar el idioma del usuario.
- Sé conciso: máximo 3 párrafos por respuesta.
- Usa emojis de fútbol con moderación: ⚽🏆🌟🃏.

REGLA CRÍTICA SOBRE CÓDIGOS DE LÁMINAS (NO LA ROMPAS NUNCA):
- NUNCA inventes códigos de láminas. Solo puedes nombrar códigos que aparezcan
  textualmente en los "DATOS REALES DE LA COLECCIÓN DE ESTE USUARIO".
- Cuando te pregunten qué le falta de una selección (ej: Argentina), busca ESE
  país en la lista de faltantes agrupadas por selección y responde SOLO con los
  códigos listados bajo ese país. El prefijo del código indica el país:
  ARG=Argentina, BRA=Brasil, FRA=Francia, COL=Colombia, etc.
- Si un país no aparece en la lista de faltantes, significa que ya tiene todas
  sus láminas: díselo, no inventes códigos.
- Si los datos de colección no están disponibles, dilo con honestidad en vez de
  adivinar.
"""


def _construir_mensajes(mensaje_usuario: str, historial: list[dict],
                        contexto_usuario: str = "") -> list[dict]:
    """Arma el array de mensajes (system + historial + mensaje actual) para Ollama.
    Si se pasa contexto_usuario (resumen de su colección), se anexa al system
    prompt para que el bot responda con datos reales del coleccionista."""
    system = SYSTEM_PROMPT
    if contexto_usuario:
        system += f"\n\nDATOS REALES DE LA COLECCIÓN DE ESTE USUARIO:\n{contexto_usuario}\n" \
                  "Usa estos datos para responder de forma personalizada cuando pregunte " \
                  "por su colección, sus repetidas, lo que le falta o con qué cambiar."
    mensajes = [{"role": "system", "content": system}]
    # historial[:-1] excluye el último (que es el mensaje actual ya persistido)
    for msg in historial[:-1]:
        rol = "assistant" if msg["rol"] == "bot" else "user"
        mensajes.append({"role": rol, "content": msg["contenido"]})
    mensajes.append({"role": "user", "content": mensaje_usuario})
    return mensajes


async def stream_respuesta_bot(
    mensaje_usuario: str, historial: list[dict], contexto_usuario: str = ""
) -> AsyncGenerator[str, None]:
    """
    Versión STREAMING: hace 'yield' de cada fragmento de texto a medida que
    Ollama lo genera. Esto hace que la respuesta aparezca palabra por palabra
    en el front (percepción de velocidad), en vez de esperar el bloque completo.
    """
    payload = {
        "model": OLLAMA_MODEL,
        "messages": _construir_mensajes(mensaje_usuario, historial, contexto_usuario),
        "stream": True,  # ← clave: Ollama emite chunks NDJSON
        "options": {
            "temperature": 0.3,  # baja: prioriza precisión sobre creatividad (evita inventar códigos)
            "num_predict": NUM_PREDICT,
        },
    }

    try:
        # timeout: conexión corta, pero lectura sin límite (read=None) porque
        # el stream puede tardar; cada chunk reinicia el reloj de inactividad.
        timeout = httpx.Timeout(10.0, read=None)
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream("POST", OLLAMA_CHAT_URL, json=payload) as r:
                r.raise_for_status()
                # Ollama devuelve una línea JSON por token/fragmento.
                async for linea in r.aiter_lines():
                    if not linea.strip():
                        continue
                    dato = json.loads(linea)
                    fragmento = dato.get("message", {}).get("content", "")
                    if fragmento:
                        yield fragmento
                    if dato.get("done"):
                        break

    except httpx.ConnectError:
        yield ("⚠️ No puedo conectarme con el motor de IA. "
               "Asegúrate de que Ollama esté corriendo: ejecuta 'ollama serve' en una terminal.")
    except Exception as e:
        print(f"[CHATBOT STREAM ERROR] {e}")
        yield "Lo siento, ocurrió un error al procesar tu mensaje. Intenta de nuevo. ⚽"


async def obtener_respuesta_bot(mensaje_usuario: str, historial: list[dict]) -> str:
    """
    Versión NO-streaming (compatibilidad). Reutiliza el generador de streaming
    y concatena todos los fragmentos. Se mantiene para cualquier llamada que
    todavía espere la respuesta completa de una sola vez.
    """
    partes: list[str] = []
    async for fragmento in stream_respuesta_bot(mensaje_usuario, historial):
        partes.append(fragmento)
    return "".join(partes).strip() or "Lo siento, no pude generar una respuesta. ⚽"
