# Use Node.js 18 on Alpine Linux
FROM node:18-alpine

# Install OpenSSL 1.1 compatibility libraries
RUN apk add --no-cache openssl1.1-compat

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

# Start the application
CMD ["npm", "run", "start"]
