#!/bin/bash
echo "🔄 Attempting database fix..."
echo ""

# Try to resolve the migration
npx prisma migrate resolve --rolled-back 20251110213000_fix_calendar_account_unique_constraint

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration marked as rolled back!"
    echo "Now deploying migrations..."
    npx prisma migrate deploy
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 SUCCESS! Database is fixed!"
        echo "Check Railway dashboard - your app should deploy now!"
    fi
else
    echo ""
    echo "❌ Still locked. Database is unreachable."
    echo "The auto-retry script will keep trying every 2 minutes."
fi
