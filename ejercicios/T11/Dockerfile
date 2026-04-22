FROM node:22-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

EXPOSE 3000

USER node

CMD ["node", "src/index.js"]
