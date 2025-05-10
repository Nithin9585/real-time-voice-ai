#!/bin/bash

echo "🛑 Stopping servers on ports 3000, 3001, and 5000..."

# Kill by port
npx kill-port 3000 3001 5000

echo " Ports killed: 3000, 3001, 5000."
