// pages/chatbot/chatbot.page.ts
// Asistente IA "Panini Pal": streaming con cursor, markdown y acciones por mensaje.

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  IonHeader, IonToolbar, IonContent, IonFooter, IonIcon,
  IonButtons, IonButton, ToastController, AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, sendOutline, sparklesOutline, footballOutline,
  alertCircleOutline, copyOutline, refreshOutline, stopOutline,
  checkmarkOutline, trashOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { ChatService, MensajeChat, ResumenColeccion } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector   : 'app-chatbot',
  templateUrl: './chatbot.page.html',
  styleUrls  : ['./chatbot.page.scss'],
  standalone : true,
  imports    : [
    CommonModule, FormsModule, IonHeader, IonToolbar,
    IonContent, IonFooter, IonIcon, IonButtons, IonButton,
  ],
})
export class ChatbotPage implements OnInit, OnDestroy {

  @ViewChild(IonContent) content!: IonContent;

  mensajes       : MensajeChat[] = [];
  texto          = '';
  conectado      = false;
  botEscribiendo = false;
  copiadoId      : string | null = null;   // marca visual temporal al copiar

  // Resumen real de la colección (para bienvenida y chips dinámicos).
  resumen: ResumenColeccion | null = null;

  // Sugerencias por defecto; se reemplazan por dinámicas al cargar el resumen.
  sugerencias: string[] = [
    '¿Qué países debutan en 2026?',
    '¿Cómo consigo láminas brillantes?',
    'Dame un dato del Mundial',
    '¿Cuántas láminas tiene el álbum?',
  ];

  // Guarda la última pregunta del usuario para la acción "reintentar".
  private ultimaPregunta = '';
  private subs: Subscription[] = [];

  constructor(
    private chatSvc: ChatService,
    private auth   : AuthService,
    private router : Router,
    private sanitizer: DomSanitizer,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
  ) {
    addIcons({
      arrowBackOutline, sendOutline, sparklesOutline, footballOutline,
      alertCircleOutline, copyOutline, refreshOutline, stopOutline,
      checkmarkOutline, trashOutline,
    });
  }

  ngOnInit(): void {
    const token = this.auth.getToken();
    if (token) this.chatSvc.conectar(token);

    this.chatSvc.getHistorialBot().subscribe(msgs =>
      this.chatSvc.cargarHistorialBot(msgs));

    // Carga el resumen real para personalizar bienvenida y sugerencias.
    this.chatSvc.getResumenBot().subscribe({
      next: r => { this.resumen = r; this.construirSugerencias(r); },
      error: () => {},
    });

    this.subs.push(this.chatSvc.mensajesBot$.subscribe(msgs => {
      this.mensajes = msgs;
      setTimeout(() => this.content?.scrollToBottom(120), 50);
    }));

    this.subs.push(this.chatSvc.conexion$.subscribe(v => this.conectado = v));
    this.subs.push(this.chatSvc.botEscribiendo$.subscribe(v => {
      this.botEscribiendo = v;
      if (v) setTimeout(() => this.content?.scrollToBottom(120), 50);
    }));
  }

  // Arma chips de sugerencia según el estado real de la colección.
  private construirSugerencias(r: ResumenColeccion): void {
    const chips: string[] = [];
    if (r.faltan > 0)            chips.push('¿Qué láminas me faltan?');
    if (r.repetidas_ej.length)   chips.push(`¿Con qué cambio mi ${r.repetidas_ej[0]}?`);
    if (r.n_brillantes > 0)      chips.push('¿Qué brillantes tengo?');
    chips.push('Dame un dato del Mundial');
    if (chips.length < 4)        chips.push('¿Cómo consigo láminas brillantes?');
    this.sugerencias = chips.slice(0, 4);
  }

  // Texto de bienvenida personalizado con el progreso real.
  get saludoProgreso(): string {
    if (!this.resumen) return '';
    const r = this.resumen;
    if (r.faltan === 0) return '¡Tienes el álbum COMPLETO! 🏆 Pregúntame lo que quieras.';
    const bri = r.n_brillantes > 0 ? `, ${r.n_brillantes} brillante${r.n_brillantes > 1 ? 's' : ''} 🌟` : '';
    return `Llevas ${r.tiene}/${r.total_album} láminas (${r.progreso}%). Te faltan ${r.faltan}${bri}.`;
  }

  // ── Envío ──────────────────────────────────────────────────────
  enviar(textoSugerido?: string): void {
    const t = (textoSugerido ?? this.texto).trim();
    // Permitimos escribir mientras responde, pero no enviar dos a la vez.
    if (!t || !this.conectado || this.chatSvc.botGenerando) return;
    this.ultimaPregunta = t;
    this.chatSvc.enviarAlBot(t);
    this.texto = '';
  }

  // Detiene la generación en curso (corta el stream del bot).
  detener(): void {
    this.chatSvc.detenerBot();
  }

  // Reenvía la última pregunta para regenerar la respuesta.
  // Quita la respuesta anterior del bot y vuelve a pedir SIN duplicar la pregunta.
  reintentar(): void {
    if (this.chatSvc.botGenerando) return;
    // Si no hay pregunta en memoria (ej. historial cargado), la tomamos del
    // último mensaje del usuario visible en pantalla.
    const pregunta = this.ultimaPregunta || this.ultimaPreguntaVisible();
    if (!pregunta) return;
    this.ultimaPregunta = pregunta;
    this.chatSvc.quitarUltimaRespuestaBot();
    this.chatSvc.regenerarRespuesta(pregunta);
  }

  // Busca el último mensaje enviado por el usuario en la lista actual.
  private ultimaPreguntaVisible(): string {
    for (let i = this.mensajes.length - 1; i >= 0; i--) {
      if (this.mensajes[i].es_mio) return this.mensajes[i].contenido;
    }
    return '';
  }

  // Borra toda la conversación con el bot (con confirmación).
  async borrarChat(): Promise<void> {
    if (this.mensajes.length === 0) return;
    const alert = await this.alertCtrl.create({
      header : 'Borrar conversación',
      message: '¿Seguro que quieres borrar todo el chat con Panini Pal?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Borrar', role: 'destructive',
          handler: () => {
            this.chatSvc.borrarHistorialBot().subscribe(() => {
              this.chatSvc.limpiarMensajesBot();
            });
          },
        },
      ],
    });
    await alert.present();
  }

  // Copia el contenido de un mensaje al portapapeles, con feedback visual.
  async copiar(m: MensajeChat): Promise<void> {
    try {
      await navigator.clipboard.writeText(m.contenido);
      this.copiadoId = this.trackMsg(0, m);
      setTimeout(() => (this.copiadoId = null), 1400);
      const toast = await this.toastCtrl.create({
        message: 'Copiado ✓', duration: 1000, position: 'bottom', color: 'dark',
      });
      await toast.present();
    } catch {
      // Fallback silencioso si el navegador bloquea el portapapeles.
    }
  }

  // ── Render de markdown seguro ──────────────────────────────────
  // Convierte el markdown básico que produce el modelo a HTML, escapando
  // primero cualquier HTML para evitar inyección (XSS).
  render(texto: string): SafeHtml {
    if (!texto) return '';
    let h = texto
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 1) Viñetas al inicio de línea: "- ", "• " o "* " → <li>.
    //    Se procesa ANTES que itálica para que "* BRA-12" no se confunda.
    h = h.replace(/^[ \t]*[-•*]\s+(.*)$/gm, '<li>$1</li>');
    // Agrupar <li> consecutivos en una <ul>
    h = h.replace(/(<li>[\s\S]*?<\/li>)/g, m => `<ul>${m}</ul>`).replace(/<\/ul>\s*<ul>/g, '');

    // 2) `código` en línea
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    // 3) **negrita**
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // 4) *itálica* (lo que quede tras las viñetas)
    h = h.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');

    // 5) Códigos de lámina (ej: BRA-10, ARG-07) → chip dorado clicable visual.
    //    Solo fuera de etiquetas ya creadas; patrón 3 letras + guion + número.
    h = h.replace(/\b([A-Z]{3}-\d{1,3})\b/g, '<span class="lam-chip-inline">$1</span>');

    // 6) Saltos de línea (no dentro de listas)
    h = h.replace(/\n/g, '<br>');
    h = h.replace(/<\/li><br>/g, '</li>').replace(/<ul><br>/g, '<ul>').replace(/<br><ul>/g, '<ul>');

    return this.sanitizer.bypassSecurityTrustHtml(h);
  }

  // ── Helpers ────────────────────────────────────────────────────
  // Indica si ESTE mensaje es el del bot que se está escribiendo ahora.
  esUltimoBotGenerando(m: MensajeChat, i: number): boolean {
    return this.chatSvc.botGenerando && !m.es_mio && i === this.mensajes.length - 1;
  }

  hora(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  }

  trackMsg(_: number, m: MensajeChat): any { return m.id ?? m.enviado_en; }

  volver(): void { this.router.navigate(['/usuarios-chat']); }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
