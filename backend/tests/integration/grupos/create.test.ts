import { describe, it, expect } from 'vitest';
import { getTestServer } from '../../utils/test-server';
import { buildGrupo, grupoPresets } from '../../factories/grupo.factory';
import { prisma } from '../../../src/lib/prisma';

describe('POST /api/grupos', () => {
  describe('Happy Paths', () => {
    it('debe crear un grupo con campos mínimos', async () => {
      const server = getTestServer();
      const grupoData = buildGrupo(); // Genera nombre único automáticamente

      const response = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: grupoData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);

      expect(body.data).toMatchObject({
        nombre: grupoData.nombre,
        paisPrincipal: 'UY',
        monedaBase: 'UYU',
        activo: true,
      });
      expect(body.data).toHaveProperty('id');
      expect(body.data.id).toBeGreaterThan(1); // Mayor que el del seed
      expect(body.message).toBe('Grupo económico creado correctamente');
    });

    it('debe crear un grupo con todos los campos', async () => {
      const server = getTestServer();
      const grupoData = grupoPresets.conRUT();

      const response = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: grupoData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);

      expect(body.data).toMatchObject({
        rutControlador: '217890120018',
        paisPrincipal: grupoData.paisPrincipal,
        monedaBase: grupoData.monedaBase,
        activo: true,
      });
    });

    it('debe crear plan de cuentas automáticamente', async () => {
      const server = getTestServer();
      const grupoData = buildGrupo();

      const response = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: grupoData,
      });

      const body = JSON.parse(response.body);
      const grupoId = body.data.id;

      // Verificar en BD que se creó el plan de cuentas
      const planDeCuentas = await prisma.planDeCuentas.findFirst({
        where: { grupoEconomicoId: grupoId },
      });

      expect(planDeCuentas).toBeDefined();
      expect(planDeCuentas?.nombre).toContain(grupoData.nombre);
      expect(planDeCuentas?.activo).toBe(true);
    });

    it('debe crear configuración contable automáticamente', async () => {
      const server = getTestServer();
      const grupoData = buildGrupo();

      const response = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: grupoData,
      });

      const body = JSON.parse(response.body);
      const grupoId = body.data.id;

      // Verificar en BD que se creó la configuración
      const configuracion = await prisma.configuracionContable.findFirst({
        where: { grupoEconomicoId: grupoId },
      });

      expect(configuracion).toBeDefined();
      expect(configuracion?.decimalesMonto).toBe(2);
      expect(configuracion?.decimalesTipoCambio).toBe(4);
      expect(configuracion?.permitirAsientosDescuadrados).toBe(false);
    });

    it('debe asignar al usuario como ADMIN del grupo', async () => {
      const server = getTestServer();
      const grupoData = buildGrupo();

      const response = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: grupoData,
      });

      const body = JSON.parse(response.body);
      const grupoId = body.data.id;

      // Verificar en BD que el usuario fue asignado como ADMIN
      const usuarioGrupo = await prisma.usuarioGrupo.findFirst({
        where: {
          grupoEconomicoId: grupoId,
          usuarioId: 1,
        },
      });

      expect(usuarioGrupo).toBeDefined();
      expect(usuarioGrupo?.rol).toBe('ADMIN');
    });

    it('debe crear grupo con moneda USD en Uruguay', async () => {
      const server = getTestServer();
      const grupoData = grupoPresets.uruguayUSD();

      const response = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: grupoData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);

      expect(body.data.paisPrincipal).toBe('UY');
      expect(body.data.monedaBase).toBe('USD');
    });

    it('debe crear grupos con diferentes países', async () => {
      const server = getTestServer();
      const paises = [
        { preset: grupoPresets.argentina, pais: 'AR', moneda: 'ARS' },
        { preset: grupoPresets.brasil, pais: 'BR', moneda: 'BRL' },
      ];

      for (const { preset, pais, moneda } of paises) {
        const grupoData = preset();
        const response = await server.inject({
          method: 'POST',
          url: '/api/grupos',
          headers: { 'x-user-id': '1' },
          payload: grupoData,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body.data.paisPrincipal).toBe(pais);
        expect(body.data.monedaBase).toBe(moneda);
      }
    });
  });

  describe('Validación de Errores', () => {
    it('debe retornar 401 sin autenticación', async () => {
      const server = getTestServer();
      const grupoData = buildGrupo();

      const response = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        payload: grupoData,
        // Sin header x-user-id
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('debe retornar 400 si nombre es muy corto', async () => {
      const server = getTestServer();
      const grupoData = buildGrupo({ nombre: 'AB' });

      const response = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: grupoData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details.nombre).toContain(
        'El nombre debe tener al menos 3 caracteres'
      );
    });

    it('debe retornar 400 si nombre es muy largo', async () => {
      const server = getTestServer();
      const grupoData = buildGrupo({ nombre: 'A'.repeat(201) });

      const response = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: grupoData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details.nombre).toContain(
        'El nombre no puede exceder 200 caracteres'
      );
    });

    it('debe retornar 400 si país es inválido', async () => {
      const server = getTestServer();
      const grupoData = buildGrupo({ paisPrincipal: 'ZZ' as any });

      const response = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: grupoData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details.paisPrincipal).toBeDefined();
    });

    it('debe retornar 400 si moneda es inválida', async () => {
      const server = getTestServer();
      const grupoData = buildGrupo({ monedaBase: 'XXX' as any });

      const response = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: grupoData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details.monedaBase).toBeDefined();
    });

    it('debe retornar 400 si RUT tiene formato incorrecto', async () => {
      const server = getTestServer();
      const grupoData = buildGrupo({ rutControlador: '12345' as any });

      const response = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: grupoData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details.rutControlador).toContain('El RUT debe tener 12 dígitos');
    });

    it('debe aceptar RUT vacío o undefined', async () => {
      const server = getTestServer();

      // Test con string vacío
      const grupoData1 = buildGrupo({ rutControlador: '' as any });
      const response1 = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: grupoData1,
      });
      expect(response1.statusCode).toBe(201);

      // Test con undefined (omitido)
      const grupoData2 = buildGrupo();
      delete (grupoData2 as any).rutControlador;
      const response2 = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: grupoData2,
      });
      expect(response2.statusCode).toBe(201);
    });

    it('debe retornar 400 si faltan campos requeridos', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: {
          nombre: 'Test',
          // Faltan paisPrincipal y monedaBase
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
