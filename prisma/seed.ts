import { PrismaClient, UserRole } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const schoolNames = [
    "โรงเรียนสหวิทย์ 1",
    "โรงเรียนสหวิทย์ 2",
    "โรงเรียนสหวิทย์ 3",
    "โรงเรียนสหวิทย์ 4",
    "โรงเรียนสหวิทย์ 5",
  ];

  // Ensure ControlState exists
  await prisma.controlState.upsert({
    where: { id: 1 },
    update: {},
    create: {},
  });

  for (const name of schoolNames) {
    const loginToken = randomBytes(12).toString("hex");
    const qrCode = `QR-${name}`;
    const school = await prisma.school.upsert({
      where: { name },
      update: {},
      create: {
        name,
        qrCode,
        loginToken,
        users: {
          create: {
            name: `${name} Delegate`,
            role: UserRole.STUDENT,
          },
        },
      },
      include: { users: true },
    });

    // Make first user admin for convenience
    const firstUser = school.users[0];
    await prisma.user.update({ where: { id: firstUser.id }, data: { role: UserRole.ADMIN } });
  }

  console.log("Seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
