#!/bin/sh
mkdir -p /data
node /app/src/server.js 2>&1 || (echo "CRASH: exit code $?" && sleep 60)
