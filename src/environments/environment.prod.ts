// environment.prod.ts — usado por Capacitor/Android (celular físico)
// IP WiFi de la PC donde corre el backend.
// ⚠️  Verificar con ipconfig antes de cada presentación.
export const environment = {
  production: true,
  apiUrl   : 'http://10.127.67.60:8001',
  socketUrl: 'http://10.127.67.60:8001',
};
