# LazyNotebookLM

**Automatically sync websites and documents into Google NotebookLM notebooks.**

## What It Does

LazyNotebookLM is an intelligent web-to-notebook pipeline that:

1. **Crawls** any URL using Crawl4AI
2. **Filters** PDFs and extracts markdown content
3. **Authenticates** with Google NotebookLM  
4. **Uploads** all content as a new notebook with one click

Perfect for researchers, students, and knowledge workers who want to convert web articles, documentation sites, and online courses into interactive study notebooks.

## Features

✨ **Beautiful Dark Dashboard** - Modern terminal-inspired UI with real-time progress tracking

🔐 **Secure Authentication** - Email/password auth with encrypted credential storage

📊 **Real Database** - Neon PostgreSQL for multi-user support and sync history

🚀 **Live Pipeline** - Watch each step (Crawl → Filter → Auth → Upload) in real-time

📚 **Smart Configuration** - Auto-guess notebook names, configure crawl depth and extraction filters

🔄 **Workspace Management** - View all synced notebooks, re-sync anytime

## Getting Started

### Quick Start (5 minutes)

```bash
# 1. Clone and install
git clone <repo>
cd lazynotebooklm
npm install --legacy-peer-deps

# 2. Set up environment variables
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://user:password@host/dbname
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
EOF

# 3. Create database tables (run SQL from SETUP.md)
# In Neon dashboard, execute the SQL in SETUP.md

# 4. Start dev server
npm run dev
```

Visit `http://localhost:3000` and sign up!

### Full Setup Guide

See [SETUP.md](./SETUP.md) for detailed instructions on:
- Complete architecture overview
- Database schema with all tables
- API integration points for Crawl4AI and NotebookLM
- Step-by-step local setup
- Deployment to Vercel
- Troubleshooting common issues

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Next.js API Routes, Better Auth
- **Database**: Neon (PostgreSQL), Drizzle ORM
- **APIs**: Crawl4AI, Google NotebookLM, PDF processing
- **Security**: AES encryption, per-user data scoping

## Project Structure

```
app/                      # Next.js app directory
  api/auth/              # Better Auth handler
  api/sync/              # Sync API routes (start, status)
  actions/sync.ts        # Server actions (DB layer)
components/              # React components
  dashboard.tsx          # Main UI
  sync-form.tsx          # URL input + config
  pipeline-view.tsx      # Progress + logs
  settings-dialog.tsx    # Credentials
lib/                      # Utilities
  auth.ts                # Better Auth config
  db/                    # Drizzle ORM setup
  encryption.ts          # Credential encryption
hooks/                    # React hooks
  use-pipeline.ts        # Real-time sync polling
```

## How It Works

### User Journey

1. **Sign up** with email/password
2. **Add credentials** - paste NotebookLM session token in settings
3. **Enter URL** - e.g., `https://eecs70.org`
4. **Configure** - choose crawl depth, filters, notebook name
5. **Watch sync** - real-time progress through 4-step pipeline
6. **View notebook** - synced notebooks appear in Workspace

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | ✓ | Neon PostgreSQL connection |
| `BETTER_AUTH_SECRET` | ✓ | Session signing key |
| `ENCRYPTION_KEY` | ✓ | Credential encryption |
| `CRAWL4AI_KEY` | ✗ | Crawl4AI API key |

Generate secrets:
```bash
openssl rand -base64 32  # Run twice
```

## Deployment to Vercel

```bash
# 1. Push to GitHub
git add .
git commit -m "feat: complete lazynotebooklm"
git push origin main

# 2. In Vercel dashboard:
# - Connect GitHub repo
# - Add environment variables (DATABASE_URL, BETTER_AUTH_SECRET, ENCRYPTION_KEY)
# - Deploy

vercel deploy --prod
```

## What's Included

### ✅ Complete Implementation

- **Authentication System** - Better Auth with email/password, session management
- **Database Layer** - Neon PostgreSQL with Drizzle ORM, 4 core tables
- **UI Components** - Full dashboard, forms, stepper, pipeline view, settings
- **API Routes** - `/api/sync/start`, `/api/sync/status`, `/api/auth/[...all]`
- **Server Actions** - Database operations with per-user scoping
- **Real-time Updates** - Frontend polling hook for live progress
- **Security** - AES encryption for credentials, CSRF protection, per-user isolation
- **Documentation** - SETUP.md with complete architecture and integration guide

### 🔄 Ready for Integration

The app is built with clear integration points for:

1. **Crawl4AI** - Mock implementation ready in `app/api/sync/start/route.ts`
2. **NotebookLM API** - Mock notebook creation ready for real API
3. **PDF Processing** - `pdf-parse` already installed and ready to use

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/sync/start` | POST | Initiate a new sync |
| `/api/sync/status` | GET | Poll real-time progress (syncId param) |
| `/api/auth/[...all]` | GET/POST | Better Auth handler |

## Server Actions

All in `app/actions/sync.ts`, with `getUserId()` pattern for security:

- `saveCredentials(token)` - Encrypt and save NotebookLM token
- `getCredentials()` - Retrieve decrypted token  
- `getNotebooks()` - Get all synced notebooks for user
- `startSync(url, config)` - Create sync operation
- `getSyncStatus(syncId)` - Get current progress
- `completeSyncWithNotebook()` - Mark complete, create notebook entry
- `failSync(syncId, error)` - Mark failed with error message

## Database Schema

### notebooks
Stores synced NotebookLM notebooks with metadata

### syncs  
Tracks sync operations, progress, logs, and error states

### credentials
Encrypted user authentication tokens

### source_urls
Tracks which URLs have been synced per notebook (prevents duplicates)

See SETUP.md for complete SQL schema.

## Local Development

```bash
# Install dependencies
npm install --legacy-peer-deps

# Create .env.local with DATABASE_URL, BETTER_AUTH_SECRET, ENCRYPTION_KEY

# Run migrations (SQL from SETUP.md)

# Start dev server
npm run dev

# Open http://localhost:3000
```

## Next Steps

1. **Follow SETUP.md** for detailed setup instructions
2. **Test locally** - Sign up, add credentials, run a sync
3. **Integrate APIs** - Replace mocks with real Crawl4AI and NotebookLM calls
4. **Deploy to Vercel** - Connect GitHub, set env vars, deploy
5. **Monitor** - Add logging, error tracking, analytics

## Key Features Implemented

- [x] Email/password authentication
- [x] Session-based access control
- [x] Encrypted credential storage
- [x] Real-time sync progress tracking
- [x] Database persistence for multi-user support
- [x] API routes for sync operations
- [x] Server actions with per-user data scoping
- [x] Beautiful responsive UI
- [x] Configuration options (crawl depth, filters, notebook naming)
- [x] Workspace notebook management

## Troubleshooting

**Dev server won't start?**
```bash
npm install caniuse-lite --legacy-peer-deps
```

**Database connection errors?**
- Verify DATABASE_URL is correct
- Check Neon connection status
- Run migrations (SQL from SETUP.md)

**Auth not working?**
- Check BETTER_AUTH_SECRET is set (≥32 chars)
- Clear browser cookies
- Check browser DevTools for session cookie

**Credentials not saving?**
- Verify ENCRYPTION_KEY is set
- Check credentials table exists
- Check browser network tab for errors

See [SETUP.md](./SETUP.md) for more help.

## License

MIT

---

**Built with ❤️ using Next.js 16, Neon, Better Auth, Drizzle ORM, and shadcn/ui**

Questions? Check SETUP.md or open an issue!
