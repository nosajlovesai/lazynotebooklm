#!/bin/bash

# LazyNotebookLM Quick Setup Script

set -e

echo "🚀 LazyNotebookLM Setup"
echo "======================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✓ Node.js $(node --version) found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps
echo "✓ Dependencies installed"
echo ""

# Generate secrets
echo "🔐 Generating secret keys..."
SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

echo "✓ Secrets generated"
echo ""

# Create .env.local
echo "📝 Creating .env.local..."
cat > .env.local << EOF
# Database - Update with your Neon connection string
DATABASE_URL=postgresql://user:password@host/dbname

# Authentication Secret (generated)
BETTER_AUTH_SECRET=$SECRET

# Encryption Key for credentials (generated)
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Optional: NotebookLM and Crawl4AI API keys
# CRAWL4AI_KEY=your-key-here
# NOTEBOOKLM_COOKIE_TOKEN=your-token-here
EOF

echo "✓ .env.local created"
echo ""

echo "📋 Next Steps:"
echo "============="
echo ""
echo "1. Get your Neon database URL:"
echo "   - Go to https://console.neon.tech"
echo "   - Create a new project"
echo "   - Copy the connection string"
echo "   - Update DATABASE_URL in .env.local"
echo ""
echo "2. Create database tables:"
echo "   - Open SETUP.md"
echo "   - Copy the SQL from the 'Step 3' section"
echo "   - Paste into Neon SQL Editor"
echo "   - Execute"
echo ""
echo "3. Start development server:"
echo "   npm run dev"
echo ""
echo "4. Open http://localhost:3000 and sign up!"
echo ""
echo "✨ Setup complete! Read SETUP.md for detailed instructions."
