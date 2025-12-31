# Arquitectura del Sistema - Modelo Basado en Eventos

## Visión General

El sistema ha sido refactorizado de un modelo basado en "registros" genéricos a un modelo basado en **eventos tipados**, lo que permite:

- ✅ Escalabilidad: Fácil agregar nuevos tipos de eventos
- ✅ Consistencia: Datos estructurados y validados
- ✅ Consultabilidad: Timeline ordenado por `occurredAt`
- ✅ Trazabilidad: Cada evento tiene metadata (cuándo se creó, quién, fuente)
- ✅ Flexibilidad: Payloads específicos por tipo de evento

## Estructura de Datos

### Modelo Antiguo (Deprecado)

```
melba-records/
  {recordId}/
    date: "12/02/25" (string)
    consulta: string
    medico: string
    vacuna: string
    peso: "20 kg" (string)
    keywords: string[]

current-data/
  last/
    peso: string
    date: string
    medicamentos: Array<{
      nombre: string
      fechaInicio: string
      fechaFin: string
      instrucciones: string
    }>
```

**Problemas:**
- Fechas como strings → difícil ordenar/consultar
- Campos opcionales genéricos → difícil validar/escalar
- Medicamentos en array separado → difícil historial
- Ambigüedad peso vs precio

### Modelo Nuevo (Eventos)

```
pets/
  {petId}/  # default: "melba"
    events/
      {eventId}/
        type: "WEIGHT" | "MEDICATION" | "VISIT" | "LAB" | ...
        occurredAt: Timestamp
        createdAt: Timestamp
        createdBy: string
        source: "whatsapp" | "manual" | "vet"
        tags: string[]
        notes: string
        attachments: Array<{type, url, caption}>
        data: object  # Payload específico según type
        legacyId?: string  # Para migración
```

## Tipos de Eventos

### WEIGHT
```javascript
{
  type: "WEIGHT",
  data: {
    weightKg: 19.6,  // Siempre número
    method?: string,
    place?: string
  }
}
```

### MEDICATION (Prescripción)
```javascript
{
  type: "MEDICATION",
  data: {
    name: "Pregabalina",
    dose?: {
      amountMg?: 80,
      amount?: 1,
      unit?: "comprimidos",
      frequencyHours?: 12,
      form?: "comprimido"
    },
    startAt: Timestamp,
    endAt: Timestamp | null,  // null = activa
    instructions?: string,
    indication?: string
  }
}
```

### DOSE (Administración puntual)
```javascript
{
  type: "DOSE",
  data: {
    medicationName: "Dipirona+Tramadol",
    amount?: "1",
    unit?: "comprimido",
    timeHint?: "8a.m."
  }
}
```

### VISIT (Consulta veterinaria)
```javascript
{
  type: "VISIT",
  data: {
    veterinarian?: string,
    clinic?: string,
    reason?: string,
    diagnosis?: string,
    treatment?: string
  }
}
```

### LAB (Laboratorio)
```javascript
{
  type: "LAB",
  data: {
    test: "COPRO" | "ORINA" | "SANGRE" | string,
    result: "POSITIVE" | "NEGATIVE" | "UNKNOWN" | string,
    findings?: string[]
  }
}
```

### IMAGING (Estudios de imagen)
```javascript
{
  type: "IMAGING",
  data: {
    study: "ECO_ABDOMINAL" | string,
    summary: string,
    structured?: object
  }
}
```

### FOOD (Alimentación)
```javascript
{
  type: "FOOD",
  data: {
    kind: "RECIPE" | "RATION",
    ingredients: Array<{
      name: string,
      grams?: number,
      ml?: number,
      notes?: string
    }>
  }
}
```

### GROOMING (Aseo)
```javascript
{
  type: "GROOMING",
  data: {
    service: "BAÑO" | string,
    place?: string,
    priceArs?: number
  }
}
```

### PURCHASE (Compras)
```javascript
{
  type: "PURCHASE",
  data: {
    item: string,
    priceArs?: number
  }
}
```

### NOTE (Notas/Observaciones)
```javascript
{
  type: "NOTE",
  data: {
    symptoms?: string[],
    severity?: "mild" | "moderate" | "severe",
    text?: string
  }
}
```

## Servicios

### EventsService

Servicio principal para CRUD de eventos:

```javascript
// Inicializar
EventsService.initialize();

// Crear evento
const eventId = await EventsService.addEvent('melba', event);

// Listar eventos
const events = await EventsService.listEvents('melba', {
  from: Timestamp,
  to: Timestamp,
  types: ['WEIGHT', 'MEDICATION'],
  limit: 100
});

// Obtener último peso
const latestWeight = await EventsService.getLatestWeight('melba');

// Obtener medicaciones activas
const activeMeds = await EventsService.getActiveMedications('melba');
```

### Utilidades

- **dateUtils.js**: Conversión entre strings, Dates y Timestamps
- **dataNormalizers.js**: Normalización de pesos, precios, dosis, etc.
- **eventTypes.js**: Definiciones de tipos y factory methods

## Migración

El script `migrateToEvents.js` convierte datos antiguos a eventos:

1. **Registros** → Eventos WEIGHT, VISIT, NOTE según contenido
2. **Medicamentos** → Eventos MEDICATION con startAt/endAt
3. **Idempotente**: Usa `legacyId` para evitar duplicados

### Ejecutar migración

```bash
# En el navegador (abrir migrate.html)
# O desde Node.js si se adapta el script
node migrateToEvents.js
```

## Current Status (Derivado)

El "estado actual" se deriva de eventos, no se almacena:

- **Peso actual**: Último evento WEIGHT
- **Medicaciones activas**: Eventos MEDICATION con `endAt === null` o `endAt >= now`
- **Próximos recordatorios**: Calculados desde medicaciones con `frequencyHours`

## Compatibilidad

Durante la transición, la app detecta automáticamente qué modelo usar:

- Si hay eventos → Usa modelo nuevo
- Si solo hay registros antiguos → Usa modelo antiguo
- Ambos pueden coexistir temporalmente

## Ventajas del Nuevo Modelo

1. **Timeline consistente**: Todos los eventos ordenados por `occurredAt`
2. **Tipado fuerte**: Cada tipo tiene su estructura validada
3. **Búsquedas eficientes**: Filtros por tipo, fecha, tags
4. **Historial completo**: Medicaciones, dosis, visitas en un solo timeline
5. **Escalable**: Agregar nuevos tipos es solo definir el payload
6. **Sin ambigüedades**: Peso siempre en kg, precio siempre en ARS

## Próximos Pasos

- [ ] UI completa para crear eventos tipados
- [ ] Soporte para adjuntos (imágenes/PDFs)
- [ ] Recordatorios automáticos desde medicaciones
- [ ] Exportación de datos
- [ ] Dashboard con estadísticas
