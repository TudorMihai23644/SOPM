import { PrismaClient } from '@prisma/client';
import { DEFAULT_GAME_CONFIG } from '@deadlinehero/shared';

/** Scrie valorile inițiale ale jocului în app_config, fără să le suprascrie pe cele deja ajustate. */
async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    for (const [key, value] of Object.entries(DEFAULT_GAME_CONFIG)) {
      await prisma.appConfig.upsert({ where: { key }, create: { key, value }, update: {} });
    }
    console.log(`app_config: ${Object.keys(DEFAULT_GAME_CONFIG).length} chei verificate`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
