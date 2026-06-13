import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId  : 'io.ionic.starter',
  appName: 'albumApp',
  webDir : 'www',
  server : {
    androidScheme: 'http',
    cleartext    : true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
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
