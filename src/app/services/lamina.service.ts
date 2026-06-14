import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, of } from "rxjs";
import { catchError } from "rxjs/operators";
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

  /**
   * Toggle rápido: PATCH con la nueva cantidad.
   * Si cantidad=0 y la lámina no existía en la colección (404),
   * se ignora silenciosamente — el resultado es el mismo (no la tienes).
   */
  toggle(id: number, cantidad: number): Observable<Lamina | null> {
    return this.http.patch<Lamina>(`${this.url}/${id}`, { cantidad }).pipe(
      catchError(err => {
        // 404 al poner cantidad=0: no estaba en la colección, no es error real
        if (cantidad === 0 && err?.status === 404) return of(null);
        throw err;
      })
    );
  }

  actualizar(id: number, data: Partial<Lamina>): Observable<Lamina | null> {
    return this.toggle(id, data["cantidad"] ?? 0);
  }

  obtener(id: number): Observable<Lamina> {
    return this.http.get<Lamina>(`${this.url}/${id}`);
  }

  /**
   * Eliminar = toggle a 0. El catchError en toggle maneja el 404
   * cuando la lámina no estaba en la colección.
   */
  eliminar(id: number): Observable<Lamina | null> {
    return this.toggle(id, 0);
  }

  crear(_: Lamina): Observable<Lamina> {
    return new Observable();
  }
}
