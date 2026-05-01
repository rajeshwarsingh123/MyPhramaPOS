#!/bin/bash
cd /home/z/my-project
while true; do
  npx next dev -p 3000 2>&1
  echo "[$(date)] Next.js crashed, restarting in 3s..." >> /home/z/my-project/crash.log
  sleep 3
done
