# Dockerfile for Next.js app with Socket.io
FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
EXPOSE 3000 4000
CMD ["npm", "run", "start"]

