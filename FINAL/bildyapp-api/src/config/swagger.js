import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BildyApp API',
      version: '2.0.0',
      description: 'API REST para gestión de albaranes de obra — clientes, proyectos y partes de trabajo.',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Desarrollo' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error:   { type: 'boolean', example: true },
            code:    { type: 'string',  example: 'NOT_FOUND' },
            message: { type: 'string',  example: 'Recurso no encontrado' },
          },
        },
        Address: {
          type: 'object',
          properties: {
            street:   { type: 'string', example: 'Calle Mayor' },
            number:   { type: 'string', example: '12' },
            postal:   { type: 'string', example: '28001' },
            city:     { type: 'string', example: 'Madrid' },
            province: { type: 'string', example: 'Madrid' },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id:       { type: 'string', example: '664f1a2b3c4d5e6f7a8b9c0d' },
            email:     { type: 'string', format: 'email', example: 'usuario@empresa.com' },
            name:      { type: 'string', example: 'Juan' },
            lastName:  { type: 'string', example: 'García' },
            fullName:  { type: 'string', example: 'Juan García' },
            nif:       { type: 'string', example: '12345678A' },
            role:      { type: 'string', enum: ['admin', 'guest'], example: 'admin' },
            status:    { type: 'string', enum: ['pending', 'verified'], example: 'verified' },
            company:   { $ref: '#/components/schemas/Company' },
            address:   { $ref: '#/components/schemas/Address' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Company: {
          type: 'object',
          properties: {
            _id:         { type: 'string', example: '664f1a2b3c4d5e6f7a8b9c0e' },
            name:        { type: 'string', example: 'Construcciones García S.L.' },
            cif:         { type: 'string', example: 'B12345678' },
            logo:        { type: 'string', example: '/uploads/logo-uuid.png' },
            isFreelance: { type: 'boolean', example: false },
            address:     { $ref: '#/components/schemas/Address' },
          },
        },
        Client: {
          type: 'object',
          properties: {
            _id:       { type: 'string', example: '664f1a2b3c4d5e6f7a8b9c0f' },
            name:      { type: 'string', example: 'Promotora Rivas S.A.' },
            cif:       { type: 'string', example: 'A87654321' },
            email:     { type: 'string', format: 'email', example: 'contacto@rivas.com' },
            phone:     { type: 'string', example: '912345678' },
            address:   { $ref: '#/components/schemas/Address' },
            deleted:   { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            _id:         { type: 'string', example: '664f1a2b3c4d5e6f7a8b9c10' },
            client:      { $ref: '#/components/schemas/Client' },
            name:        { type: 'string', example: 'Obra Calle Serrano 45' },
            projectCode: { type: 'string', example: 'OBR-2024-001' },
            address:     { $ref: '#/components/schemas/Address' },
            email:       { type: 'string', format: 'email' },
            notes:       { type: 'string' },
            active:      { type: 'boolean', example: true },
            deleted:     { type: 'boolean', example: false },
            createdAt:   { type: 'string', format: 'date-time' },
          },
        },
        DeliveryNote: {
          type: 'object',
          properties: {
            _id:          { type: 'string', example: '664f1a2b3c4d5e6f7a8b9c11' },
            client:       { $ref: '#/components/schemas/Client' },
            project:      { $ref: '#/components/schemas/Project' },
            format:       { type: 'string', enum: ['material', 'hours'], example: 'hours' },
            description:  { type: 'string', example: 'Trabajo de albañilería' },
            workDate:     { type: 'string', format: 'date', example: '2024-06-01' },
            hours:        { type: 'number', example: 8 },
            workers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name:  { type: 'string', example: 'Pedro López' },
                  hours: { type: 'number', example: 8 },
                },
              },
            },
            material:     { type: 'string', example: 'Cemento Portland' },
            quantity:     { type: 'number', example: 500 },
            unit:         { type: 'string', example: 'kg' },
            signed:       { type: 'boolean', example: false },
            signedAt:     { type: 'string', format: 'date-time' },
            signatureUrl: { type: 'string', example: '/uploads/sign-uuid.png' },
            pdfUrl:       { type: 'string' },
            deleted:      { type: 'boolean', example: false },
            createdAt:    { type: 'string', format: 'date-time' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total:      { type: 'integer', example: 42 },
            page:       { type: 'integer', example: 1 },
            totalPages: { type: 'integer', example: 5 },
          },
        },
        Tokens: {
          type: 'object',
          properties: {
            accessToken:  { type: 'string', example: 'eyJhbGci...' },
            refreshToken: { type: 'string', example: 'eyJhbGci...' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth',         description: 'Registro, login y gestión de sesión' },
      { name: 'Users',        description: 'Perfil, empresa y administración de usuarios' },
      { name: 'Clients',      description: 'Gestión de clientes de obra' },
      { name: 'Projects',     description: 'Gestión de proyectos' },
      { name: 'DeliveryNotes',description: 'Albaranes — creación, firma y PDF' },
    ],
    paths: {
      // ── AUTH ──────────────────────────────────────────────────────────────────
      '/api/user/register': {
        post: {
          tags: ['Auth'],
          summary: 'Registrar nuevo usuario',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email:    { type: 'string', format: 'email', example: 'usuario@empresa.com' },
                    password: { type: 'string', minLength: 8,    example: 'Password1!' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Usuario creado. Estado pending hasta verificar email.',
              content: { 'application/json': { schema: {
                allOf: [{ $ref: '#/components/schemas/Tokens' }, { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } }],
              } } },
            },
            400: { description: 'Datos inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            409: { description: 'Email ya registrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        put: {
          tags: ['Users'],
          summary: 'Actualizar datos personales (name, lastName, nif, address)',
          responses: {
            200: { description: 'Datos actualizados', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } },
            401: { description: 'No autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name:     { type: 'string', example: 'Juan' },
                    lastName: { type: 'string', example: 'García' },
                    nif:      { type: 'string', example: '12345678A' },
                    address:  { $ref: '#/components/schemas/Address' },
                  },
                },
              },
            },
          },
        },
      },
      '/api/user/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login con email y contraseña',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email:    { type: 'string', format: 'email', example: 'usuario@empresa.com' },
                    password: { type: 'string', example: 'Password1!' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Login correcto', content: { 'application/json': { schema: {
              allOf: [{ $ref: '#/components/schemas/Tokens' }, { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } }],
            } } } },
            401: { description: 'Credenciales incorrectas', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/user/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Renovar access token mediante refresh token',
          security: [],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } },
          },
          responses: {
            200: { description: 'Nuevos tokens', content: { 'application/json': { schema: { $ref: '#/components/schemas/Tokens' } } } },
            401: { description: 'Refresh token inválido o expirado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/user/validation': {
        put: {
          tags: ['Auth'],
          summary: 'Verificar email con código de 6 dígitos',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['code'], properties: { code: { type: 'string', example: '123456' } } } } },
          },
          responses: {
            200: { description: 'Email verificado' },
            400: { description: 'Código incorrecto' },
            429: { description: 'Máximo de intentos alcanzado' },
          },
        },
      },
      '/api/user/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Cerrar sesión (invalida refresh token)',
          responses: { 200: { description: 'Sesión cerrada' }, 401: { description: 'No autenticado' } },
        },
      },
      '/api/user': {
        get: {
          tags: ['Users'],
          summary: 'Obtener perfil del usuario autenticado',
          responses: {
            200: { description: 'Perfil del usuario', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } },
            401: { description: 'No autenticado' },
          },
        },
        delete: {
          tags: ['Users'],
          summary: 'Eliminar cuenta (?soft=true para archivar)',
          parameters: [{ in: 'query', name: 'soft', schema: { type: 'boolean' }, description: 'true = soft delete, sin parámetro = hard delete' }],
          responses: { 200: { description: 'Usuario eliminado' }, 401: { description: 'No autenticado' } },
        },
      },
      '/api/user/company': {
        patch: {
          tags: ['Users'],
          summary: 'Crear o unirse a empresa',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['isFreelance'],
                  properties: {
                    isFreelance: { type: 'boolean', example: false },
                    name:        { type: 'string', example: 'Construcciones García S.L.' },
                    cif:         { type: 'string', example: 'B12345678' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Empresa actualizada', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } },
          },
        },
      },
      '/api/user/logo': {
        patch: {
          tags: ['Users'],
          summary: 'Subir logo de empresa',
          requestBody: {
            required: true,
            content: { 'multipart/form-data': { schema: { type: 'object', properties: { logo: { type: 'string', format: 'binary' } } } } },
          },
          responses: {
            200: { description: 'Logo actualizado', content: { 'application/json': { schema: { type: 'object', properties: { logoUrl: { type: 'string' } } } } } },
          },
        },
      },
      '/api/user/password': {
        put: {
          tags: ['Users'],
          summary: 'Cambiar contraseña',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['currentPassword', 'newPassword'],
                  properties: {
                    currentPassword: { type: 'string' },
                    newPassword:     { type: 'string', minLength: 8 },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Contraseña cambiada' }, 401: { description: 'Contraseña actual incorrecta' } },
        },
      },
      '/api/user/invite': {
        post: {
          tags: ['Users'],
          summary: 'Invitar compañero a la empresa (solo admin)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'name', 'lastName'],
                  properties: {
                    email:    { type: 'string', format: 'email' },
                    name:     { type: 'string' },
                    lastName: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Usuario invitado creado' }, 403: { description: 'Solo administradores' } },
        },
      },

      // ── CLIENTS ──────────────────────────────────────────────────────────────
      '/api/client': {
        post: {
          tags: ['Clients'],
          summary: 'Crear cliente',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'cif'],
                  properties: {
                    name:    { type: 'string', example: 'Promotora Rivas S.A.' },
                    cif:     { type: 'string', example: 'A87654321' },
                    email:   { type: 'string', format: 'email' },
                    phone:   { type: 'string', example: '912345678' },
                    address: { $ref: '#/components/schemas/Address' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Cliente creado', content: { 'application/json': { schema: { type: 'object', properties: { client: { $ref: '#/components/schemas/Client' } } } } } },
            409: { description: 'CIF ya existe en esta empresa' },
          },
        },
        get: {
          tags: ['Clients'],
          summary: 'Listar clientes activos con paginación',
          parameters: [
            { in: 'query', name: 'page',  schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 } },
            { in: 'query', name: 'name',  schema: { type: 'string' }, description: 'Filtrar por nombre (regex)' },
            { in: 'query', name: 'sort',  schema: { type: 'string', example: 'name' } },
          ],
          responses: {
            200: {
              description: 'Lista paginada de clientes',
              content: { 'application/json': { schema: {
                allOf: [
                  { $ref: '#/components/schemas/Pagination' },
                  { type: 'object', properties: { clients: { type: 'array', items: { $ref: '#/components/schemas/Client' } } } },
                ],
              } } },
            },
          },
        },
      },
      '/api/client/archived': {
        get: {
          tags: ['Clients'],
          summary: 'Listar clientes archivados (soft-deleted)',
          responses: {
            200: { description: 'Clientes archivados', content: { 'application/json': { schema: { type: 'object', properties: { clients: { type: 'array', items: { $ref: '#/components/schemas/Client' } } } } } } },
          },
        },
      },
      '/api/client/{id}': {
        get: {
          tags: ['Clients'],
          summary: 'Obtener cliente por ID',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Cliente', content: { 'application/json': { schema: { type: 'object', properties: { client: { $ref: '#/components/schemas/Client' } } } } } },
            404: { description: 'No encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        put: {
          tags: ['Clients'],
          summary: 'Actualizar cliente',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: { 'application/json': { schema: { type: 'object', properties: {
              name: { type: 'string' }, cif: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, address: { $ref: '#/components/schemas/Address' },
            } } } },
          },
          responses: { 200: { description: 'Cliente actualizado' }, 404: { description: 'No encontrado' } },
        },
        delete: {
          tags: ['Clients'],
          summary: 'Eliminar cliente (?soft=true para archivar)',
          parameters: [
            { in: 'path',  name: 'id',   required: true, schema: { type: 'string' } },
            { in: 'query', name: 'soft', schema: { type: 'boolean' } },
          ],
          responses: { 200: { description: 'Cliente eliminado o archivado' }, 404: { description: 'No encontrado' } },
        },
      },
      '/api/client/{id}/restore': {
        patch: {
          tags: ['Clients'],
          summary: 'Restaurar cliente archivado',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Cliente restaurado' }, 404: { description: 'No encontrado' } },
        },
      },

      // ── PROJECTS ─────────────────────────────────────────────────────────────
      '/api/project': {
        post: {
          tags: ['Projects'],
          summary: 'Crear proyecto',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['client', 'name', 'projectCode'],
                  properties: {
                    client:      { type: 'string', description: 'ObjectId del cliente' },
                    name:        { type: 'string', example: 'Obra Calle Serrano 45' },
                    projectCode: { type: 'string', example: 'OBR-2024-001' },
                    address:     { $ref: '#/components/schemas/Address' },
                    email:       { type: 'string', format: 'email' },
                    notes:       { type: 'string' },
                    active:      { type: 'boolean', default: true },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Proyecto creado', content: { 'application/json': { schema: { type: 'object', properties: { project: { $ref: '#/components/schemas/Project' } } } } } },
            404: { description: 'Cliente no encontrado' },
            409: { description: 'Código de proyecto duplicado' },
          },
        },
        get: {
          tags: ['Projects'],
          summary: 'Listar proyectos con filtros y paginación',
          parameters: [
            { in: 'query', name: 'page',   schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit',  schema: { type: 'integer', default: 10 } },
            { in: 'query', name: 'name',   schema: { type: 'string' } },
            { in: 'query', name: 'active', schema: { type: 'boolean' } },
            { in: 'query', name: 'client', schema: { type: 'string' }, description: 'Filtrar por ObjectId de cliente' },
          ],
          responses: {
            200: { description: 'Lista paginada', content: { 'application/json': { schema: {
              allOf: [{ $ref: '#/components/schemas/Pagination' }, { type: 'object', properties: { projects: { type: 'array', items: { $ref: '#/components/schemas/Project' } } } }],
            } } } },
          },
        },
      },
      '/api/project/archived': {
        get: {
          tags: ['Projects'],
          summary: 'Listar proyectos archivados',
          responses: { 200: { description: 'Proyectos archivados' } },
        },
      },
      '/api/project/{id}': {
        get: {
          tags: ['Projects'],
          summary: 'Obtener proyecto por ID (popula client)',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Proyecto', content: { 'application/json': { schema: { type: 'object', properties: { project: { $ref: '#/components/schemas/Project' } } } } } }, 404: { description: 'No encontrado' } },
        },
        put: {
          tags: ['Projects'],
          summary: 'Actualizar proyecto',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: {
            name: { type: 'string' }, projectCode: { type: 'string' }, active: { type: 'boolean' }, notes: { type: 'string' },
          } } } } },
          responses: { 200: { description: 'Proyecto actualizado' }, 404: { description: 'No encontrado' } },
        },
        delete: {
          tags: ['Projects'],
          summary: 'Eliminar proyecto (?soft=true para archivar)',
          parameters: [
            { in: 'path',  name: 'id',   required: true, schema: { type: 'string' } },
            { in: 'query', name: 'soft', schema: { type: 'boolean' } },
          ],
          responses: { 200: { description: 'Proyecto eliminado' }, 404: { description: 'No encontrado' } },
        },
      },
      '/api/project/{id}/restore': {
        patch: {
          tags: ['Projects'],
          summary: 'Restaurar proyecto archivado',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Proyecto restaurado' } },
        },
      },

      // ── DELIVERY NOTES ───────────────────────────────────────────────────────
      '/api/deliverynote': {
        post: {
          tags: ['DeliveryNotes'],
          summary: 'Crear albarán',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['client', 'project', 'format', 'workDate'],
                  properties: {
                    client:      { type: 'string', description: 'ObjectId del cliente' },
                    project:     { type: 'string', description: 'ObjectId del proyecto' },
                    format:      { type: 'string', enum: ['material', 'hours'] },
                    description: { type: 'string' },
                    workDate:    { type: 'string', format: 'date', example: '2024-06-01' },
                    material:    { type: 'string', description: 'Requerido si format=material' },
                    quantity:    { type: 'number' },
                    unit:        { type: 'string' },
                    hours:       { type: 'number', description: 'Requerido si format=hours (o workers)' },
                    workers: {
                      type: 'array',
                      items: { type: 'object', properties: { name: { type: 'string' }, hours: { type: 'number' } } },
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Albarán creado', content: { 'application/json': { schema: { type: 'object', properties: { deliveryNote: { $ref: '#/components/schemas/DeliveryNote' } } } } } },
            400: { description: 'Datos inválidos (superRefine: campos según format)' },
            404: { description: 'Cliente o proyecto no encontrado' },
          },
        },
        get: {
          tags: ['DeliveryNotes'],
          summary: 'Listar albaranes con filtros y paginación',
          parameters: [
            { in: 'query', name: 'page',    schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit',   schema: { type: 'integer', default: 10 } },
            { in: 'query', name: 'project', schema: { type: 'string' } },
            { in: 'query', name: 'client',  schema: { type: 'string' } },
            { in: 'query', name: 'format',  schema: { type: 'string', enum: ['material', 'hours'] } },
            { in: 'query', name: 'signed',  schema: { type: 'boolean' } },
            { in: 'query', name: 'from',    schema: { type: 'string', format: 'date' }, description: 'Fecha inicio (workDate >=)' },
            { in: 'query', name: 'to',      schema: { type: 'string', format: 'date' }, description: 'Fecha fin (workDate <=)' },
          ],
          responses: {
            200: { description: 'Lista paginada de albaranes', content: { 'application/json': { schema: {
              allOf: [{ $ref: '#/components/schemas/Pagination' }, { type: 'object', properties: { deliveryNotes: { type: 'array', items: { $ref: '#/components/schemas/DeliveryNote' } } } }],
            } } } },
          },
        },
      },
      '/api/deliverynote/{id}': {
        get: {
          tags: ['DeliveryNotes'],
          summary: 'Obtener albarán por ID (popula user, client, project)',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Albarán', content: { 'application/json': { schema: { type: 'object', properties: { deliveryNote: { $ref: '#/components/schemas/DeliveryNote' } } } } } },
            404: { description: 'No encontrado' },
          },
        },
        delete: {
          tags: ['DeliveryNotes'],
          summary: 'Eliminar albarán (solo si no está firmado)',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Albarán eliminado' },
            400: { description: 'No se puede eliminar un albarán firmado' },
            404: { description: 'No encontrado' },
          },
        },
      },
      '/api/deliverynote/pdf/{id}': {
        get: {
          tags: ['DeliveryNotes'],
          summary: 'Descargar PDF del albarán',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'PDF generado con pdfkit', content: { 'application/pdf': {} } },
            302: { description: 'Redirección a pdfUrl si ya existe' },
            404: { description: 'Albarán no encontrado' },
          },
        },
      },
      '/api/deliverynote/{id}/sign': {
        patch: {
          tags: ['DeliveryNotes'],
          summary: 'Firmar albarán (subir imagen de firma)',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'multipart/form-data': { schema: { type: 'object', required: ['signature'], properties: { signature: { type: 'string', format: 'binary' } } } } },
          },
          responses: {
            200: { description: 'Albarán firmado', content: { 'application/json': { schema: { type: 'object', properties: { deliveryNote: { $ref: '#/components/schemas/DeliveryNote' } } } } } },
            400: { description: 'Ya está firmado' },
            404: { description: 'No encontrado' },
          },
        },
      },

      // ── HEALTH ───────────────────────────────────────────────────────────────
      '/health': {
        get: {
          tags: ['Auth'],
          summary: 'Health check — estado del servidor y BD',
          security: [],
          responses: {
            200: {
              description: 'Servidor operativo',
              content: { 'application/json': { schema: {
                type: 'object',
                properties: {
                  status:    { type: 'string', example: 'ok' },
                  db:        { type: 'string', enum: ['connected', 'disconnected'], example: 'connected' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              } } },
            },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
