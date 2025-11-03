# Use Node.js 18 on Debian (better Prisma compatibility)
FROM node:18-slim

# Install OpenSSL and other dependencies for Prisma
RUN apt-get update -y && \
    apt-get install -y openssl libssl-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY src/frontend/package*.json ./src/frontend/

# Install dependencies
RUN npm ci
RUN cd src/frontend && npm ci

# Copy application code
COPY . .

# Build application
RUN npm run build
RUN cd src/frontend && npm run build

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Start the application (with migration on startup)
CMD npx prisma migrate resolve --applied 20251101165908_add_focus_sound_preferences && \
    npx prisma migrate resolve --applied 20251101174823_add_post_meeting_insights && \
    npx prisma migrate resolve --applied 20251101181116_add_presley_flow_preferences && \
    npx prisma migrate deploy && npm run start
