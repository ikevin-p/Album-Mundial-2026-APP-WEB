import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { environment } from "../../environments/environment";

interface TokenResponse { access_token: string; }
interface RegisterResponse { id: number; username: string; nombre_real: string; }

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly api = environment.apiUrl;
  private readonly TOKEN_KEY = "access_token";
  private readonly USER_KEY  = "current_user";

  login(username: string, password: string): Observable<TokenResponse> {
    const body = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    return from(
      fetch(`${this.api}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      }).then(r => { if (!r.ok) throw new Error("login failed"); return r.json(); })
        .then((d: TokenResponse) => { this.saveToken(d.access_token); return d; })
    );
  }

  register(username: string, nombre_real: string, password: string): Observable<RegisterResponse> {
    return from(
      fetch(`${this.api}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, nombre_real, password }),
      }).then(r => {
        if (r.status === 409) throw new Error("usuario_existe");
        if (!r.ok) throw new Error("register_failed");
        return r.json();
      }).then((d: RegisterResponse) => {
        localStorage.setItem(this.USER_KEY, JSON.stringify(d));
        return d;
      })
    );
  }

  /** Acceso con cuenta Google: crea la cuenta si no existe y devuelve JWT. */
  loginConGoogle(email: string): Observable<TokenResponse> {
    return from(
      fetch(`${this.api}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).then(async r => {
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new Error(e?.detail || "google_failed");
        }
        return r.json();
      }).then((d: TokenResponse) => { this.saveToken(d.access_token); return d; })
    );
  }

  saveToken(token: string): void { localStorage.setItem(this.TOKEN_KEY, token); }
  getToken(): string | null       { return localStorage.getItem(this.TOKEN_KEY); }
  isAuthenticated(): boolean      { return !!this.getToken(); }

  // Callback opcional que se ejecuta al cerrar sesión (lo registra
  // PresenciaService para desconectar el WebSocket). Evita import circular.
  private onLogout?: () => void;
  registrarOnLogout(fn: () => void): void { this.onLogout = fn; }

  /** ID del usuario autenticado, extraído del claim `sub` del JWT. */
  getUserId(): number {
    const token = this.getToken();
    if (!token) return 0;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Number(payload.sub) || 0;
    } catch { return 0; }
  }

  getNombreReal(): string {
    const u = localStorage.getItem(this.USER_KEY);
    return u ? JSON.parse(u).nombre_real : "";
  }

  logout(): void {
    this.onLogout?.(); // desconectar presencia/WebSocket si está registrado
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}
