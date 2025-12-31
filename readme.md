# Historial Médico de Melba

Este proyecto es una aplicación web diseñada para visualizar y gestionar el historial médico de Melba, una perra, de manera organizada y accesible.

## 🆕 Modelo Basado en Eventos

El proyecto ha sido refactorizado a un **modelo basado en eventos tipados** para mayor escalabilidad y consistencia.

### Documentación

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Arquitectura y estructura del nuevo modelo
- **[MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md)**: Guía paso a paso para migrar datos antiguos

### Características del Nuevo Modelo

- ✅ **Eventos tipados**: WEIGHT, MEDICATION, VISIT, LAB, IMAGING, FOOD, GROOMING, PURCHASE, NOTE
- ✅ **Timeline consistente**: Todos los eventos ordenados por `occurredAt` (Timestamp)
- ✅ **Estado derivado**: Peso actual y medicaciones activas calculados desde eventos
- ✅ **Escalable**: Fácil agregar nuevos tipos de eventos
- ✅ **Sin ambigüedades**: Peso siempre en kg, precios siempre en ARS

### Migración

Si tienes datos antiguos, ejecuta la migración:

1. Abre `migrate.html` en tu navegador
2. Haz clic en "Iniciar Migración"
3. Verifica los resultados en Firebase Console

Ver [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md) para más detalles.

## Características

- **Visualización cronológica**: Muestra las consultas médicas, tratamientos, vacunas y registros de peso de Melba en orden cronológico.
- **Sistema de filtros avanzado**: 
  - Búsqueda por texto en médicos, keywords y vacunas
  - Filtrado por rango de fechas
  - Filtrado por médico veterinario
  - Filtrado por keywords específicas
- **Interfaz moderna y responsiva**: Diseño adaptable a diferentes dispositivos, asegurando una experiencia de usuario óptima tanto en computadoras de escritorio como en dispositivos móviles.

## Tecnologías Utilizadas

- **HTML5**: Estructura de la aplicación.
- **CSS3**: Estilos y diseño responsivo.
- **JavaScript**: Manejo de la lógica de filtrado y dinámicas de la interfaz.
- **JSON**: Almacenamiento de los datos del historial médico.

## Estructura de Datos

Los registros médicos se almacenan en formato JSON con la siguiente estructura:

```json
{
  "date": "2023-01-24",
  "consulta": "Control rutinario",
  "medico": "Dr. Ejemplo",
  "vacuna": "Antirrábica",
  "peso": "15kg",
  "keywords": ["control", "vacunación"]
}
```

## Instalación y Uso

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/bigote97/hm-melba.git
   cd hm-melba
   ```

2. **Configurar variables de entorno**:
   
   Este proyecto utiliza Firebase para almacenar los datos. Necesitas configurar las credenciales de Firebase:
   
   a. Obtén tus credenciales de Firebase:
      - Ve a [Firebase Console](https://console.firebase.google.com/)
      - Selecciona tu proyecto (o crea uno nuevo)
      - Ve a Configuración del proyecto (⚙️) > Tus aplicaciones
      - Si no tienes una app web, haz clic en "Agregar app" y selecciona la plataforma web
      - Copia los valores de configuración
   
   b. Configura las variables de entorno (dos opciones):
      
      **Opción 1: Usando archivo .env (Recomendado)**
      ```bash
      # Copia el archivo de ejemplo
      cp .env.example .env
      
      # Edita .env con tus credenciales reales
      # Luego genera env.js automáticamente:
      node build-env.js
      
      # O en Windows:
      build-env.bat
      ```
      
      **Opción 2: Editar directamente env.js**
      ```bash
      # Copia el archivo de ejemplo
      cp env.example.js env.js
      
      # Edita env.js y completa con tus valores reales
      ```
   
   ⚠️ **Importante**: Los archivos `.env` y `env.js` están en `.gitignore` y no se subirán al repositorio. Nunca compartas tus credenciales de Firebase.

3. **Configuración del servidor local**:
   
   Como esta aplicación usa módulos ES6, necesitas un servidor local. Puedes usar cualquiera de estas opciones:
   
   **Opción 1: Python (si está instalado)**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```
   
   **Opción 2: Node.js con http-server**
   ```bash
   npx http-server -p 8000
   ```
   
   **Opción 3: Live Server (extensión de VS Code)**
   - Instala la extensión "Live Server" en VS Code
   - Haz clic derecho en `index.html` y selecciona "Open with Live Server"

4. **Acceder a la aplicación**:
   - Abre tu navegador y visita `http://localhost:8000`
   - La aplicación se conectará a Firebase y cargará los registros médicos
   - Utiliza los filtros para buscar registros específicos
   - Visualiza el historial médico completo

## Contribuciones

Las contribuciones son bienvenidas. Si deseas mejorar este proyecto:

1. Haz un fork del repositorio.
2. Crea una nueva rama para tu característica o corrección (`git checkout -b feature/nueva-caracteristica`).
3. Realiza tus cambios y haz commit (`git commit -m 'Descripción de los cambios'`).
4. Sube tus cambios al repositorio (`git push origin feature/nueva-caracteristica`).
5. Abre un Pull Request detallando tus modificaciones.

### Guía de Contribución

- Asegúrate de que tu código sigue los estándares de estilo existentes
- Incluye comentarios cuando sea necesario
- Actualiza la documentación si agregas nuevas características
- Verifica que todos los filtros funcionan correctamente
- Prueba la responsividad en diferentes dispositivos

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.

## Agradecimientos

- A todos los veterinarios que han cuidado de Melba
- A la comunidad de desarrolladores por las herramientas y librerías utilizadas

---
Desarrollado con ❤️ para mantener saludable a Melba

    