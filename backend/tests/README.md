# KontaFlow - Test Suite

Suite de tests de integración automatizados para el backend de KontaFlow.

## Resumen

- **Framework**: Vitest 4.0.6
- **Tipo**: Tests de integración (API completa)
- **Cobertura**: 60 tests implementados, 54 pasando (90%)
- **Base de datos**: PostgreSQL separada (`kontaflow_test`)
- **Estrategia**: Database seed automático + Test server

## Estructura

```
tests/
├── integration/           # Tests de API completos
│   └── grupos/
│       ├── create.test.ts      # 15 tests - POST /api/grupos
│       ├── list.test.ts        # 17 tests - GET /api/grupos
│       ├── get-by-id.test.ts   # 7 tests - GET /api/grupos/:id
│       ├── update.test.ts      # 12 tests - PUT /api/grupos/:id
│       └── delete.test.ts      # 9 tests - DELETE /api/grupos/:id
│
├── utils/
│   ├── db-cleaner.ts     # Limpieza y seed de BD
│   ├── test-server.ts    # Instancia de Fastify para tests
│
├── factories/
│   └── grupo.factory.ts  # Factory para generar datos de prueba
│
├── global-setup.ts       # Setup global (ejecuta UNA vez)
└── setup.ts              # Setup por archivo de test
```

## Ejecución

### Todos los tests
```bash
npm test
```

### Tests en modo watch
```bash
npm run test:watch
```

### Tests con UI interactiva
```bash
npm run test:ui
```

### Tests con coverage
```bash
npm run test:coverage
```

## Configuración

### Variables de Entorno

Archivo: `.env.test`

```env
NODE_ENV=test
DATABASE_URL=postgresql://postgres:dev_password@localhost:5432/kontaflow_test
PORT=9000
LOG_LEVEL=fatal
```

### Base de Datos de Testing

La suite automáticamente:
1. Crea la DB `kontaflow_test` si no existe
2. Aplica todas las migraciones
3. Limpia todas las tablas
4. Ejecuta seed con datos predecibles

**Datos de seed**:
- 3 usuarios (IDs: 1, 2, 3)
- 1 grupo económico (ID: 1)
- 2 empresas (IDs: 1, 2)
- 1 plan de cuentas (ID: 1)
- 1 configuración contable (ID: 1)

## Cobertura de Tests

### Feature: Grupos Económicos

| Endpoint | Tests | Estado |
|----------|-------|--------|
| POST /api/grupos | 15 | ✅ |
| GET /api/grupos | 17 | ⚠️ 2 fallos |
| GET /api/grupos/:id | 7 | ⚠️ 2 fallos |
| PUT /api/grupos/:id | 12 | ✅ |
| DELETE /api/grupos/:id | 9 | ⚠️ 1 fallo |

**Total**: 60 tests | 54 pasando (90%)

### Casos Cubiertos

✅ **Happy Paths**:
- Crear grupo con campos mínimos
- Crear grupo con todos los campos
- Crear grupos con diferentes países/monedas
- Listar con paginación
- Filtrar por país, activo, búsqueda
- Obtener por ID con relaciones
- Actualizar campos parcialmente
- Eliminar (soft delete)

✅ **Validaciones (400)**:
- Nombre muy corto/largo
- País inválido
- Moneda inválida
- RUT formato incorrecto
- Límites de paginación
- Campos requeridos faltantes

✅ **Errores de Negocio**:
- 401 - Sin autenticación
- 404 - Recurso no encontrado
- 422 - No eliminar grupos con empresas activas

✅ **Verificaciones**:
- Datos persisten en BD
- Relaciones se crean automáticamente (plan + config)
- Usuario se asigna como ADMIN
- Soft delete (activo = false)

## Estrategia de Testing

### Filosofía

1. **Tests de Integración Real**: Probamos el API completo, no mocks
2. **Base de Datos Limpia**: Cada ejecución parte del mismo estado
3. **Datos Predecibles**: IDs y datos conocidos del seed
4. **Tests Independientes**: No dependen del orden de ejecución
5. **Fast Feedback**: Suite completa en ~2 segundos

### Cómo Funciona

```
1. Global Setup (UNA vez):
   - Crear DB kontaflow_test
   - Aplicar migraciones
   - TRUNCATE todas las tablas
   - Insertar seed data

2. Para cada archivo de test:
   - Crear instancia de Fastify
   - Ejecutar tests contra DB seeded
   - Cerrar instancia

3. Tests:
   - Usan server.inject() para simular requests HTTP
   - Verifican responses (status, body, headers)
   - Verifican efectos en BD con Prisma
```

### Factories

Usar factories para generar datos variables en tests:

```typescript
import { buildGrupo, grupoPresets } from '../../factories/grupo.factory';

// Datos básicos
const grupo = buildGrupo();

// Override de campos
const grupo = buildGrupo({ nombre: 'Mi Grupo' });

// Presets
const grupoUY = grupoPresets.uruguay();
const grupoAR = grupoPresets.argentina();
```

## Problemas Conocidos

### Tests Fallando (6)

1. **list.test.ts**: 2 tests de búsqueda fallan
   - Causa: Dependen de datos creados en beforeAll del archivo
   - Solución: Mover creación de datos adicionales al global-setup o usar datos del seed

2. **get-by-id.test.ts**: 2 tests de relaciones fallan
   - Causa: Assertions esperan campos que no están en el response
   - Solución: Ajustar assertions a los campos reales del response

3. **create.test.ts**: 1 test falla
   - Causa: 409 Conflict por nombre duplicado
   - Solución: Usar nombre dinámico con timestamp

4. **delete.test.ts**: 1 test falla
   - Causa: beforeEach no crea el grupo (solo se ejecuta beforeAll)
   - Solución: Crear grupo dentro del test o usar datos del seed

### Limitaciones

- No se resetea la BD entre tests (solo en global-setup)
- Tests que crean datos afectan a tests subsecuentes del mismo archivo
- beforeAll de archivos individuales no se ejecuta con pool:forks

## Mejoras Futuras

- [ ] Resolver 6 tests fallando
- [ ] Agregar tests para endpoints de Empresas
- [ ] Agregar tests para Cuentas Contables
- [ ] Agregar tests para Asientos
- [ ] Implementar test de permisos por rol
- [ ] Coverage al 100%
- [ ] Tests de carga/performance
- [ ] Integration con CI/CD (GitHub Actions)

## Debugging

### Ver qué tests fallaron
```bash
npm test 2>&1 | grep "FAIL"
```

### Correr solo un archivo
```bash
npx vitest run tests/integration/grupos/create.test.ts
```

### Correr solo un test específico
```typescript
it.only('debe crear un grupo', async () => {
  // Este es el único que se ejecutará
});
```

### Ver datos en la BD de test
```bash
docker exec -it kontaflow-db psql -U postgres -d kontaflow_test
```

```sql
\dt  -- Listar tablas
SELECT * FROM usuarios;
SELECT * FROM grupos_economicos;
```

## Recursos

- [Vitest Documentation](https://vitest.dev/)
- [Fastify Testing](https://www.fastify.io/docs/latest/Guides/Testing/)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing)
