import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, ViewWillEnter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, gridOutline } from 'ionicons/icons';
import { Lamina, LaminaService } from '../../services/lamina.service';
import { AuthService } from '../../services/auth.service';

interface ResumenPais {
  nombre: string;
  bandera: string;
  tengo: number;
  total: number;
  paracambiar: number;
}

const BANDERAS: Record<string, string> = {
  'Argentina':'🇦🇷','Brasil':'🇧🇷','Francia':'🇫🇷','Alemania':'🇩🇪',
  'España':'🇪🇸','Portugal':'🇵🇹','Inglaterra':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Mexico':'🇲🇽',
  'Estados Unidos':'🇺🇸','Canada':'🇨🇦','Uruguay':'🇺🇾','Colombia':'🇨🇴',
  'Argelia':'🇩🇿','Marruecos':'🇲🇦','Japon':'🇯🇵','Corea del Sur':'🇰🇷',
  'Arabia Saudita':'🇸🇦','Especiales':'⭐',
};

@Component({
  selector: 'app-coleccion',
  standalone: true,
  templateUrl: './coleccion.page.html',
  styleUrls: ['./coleccion.page.scss'],
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonButton, IonIcon,
  ],
})
export class ColeccionPage implements ViewWillEnter {
  resumen: ResumenPais[] = [];
  totalTengo = 0;
  totalCatalogo = 0;
  cargando = true;
  error = false;

  constructor(
    private laminaSvc: LaminaService,
    private auth: AuthService,
    private router: Router,
  ) { addIcons({ logOutOutline, gridOutline }); }

  ionViewWillEnter(): void { this.cargar(); }

  cargar(): void {
    this.cargando = true;
    this.error = false;
    this.laminaSvc.listar().subscribe({
      next: (laminas: Lamina[]) => {
        const mapa: Record<string, ResumenPais> = {};
        laminas.forEach(l => {
          if (!mapa[l.pais]) {
            mapa[l.pais] = {
              nombre: l.pais,
              bandera: BANDERAS[l.pais] || '🏳️',
              tengo: 0, total: 0, paracambiar: 0,
            };
          }
          mapa[l.pais].total++;
          if ((l.cantidad ?? 0) >= 1) mapa[l.pais].tengo++;
          const rep = (l.cantidad ?? 0) - 1;
          if (rep > 0) mapa[l.pais].paracambiar += rep;
        });
        this.resumen = Object.values(mapa).sort((a, b) => b.tengo - a.tengo);
        this.totalTengo = laminas.filter(l => (l.cantidad ?? 0) >= 1).length;
        this.totalCatalogo = laminas.length;
        this.cargando = false;
      },
      error: () => { this.error = true; this.cargando = false; },
    });
  }

  irPaises(): void { this.router.navigate(['/paises']); }

  salir(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
