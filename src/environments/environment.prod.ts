// environment.prod.ts — usado por Capacitor/Android (celular físico)
// IP WiFi de la PC donde corre el backend.
// ⚠️  Verificar con ipconfig antes de cada presentación.
export const environment = {
  production: true,
  apiUrl   : 'http://192.168.1.20:8000',
  socketUrl: 'http://192.168.1.20:8000',
};
