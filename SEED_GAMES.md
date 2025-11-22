# Seeding Games Database

The Games Hub requires seed data to function. Run this script to populate the database with questions and pairs.

## Quick Start

```bash
# From the project root
npx ts-node src/backend/scripts/seedGames.ts
```

Or if you have ts-node globally:
```bash
ts-node src/backend/scripts/seedGames.ts
```

## What It Does

- Seeds 20+ Scene Sense questions across all categories (Calm, Confidence, Connection, Boundaries, Clarity, Recovery)
- Seeds 30+ Mind Match pairs across all domains
- Sets up difficulty levels 1-5
- Includes scene matching for personalized content

## Troubleshooting

If games show "No questions/pairs available":
1. Make sure the database is running
2. Run the seed script above
3. Check that DATABASE_URL is set correctly
4. Verify Prisma migrations have been run: `npm run prisma:migrate`

