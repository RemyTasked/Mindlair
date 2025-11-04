#!/bin/bash

echo "Running Prisma migrations..."
npx prisma migrate deploy

if [ $? -ne 0 ]; then
  echo "Migration failed, exiting..."
  exit 1
fi

echo "Starting application..."
node dist/server.js

