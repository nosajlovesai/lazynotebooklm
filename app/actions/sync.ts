'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { credentials, notebooks, syncs, sourceUrls } from '@/lib/db/schema'
import { encryptCredential, decryptCredential } from '@/lib/encryption'
import { and, eq, desc } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { nanoid } from 'nanoid'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

// Credentials
export async function saveCredentials(token: string, googleToken?: string) {
  const userId = await getUserId()

  const existing = await db
    .select()
    .from(credentials)
    .where(eq(credentials.userId, userId))
    .limit(1)

  const encrypted = encryptCredential(token)
  const encryptedGoogle = googleToken ? encryptCredential(googleToken) : null

  if (existing.length > 0) {
    await db
      .update(credentials)
      .set({
        encryptedToken: encrypted,
        encryptedGoogleAuthToken: encryptedGoogle,
        isConnected: true,
        updatedAt: new Date(),
      })
      .where(eq(credentials.userId, userId))
  } else {
    await db.insert(credentials).values({
      userId,
      encryptedToken: encrypted,
      encryptedGoogleAuthToken: encryptedGoogle,
      isConnected: true,
    })
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function getCredentials() {
  const userId = await getUserId()
  const cred = await db
    .select()
    .from(credentials)
    .where(eq(credentials.userId, userId))
    .limit(1)

  if (!cred[0]) {
    return { token: null, isConnected: false }
  }

  return {
    token: cred[0].encryptedToken ? decryptCredential(cred[0].encryptedToken) : null,
    isConnected: cred[0].isConnected,
  }
}

// Notebooks
export async function getNotebooks() {
  const userId = await getUserId()
  return db
    .select()
    .from(notebooks)
    .where(eq(notebooks.userId, userId))
    .orderBy(desc(notebooks.updatedAt))
}

export async function createNotebook(notebookId: string, title: string, url?: string) {
  const userId = await getUserId()

  const result = await db
    .insert(notebooks)
    .values({
      userId,
      notebookId,
      title,
      url,
    })
    .returning()

  revalidatePath('/dashboard')
  return result[0]
}

// Syncs
export async function startSync(
  url: string,
  config: {
    pdfFilters?: string[]
    crawlDepth?: number
    ignorePaths?: string[]
  }
) {
  const userId = await getUserId()
  const syncId = nanoid()

  const sync = await db
    .insert(syncs)
    .values({
      userId,
      syncId,
      url,
      status: 'pending',
      logs: [],
    })
    .returning()

  revalidatePath('/dashboard')
  return sync[0]
}

export async function getSyncStatus(syncId: string) {
  const userId = await getUserId()
  const sync = await db
    .select()
    .from(syncs)
    .where(and(eq(syncs.syncId, syncId), eq(syncs.userId, userId)))
    .limit(1)

  return sync[0] || null
}

export async function getSyncs() {
  const userId = await getUserId()
  return db
    .select()
    .from(syncs)
    .where(eq(syncs.userId, userId))
    .orderBy(desc(syncs.createdAt))
}

export async function updateSyncProgress(
  syncId: string,
  progress: number,
  logs: any[],
  status?: string
) {
  const userId = await getUserId()

  const result = await db
    .update(syncs)
    .set({
      progress,
      logs,
      status: status || 'processing',
      updatedAt: new Date(),
    })
    .where(and(eq(syncs.syncId, syncId), eq(syncs.userId, userId)))
    .returning()

  return result[0]
}

export async function completeSyncWithNotebook(
  syncId: string,
  notebookId: string,
  title: string,
  sourceUrls?: string[]
) {
  const userId = await getUserId()

  // Create the notebook
  const notebook = await db
    .insert(notebooks)
    .values({
      userId,
      notebookId,
      title,
      url: (
        await db
          .select()
          .from(syncs)
          .where(eq(syncs.syncId, syncId))
      )[0]?.url,
    })
    .returning()

  // Update sync status
  const sync = await db
    .update(syncs)
    .set({
      notebookId: notebook[0]?.id,
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
      sourceUrls: sourceUrls || [],
    })
    .where(and(eq(syncs.syncId, syncId), eq(syncs.userId, userId)))
    .returning()

  revalidatePath('/dashboard')
  return { notebook: notebook[0], sync: sync[0] }
}

export async function failSync(syncId: string, error: string) {
  const userId = await getUserId()

  const result = await db
    .update(syncs)
    .set({
      status: 'failed',
      error,
      updatedAt: new Date(),
    })
    .where(and(eq(syncs.syncId, syncId), eq(syncs.userId, userId)))
    .returning()

  revalidatePath('/dashboard')
  return result[0]
}
