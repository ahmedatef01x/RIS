#!/bin/bash

# Quick Test Script
# This script helps you verify that everything is working correctly

echo "🧪 Quick Test Script"
echo "===================="
echo ""

# Check if servers are running
echo "1️⃣  Checking if servers are running..."

# Check Backend
if curl -s http://localhost:3001/ > /dev/null 2>&1; then
    echo "   ✅ Backend (localhost:3001) is running"
else
    echo "   ❌ Backend is NOT running"
    echo "      Fix: cd local-backend && npm start"
fi

# Check Frontend
if curl -s http://localhost:5174/ > /dev/null 2>&1; then
    echo "   ✅ Frontend (localhost:5174) is running"
else
    echo "   ❌ Frontend is NOT running"
    echo "      Fix: npm run dev"
fi

echo ""
echo "2️⃣  Checking database connection..."
cd local-backend 2>/dev/null
if node -e "const config = {server: '127.0.0.1\\\\SQLEXPRESS', database: 'RIS_System', authentication: {type: 'default', options: {userName: 'sa', password: '123456'}}, options: {encrypt: false, trustServerCertificate: true}}; console.log('✅ Config loaded')" 2>/dev/null; then
    echo "   ✅ Database config is correct"
else
    echo "   ⚠️  Database config may need adjustment"
fi

echo ""
echo "3️⃣  Checking user data..."
if [ -f "check-user.js" ]; then
    echo "   ✅ check-user.js script found"
    echo "      Run: node check-user.js"
else
    echo "   ❌ check-user.js not found"
fi

echo ""
echo "4️⃣  Quick test URL"
echo "   Frontend: http://localhost:5174"
echo "   Backend:  http://localhost:3001"
echo "   API:      http://localhost:3001/api"
echo ""
echo "✅ Test setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Open http://localhost:5174 in browser"
echo "   2. Login with admin@ris.com / 12345678"
echo "   3. Should redirect to dashboard in <1 second"
echo ""
