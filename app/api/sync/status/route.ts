import { auth } from '@/lib/auth'
import { getSyncStatus } from '@/app/actions/sync'
import { headers } from 'next/headers'

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const syncId = url.searchParams.get('syncId')

    if (!syncId) {
      return Response.json({ error: 'syncId is required' }, { status: 400 })
    }

    const sync = await getSyncStatus(syncId)

    if (!sync) {
      return Response.json({ error: 'Sync not found' }, { status: 404 })
    }

    return Response.json(sync)
  } catch (error) {
    console.error('Status error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
