# Guía de Migración al Modelo de Eventos

## Resumen

Este proyecto ha sido refactorizado de un modelo basado en "registros" genéricos a un **modelo basado en eventos tipados**. Esta guía te ayudará a migrar tus datos existentes.

## ¿Qué cambió?

### Antes (Modelo Antiguo)
- Colección `melba-records` con registros genéricos
- Colección `current-data/last` con medicamentos en array
- Fechas como strings ("12/02/25")
- Campos opcionales genéricos

### Ahora (Modelo Nuevo)
- Colección `pets/{petId}/events` con eventos tipados
- Fechas como Timestamps de Firestore
- Payloads específicos por tipo de evento
- Estado actual derivado de eventos (no almacenado)

## Pasos para Migrar

### 1. Preparación

Asegúrate de tener:
- ✅ Firebase configurado (`env.js` con credenciales)
- ✅ Firestore habilitado en Firebase Console
- ✅ Reglas de Firestore que permitan lectura/escritura (para desarrollo)

### 2. Ejecutar Migración

**Opción A: Desde el navegador (Recomendado)**

1. Abre `migrate.html` en tu navegador (con servidor local)
2. Haz clic en "Iniciar Migración"
3. Observa el log de progreso
4. Verifica los resultados

**Opción B: Desde Node.js**

```bash
node migrateToEvents.js
```

### 3. Verificar Migración

1. Ve a Firebase Console > Firestore Database
2. Verifica que existe la colección `pets/melba/events`
3. Revisa algunos eventos para confirmar que se migraron correctamente

### 4. Actualizar la Aplicación

La aplicación detecta automáticamente qué modelo usar:

- Si hay eventos → Usa modelo nuevo
- Si solo hay registros antiguos → Usa modelo antiguo (compatibilidad)

Para forzar el uso del nuevo modelo, actualiza `index.html`:

```html
<!-- Cambiar de: -->
<script type="module" src="app.js"></script>

<!-- A: -->
<script type="module" src="app-events.js"></script>
```

## Qué se Migra

### Registros → Eventos

- **Peso** → Evento `WEIGHT`
- **Consulta con médico** → Evento `VISIT`
- **Consulta sin médico** → Evento `NOTE`
- **Vacuna** → Se agrega como tag o evento `VISIT`
- **Keywords** → Se convierten en `tags`

### Medicamentos → Eventos MEDICATION

- Cada medicamento en `current-data/last.medicamentos[]` → Evento `MEDICATION`
- `fechaInicio` → `startAt` (Timestamp)
- `fechaFin` → `endAt` (Timestamp, null si activa)
- `instrucciones` → Se parsean para extraer frecuencia/dosis

## Idempotencia

El script de migración es **idempotente**: puedes ejecutarlo múltiples veces sin duplicar datos.

Usa el campo `legacyId` para evitar duplicados:
- Registros antiguos: `legacyId = record.id`
- Medicamentos: `legacyId = "medication-{nombre}-{fechaInicio}"`

## Después de la Migración

### Verificar Datos

1. Compara el número de eventos con registros antiguos
2. Verifica que los pesos se normalizaron correctamente
3. Confirma que las medicaciones activas se muestran correctamente

### Limpiar Datos Antiguos (Opcional)

⚠️ **Solo después de verificar que todo funciona:**

Puedes eliminar las colecciones antiguas desde Firebase Console:
- `melba-records` (opcional, mantener como backup)
- `current-data` (opcional, mantener como backup)

**Recomendación:** Mantén los datos antiguos como backup durante algunas semanas.

## Solución de Problemas

### "No se encontraron eventos"

- Verifica que la migración se completó
- Revisa la consola del navegador para errores
- Verifica las reglas de Firestore

### "Eventos duplicados"

- El script debería evitar duplicados automáticamente
- Si hay duplicados, verifica que `legacyId` se está usando correctamente
- Puedes eliminar duplicados manualmente desde Firebase Console

### "Fechas incorrectas"

- Verifica que las fechas antiguas estaban en formato "dd/mm/aa"
- Revisa `dateUtils.js` para el parsing de fechas

### "Pesos no se normalizaron"

- Revisa `dataNormalizers.js` para la lógica de normalización
- Algunos formatos pueden requerir ajustes manuales

## Próximos Pasos

1. ✅ Migrar datos
2. ✅ Verificar eventos en Firebase
3. ✅ Actualizar UI para usar `app-events.js`
4. ⏳ Agregar formularios para crear nuevos eventos tipados
5. ⏳ Implementar recordatorios desde medicaciones
6. ⏳ Agregar soporte para adjuntos (imágenes/PDFs)

## Soporte

Si encuentras problemas durante la migración:

1. Revisa los logs en `migrate.html`
2. Verifica la consola del navegador
3. Consulta `ARCHITECTURE.md` para entender la estructura
4. Revisa los archivos de utilidades (`dateUtils.js`, `dataNormalizers.js`)
