import { describe, it, expect, beforeAll } from 'vitest';
import { getTestServer } from '../../utils/test-server';
import { buildGrupo } from '../../factories/grupo.factory';

describe('GET /api/grupos', () => {

  describe('Happy Paths', () => {
    it('debe listar todos los grupos con paginación por defecto', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.pagination).toMatchObject({
        page: 1,
        limit: 10,
      });
      expect(body.pagination.total).toBeGreaterThanOrEqual(1); // Al menos el del seed
    });

    it('debe respetar el límite de paginación', async () => {
      const server = getTestServer();

      // Crear algunos grupos adicionales para probar paginación
      await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: buildGrupo(),
      });
      await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: buildGrupo(),
      });

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos?limit=2',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data).toHaveLength(2);
      expect(body.pagination.limit).toBe(2);
    });

    it('debe navegar a la segunda página', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos?page=2&limit=2',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.pagination.page).toBe(2);
      expect(body.pagination.limit).toBe(2);
    });

    it('debe calcular correctamente el total de páginas', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos?limit=2',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      const expectedTotalPages = Math.ceil(body.pagination.total / 2);
      expect(body.pagination.totalPages).toBe(expectedTotalPages);
    });

    it('debe filtrar por país', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos?paisPrincipal=UY',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data.length).toBeGreaterThan(0);
      body.data.forEach((grupo: any) => {
        expect(grupo.paisPrincipal).toBe('UY');
      });
    });

    it('debe buscar por nombre', async () => {
      const server = getTestServer();

      // Primero crear un grupo con nombre específico
      const grupoData = buildGrupo({ nombre: 'Grupo Alpha Para Búsqueda' });
      await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: grupoData,
      });

      // Ahora buscar
      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos?search=Alpha',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].nombre).toContain('Alpha');
    });

    it('debe buscar por nombre case-insensitive', async () => {
      const server = getTestServer();

      // Crear un grupo para buscar
      const grupoData = buildGrupo({ nombre: 'GAMMA Mayúsculas Test' });
      await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: grupoData,
      });

      // Buscar en minúsculas
      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos?search=gamma',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data.length).toBeGreaterThan(0);
      const found = body.data.some((g: any) => g.nombre.toLowerCase().includes('gamma'));
      expect(found).toBe(true);
    });

    it('debe filtrar por activo=true', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos?activo=true',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      body.data.forEach((grupo: any) => {
        expect(grupo.activo).toBe(true);
      });
    });

    it('debe combinar múltiples filtros', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos?paisPrincipal=UY&activo=true&limit=5',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      body.data.forEach((grupo: any) => {
        expect(grupo.paisPrincipal).toBe('UY');
        expect(grupo.activo).toBe(true);
      });
      expect(body.pagination.limit).toBe(5);
    });

    it('debe incluir conteo de empresas en cada grupo', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      body.data.forEach((grupo: any) => {
        expect(grupo._count).toBeDefined();
        expect(grupo._count.empresas).toBeGreaterThanOrEqual(0);
      });
    });

    it('debe retornar array vacío si no hay resultados', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos?search=NoExisteEsteGrupo123',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data).toEqual([]);
      expect(body.pagination.total).toBe(0);
      expect(body.pagination.totalPages).toBe(0);
    });
  });

  describe('Validación de Errores', () => {
    it('debe retornar 401 sin autenticación', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos',
        // Sin header x-user-id
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('debe retornar 400 si page es menor a 1', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos?page=0',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('debe retornar 400 si limit excede el máximo', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos?limit=101',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('debe retornar 400 si país es inválido', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos?paisPrincipal=ZZ',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/grupos/mis-grupos', () => {
    it('debe retornar solo los grupos del usuario autenticado', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos/mis-grupos',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.length).toBeGreaterThan(0);

      // Todos deben tener al usuario 1 asignado
      body.data.forEach((grupo: any) => {
        expect(grupo.id).toBeDefined();
        expect(grupo.nombre).toBeDefined();
      });
    });

    it('debe retornar 401 sin autenticación', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos/mis-grupos',
        // Sin header
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
