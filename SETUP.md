# Guía de Configuración Local

## Requisitos Previos

- Un navegador web moderno (Chrome, Firefox, Edge, etc.)
- Un servidor HTTP local (ver opciones abajo)
- Credenciales de Firebase (ver instrucciones abajo)

## Pasos de Configuración

### 1. Obtener Credenciales de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Inicia sesión con tu cuenta de Google
3. Crea un nuevo proyecto o selecciona uno existente
4. Ve a **Configuración del proyecto** (⚙️) > **Tus aplicaciones**
5. Si no tienes una app web, haz clic en **"Agregar app"** y selecciona la plataforma **Web** (</>)
6. Copia los valores de configuración que aparecen

### 2. Configurar Variables de Entorno

Tienes dos opciones:

#### Opción A: Usar archivo .env (Recomendado) ✨

1. Copia el archivo de ejemplo:
   ```bash
   # En Windows (PowerShell)
   Copy-Item .env.example .env
   
   # En Linux/Mac
   cp .env.example .env
   ```

2. Edita `.env` y completa con tus credenciales reales:
   ```env
   FIREBASE_API_KEY=AIzaSyC...
   FIREBASE_AUTH_DOMAIN=mi-proyecto.firebaseapp.com
   FIREBASE_PROJECT_ID=mi-proyecto
   FIREBASE_STORAGE_BUCKET=mi-proyecto.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=123456789
   FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

3. Genera `env.js` automáticamente:
   ```bash
   # Con Node.js
   node build-env.js
   
   # O en Windows (doble clic)
   build-env.bat
   ```

#### Opción B: Editar directamente env.js

1. Copia el archivo de ejemplo:
   ```bash
   # En Windows (PowerShell)
   Copy-Item env.example.js env.js
   
   # En Linux/Mac
   cp env.example.js env.js
   ```

2. Edita `env.js` y completa con tus credenciales reales.

### 3. Configurar Firebase Firestore

1. En Firebase Console, ve a **Firestore Database**
2. Crea una base de datos (modo de prueba o producción según prefieras)
3. Asegúrate de que las reglas de seguridad permitan lectura/escritura (solo para desarrollo):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;  // ⚠️ Solo para desarrollo local
       }
     }
   }
   ```

### 4. Ejecutar el Proyecto Localmente

Elige una de estas opciones:

#### Opción A: Python (Recomendado si está instalado)

```bash
# Python 3
python -m http.server 8000

# O Python 2
python -m SimpleHTTPServer 8000
```

Luego abre: `http://localhost:8000`

#### Opción B: Node.js con http-server

```bash
# Instalar globalmente (una sola vez)
npm install -g http-server

# Ejecutar
http-server -p 8000
```

O usar npx (sin instalar):
```bash
npx http-server -p 8000
```

#### Opción C: Live Server (VS Code)

1. Instala la extensión "Live Server" en VS Code
2. Haz clic derecho en `index.html`
3. Selecciona "Open with Live Server"

#### Opción D: PHP (si está instalado)

```bash
php -S localhost:8000
```

### 5. Verificar que Funciona

1. Abre `http://localhost:8000` en tu navegador
2. Abre la consola del navegador (F12)
3. Si ves errores relacionados con Firebase, verifica:
   - Que `env.js` existe y tiene los valores correctos
   - Que las reglas de Firestore permiten acceso
   - Que tu proyecto de Firebase está activo

## Solución de Problemas

### Error: "window.env no está definido"
- Verifica que `env.js` existe en la raíz del proyecto
- Verifica que `index.html` carga `env.js` antes de `app.js`
- Abre la consola del navegador y verifica que `window.env` existe

### Error: "Firebase: Error (auth/...) "
- Verifica que todas las credenciales en `env.js` son correctas
- Verifica que el proyecto de Firebase está activo
- Verifica las reglas de seguridad de Firestore

### Error: "Failed to fetch" o problemas de CORS
- Asegúrate de usar un servidor HTTP local (no abrir el archivo directamente)
- Verifica que el servidor está corriendo en el puerto correcto

## Variables de Entorno Necesarias

| Variable | Descripción | Dónde encontrarla |
|----------|-------------|-------------------|
| `FIREBASE_API_KEY` | Clave API de Firebase | Firebase Console > Configuración > General |
| `FIREBASE_AUTH_DOMAIN` | Dominio de autenticación | Generalmente: `{project-id}.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | ID del proyecto | Nombre de tu proyecto en Firebase |
| `FIREBASE_STORAGE_BUCKET` | Bucket de almacenamiento | Generalmente: `{project-id}.appspot.com` |
| `FIREBASE_MESSAGING_SENDER_ID` | ID del remitente | Firebase Console > Configuración > Cloud Messaging |
| `FIREBASE_APP_ID` | ID de la aplicación | Firebase Console > Configuración > Tus aplicaciones |

## Notas de Seguridad

⚠️ **IMPORTANTE**: 
- Nunca subas `env.js` al repositorio (está en `.gitignore`)
- No compartas tus credenciales de Firebase públicamente
- En producción, considera usar variables de entorno del servidor o un sistema de gestión de secretos
- Las reglas de Firestore mostradas arriba son solo para desarrollo. En producción, implementa reglas de seguridad apropiadas.
