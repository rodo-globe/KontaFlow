/**
 * Script para generar automáticamente el archivo locales.ts
 * basándose en los archivos JSON encontrados en src/messages/
 *
 * Para agregar un nuevo idioma:
 * 1. Crear archivo src/messages/{codigo}.json con la propiedad "_locale": { "name": "Nombre del idioma" }
 *
 * El script se ejecuta automáticamente antes de dev y build.
 */

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '../src/messages');
const OUTPUT_FILE = path.join(__dirname, '../src/i18n/locales.ts');

function generateLocalesFile() {
  // Leer todos los archivos .json del directorio messages
  const files = fs.readdirSync(MESSAGES_DIR).filter(file => file.endsWith('.json'));

  if (files.length === 0) {
    console.error('❌ No se encontraron archivos de idioma en src/messages/');
    process.exit(1);
  }

  const locales = [];

  // Procesar cada archivo
  files.forEach(file => {
    const localeCode = file.replace('.json', '');
    const filePath = path.join(MESSAGES_DIR, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Obtener el nombre del idioma del archivo (o usar el código en mayúsculas como fallback)
    const localeName = content._locale?.name || localeCode.toUpperCase();

    locales.push({ code: localeCode, name: localeName, file });
  });

  // Ordenar alfabéticamente por código
  locales.sort((a, b) => a.code.localeCompare(b.code));

  // Generar el contenido del archivo locales.ts
  const imports = locales.map(({ code, file }) =>
    `import ${code}Messages from '@/messages/${file}';`
  ).join('\n');

  const availableLocalesEntries = locales.map(({ code, name }) =>
    `  ${code}: { name: '${name}', messages: ${code}Messages },`
  ).join('\n');

  const firstLocale = locales[0].code;

  const content = `/**
 * ⚠️ ARCHIVO AUTO-GENERADO - NO EDITAR MANUALMENTE
 *
 * Este archivo es generado automáticamente por scripts/generate-locales.js
 * basándose en los archivos encontrados en src/messages/
 *
 * Para agregar un nuevo idioma:
 * 1. Crear archivo: src/messages/{codigo}.json
 * 2. Agregar la propiedad "_locale": { "name": "Nombre del idioma" } en el JSON
 * 3. Ejecutar: npm run generate-locales (o se ejecuta automáticamente con dev/build)
 */

${imports}

// Tipo base de mensajes
export type Messages = typeof ${firstLocale}Messages;

// Configuración de idiomas disponibles
export const AVAILABLE_LOCALES = {
${availableLocalesEntries}
} as const;

// Tipo inferido automáticamente de las claves de AVAILABLE_LOCALES
export type Locale = keyof typeof AVAILABLE_LOCALES;

// Idioma por defecto
export const DEFAULT_LOCALE: Locale = '${firstLocale}';

// Objeto de mensajes para el contexto
export const messages: Record<Locale, Messages> = Object.fromEntries(
  Object.entries(AVAILABLE_LOCALES).map(([code, config]) => [code, config.messages])
) as Record<Locale, Messages>;

// Lista de idiomas para el selector
export const languages: Record<Locale, string> = Object.fromEntries(
  Object.entries(AVAILABLE_LOCALES).map(([code, config]) => [code, config.name])
) as Record<Locale, string>;
`;

  // Escribir el archivo
  fs.writeFileSync(OUTPUT_FILE, content, 'utf-8');

  console.log(`✅ Archivo locales.ts generado exitosamente con ${locales.length} idiomas:`);
  locales.forEach(({ code, name }) => {
    console.log(`   - ${code}: ${name}`);
  });
}

// Ejecutar
try {
  generateLocalesFile();
} catch (error) {
  console.error('❌ Error generando locales.ts:', error);
  process.exit(1);
}
