# Multi-stage build for Meet Cute

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

COPY src/frontend/package*.json ./
RUN npm ci

COPY src/frontend ./
RUN npm run build

# Stage 2: Build backend
FROM node:18-alpine AS backend-builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma ./prisma

RUN npm ci
COPY src/backend ./src/backend

RUN npx prisma generate
RUN npm run build:backend

# Stage 3: Production
FROM node:18-alpine AS production

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy built backend
COPY --from=backend-builder /app/dist ./dist

# Copy built frontend (to serve if needed)
COPY --from=frontend-builder /app/frontend/dist ./public

# Create logs directory
RUN mkdir -p logs

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/server.js"]

