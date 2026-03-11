# Dockerfile for Next.js app with Socket.io (standalone mode)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
# Compile seed.ts to plain JS so it can run without ts-node in production
RUN node -e "\
const ts=require('typescript'),fs=require('fs');\
const s=fs.readFileSync('prisma/seed.ts','utf8');\
const r=ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,esModuleInterop:true}});\
fs.writeFileSync('prisma/seed.js',r.outputText);"
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy standalone build output (includes server.js + minimal node_modules)
COPY --from=builder /app/.next/standalone ./
# Copy static assets (not included in standalone output)
COPY --from=builder /app/.next/static ./.next/static
# Copy prisma schema + compiled seed
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma/seed.js ./prisma/seed.js
# Ensure Prisma client engine is included
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Copy prisma CLI so we can run db push at startup
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Startup: push schema to DB → seed data → start server
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --skip-generate && node prisma/seed.js && node server.js"]
