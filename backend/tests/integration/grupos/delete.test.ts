import { describe, it, expect } from 'vitest';
import { getTestServer } from '../../utils/test-server';
import { buildGrupo } from '../../factories/grupo.factory';
import { prisma } from '../../../src/lib/prisma';

describe('DELETE /api/grupos/:id', () => {
  describe('Happy Paths', () => {
    it('debe eliminar un grupo sin empresas (soft delete)', async () => {
      const server = getTestServer();

      // Crear un grupo para eliminar
      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: buildGrupo(),
      });
      const grupoCreado = JSON.parse(createResponse.body).data;

      // Eliminar el grupo
      const response = await server.inject({
        method: 'DELETE',
        url: `/api/grupos/${grupoCreado.id}`,
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.success).toBe(true);
      expect(body.message).toBe('Grupo económico eliminado correctamente');
    });

    it('debe marcar el grupo como inactivo (soft delete)', async () => {
      const server = getTestServer();

      // Crear grupo
      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: buildGrupo(),
      });
      const grupoCreado = JSON.parse(createResponse.body).data;

      // Eliminar
      await server.inject({
        method: 'DELETE',
        url: `/api/grupos/${grupoCreado.id}`,
        headers: { 'x-user-id': '1' },
      });

      // Verificar en BD que está inactivo
      const grupoEnDB = await prisma.grupoEconomico.findUnique({
        where: { id: grupoCreado.id },
      });

      expect(grupoEnDB).toBeDefined();
      expect(grupoEnDB?.activo).toBe(false);
    });

    it('debe poder obtener el grupo eliminado por ID', async () => {
      const server = getTestServer();

      // Crear y eliminar grupo
      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: buildGrupo(),
      });
      const grupoCreado = JSON.parse(createResponse.body).data;

      await server.inject({
        method: 'DELETE',
        url: `/api/grupos/${grupoCreado.id}`,
        headers: { 'x-user-id': '1' },
      });

      // Aún se puede obtener por ID
      const response = await server.inject({
        method: 'GET',
        url: `/api/grupos/${grupoCreado.id}`,
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.activo).toBe(false);
    });

    it('NO debe aparecer en listado con filtro activo=true', async () => {
      const server = getTestServer();

      // Crear y eliminar
      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: buildGrupo(),
      });
      const grupoCreado = JSON.parse(createResponse.body).data;

      await server.inject({
        method: 'DELETE',
        url: `/api/grupos/${grupoCreado.id}`,
        headers: { 'x-user-id': '1' },
      });

      // Verificar que no aparece en listado de activos
      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos?activo=true',
        headers: { 'x-user-id': '1' },
      });

      const body = JSON.parse(response.body);
      const grupoEliminado = body.data.find((g: any) => g.id === grupoCreado.id);
      expect(grupoEliminado).toBeUndefined();
    });

    it('SÍ debe aparecer en listado con filtro activo=false', async () => {
      const server = getTestServer();

      // Crear y eliminar
      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: buildGrupo(),
      });
      const grupoCreado = JSON.parse(createResponse.body).data;

      await server.inject({
        method: 'DELETE',
        url: `/api/grupos/${grupoCreado.id}`,
        headers: { 'x-user-id': '1' },
      });

      // Verificar que aparece en listado de inactivos
      const response = await server.inject({
        method: 'GET',
        url: '/api/grupos?activo=false',
        headers: { 'x-user-id': '1' },
      });

      const body = JSON.parse(response.body);
      const grupoEliminado = body.data.find((g: any) => g.id === grupoCreado.id);
      expect(grupoEliminado).toBeDefined();
      expect(grupoEliminado.activo).toBe(false);
    });
  });

  describe('Validación de Errores', () => {
    it('debe retornar 401 sin autenticación', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'DELETE',
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
        method: 'DELETE',
        url: '/api/grupos/9999',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('debe retornar 422 si el grupo tiene empresas activas', async () => {
      const server = getTestServer();

      // El grupo 1 del seed tiene 2 empresas activas
      const response = await server.inject({
        method: 'DELETE',
        url: '/api/grupos/1',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('BUSINESS_RULE_VIOLATION');
      expect(body.error.message).toContain('empresas activas');
      expect(body.error.rule).toBe('EMPRESAS_ACTIVAS');
    });

    it('debe retornar 400 si el ID no es válido', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'DELETE',
        url: '/api/grupos/abc',
        headers: { 'x-user-id': '1' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
