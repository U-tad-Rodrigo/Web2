FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --only=production

FROM node:22-alpine AS production
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY prisma ./prisma
COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000
USER node

CMD ["npm", "run", "start"]
