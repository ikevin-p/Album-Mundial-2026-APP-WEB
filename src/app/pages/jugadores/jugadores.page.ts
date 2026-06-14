import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { of, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonButton, IonIcon,
  ViewWillEnter, ToastController, ActionSheetController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkDoneOutline, closeOutline, heartOutline,
  heartDislikeOutline, listOutline, gridOutline, heart,
  addOutline, removeOutline, trashOutline, checkmarkCircle,
  ellipseOutline, sparkles, swapHorizontalOutline,
} from 'ionicons/icons';
import { Lamina, LaminaService } from '../../services/lamina.service';
import { DeseoService } from '../../services/deseo.service';
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

  // IDs de láminas marcadas como deseadas por el usuario
  deseados    : Set<number> = new Set();

  // ── Modo selección masiva ──
  modoSeleccion = false;
  seleccionados : Set<number> = new Set();
  guardando     = false;

  private holdTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private holdFired  = false;

  constructor(
    private route    : ActivatedRoute,
    private router   : Router,
    private laminaSvc: LaminaService,
    private deseoSvc : DeseoService,
    private ngZone   : NgZone,
    private toast    : ToastController,
    private actionSheet: ActionSheetController,
  ) {
    addIcons({
      checkmarkDoneOutline, closeOutline, heartOutline, heartDislikeOutline,
      listOutline, gridOutline, heart, addOutline, removeOutline, trashOutline,
      checkmarkCircle, ellipseOutline, sparkles, swapHorizontalOutline,
    });
  }

  ionViewWillEnter(): void {
    this.paisNombre = this.route.snapshot.paramMap.get('pais') || '';
    this.pais       = getPais(this.paisNombre);
    this.seleccionados.clear();
    this.modoSeleccion = false;
    this.cargar();
  }

  cargar(): void {
    // Cargar láminas y deseos en paralelo
    this.laminaSvc.listar().subscribe(laminas => {
      this.jugadores = laminas
        .filter(l => l.pais === this.paisNombre)
        .sort((a, b) => a.codigo_lamina.localeCompare(b.codigo_lamina));
    });
    this.deseoSvc.getMisDeseos().pipe(catchError(() => of([]))).subscribe(deseos => {
      this.deseados = new Set(deseos.map(d => d.lamina.id));
    });
  }

  // ═══════════════════ ACCIONES PRINCIPALES POR LÁMINA ═══════════════════

  /** Marca la lámina como conseguida (cantidad pasa a 1 si era 0). */
  marcarTengo(j: Lamina, ev?: Event): void {
    ev?.stopPropagation();
    if (!j.id || this.tieneLamina(j)) return;
    this.animarYActualizar(j, 1);
  }

  /** Suma una repetida (+1). Máximo 10. */
  sumarRepetida(j: Lamina, ev?: Event): void {
    ev?.stopPropagation();
    if (!j.id) return;
    const actual = j.cantidad ?? 0;
    if (actual >= 10) return;
    this.animarYActualizar(j, actual + 1);
  }

  /** Resta una repetida (−1). Mínimo 0 (la quita de la colección). */
  restarRepetida(j: Lamina, ev?: Event): void {
    ev?.stopPropagation();
    if (!j.id) return;
    const actual = j.cantidad ?? 0;
    if (actual <= 0) return;
    this.animarYActualizar(j, actual - 1);
  }

  /** Quita la lámina completamente de la colección (cantidad = 0). */
  quitarLamina(j: Lamina, ev?: Event): void {
    ev?.stopPropagation();
    if (!j.id) return;
    this.animarYActualizar(j, 0);
  }

  /** Alterna el estado de "deseada" (lista de deseos). */
  async toggleDeseo(j: Lamina, ev?: Event): Promise<void> {
    ev?.stopPropagation();
    if (!j.id) return;
    const id = j.id;
    if (this.deseados.has(id)) {
      this.deseados.delete(id); // optimistic
      this.deseoSvc.quitar(id).pipe(catchError(() => of(null))).subscribe();
      this.mostrarToast('Quitada de deseos', 'medium');
    } else {
      this.deseados.add(id); // optimistic
      this.deseoSvc.agregar(id).pipe(catchError(() => of(null))).subscribe();
      this.mostrarToast('❤️ Agregada a deseos', 'success');
    }
  }

  esDeseada(j: Lamina): boolean { return !!j.id && this.deseados.has(j.id); }

  // ═══════════════════ TAP / LONG-PRESS ═══════════════════

  /** Tap simple: si estamos en modo selección, alterna; si no, abre acciones. */
  onTap(j: Lamina): void {
    if (this.holdFired) { this.holdFired = false; return; } // ignora el tap tras long-press
    if (this.modoSeleccion) { this.toggleSeleccion(j); return; }
    // Tap normal alterna "tengo / no tengo" rápidamente
    if (!j.id) return;
    if (this.tieneLamina(j)) {
      this.quitarLamina(j);
    } else {
      this.marcarTengo(j);
    }
  }

  onPressStart(j: Lamina): void {
    if (this.modoSeleccion || !j.id) return;
    this.holdFired = false;
    const timer = setTimeout(() => {
      this.ngZone.run(() => {
        this.holdFired = true;
        this.abrirAcciones(j); // long-press abre menú de acciones
      });
    }, 500);
    this.holdTimers.set(j.id, timer);
  }

  onPressEnd(j: Lamina): void {
    if (!j.id) return;
    const t = this.holdTimers.get(j.id);
    if (t) { clearTimeout(t); this.holdTimers.delete(j.id); }
  }

  /** Action sheet con todas las acciones posibles para una lámina. */
  async abrirAcciones(j: Lamina): Promise<void> {
    if (!j.id) return;
    const tiene = this.tieneLamina(j);
    const deseada = this.esDeseada(j);

    const sheet = await this.actionSheet.create({
      header: `${j.codigo_lamina} · ${j.nombre_jugador}`,
      buttons: [
        ...(tiene ? [] : [{
          text: '✔ La tengo', icon: 'checkmark-circle',
          handler: () => this.marcarTengo(j),
        }]),
        {
          text: '➕ Sumar repetida', icon: 'add-outline',
          handler: () => this.sumarRepetida(j),
        },
        ...(tiene ? [{
          text: '➖ Quitar una', icon: 'remove-outline',
          handler: () => this.restarRepetida(j),
        }] : []),
        {
          text: deseada ? '💔 Quitar de deseos' : '❤️ Marcar como deseada',
          icon: deseada ? 'heart-dislike-outline' : 'heart-outline',
          handler: () => this.toggleDeseo(j),
        },
        ...(tiene ? [{
          text: '🗑 Borrar de mi colección', icon: 'trash-outline', role: 'destructive' as const,
          handler: () => this.quitarLamina(j),
        }] : []),
        { text: 'Cancelar', role: 'cancel' as const },
      ],
    });
    await sheet.present();
  }

  // ═══════════════════ MODO SELECCIÓN MASIVA ═══════════════════

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
    if (this.seleccionados.has(j.id)) this.seleccionados.delete(j.id);
    else this.seleccionados.add(j.id);
  }

  /** Selecciona TODAS las del país (para marcarlas de un golpe). */
  seleccionarTodas(): void {
    this.jugadores.filter(j => j.id).forEach(j => this.seleccionados.add(j.id!));
  }

  deseleccionarTodas(): void { this.seleccionados.clear(); }

  /** BOTÓN RÁPIDO: marca TODAS las del país como conseguidas de una sola vez. */
  async marcarTodasDirecto(): Promise<void> {
    const faltantes = this.jugadores.filter(j => j.id && !this.tieneLamina(j));
    if (faltantes.length === 0) {
      this.mostrarToast('Ya tienes todas las de ' + this.paisNombre, 'medium');
      return;
    }
    this.guardando = true;
    // Optimistic: marcar UI primero
    faltantes.forEach(j => j.cantidad = 1);

    const llamadas = faltantes.map(j =>
      this.laminaSvc.actualizar(j.id!, { cantidad: 1 }).pipe(catchError(() => of(null)))
    );
    forkJoin(llamadas).subscribe(() => {
      this.guardando = false;
      this.mostrarToast(`✅ ${faltantes.length} láminas marcadas`, 'success');
    });
  }

  /** Confirma la selección masiva manual. */
  async confirmarSeleccion(): Promise<void> {
    if (this.seleccionados.size === 0) return;
    this.guardando = true;
    const ids = Array.from(this.seleccionados);
    const objetivos = this.jugadores.filter(j => j.id && ids.includes(j.id));

    // Optimistic
    objetivos.forEach(j => { if ((j.cantidad ?? 0) < 1) j.cantidad = 1; });

    const llamadas = objetivos.map(j =>
      this.laminaSvc.actualizar(j.id!, { cantidad: Math.max(j.cantidad ?? 0, 1) })
        .pipe(catchError(() => of(null)))
    );
    forkJoin(llamadas).subscribe(async () => {
      this.guardando     = false;
      this.modoSeleccion = false;
      const n = objetivos.length;
      this.seleccionados.clear();
      this.mostrarToast(`✅ ${n} lámina${n > 1 ? 's' : ''} marcada${n > 1 ? 's' : ''}`, 'success');
    });
  }

  // ═══════════════════ HELPERS ═══════════════════

  /** Actualiza UI optimísticamente + PATCH al backend; absorbe errores. */
  private animarYActualizar(j: Lamina, nuevaCantidad: number): void {
    if (!j.id) return;
    j.cantidad = nuevaCantidad;
    this.animando.add(j.id);
    setTimeout(() => this.ngZone.run(() => this.animando.delete(j.id!)), 350);
    this.laminaSvc.actualizar(j.id, { cantidad: nuevaCantidad })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  private async mostrarToast(message: string, color: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 1800, position: 'top', color });
    t.present();
  }

  esBrillante(j: Lamina): boolean {
    const cod = j.codigo_lamina;
    return cod.endsWith('-01') || cod.endsWith('-02') || cod.startsWith('ESP-W');
  }

  get totalTengo(): number    { return this.jugadores.filter(j => this.tieneLamina(j)).length; }
  get totalLaminas(): number  { return this.jugadores.length; }
  get totalRepetidas(): number { return this.jugadores.reduce((a, j) => a + Math.max((j.cantidad ?? 0) - 1, 0), 0); }
  get pctCompletado(): number { return this.totalLaminas > 0 ? Math.round((this.totalTengo / this.totalLaminas) * 100) : 0; }
  get todasConseguidas(): boolean { return this.totalLaminas > 0 && this.totalTengo === this.totalLaminas; }

  tieneLamina(j: Lamina): boolean { return (j.cantidad ?? 0) >= 1; }
  repetidasDe(j: Lamina): number { return Math.max((j.cantidad ?? 0) - 1, 0); }
  estaSeleccionada(j: Lamina): boolean { return !!j.id && this.seleccionados.has(j.id); }
  trackById(_: number, j: Lamina): number { return j.id ?? 0; }
}
