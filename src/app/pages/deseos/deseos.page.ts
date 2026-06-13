// pages/deseos/deseos.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonContent, IonIcon, IonButtons, IonButton,
  IonRefresher, IonRefresherContent, ToastController, AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, heartOutline, heartDislikeOutline,
  chatbubblesOutline, swapHorizontalOutline, searchOutline,
  sparklesOutline, trashOutline,
} from 'ionicons/icons';
import { DeseoService, DeseoItem, OportunidadDeseo } from '../../services/deseo.service';
import { LaminaService, Lamina } from '../../services/lamina.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector   : 'app-deseos',
  templateUrl: './deseos.page.html',
  styleUrls  : ['./deseos.page.scss'],
  standalone : true,
  imports    : [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonContent,
    IonIcon, IonButtons, IonButton, IonRefresher, IonRefresherContent,
  ],
})
export class DeseosPage implements OnInit {

  deseos        : DeseoItem[]        = [];
  oportunidades : OportunidadDeseo[] = [];
  todasLaminas  : Lamina[]           = [];
  busqueda      = '';
  cargando      = true;
  tab           : 'deseos' | 'oportunidades' = 'deseos';

  constructor(
    private deseoSvc : DeseoService,
    private laminaSvc: LaminaService,
    private router   : Router,
    private toast    : ToastController,
    private alert    : AlertController,
  ) {
    addIcons({ arrowBackOutline, heartOutline, heartDislikeOutline, chatbubblesOutline, swapHorizontalOutline, searchOutline, sparklesOutline, trashOutline });
  }

  ngOnInit(): void { this.cargar(); }

  cargar(ev?: any): void {
    this.cargando = true;
    this.deseoSvc.getMisDeseos().subscribe(d => { this.deseos = d; this.cargando = false; ev?.target?.complete(); });
    this.deseoSvc.getOportunidades().subscribe(o => this.oportunidades = o);
  }

  async buscarLamina(): Promise<void> {
    const q = this.busqueda.trim().toUpperCase();
    if (!q) return;
    this.laminaSvc.listar().subscribe(async laminas => {
      const encontradas = laminas.filter(l =>
        l.codigo_lamina.toUpperCase().includes(q) || l.nombre_jugador.toUpperCase().includes(q)
      ).slice(0, 10);

      if (encontradas.length === 0) {
        const t = await this.toast.create({ message: 'Sin resultados', duration: 1800, position: 'top' });
        t.present(); return;
      }

      const a = await this.alert.create({
        header : 'Agregar a lista de deseos',
        message: 'Selecciona la lámina que buscas:',
        inputs : encontradas.map(l => ({
          type : 'radio' as const,
          label: `${l.codigo_lamina} - ${l.nombre_jugador}`,
          value: l.id,
        })),
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          { text: 'Agregar', handler: (id: number) => this.agregarDeseo(id) },
        ],
      });
      a.present();
    });
  }

  agregarDeseo(laminaId: number): void {
    this.deseoSvc.agregar(laminaId).subscribe({
      next : async () => {
        this.cargar();
        const t = await this.toast.create({ message: '❤️ Agregada a tu lista de deseos', duration: 2000, position: 'top', color: 'success' });
        t.present();
        this.busqueda = '';
      },
      error: async () => {
        const t = await this.toast.create({ message: 'Ya está en tu lista de deseos', duration: 1800, position: 'top', color: 'medium' });
        t.present();
      },
    });
  }

  async quitarDeseo(d: DeseoItem): Promise<void> {
    this.deseoSvc.quitar(d.lamina.id).subscribe({
      next : async () => {
        this.deseos = this.deseos.filter(x => x.id !== d.id);
        const t = await this.toast.create({ message: 'Eliminada de tu lista', duration: 1800, position: 'top' });
        t.present();
      },
    });
  }

  irAlChat(userId: number, username: string): void {
    this.router.navigate(['/chat', userId, username]);
  }

  volver(): void { this.router.navigate(['/perfil']); }
}
