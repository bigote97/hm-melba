/**
 * Utilidades para manejo de fechas y Timestamps de Firestore
 */

import { Timestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

/**
 * Convierte una fecha string (dd/mm/aa) a Timestamp de Firestore
 * @param {string} dateString - Fecha en formato "dd/mm/aa" o "dd/mm/yyyy"
 * @returns {Timestamp|null}
 */
export function parseDateString(dateString) {
    if (!dateString) return null;
    
    // Formato: dd/mm/aa o dd/mm/yyyy
    const parts = dateString.split('/');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Mes es 0-indexed
    let year = parseInt(parts[2], 10);
    
    // Si el año tiene 2 dígitos, asumir 2000-2099
    if (year < 100) {
        year = 2000 + year;
    }
    
    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return null;
    
    return Timestamp.fromDate(date);
}

/**
 * Convierte un Timestamp de Firestore a string (dd/mm/aa)
 * @param {Timestamp|Date|string} timestamp
 * @returns {string}
 */
export function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    let date;
    if (timestamp instanceof Timestamp) {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
    } else {
        return '';
    }
    
    if (isNaN(date.getTime())) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    
    return `${day}/${month}/${year}`;
}

/**
 * Convierte un Timestamp a formato ISO para inputs de fecha
 * @param {Timestamp|Date} timestamp
 * @returns {string} - Formato YYYY-MM-DD
 */
export function timestampToInputDate(timestamp) {
    if (!timestamp) return '';
    
    let date;
    if (timestamp instanceof Timestamp) {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        return '';
    }
    
    if (isNaN(date.getTime())) return '';
    
    return date.toISOString().split('T')[0];
}

/**
 * Convierte un input date (YYYY-MM-DD) a Timestamp
 * @param {string} inputDate
 * @returns {Timestamp}
 */
export function inputDateToTimestamp(inputDate) {
    if (!inputDate) return Timestamp.now();
    
    const date = new Date(inputDate + 'T00:00:00');
    if (isNaN(date.getTime())) return Timestamp.now();
    
    return Timestamp.fromDate(date);
}

/**
 * Obtiene el Timestamp actual
 * @returns {Timestamp}
 */
export function now() {
    return Timestamp.now();
}

/**
 * Compara dos Timestamps
 * @param {Timestamp} a
 * @param {Timestamp} b
 * @returns {number} - Negativo si a < b, positivo si a > b, 0 si iguales
 */
export function compareTimestamps(a, b) {
    if (!a || !b) return 0;
    const dateA = a instanceof Timestamp ? a.toDate() : new Date(a);
    const dateB = b instanceof Timestamp ? b.toDate() : new Date(b);
    return dateA.getTime() - dateB.getTime();
}

/**
 * Verifica si un Timestamp está dentro de un rango
 * @param {Timestamp} timestamp
 * @param {Timestamp} from
 * @param {Timestamp} to
 * @returns {boolean}
 */
export function isTimestampInRange(timestamp, from, to) {
    if (!timestamp) return false;
    
    const ts = timestamp instanceof Timestamp ? timestamp.toDate().getTime() : new Date(timestamp).getTime();
    const fromTime = from ? (from instanceof Timestamp ? from.toDate().getTime() : new Date(from).getTime()) : 0;
    const toTime = to ? (to instanceof Timestamp ? to.toDate().getTime() : new Date(to).getTime()) : Date.now();
    
    return ts >= fromTime && ts <= toTime;
}
