/**
 * Singleton Prisma Client
 * 
 * This ensures all parts of the application use the SAME Prisma Client instance,
 * preventing issues with multiple clients using different cached schemas.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Global singleton instance
let prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    logger.info('🔷 Initializing Prisma Client singleton');
    
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
    
    // Log the Prisma Client version/schema info
    logger.info('✅ Prisma Client initialized', {
      environment: process.env.NODE_ENV,
    });
  }
  
  return prismaInstance;
}

// Export the singleton instance
export const prisma = getPrismaClient();

// Cleanup on process termination
process.on('beforeExit', async () => {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    logger.info('🔷 Prisma Client disconnected');
  }
});

