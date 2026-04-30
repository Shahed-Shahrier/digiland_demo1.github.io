import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const usersCount = await prisma.user.count();
  if (usersCount > 0) {
    console.log('Already seeded');
    return;
  }

  await prisma.user.createMany({ data: [
    { name: 'Rahim Uddin', email: 'citizen@demo.com', password: 'demo1234', role: 'citizen', phone: '01712345678' },
    { name: 'Kamal Hossain', email: 'officer@demo.com', password: 'demo1234', role: 'land_officer', phone: '01612345678' },
    { name: 'Jabbar Mia', email: 'survey@demo.com', password: 'demo1234', role: 'survey_officer', phone: '01512345678' },
    { name: 'Admin User', email: 'admin@demo.com', password: 'demo1234', role: 'admin', phone: '01912345678' }
  ] });

  console.log('Seeded users');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
