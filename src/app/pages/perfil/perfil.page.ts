// pages/perfil/perfil.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonContent, IonIcon,
  IonButtons, IonButton, ToastController, AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, personOutline, atOutline, trophyOutline,
  swapHorizontalOutline, footballOutline, sparklesOutline,
  logOutOutline, createOutline, checkmarkOutline, cameraOutline,
  barChartOutline, qrCodeOutline, heartOutline,
} from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { LaminaService } from '../../services/lamina.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector   : 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls  : ['./perfil.page.scss'],
  standalone : true,
  imports    : [
    CommonModule, FormsModule, IonHeader, IonToolbar,
    IonContent, IonIcon, IonButtons, IonButton,
  ],
})
export class PerfilPage implements OnInit {

  usuario = { id: 0, username: '', nombre_real: '', esta_en_linea: false };
  editando      = false;
  nuevoNombre   = '';
  cargando      = false;

  // Stats del álbum
  totalTengo       = 0;
  totalCatalogo    = 0;
  totalFaltantes   = 0;
  totalParaCambiar = 0;
  porcentaje       = 0;

  // Gradiente del avatar (hash del username)
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
    private auth     : AuthService,
    private laminas  : LaminaService,
    private http     : HttpClient,
    public  router   : Router,
    private toast    : ToastController,
    private alert    : AlertController,
  ) {
    addIcons({
      arrowBackOutline, personOutline, atOutline, trophyOutline,
      swapHorizontalOutline, footballOutline, sparklesOutline,
      logOutOutline, createOutline, checkmarkOutline, cameraOutline,
      barChartOutline, qrCodeOutline, heartOutline,
    });
  }

  ngOnInit(): void {
    this.cargarPerfil();
    this.cargarStats();
  }

  cargarPerfil(): void {
    this.http.get<any>(`${environment.apiUrl}/auth/me`).subscribe({
      next : u => { this.usuario = u; this.nuevoNombre = u.nombre_real; },
      error: () => this.router.navigate(['/login']),
    });
  }

  cargarStats(): void {
    this.laminas.listar().subscribe(laminas => {
      const sinEsp          = laminas.filter(l => l.pais !== 'Especiales');
      this.totalCatalogo    = sinEsp.length;
      this.totalTengo       = sinEsp.filter(l => (l.cantidad ?? 0) >= 1).length;
      this.totalFaltantes   = this.totalCatalogo - this.totalTengo;
      this.totalParaCambiar = sinEsp.reduce((a, l) => {
        const r = (l.cantidad ?? 0) - 1; return a + (r > 0 ? r : 0);
      }, 0);
      this.porcentaje = this.totalCatalogo > 0
        ? Math.round((this.totalTengo / this.totalCatalogo) * 100) : 0;
    });
  }

  guardarNombre(): void {
    if (!this.nuevoNombre.trim()) return;
    this.cargando = true;
    this.http.patch(`${environment.apiUrl}/auth/perfil`, { nombre_real: this.nuevoNombre.trim() })
      .subscribe({
        next : () => {
          this.usuario.nombre_real = this.nuevoNombre.trim();
          this.editando = false; this.cargando = false;
          this.mostrarToast('Nombre actualizado ✓', 'success');
        },
        error: () => { this.cargando = false; this.mostrarToast('Error al guardar', 'danger'); },
      });
  }

  async confirmarSalir(): Promise<void> {
    const a = await this.alert.create({
      header : 'Cerrar sesión',
      message: '¿Estás seguro que deseas cerrar sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Salir', role: 'confirm', cssClass: 'btn-danger',
          handler: () => { this.auth.logout(); this.router.navigate(['/login']); }},
      ],
    });
    await a.present();
  }

  get iniciales(): string {
    const n = this.usuario.nombre_real || this.usuario.username || '?';
    const p = n.trim().split(/\s+/);
    return (p.length >= 2 ? p[0][0] + p[1][0] : p[0].substring(0, 2)).toUpperCase();
  }

  get gradiente(): string {
    let h = 0;
    for (const c of this.usuario.username || '') h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return this.GRADIENTES[h % this.GRADIENTES.length];
  }

  get barraAncho(): string { return `${this.porcentaje}%`; }

  private async mostrarToast(message: string, color: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2400, position: 'top', color });
    t.present();
  }

  volver(): void { this.router.navigate(['/paises']); }
}
