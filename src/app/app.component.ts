import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { NotificacionService } from './services/notificacion.service';
import { PresenciaService } from './services/presencia.service';
import { AuthService } from './services/auth.service';

@Component({
  selector  : 'app-root',
  standalone: true,
  template  : '<ion-app><ion-router-outlet></ion-router-outlet></ion-app>',
  imports   : [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor(
    private notifSvc    : NotificacionService,
    private presenciaSvc: PresenciaService,
    private auth        : AuthService,
  ) {
    this.initApp();
  }

  private async initApp(): Promise<void> {
    // Status bar azul marino FIFA
    if (Capacitor.isNativePlatform()) {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#071020' });
      } catch {}
    }
    // Permisos de notificaciones
    await this.notifSvc.init();

    // Si ya hay sesión activa (token guardado), conectar presencia global
    // para aparecer en línea y recibir notificaciones en cualquier pantalla.
    if (this.auth.isAuthenticated()) {
      this.presenciaSvc.iniciar();
    }
  }
}
