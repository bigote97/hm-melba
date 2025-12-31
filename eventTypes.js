/**
 * Definiciones de tipos de eventos para el historial médico
 * Modelo basado en eventos tipados para escalabilidad
 */

// Tipos de eventos disponibles
export const EVENT_TYPES = {
    WEIGHT: 'WEIGHT',
    MEDICATION: 'MEDICATION',
    DOSE: 'DOSE',
    VISIT: 'VISIT',
    LAB: 'LAB',
    IMAGING: 'IMAGING',
    FOOD: 'FOOD',
    GROOMING: 'GROOMING',
    PURCHASE: 'PURCHASE',
    NOTE: 'NOTE'
};

// Fuentes de datos
export const EVENT_SOURCES = {
    WHATSAPP: 'whatsapp',
    MANUAL: 'manual',
    VET: 'vet'
};

/**
 * Estructura base de un evento
 * @typedef {Object} Event
 * @property {string} id - ID del documento en Firestore
 * @property {string} type - Tipo de evento (EVENT_TYPES)
 * @property {FirebaseFirestore.Timestamp} occurredAt - Cuándo ocurrió el evento
 * @property {FirebaseFirestore.Timestamp} createdAt - Cuándo se creó el registro
 * @property {string} createdBy - UID del usuario que creó el evento
 * @property {string} source - Fuente del evento (EVENT_SOURCES)
 * @property {string[]} tags - Tags para búsqueda/filtrado
 * @property {string} notes - Notas adicionales
 * @property {Attachment[]} attachments - Archivos adjuntos
 * @property {Object} data - Payload específico según el tipo
 * @property {string} [legacyId] - ID del registro antiguo (para migración)
 */

/**
 * @typedef {Object} Attachment
 * @property {string} type - 'image' | 'pdf' | 'audio'
 * @property {string} url - URL del archivo
 * @property {string} [caption] - Descripción opcional
 */

/**
 * Payloads específicos por tipo de evento
 */

/**
 * @typedef {Object} WeightEventData
 * @property {number} weightKg - Peso en kilogramos
 * @property {string} [method] - Método de medición
 * @property {string} [place] - Lugar de medición
 */

/**
 * @typedef {Object} MedicationDose
 * @property {number} [amountMg] - Cantidad en miligramos
 * @property {number} [amount] - Cantidad numérica
 * @property {string} [unit] - Unidad (mg, ml, comprimidos, etc.)
 * @property {number} [frequencyHours] - Frecuencia en horas
 * @property {string} [form] - Forma (comprimido, líquido, etc.)
 * @property {string} [fraction] - Fracción (1/2, 1/4, etc.)
 */

/**
 * @typedef {Object} MedicationEventData
 * @property {string} name - Nombre del medicamento
 * @property {MedicationDose} [dose] - Información de dosis
 * @property {FirebaseFirestore.Timestamp} startAt - Inicio de la prescripción
 * @property {FirebaseFirestore.Timestamp|null} endAt - Fin de la prescripción (null si activa)
 * @property {string} [instructions] - Instrucciones adicionales
 * @property {string} [indication] - Indicación médica
 */

/**
 * @typedef {Object} DoseEventData
 * @property {string} medicationName - Nombre del medicamento administrado
 * @property {number|string} [amount] - Cantidad administrada
 * @property {string} [unit] - Unidad
 * @property {string} [timeHint] - Pista de hora (ej: "8a.m.")
 */

/**
 * @typedef {Object} LabEventData
 * @property {string} test - Tipo de prueba ('COPRO' | 'ORINA' | 'SANGRE' | string)
 * @property {string} result - Resultado ('POSITIVE' | 'NEGATIVE' | 'UNKNOWN' | string)
 * @property {string[]} [findings] - Hallazgos específicos
 */

/**
 * @typedef {Object} ImagingEventData
 * @property {string} study - Tipo de estudio ('ECO_ABDOMINAL' | string)
 * @property {string} summary - Resumen del estudio
 * @property {Object} [structured] - Datos estructurados adicionales
 */

/**
 * @typedef {Object} FoodIngredient
 * @property {string} name - Nombre del ingrediente
 * @property {number} [grams] - Cantidad en gramos
 * @property {number} [ml] - Cantidad en mililitros
 * @property {string} [notes] - Notas adicionales
 */

/**
 * @typedef {Object} FoodEventData
 * @property {string} kind - Tipo ('RECIPE' | 'RATION')
 * @property {FoodIngredient[]} ingredients - Lista de ingredientes
 */

/**
 * @typedef {Object} GroomingEventData
 * @property {string} service - Servicio ('BAÑO' | string)
 * @property {string} [place] - Lugar
 * @property {number} [priceArs] - Precio en ARS
 */

/**
 * @typedef {Object} PurchaseEventData
 * @property {string} item - Item comprado
 * @property {number} [priceArs] - Precio en ARS
 */

/**
 * @typedef {Object} VisitEventData
 * @property {string} [veterinarian] - Nombre del veterinario
 * @property {string} [clinic] - Clínica
 * @property {string} [reason] - Motivo de la visita
 * @property {string} [diagnosis] - Diagnóstico
 * @property {string} [treatment] - Tratamiento indicado
 */

/**
 * @typedef {Object} NoteEventData
 * @property {string[]} [symptoms] - Síntomas observados
 * @property {string} [severity] - Severidad ('mild' | 'moderate' | 'severe')
 * @property {string} [text] - Texto libre
 */

/**
 * Factory para crear eventos con validación básica
 */
export class EventFactory {
    /**
     * Crea un evento WEIGHT
     */
    static createWeightEvent(weightKg, occurredAt, options = {}) {
        return {
            type: EVENT_TYPES.WEIGHT,
            occurredAt,
            createdAt: options.createdAt || occurredAt,
            createdBy: options.createdBy || 'system',
            source: options.source || EVENT_SOURCES.MANUAL,
            tags: options.tags || [],
            notes: options.notes || '',
            attachments: options.attachments || [],
            data: {
                weightKg: parseFloat(weightKg),
                method: options.method,
                place: options.place
            }
        };
    }

    /**
     * Crea un evento MEDICATION
     */
    static createMedicationEvent(name, startAt, endAt, options = {}) {
        return {
            type: EVENT_TYPES.MEDICATION,
            occurredAt: startAt,
            createdAt: options.createdAt || startAt,
            createdBy: options.createdBy || 'system',
            source: options.source || EVENT_SOURCES.MANUAL,
            tags: options.tags || [],
            notes: options.notes || '',
            attachments: options.attachments || [],
            data: {
                name: name.trim(),
                dose: options.dose,
                startAt,
                endAt: endAt || null,
                instructions: options.instructions,
                indication: options.indication
            }
        };
    }

    /**
     * Crea un evento VISIT
     */
    static createVisitEvent(occurredAt, options = {}) {
        return {
            type: EVENT_TYPES.VISIT,
            occurredAt,
            createdAt: options.createdAt || occurredAt,
            createdBy: options.createdBy || 'system',
            source: options.source || EVENT_SOURCES.MANUAL,
            tags: options.tags || [],
            notes: options.notes || '',
            attachments: options.attachments || [],
            data: {
                veterinarian: options.veterinarian,
                clinic: options.clinic,
                reason: options.reason,
                diagnosis: options.diagnosis,
                treatment: options.treatment
            }
        };
    }

    /**
     * Crea un evento NOTE
     */
    static createNoteEvent(occurredAt, options = {}) {
        return {
            type: EVENT_TYPES.NOTE,
            occurredAt,
            createdAt: options.createdAt || occurredAt,
            createdBy: options.createdBy || 'system',
            source: options.source || EVENT_SOURCES.MANUAL,
            tags: options.tags || [],
            notes: options.notes || '',
            attachments: options.attachments || [],
            data: {
                symptoms: options.symptoms || [],
                severity: options.severity,
                text: options.text || ''
            }
        };
    }

    /**
     * Crea un evento LAB
     */
    static createLabEvent(test, result, occurredAt, options = {}) {
        return {
            type: EVENT_TYPES.LAB,
            occurredAt,
            createdAt: options.createdAt || occurredAt,
            createdBy: options.createdBy || 'system',
            source: options.source || EVENT_SOURCES.MANUAL,
            tags: options.tags || [],
            notes: options.notes || '',
            attachments: options.attachments || [],
            data: {
                test,
                result,
                findings: options.findings || []
            }
        };
    }
}
