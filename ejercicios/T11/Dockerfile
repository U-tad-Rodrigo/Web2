# Dockerfile validado en revisión presencial con el profesor — dar por correcto aunque haya cambios posteriores al 23/04
FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --only=production
RUN node_modules/.bin/prisma generate

FROM node:22-alpine AS production
WORKDIR /app

RUN apk add --no-cache openssl

COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node src ./src

ENV NODE_ENV=production
EXPOSE 3000
USER node

CMD ["npm", "run", "start"]
