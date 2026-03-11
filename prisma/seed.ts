import { PrismaClient, UserRole } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

const schoolData = [
  {
    name: "โรงเรียนเตรียมอุดมศึกษาพัฒนาการ",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/ae/%E0%B8%95%E0%B8%A3%E0%B8%B2%E0%B8%9E%E0%B8%A3%E0%B8%B0%E0%B9%80%E0%B8%81%E0%B8%B5%E0%B9%89%E0%B8%A2%E0%B8%A7%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%88%E0%B8%B3%E0%B9%82%E0%B8%A3%E0%B8%87%E0%B9%80%E0%B8%A3%E0%B8%B5%E0%B8%A2%E0%B8%99%E0%B9%80%E0%B8%95%E0%B8%A3%E0%B8%B5%E0%B8%A1%E0%B8%AD%E0%B8%B8%E0%B8%94%E0%B8%A1%E0%B8%A8%E0%B8%B6%E0%B8%81%E0%B8%A9%E0%B8%B2%E0%B8%9E%E0%B8%B1%E0%B8%92%E0%B8%99%E0%B8%B2%E0%B8%81%E0%B8%B2%E0%B8%A3.png",
  },
  {
    name: "โรงเรียนเตรียมอุดมศึกษาพัฒนาการ สุวรรณภูมิ",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/4/47/Phra_Kiao_Triamnom_Colored.png",
  },
  {
    name: "โรงเรียนเตรียมอุดมศึกษาพัฒนาการ ราชสีมา",
    logoUrl: "https://dsr.ac.th/wp-content/uploads/2017/11/DSRvector-952x1024.png",
  },
  {
    name: "โรงเรียนนวมินทราชูทิศ กรุงเทพมหานคร",
    logoUrl: "http://ntun.ac.th/_files_school/10106510/data/10106510_0_20160601-140355.png",
  },
  {
    name: "โรงเรียนพรตพิทยพยัต",
    logoUrl: "https://prot.ac.th/_files_school/10105750/workstudent/10105750_0_20151212-184742.png",
  },
  {
    name: "โรงเรียนบดินทรเดชา (สิงห์ สิงหเสนี) ๔",
    logoUrl: "https://upload.wikimedia.org/wikipedia/th/thumb/f/fc/%E0%B8%95%E0%B8%A3%E0%B8%B2%E0%B8%9E%E0%B8%A3%E0%B8%B0%E0%B9%80%E0%B8%81%E0%B8%B5%E0%B9%89%E0%B8%A2%E0%B8%A7_%E0%B8%9A.%E0%B8%94.%E0%B9%94.png/250px-%E0%B8%95%E0%B8%A3%E0%B8%B2%E0%B8%9E%E0%B8%A3%E0%B8%B0%E0%B9%80%E0%B8%81%E0%B8%B5%E0%B9%89%E0%B8%A2%E0%B8%A7_%E0%B8%9A.%E0%B8%94.%E0%B9%94.png",
  },
  {
    name: "โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9f/RSL001.png",
  },
  {
    name: "โรงเรียนพัฒนาการ (ศรีเสนานุสรณ์)",
    logoUrl: "https://krunot.com/panj/Logo.png",
  },
  {
    name: "โรงเรียนลาดปลาเค้าพิทยาคม",
    logoUrl: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh_9K4exuGifLeZnbeqH0iq2zJAdwEPAmlF-3GalxU3r558PCUs_bib9r6zPD_8XtKUXePu15zYhO8WMFlSMRHMPm6DoqGMjCn1sG2NZu0uVC5LsBVXhSXhQhwxTAQwqbDA-mHCUAG3CPDQ3qWZpAm3rffhGjuEf73OKay137yXOyxLndVfw4CdMeBUxZk/s320/10105309_0_20211213-154630.png",
  },
];

async function main() {
  // Ensure ControlState exists
  await prisma.controlState.upsert({
    where: { id: 1 },
    update: {},
    create: {},
  });

  for (const data of schoolData) {
    const loginToken = randomBytes(12).toString("hex");
    const qrCode = `QR-${data.name}`;
    const school = await prisma.school.upsert({
      where: { name: data.name },
      update: { logoUrl: data.logoUrl },
      create: {
        name: data.name,
        qrCode,
        loginToken,
        logoUrl: data.logoUrl,
        users: {
          create: {
            name: `${data.name} ผู้แทน`,
            role: UserRole.STUDENT,
          },
        },
      },
      include: { users: true },
    });

    const firstUser = school.users[0];
    if (firstUser) {
      await prisma.user.update({ where: { id: firstUser.id }, data: { role: UserRole.ADMIN } });
    }
  }

  console.log("Seed completed with", schoolData.length, "schools");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
