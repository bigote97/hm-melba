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

const RECORDS_COLLECTION = "melba-records";
const CURRENT_DATA_DOC = "last";

export class FirebaseService {
    static app;
    static db;

    static async initialize() {
        try {
            if (!window.env) {
                console.error('window.env no está definido');
                throw new Error('Variables de entorno no encontradas');
            }

            if (!this.app) {
                const config = {
                    apiKey: window.env.FIREBASE_API_KEY,
                    authDomain: window.env.FIREBASE_AUTH_DOMAIN,
                    projectId: window.env.FIREBASE_PROJECT_ID,
                    storageBucket: window.env.FIREBASE_STORAGE_BUCKET,
                    messagingSenderId: window.env.FIREBASE_MESSAGING_SENDER_ID,
                    appId: window.env.FIREBASE_APP_ID
                };

                this.app = initializeApp(config);
                this.db = getFirestore(this.app);
            }
        } catch (error) {
            console.error('Error al inicializar Firebase:', error);
            throw error;
        }
    }

    static async saveRecord(record) {
        try {
            const docRef = await addDoc(collection(this.db, RECORDS_COLLECTION), record);
            
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
    }

    static async getAllRecords() {
        try {
            const q = query(
                collection(this.db, RECORDS_COLLECTION), 
                orderBy("date", "desc")
            );
            
            const querySnapshot = await getDocs(q);
            
            const records = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            return records;
            
        } catch (error) {
            console.error("Error al obtener los registros:", error);
            throw error;
        }
    }

    static async getCurrentData() {
        try {
            const docRef = doc(this.db, 'current-data', CURRENT_DATA_DOC);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                return null;
            }
        } catch (error) {
            console.error("Error al obtener los datos actuales:", error);
            throw error;
        }
    }

    static async updateCurrentData(data) {
        try {
            const docRef = doc(this.db, 'current-data', CURRENT_DATA_DOC);
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
    }

    static async deleteRecord(record) {
        try {
            const recordRef = doc(this.db, RECORDS_COLLECTION, record.id);
            await deleteDoc(recordRef);
        } catch (error) {
            console.error("Error al eliminar el registro:", error);
            throw error;
        }
    }

    static async updateRecord(record) {
        try {
            const recordRef = doc(this.db, RECORDS_COLLECTION, record.id);
            await setDoc(recordRef, {
                date: record.date,
                consulta: record.consulta,
                medico: record.medico,
                vacuna: record.vacuna,
                peso: record.peso,
                keywords: record.keywords
            }, { merge: true });

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
} 