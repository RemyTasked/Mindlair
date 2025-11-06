# Use Node.js 18 on Debian (better Prisma compatibility)
FROM node:18-slim

# Automatic cache busting using Railway's commit SHA
# Railway automatically provides RAILWAY_GIT_COMMIT_SHA
ARG RAILWAY_GIT_COMMIT_SHA=local
ARG CACHEBUST=${RAILWAY_GIT_COMMIT_SHA}

# Install OpenSSL, PostgreSQL client, and other dependencies for Prisma
RUN apt-get update -y && \
    apt-get install -y openssl libssl-dev ca-certificates postgresql-client && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY src/frontend/package*.json ./src/frontend/

# Install dependencies
RUN npm ci
RUN cd src/frontend && npm ci

# Copy application code (with automatic cache buster)
RUN echo "🔄 Building from commit: $CACHEBUST"
COPY . .

# Generate Prisma Client (don't reinstall everything)
RUN npx prisma generate --schema=./prisma/schema.prisma && \
    echo "✅ Prisma Client generated"

# Build application (will use the generated Prisma Client)
RUN npm run build && cd src/frontend && npm run build

# Expose port
EXPOSE 3000

# Copy startup script
COPY start.sh .
RUN chmod +x start.sh

# Start the application (with migration on startup)
CMD ["./start.sh"]
