import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient({
  datasources: {
    db: {
      adapter: process.env.DATABASE_URL, // your Neon branch
    },
  },
});

async function main() {
  const users = await prisma.user.findMany();
  console.log(users);
}

main();