import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonIcon, IonSearchbar, ViewWillEnter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline, chatbubblesOutline, chevronForwardOutline,
  repeatOutline, searchOutline, gridOutline, listOutline,
  trophyOutline, personCircleOutline, barChartOutline,
} from 'ionicons/icons';
import { LaminaService } from '../../services/lamina.service';
import { AuthService } from '../../services/auth.service';
import { PAISES_MUNDIAL, PaisCatalogo, FLAG } from '../../data/paises.data';

export interface PaisVista extends PaisCatalogo {
  total     : number;
  completado: number;
  repetidas : number;
  porcentaje: number;
  esDebut   : boolean;
  // flag de fallback: true cuando la imagen remota falló
  flagError ?: boolean;
}

const DEBUTS      = ['Curazao','Cabo Verde','Jordania','Uzbekistan'];
const ORDEN_ZONAS = ['CONCACAF','CONMEBOL','UEFA','CAF','AFC','OFC','FIFA'];

@Component({
  selector   : 'app-paises',
  standalone : true,
  templateUrl: './paises.page.html',
  styleUrls  : ['./paises.page.scss'],
  imports    : [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle,
    IonContent, IonButton, IonButtons, IonIcon, IonSearchbar,
  ],
})
export class PaisesPage implements ViewWillEnter {

  todosLosPaises  : PaisVista[] = [];
  paisesFiltrados : PaisVista[] = [];

  totalTengo       = 0;
  totalCatalogo    = 0;
  totalParaCambiar = 0;
  totalFaltantes   = 0;
  porcentajeGlobal = 0;

  busqueda       = '';
  zonaActiva     = 'TODAS';
  ordenActivo    = 'zona';
  vistaLista     = false;
  modoClaro      = false;
  confettiActivo = false;

  readonly ZONAS   = ['TODAS','CONCACAF','CONMEBOL','UEFA','CAF','AFC','OFC'];
  readonly ORDENES = [
    { id:'zona',     label:'Por zona' },
    { id:'completo', label:'Más completo' },
    { id:'alfa',     label:'A-Z' },
    { id:'cambio',   label:'Para cambiar' },
  ];

  constructor(
    private laminaSvc: LaminaService,
    private auth     : AuthService,
    private router   : Router,
  ) {
    addIcons({
      logOutOutline, chatbubblesOutline, chevronForwardOutline,
      repeatOutline, searchOutline, gridOutline, listOutline,
      trophyOutline, personCircleOutline, barChartOutline,
    });
  }

  ionViewWillEnter(): void { this.cargar(); }

  cargar(): void {
    this.laminaSvc.listar().subscribe(laminas => {
      const prevPct = this.porcentajeGlobal;

      this.todosLosPaises = PAISES_MUNDIAL.map(p => {
        const del_pais  = laminas.filter(l => l.pais === p.nombre);
        const tengo     = del_pais.filter(l => (l.cantidad ?? 0) >= 1).length;
        const repetidas = del_pais.reduce((a, l) => {
          const r = (l.cantidad ?? 0) - 1; return a + (r > 0 ? r : 0);
        }, 0);
        // Preservar estado de error de imagen si ya se había marcado
        const existing = this.todosLosPaises.find(x => x.nombre === p.nombre);
        return {
          ...p,
          total     : tengo,
          completado: del_pais.length,
          repetidas,
          porcentaje: del_pais.length > 0
            ? Math.round((tengo / del_pais.length) * 100) : 0,
          esDebut   : DEBUTS.includes(p.nombre),
          flagError : existing?.flagError ?? false,
        };
      });

      const sinEsp = laminas.filter(l => l.pais !== 'Especiales');
      this.totalCatalogo    = sinEsp.length;
      this.totalTengo       = sinEsp.filter(l => (l.cantidad ?? 0) >= 1).length;
      this.totalParaCambiar = sinEsp.reduce((a, l) => {
        const r = (l.cantidad ?? 0) - 1; return a + (r > 0 ? r : 0);
      }, 0);
      this.totalFaltantes   = this.totalCatalogo - this.totalTengo;
      this.porcentajeGlobal = this.totalCatalogo > 0
        ? Math.round((this.totalTengo / this.totalCatalogo) * 100) : 0;

      if (prevPct < 100 && this.porcentajeGlobal === 100) this.lanzarConfetti();
      this.aplicarFiltros();
    });
  }

  aplicarFiltros(): void {
    let lista = [...this.todosLosPaises];
    if (this.busqueda.trim()) {
      const q = this.busqueda.toLowerCase();
      lista = lista.filter(p => p.nombre.toLowerCase().includes(q));
    }
    if (this.zonaActiva !== 'TODAS') lista = lista.filter(p => p.zona === this.zonaActiva);
    switch (this.ordenActivo) {
      case 'completo': lista.sort((a,b) => b.porcentaje - a.porcentaje); break;
      case 'alfa':     lista.sort((a,b) => a.nombre.localeCompare(b.nombre)); break;
      case 'cambio':   lista.sort((a,b) => b.repetidas - a.repetidas); break;
      default:
        lista.sort((a,b) =>
          ORDEN_ZONAS.indexOf(a.zona) - ORDEN_ZONAS.indexOf(b.zona) ||
          a.nombre.localeCompare(b.nombre));
    }
    this.paisesFiltrados = lista;
  }

  toggleVista(): void { this.vistaLista = !this.vistaLista; }
  toggleModo() : void {
    this.modoClaro = !this.modoClaro;
    document.body.classList.toggle('modo-claro', this.modoClaro);
  }
  lanzarConfetti(): void {
    this.confettiActivo = true;
    setTimeout(() => this.confettiActivo = false, 4000);
  }

  exportarResumen(): void {
    const lineas = [
      '══════════════════════════════════════',
      '   ÁLBUM MUNDIAL 2026  ·  MI RESUMEN',
      '══════════════════════════════════════',
      `Fecha: ${new Date().toLocaleDateString('es-CL')}`,
      '',
      `▸ Total tengo:    ${this.totalTengo} / ${this.totalCatalogo}`,
      `▸ Me faltan:      ${this.totalFaltantes}`,
      `▸ Para cambiar:   ${this.totalParaCambiar}`,
      `▸ Completado:     ${this.porcentajeGlobal}%`,
      '',
      '── DETALLE POR PAÍS ─────────────────',
    ];
    [...this.todosLosPaises]
      .filter(p => p.nombre !== 'Especiales')
      .sort((a,b) => b.porcentaje - a.porcentaje)
      .forEach(p => {
        const barra = '█'.repeat(Math.round(p.porcentaje/10)) + '░'.repeat(10-Math.round(p.porcentaje/10));
        const rep   = p.repetidas > 0 ? `  (↺ ${p.repetidas} repet.)` : '';
        lineas.push(`${p.nombre.padEnd(28)} ${barra}  ${p.porcentaje}%${rep}`);
      });
    lineas.push('', '══════════════════════════════════════');
    const blob = new Blob([lineas.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `album-mundial-2026-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Clase CSS según rango de porcentaje → define el color del marco. */
  claseCromo(p: PaisVista): string {
    if (p.porcentaje === 100) return 'completo';
    if (p.porcentaje >= 50)  return 'avanzado';
    if (p.porcentaje >= 25)  return 'medio';
    if (p.porcentaje > 0)    return 'inicio';
    return '';
  }

  /** Color de la barra y porcentaje según progreso. */
  colorBarra(p: PaisVista): string {
    if (p.porcentaje === 100) return '#FFC400';
    if (p.porcentaje >= 50)  return '#00E676';
    if (p.porcentaje > 0)    return '#29B6F6';
    return 'rgba(255,255,255,0.10)';
  }

  getFlagUrl(code: string): string { return FLAG(code); }

  /**
   * Cuando la imagen de bandera falla (sin conexión a flagcdn.com),
   * marca flagError=true para que el template muestre el emoji de fallback.
   */
  onFlagError(event: Event, p: PaisVista): void {
    (event.target as HTMLImageElement).style.display = 'none';
    p.flagError = true;
    p.flagCode  = ''; // activa el *ngIf del span emoji
  }

  setZona(z: string)  : void { this.zonaActiva  = z; this.aplicarFiltros(); }
  setOrden(o: string) : void { this.ordenActivo = o; this.aplicarFiltros(); }
  onBusqueda()        : void { this.aplicarFiltros(); }

  abrirPais(p: PaisVista)  : void { this.router.navigate(['/jugadores', p.nombre]); }
  abrirEspeciales()        : void { this.router.navigate(['/jugadores', 'Especiales']); }
  abrirChat()              : void { this.router.navigate(['/usuarios-chat']); }
  abrirPerfil()            : void { this.router.navigate(['/perfil']); }
  abrirEstadisticas()      : void { this.router.navigate(['/estadisticas']); }
  salir()                  : void { this.auth.logout(); this.router.navigate(['/login']); }
}
