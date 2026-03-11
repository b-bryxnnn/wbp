# Real-time Voting App (Next.js + Prisma + Socket.io)

## Setup
```bash
npm install --legacy-peer-deps
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

## Env vars
- `DATABASE_URL=postgresql://wbp_user:wbp_pass@db:5432/wbp_db`
- `JWT_SECRET=your-secret`
- `SOCKET_IO_PATH=/api/socket`

## Features
- QR login ต่อโรงเรียน (`/api/auth/qr?token=...`)
- แอดมินเพิ่มญัตติ/เปิดปิดโหวต/ตั้ง Countdown/ควบคุมจอใหญ่/เช็คชื่อสด/ดู QR
- ผู้โหวตสแกน QR หรือเลือกโรงเรียน → โหวต 3 ตัวเลือก
- จอใหญ่แสดง Countdown/ผลโหวต/องค์ประชุม/ข้อความประกาศแบบ Real-time
- Export PDF/Excel (`/api/export?type=pdf|excel`)

## Deployment hint (Coolify)
สร้างบริการ Postgres + Adminer + Next.js แล้วตั้ง `DATABASE_URL` ให้ตรง service name และรัน `npx prisma migrate deploy` หลัง deploy.

