#!/bin/bash
for port in {3000..3010}; do
  pid=$(lsof -ti tcp:$port)
  if [ -n "$pid" ]; then
    echo "Killing PID $pid on port $port"
    kill -9 $pid
  fi
done

clear

# Start your app
npm run dev
