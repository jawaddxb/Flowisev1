#!/bin/bash

echo "Killing all existing Flowise servers..."
pkill -9 -f "flowise" 2>/dev/null
pkill -9 -f "packages/server" 2>/dev/null
lsof -ti :3000 | xargs kill -9 2>/dev/null

sleep 3

echo "Starting fresh server..."
cd /Users/jawadashraf/FLOWWISEV1C/Flowisev1/packages/server
nohup npm run start > /tmp/flowise-server.log 2>&1 </dev/null &

echo "Waiting for server to start..."
sleep 10

echo "Server status:"
tail -5 /tmp/flowise-server.log

echo ""
echo "Testing endpoint..."
curl -s http://localhost:3000/api/v1/ping

echo ""
echo "Server should be running at http://localhost:3000"
echo "Log file: /tmp/flowise-server.log"

