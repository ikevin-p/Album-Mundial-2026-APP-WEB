// pages/onboarding/onboarding.page.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  footballOutline, swapHorizontalOutline, chatbubblesOutline,
  trophyOutline, arrowForwardOutline, checkmarkCircleOutline,
} from 'ionicons/icons';

interface Paso {
  icono: string;
  titulo: string;
  desc: string;
  color: string;
  img?: string;
}

@Component({
  selector   : 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls  : ['./onboarding.page.scss'],
  standalone : true,
  imports    : [CommonModule, IonContent, IonIcon],
})
export class OnboardingPage {

  pasoActual = 0;

  readonly PASOS: Paso[] = [
    {
      icono : 'trophy-outline',
      titulo: '¡Bienvenido al Álbum Mundial 2026!',
      desc  : 'Tu colección digital oficial del álbum Panini para la FIFA World Cup 2026. Registra tus láminas, sigue tu progreso y completa todos los países.',
      color : '#FFC400',
    },
    {
      icono : 'football-outline',
      titulo: 'Registra tus láminas',
      desc  : 'Entra a cada selección y toca las láminas que ya tienes. Mantén presionado para seleccionar varias a la vez. Un toque extra agrega repetidas.',
      color : '#29B6F6',
      img   : 'assets/balon.png',
    },
    {
      icono : 'swap-horizontal-outline',
      titulo: 'Intercambia con otros',
      desc  : 'Conecta con otros coleccionistas. El sistema detecta automáticamente qué láminas pueden intercambiar. ¡Completa tu álbum más rápido!',
      color : '#00E676',
    },
    {
      icono : 'chatbubbles-outline',
      titulo: 'Chatea y coordina',
      desc  : 'Habla directamente con coleccionistas, propone intercambios desde el chat y recibe notificaciones cuando alguien tiene lo que buscas.',
      color : '#FF4D6D',
    },
    {
      icono : 'checkmark-circle-outline',
      titulo: '¡Todo listo para empezar!',
      desc  : 'Tu álbum FIFA World Cup 2026 te espera. ¡Comienza registrando tus primeras láminas y únete a la comunidad de coleccionistas!',
      color : '#FFC400',
    },
  ];

  constructor(private router: Router) {
    addIcons({ footballOutline, swapHorizontalOutline, chatbubblesOutline, trophyOutline, arrowForwardOutline, checkmarkCircleOutline });
  }

  siguiente(): void {
    if (this.pasoActual < this.PASOS.length - 1) {
      this.pasoActual++;
    } else {
      this.finalizar();
    }
  }

  anterior(): void {
    if (this.pasoActual > 0) this.pasoActual--;
  }

  finalizar(): void {
    localStorage.setItem('onboarding_done', '1');
    this.router.navigate(['/paises'], { replaceUrl: true });
  }

  get paso(): Paso { return this.PASOS[this.pasoActual]; }
  get esUltimo(): boolean { return this.pasoActual === this.PASOS.length - 1; }
  get esPrimero(): boolean { return this.pasoActual === 0; }
}
