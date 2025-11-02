import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);

/**
 * Global setup que se ejecuta UNA VEZ antes de toda la suite de tests
 * Crea la base de datos de testing, aplica migraciones y ejecuta seed
 */
export default async function globalSetup() {
  // Cargar variables de entorno de test
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

  console.log('🔧 Setting up test database...');

  try {
    // Crear la base de datos de test si no existe
    await execAsync(
      `docker exec kontaflow-db psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'kontaflow_test'" | grep -q 1 || docker exec kontaflow-db psql -U postgres -c "CREATE DATABASE kontaflow_test;"`
    );

    console.log('✅ Test database created or already exists');

    // Aplicar migraciones
    await execAsync('npm run prisma:migrate:deploy', {
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        DATABASE_URL:
          'postgresql://postgres:dev_password@localhost:5432/kontaflow_test',
      },
    });

    console.log('✅ Migrations applied');

    // Limpiar y seedear la base de datos
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://postgres:dev_password@localhost:5432/kontaflow_test',
        },
      },
    });

    // Importar dinámicamente las funciones de db-cleaner
    const { cleanDatabase, seedTestData } = await import('./utils/db-cleaner.js');

    await cleanDatabase();
    console.log('✅ Database cleaned');

    await seedTestData();
    console.log('✅ Test data seeded');

    await prisma.$disconnect();

    console.log('🚀 Test database ready\n');
  } catch (error) {
    console.error('❌ Error setting up test database:', error);
    throw error;
  }
}
