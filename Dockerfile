FROM node:20-slim

ARG RAILWAY_GIT_COMMIT_SHA=local
ARG CACHEBUST=${RAILWAY_GIT_COMMIT_SHA}

RUN apt-get update -y && \
    apt-get install -y openssl libssl-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY mindlair/package.json ./
COPY mindlair/apps/web/package.json ./apps/web/
COPY mindlair/packages/ ./packages/

RUN npm install --ignore-scripts
RUN cd apps/web && rm -rf node_modules package-lock.json && npm install

COPY mindlair/ .

RUN cd apps/web && npx prisma generate

RUN npm run build:web

ENV PORT=3000
EXPOSE 3000

# db push applies schema; db seed creates posts; migrate-thumbnails updates existing posts with thumbnails
CMD ["sh", "-c", "cd apps/web && npx prisma db push --skip-generate --accept-data-loss && npx prisma db seed && npx tsx prisma/migrate-thumbnails.ts && npm run start"]
