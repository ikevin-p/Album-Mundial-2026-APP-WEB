import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonButton, IonIcon,
  ViewWillEnter, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkDoneOutline, closeOutline, heartOutline,
  heartDislikeOutline, listOutline, gridOutline,
} from 'ionicons/icons';
import { Lamina, LaminaService } from '../../services/lamina.service';
import { PAISES_MUNDIAL, PaisCatalogo, iniciales, getPais } from '../../data/paises.data';

@Component({
  selector   : 'app-jugadores',
  standalone : true,
  templateUrl: './jugadores.page.html',
  styleUrls  : ['./jugadores.page.scss'],
  imports    : [
    CommonModule, IonHeader, IonToolbar, IonTitle,
    IonContent, IonButtons, IonBackButton, IonButton, IonIcon,
  ],
})
export class JugadoresPage implements ViewWillEnter {

  pais       !: PaisCatalogo;
  paisNombre  = '';
  jugadores   : Lamina[] = [];
  animando    : Set<number> = new Set();
  iniciales   = iniciales;

  // ── Modo selección masiva ──────────────────────────────────
  modoSeleccion  = false;
  seleccionados  : Set<number> = new Set();
  guardando      = false;

  private holdTimers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor(
    private route    : ActivatedRoute,
    private router   : Router,
    private laminaSvc: LaminaService,
    private ngZone   : NgZone,
    private toast    : ToastController,
  ) {
    addIcons({ checkmarkDoneOutline, closeOutline, heartOutline, heartDislikeOutline, listOutline, gridOutline });
  }

  ionViewWillEnter(): void {
    this.paisNombre = this.route.snapshot.paramMap.get('pais') || '';
    this.pais       = getPais(this.paisNombre);
    this.seleccionados.clear();
    this.modoSeleccion = false;
    this.cargar();
  }

  cargar(): void {
    this.laminaSvc.listar().subscribe(laminas => {
      this.jugadores = laminas
        .filter(l => l.pais === this.paisNombre)
        .sort((a, b) => a.codigo_lamina.localeCompare(b.codigo_lamina));
    });
  }

  // ── MODO SELECCIÓN MASIVA ──────────────────────────────────
  activarModoSeleccion(): void {
    this.modoSeleccion = true;
    this.seleccionados.clear();
  }

  cancelarSeleccion(): void {
    this.modoSeleccion = false;
    this.seleccionados.clear();
  }

  toggleSeleccion(j: Lamina): void {
    if (!j.id) return;
    if (this.seleccionados.has(j.id)) {
      this.seleccionados.delete(j.id);
    } else {
      this.seleccionados.add(j.id);
    }
  }

  seleccionarTodas(): void {
    const faltantes = this.jugadores.filter(j => !this.tieneLamina(j) && j.id);
    if (faltantes.length === 0) {
      this.jugadores.filter(j => j.id).forEach(j => this.seleccionados.add(j.id!));
    } else {
      faltantes.forEach(j => this.seleccionados.add(j.id!));
    }
  }

  deseleccionarTodas(): void { this.seleccionados.clear(); }

  async confirmarSeleccion(): Promise<void> {
    if (this.seleccionados.size === 0) return;
    this.guardando = true;
    const ids = Array.from(this.seleccionados);
    let guardadas = 0;

    for (const id of ids) {
      const j = this.jugadores.find(x => x.id === id);
      if (!j) continue;
      const nuevaCantidad = Math.max((j.cantidad ?? 0), 1);
      await this.laminaSvc.actualizar(id, { cantidad: nuevaCantidad }).toPromise();
      j.cantidad = nuevaCantidad;
      guardadas++;
    }

    this.guardando     = false;
    this.modoSeleccion = false;
    this.seleccionados.clear();

    const t = await this.toast.create({
      message : `✅ ${guardadas} lámina${guardadas > 1 ? 's' : ''} marcada${guardadas > 1 ? 's' : ''} como conseguida${guardadas > 1 ? 's' : ''}`,
      duration: 2400, position: 'top', color: 'success',
    });
    t.present();
  }

  // ── Tap / press normal ────────────────────────────────────
  onTap(j: Lamina): void {
    if (this.modoSeleccion) { this.toggleSeleccion(j); return; }
    if (!j.id) return;
    const actual = j.cantidad ?? 0;
    const nuevo  = actual >= 10 ? 10 : actual + 1;
    this.animarYActualizar(j, nuevo);
  }

  onPressStart(j: Lamina): void {
    if (this.modoSeleccion || !j.id) return;
    const timer = setTimeout(() => {
      this.ngZone.run(() => {
        // Press largo: activar modo selección con este elemento ya seleccionado
        this.activarModoSeleccion();
        this.seleccionados.add(j.id!);
      });
    }, 600);
    this.holdTimers.set(j.id, timer);
  }

  onPressEnd(j: Lamina): void {
    if (!j.id) return;
    const t = this.holdTimers.get(j.id);
    if (t) { clearTimeout(t); this.holdTimers.delete(j.id); }
  }

  resetLamina(j: Lamina): void {
    if (!j.id) return;
    this.animarYActualizar(j, 0);
  }

  private animarYActualizar(j: Lamina, nuevaCantidad: number): void {
    if (!j.id) return;
    j.cantidad = nuevaCantidad;
    this.animando.add(j.id);
    setTimeout(() => this.ngZone.run(() => this.animando.delete(j.id!)), 350);
    this.laminaSvc.actualizar(j.id, { cantidad: nuevaCantidad }).subscribe();
  }

  esBrillante(j: Lamina): boolean {
    const cod = j.codigo_lamina;
    return cod.endsWith('-01') || cod.endsWith('-02') || cod.startsWith('ESP-W');
  }

  get totalTengo(): number    { return this.jugadores.filter(j => this.tieneLamina(j)).length; }
  get totalLaminas(): number  { return this.jugadores.length; }
  get pctCompletado(): number { return this.totalLaminas > 0 ? Math.round((this.totalTengo / this.totalLaminas) * 100) : 0; }

  tieneLamina(j: Lamina): boolean { return (j.cantidad ?? 0) >= 1; }
  estaSeleccionada(j: Lamina): boolean { return !!j.id && this.seleccionados.has(j.id); }
  trackById(_: number, j: Lamina): number { return j.id ?? 0; }
}
