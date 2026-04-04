FROM node:20-slim

ARG RAILWAY_GIT_COMMIT_SHA=local
ARG CACHEBUST=${RAILWAY_GIT_COMMIT_SHA}

RUN apt-get update -y && \
    apt-get install -y openssl libssl-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY mindlayer/package.json ./
COPY mindlayer/apps/web/package.json ./apps/web/
COPY mindlayer/packages/ ./packages/

RUN npm install --ignore-scripts
RUN cd apps/web && rm -rf node_modules package-lock.json && npm install

COPY mindlayer/ .

RUN cd apps/web && npx prisma generate

RUN npm run build:web

ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "cd apps/web && npx prisma db push --skip-generate && npm run start"]
