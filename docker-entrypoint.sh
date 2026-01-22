#!/bin/sh
set -e

# Run Prisma migrations/push to ensure database is ready
node ./node_modules/prisma/build/index.js db push

# Start the application
exec node server.js
