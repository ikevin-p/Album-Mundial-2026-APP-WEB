// services/deseo.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DeseoItem {
  id         : number;
  lamina     : { id: number; codigo_lamina: string; nombre_jugador: string; pais: string; es_lamina_brillante: boolean; };
  creado_en  : string;
  disponible_en: { user_id: number; cantidad_repetidas: number }[];
}

export interface OportunidadDeseo {
  lamina   : { id: number; codigo_lamina: string; nombre_jugador: string; pais: string; };
  oferentes: { id: number; username: string; nombre_real: string; cantidad_repetidas: number; }[];
}

@Injectable({ providedIn: 'root' })
export class DeseoService {
  private api = `${environment.apiUrl}/deseos`;
  constructor(private http: HttpClient) {}

  getMisDeseos(): Observable<DeseoItem[]>            { return this.http.get<DeseoItem[]>(`${this.api}/`); }
  agregar(laminaId: number): Observable<any>         { return this.http.post(`${this.api}/`, { lamina_id: laminaId }); }
  quitar(laminaId: number): Observable<any>          { return this.http.delete(`${this.api}/${laminaId}`); }
  getOportunidades(): Observable<OportunidadDeseo[]> { return this.http.get<OportunidadDeseo[]>(`${this.api}/oportunidades`); }
}
