// Producción (ng build). Reemplazado por environment.development.ts en desarrollo.
// La configuración web de Firebase no es secreta: restringí la apiKey por dominio en Google Cloud.
export const environment = {
  production: true,
  apiUrl: '/api/v1',
  useMocks: false,
  firebase: {
    apiKey: 'AIzaSyC98baiG5R_rU6r_p0-YZ2uGrh06hjrZD0',
    authDomain: 'parko-2271f.firebaseapp.com',
    projectId: 'parko-2271f',
    storageBucket: 'parko-2271f.firebasestorage.app',
    messagingSenderId: '69093695651',
    appId: '1:69093695651:web:40f46b7627c4efddbf1f16',
  },
};
