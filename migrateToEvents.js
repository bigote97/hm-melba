/**
 * Script de migración: Convierte datos antiguos (melba-records, current-data) a eventos
 * 
 * USO:
 * 1. Asegúrate de tener configurado env.js con tus credenciales de Firebase
 * 2. Ejecuta: node migrateToEvents.js
 * 
 * El script es idempotente: puede ejecutarse múltiples veces sin duplicar datos
 */

import { FirebaseService } from './firebase-service.js';
import { EventsService } from './eventsService.js';
import { EventFactory, EVENT_TYPES, EVENT_SOURCES } from './eventTypes.js';
import { parseDateString, now } from './dateUtils.js';
import { normalizeWeight, normalizeMedicationName, parseMedicationDose, parseMedicationFrequency, disambiguateWeightOrPrice } from './dataNormalizers.js';
import { Timestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const PET_ID = 'melba';

/**
 * Migra registros de melba-records a eventos
 */
async function migrateRecords() {
    console.log('📦 Iniciando migración de registros...');
    
    try {
        // Obtener todos los registros antiguos
        const oldRecords = await FirebaseService.getAllRecords();
        console.log(`   Encontrados ${oldRecords.length} registros antiguos`);
        
        let created = 0;
        let skipped = 0;
        
        for (const record of oldRecords) {
            // Verificar si ya fue migrado
            const existing = await EventsService.findEventByLegacyId(PET_ID, record.id);
            if (existing) {
                console.log(`   ⏭️  Registro ${record.id} ya migrado, saltando...`);
                skipped++;
                continue;
            }
            
            const occurredAt = parseDateString(record.date) || now();
            const events = [];
            
            // 1. Si tiene peso, crear evento WEIGHT
            if (record.peso) {
                const weightKg = normalizeWeight(record.peso);
                if (weightKg) {
                    events.push(EventFactory.createWeightEvent(weightKg, occurredAt, {
                        source: EVENT_SOURCES.MANUAL,
                        tags: record.keywords || [],
                        notes: `Migrado desde registro ${record.id}`,
                        legacyId: record.id
                    }));
                }
            }
            
            // 2. Si tiene consulta, crear evento VISIT o NOTE
            if (record.consulta) {
                // Determinar si es una visita (tiene médico) o nota
                if (record.medico) {
                    events.push(EventFactory.createVisitEvent(occurredAt, {
                        veterinarian: record.medico,
                        notes: record.consulta,
                        source: EVENT_SOURCES.MANUAL,
                        tags: record.keywords || [],
                        legacyId: record.id
                    }));
                } else {
                    // Es una nota
                    events.push(EventFactory.createNoteEvent(occurredAt, {
                        text: record.consulta,
                        source: EVENT_SOURCES.MANUAL,
                        tags: record.keywords || [],
                        legacyId: record.id
                    }));
                }
            }
            
            // 3. Si tiene vacuna, crear evento MEDICATION o VISIT
            if (record.vacuna) {
                // Si ya creamos un VISIT arriba, agregar la vacuna como nota adicional
                // Si no, crear un evento VISIT con la vacuna
                if (!record.medico && !record.consulta) {
                    events.push(EventFactory.createVisitEvent(occurredAt, {
                        notes: `Vacuna: ${record.vacuna}`,
                        source: EVENT_SOURCES.MANUAL,
                        tags: [...(record.keywords || []), 'vacuna'],
                        legacyId: record.id
                    }));
                } else {
                    // Agregar como tag adicional
                    if (events.length > 0) {
                        events[events.length - 1].tags.push('vacuna');
                        events[events.length - 1].notes += ` | Vacuna: ${record.vacuna}`;
                    }
                }
            }
            
            // Si no se creó ningún evento pero hay keywords, crear al menos un NOTE
            if (events.length === 0 && record.keywords && record.keywords.length > 0) {
                events.push(EventFactory.createNoteEvent(occurredAt, {
                    text: `Registro del ${record.date}`,
                    source: EVENT_SOURCES.MANUAL,
                    tags: record.keywords,
                    legacyId: record.id
                }));
            }
            
            // Guardar eventos
            if (events.length > 0) {
                await EventsService.addEventsBatch(PET_ID, events);
                console.log(`   ✅ Registro ${record.id} migrado → ${events.length} evento(s)`);
                created += events.length;
            } else {
                console.log(`   ⚠️  Registro ${record.id} sin datos migrables`);
                skipped++;
            }
        }
        
        console.log(`\n✅ Migración de registros completada:`);
        console.log(`   - Eventos creados: ${created}`);
        console.log(`   - Registros saltados: ${skipped}`);
        
    } catch (error) {
        console.error('❌ Error en migración de registros:', error);
        throw error;
    }
}

/**
 * Migra medicamentos de current-data/last a eventos MEDICATION
 */
async function migrateMedications() {
    console.log('\n💊 Iniciando migración de medicamentos...');
    
    try {
        const currentData = await FirebaseService.getCurrentData();
        
        if (!currentData || !currentData.medicamentos || currentData.medicamentos.length === 0) {
            console.log('   ℹ️  No hay medicamentos en current-data para migrar');
            return;
        }
        
        console.log(`   Encontrados ${currentData.medicamentos.length} medicamentos`);
        
        let created = 0;
        let skipped = 0;
        
        for (const med of currentData.medicamentos) {
            // Verificar si ya fue migrado
            const legacyId = `medication-${med.nombre}-${med.fechaInicio || 'unknown'}`;
            const existing = await EventsService.findEventByLegacyId(PET_ID, legacyId);
            if (existing) {
                console.log(`   ⏭️  Medicamento ${med.nombre} ya migrado, saltando...`);
                skipped++;
                continue;
            }
            
            // Parsear fechas
            const startAt = med.fechaInicio 
                ? parseDateString(med.fechaInicio) 
                : (currentData.date ? parseDateString(currentData.date) : now());
            
            const endAt = med.fechaFin 
                ? parseDateString(med.fechaFin) 
                : null;
            
            // Parsear dosis e instrucciones
            const dose = parseMedicationDose(med.dosis || med.instrucciones || '');
            const frequencyHours = parseMedicationFrequency(med.instrucciones || '');
            if (frequencyHours) {
                dose.frequencyHours = frequencyHours;
            }
            
            // Crear evento MEDICATION
            const medicationEvent = EventFactory.createMedicationEvent(
                normalizeMedicationName(med.nombre),
                startAt,
                endAt,
                {
                    dose: Object.keys(dose).length > 0 ? dose : undefined,
                    instructions: med.instrucciones,
                    source: EVENT_SOURCES.MANUAL,
                    tags: ['medicación'],
                    notes: `Migrado desde current-data`,
                    legacyId
                }
            );
            
            await EventsService.addEvent(PET_ID, medicationEvent);
            console.log(`   ✅ Medicamento ${med.nombre} migrado`);
            created++;
        }
        
        console.log(`\n✅ Migración de medicamentos completada:`);
        console.log(`   - Medicamentos migrados: ${created}`);
        console.log(`   - Medicamentos saltados: ${skipped}`);
        
    } catch (error) {
        console.error('❌ Error en migración de medicamentos:', error);
        throw error;
    }
}

/**
 * Función principal de migración
 */
async function migrate() {
    console.log('🚀 Iniciando migración completa a modelo de eventos...\n');
    
    try {
        // Inicializar servicios
        await FirebaseService.initialize();
        EventsService.initialize();
        
        console.log('✅ Servicios inicializados\n');
        
        // Migrar registros
        await migrateRecords();
        
        // Migrar medicamentos
        await migrateMedications();
        
        console.log('\n🎉 ¡Migración completada exitosamente!');
        console.log('\n📝 Próximos pasos:');
        console.log('   1. Verifica los eventos en Firebase Console');
        console.log('   2. Actualiza la UI para usar EventsService');
        console.log('   3. Una vez verificado, puedes eliminar los datos antiguos');
        
    } catch (error) {
        console.error('\n❌ Error fatal en migración:', error);
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    migrate();
}

export { migrate, migrateRecords, migrateMedications };
