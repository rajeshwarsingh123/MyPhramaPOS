#!/bin/bash
cd /home/z/my-project
while true; do
    echo "$(date): Starting Next.js dev server..."
    npx next dev -p 3000 >> /tmp/next_server.log 2>&1
    echo "$(date): Server exited with code $?, restarting in 3s..."
    sleep 3
done
