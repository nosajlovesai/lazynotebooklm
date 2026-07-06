import { auth } from '@/lib/auth'
import { startSync, updateSyncProgress, completeSyncWithNotebook, failSync } from '@/app/actions/sync'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { url, config } = await request.json()

    if (!url) {
      return Response.json({ error: 'URL is required' }, { status: 400 })
    }

    // Start the sync
    const sync = await startSync(url, config || {})

    // Run sync in background
    simulateSyncPipeline(sync.syncId, url, config).catch(console.error)

    return Response.json(sync)
  } catch (error) {
    console.error('Sync error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

async function simulateSyncPipeline(syncId: string, url: string, config: any) {
  const logs: any[] = []

  try {
    // Step 1: Crawl URL with Crawl4AI
    logs.push({
      timestamp: new Date().toISOString(),
      step: 'crawl',
      message: `Starting Crawl4AI on ${url}...`,
    })
    await updateSyncProgress(syncId, 20, logs, 'processing')
    await new Promise((r) => setTimeout(r, 1500))

    // In production, call real Crawl4AI API
    // const crawledContent = await crawlWithCrawl4AI(url, config)

    logs.push({
      timestamp: new Date().toISOString(),
      step: 'crawl_complete',
      message: 'Successfully crawled URL and extracted content',
    })
    await updateSyncProgress(syncId, 40, logs, 'processing')

    // Step 2: Process PDFs and filter
    logs.push({
      timestamp: new Date().toISOString(),
      step: 'pdf_filter',
      message: 'Filtering PDFs based on configuration...',
    })
    await new Promise((r) => setTimeout(r, 1200))

    logs.push({
      timestamp: new Date().toISOString(),
      step: 'pdf_filter_complete',
      message: 'PDF filtering completed, 3 documents processed',
    })
    await updateSyncProgress(syncId, 60, logs, 'processing')

    // Step 3: Authenticate with NotebookLM
    logs.push({
      timestamp: new Date().toISOString(),
      step: 'auth',
      message: 'Authenticating with NotebookLM...',
    })
    await new Promise((r) => setTimeout(r, 1000))

    logs.push({
      timestamp: new Date().toISOString(),
      step: 'auth_complete',
      message: 'Successfully authenticated with NotebookLM',
    })
    await updateSyncProgress(syncId, 80, logs, 'processing')

    // Step 4: Create notebook and upload content
    logs.push({
      timestamp: new Date().toISOString(),
      step: 'notebook_create',
      message: 'Creating NotebookLM notebook...',
    })
    await new Promise((r) => setTimeout(r, 1500))

    const notebookTitle = `${new URL(url).hostname.replace('www.', '')} - ${new Date().toLocaleDateString()}`
    const notebookId = `nb-${Date.now()}`

    logs.push({
      timestamp: new Date().toISOString(),
      step: 'notebook_create_complete',
      message: `Notebook created: ${notebookTitle}`,
    })

    logs.push({
      timestamp: new Date().toISOString(),
      step: 'upload',
      message: 'Uploading content to notebook...',
    })
    await new Promise((r) => setTimeout(r, 1200))

    logs.push({
      timestamp: new Date().toISOString(),
      step: 'upload_complete',
      message: 'All content uploaded successfully',
    })

    // Complete the sync
    await completeSyncWithNotebook(syncId, notebookId, notebookTitle, [url])
    await updateSyncProgress(syncId, 100, logs, 'completed')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logs.push({
      timestamp: new Date().toISOString(),
      step: 'error',
      message: `Sync failed: ${errorMessage}`,
    })
    await failSync(syncId, errorMessage)
  }
}
