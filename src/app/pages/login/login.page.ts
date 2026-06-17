import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline, lockClosedOutline, eyeOutline, eyeOffOutline,
  alertCircleOutline, reloadOutline, closeOutline, mailOutline,
} from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { PresenciaService } from '../../services/presencia.service';

@Component({
  selector   : 'app-login',
  standalone : true,
  templateUrl: './login.page.html',
  styleUrls  : ['./login.page.scss'],
  imports    : [CommonModule, FormsModule, IonContent, IonIcon],
})
export class LoginPage {
  username    = '';
  password    = '';
  errorMsg    = '';
  cargando    = false;
  mostrarPass = false;

  // Modal "Continuar con Google"
  googleModal   = false;
  googleEmail   = '';
  googleError   = '';
  googleCargando = false;

  // Confetti decorativo — posiciones y colores pre-generados
  confettiItems = Array.from({ length: 30 }, (_, i) => {
    const colors  = ['#E8003D','#00C853','#1565C0','#FFD24C','#fff'];
    const color   = colors[i % colors.length];
    const left    = Math.random() * 100;
    const top     = Math.random() * 55;
    const size    = 4 + Math.random() * 8;
    const opacity = 0.4 + Math.random() * 0.6;
    const rotate  = Math.random() * 360;
    return `left:${left}%;top:${top}%;width:${size}px;height:${size * 0.5}px;background:${color};opacity:${opacity};transform:rotate(${rotate}deg)`;
  });

  constructor(
    private auth: AuthService,
    private router: Router,
    private presencia: PresenciaService,
  ) {
    addIcons({
      personOutline, lockClosedOutline, eyeOutline, eyeOffOutline,
      alertCircleOutline, reloadOutline, closeOutline, mailOutline,
    });
  }

  login(): void {
    if (!this.username || !this.password) { this.errorMsg = 'Ingresa tus datos'; return; }
    this.cargando = true; this.errorMsg = '';
    this.auth.login(this.username, this.password).subscribe({
      next : () => {
        // Conectar presencia global: aparecer en línea + recibir
        // notificaciones en vivo desde cualquier pantalla.
        this.presencia.reiniciar();
        // Las instrucciones (onboarding) se muestran SIEMPRE tras iniciar
        // sesión, incluso para cuentas existentes.
        this.router.navigate(['/onboarding']);
      },
      error: () => { this.errorMsg = 'Credenciales incorrectas'; this.cargando = false; },
    });
  }

  // ── Acceso con Google ─────────────────────────────────────────
  abrirGoogle(): void {
    this.googleModal = true;
    this.googleEmail = '';
    this.googleError = '';
  }

  cerrarGoogle(): void { this.googleModal = false; }

  entrarConGoogle(): void {
    const email = this.googleEmail.trim().toLowerCase();
    if (!email) { this.googleError = 'Ingresa tu correo Gmail'; return; }
    this.googleCargando = true;
    this.googleError    = '';
    this.auth.loginConGoogle(email).subscribe({
      next : () => {
        this.presencia.reiniciar();
        this.router.navigate(['/onboarding']);
      },
      error: (e: Error) => {
        this.googleError    = e.message.includes('Gmail') ? e.message : 'Ingresa un correo Gmail válido';
        this.googleCargando = false;
      },
    });
  }

  irRegistro(): void { this.router.navigate(['/registro']); }
}
