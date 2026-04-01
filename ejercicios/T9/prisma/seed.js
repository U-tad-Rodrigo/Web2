import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  const adminPassword = await bcrypt.hash('admin1234', 10);
  const librarianPassword = await bcrypt.hash('librarian1234', 10);
  const userPassword = await bcrypt.hash('user1234', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@biblioteca.com' },
    update: {},
    create: { name: 'Administrador', email: 'admin@biblioteca.com', password: adminPassword, role: 'ADMIN' },
  });

  const librarian = await prisma.user.upsert({
    where: { email: 'bibliotecario@biblioteca.com' },
    update: {},
    create: { name: 'Bibliotecario', email: 'bibliotecario@biblioteca.com', password: librarianPassword, role: 'LIBRARIAN' },
  });

  const reader = await prisma.user.upsert({
    where: { email: 'lector@biblioteca.com' },
    update: {},
    create: { name: 'Lector Ejemplo', email: 'lector@biblioteca.com', password: userPassword, role: 'USER' },
  });

  console.log('✅ Usuarios:', admin.email, librarian.email, reader.email);

  const books = await prisma.book.createMany({
    data: [
      {
        title: 'El Quijote',
        author: 'Miguel de Cervantes',
        genre: 'Novela',
        isbn: '978-84-376-0494-7',
        description: 'Las aventuras del ingenioso hidalgo Don Quijote de la Mancha.',
        publishedYear: 1605,
        copies: 3,
        available: 3,
      },
      {
        title: 'Cien Años de Soledad',
        author: 'Gabriel García Márquez',
        genre: 'Realismo mágico',
        isbn: '978-84-376-0495-4',
        description: 'La historia de la familia Buendía a lo largo de siete generaciones.',
        publishedYear: 1967,
        copies: 2,
        available: 2,
      },
      {
        title: 'La Sombra del Viento',
        author: 'Carlos Ruiz Zafón',
        genre: 'Misterio',
        isbn: '978-84-08-04053-0',
        description: 'Un joven descubre un libro misterioso en el Cementerio de los Libros Olvidados.',
        publishedYear: 2001,
        copies: 4,
        available: 4,
      },
      {
        title: '1984',
        author: 'George Orwell',
        genre: 'Distopía',
        isbn: '978-84-450-7616-5',
        description: 'Una sociedad totalitaria dominada por el Gran Hermano.',
        publishedYear: 1949,
        copies: 2,
        available: 2,
      },
    ],
    skipDuplicates: true,
  });

  console.log(`✅ Libros creados: ${books.count}`);
  console.log('🎉 Seed completado!');
  console.log('\n📋 Credenciales de prueba:');
  console.log('  admin@biblioteca.com / admin1234 (ADMIN)');
  console.log('  bibliotecario@biblioteca.com / librarian1234 (LIBRARIAN)');
  console.log('  lector@biblioteca.com / user1234 (USER)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

