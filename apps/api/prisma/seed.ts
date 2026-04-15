import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create default admin user
  const email = process.env.ADMIN_EMAIL ?? 'admin@yonda.ng';
  const password = process.env.ADMIN_PASSWORD ?? 'changeme123';
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    create: { email, passwordHash, name: 'Admin' },
    update: { passwordHash },
  });

  console.log(`Admin user: ${admin.email} (id: ${admin.id})`);

  // Create a seed FX rate (example: 1 CNY = ₦220 base, 5% margin → ₦231 effective)
  const existingRate = await prisma.fxRate.findFirst({ where: { isActive: true } });
  if (!existingRate) {
    const baseRate = 220;
    const margin = 0.05;
    const effectiveRate = baseRate * (1 + margin);
    const rate = await prisma.fxRate.create({
      data: {
        baseRateCnyToNgn: baseRate,
        marginPercent: margin,
        effectiveRateCnyToNgn: effectiveRate,
        isActive: true,
        setByAdminId: admin.id,
      },
    });
    console.log(`FX rate created: 1 CNY = ₦${effectiveRate} (id: ${rate.id})`);
  } else {
    console.log(`FX rate already exists: 1 CNY = ₦${existingRate.effectiveRateCnyToNgn}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
