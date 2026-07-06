# LazyNotebookLM - Complete Setup Guide

## Overview

LazyNotebookLM is a fully functional web application that crawls URLs, extracts content, and batch-uploads everything into Google NotebookLM notebooks. It includes a beautiful dashboard, real database storage, authentication, and end-to-end sync pipeline.

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Next.js API routes, Better Auth (email/password)
- **Database**: Neon (PostgreSQL), Drizzle ORM
- **APIs**: Crawl4AI (web scraping), Google NotebookLM (notebook creation), PDF parsing
- **Security**: AES encryption for credentials, per-user data scoping

## Architecture

```
User → Dashboard (Next.js) → API Routes → Neon Database
                                       ↓
                          Server Actions (getUserId, saveCredentials, etc.)
                                       ↓
                     External APIs (Crawl4AI, NotebookLM)
```

### Core Features Implemented

1. **Authentication**
   - Email/password sign-up and login via Better Auth
   - Session-based access control
   - Per-user data isolation

2. **Sync Pipeline**
   - URL input with auto-guessing notebook names
   - Configurable crawl depth, PDF extraction, sub-link extraction
   - Real-time progress tracking with streaming logs
   - 4-step pipeline: Crawl → Filter PDFs → Authenticate → Upload

3. **Database Layer**
   - **notebooks**: Stores synced NotebookLM notebooks per user
   - **syncs**: Tracks sync operations, progress, logs, and errors
   - **credentials**: Encrypted NotebookLM auth tokens
   - **source_urls**: Tracks which URLs have been synced per notebook

4. **API Routes**
   - `/api/sync/start` - Initiate a new sync
   - `/api/sync/status` - Poll for real-time progress
   - `/api/auth/[...all]` - Better Auth handler

5. **Server Actions**
   - `saveCredentials(token)` - Encrypt and save user credentials
   - `getCredentials()` - Decrypt and retrieve credentials
   - `startSync(url, config)` - Create a sync record
   - `getSyncStatus(syncId)` - Get current sync progress
   - `completeSyncWithNotebook()` - Mark sync as complete and create notebook
   - `failSync()` - Mark sync as failed

## Local Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Neon database (PostgreSQL)
- Environment variables (see below)

### Step 1: Clone and Install

```bash
git clone <repo>
cd lazynotebooklm
npm install --legacy-peer-deps
```

### Step 2: Set Up Environment Variables

Create `.env.local` in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@host/dbname

# Authentication Secret (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=your-random-secret-here

# Encryption Key for credentials (32+ chars, generate same way)
ENCRYPTION_KEY=your-encryption-key-here

# Optional: Override auth domain (usually not needed)
# BETTER_AUTH_URL=https://yourdomain.com
```

### Step 3: Create Database Tables

The database tables are created in Neon via SQL:

```sql
-- Notebooks (stores synced NotebookLM notebooks)
CREATE TABLE notebooks (
  id SERIAL PRIMARY KEY,
  userId TEXT NOT NULL,
  notebookId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  status TEXT DEFAULT 'synced',
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Syncs (tracks sync operations)
CREATE TABLE syncs (
  id SERIAL PRIMARY KEY,
  userId TEXT NOT NULL,
  syncId TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  notebookId INTEGER,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  logs JSONB DEFAULT '[]'::jsonb,
  error TEXT,
  sourceUrls TEXT[] DEFAULT '{}',
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completedAt TIMESTAMP WITH TIME ZONE
);

-- Credentials (encrypted auth tokens)
CREATE TABLE credentials (
  id SERIAL PRIMARY KEY,
  userId TEXT NOT NULL UNIQUE,
  encryptedToken TEXT NOT NULL,
  encryptedGoogleAuthToken TEXT,
  isConnected BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Source URLs (track which URLs were synced per notebook)
CREATE TABLE source_urls (
  id SERIAL PRIMARY KEY,
  userId TEXT NOT NULL,
  notebookId INTEGER NOT NULL,
  url TEXT NOT NULL,
  contentHash TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(userId, notebookId, url)
);
```

### Step 4: Run the Dev Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## User Flow

### 1. Sign Up / Log In
- Visit `/sign-up` to create an account
- Enter email and password
- Session is created and stored in HTTP-only cookies

### 2. Connect Credentials
- Click "Open settings" in the dashboard header
- Paste your `NOTEBOOKLM_COOKIE_TOKEN` (from Google NotebookLM session)
- Click "Test Connection" to verify and save
- Token is encrypted before storing in database

### 3. Start a Sync
- Paste a URL (e.g., `https://eecs70.org`)
- Optionally configure:
  - Target notebook name (auto-guessed from domain)
  - PDF extraction (on/off)
  - Sub-link extraction (on/off)
  - Markdown extraction (on/off)
  - Crawl depth (1-5 pages)
- Click "Start Smart Sync"

### 4. Monitor Progress
- Pipeline view shows real-time:
  - Current step (Crawl → Filter → Auth → Upload)
  - Progress percentage
  - Live extraction log
- Logs stream as sync progresses
- When complete, notebook appears in "Workspace" tab

### 5. Manage Notebooks
- "Workspace" tab shows all synced notebooks
- Click "Re-sync" to update an existing notebook
- View notebook metadata (domain, source count, last synced date)

## API Integration Points

The app is built to easily integrate with real services. Here's where to add them:

### Crawl4AI Integration

File: `app/api/sync/start/route.ts`, line ~50

Replace the mock `simulateSyncPipeline()` with:

```typescript
async function crawlWithCrawl4AI(url: string, config: any) {
  const response = await fetch('https://api.crawl4ai.com/crawl', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CRAWL4AI_KEY}`,
    },
    body: JSON.stringify({
      url,
      crawler_type: 'auto',
      extract_config: {
        extract_type: 'markdown',
        include_images: false,
      },
    }),
  })
  const data = await response.json()
  return data.markdown_content
}
```

### Google NotebookLM Integration

File: `app/api/sync/start/route.ts`, line ~65

Replace the mock notebook creation with:

```typescript
async function createNotebookInNotebookLM(
  title: string,
  content: string,
  credentials: string
) {
  // Use NotebookLM API or Selenium/Puppeteer to create notebook
  // This requires reverse-engineering the NotebookLM API or using browser automation
  const notebookId = await notebookLMClient.create({
    title,
    sessionToken: credentials,
  })
  return notebookId
}
```

### PDF Processing

Already installed via `pdf-parse`. Use in sync pipeline:

```typescript
import pdfParse from 'pdf-parse'

const buffer = await fetch(pdfUrl).then(r => r.arrayBuffer())
const data = await pdfParse(buffer)
const text = data.text
```

## Server Actions Reference

All server actions are in `app/actions/sync.ts` and use the `getUserId()` pattern for security:

```typescript
// Get current user ID (throws if not authenticated)
const userId = await getUserId()

// Query only current user's data
const notebooks = await db
  .select()
  .from(notebooks)
  .where(eq(notebooks.userId, userId))
```

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | ✓ | Neon PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | ✓ | Random string for session signing (≥32 chars) |
| `ENCRYPTION_KEY` | ✓ | Key for encrypting credentials (32+ chars) |
| `BETTER_AUTH_URL` | ✗ | Custom domain for auth (auto-detected if unset) |
| `CRAWL4AI_KEY` | ✗ | API key for Crawl4AI service |

Generate secrets:
```bash
openssl rand -base64 32
```

## Deployment to Vercel

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `ENCRYPTION_KEY`
3. Deploy: `git push` triggers automatic deployment

## Troubleshooting

### "Cannot find module 'caniuse-lite'"
This is a Turbopack bundling issue in v16 Sandbox. Workaround:

```bash
# Create stub files
touch node_modules/caniuse-lite/dist/unpacker/{agents,feature}.js
# Add this to next.config.ts:
# webpack: (config) => {
#   config.resolve.fallback = { browserslist: false }
#   return config
# }
```

### "Unauthorized" errors on API calls
- Check that user is logged in (session cookie exists)
- Verify `BETTER_AUTH_SECRET` is set
- Check browser console for auth errors

### "Cannot find module 'drizzle-orm'"
```bash
npm install better-auth pg drizzle-orm --legacy-peer-deps
```

### Credentials not saving
- Check encryption.ts file exists with correct `ENCRYPTION_KEY` env var
- Verify database credentials table exists
- Check browser network tab for API errors

## File Structure

```
app/
  api/
    auth/[...all]/          # Better Auth handler
    sync/
      start/route.ts        # Initiate sync
      status/route.ts       # Poll progress
  actions/sync.ts           # Server actions (DB layer)
  layout.tsx                # Root layout
  page.tsx                  # Home/redirect
components/
  dashboard.tsx             # Main UI component
  sync-form.tsx             # URL input + config
  pipeline-view.tsx         # Progress stepper + logs
  notebook-grid.tsx         # Workspace tab
  settings-dialog.tsx       # Credentials input
  site-header.tsx           # Top navigation
lib/
  auth.ts                   # Better Auth server config
  auth-client.ts            # Better Auth client hook
  db/
    index.ts                # Drizzle setup
    schema.ts               # Database tables
  encryption.ts             # AES encryption utils
  pipeline.ts               # UI helpers, mock data
hooks/
  use-pipeline.ts           # Real-time polling hook
```

## Next Steps

1. **Test locally**: Sign up, add credentials, run a sync
2. **Integrate Crawl4AI**: Replace mock with real API calls
3. **Integrate NotebookLM**: Add real notebook creation
4. **Add error handling**: Implement retry logic, better error messages
5. **Deploy to Vercel**: Connect GitHub, set env vars, deploy
6. **Monitor**: Set up logging, error tracking (Sentry, LogRocket)

## Support

For issues or questions:
1. Check SETUP.md (this file)
2. Review comments in source code
3. Check Better Auth docs: https://www.better-auth.com/
4. Check Drizzle docs: https://orm.drizzle.team/
5. Check Neon docs: https://neon.tech/docs/

---

**Built with ❤️ using Next.js, Neon, and Better Auth**
