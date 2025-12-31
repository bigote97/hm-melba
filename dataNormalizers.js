/**
 * Utilidades para normalizar y parsear datos del historial médico
 */

/**
 * Normaliza un peso desde diferentes formatos a número (kg)
 * @param {string|number} weightInput - "19.600", "18 kg", "20 kilos", 19.6
 * @returns {number|null} - Peso en kilogramos o null si no se puede parsear
 */
export function normalizeWeight(weightInput) {
    if (!weightInput) return null;
    
    // Si ya es un número, retornarlo
    if (typeof weightInput === 'number') {
        return weightInput > 0 && weightInput < 1000 ? weightInput : null;
    }
    
    const str = String(weightInput).trim().toLowerCase();
    
    // Remover "kg", "kilos", "kilogramos"
    let cleaned = str.replace(/kg|kilos|kilogramos/g, '').trim();
    
    // Remover puntos que puedan ser separadores de miles (ej: "19.600" -> "19600" o "19.6")
    // Si tiene punto y el número después del punto tiene más de 2 dígitos, probablemente es separador de miles
    if (cleaned.includes('.')) {
        const parts = cleaned.split('.');
        if (parts.length === 2 && parts[1].length > 2) {
            // Probable separador de miles, removerlo
            cleaned = parts.join('');
        }
    }
    
    // Reemplazar coma por punto para decimales
    cleaned = cleaned.replace(',', '.');
    
    const parsed = parseFloat(cleaned);
    
    // Validar rango razonable para un perro (1-100 kg)
    if (isNaN(parsed) || parsed <= 0 || parsed > 100) {
        return null;
    }
    
    return parsed;
}

/**
 * Normaliza un precio desde diferentes formatos a número (ARS)
 * @param {string|number} priceInput - "4.900", "4900", 4900
 * @returns {number|null} - Precio en ARS o null si no se puede parsear
 */
export function normalizePrice(priceInput) {
    if (!priceInput) return null;
    
    if (typeof priceInput === 'number') {
        return priceInput > 0 ? priceInput : null;
    }
    
    const str = String(priceInput).trim();
    
    // Remover símbolos de moneda
    let cleaned = str.replace(/[$ars]/gi, '').trim();
    
    // Remover puntos que sean separadores de miles
    cleaned = cleaned.replace(/\./g, '');
    
    // Reemplazar coma por punto para decimales
    cleaned = cleaned.replace(',', '.');
    
    const parsed = parseFloat(cleaned);
    
    if (isNaN(parsed) || parsed < 0) {
        return null;
    }
    
    return parsed;
}

/**
 * Normaliza el nombre de un medicamento
 * @param {string} name
 * @returns {string}
 */
export function normalizeMedicationName(name) {
    if (!name) return '';
    
    return name.trim()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Parsea instrucciones de medicación para extraer frecuencia
 * @param {string} instructions - Ej: "cada 12hs", "cada 8 horas", "2 veces al día"
 * @returns {number|null} - Frecuencia en horas o null
 */
export function parseMedicationFrequency(instructions) {
    if (!instructions) return null;
    
    const lower = instructions.toLowerCase();
    
    // Buscar patrones como "cada 12hs", "cada 8 horas", "cada 6h"
    const match = lower.match(/cada\s+(\d+)\s*(?:hs?|horas?|h)/);
    if (match) {
        return parseInt(match[1], 10);
    }
    
    // Buscar "2 veces al día" = cada 12 horas
    if (lower.includes('2 veces al día') || lower.includes('dos veces al día')) {
        return 12;
    }
    
    // Buscar "3 veces al día" = cada 8 horas
    if (lower.includes('3 veces al día') || lower.includes('tres veces al día')) {
        return 8;
    }
    
    // Buscar "4 veces al día" = cada 6 horas
    if (lower.includes('4 veces al día') || lower.includes('cuatro veces al día')) {
        return 6;
    }
    
    return null;
}

/**
 * Parsea una dosis de medicamento
 * @param {string} doseString - Ej: "80mg", "1 comprimido", "1/2 comprimido"
 * @returns {Object} - { amountMg?: number, amount?: number, unit?: string, fraction?: string }
 */
export function parseMedicationDose(doseString) {
    if (!doseString) return {};
    
    const str = doseString.trim().toLowerCase();
    const result = {};
    
    // Buscar fracciones (1/2, 1/4, etc.)
    const fractionMatch = str.match(/(\d+)\/(\d+)/);
    if (fractionMatch) {
        result.fraction = fractionMatch[0];
        const numerator = parseInt(fractionMatch[1], 10);
        const denominator = parseInt(fractionMatch[2], 10);
        result.amount = numerator / denominator;
    }
    
    // Buscar cantidad en mg
    const mgMatch = str.match(/(\d+(?:\.\d+)?)\s*mg/);
    if (mgMatch) {
        result.amountMg = parseFloat(mgMatch[1]);
    }
    
    // Buscar cantidad numérica
    if (!result.amount && !result.amountMg) {
        const numMatch = str.match(/(\d+(?:\.\d+)?)/);
        if (numMatch) {
            result.amount = parseFloat(numMatch[1]);
        }
    }
    
    // Buscar unidad
    if (str.includes('comprimido')) {
        result.unit = 'comprimidos';
        result.form = 'comprimido';
    } else if (str.includes('ml')) {
        result.unit = 'ml';
        result.form = 'líquido';
    } else if (str.includes('mg') && !result.unit) {
        result.unit = 'mg';
    }
    
    return result;
}

/**
 * Determina si un valor podría ser peso o precio basado en contexto
 * @param {string|number} value
 * @param {string} context - Contexto del campo ("peso", "precio", "compra", etc.)
 * @returns {Object} - { type: 'weight'|'price', value: number }
 */
export function disambiguateWeightOrPrice(value, context = '') {
    const contextLower = context.toLowerCase();
    
    // Si el contexto es claro, usar eso
    if (contextLower.includes('peso') || contextLower.includes('kg') || contextLower.includes('kilo')) {
        return { type: 'weight', value: normalizeWeight(value) };
    }
    
    if (contextLower.includes('precio') || contextLower.includes('compra') || contextLower.includes('costo')) {
        return { type: 'price', value: normalizePrice(value) };
    }
    
    // Si no hay contexto, intentar ambos y ver cuál tiene más sentido
    const asWeight = normalizeWeight(value);
    const asPrice = normalizePrice(value);
    
    // Si el valor es muy grande (>50), probablemente es precio
    if (asPrice && asPrice > 50 && (!asWeight || asWeight < 50)) {
        return { type: 'price', value: asPrice };
    }
    
    // Si el valor está en rango de peso razonable (1-50 kg), probablemente es peso
    if (asWeight && asWeight >= 1 && asWeight <= 50) {
        return { type: 'weight', value: asWeight };
    }
    
    // Por defecto, intentar como precio
    return { type: 'price', value: asPrice };
}
