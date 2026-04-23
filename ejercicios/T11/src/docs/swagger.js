import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Biblioteca API',
      version: '1.0.0',
      description: 'API REST para gestión de libros — T11 Deploy & DevOps',
    },
    servers: [
      ...(process.env.RAILWAY_PUBLIC_DOMAIN
        ? [{ url: `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`, description: 'Producción' }]
        : []),
      { url: 'http://localhost:3000', description: 'Desarrollo' },
    ],
    components: {
      schemas: {
        Libro: {
          type: 'object',
          required: ['titulo', 'autor', 'isbn'],
          properties: {
            id: { type: 'string', example: 'cm1abc123' },
            titulo: { type: 'string', example: 'El Quijote' },
            autor: { type: 'string', example: 'Miguel de Cervantes' },
            isbn: { type: 'string', example: '978-0000000001' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Mensaje de error' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

export default swaggerJsdoc(options);
