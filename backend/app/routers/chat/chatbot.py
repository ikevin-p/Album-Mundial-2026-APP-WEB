# app/routers/chat/chatbot.py
# Chatbot temático "Panini Pal" — Asistente del Álbum del Mundial.
# Usa Ollama corriendo localmente (gratis, sin API key).
# Ollama expone una API compatible con OpenAI en http://localhost:11434

import os
import httpx

# URL del servidor Ollama. Configurable por variable de entorno:
# - Local (sin Docker): localhost
# - En Docker: host.docker.internal (Ollama corre en el host Windows)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat")

# Con 16-18 GB de RAM, llama3.1:8b es la mejor opción:
# mejor comprensión del español, respuestas más naturales y coherentes.
OLLAMA_MODEL = "llama3.1:8b"

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
"""


async def obtener_respuesta_bot(mensaje_usuario: str, historial: list[dict]) -> str:
    """
    Llama a Ollama con el historial de conversación y retorna la respuesta como string.
    Ollama corre localmente en el puerto 11434, sin costo ni conexión a internet.
    """
    mensajes = [{"role": "system", "content": SYSTEM_PROMPT}]

    for msg in historial[:-1]:
        rol = "assistant" if msg["rol"] == "bot" else "user"
        mensajes.append({"role": rol, "content": msg["contenido"]})

    mensajes.append({"role": "user", "content": mensaje_usuario})

    payload = {
        "model"   : OLLAMA_MODEL,
        "messages": mensajes,
        "stream"  : False,
        "options" : {
            "temperature": 0.7,
            "num_predict": 300,
        }
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(OLLAMA_URL, json=payload)
            r.raise_for_status()
            return r.json()["message"]["content"]

    except httpx.ConnectError:
        return ("⚠️ No puedo conectarme con el motor de IA. "
                "Asegúrate de que Ollama esté corriendo: ejecuta 'ollama serve' en una terminal.")
    except Exception as e:
        print(f"[CHATBOT ERROR] {e}")
        return "Lo siento, ocurrió un error al procesar tu mensaje. Intenta de nuevo. ⚽"
