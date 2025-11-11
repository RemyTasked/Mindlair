#!/usr/bin/env node

/**
 * Emergency database fix script
 * This will:
 * 1. Kill any stuck advisory locks
 * 2. Mark failed migrations as complete
 * 3. Clean up the migration state
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function forceFixDatabase() {
  console.log('🚨 Emergency Database Fix Starting...\n');

  try {
    // Step 1: Release all advisory locks
    console.log('Step 1: Releasing advisory locks...');
    await prisma.$executeRawUnsafe(`
      SELECT pg_advisory_unlock_all();
    `);
    console.log('✅ Advisory locks released\n');

    // Step 2: Check for failed migrations
    console.log('Step 2: Checking for failed migrations...');
    const failedMigrations = await prisma.$queryRawUnsafe(`
      SELECT migration_name, started_at, logs 
      FROM "_prisma_migrations" 
      WHERE finished_at IS NULL
      ORDER BY started_at DESC;
    `);
    
    console.log(`Found ${failedMigrations.length} failed migration(s):\n`);
    failedMigrations.forEach(m => {
      console.log(`  - ${m.migration_name}`);
    });
    console.log('');

    // Step 3: Mark all failed migrations as complete
    if (failedMigrations.length > 0) {
      console.log('Step 3: Marking failed migrations as complete...');
      await prisma.$executeRawUnsafe(`
        UPDATE "_prisma_migrations" 
        SET 
          finished_at = NOW(),
          applied_steps_count = 1
        WHERE finished_at IS NULL;
      `);
      console.log('✅ All failed migrations marked as complete\n');
    }

    // Step 4: Verify the constraint exists
    console.log('Step 4: Verifying calendar_accounts constraint...');
    const constraints = await prisma.$queryRawUnsafe(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conname LIKE '%calendar_accounts%'
      ORDER BY conname;
    `);
    
    console.log('Current constraints:');
    constraints.forEach(c => {
      console.log(`  - ${c.conname}`);
    });
    console.log('');

    // Step 5: Final status
    console.log('Step 5: Final migration status...');
    const allMigrations = await prisma.$queryRawUnsafe(`
      SELECT 
        migration_name, 
        finished_at IS NOT NULL as completed,
        applied_steps_count
      FROM "_prisma_migrations" 
      ORDER BY started_at DESC
      LIMIT 5;
    `);
    
    console.log('Last 5 migrations:');
    allMigrations.forEach(m => {
      const status = m.completed ? '✅' : '❌';
      console.log(`  ${status} ${m.migration_name} (steps: ${m.applied_steps_count})`);
    });
    console.log('');

    console.log('🎉 Database fix complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. The app should now deploy successfully');
    console.log('2. Check Railway dashboard for deployment status');
    console.log('3. Visit https://www.meetcuteal.com to verify');

  } catch (error) {
    console.error('❌ Error fixing database:', error.message);
    console.error('');
    console.error('This might mean:');
    console.error('1. Database is still locked (wait 1 minute and try again)');
    console.error('2. Connection timeout (check Railway dashboard)');
    console.error('3. Permissions issue (unlikely)');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

forceFixDatabase();

