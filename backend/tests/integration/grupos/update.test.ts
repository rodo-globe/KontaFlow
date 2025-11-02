import { describe, it, expect } from 'vitest';
import { getTestServer } from '../../utils/test-server';
import { buildGrupo } from '../../factories/grupo.factory';
import { prisma } from '../../../src/lib/prisma';

describe('PUT /api/grupos/:id', () => {
  describe('Happy Paths', () => {
    it('debe actualizar el nombre del grupo', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'PUT',
        url: '/api/grupos/1',
        headers: { 'x-user-id': '1' },
        payload: {
          nombre: 'Grupo Test 1 - Actualizado',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data.nombre).toBe('Grupo Test 1 - Actualizado');
      expect(body.message).toBe('Grupo económico actualizado correctamente');
    });

    it('debe actualizar la moneda base', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'PUT',
        url: '/api/grupos/1',
        headers: { 'x-user-id': '1' },
        payload: {
          monedaBase: 'USD',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.monedaBase).toBe('USD');
    });

    it('debe actualizar múltiples campos a la vez', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'PUT',
        url: '/api/grupos/1',
        headers: { 'x-user-id': '1' },
        payload: {
          nombre: 'Grupo Multi-Update',
          monedaBase: 'UYU',
          rutControlador: '123456789012',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data).toMatchObject({
        nombre: 'Grupo Multi-Update',
        monedaBase: 'UYU',
        rutControlador: '123456789012',
      });
    });

    it('debe persistir los cambios en la base de datos', async () => {
      const server = getTestServer();

      // Actualizar
      await server.inject({
        method: 'PUT',
        url: '/api/grupos/1',
        headers: { 'x-user-id': '1' },
        payload: {
          nombre: 'Grupo Persistido',
        },
      });

      // Verificar en BD
      const grupoEnDB = await prisma.grupoEconomico.findUnique({
        where: { id: 1 },
      });

      expect(grupoEnDB?.nombre).toBe('Grupo Persistido');
    });

    it('debe poder desactivar un grupo', async () => {
      const server = getTestServer();

      // Primero crear un grupo nuevo para desactivar
      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/grupos',
        headers: { 'x-user-id': '1' },
        payload: buildGrupo(),
      });
      const nuevoGrupo = JSON.parse(createResponse.body).data;

      // Desactivar
      const response = await server.inject({
        method: 'PUT',
        url: `/api/grupos/${nuevoGrupo.id}`,
        headers: { 'x-user-id': '1' },
        payload: {
          activo: false,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.activo).toBe(false);
    });

    it('debe permitir actualización parcial (solo un campo)', async () => {
      const server = getTestServer();

      const originalResponse = await server.inject({
        method: 'GET',
        url: '/api/grupos/1',
        headers: { 'x-user-id': '1' },
      });
      const original = JSON.parse(originalResponse.body).data;

      // Actualizar solo nombre
      const response = await server.inject({
        method: 'PUT',
        url: '/api/grupos/1',
        headers: { 'x-user-id': '1' },
        payload: {
          nombre: 'Solo Nombre Cambiado',
        },
      });

      const body = JSON.parse(response.body);
      expect(body.data.nombre).toBe('Solo Nombre Cambiado');
      expect(body.data.paisPrincipal).toBe(original.paisPrincipal); // No cambió
      expect(body.data.monedaBase).toBe(original.monedaBase); // No cambió
    });
  });

  describe('Validación de Errores', () => {
    it('debe retornar 401 sin autenticación', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'PUT',
        url: '/api/grupos/1',
        payload: { nombre: 'Test' },
        // Sin header
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('debe retornar 404 si el grupo no existe', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'PUT',
        url: '/api/grupos/9999',
        headers: { 'x-user-id': '1' },
        payload: { nombre: 'Test' },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('debe retornar 400 si el nombre es muy corto', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'PUT',
        url: '/api/grupos/1',
        headers: { 'x-user-id': '1' },
        payload: { nombre: 'AB' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details.nombre).toBeDefined();
    });

    it('debe retornar 400 si el RUT es inválido', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'PUT',
        url: '/api/grupos/1',
        headers: { 'x-user-id': '1' },
        payload: { rutControlador: '123' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('debe retornar 400 si país es inválido', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'PUT',
        url: '/api/grupos/1',
        headers: { 'x-user-id': '1' },
        payload: { paisPrincipal: 'ZZ' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('debe retornar 400 si moneda es inválida', async () => {
      const server = getTestServer();

      const response = await server.inject({
        method: 'PUT',
        url: '/api/grupos/1',
        headers: { 'x-user-id': '1' },
        payload: { monedaBase: 'XXX' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
