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

  public conexion$            = this.conectado$.asObservable();
  public mensajesP2P$         = this.msgsP2P$.asObservable();
  public mensajesBot$         = this.msgsBot$.asObservable();
  public botEscribiendo$      = this.botTyping$.asObservable();
  public usuarioEscribiendo$  = this.userTyping$.asObservable();
  public estadoUsuarios$      = this.estado$.asObservable();
  public nuevaPropuesta$      = this.propuesta$.asObservable();
  public propuestaRespondida$ = this.respuesta$.asObservable();
  public mensajesLeidos$      = this.leidos$.asObservable();

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
    this.socket.on('respuesta_bot',   (msg: any) => this.msgsBot$.next([...this.msgsBot$.value, { contenido: msg.contenido, enviado_en: msg.enviado_en, es_del_bot: true, es_mio: false }]));
    this.socket.on('bot_escribiendo',    (d: any) => this.botTyping$.next(!!d?.escribiendo));
    this.socket.on('usuario_estado',      (d: EstadoUsuario) => this.estado$.next(d));
    this.socket.on('usuario_escribiendo', (d: any) => this.userTyping$.next(d));
    this.socket.on('mensajes_leidos',     (d: any) => this.leidos$.next(d?.lector_id));
    this.socket.on('nueva_propuesta',      (d: any) => this.propuesta$.next(d));
    this.socket.on('propuesta_respondida', (d: any) => this.respuesta$.next(d));
    this.socket.on('connect_error', (err: Error) => console.error('[SOCKET] error:', err.message));
  }

  desconectar(): void { this.socket?.disconnect(); }

  enviarMensaje(destinatarioId: number, contenido: string): void {
    this.socket?.emit('enviar_mensaje', { destinatario_id: destinatarioId, contenido });
  }

  enviarAlBot(contenido: string): void {
    this.msgsBot$.next([...this.msgsBot$.value, { contenido, es_del_bot: false, enviado_en: new Date().toISOString(), es_mio: true }]);
    this.socket?.emit('mensaje_al_bot', { contenido });
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

  borrarHistorial(destinatarioId: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/chat/historial/${destinatarioId}`);
  }

  borrarHistorialBot(): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/chat/historial-bot`);
  }
}
