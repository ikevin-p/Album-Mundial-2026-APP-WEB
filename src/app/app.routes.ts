import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login',       loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage) },
  { path: 'registro',    loadComponent: () => import('./pages/registro/registro.page').then(m => m.RegistroPage) },
  { path: 'onboarding',  canActivate: [authGuard], loadComponent: () => import('./pages/onboarding/onboarding.page').then(m => m.OnboardingPage) },
  { path: 'paises',        canActivate: [authGuard], loadComponent: () => import('./pages/paises/paises.page').then(m => m.PaisesPage) },
  { path: 'jugadores/:pais', canActivate: [authGuard], loadComponent: () => import('./pages/jugadores/jugadores.page').then(m => m.JugadoresPage) },
  { path: 'coleccion',     canActivate: [authGuard], loadComponent: () => import('./pages/coleccion/coleccion.page').then(m => m.ColeccionPage) },
  { path: 'formulario',    canActivate: [authGuard], loadComponent: () => import('./pages/formulario/formulario.page').then(m => m.FormularioPage) },
  { path: 'formulario/:id',canActivate: [authGuard], loadComponent: () => import('./pages/formulario/formulario.page').then(m => m.FormularioPage) },
  { path: 'usuarios-chat', canActivate: [authGuard], loadComponent: () => import('./pages/usuarios-chat/usuarios-chat.page').then(m => m.UsuariosChatPage) },
  { path: 'chat/:id/:nombre', canActivate: [authGuard], loadComponent: () => import('./pages/chat-p2p/chat-p2p.page').then(m => m.ChatP2pPage) },
  { path: 'chatbot',       canActivate: [authGuard], loadComponent: () => import('./pages/chatbot/chatbot.page').then(m => m.ChatbotPage) },
  { path: 'perfil',        canActivate: [authGuard], loadComponent: () => import('./pages/perfil/perfil.page').then(m => m.PerfilPage) },
  { path: 'estadisticas',  canActivate: [authGuard], loadComponent: () => import('./pages/estadisticas/estadisticas.page').then(m => m.EstadisticasPage) },
  { path: 'qr-perfil',     canActivate: [authGuard], loadComponent: () => import('./pages/qr-perfil/qr-perfil.page').then(m => m.QrPerfilPage) },
  { path: 'deseos',        canActivate: [authGuard], loadComponent: () => import('./pages/deseos/deseos.page').then(m => m.DeseosPage) },
];
