// pages/chat-p2p/chat-p2p.page.ts
// Chat en tiempo real entre coleccionistas con sistema de intercambio integrado:
// matching automático, propuestas, aceptar/rechazar y mensajes de sistema.

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonContent, IonFooter, IonIcon,
  IonButtons, IonButton, IonSpinner, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, sendOutline, swapHorizontalOutline, closeOutline,
  checkmarkOutline, footballOutline, sparklesOutline, timeOutline,
  checkmarkDoneOutline, alertCircleOutline, repeatOutline, trashOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { ChatService, MensajeChat } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { NotificacionService } from '../../services/notificacion.service';
import {
  IntercambioService, Intercambio, Oportunidades, LaminaIntercambio,
} from '../../services/intercambio.service';

@Component({
  selector   : 'app-chat-p2p',
  templateUrl: './chat-p2p.page.html',
  styleUrls  : ['./chat-p2p.page.scss'],
  standalone : true,
  imports    : [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonContent,
    IonFooter, IonIcon, IonButtons, IonButton, IonSpinner,
  ],
})
export class ChatP2pPage implements OnInit, OnDestroy {

  @ViewChild(IonContent) content!: IonContent;

  // Conversación
  otroId      = 0;
  otroNombre  = '';
  mensajes    : MensajeChat[] = [];
  texto       = '';
  conectado   = false;
  otroOnline  = false;
  otroTyping  = false;
  miId        = 0;

  // Intercambio
  pendienteRecibida : Intercambio | null = null;   // propuesta que ÉL me envió
  pendienteEnviada  : Intercambio | null = null;   // propuesta que YO le envié
  modalAbierto      = false;
  cargandoOp        = false;
  oportunidades     : Oportunidades | null = null;
  selOfrezco        : LaminaIntercambio | null = null;
  selRecibo         : LaminaIntercambio | null = null;
  msgPropuesta      = '';
  enviandoPropuesta = false;

  private subs: Subscription[] = [];
  private typingTimer: any = null;

  constructor(
    private route   : ActivatedRoute,
    private router  : Router,
    private chatSvc : ChatService,
    private auth    : AuthService,
    private interSvc: IntercambioService,
    private toast   : ToastController,
    private notifSvc: NotificacionService,
  ) {
    addIcons({
      arrowBackOutline, sendOutline, swapHorizontalOutline, closeOutline,
      checkmarkOutline, footballOutline, sparklesOutline, timeOutline,
      checkmarkDoneOutline, alertCircleOutline, repeatOutline, trashOutline,
    });
  }

  ngOnInit(): void {
    this.otroId     = +this.route.snapshot.paramMap.get('id')!;
    this.otroNombre =  this.route.snapshot.paramMap.get('nombre') || 'Coleccionista';
    this.miId       = this.auth.getUserId();

    const token = this.auth.getToken();
    if (token) this.chatSvc.conectar(token);

    // Historial REST
    this.chatSvc.getHistorial(this.otroId).subscribe(msgs => {
      this.chatSvc.cargarHistorialP2P(msgs);
      this.chatSvc.marcarLeidos(this.otroId);
    });

    // Stream de mensajes — FILTRADO por esta conversación
    this.subs.push(this.chatSvc.mensajesP2P$.subscribe(msgs => {
      this.mensajes = msgs.filter(m =>
        m.es_sistema
          ? (m.remitente_id === this.otroId || m.destinatario_id === this.otroId || m.destinatario_id === undefined)
          : (m.es_mio
              ? (m.destinatario_id === undefined || m.destinatario_id === this.otroId)
              : (m.remitente_id === this.otroId))
      );
      setTimeout(() => this.content?.scrollToBottom(180), 60);
      const ultimo = msgs[msgs.length - 1];
      if (ultimo && !ultimo.es_mio && !ultimo.es_sistema && ultimo.remitente_id === this.otroId) {
        this.chatSvc.marcarLeidos(this.otroId);
        // Notificación push si la app está en segundo plano
        this.notifSvc.notificarMensaje(this.otroNombre, ultimo.contenido);
      }
    }));

    this.subs.push(this.chatSvc.conexion$.subscribe(v => this.conectado = v));

    // Presencia del otro
    this.subs.push(this.chatSvc.estadoUsuarios$.subscribe(e => {
      if (e.user_id === this.otroId) this.otroOnline = e.en_linea;
    }));

    // Indicador escribiendo
    this.subs.push(this.chatSvc.usuarioEscribiendo$.subscribe(e => {
      if (e.user_id === this.otroId) {
        this.otroTyping = e.escribiendo;
        if (e.escribiendo) setTimeout(() => this.otroTyping = false, 4000);
      }
    }));

    // Intercambios en vivo
    this.subs.push(this.chatSvc.nuevaPropuesta$.subscribe((p: Intercambio) => {
      if (p.proponente.id === this.otroId) {
        this.pendienteRecibida = p;
        this.notifSvc.notificarIntercambio(
          p.proponente.nombre_real || p.proponente.username,
          p.lamina_ofrecida.codigo_lamina,
          p.lamina_pedida.codigo_lamina,
        );
      }
    }));
    this.subs.push(this.chatSvc.propuestaRespondida$.subscribe((p: Intercambio) => {
      if (p.receptor.id === this.otroId || p.proponente.id === this.otroId) {
        this.cargarIntercambios();
        if (p.estado === 'aceptado' && p.receptor.id === this.otroId) {
          this.notifSvc.notificarIntercambioAceptado(
            p.receptor.nombre_real || p.receptor.username,
            p.lamina_pedida.codigo_lamina,
          );
        }
        this.mostrarToast(
          p.estado === 'aceptado'
            ? `✅ ¡${this.otroNombre} aceptó tu intercambio!`
            : `${this.otroNombre} rechazó la propuesta`,
          p.estado === 'aceptado' ? 'success' : 'medium');
      }
    }));

    this.cargarIntercambios();
    this.cargarEstadoInicial();
  }

  private cargarEstadoInicial(): void {
    this.chatSvc.getUsuarios().subscribe(us => {
      const u = us.find(x => x.id === this.otroId);
      if (u) this.otroOnline = u.esta_en_linea;
    });
  }

  cargarIntercambios(): void {
    this.interSvc.getIntercambiosCon(this.otroId).subscribe(items => {
      this.pendienteRecibida = items.find(i => i.estado === 'pendiente' && !i.soy_proponente) || null;
      this.pendienteEnviada  = items.find(i => i.estado === 'pendiente' &&  i.soy_proponente) || null;
    });
  }

  // ── Mensajería ────────────────────────────────────────────────────────────
  enviar(): void {
    const t = this.texto.trim();
    if (!t || !this.conectado) return;
    this.chatSvc.enviarMensaje(this.otroId, t);
    this.texto = '';
    this.chatSvc.notificarEscribiendo(this.otroId, false);
  }

  onTyping(): void {
    this.chatSvc.notificarEscribiendo(this.otroId, true);
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() =>
      this.chatSvc.notificarEscribiendo(this.otroId, false), 1800);
  }

  // ── Modal de intercambio ──────────────────────────────────────────────────
  abrirModal(): void {
    this.modalAbierto = true;
    this.cargandoOp   = true;
    this.selOfrezco   = null;
    this.selRecibo    = null;
    this.msgPropuesta = '';
    this.interSvc.getOportunidades(this.otroId).subscribe({
      next : op => { this.oportunidades = op; this.cargandoOp = false; },
      error: ()  => { this.cargandoOp = false; },
    });
  }

  cerrarModal(): void { this.modalAbierto = false; }

  proponer(): void {
    if (!this.selOfrezco || !this.selRecibo || this.enviandoPropuesta) return;
    this.enviandoPropuesta = true;
    this.interSvc.proponer(this.otroId, this.selOfrezco.id, this.selRecibo.id, this.msgPropuesta)
      .subscribe({
        next : p => {
          this.enviandoPropuesta = false;
          this.pendienteEnviada  = p;
          this.modalAbierto      = false;
          this.mostrarToast('🔄 Propuesta enviada. Espera la respuesta.', 'success');
        },
        error: e => {
          this.enviandoPropuesta = false;
          this.mostrarToast(e?.error?.detail || 'No se pudo enviar la propuesta', 'danger');
        },
      });
  }

  responder(aceptar: boolean): void {
    if (!this.pendienteRecibida) return;
    const p = this.pendienteRecibida;
    this.interSvc.responder(p.id, aceptar).subscribe({
      next : () => {
        this.pendienteRecibida = null;
        this.mostrarToast(
          aceptar ? `✅ ¡Trato hecho! Recibiste ${p.lamina_ofrecida.codigo_lamina}` : 'Propuesta rechazada',
          aceptar ? 'success' : 'medium');
      },
      error: e => {
        this.pendienteRecibida = null;
        this.mostrarToast(e?.error?.detail || 'La propuesta ya no está disponible', 'danger');
      },
    });
  }

  // ── Helpers UI ────────────────────────────────────────────────────────────
  iniciales(nombre: string): string {
    const p = (nombre || '?').trim().split(/\s+/);
    return (p.length >= 2 ? p[0][0] + p[1][0] : p[0].substring(0, 2)).toUpperCase();
  }

  hora(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  }

  /** Separador de día: true si este mensaje abre un día distinto al anterior. */
  esNuevoDia(i: number): boolean {
    if (i === 0) return true;
    const a = new Date(this.mensajes[i - 1].enviado_en).toDateString();
    const b = new Date(this.mensajes[i].enviado_en).toDateString();
    return a !== b;
  }

  etiquetaDia(iso: string): string {
    const d   = new Date(iso);
    const hoy = new Date();
    const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
    if (d.toDateString() === hoy.toDateString())  return 'Hoy';
    if (d.toDateString() === ayer.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  trackMsg(_: number, m: MensajeChat): any { return m.id ?? m.enviado_en; }

  private async mostrarToast(message: string, color: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2600, position: 'top', color });
    t.present();
  }

  async confirmarBorrar(): Promise<void> {
    const t = await this.toast.create({
      message : '¿Borrar todo el historial de este chat?',
      duration : 0,
      position : 'top',
      buttons  : [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Borrar', handler: () => {
            this.chatSvc.borrarHistorial(this.otroId).subscribe({
              next : () => {
                this.chatSvc.cargarHistorialP2P([]);
                this.mostrarToast('🗑️ Chat borrado', 'medium');
              },
              error: () => this.mostrarToast('Error al borrar', 'danger'),
            });
          },
        },
      ],
    });
    t.present();
  }

  volver(): void { this.router.navigate(['/usuarios-chat']); }

  ngOnDestroy(): void {
    clearTimeout(this.typingTimer);
    this.subs.forEach(s => s.unsubscribe());
  }
}
