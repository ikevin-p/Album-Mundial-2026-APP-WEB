import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';

@Component({
  selector   : 'app-bienvenida',
  standalone : true,
  templateUrl: './bienvenida.page.html',
  styleUrls  : ['./bienvenida.page.scss'],
  imports    : [CommonModule, IonContent],
})
export class BienvenidaPage {
  constructor(private router: Router) {}
  irLogin()    : void { this.router.navigate(['/login']); }
  irRegistro() : void { this.router.navigate(['/registro']); }
}
