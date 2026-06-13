import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

export interface Lamina {
  id:                  number;
  codigo_lamina:       string;
  nombre_jugador:      string;
  pais:                string;
  club:                string;
  es_lamina_brillante: boolean;
  cantidad:            number;
}

@Injectable({ providedIn: "root" })
export class LaminaService {
  private readonly url = `${environment.apiUrl}/coleccion`;
  constructor(private http: HttpClient) {}

  listar(): Observable<Lamina[]> {
    return this.http.get<Lamina[]>(`${this.url}/`);
  }

  toggle(id: number, cantidad: number): Observable<Lamina> {
    return this.http.patch<Lamina>(`${this.url}/${id}`, { cantidad });
  }

  actualizar(id: number, data: Partial<Lamina>): Observable<Lamina> {
    return this.toggle(id, data["cantidad"] ?? 0);
  }

  obtener(id: number): Observable<Lamina> {
    return this.http.get<Lamina>(`${this.url}/${id}`);
  }

  eliminar(id: number): Observable<void> {
    return this.toggle(id, 0) as any;
  }

  crear(_: Lamina): Observable<Lamina> {
    return new Observable();
  }
}
