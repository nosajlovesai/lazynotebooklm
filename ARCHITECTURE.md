# LazyNotebookLM Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               React Components                           │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │  Dashboard  │  │  SyncForm    │  │ PipelineView  │  │   │
│  │  │  (main UI)  │  │  (URL input) │  │  (progress)   │  │   │
│  │  └─────────────┘  └──────────────┘  └────────────────┘  │   │
│  │          ↓                 ↓                ↓              │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │  use-pipeline Hook (real-time polling)         │    │   │
│  │  │  Polls /api/sync/status every 1000ms           │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  │          ↓                                                 │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │  Session & Auth (Better Auth Client)            │    │   │
│  │  │  Reads HTTP-only session cookie                 │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                          ↓ HTTP Requests
┌─────────────────────────────────────────────────────────────────┐
│                   NEXT.JS SERVER (Node.js)                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Better Auth Handler                         │   │
│  │         /api/auth/[...all]/route.ts                     │   │
│  │  - Sign up / Login / Sessions / Cookies                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↓                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              API Routes                                  │   │
│  │  ┌────────────────────┐  ┌──────────────────────────┐   │   │
│  │  │ /api/sync/start    │  │ /api/sync/status         │   │   │
│  │  │ POST               │  │ GET (syncId)             │   │   │
│  │  │                    │  │                          │   │   │
│  │  │ 1. Validate auth   │  │ 1. Get sync record       │   │   │
│  │  │ 2. Create sync     │  │ 2. Return progress/logs  │   │   │
│  │  │ 3. Start async     │  │                          │   │   │
│  │  │    pipeline        │  │ (Frontend polls every 1s)│   │   │
│  │  └────────────────────┘  └──────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↓                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Server Actions (app/actions/sync.ts)          │   │
│  │                                                           │   │
│  │  All functions follow this pattern:                      │   │
│  │                                                           │   │
│  │  async function action(params) {                         │   │
│  │    const userId = await getUserId()     // Verify auth  │   │
│  │    return db.select()                                   │   │
│  │      .from(table)                                       │   │
│  │      .where(eq(table.userId, userId)) // Per-user scope │   │
│  │  }                                                       │   │
│  │                                                           │   │
│  │  Functions:                                              │   │
│  │  • getNotebooks() - Get user's notebooks               │   │
│  │  • saveCredentials() - Encrypt & save token             │   │
│  │  • startSync() - Create sync record                     │   │
│  │  • getSyncStatus() - Get progress                       │   │
│  │  • updateSyncProgress() - Update logs/progress          │   │
│  │  • completeSyncWithNotebook() - Mark done               │   │
│  │  • failSync() - Mark failed                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↓                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Drizzle ORM                                   │   │
│  │                                                           │   │
│  │  Provides type-safe database access                      │   │
│  │  Built on single pg Pool shared with Better Auth         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↓                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Encryption Layer                              │   │
│  │                                                           │   │
│  │  • AES.encrypt(token, ENCRYPTION_KEY)                    │   │
│  │  • AES.decrypt(encrypted, ENCRYPTION_KEY)                │   │
│  │                                                           │   │
│  │  Credentials are encrypted before DB storage             │   │
│  │  Decrypted only when needed for API calls                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                          ↓ SQL
┌─────────────────────────────────────────────────────────────────┐
│                 NEON DATABASE (PostgreSQL)                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  user (Better Auth)      notebooks      syncs            │   │
│  │  ├─ id (PK)              ├─ id (PK)     ├─ id (PK)       │   │
│  │  ├─ email (UNIQUE)       ├─ userId      ├─ userId        │   │
│  │  ├─ name                 ├─ title       ├─ syncId        │   │
│  │  ├─ emailVerified        ├─ notebookId  ├─ url           │   │
│  │  ├─ createdAt            ├─ url         ├─ status        │   │
│  │  └─ updatedAt            └─ updatedAt   ├─ progress (0-100)  │
│  │                                         ├─ logs (JSONB)  │   │
│  │  session (Better Auth)                  ├─ error         │   │
│  │  ├─ id (PK)              credentials    ├─ sourceUrls[]  │   │
│  │  ├─ userId (FK → user)   ├─ id (PK)     └─ timestamps    │   │
│  │  ├─ token (UNIQUE)       ├─ userId      │                 │   │
│  │  ├─ expiresAt            ├─ encrypted   source_urls       │   │
│  │  └─ createdAt            │   Token      ├─ id (PK)        │   │
│  │                          ├─ isConnected ├─ userId         │   │
│  │  account (Better Auth)   └─ timestamps  ├─ notebookId     │   │
│  │  ├─ id (PK)                            ├─ url            │   │
│  │  ├─ userId (FK → user)                 └─ contentHash    │   │
│  │  └─ provider details                                      │   │
│  │                                                           │   │
│  │  verification (Better Auth)                              │   │
│  │  └─ Email verification tokens                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Query Pattern (enforced in all server actions):                 │
│                                                                   │
│  const userId = "user-123"  // From session                      │
│  SELECT * FROM notebooks                                         │
│  WHERE userId = "user-123"  ← ALWAYS filter by userId           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Complete Sync Operation

```
1. USER INITIATES SYNC
   ┌────────────────────────────────────┐
   │ User enters URL in SyncForm        │
   │ Clicks "Start Smart Sync"          │
   └────────────────────────────────────┘
           ↓
2. FRONTEND CALLS API
   ┌────────────────────────────────────┐
   │ POST /api/sync/start               │
   │ {                                  │
   │   url: "https://example.com",      │
   │   config: {                        │
   │     crawlDepth: 2,                 │
   │     extractPdfs: true,             │
   │     ...                            │
   │   }                                │
   │ }                                  │
   └────────────────────────────────────┘
           ↓
3. SERVER CREATES SYNC RECORD
   ┌────────────────────────────────────┐
   │ startSync() server action:          │
   │ • Get userId from session           │
   │ • Create sync record in DB:         │
   │   - syncId: nanoid()                │
   │   - status: "pending"               │
   │   - progress: 0                     │
   │   - logs: []                        │
   │ • Return sync record                │
   └────────────────────────────────────┘
           ↓
4. FRONTEND STARTS POLLING
   ┌────────────────────────────────────┐
   │ use-pipeline hook:                 │
   │ • Starts polling /api/sync/status  │
   │ • Every 1000ms, sends GET request  │
   │ • Includes syncId parameter        │
   └────────────────────────────────────┘
           ↓
5. SERVER PROCESSES SYNC (BACKGROUND)
   ┌────────────────────────────────────┐
   │ simulateSyncPipeline():             │
   │                                    │
   │ STEP 1: Crawl (20%)                │
   │ ├─ GET /example.com                │
   │ ├─ Extract markdown                │
   │ └─ updateSyncProgress(20, logs)    │
   │                                    │
   │ STEP 2: Filter PDFs (40%)          │
   │ ├─ Find PDFs in content            │
   │ ├─ Download & parse PDFs           │
   │ └─ updateSyncProgress(40, logs)    │
   │                                    │
   │ STEP 3: Auth (80%)                 │
   │ ├─ Get credentials from DB         │
   │ ├─ Decrypt token                   │
   │ ├─ Verify NotebookLM session       │
   │ └─ updateSyncProgress(80, logs)    │
   │                                    │
   │ STEP 4: Upload (100%)              │
   │ ├─ Create notebook in NotebookLM  │
   │ ├─ Upload all content              │
   │ ├─ Save notebook record in DB      │
   │ └─ completeSyncWithNotebook()      │
   └────────────────────────────────────┘
           ↓
6. FRONTEND RECEIVES UPDATES
   ┌────────────────────────────────────┐
   │ GET /api/sync/status?syncId=abc123 │
   │ Response:                          │
   │ {                                  │
   │   status: "processing",            │
   │   progress: 40,                    │
   │   logs: [                          │
   │     { step: "crawl", message: ... },│
   │     { step: "pdf_filter", ... }    │
   │   ]                                │
   │ }                                  │
   │                                    │
   │ Updates UI:                        │
   │ • Progress bar: 40%                │
   │ • Step 1-2: ✓ complete            │
   │ • Step 3: active                   │
   │ • Step 4: pending                  │
   │ • Logs: streaming in terminal      │
   └────────────────────────────────────┘
           ↓ (repeat every 1000ms)
7. SYNC COMPLETES
   ┌────────────────────────────────────┐
   │ Progress reaches 100%              │
   │ Status: "completed"                │
   │ Notebook record created            │
   │ Frontend stops polling             │
   │ Shows success toast                │
   │ Adds notebook to Workspace         │
   └────────────────────────────────────┘
```

## Security Model

```
┌─────────────────────────────────────────────────────────┐
│                   AUTHENTICATION                         │
│                                                          │
│  User Email/Password → Better Auth → HTTP-only Cookie  │
│                                                          │
│  Session contains:                                      │
│  • user.id                                              │
│  • Expiration time                                      │
│  • Signature (verified on each request)                 │
└─────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│           PER-USER DATA SCOPING (No RLS)                │
│                                                          │
│  Every server action:                                   │
│  1. Call getUserId() from session                       │
│  2. Add userId to every DB query WHERE clause           │
│  3. User A cannot see User B's data                     │
│                                                          │
│  Example:                                               │
│  const userId = "user-123"  // From session            │
│  const notebooks = await db.select()                    │
│    .from(notebooks)                                      │
│    .where(eq(notebooks.userId, userId))  ← Must have   │
└─────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│            CREDENTIAL ENCRYPTION                        │
│                                                          │
│  NotebookLM Cookie Token:                               │
│  1. User enters token in settings                       │
│  2. Server encrypts: AES.encrypt(token, key)            │
│  3. Stores encrypted version in DB                      │
│  4. Never stored or logged in plain text                │
│  5. Only decrypted when API call needed                 │
│                                                          │
│  Database has:                                          │
│  credentials.encryptedToken = "U2FsdGVkX1..."          │
│  (readable only with correct ENCRYPTION_KEY)            │
└─────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
<RootLayout>
  │
  ├─ <ThemeProvider>
  │  └─ <TooltipProvider>
  │     └─ <Toaster> (sonner)
  │        │
  │        └─ <Dashboard>
  │           │
  │           ├─ <SiteHeader>
  │           │  ├─ Logo
  │           │  ├─ Status Badge
  │           │  └─ Settings Button
  │           │
  │           └─ <Tabs>
  │              │
  │              ├─ TabsContent: "pipeline"
  │              │  ├─ <SyncForm>
  │              │  │  └─ URL input + config
  │              │  └─ <PipelineView>
  │              │     ├─ Stepper (4 steps)
  │              │     └─ Terminal logs
  │              │
  │              └─ TabsContent: "workspace"
  │                 └─ <NotebookGrid>
  │                    └─ Notebook cards
  │
  └─ <SettingsDialog>
     └─ Credential input
```

## Technology Stack

```
Frontend:
  • React 19 (components, hooks)
  • Next.js 16 (routing, SSR, API routes)
  • TypeScript (type safety)
  • Tailwind CSS (styling)
  • shadcn/ui (components: buttons, forms, dialogs, etc.)
  • Framer Motion (animations)
  • Lucide (icons)
  • sonner (toast notifications)
  • axios (HTTP client - optional)

Backend:
  • Next.js (API routes)
  • Better Auth (authentication)
  • Drizzle ORM (database)
  • pg (PostgreSQL driver)
  • crypto-js (AES encryption)
  • nanoid (ID generation)

Database:
  • Neon (PostgreSQL serverless)
  • 4 tables, 20+ columns
  • Row-level scoping by userId

Deployment:
  • Vercel (hosting)
  • GitHub (code storage)
  • Environment variables (secrets)
```

## Data Types & Relationships

```
User
  │
  ├─ Session (1:Many)
  │  └─ HTTP-only cookie
  │
  ├─ Credentials (1:1)
  │  └─ encryptedToken (AES)
  │
  ├─ Notebooks (1:Many)
  │  └─ Synced NotebookLM notebooks
  │
  ├─ Syncs (1:Many)
  │  └─ Sync operations (includes logs & progress)
  │
  └─ SourceURLs (1:Many)
     └─ URLs synced into each notebook
```

## Error Handling Flow

```
1. User Action Fails
   ↓
2. Try/Catch Block
   ├─ Log error to console
   └─ Extract error message
   ↓
3. Show to User
   ├─ Toast notification
   ├─ Update UI state
   └─ Suggest action
   ↓
4. Database Update (if applicable)
   ├─ Update sync status to "failed"
   └─ Store error message
```

## Performance Optimizations

```
Frontend:
  • Real-time polling (1s interval)
  • Component memoization
  • Efficient state updates
  • Lazy loading

Backend:
  • Shared pg Pool (one connection)
  • Query optimization
  • Response caching
  • Error early exit

Database:
  • Indexes on userId, syncId
  • JSONB for flexible logs
  • Timestamps for sorting
```

---

This architecture is:
- **Secure**: Per-user scoping, encrypted secrets
- **Scalable**: Stateless API, managed database
- **Maintainable**: Clear separation of concerns
- **Observable**: Logging at each step
- **Extensible**: Easy to add features

