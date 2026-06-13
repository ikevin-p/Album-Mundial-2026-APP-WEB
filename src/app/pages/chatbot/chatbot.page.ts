// pages/chatbot/chatbot.page.ts
// Asistente IA "Panini Pal" con sugerencias rápidas e indicador de escritura.

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonContent, IonFooter, IonIcon,
  IonButtons, IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, sendOutline, sparklesOutline,
  footballOutline, alertCircleOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { ChatService, MensajeChat } from '../../services/chat.service';
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

  mensajes      : MensajeChat[] = [];
  texto         = '';
  conectado     = false;
  botEscribiendo = false;

  readonly SUGERENCIAS = [
    '¿Qué países debutan en 2026?',
    '¿Cómo consigo láminas brillantes?',
    'Dame un dato del Mundial',
    '¿Cuántas láminas tiene el álbum?',
  ];

  private subs: Subscription[] = [];

  constructor(
    private chatSvc: ChatService,
    private auth   : AuthService,
    private router : Router,
  ) {
    addIcons({ arrowBackOutline, sendOutline, sparklesOutline, footballOutline, alertCircleOutline });
  }

  ngOnInit(): void {
    const token = this.auth.getToken();
    if (token) this.chatSvc.conectar(token);

    this.chatSvc.getHistorialBot().subscribe(msgs =>
      this.chatSvc.cargarHistorialBot(msgs));

    this.subs.push(this.chatSvc.mensajesBot$.subscribe(msgs => {
      this.mensajes = msgs;
      setTimeout(() => this.content?.scrollToBottom(180), 60);
    }));

    this.subs.push(this.chatSvc.conexion$.subscribe(v => this.conectado = v));
    this.subs.push(this.chatSvc.botEscribiendo$.subscribe(v => {
      this.botEscribiendo = v;
      if (v) setTimeout(() => this.content?.scrollToBottom(180), 60);
    }));
  }

  enviar(textoSugerido?: string): void {
    const t = (textoSugerido ?? this.texto).trim();
    if (!t || !this.conectado || this.botEscribiendo) return;
    this.chatSvc.enviarAlBot(t);
    this.texto = '';
  }

  hora(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  }

  trackMsg(_: number, m: MensajeChat): any { return m.id ?? m.enviado_en; }

  volver(): void { this.router.navigate(['/usuarios-chat']); }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
