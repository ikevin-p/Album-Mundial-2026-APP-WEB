// services/presencia.service.ts
// Mantiene el WebSocket conectado de forma GLOBAL (no solo en el chat),
// para que el usuario aparezca "en línea" en toda la app y reciba
// notificaciones en vivo (toast en web + notificación local en Android)
// estando en cualquier pantalla, mientras la app siga abierta.

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToastController } from '@ionic/angular/standalone';
import { ChatService, MensajeChat } from './chat.service';
import { AuthService } from './auth.service';
import { NotificacionService } from './notificacion.service';

@Injectable({ providedIn: 'root' })
export class PresenciaService {

  private subs: Subscription[] = [];
  private iniciado = false;
  // Cache id→nombre para mostrar el remitente en la notificación
  private nombres = new Map<number, string>();

  constructor(
    private chatSvc : ChatService,
    private auth    : AuthService,
    private notif   : NotificacionService,
    private toast   : ToastController,
    private router  : Router,
  ) {
    // Al cerrar sesión, AuthService dispara esto para cortar el WebSocket.
    this.auth.registrarOnLogout(() => this.detener());
  }

  /**
   * Arranca la conexión global. Idempotente: si ya está conectado, no hace nada.
   * Se llama al iniciar la app (si hay sesión) y justo después del login.
   */
  iniciar(): void {
    const token = this.auth.getToken();
    if (!token || this.iniciado) return;
    this.iniciado = true;

    // Conectar el socket globalmente
    this.chatSvc.conectar(token);

    // Precargar nombres de usuarios para las notificaciones
    this.chatSvc.getUsuarios().subscribe(us => {
      us.forEach(u => this.nombres.set(u.id, u.nombre_real || u.username));
    });

    // ── Mensajes P2P entrantes ──────────────────────────────────
    this.subs.push(
      this.chatSvc.mensajesP2P$.subscribe(msgs => {
        if (!msgs.length) return;
        const ultimo = msgs[msgs.length - 1];
        // Solo notificar mensajes ajenos (no los míos) y recién llegados
        if (ultimo.es_mio || ultimo.es_del_bot) return;
        this.manejarMensajeEntrante(ultimo);
      })
    );

    // ── Propuestas de intercambio entrantes ─────────────────────
    this.subs.push(
      this.chatSvc.nuevaPropuesta$.subscribe(p => this.manejarIntercambio(p))
    );

    // ── Intercambio aceptado/rechazado ──────────────────────────
    this.subs.push(
      this.chatSvc.propuestaRespondida$.subscribe(r => this.manejarRespuestaIntercambio(r))
    );
  }

  /** Reinicia la conexión tras un login nuevo (token distinto). */
  reiniciar(): void {
    this.detener();
    this.iniciar();
  }

  /** Corta todo (al cerrar sesión). */
  detener(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
    this.chatSvc.desconectar();
    this.iniciado = false;
  }

  // ── Handlers ─────────────────────────────────────────────────

  private esperaId = new Set<number>();

  private async manejarMensajeEntrante(msg: MensajeChat): Promise<void> {
    const rid = msg.remitente_id ?? 0;
    // Evitar notificar si justo estoy en la conversación con esa persona
    if (this.router.url.includes(`/chat/${rid}`) || this.router.url.includes(`/chat-p2p/${rid}`)) return;

    const nombre = this.nombres.get(rid) || 'Coleccionista';
    // Notificación nativa (aparece en la barra del celular)
    await this.notif.notificarMensaje(nombre, msg.contenido);
    // Toast in-app (web + android cuando la app está en primer plano)
    await this.mostrarToast(`💬 ${nombre}: ${this.recortar(msg.contenido)}`, 'primary', () => {
      this.router.navigate(['/chat', rid, nombre]);
    });
  }

  private async manejarIntercambio(p: any): Promise<void> {
    const nombre = p?.de_nombre || p?.remitente || 'Un coleccionista';
    const ofrece = p?.ofrece || p?.lamina_ofrecida || 'una lámina';
    const pide   = p?.pide   || p?.lamina_pedida   || 'una tuya';
    await this.notif.notificarIntercambio(nombre, ofrece, pide);
    await this.mostrarToast(`🔄 ${nombre} te propone un intercambio`, 'warning', () => {
      this.router.navigate(['/intercambios']);
    });
  }

  private async manejarRespuestaIntercambio(r: any): Promise<void> {
    const aceptado = r?.aceptado ?? r?.estado === 'aceptado';
    const nombre   = r?.de_nombre || r?.contraparte || 'El coleccionista';
    if (aceptado) {
      const lamina = r?.lamina || 'la lámina';
      await this.notif.notificarIntercambioAceptado(nombre, lamina);
      await this.mostrarToast(`✅ ${nombre} aceptó tu intercambio`, 'success', () => {
        this.router.navigate(['/intercambios']);
      });
    } else {
      await this.mostrarToast(`❌ ${nombre} rechazó tu intercambio`, 'medium');
    }
  }

  // ── Helpers ──────────────────────────────────────────────────

  private recortar(t: string): string {
    return t.length > 40 ? t.substring(0, 40) + '…' : t;
  }

  private async mostrarToast(
    message: string, color: string, onTap?: () => void,
  ): Promise<void> {
    const t = await this.toast.create({
      message, color, duration: 4000, position: 'top',
      buttons: onTap ? [{ text: 'Ver', handler: onTap }] : undefined,
    });
    t.present();
  }
}
