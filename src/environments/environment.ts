// environment.ts — desarrollo
//
// IMPORTANTE: la IP de abajo es un PLACEHOLDER. Antes de correr el proyecto,
// ejecuta arranque.ps1 (en la raíz de /proyectos) — detecta automáticamente
// la IP del adaptador WiFi/hotspot y reescribe este archivo solo.
//
// Si prefieres hacerlo a mano: reemplaza 192.168.1.100 por la IP que
// muestre `ipconfig` en el adaptador WiFi (ignora siempre 192.168.56.x,
// que es el adaptador virtual de VirtualBox).
export const environment = {
  production: false,
  apiUrl   : 'http://192.168.1.100:8001',
  socketUrl: 'http://192.168.1.100:8001',
};
