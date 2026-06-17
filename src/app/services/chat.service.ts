// services/chat.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

export interface MensajeChat {
  id?             : number;
  remitente_id?   : number | null;
  destinatario_id?: number;
  contenido       : string;
  es_del_bot      : boolean;
  es_sistema?     : boolean;
  enviado_en      : string;
  es_mio?         : boolean;
  leido?          : boolean;
}

export interface ResumenColeccion {
  total_album : number;
  tiene       : number;
  faltan      : number;
  progreso    : number;
  n_repetidas : number;
  n_brillantes: number;
  repetidas_ej: string[];
}

export interface UsuarioChat {
  id           : number;
  username     : string;
  nombre_real  : string;
  esta_en_linea: boolean;
  ultimo_visto : string | null;
}

export interface Conversacion {
  usuario       : UsuarioChat;
  ultimo_mensaje: string;
  ultimo_es_mio : boolean;
  ultimo_en     : string | null;
  no_leidos     : number;
}

export interface EstadoUsuario {
  user_id      : number;
  en_linea     : boolean;
  ultimo_visto?: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {

  private socket!     : Socket;
  private conectado$  = new BehaviorSubject<boolean>(false);
  private msgsP2P$    = new BehaviorSubject<MensajeChat[]>([]);
  private msgsBot$    = new BehaviorSubject<MensajeChat[]>([]);
  private botTyping$  = new BehaviorSubject<boolean>(false);
  private userTyping$ = new Subject<{ user_id: number; escribiendo: boolean }>();
  private estado$     = new Subject<EstadoUsuario>();
  private propuesta$  = new Subject<any>();
  private respuesta$  = new Subject<any>();
  private leidos$     = new Subject<number>();
  private reaccion$   = new Subject<{ mensaje_id: number; emoji: string; de_usuario: number }>();

  public conexion$            = this.conectado$.asObservable();
  public mensajesP2P$         = this.msgsP2P$.asObservable();
  public mensajesBot$         = this.msgsBot$.asObservable();
  public botEscribiendo$      = this.botTyping$.asObservable();
  public usuarioEscribiendo$  = this.userTyping$.asObservable();
  public estadoUsuarios$      = this.estado$.asObservable();
  public nuevaPropuesta$      = this.propuesta$.asObservable();
  public propuestaRespondida$ = this.respuesta$.asObservable();
  public mensajesLeidos$      = this.leidos$.asObservable();
  public reacciones$          = this.reaccion$.asObservable();

  constructor(private http: HttpClient) {}

  conectar(token: string): void {
    if (this.socket?.connected) return;
    this.socket = io(environment.socketUrl, {
      auth: { token }, transports: ['websocket'],
      reconnection: true, reconnectionDelay: 2000,
    });
    this.socket.on('connect',    () => this.conectado$.next(true));
    this.socket.on('disconnect', () => this.conectado$.next(false));
    this.socket.on('nuevo_mensaje',   (msg: MensajeChat) => this.msgsP2P$.next([...this.msgsP2P$.value, { ...msg, es_mio: false }]));
    this.socket.on('mensaje_enviado', (msg: MensajeChat) => this.msgsP2P$.next([...this.msgsP2P$.value, { ...msg, es_mio: !msg.es_sistema }]));
    // ── Streaming del bot ──────────────────────────────────────────────
    // bot_chunk: cada fragmento de texto que el modelo va generando.
    this.socket.on('bot_chunk', (d: any) => this.agregarChunkBot(d?.fragmento ?? ''));
    // bot_fin: respuesta completa + timestamp definitivo; cierra el mensaje.
    this.socket.on('bot_fin', (d: any) => this.finalizarMensajeBot(d?.contenido ?? '', d?.enviado_en));
    // respuesta_bot: compatibilidad con el flujo antiguo (no-streaming).
    this.socket.on('respuesta_bot',   (msg: any) => this.finalizarMensajeBot(msg.contenido, msg.enviado_en));
    this.socket.on('bot_escribiendo',    (d: any) => this.botTyping$.next(!!d?.escribiendo));
    this.socket.on('usuario_estado',      (d: EstadoUsuario) => this.estado$.next(d));
    this.socket.on('usuario_escribiendo', (d: any) => this.userTyping$.next(d));
    this.socket.on('mensajes_leidos',     (d: any) => this.leidos$.next(d?.lector_id));
    this.socket.on('reaccion',            (d: any) => this.reaccion$.next(d));
    this.socket.on('nueva_propuesta',      (d: any) => this.propuesta$.next(d));
    this.socket.on('propuesta_respondida', (d: any) => this.respuesta$.next(d));
    this.socket.on('connect_error', (err: Error) => console.error('[SOCKET] error:', err.message));
  }

  desconectar(): void { this.socket?.disconnect(); }

  enviarMensaje(destinatarioId: number, contenido: string): void {
    this.socket?.emit('enviar_mensaje', { destinatario_id: destinatarioId, contenido });
  }

  // Reacciona a un mensaje con un emoji (tiempo real, no se persiste).
  reaccionar(destinatarioId: number, mensajeId: number, emoji: string): void {
    this.socket?.emit('reaccionar', { destinatario_id: destinatarioId, mensaje_id: mensajeId, emoji });
  }

  enviarAlBot(contenido: string): void {
    this.msgsBot$.next([...this.msgsBot$.value, { contenido, es_del_bot: false, enviado_en: new Date().toISOString(), es_mio: true }]);
    this.botStreaming = false;  // se abrirá al llegar el primer chunk
    this.botGenerando = true;   // bloquea reenvíos hasta que termine
    this.socket?.emit('mensaje_al_bot', { contenido });
  }

  // Reenvía una pregunta al bot SIN volver a pintar la burbuja del usuario.
  // Se usa para "regenerar": la pregunta ya está en pantalla.
  regenerarRespuesta(contenido: string): void {
    this.botStreaming = false;
    this.botGenerando = true;
    this.socket?.emit('mensaje_al_bot', { contenido });
  }

  // Pide al backend cortar la generación y cierra el mensaje en curso.
  detenerBot(): void {
    this.socket?.emit('detener_bot', {});
    this.botGenerando = false;
    this.botStreaming = false;
    this.botTyping$.next(false);
  }

  // ── Construcción progresiva del mensaje del bot (streaming) ─────────────
  // Indica si hay un mensaje del bot "abierto" recibiendo fragmentos.
  private botStreaming = false;
  // Público: true desde que se envía hasta que el bot termina (para la UI).
  public botGenerando = false;

  /** Agrega un fragmento al mensaje del bot en curso (lo crea si es el primero). */
  private agregarChunkBot(fragmento: string): void {
    if (!fragmento) return;
    const lista = [...this.msgsBot$.value];

    if (!this.botStreaming) {
      // Primer fragmento: creamos la burbuja del bot vacía y empezamos a llenarla.
      lista.push({ contenido: fragmento, es_del_bot: true, es_mio: false, enviado_en: new Date().toISOString() });
      this.botStreaming = true;
    } else {
      // Fragmentos siguientes: concatenamos al último mensaje (el del bot).
      const ultimo = lista[lista.length - 1];
      lista[lista.length - 1] = { ...ultimo, contenido: ultimo.contenido + fragmento };
    }
    this.msgsBot$.next(lista);
  }

  /** Cierra el mensaje del bot: fija contenido y timestamp definitivos. */
  private finalizarMensajeBot(contenido: string, enviadoEn?: string): void {
    const lista = [...this.msgsBot$.value];

    if (this.botStreaming) {
      // Reemplazamos el texto acumulado por el definitivo (evita desfases).
      const ultimo = lista[lista.length - 1];
      lista[lista.length - 1] = { ...ultimo, contenido, enviado_en: enviadoEn ?? ultimo.enviado_en };
    } else {
      // Llegó la respuesta sin haber recibido chunks (modo no-streaming).
      lista.push({ contenido, es_del_bot: true, es_mio: false, enviado_en: enviadoEn ?? new Date().toISOString() });
    }
    this.msgsBot$.next(lista);
    this.botStreaming = false;
    this.botGenerando = false;
  }

  // Quita la última respuesta del bot (para "regenerar": se borra y se vuelve a pedir).
  quitarUltimaRespuestaBot(): void {
    const lista = [...this.msgsBot$.value];
    if (lista.length && lista[lista.length - 1].es_del_bot) {
      lista.pop();
      this.msgsBot$.next(lista);
    }
  }

  notificarEscribiendo(destinatarioId: number, escribiendo: boolean): void {
    this.socket?.emit('escribiendo', { destinatario_id: destinatarioId, escribiendo });
  }

  marcarLeidos(remitenteId: number): void {
    this.socket?.emit('marcar_leidos', { remitente_id: remitenteId });
  }

  limpiarMensajesP2P(): void { this.msgsP2P$.next([]); }
  limpiarMensajesBot(): void { this.msgsBot$.next([]); }

  cargarHistorialP2P(msgs: MensajeChat[]): void { this.msgsP2P$.next(msgs); }
  cargarHistorialBot(msgs: MensajeChat[]): void { this.msgsBot$.next(msgs); }

  getUsuarios(q = ''): Observable<UsuarioChat[]> {
    const param = q ? `?q=${encodeURIComponent(q)}` : '';
    return this.http.get<UsuarioChat[]>(`${environment.apiUrl}/chat/usuarios${param}`);
  }

  getConversaciones(): Observable<Conversacion[]> {
    return this.http.get<Conversacion[]>(`${environment.apiUrl}/chat/conversaciones`);
  }

  getHistorial(destinatarioId: number): Observable<MensajeChat[]> {
    return this.http.get<MensajeChat[]>(`${environment.apiUrl}/chat/historial/${destinatarioId}`);
  }

  getHistorialBot(): Observable<MensajeChat[]> {
    return this.http.get<MensajeChat[]>(`${environment.apiUrl}/chat/historial-bot`);
  }

  // Resumen de la colección para la bienvenida y las sugerencias dinámicas.
  getResumenBot(): Observable<ResumenColeccion> {
    return this.http.get<ResumenColeccion>(`${environment.apiUrl}/chat/resumen-bot`);
  }

  borrarHistorial(destinatarioId: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/chat/historial/${destinatarioId}`);
  }

  borrarHistorialBot(): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/chat/historial-bot`);
  }
}
