import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy,
    doc,
    getDoc,
    setDoc,
    deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { db } from './firebase-config.js';
import { auth } from './firebase-config.js';

const RECORDS_COLLECTION = "melba-records";
const CURRENT_DATA_DOC = "last";

export const FirebaseService = {
    // Guardar un nuevo registro
    async saveRecord(record) {
        if (!auth.currentUser) {
            throw new Error('Usuario no autenticado');
        }
        try {
            const docRef = await addDoc(collection(db, RECORDS_COLLECTION), record);
            
            // Si el registro tiene peso, actualizar los datos actuales
            if (record.peso) {
                await this.updateCurrentData({
                    peso: record.peso,
                    date: record.date
                });
            }
            
            return docRef.id;
        } catch (error) {
            console.error("Error al guardar el registro:", error);
            throw error;
        }
    },

    // Obtener todos los registros ordenados por fecha
    async getAllRecords() {
        if (!auth.currentUser) {
            throw new Error('Usuario no autenticado');
        }
        try {
            const q = query(
                collection(db, RECORDS_COLLECTION), 
                orderBy("date", "desc")
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error al obtener los registros:", error);
            throw error;
        }
    },

    // Obtener datos actuales
    async getCurrentData() {
        if (!auth.currentUser) {
            throw new Error('Usuario no autenticado');
        }
        try {
            const docRef = doc(db, 'current-data', CURRENT_DATA_DOC);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                console.log("No se encontraron datos actuales");
                return null;
            }
        } catch (error) {
            console.error("Error al obtener los datos actuales:", error);
            throw error;
        }
    },

    // Actualizar datos actuales
    async updateCurrentData(data) {
        if (!auth.currentUser) {
            throw new Error('Usuario no autenticado');
        }
        try {
            const docRef = doc(db, 'current-data', CURRENT_DATA_DOC);
            const currentData = await this.getCurrentData() || {};
            
            await setDoc(docRef, {
                ...currentData,
                ...data,
                lastUpdate: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error al actualizar los datos actuales:", error);
            throw error;
        }
    },

    // Eliminar un registro
    async deleteRecord(record) {
        if (!auth.currentUser) {
            throw new Error('Usuario no autenticado');
        }
        try {
            const recordRef = doc(db, RECORDS_COLLECTION, record.id);
            await deleteDoc(recordRef);
        } catch (error) {
            console.error("Error al eliminar el registro:", error);
            throw error;
        }
    },

    // Actualizar un registro existente
    async updateRecord(record) {
        if (!auth.currentUser) {
            throw new Error('Usuario no autenticado');
        }
        try {
            const recordRef = doc(db, RECORDS_COLLECTION, record.id);
            await setDoc(recordRef, {
                date: record.date,
                consulta: record.consulta,
                medico: record.medico,
                vacuna: record.vacuna,
                peso: record.peso,
                keywords: record.keywords
            }, { merge: true });

            // Si el registro tiene peso, actualizar los datos actuales
            if (record.peso) {
                await this.updateCurrentData({
                    peso: record.peso,
                    date: record.date
                });
            }
        } catch (error) {
            console.error("Error al actualizar el registro:", error);
            throw error;
        }
    }
}; 