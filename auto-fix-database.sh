#!/bin/bash

# Auto-retry script to fix stuck Postgres migration
# This will keep trying until it succeeds

echo "🔄 Auto-Retry Database Fix Script"
echo "=================================="
echo ""
echo "This script will attempt to fix the stuck migration every 2 minutes."
echo "Leave it running until you see '✅ SUCCESS!'"
echo ""
echo "Press Ctrl+C to stop at any time."
echo ""

ATTEMPT=1
MAX_ATTEMPTS=180  # Run for up to 6 hours (180 attempts × 2 minutes)

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Attempt #$ATTEMPT at $(date '+%H:%M:%S')"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Try to mark the failed migration as rolled back
    echo "Step 1: Trying to mark failed migration as rolled back..."
    if npx prisma migrate resolve --rolled-back 20251110213000_fix_calendar_account_unique_constraint 2>&1 | tee /tmp/prisma-output.txt; then
        if grep -q "Migration.*marked as rolled back" /tmp/prisma-output.txt; then
            echo "✅ Successfully marked migration as rolled back!"
            echo ""
            echo "Step 2: Deploying migrations..."
            if npx prisma migrate deploy; then
                echo ""
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo "✅ SUCCESS! Database is fixed!"
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo ""
                echo "Next steps:"
                echo "1. Check Railway dashboard - deployment should succeed now"
                echo "2. Visit https://www.meetcuteal.com to verify"
                echo ""
                exit 0
            fi
        fi
    fi
    
    echo ""
    echo "❌ Attempt #$ATTEMPT failed (database still locked)"
    echo "⏳ Waiting 2 minutes before retry #$((ATTEMPT + 1))..."
    echo ""
    
    # Wait 2 minutes before next attempt
    sleep 120
    
    ATTEMPT=$((ATTEMPT + 1))
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  Max attempts reached ($MAX_ATTEMPTS)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "The database lock hasn't cleared after 6 hours."
echo "Please contact Railway support on Discord:"
echo "https://discord.gg/railway"
echo ""

