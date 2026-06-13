// pages/usuarios-chat/usuarios-chat.page.ts
// Centro de mensajes e intercambios: conversaciones, búsqueda de coleccionistas,
// propuestas pendientes con acción inline y acceso al asistente Panini Pal.

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonContent, IonIcon, IonButtons, IonButton,
  IonSearchbar, IonRefresher, IonRefresherContent, ToastController, ViewWillEnter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, chatbubblesOutline, swapHorizontalOutline,
  checkmarkOutline, closeOutline, sparklesOutline, searchOutline,
  footballOutline, timeOutline, checkmarkDoneOutline, peopleOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { ChatService, Conversacion, UsuarioChat } from '../../services/chat.service';
import { IntercambioService, Intercambio } from '../../services/intercambio.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector   : 'app-usuarios-chat',
  templateUrl: './usuarios-chat.page.html',
  styleUrls  : ['./usuarios-chat.page.scss'],
  standalone : true,
  imports    : [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonContent, IonIcon,
    IonButtons, IonButton, IonSearchbar, IonRefresher, IonRefresherContent,
  ],
})
export class UsuariosChatPage implements OnInit, OnDestroy, ViewWillEnter {

  conversaciones : Conversacion[] = [];
  usuarios       : UsuarioChat[]  = [];
  pendientes     : Intercambio[]  = [];
  busqueda       = '';
  buscando       = false;
  cargando       = true;
  miId           = 0;

  private subs: Subscription[] = [];

  // Paleta de gradientes para avatares (hash por username)
  private readonly GRADIENTES = [
    'linear-gradient(135deg,#E8003D,#FF6B6B)',
    'linear-gradient(135deg,#1565C0,#42A5F5)',
    'linear-gradient(135deg,#00A843,#4CD964)',
    'linear-gradient(135deg,#D4A017,#F5C842)',
    'linear-gradient(135deg,#7B1FA2,#BA68C8)',
    'linear-gradient(135deg,#E65100,#FF9800)',
    'linear-gradient(135deg,#00838F,#4DD0E1)',
  ];

  constructor(
    private chatSvc : ChatService,
    private interSvc: IntercambioService,
    private auth    : AuthService,
    private router  : Router,
    private toast   : ToastController,
  ) {
    addIcons({
      arrowBackOutline, chatbubblesOutline, swapHorizontalOutline,
      checkmarkOutline, closeOutline, sparklesOutline, searchOutline,
      footballOutline, timeOutline, checkmarkDoneOutline, peopleOutline,
    });
  }

  ngOnInit(): void {
    this.miId = this.auth.getUserId();
    const token = this.auth.getToken();
    if (token) this.chatSvc.conectar(token);

    // Presencia en vivo: actualizar online/offline sin recargar
    this.subs.push(this.chatSvc.estadoUsuarios$.subscribe(e => {
      const aplicar = (u: UsuarioChat) => {
        if (u.id === e.user_id) {
          u.esta_en_linea = e.en_linea;
          if (e.ultimo_visto) u.ultimo_visto = e.ultimo_visto;
        }
      };
      this.conversaciones.forEach(c => aplicar(c.usuario));
      this.usuarios.forEach(aplicar);
    }));

    // Propuestas en tiempo real
    this.subs.push(this.chatSvc.nuevaPropuesta$.subscribe(() => this.cargarPendientes()));
    this.subs.push(this.chatSvc.propuestaRespondida$.subscribe(() => this.cargarTodo()));

    // Mensajes entrantes refrescan la lista de conversaciones
    this.subs.push(this.chatSvc.mensajesP2P$.subscribe(() => this.cargarConversaciones()));
  }

  ionViewWillEnter(): void { this.cargarTodo(); }

  cargarTodo(ev?: any): void {
    this.cargando = true;
    this.cargarConversaciones(() => { this.cargando = false; ev?.target?.complete(); });
    this.cargarPendientes();
  }

  cargarConversaciones(done?: () => void): void {
    this.chatSvc.getConversaciones().subscribe({
      next : cs => { this.conversaciones = cs; done?.(); },
      error: () => done?.(),
    });
  }

  cargarPendientes(): void {
    this.interSvc.getMisIntercambios().subscribe(items => {
      this.pendientes = items.filter(i => i.estado === 'pendiente' && !i.soy_proponente);
    });
  }

  // ── Búsqueda de coleccionistas ────────────────────────────────────────────
  onBuscar(): void {
    const q = this.busqueda.trim();
    this.buscando = q.length > 0;
    if (!this.buscando) { this.usuarios = []; return; }
    this.chatSvc.getUsuarios(q).subscribe(us => this.usuarios = us);
  }

  // ── Responder propuestas inline ───────────────────────────────────────────
  async responder(p: Intercambio, aceptar: boolean): Promise<void> {
    this.interSvc.responder(p.id, aceptar).subscribe({
      next : async () => {
        this.pendientes = this.pendientes.filter(x => x.id !== p.id);
        const t = await this.toast.create({
          message : aceptar
            ? `✅ ¡Intercambio realizado! Recibiste ${p.lamina_ofrecida.codigo_lamina}`
            : 'Propuesta rechazada',
          duration: 2600, position: 'top',
          color   : aceptar ? 'success' : 'medium',
        });
        t.present();
      },
      error: async (e) => {
        const t = await this.toast.create({
          message : e?.error?.detail || 'La propuesta ya no está disponible',
          duration: 2600, position: 'top', color: 'danger',
        });
        t.present();
        this.cargarPendientes();
      },
    });
  }

  // ── Helpers UI ────────────────────────────────────────────────────────────
  iniciales(nombre: string): string {
    const p = (nombre || '?').trim().split(/\s+/);
    return (p.length >= 2 ? p[0][0] + p[1][0] : p[0].substring(0, 2)).toUpperCase();
  }

  gradiente(username: string): string {
    let h = 0;
    for (const c of username || '') h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return this.GRADIENTES[h % this.GRADIENTES.length];
  }

  horaCorta(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const hoy = new Date();
    if (d.toDateString() === hoy.toDateString()) {
      return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  }

  ultimoVistoTxt(u: UsuarioChat): string {
    if (u.esta_en_linea) return 'En línea';
    if (!u.ultimo_visto) return 'Desconectado';
    return 'Últ. vez ' + this.horaCorta(u.ultimo_visto);
  }

  // ── Navegación ────────────────────────────────────────────────────────────
  abrirChat(u: UsuarioChat): void {
    this.router.navigate(['/chat', u.id, u.nombre_real || u.username]);
  }
  abrirBot(): void { this.router.navigate(['/chatbot']); }
  volver()  : void { this.router.navigate(['/paises']); }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
