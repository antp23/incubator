#!/bin/bash

# iRemedy Incubator - Setup Script
# This script sets up the development environment

set -e

echo "========================================="
echo "iRemedy Incubator - Development Setup"
echo "========================================="

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# Check for PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "Error: PostgreSQL is not installed. Please install PostgreSQL 14+ first."
    exit 1
fi

echo "✓ PostgreSQL is installed"

# Create .env file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo ""
    echo "Creating backend/.env file..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please edit backend/.env with your database credentials"
    echo ""
fi

# Install backend dependencies
echo ""
echo "Installing backend dependencies..."
cd backend
npm install
echo "✓ Backend dependencies installed"

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies..."
cd ../frontend
npm install
echo "✓ Frontend dependencies installed"
cd ..

echo ""
echo "========================================="
echo "Setup complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Edit backend/.env with your database credentials"
echo "2. Create PostgreSQL database: createdb incubator"
echo "3. Run migrations: cd backend && npm run migrate"
echo "4. Seed test data: npm run seed"
echo "5. Start backend: npm run dev"
echo "6. In another terminal, start frontend: cd frontend && npm run dev"
echo "7. Open http://localhost:5173 in your browser"
echo ""
echo "Default credentials:"
echo "  Ops: ops@iremedy.com / password123"
echo "  Accounting: accounting@iremedy.com / password123"
echo "  Admin: admin@iremedy.com / password123"
echo ""
