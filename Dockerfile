# Dockerfile for Next.js app with Socket.io (standalone mode)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
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
# Copy prisma schema for migrations
COPY --from=builder /app/prisma ./prisma
# Ensure Prisma client engine is included
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000
CMD ["node", "server.js"]
