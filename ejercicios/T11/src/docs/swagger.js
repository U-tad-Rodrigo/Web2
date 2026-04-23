import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Biblioteca API',
      version: '1.0.0',
      description:
        'API REST para gestión de una biblioteca digital. Permite gestionar libros, préstamos y reseñas con autenticación JWT.',
    },
    servers: [
      ...(process.env.RAILWAY_PUBLIC_DOMAIN
        ? [{ url: `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/api`, description: 'Producción' }]
        : []),
      { url: 'http://localhost:3000/api', description: 'Desarrollo local' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        RegisterInput: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Ada Lovelace' },
            email: { type: 'string', format: 'email', example: 'ada@biblioteca.com' },
            password: { type: 'string', minLength: 6, example: 'secret123' },
          },
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@biblioteca.com' },
            password: { type: 'string', example: 'admin1234' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Ada Lovelace' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['USER', 'LIBRARIAN', 'ADMIN'], example: 'USER' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR...' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        BookInput: {
          type: 'object',
          required: ['title', 'author', 'genre', 'isbn'],
          properties: {
            title: { type: 'string', example: 'El Quijote' },
            author: { type: 'string', example: 'Miguel de Cervantes' },
            genre: { type: 'string', example: 'Novela' },
            isbn: { type: 'string', example: '978-84-376-0494-7' },
            description: { type: 'string', example: 'Las aventuras del ingenioso hidalgo...' },
            publishedYear: { type: 'integer', example: 1605 },
            copies: { type: 'integer', example: 3, default: 1 },
          },
        },
        Book: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'El Quijote' },
            author: { type: 'string', example: 'Miguel de Cervantes' },
            genre: { type: 'string', example: 'Novela' },
            isbn: { type: 'string', example: '978-84-376-0494-7' },
            description: { type: 'string' },
            publishedYear: { type: 'integer', example: 1605 },
            copies: { type: 'integer', example: 3 },
            available: { type: 'integer', example: 3 },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        LoanInput: {
          type: 'object',
          required: ['bookId'],
          properties: {
            bookId: { type: 'integer', example: 1 },
          },
        },
        Loan: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            userId: { type: 'integer', example: 2 },
            bookId: { type: 'integer', example: 1 },
            loanDate: { type: 'string', format: 'date-time' },
            dueDate: { type: 'string', format: 'date-time' },
            returnDate: { type: 'string', format: 'date-time', nullable: true },
            status: { type: 'string', enum: ['ACTIVE', 'RETURNED', 'OVERDUE'], example: 'ACTIVE' },
          },
        },
        ReviewInput: {
          type: 'object',
          required: ['rating'],
          properties: {
            rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
            comment: { type: 'string', example: 'Obra maestra de la literatura.' },
          },
        },
        Review: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            rating: { type: 'integer', example: 5 },
            comment: { type: 'string', example: 'Obra maestra.' },
            userId: { type: 'integer', example: 2 },
            bookId: { type: 'integer', example: 1 },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Recurso no encontrado' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

export default swaggerJsdoc(options);
