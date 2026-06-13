// pages/qr-perfil/qr-perfil.page.ts
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonContent, IonIcon, IonButtons, IonButton,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, qrCodeOutline, shareOutline, copyOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector   : 'app-qr-perfil',
  templateUrl: './qr-perfil.page.html',
  styleUrls  : ['./qr-perfil.page.scss'],
  standalone : true,
  imports    : [CommonModule, IonHeader, IonToolbar, IonContent, IonIcon, IonButtons, IonButton],
})
export class QrPerfilPage implements OnInit {

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  usuario   = { id: 0, username: '', nombre_real: '' };
  qrDataUrl = '';

  constructor(
    private auth  : AuthService,
    private http  : HttpClient,
    private router: Router,
    private toast : ToastController,
  ) {
    addIcons({ arrowBackOutline, qrCodeOutline, shareOutline, copyOutline });
  }

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/auth/me`).subscribe(u => {
      this.usuario = u;
      this.generarQR();
    });
  }

  generarQR(): void {
    // Genera QR con URL profunda que abre el chat con este usuario
    const data   = `albumapp://chat/${this.usuario.id}/${this.usuario.nombre_real || this.usuario.username}`;
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(data)}&bgcolor=071020&color=FFFFFF&format=png&margin=2`;
    this.qrDataUrl = apiUrl;
  }

  async copiarId(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.usuario.username);
      const t = await this.toast.create({ message: '✓ Usuario copiado', duration: 1800, position: 'top', color: 'success' });
      t.present();
    } catch {}
  }

  async compartir(): Promise<void> {
    const texto = `¡Encuentra mis láminas repetidas en el Álbum Mundial 2026! Mi usuario: @${this.usuario.username}`;
    if ((navigator as any).share) {
      await (navigator as any).share({ title: 'Álbum Mundial 2026', text: texto });
    } else {
      await navigator.clipboard.writeText(texto);
      const t = await this.toast.create({ message: '✓ Copiado al portapapeles', duration: 2000, position: 'top', color: 'success' });
      t.present();
    }
  }

  get iniciales(): string {
    const n = this.usuario.nombre_real || this.usuario.username || '?';
    const p = n.trim().split(/\s+/);
    return (p.length >= 2 ? p[0][0] + p[1][0] : p[0].substring(0, 2)).toUpperCase();
  }

  volver(): void { this.router.navigate(['/perfil']); }
}
