import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId  : 'io.ionic.albumfifa',
  appName: 'AlbumFIFA',
  webDir : 'www',
  server : {
    androidScheme: 'http',
    cleartext    : true,
  },
  plugins: {
    // CapacitorHttp DESACTIVADO: interceptaba las peticiones y rompía
    // el flujo JWT del interceptor de Angular. Con esto, la app usa el
    // fetch nativo del WebView (igual que el navegador, que sí funciona).
    CapacitorHttp: {
      enabled: false,
    },
    // Status bar: fondo azul marino del header, sin solaparse con el contenido
    StatusBar: {
      overlaysWebView  : false,
      style            : 'DARK',
      backgroundColor  : '#071020',
    },
  },
};

export default config;
