import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { NotificacionService } from './services/notificacion.service';

@Component({
  selector  : 'app-root',
  standalone: true,
  template  : '<ion-app><ion-router-outlet></ion-router-outlet></ion-app>',
  imports   : [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor(private notifSvc: NotificacionService) {
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
    // Solicitar permisos de notificaciones al arrancar
    await this.notifSvc.init();
  }
}
