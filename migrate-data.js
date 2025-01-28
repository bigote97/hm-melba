import { FirebaseService } from './firebase-service.js';
import { db } from './firebase-config.js';
import { collection, setDoc, doc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

async function migrateData() {
    try {
        // Migrar registros históricos
        const recordsResponse = await fetch('./melba_records.json');
        const records = await recordsResponse.json();
        
        console.log(`Migrando ${records.length} registros históricos...`);
        
        for (const record of records) {
            await FirebaseService.saveRecord(record);
            console.log(`Registro migrado: ${record.date}`);
        }
        
        // Migrar datos actuales
        const lastDataResponse = await fetch('./melba_last_data.json');
        const lastData = await lastDataResponse.json();
        
        console.log('Migrando datos actuales...');
        
        // Guardar los datos actuales en una colección separada
        const currentDataRef = doc(db, 'current-data', 'last');
        await setDoc(currentDataRef, lastData);
        
        console.log('Datos actuales migrados exitosamente');
        console.log('Migración completada exitosamente');
    } catch (error) {
        console.error('Error durante la migración:', error);
    }
}

migrateData(); 