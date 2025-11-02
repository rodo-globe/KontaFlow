import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';
import { createTestServer, closeTestServer } from './utils/test-server';
import { prisma } from '../src/lib/prisma';

// Cargar variables de entorno de test
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

/**
 * Setup que se ejecuta antes de cada archivo de test
 */
beforeAll(async () => {
  // Crear servidor de test
  await createTestServer();
});

/**
 * Cleanup que se ejecuta después de TODO el test run
 */
afterAll(async () => {
  // Cerrar servidor
  await closeTestServer();

  // Desconectar Prisma
  await prisma.$disconnect();
});
