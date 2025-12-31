// ⚠️ ESTE ARCHIVO ES SOLO UN EJEMPLO
// 
// Para usar variables de entorno tradicionales (.env):
// 1. Crea un archivo .env basado en .env.example
// 2. Ejecuta: node build-env.js (o build-env.bat en Windows)
// 3. Esto generará automáticamente env.js desde tu .env
//
// Si prefieres editar directamente este archivo:
// 1. Copia este archivo como env.js
// 2. Completa con tus valores reales de Firebase

window.env = {
    FIREBASE_API_KEY: 'your-api-key-here',
    FIREBASE_AUTH_DOMAIN: 'your-project-id.firebaseapp.com',
    FIREBASE_PROJECT_ID: 'your-project-id',
    FIREBASE_STORAGE_BUCKET: 'your-project-id.appspot.com',
    FIREBASE_MESSAGING_SENDER_ID: 'your-messaging-sender-id',
    FIREBASE_APP_ID: 'your-app-id'
};
