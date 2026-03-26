import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  const adminPassword = await bcrypt.hash('admin1234', 10);
  const userPassword = await bcrypt.hash('user1234', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@biblioteca.com' },
    update: {},
    create: { name: 'Administrador', email: 'admin@biblioteca.com', password: adminPassword, role: 'ADMIN' },
  });

  const reader = await prisma.user.upsert({
    where: { email: 'lector@biblioteca.com' },
    update: {},
    create: { name: 'Lector Ejemplo', email: 'lector@biblioteca.com', password: userPassword, role: 'USER' },
  });

  console.log('✅ Usuarios:', admin.email, reader.email);

  const books = await prisma.book.createMany({
    data: [
      { title: 'El Quijote', author: 'Miguel de Cervantes', genre: 'Novela', isbn: '978-84-376-0494-7', synopsis: 'Las aventuras del ingenioso hidalgo Don Quijote de la Mancha.', year: 1605, totalCopies: 3 },
      { title: 'Cien Años de Soledad', author: 'Gabriel García Márquez', genre: 'Realismo mágico', isbn: '978-84-376-0495-4', synopsis: 'La historia de la familia Buendía a lo largo de siete generaciones.', year: 1967, totalCopies: 2 },
      { title: 'La Sombra del Viento', author: 'Carlos Ruiz Zafón', genre: 'Misterio', isbn: '978-84-08-04053-0', synopsis: 'Un joven descubre un libro misterioso en el Cementerio de los Libros Olvidados.', year: 2001, totalCopies: 4 },
      { title: '1984', author: 'George Orwell', genre: 'Distopía', isbn: '978-84-450-7616-5', synopsis: 'Una sociedad totalitaria dominada por el Gran Hermano.', year: 1949, totalCopies: 2 },
    ],
    skipDuplicates: true,
  });

  console.log(`✅ Libros creados: ${books.count}`);
  console.log('🎉 Seed completado!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

