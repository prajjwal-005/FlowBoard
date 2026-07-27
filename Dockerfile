# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci

# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ARG DIRECT_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ARG JWT_SECRET="dummy-build-time-secret"
ARG REDIS_URL="redis://localhost:6379"
ARG OPENAI_API_KEY="dummy"
ARG CLOUDINARY_URL="cloudinary://dummy:dummy@dummy"
ARG CLOUDINARY_CLOUD_NAME="dummy"
ARG CLOUDINARY_API_KEY="dummy"
ARG CLOUDINARY_API_SECRET="dummy"

ENV DATABASE_URL=$DATABASE_URL \
    DIRECT_URL=$DIRECT_URL \
    JWT_SECRET=$JWT_SECRET \
    REDIS_URL=$REDIS_URL \
    OPENAI_API_KEY=$OPENAI_API_KEY \
    CLOUDINARY_URL=$CLOUDINARY_URL \
    CLOUDINARY_CLOUD_NAME=$CLOUDINARY_CLOUD_NAME \
    CLOUDINARY_API_KEY=$CLOUDINARY_API_KEY \
    CLOUDINARY_API_SECRET=$CLOUDINARY_API_SECRET

RUN npx prisma generate
RUN npm run build

# ---------- runner ----------
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.* ./
COPY --from=builder /app/tsconfig.json ./tsconfig.json
EXPOSE 3000
CMD ["npm", "run", "start"]