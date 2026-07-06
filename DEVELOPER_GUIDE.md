# LazyNotebookLM Developer Guide

Quick reference for developers working on this project.

## Architecture at a Glance

```
User → Dashboard (React)
       ↓
   Form triggers sync
       ↓
   /api/sync/start (POST)
       ↓
   Create sync record (DB)
       ↓
   Background process starts
       ↓
   Frontend polls /api/sync/status (every 1s)
       ↓
   Update UI with progress/logs
       ↓
   When done: create notebook, update DB
```

## Key Files

### UI Components
- `components/dashboard.tsx` - Main container, tab routing, reload notebooks
- `components/sync-form.tsx` - URL input + config (crawl depth, filters)
- `components/pipeline-view.tsx` - Stepper + terminal log display
- `components/settings-dialog.tsx` - Credential input/test
- `components/notebook-grid.tsx` - Workspace tab, notebook cards
- `components/site-header.tsx` - Navigation, connected status badge

### Backend Layer
- `lib/auth.ts` - Better Auth server config (load-bearing file)
- `lib/auth-client.ts` - Better Auth client hook
- `lib/db/index.ts` - Drizzle ORM setup (shared pg Pool)
- `lib/db/schema.ts` - Database tables (Better Auth + app tables)
- `lib/encryption.ts` - AES encryption for credentials

### API Routes
- `app/api/auth/[...all]/route.ts` - Better Auth HTTP handler
- `app/api/sync/start/route.ts` - Initiate sync (calls simulateSyncPipeline)
- `app/api/sync/status/route.ts` - Poll sync progress

### Server Actions
- `app/actions/sync.ts` - All DB operations (credentials, notebooks, syncs)
  - Each function calls `getUserId()` to get authenticated user
  - Every DB query filters by `userId` for security
  - Uses Drizzle ORM for type-safe queries

### Hooks & Utilities
- `hooks/use-pipeline.ts` - Real-time polling of sync status
- `lib/pipeline.ts` - UI helpers, mock data
- `lib/encryption.ts` - AES encrypt/decrypt

## Database Flow

```
User signs up → Better Auth creates user record
                    ↓
          User enters credentials → saveCredentials()
                    ↓
          Encrypts token → Stores in credentials table
                    ↓
        User starts sync → startSync() creates sync record
                    ↓
            /api/sync/start runs → Updates progress/logs
                    ↓
         Frontend polls /api/sync/status every 1s
                    ↓
          When complete → completeSyncWithNotebook()
                    ↓
          Creates notebook record + updates sync status
```

## Common Tasks

### Add a New Field to a Table

1. **Update schema** (`lib/db/schema.ts`):
   ```typescript
   export const notebooks = pgTable('notebooks', {
     // ... existing fields
     newField: text('newField').notNull(),
   })
   ```

2. **Update database**:
   ```sql
   ALTER TABLE notebooks ADD COLUMN newField TEXT NOT NULL DEFAULT '';
   ```

3. **Update server actions** (`app/actions/sync.ts`):
   ```typescript
   await db
     .update(notebooks)
     .set({ newField: value })
   ```

### Add a New Server Action

Create in `app/actions/sync.ts`:

```typescript
export async function myNewAction(param: string) {
  const userId = await getUserId()  // Always do this first
  
  // Query with userId filter
  const result = await db
    .select()
    .from(myTable)
    .where(and(eq(myTable.userId, userId), eq(myTable.param, param)))
  
  revalidatePath('/dashboard')  // Refresh UI
  return result
}
```

### Call a Server Action from Frontend

In a client component:

```typescript
'use client'

import { myNewAction } from '@/app/actions/sync'

export function MyComponent() {
  async function handleClick() {
    try {
      const result = await myNewAction('value')
      toast.success('Done!')
    } catch (error) {
      toast.error(error.message)
    }
  }
  
  return <button onClick={handleClick}>Do something</button>
}
```

### Integrate a Real API

1. **Update the mock function** in `/app/api/sync/start/route.ts`:
   ```typescript
   // Replace simulateSyncPipeline() calls with real API calls
   
   // Example: Call Crawl4AI
   const response = await fetch('https://api.crawl4ai.com/crawl', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${process.env.CRAWL4AI_KEY}`,
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({ url, ... })
   })
   
   // Update logs
   logs.push({
     timestamp: new Date().toISOString(),
     step: 'crawl_complete',
     level: 'info',
     message: 'Crawl completed with X pages'
   })
   ```

2. **Add environment variable**:
   ```env
   CRAWL4AI_KEY=your-api-key
   ```

3. **Test locally**:
   ```bash
   npm run dev
   # Try a sync and check logs
   ```

### Debug a Sync

1. **Check browser console** (F12) for frontend errors
2. **Check network tab** - Look at `/api/sync/start` and `/api/sync/status` responses
3. **Check server logs** (terminal where `npm run dev` runs)
4. **Check database** - Query the syncs table:
   ```sql
   SELECT * FROM syncs WHERE userId = 'your-user-id' ORDER BY createdAt DESC;
   ```
5. **Check credentials** - Verify token is encrypted:
   ```sql
   SELECT * FROM credentials WHERE userId = 'your-user-id';
   ```

## Performance Tips

- **Polling interval** is 1000ms in `hooks/use-pipeline.ts` - increase if server load is high
- **Batch updates** when possible in server actions
- **Use indexes** on frequently queried columns (userId, syncId, notebookId)
- **Cache notebook list** with React's `useCallback` or Suspense

## Security Checklist

- ✅ Every DB query has `eq(table.userId, userId)` filter
- ✅ Credentials are AES-encrypted before storage
- ✅ Session cookies are HTTP-only (Better Auth default)
- ✅ CSRF protection via Better Auth
- ✅ No user data exposed in API responses

When adding new features, ask:
- Does it access user data? Add `userId` filter.
- Does it accept input? Validate and sanitize.
- Does it store secrets? Encrypt before saving.

## Testing Locally

### Sign Up Flow
1. Go to `http://localhost:3000/sign-up`
2. Enter email/password
3. Should redirect to dashboard

### Sync Flow  
1. Sign in
2. Open settings, add token (any string works for demo)
3. Enter URL, click "Start Smart Sync"
4. Watch pipeline progress
5. Check Workspace tab - should see new notebook

### Database Check
```bash
# Connect to your Neon database
psql postgresql://user:password@host/dbname

# Query notebooks
SELECT * FROM notebooks WHERE userId = 'user-id';

# Query syncs
SELECT id, syncId, status, progress FROM syncs ORDER BY createdAt DESC LIMIT 5;

# Query credentials
SELECT id, userId, isConnected FROM credentials;
```

## Deployment Checklist

Before deploying to Vercel:

- [ ] `BETTER_AUTH_SECRET` is set (generate with `openssl rand -base64 32`)
- [ ] `ENCRYPTION_KEY` is set (generate with `openssl rand -base64 32`)
- [ ] `DATABASE_URL` points to production Neon database
- [ ] All migrations have run (`CREATE TABLE` statements executed)
- [ ] No console.log debug statements
- [ ] Environment variables are NOT in `.env.local` or `.env.development.local`
- [ ] Tested sign-up flow
- [ ] Tested sync flow end-to-end

## Debugging Tips

### "Unauthorized" on API calls
```typescript
// Check session in server action
const userId = await getUserId()  // This will throw if not authenticated
```

### "Cannot find module X"
```bash
npm install --legacy-peer-deps
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### TypeScript errors
```bash
npx tsc --noEmit
```

### Database not updating
```typescript
// Make sure you call revalidatePath() after updates
import { revalidatePath } from 'next/cache'

await db.update(notebooks).set({ title: 'New' })
revalidatePath('/dashboard')  // ← Don't forget this!
```

### Sync stuck at 0%
- Check `/api/sync/start` response
- Check server logs for errors
- Verify `simulateSyncPipeline()` is running (should log to console)
- Check if sync record exists in DB

## Code Standards

### File Naming
- Components: PascalCase (`Dashboard.tsx`)
- Utilities: kebab-case (`encryption.ts`)
- Routes: lowercase (`route.ts`)

### Imports
- Always import from `@/` alias, not relative paths
- Group: React/Next → External libs → Local imports
- Unused imports: delete immediately

### Comments
- Use for "why", not "what"
- Good: `// Per-user scoping for security`
- Bad: `// Set userId variable`

### Error Handling
```typescript
// Always handle errors
try {
  const result = await someAction()
} catch (error) {
  console.error('Action failed:', error)
  toast.error(error instanceof Error ? error.message : 'Unknown error')
}
```

### Secrets
- Never log credentials
- Never commit `.env.local`
- Always encrypt before storing
- Use environment variables for APIs

## Resources

- **Better Auth**: https://www.better-auth.com/docs
- **Drizzle ORM**: https://orm.drizzle.team/docs
- **Neon**: https://neon.tech/docs
- **Next.js 16**: https://nextjs.org/docs
- **React 19**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com
- **shadcn/ui**: https://ui.shadcn.com

## Questions?

1. Check this file first
2. Read SETUP.md for architecture details
3. Check source code comments
4. Review Better Auth and Drizzle docs
5. Open an issue with details

---

Happy coding! 🚀
