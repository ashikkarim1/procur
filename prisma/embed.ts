import { embedAllProducts } from '../src/lib/copilot/retrieval';
import { prisma } from '../src/lib/prisma';

embedAllProducts()
  .then((n) => {
    console.log(`✓ Embedded ${n} products into pgvector`);
    return prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
