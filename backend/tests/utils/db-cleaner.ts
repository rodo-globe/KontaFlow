import { prisma } from '../../src/lib/prisma';

/**
 * Limpia todas las tablas de la base de datos
 * Usa TRUNCATE CASCADE para eliminar todos los datos y resetear sequences
 */
export async function cleanDatabase() {
  const tables = [
    'lineas_asiento',
    'asientos',
    'cuentas',
    'planes_de_cuentas',
    'configuracion_contable',
    'empresas',
    'usuarios_grupos',
    'grupos_economicos',
    'usuarios',
  ];

  // Ejecutar TRUNCATE en todas las tablas en orden inverso (por foreign keys)
  for (const table of tables.reverse()) {
    try {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`
      );
    } catch (error) {
      // Ignorar si la tabla no existe aún
      if (error instanceof Error && !error.message.includes('does not exist')) {
        throw error;
      }
    }
  }
}

/**
 * Seed de datos básicos para testing
 * IDs predecibles y datos consistentes
 */
export async function seedTestData() {
  // Crear usuarios de prueba
  const usuario1 = await prisma.usuario.create({
    data: {
      id: 1,
      authProviderId: 'test_auth_id_1',
      email: 'admin@test.com',
      nombre: 'Admin Test',
    },
  });

  const usuario2 = await prisma.usuario.create({
    data: {
      id: 2,
      authProviderId: 'test_auth_id_2',
      email: 'contador@test.com',
      nombre: 'Contador Test',
    },
  });

  const usuario3 = await prisma.usuario.create({
    data: {
      id: 3,
      authProviderId: 'test_auth_id_3',
      email: 'operativo@test.com',
      nombre: 'Operativo Test',
    },
  });

  // Crear grupo económico de prueba
  const grupo1 = await prisma.grupoEconomico.create({
    data: {
      id: 1,
      nombre: 'Grupo Test 1',
      rutControlador: '217890120018',
      paisPrincipal: 'UY',
      monedaBase: 'UYU',
      activo: true,
    },
  });

  // Crear plan de cuentas para el grupo
  const planCuentas = await prisma.planDeCuentas.create({
    data: {
      id: 1,
      grupoEconomicoId: grupo1.id,
      nombre: 'Plan de cuentas - Grupo Test 1',
      descripcion: 'Plan de cuentas de prueba',
      activo: true,
    },
  });

  // Crear configuración contable para el grupo
  const configuracion = await prisma.configuracionContable.create({
    data: {
      id: 1,
      grupoEconomicoId: grupo1.id,
      permitirAsientosEnPeriodoCerrado: false,
      requiereAprobacionGlobal: false,
      montoMinimoAprobacion: 50000,
      permitirAsientosDescuadrados: false,
      decimalesMonto: 2,
      decimalesTipoCambio: 4,
    },
  });

  // Asignar usuarios al grupo
  await prisma.usuarioGrupo.create({
    data: {
      usuarioId: usuario1.id,
      grupoEconomicoId: grupo1.id,
      rol: 'ADMIN',
    },
  });

  await prisma.usuarioGrupo.create({
    data: {
      usuarioId: usuario2.id,
      grupoEconomicoId: grupo1.id,
      rol: 'CONTADOR',
    },
  });

  await prisma.usuarioGrupo.create({
    data: {
      usuarioId: usuario3.id,
      grupoEconomicoId: grupo1.id,
      rol: 'OPERATIVO',
    },
  });

  // Crear empresas de prueba
  await prisma.empresa.create({
    data: {
      id: 1,
      grupoEconomicoId: grupo1.id,
      nombre: 'Empresa Test UY S.A.',
      nombreComercial: 'Empresa Test UY',
      rut: '217890120018',
      pais: 'UY',
      monedaFuncional: 'UYU',
      activa: true,
    },
  });

  await prisma.empresa.create({
    data: {
      id: 2,
      grupoEconomicoId: grupo1.id,
      nombre: 'Test Company LLC',
      nombreComercial: 'Empresa Test US',
      rut: '123456789012',
      pais: 'US',
      monedaFuncional: 'USD',
      activa: true,
    },
  });

  // Resetear las secuencias de IDs para que los tests puedan crear nuevos registros
  await prisma.$executeRawUnsafe(`
    SELECT setval(pg_get_serial_sequence('"usuarios"', 'id'), COALESCE(MAX(id), 1)) FROM "usuarios";
  `);
  await prisma.$executeRawUnsafe(`
    SELECT setval(pg_get_serial_sequence('"grupos_economicos"', 'id'), COALESCE(MAX(id), 1)) FROM "grupos_economicos";
  `);
  await prisma.$executeRawUnsafe(`
    SELECT setval(pg_get_serial_sequence('"empresas"', 'id'), COALESCE(MAX(id), 1)) FROM "empresas";
  `);
  await prisma.$executeRawUnsafe(`
    SELECT setval(pg_get_serial_sequence('"planes_de_cuentas"', 'id'), COALESCE(MAX(id), 1)) FROM "planes_de_cuentas";
  `);
  await prisma.$executeRawUnsafe(`
    SELECT setval(pg_get_serial_sequence('"configuracion_contable"', 'id'), COALESCE(MAX(id), 1)) FROM "configuracion_contable";
  `);

  return {
    usuarios: [usuario1, usuario2, usuario3],
    grupos: [grupo1],
    planCuentas,
    configuracion,
  };
}

/**
 * Obtener conteo de registros en todas las tablas
 * Útil para debugging
 */
export async function getDatabaseStats() {
  const [usuarios, grupos, empresas, planes, configuraciones] =
    await Promise.all([
      prisma.usuario.count(),
      prisma.grupoEconomico.count(),
      prisma.empresa.count(),
      prisma.planDeCuentas.count(),
      prisma.configuracionContable.count(),
    ]);

  return {
    usuarios,
    grupos,
    empresas,
    planes,
    configuraciones,
  };
}
