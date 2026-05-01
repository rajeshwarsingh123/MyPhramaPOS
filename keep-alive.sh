#!/bin/bash
cd /home/z/my-project
while true; do
  echo "Starting Next.js dev server..."
  npx next dev -p 3000
  echo "Server crashed, restarting in 2s..."
  sleep 2
done
