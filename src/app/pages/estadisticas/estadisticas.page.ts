// pages/estadisticas/estadisticas.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonContent, IonIcon, IonButtons, IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, trophyOutline, footballOutline,
  swapHorizontalOutline, sparklesOutline, ribbonOutline,
} from 'ionicons/icons';
import { LaminaService } from '../../services/lamina.service';
import { PAISES_MUNDIAL } from '../../data/paises.data';

interface ZonaStat {
  zona : string; tengo: number; total: number; pct: number; color: string;
}

@Component({
  selector   : 'app-estadisticas',
  templateUrl: './estadisticas.page.html',
  styleUrls  : ['./estadisticas.page.scss'],
  standalone : true,
  imports    : [CommonModule, IonHeader, IonToolbar, IonContent, IonIcon, IonButtons, IonButton],
})
export class EstadisticasPage implements OnInit {

  totalTengo = 0; totalCatalogo = 0; totalFaltantes = 0;
  totalParaCambiar = 0; porcentajeGlobal = 0; totalBrillantes = 0;
  zonas        : ZonaStat[] = [];
  topCompletos : any[] = [];
  topRepetidas : any[] = [];

  readonly ZONA_COLORES: Record<string, string> = {
    CONCACAF:'#FF4D6D', CONMEBOL:'#00E676', UEFA:'#29B6F6',
    CAF:'#FFC400', AFC:'#BA68C8', OFC:'#FF9800',
  };

  constructor(private laminas: LaminaService, private router: Router) {
    addIcons({ arrowBackOutline, trophyOutline, footballOutline, swapHorizontalOutline, sparklesOutline, ribbonOutline });
  }

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.laminas.listar().subscribe(laminas => {
      const sinEsp = laminas.filter(l => l.pais !== 'Especiales');
      this.totalCatalogo    = sinEsp.length;
      this.totalTengo       = sinEsp.filter(l => (l.cantidad ?? 0) >= 1).length;
      this.totalFaltantes   = this.totalCatalogo - this.totalTengo;
      this.totalParaCambiar = sinEsp.reduce((a, l) => a + Math.max(0, (l.cantidad ?? 0) - 1), 0);
      this.porcentajeGlobal = this.totalCatalogo > 0 ? Math.round((this.totalTengo / this.totalCatalogo) * 100) : 0;
      this.totalBrillantes  = laminas.filter(l => l.es_lamina_brillante && (l.cantidad ?? 0) >= 1).length;

      const ZONAS = ['CONCACAF','CONMEBOL','UEFA','CAF','AFC','OFC'];
      this.zonas = ZONAS.map(zona => {
        const paises  = PAISES_MUNDIAL.filter(p => p.zona === zona).map(p => p.nombre);
        const delZona = sinEsp.filter(l => paises.includes(l.pais));
        const tengo   = delZona.filter(l => (l.cantidad ?? 0) >= 1).length;
        return { zona, tengo, total: delZona.length, pct: delZona.length > 0 ? Math.round((tengo / delZona.length) * 100) : 0, color: this.ZONA_COLORES[zona] };
      }).sort((a, b) => b.pct - a.pct);

      this.topCompletos = PAISES_MUNDIAL.filter(p => p.nombre !== 'Especiales').map(p => {
        const del   = sinEsp.filter(l => l.pais === p.nombre);
        const tengo = del.filter(l => (l.cantidad ?? 0) >= 1).length;
        return { nombre: p.nombre, flagCode: p.flagCode, tengo, total: del.length, pct: del.length > 0 ? Math.round((tengo / del.length) * 100) : 0 };
      }).filter(p => p.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 5);

      this.topRepetidas = PAISES_MUNDIAL.filter(p => p.nombre !== 'Especiales').map(p => {
        const del = sinEsp.filter(l => l.pais === p.nombre);
        const rep = del.reduce((a, l) => a + Math.max(0, (l.cantidad ?? 0) - 1), 0);
        return { nombre: p.nombre, flagCode: p.flagCode, rep };
      }).filter(p => p.rep > 0).sort((a, b) => b.rep - a.rep).slice(0, 5);
    });
  }

  getFlagUrl(code: string): string { return `https://flagcdn.com/w80/${code}.png`; }
  get barraGlobal(): string { return `${this.porcentajeGlobal}%`; }
  volver(): void { this.router.navigate(['/paises']); }
}
