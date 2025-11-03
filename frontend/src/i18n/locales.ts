/**
 * Sistema de auto-descubrimiento de idiomas
 *
 * Para agregar un nuevo idioma:
 * 1. Crear archivo: src/messages/{codigo}.json
 * 2. Agregar entrada en src/i18n/locale-names.json: "codigo": "Nombre"
 *
 * ¡Eso es todo! No necesitas tocar este archivo.
 */

import localeNames from './locale-names.json';

// Cargar dinámicamente todos los archivos de mensajes basados en locale-names.json
const loadMessages = () => {
  const locales: Record<string, { name: string; messages: any }> = {};

  Object.entries(localeNames).forEach(([code, name]) => {
    try {
      // Import dinámico del archivo de mensajes
      const messages = require(`@/messages/${code}.json`);
      locales[code] = { name, messages };
    } catch (error) {
      console.error(`Error cargando idioma ${code}:`, error);
    }
  });

  return locales;
};

export const AVAILABLE_LOCALES = loadMessages();

// Tipo base de mensajes (usar español como referencia)
const esMessages = require('@/messages/es.json');
export type Messages = typeof esMessages;

// Tipo de locale inferido de locale-names.json
export type Locale = keyof typeof localeNames;

// Idioma por defecto
export const DEFAULT_LOCALE: Locale = 'es';

// Objeto de mensajes para el contexto
export const messages: Record<Locale, Messages> = Object.fromEntries(
  Object.entries(AVAILABLE_LOCALES).map(([code, config]) => [code, config.messages])
) as Record<Locale, Messages>;

// Lista de idiomas para el selector
export const languages: Record<Locale, string> = localeNames;
