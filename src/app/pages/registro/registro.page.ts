import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline, atOutline, mailOutline, lockClosedOutline,
  shieldCheckmarkOutline, eyeOutline, eyeOffOutline,
  alertCircleOutline, checkmarkCircleOutline, checkmarkOutline,
  checkmarkCircle, closeCircle, reloadOutline,
} from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

@Component({
  selector   : 'app-registro',
  standalone : true,
  templateUrl: './registro.page.html',
  styleUrls  : ['./registro.page.scss'],
  imports    : [CommonModule, FormsModule, IonContent, IonIcon],
})
export class RegistroPage {
  username        = '';
  nombre_real     = '';
  email           = '';
  password        = '';
  confirmar       = '';
  errorMsg        = '';
  exitoMsg        = '';
  cargando        = false;
  mostrarPass     = false;
  mostrarConfirmar= false;
  aceptaTerminos  = false;
  usernameOk      = false;
  usernameTomado  = false;

  // Fuerza de contraseña
  fuerzaPct   = 0;
  fuerzaColor = '#E8003D';
  fuerzaTexto = '';

  constructor(private auth: AuthService, private router: Router) {
    addIcons({
      personOutline, atOutline, mailOutline, lockClosedOutline,
      shieldCheckmarkOutline, eyeOutline, eyeOffOutline,
      alertCircleOutline, checkmarkCircleOutline, checkmarkOutline,
      checkmarkCircle, closeCircle, reloadOutline,
    });
  }

  validarUsername(): void {
    this.usernameOk     = false;
    this.usernameTomado = false;
    if (this.username.length >= 3) {
      // Simulación — en producción harías un GET al backend
      this.usernameOk = true;
    }
  }

  calcularFuerza(): void {
    const p = this.password;
    let score = 0;
    if (p.length >= 4)  score++;
    if (p.length >= 8)  score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    const niveles = [
      { pct: 20,  color: '#E8003D', texto: 'Muy débil' },
      { pct: 40,  color: '#FF6B35', texto: 'Débil' },
      { pct: 60,  color: '#FFD24C', texto: 'Regular' },
      { pct: 80,  color: '#00C853', texto: 'Fuerte' },
      { pct: 100, color: '#00E676', texto: 'Muy fuerte' },
    ];
    const n = niveles[Math.min(score, 4)];
    this.fuerzaPct   = n.pct;
    this.fuerzaColor = n.color;
    this.fuerzaTexto = n.texto;
  }

  registrarConGoogle(): void {
    // Abre OAuth de Google — en producción conectar con backend OAuth
    this.errorMsg = '';
    // Simulación: mostrar mensaje informativo
    this.exitoMsg = '🔗 Google OAuth — Conecta tu backend para habilitar esta función.';
    setTimeout(() => this.exitoMsg = '', 4000);
  }

  registrar(): void {
    this.errorMsg = '';
    if (!this.nombre_real.trim()) { this.errorMsg = 'Ingresa tu nombre completo'; return; }
    if (!this.username.trim())    { this.errorMsg = 'Elige un nombre de usuario'; return; }
    if (!this.password)           { this.errorMsg = 'Crea una contraseña'; return; }
    if (this.password.length < 4) { this.errorMsg = 'La contraseña debe tener al menos 4 caracteres'; return; }
    if (this.password !== this.confirmar) { this.errorMsg = 'Las contraseñas no coinciden'; return; }
    if (!this.aceptaTerminos)     { this.errorMsg = 'Debes aceptar los términos'; return; }

    this.cargando = true;
    this.auth.register(this.username, this.nombre_real, this.password).subscribe({
      next: () => {
        this.auth.login(this.username, this.password).subscribe({
          next : () => this.router.navigate(['/paises']),
          error: () => { this.errorMsg = 'Error al iniciar sesión'; this.cargando = false; },
        });
      },
      error: (e: any) => {
        this.errorMsg = e.message === 'usuario_existe'
          ? 'Ese nombre de usuario ya existe'
          : 'Error al registrarse. Inténtalo de nuevo.';
        this.cargando = false;
      },
    });
  }

  irLogin(): void { this.router.navigate(['/login']); }
}
