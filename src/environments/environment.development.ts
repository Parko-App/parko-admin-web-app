// Desarrollo (ng serve). apiUrl es relativo: proxy.conf.json lo redirige a http://localhost:8080.
// useMocks: true -> login y datos simulados (sin backend). Ponelo en false para probar contra Firebase y la API real.
export const environment = {
  production: false,
  apiUrl: '/api/v1',
  // Capacidad total del estacionamiento (base de los porcentajes de ocupación). PROVISORIO: el backend no la informa.
  parkingCapacity: 247,
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
