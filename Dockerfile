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

# Ensure deploy entrypoint is executable
RUN chmod +x ./deploy.sh

# Production deploy: runs prisma migrate deploy (with first-run baselining),
# seeds, backfills thumbnails, then starts the Next.js server. See ./deploy.sh.
CMD ["sh", "./deploy.sh"]
