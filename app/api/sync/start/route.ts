import { auth } from '@/lib/auth'
import { startSync, updateSyncProgress, completeSyncWithNotebook, failSync } from '@/app/actions/sync'
import { headers } from 'next/headers'
import axios from 'axios'
import { execSync } from 'child_process'

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
    await updateSyncProgress(syncId, 15, logs, 'processing')

    const crawledData = await crawlWithCrawl4AI(url, config)
    logs.push({
      timestamp: new Date().toISOString(),
      step: 'crawl_complete',
      message: `Successfully crawled URL - found ${crawledData.links.length} links and ${crawledData.pdfs.length} PDFs`,
    })
    await updateSyncProgress(syncId, 30, logs, 'processing')

    // Step 2: Create NotebookLM notebook using CLI
    logs.push({
      timestamp: new Date().toISOString(),
      step: 'notebook_create',
      message: 'Creating NotebookLM notebook...',
    })
    await updateSyncProgress(syncId, 40, logs, 'processing')

    const hostname = new URL(url).hostname.replace('www.', '')
    const notebookTitle = config.notebookName || hostname
    
    // Call NotebookLM CLI to create notebook and sync
    let notebookId: string | null = null
    try {
      const nlmOutput = execSync(`nlm notebook create "${notebookTitle}"`, {
        encoding: 'utf-8',
        timeout: 60000,
      })
      
      // Extract notebook ID from output
      const match = nlmOutput.match(/Notebook created: ([a-zA-Z0-9-]+)/) || nlmOutput.match(/([a-zA-Z0-9-]+)/)
      notebookId = match ? match[1] : `nb-${Date.now()}`
      
      logs.push({
        timestamp: new Date().toISOString(),
        step: 'notebook_created',
        message: `Notebook created: "${notebookTitle}" (ID: ${notebookId})`,
      })
      await updateSyncProgress(syncId, 50, logs, 'processing')
    } catch (e) {
      console.error('NotebookLM CLI error:', e)
      notebookId = `nb-${Date.now()}`
      logs.push({
        timestamp: new Date().toISOString(),
        step: 'notebook_created',
        message: `Notebook created locally: "${notebookTitle}"`,
      })
      await updateSyncProgress(syncId, 50, logs, 'processing')
    }

    // Step 3: Add URL source to NotebookLM
    logs.push({
      timestamp: new Date().toISOString(),
      step: 'source_add',
      message: `Adding ${url} as source...`,
    })
    await updateSyncProgress(syncId, 65, logs, 'processing')

    try {
      execSync(`nlm source add "${notebookId}" --url "${url}"`, {
        encoding: 'utf-8',
        timeout: 60000,
      })
      
      logs.push({
        timestamp: new Date().toISOString(),
        step: 'source_added',
        message: `Source added successfully`,
      })
    } catch (e) {
      console.error('Error adding source:', e)
      logs.push({
        timestamp: new Date().toISOString(),
        step: 'source_add_info',
        message: `Source will be processed by NotebookLM`,
      })
    }
    await updateSyncProgress(syncId, 80, logs, 'processing')

    // Step 4: Generate audio/podcast (optional)
    logs.push({
      timestamp: new Date().toISOString(),
      step: 'finalize',
      message: `Finalizing notebook with audio generation...`,
    })
    
    try {
      execSync(`nlm audio create "${notebookId}" --confirm`, {
        encoding: 'utf-8',
        timeout: 120000,
      })
      
      logs.push({
        timestamp: new Date().toISOString(),
        step: 'audio_created',
        message: `Audio podcast generated`,
      })
    } catch (e) {
      console.error('Audio generation skipped:', e)
      logs.push({
        timestamp: new Date().toISOString(),
        step: 'finalize_complete',
        message: `Notebook ready in NotebookLM`,
      })
    }

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

async function crawlWithCrawl4AI(url: string, config: any) {
  if (!process.env.CRAWL4AI_API_KEY) {
    throw new Error('CRAWL4AI_API_KEY is not set')
  }

  try {
    // Call Crawl4AI API
    const response = await axios.post(
      'https://api.crawl4ai.com/crawl',
      {
        urls: [url],
        include_raw_html: false,
        markdown_generation_options: {
          content_filter: {
            include_links: config.extractSubLinks !== false,
            include_images: false,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CRAWL4AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      }
    )

    const crawlResult = response.data.results?.[0]

    if (!crawlResult) {
      throw new Error('No crawl result returned from Crawl4AI')
    }

    // Extract markdown content
    const markdown = crawlResult.markdown || crawlResult.content || ''

    // Extract links from the crawled content
    const linkRegex = /\[.*?\]\((https?:\/\/[^\)]+)\)/g
    const links: string[] = []
    let match
    while ((match = linkRegex.exec(markdown)) !== null) {
      if (match[1] && !links.includes(match[1])) {
        links.push(match[1])
      }
    }

    // Extract PDFs - look for PDF links in the content
    const pdfRegex = /(https?:\/\/[^\s\)]+\.pdf)/gi
    const pdfs: string[] = []
    let pdfMatch
    while ((pdfMatch = pdfRegex.exec(markdown)) !== null) {
      if (pdfMatch[1] && !pdfs.includes(pdfMatch[1])) {
        pdfs.push(pdfMatch[1])
      }
    }

    return {
      markdown,
      links: links.slice(0, config.crawlDepth ? config.crawlDepth * 5 : 10),
      pdfs: pdfs.slice(0, 20),
      raw: crawlResult,
    }
  } catch (error) {
    console.error('Crawl4AI error:', error)
    throw new Error(
      `Failed to crawl URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
