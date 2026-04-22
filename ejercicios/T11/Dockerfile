FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

FROM node:22-alpine AS production
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

COPY src ./src

EXPOSE 3000

USER node

CMD ["node", "src/index.js"]
