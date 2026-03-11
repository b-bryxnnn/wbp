"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const prisma = new client_1.PrismaClient();
const schoolData = [
    {
        name: "โรงเรียนเตรียมอุดมศึกษาพัฒนาการ สุวรรณภูมิ",
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/4/47/Phra_Kiao_Triamnom_Colored.png",
    },
    {
        name: "โรงเรียนเตรียมอุดมศึกษาน้อมเกล้า",
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Phra_Kiao_Triamnom_Colored.png/960px-Phra_Kiao_Triamnom_Colored.png",
    },
    {
        name: "โรงเรียนเทพศิรินทร์ร่มเกล้า",
        logoUrl: "https://dsr.ac.th/wp-content/uploads/2017/11/DSRvector-768x826.png",
    },
    {
        name: "โรงเรียนนวมินทราชินูทิศ เตรียมอุดมศึกษาน้อมเกล้า",
        logoUrl: "https://fth1.com/uppic/10106510/news/10106510_0_20231130-104017.jpg",
    },
    {
        name: "โรงเรียนพรตพิทยพยัต",
        logoUrl: "https://prot.ac.th/_files_school/10105750/workstudent/10105750_0_20151212-184742.png",
    },
    {
        name: "โรงเรียนมัธยมวัดหนองจอก",
        logoUrl: "https://tesf.or.th/esportswhatschooltour2024/images/schoollogo/nj.png",
    },
    {
        name: "โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง",
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9f/RSL001.png",
    },
    {
        name: "โรงเรียนบดินทรเดชา (สิงห์ สิงหเสนี) 4",
        logoUrl: "https://upload.wikimedia.org/wikipedia/th/thumb/f/fc/%E0%B8%95%E0%B8%A3%E0%B8%B2%E0%B8%9E%E0%B8%A3%E0%B8%B0%E0%B9%80%E0%B8%81%E0%B8%B5%E0%B9%89%E0%B8%A2%E0%B8%A7_%E0%B8%9A.%E0%B8%94.%E0%B9%94.png/250px-%E0%B8%95%E0%B8%A3%E0%B8%B2%E0%B8%9E%E0%B8%A3%E0%B8%B0%E0%B9%80%E0%B8%81%E0%B8%B5%E0%B9%89%E0%B8%A2%E0%B8%A7_%E0%B8%9A.%E0%B8%94.%E0%B9%94.png",
    },
    {
        name: "โรงเรียนเตรียมอุดมศึกษา สุวินทวงศ์",
        logoUrl: "https://i0.wp.com/athipportfolio.wordpress.com/wp-content/uploads/2017/08/10105309_0_20130923-171137.png?w=2500&h=&ssl=1",
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
        const loginToken = (0, crypto_1.randomBytes)(48).toString("hex");
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
                        role: client_1.UserRole.STUDENT,
                    },
                },
            },
            include: { users: true },
        });
        const firstUser = school.users[0];
        if (firstUser) {
            await prisma.user.update({ where: { id: firstUser.id }, data: { role: client_1.UserRole.ADMIN } });
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
