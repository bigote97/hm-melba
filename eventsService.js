/**
 * Servicio para manejo de eventos del historial médico
 * Acceso a Firestore con modelo basado en eventos
 */

import { 
    getFirestore,
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    writeBatch
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { FirebaseService } from './firebase-service.js';
import { now, compareTimestamps } from './dateUtils.js';
import { EVENT_TYPES } from './eventTypes.js';

const DEFAULT_PET_ID = 'melba';
const EVENTS_COLLECTION = 'events';

export class EventsService {
    static db;
    
    /**
     * Inicializa el servicio (debe llamarse después de FirebaseService.initialize())
     */
    static initialize() {
        if (!FirebaseService.db) {
            throw new Error('FirebaseService debe estar inicializado primero');
        }
        this.db = FirebaseService.db;
    }
    
    /**
     * Obtiene la referencia a la colección de eventos de una mascota
     * @param {string} petId - ID de la mascota (default: 'melba')
     * @returns {CollectionReference}
     */
    static getEventsCollection(petId = DEFAULT_PET_ID) {
        if (!this.db) {
            throw new Error('EventsService no está inicializado. Llama a EventsService.initialize() primero.');
        }
        return collection(this.db, 'pets', petId, EVENTS_COLLECTION);
    }
    
    /**
     * Crea un nuevo evento
     * @param {string} petId - ID de la mascota
     * @param {Object} event - Objeto evento (sin id)
     * @returns {Promise<string>} - ID del evento creado
     */
    static async addEvent(petId, event) {
        try {
            // Asegurar que tiene timestamps
            if (!event.createdAt) {
                event.createdAt = now();
            }
            if (!event.occurredAt) {
                event.occurredAt = event.createdAt;
            }
            
            // Convertir fechas a Timestamp si vienen como Date
            if (event.createdAt instanceof Date) {
                event.createdAt = Timestamp.fromDate(event.createdAt);
            }
            if (event.occurredAt instanceof Date) {
                event.occurredAt = Timestamp.fromDate(event.occurredAt);
            }
            
            // Asegurar campos requeridos
            event.createdBy = event.createdBy || 'system';
            event.source = event.source || 'manual';
            event.tags = event.tags || [];
            event.attachments = event.attachments || [];
            
            // Limpiar campos undefined antes de guardar
            const cleanedEvent = this.removeUndefinedFields(event);
            
            const eventsRef = this.getEventsCollection(petId);
            const docRef = await addDoc(eventsRef, cleanedEvent);
            
            return docRef.id;
        } catch (error) {
            console.error('Error al crear evento:', error);
            throw error;
        }
    }
    
    /**
     * Actualiza un evento existente
     * @param {string} petId - ID de la mascota
     * @param {string} eventId - ID del evento
     * @param {Object} patch - Campos a actualizar
     * @returns {Promise<void>}
     */
    static async updateEvent(petId, eventId, patch) {
        try {
            const eventRef = doc(this.getEventsCollection(petId), eventId);
            
            // Convertir fechas a Timestamp si vienen como Date
            const updateData = { ...patch };
            if (updateData.occurredAt instanceof Date) {
                updateData.occurredAt = Timestamp.fromDate(updateData.occurredAt);
            }
            if (updateData.createdAt instanceof Date) {
                updateData.createdAt = Timestamp.fromDate(updateData.createdAt);
            }
            
            // Limpiar campos undefined antes de actualizar
            const cleanedData = this.removeUndefinedFields(updateData);
            
            await updateDoc(eventRef, cleanedData);
        } catch (error) {
            console.error('Error al actualizar evento:', error);
            throw error;
        }
    }
    
    /**
     * Elimina un evento
     * @param {string} petId - ID de la mascota
     * @param {string} eventId - ID del evento
     * @returns {Promise<void>}
     */
    static async deleteEvent(petId, eventId) {
        try {
            const eventRef = doc(this.getEventsCollection(petId), eventId);
            await deleteDoc(eventRef);
        } catch (error) {
            console.error('Error al eliminar evento:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene un evento por ID
     * @param {string} petId - ID de la mascota
     * @param {string} eventId - ID del evento
     * @returns {Promise<Object|null>}
     */
    static async getEvent(petId, eventId) {
        try {
            const eventRef = doc(this.getEventsCollection(petId), eventId);
            const eventSnap = await getDoc(eventRef);
            
            if (eventSnap.exists()) {
                return {
                    id: eventSnap.id,
                    ...eventSnap.data()
                };
            }
            
            return null;
        } catch (error) {
            console.error('Error al obtener evento:', error);
            throw error;
        }
    }
    
    /**
     * Lista eventos con filtros
     * @param {string} petId - ID de la mascota
     * @param {Object} options - Opciones de filtrado
     * @param {Timestamp|Date} [options.from] - Fecha desde
     * @param {Timestamp|Date} [options.to] - Fecha hasta
     * @param {string[]} [options.types] - Tipos de eventos a filtrar
     * @param {number} [options.limit] - Límite de resultados
     * @param {string} [options.orderBy] - Campo para ordenar (default: 'occurredAt')
     * @param {string} [options.orderDirection] - 'asc' o 'desc' (default: 'desc')
     * @returns {Promise<Object[]>}
     */
    static async listEvents(petId = DEFAULT_PET_ID, options = {}) {
        try {
            const eventsRef = this.getEventsCollection(petId);
            let q = query(eventsRef);
            
            // Filtrar por rango de fechas
            if (options.from) {
                const fromTs = options.from instanceof Timestamp 
                    ? options.from 
                    : Timestamp.fromDate(new Date(options.from));
                q = query(q, where('occurredAt', '>=', fromTs));
            }
            
            if (options.to) {
                const toTs = options.to instanceof Timestamp 
                    ? options.to 
                    : Timestamp.fromDate(new Date(options.to));
                q = query(q, where('occurredAt', '<=', toTs));
            }
            
            // Filtrar por tipos
            if (options.types && options.types.length > 0) {
                q = query(q, where('type', 'in', options.types));
            }
            
            // Ordenar
            const orderField = options.orderBy || 'occurredAt';
            const orderDir = options.orderDirection || 'desc';
            q = query(q, orderBy(orderField, orderDir));
            
            // Límite
            if (options.limit) {
                q = query(q, limit(options.limit));
            }
            
            const querySnapshot = await getDocs(q);
            
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error al listar eventos:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene el último registro de peso
     * @param {string} petId - ID de la mascota
     * @returns {Promise<Object|null>}
     */
    static async getLatestWeight(petId = DEFAULT_PET_ID) {
        try {
            const events = await this.listEvents(petId, {
                types: [EVENT_TYPES.WEIGHT],
                limit: 1
            });
            
            return events.length > 0 ? events[0] : null;
        } catch (error) {
            console.error('Error al obtener último peso:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene medicaciones activas (sin endAt o endAt >= ahora)
     * @param {string} petId - ID de la mascota
     * @param {Timestamp|Date} [now] - Tiempo de referencia (default: ahora)
     * @returns {Promise<Object[]>}
     */
    static async getActiveMedications(petId = DEFAULT_PET_ID, nowTime = null) {
        try {
            const nowTs = nowTime 
                ? (nowTime instanceof Timestamp ? nowTime : Timestamp.fromDate(new Date(nowTime)))
                : now();
            
            // Obtener todas las medicaciones
            const allMedications = await this.listEvents(petId, {
                types: [EVENT_TYPES.MEDICATION]
            });
            
            // Filtrar las activas
            return allMedications.filter(med => {
                // Si no tiene endAt, está activa
                if (!med.data?.endAt) {
                    return true;
                }
                
                // Si endAt es mayor o igual a ahora, está activa
                const endAt = med.data.endAt;
                return compareTimestamps(endAt, nowTs) >= 0;
            });
        } catch (error) {
            console.error('Error al obtener medicaciones activas:', error);
            throw error;
        }
    }
    
    /**
     * Elimina campos undefined de un objeto (Firestore no los acepta)
     * @param {Object} obj - Objeto a limpiar
     * @returns {Object} - Objeto sin campos undefined
     */
    static removeUndefinedFields(obj) {
        if (obj === null || obj === undefined) {
            return obj;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.removeUndefinedFields(item));
        }
        
        if (typeof obj !== 'object') {
            return obj;
        }
        
        const cleaned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                if (value !== undefined) {
                    cleaned[key] = this.removeUndefinedFields(value);
                }
            }
        }
        return cleaned;
    }
    
    /**
     * Crea múltiples eventos en batch (útil para migraciones)
     * @param {string} petId - ID de la mascota
     * @param {Object[]} events - Array de eventos
     * @returns {Promise<void>}
     */
    static async addEventsBatch(petId, events) {
        try {
            const batch = writeBatch(this.db);
            const eventsRef = this.getEventsCollection(petId);
            
            events.forEach(event => {
                // Asegurar timestamps
                if (!event.createdAt) {
                    event.createdAt = now();
                }
                if (!event.occurredAt) {
                    event.occurredAt = event.createdAt;
                }
                
                // Convertir fechas
                if (event.createdAt instanceof Date) {
                    event.createdAt = Timestamp.fromDate(event.createdAt);
                }
                if (event.occurredAt instanceof Date) {
                    event.occurredAt = Timestamp.fromDate(event.occurredAt);
                }
                
                event.createdBy = event.createdBy || 'system';
                event.source = event.source || 'manual';
                event.tags = event.tags || [];
                event.attachments = event.attachments || [];
                
                // Limpiar campos undefined antes de guardar
                const cleanedEvent = this.removeUndefinedFields(event);
                
                const docRef = doc(eventsRef);
                batch.set(docRef, cleanedEvent);
            });
            
            await batch.commit();
        } catch (error) {
            console.error('Error al crear eventos en batch:', error);
            throw error;
        }
    }
    
    /**
     * Verifica si existe un evento con un legacyId (para evitar duplicados en migración)
     * @param {string} petId - ID de la mascota
     * @param {string} legacyId - ID del registro antiguo
     * @returns {Promise<Object|null>}
     */
    static async findEventByLegacyId(petId, legacyId) {
        try {
            const events = await this.listEvents(petId, { limit: 1000 }); // Buscar en los últimos 1000
            return events.find(e => e.legacyId === legacyId) || null;
        } catch (error) {
            console.error('Error al buscar evento por legacyId:', error);
            return null;
        }
    }
}
