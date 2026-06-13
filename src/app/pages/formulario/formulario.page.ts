import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, ViewWillEnter,
} from '@ionic/angular/standalone';
import { Lamina, LaminaService } from '../../services/lamina.service';

@Component({
  selector: 'app-formulario',
  standalone: true,
  templateUrl: './formulario.page.html',
  styleUrls: ['./formulario.page.scss'],
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonBackButton,
  ],
})
export class FormularioPage implements ViewWillEnter {
  lamina: Lamina | null = null;
  cargando = true;
  error = false;
  guardando = false;
  editId: number | null = null;

  constructor(
    private laminaSvc: LaminaService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ionViewWillEnter(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId = +id;
      this.laminaSvc.listar().subscribe({
        next: (laminas) => {
          this.lamina = laminas.find(l => l.id === this.editId) || null;
          this.cargando = false;
          if (!this.lamina) this.error = true;
        },
        error: () => { this.error = true; this.cargando = false; },
      });
    } else {
      this.router.navigate(['/paises']);
    }
  }

  toggle(): void {
    if (!this.lamina?.id) return;
    const actual = this.lamina.cantidad ?? 0;
    const nuevo = actual >= 10 ? 10 : actual + 1;
    this.guardando = true;
    this.laminaSvc.toggle(this.lamina.id, nuevo).subscribe({
      next: (l) => { this.lamina = l; this.guardando = false; },
      error: () => { this.guardando = false; },
    });
  }

  reset(): void {
    if (!this.lamina?.id) return;
    this.guardando = true;
    this.laminaSvc.toggle(this.lamina.id, 0).subscribe({
      next: (l) => { this.lamina = l; this.guardando = false; },
      error: () => { this.guardando = false; },
    });
  }

  volver(): void {
    this.router.navigate(['/jugadores', this.lamina?.pais || '']);
  }

  esBrillante(): boolean {
    const cod = this.lamina?.codigo_lamina || '';
    return cod.endsWith('-01') || cod.endsWith('-02') || cod.startsWith('ESP-W');
  }
}
