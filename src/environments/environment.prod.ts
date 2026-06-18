// environment.prod.ts — build de producción (Android/Capacitor)
//
// IMPORTANTE: la IP de abajo es un PLACEHOLDER. El APK compila esta IP
// "quemada" dentro del paquete, así que cada vez que cambie la red hay que:
//   1) Correr arranque.ps1 (actualiza este archivo solo), o editar la IP a mano.
//   2) Recompilar: ionic build --prod && npx cap sync android
//   3) Volver a generar el APK: cd android && .\gradlew.bat assembleDebug
//
// Ignora siempre 192.168.56.x (adaptador virtual de VirtualBox).
export const environment = {
  production: true,
  apiUrl   : 'http://192.168.1.100:8001',
  socketUrl: 'http://192.168.1.100:8001',
};
