// services/notificacion.service.ts
// Notificaciones locales para intercambios y mensajes nuevos.
// En Android muestra notificaciones push incluso con la app en segundo plano.

import { Injectable } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class NotificacionService {

  private permisoOtorgado = false;
  private notifId        = 1;

  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const result = await LocalNotifications.requestPermissions();
      this.permisoOtorgado = result.display === 'granted';
    } catch {}
  }

  async notificarMensaje(remitente: string, texto: string): Promise<void> {
    if (!this.permisoOtorgado || !Capacitor.isNativePlatform()) return;
    await LocalNotifications.schedule({
      notifications: [{
        id      : this.notifId++,
        title   : `💬 ${remitente}`,
        body    : texto.length > 60 ? texto.substring(0, 60) + '…' : texto,
        smallIcon: 'ic_stat_icon_config_sample',
        channelId: 'mensajes',
        schedule : { at: new Date(Date.now() + 100) },
      }],
    });
  }

  async notificarIntercambio(remitente: string, ofrece: string, pide: string): Promise<void> {
    if (!this.permisoOtorgado || !Capacitor.isNativePlatform()) return;
    await LocalNotifications.schedule({
      notifications: [{
        id      : this.notifId++,
        title   : `🔄 ${remitente} propone un intercambio`,
        body    : `Te ofrece ${ofrece} por tu ${pide}`,
        smallIcon: 'ic_stat_icon_config_sample',
        channelId: 'intercambios',
        schedule : { at: new Date(Date.now() + 100) },
      }],
    });
  }

  async notificarIntercambioAceptado(contraparte: string, lamina: string): Promise<void> {
    if (!this.permisoOtorgado || !Capacitor.isNativePlatform()) return;
    await LocalNotifications.schedule({
      notifications: [{
        id      : this.notifId++,
        title   : '✅ ¡Intercambio aceptado!',
        body    : `${contraparte} aceptó el trato. Recibiste ${lamina}.`,
        smallIcon: 'ic_stat_icon_config_sample',
        channelId: 'intercambios',
        schedule : { at: new Date(Date.now() + 100) },
      }],
    });
  }
}
