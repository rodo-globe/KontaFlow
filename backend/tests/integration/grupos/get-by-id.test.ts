import { describe, it, expect } from 'vitest';
import { getTestServer } from '../../utils/test-server';

describe('GET /api/grupos/:id', () => {
  describe('Happy Paths', () => {
    it('debe obtener un grupo por ID', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos/1',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data).toMatchObject({
        id: 1,
        nombre: 'Grupo Test 1',
        rutControlador: '217890120018',
        paisPrincipal: 'UY',
        monedaBase: 'UYU',
        activo: true,
      });
    });

    it('debe incluir empresas del grupo', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos/1',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data.empresas).toBeInstanceOf(Array);
      expect(body.data.empresas.length).toBe(2); // Del seed
      expect(body.data.empresas[0]).toHaveProperty('id');
      expect(body.data.empresas[0]).toHaveProperty('nombre');
      expect(body.data.empresas[0]).toHaveProperty('rut');
      expect(body.data.empresas[0]).toHaveProperty('monedaFuncional');
      expect(body.data.empresas[0]).toHaveProperty('activa');
    });

    it('debe incluir plan de cuentas del grupo', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos/1',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data.planDeCuentas).toBeDefined();
      expect(body.data.planDeCuentas).toMatchObject({
        id: 1,
        activo: true,
      });
      expect(body.data.planDeCuentas.nombre).toBeDefined();
      expect(body.data.planDeCuentas.nombre).toContain('Grupo Test 1');
    });

    it('debe incluir configuración contable del grupo', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos/1',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data.configuracion).toBeDefined();
      expect(body.data.configuracion).toMatchObject({
        id: 1,
        grupoEconomicoId: 1,
        decimalesMonto: 2,
        decimalesTipoCambio: 4,
      });
    });
  });

  describe('Validación de Errores', () => {
    it('debe retornar 401 sin autenticación', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos/1',
        // Sin header
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('debe retornar 404 si el grupo no existe', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos/9999',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toContain('9999');
    });

    it('debe retornar 400 si el ID no es un número', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos/abc',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
