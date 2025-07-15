#!/bin/bash

# Start backend
echo "Starting backend server..."
cd /Users/joshzastrow/Github/scout/journal-agent/backend
python app.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "Starting frontend server..."
cd /Users/joshzastrow/Github/scout/journal-agent/frontend
npm start &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Servers are starting..."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"

# Wait for user input to stop
read -p "Press Enter to stop servers..."

# Kill processes
kill $BACKEND_PID $FRONTEND_PID
echo "Servers stopped."
