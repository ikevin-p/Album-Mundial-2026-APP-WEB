// services/intercambio.service.ts
// Cliente REST del sistema de intercambios de láminas.

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LaminaIntercambio {
  id                 : number;
  codigo_lamina      : string;
  nombre_jugador     : string;
  pais               : string;
  es_lamina_brillante: boolean;
  cantidad           : number;
}

export interface Oportunidades {
  usuario   : { id: number; username: string; nombre_real: string };
  yo_ofrezco: LaminaIntercambio[];
  el_ofrece : LaminaIntercambio[];
}

export interface Intercambio {
  id             : number;
  estado         : 'pendiente' | 'aceptado' | 'rechazado' | 'cancelado';
  mensaje        : string;
  creado_en      : string;
  respondido_en  : string | null;
  soy_proponente : boolean;
  proponente     : { id: number; username: string; nombre_real: string };
  receptor       : { id: number; username: string; nombre_real: string };
  lamina_ofrecida: LaminaIntercambio;
  lamina_pedida  : LaminaIntercambio;
}

@Injectable({ providedIn: 'root' })
export class IntercambioService {

  private api = `${environment.apiUrl}/intercambios`;

  constructor(private http: HttpClient) {}

  /** Matching automático: qué puedo ofrecer y qué puede ofrecerme el otro. */
  getOportunidades(usuarioId: number): Observable<Oportunidades> {
    return this.http.get<Oportunidades>(`${this.api}/oportunidades/${usuarioId}`);
  }

  /** Crea una propuesta de intercambio pendiente. */
  proponer(receptorId: number, ofrecidaId: number, pedidaId: number, mensaje = ''): Observable<Intercambio> {
    return this.http.post<Intercambio>(`${this.api}/proponer`, {
      receptor_id        : receptorId,
      lamina_ofrecida_id : ofrecidaId,
      lamina_pedida_id   : pedidaId,
      mensaje,
    });
  }

  /** Acepta o rechaza una propuesta recibida. */
  responder(intercambioId: number, aceptar: boolean): Observable<Intercambio> {
    return this.http.post<Intercambio>(`${this.api}/${intercambioId}/responder`, { aceptar });
  }

  /** Todos mis intercambios (enviados + recibidos). */
  getMisIntercambios(): Observable<Intercambio[]> {
    return this.http.get<Intercambio[]>(`${this.api}/`);
  }

  /** Intercambios entre el usuario actual y otro coleccionista. */
  getIntercambiosCon(usuarioId: number): Observable<Intercambio[]> {
    return this.http.get<Intercambio[]>(`${this.api}/con/${usuarioId}`);
  }

  /** Contador de propuestas recibidas pendientes (para badge). */
  getContadorPendientes(): Observable<{ pendientes: number }> {
    return this.http.get<{ pendientes: number }>(`${this.api}/pendientes/count`);
  }
}
