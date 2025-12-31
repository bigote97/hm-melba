#!/usr/bin/env node

/**
 * Script para convertir .env a env.js
 * Ejecuta: node build-env.js
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const outputPath = path.join(__dirname, 'env.js');

// Verificar si existe .env
if (!fs.existsSync(envPath)) {
    console.error('❌ Error: No se encontró el archivo .env');
    console.log('💡 Copia .env.example a .env y completa con tus valores:');
    console.log('   cp .env.example .env');
    process.exit(1);
}

// Leer .env
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

// Parsear variables de entorno
envContent.split('\n').forEach(line => {
    line = line.trim();
    
    // Ignorar comentarios y líneas vacías
    if (!line || line.startsWith('#')) {
        return;
    }
    
    // Parsear KEY=VALUE
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remover comillas si existen
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        
        envVars[key] = value;
    }
});

// Verificar que todas las variables necesarias estén presentes
const requiredVars = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID'
];

const missingVars = requiredVars.filter(v => !envVars[v] || envVars[v].includes('your-'));
if (missingVars.length > 0) {
    console.warn('⚠️  Advertencia: Las siguientes variables no están configuradas:');
    missingVars.forEach(v => console.warn(`   - ${v}`));
    console.log('\n💡 Asegúrate de completar todos los valores en .env');
}

// Generar contenido de env.js
const jsContent = `// Archivo generado automáticamente desde .env
// NO edites este archivo manualmente - edita .env y ejecuta: node build-env.js

window.env = {
    FIREBASE_API_KEY: '${envVars.FIREBASE_API_KEY || ''}',
    FIREBASE_AUTH_DOMAIN: '${envVars.FIREBASE_AUTH_DOMAIN || ''}',
    FIREBASE_PROJECT_ID: '${envVars.FIREBASE_PROJECT_ID || ''}',
    FIREBASE_STORAGE_BUCKET: '${envVars.FIREBASE_STORAGE_BUCKET || ''}',
    FIREBASE_MESSAGING_SENDER_ID: '${envVars.FIREBASE_MESSAGING_SENDER_ID || ''}',
    FIREBASE_APP_ID: '${envVars.FIREBASE_APP_ID || ''}'
};
`;

// Escribir env.js
fs.writeFileSync(outputPath, jsContent, 'utf-8');
console.log('✅ env.js generado exitosamente desde .env');
console.log(`📁 Archivo: ${outputPath}`);
