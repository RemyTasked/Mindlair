# Use Node.js 18 on Debian (better Prisma compatibility)
FROM node:18-slim

# Build argument to bust cache when needed
ARG CACHEBUST=9

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

# Copy application code (with cache buster)
RUN echo "Cache bust: $CACHEBUST"
COPY . .

# CRITICAL: Delete node_modules entirely and reinstall to ensure clean Prisma Client
RUN rm -rf node_modules && \
    npm ci && \
    echo "✅ Fresh node_modules installed"

# Generate Prisma Client with the NEW schema
RUN npx prisma generate --schema=./prisma/schema.prisma && \
    echo "✅ Prisma Client generated" && \
    ls -la node_modules/@prisma/client/ | head -20

# Build application (will use the generated Prisma Client)
RUN npm run build
RUN cd src/frontend && npm run build

# Expose port
EXPOSE 3000

# Copy startup script
COPY start.sh .
RUN chmod +x start.sh

# Start the application (with migration on startup)
CMD ["./start.sh"]
