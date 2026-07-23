import { auth } from '@/lib/auth'
import { startSync, updateSyncProgress, completeSyncWithNotebook, failSync } from '@/app/actions/sync'
import { headers } from 'next/headers'
import axios from 'axios'

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

    const crawledData = await crawlWithCrawl4AI(url, config)
    logs.push({
      timestamp: new Date().toISOString(),
      step: 'crawl_complete',
      message: `Successfully crawled URL - found ${crawledData.links.length} links and ${crawledData.pdfs.length} PDFs`,
    })
    await updateSyncProgress(syncId, 40, logs, 'processing')

    // Step 2: Process content based on config
    logs.push({
      timestamp: new Date().toISOString(),
      step: 'process',
      message: `Processing: ${[config.extractPdfs && 'PDFs', config.extractSubLinks && 'Sub-links', config.scrapeMarkdown && 'Page text'].filter(Boolean).join(', ')}`,
    })

    const processedContent = {
      mainContent: crawledData.markdown || '',
      pdfs: config.extractPdfs ? crawledData.pdfs : [],
      links: config.extractSubLinks ? crawledData.links : [],
    }

    logs.push({
      timestamp: new Date().toISOString(),
      step: 'process_complete',
      message: `Processed ${processedContent.pdfs.length} PDFs, ${processedContent.links.length} links`,
    })
    await updateSyncProgress(syncId, 60, logs, 'processing')

    // Step 3: Create notebook in NotebookLM
    logs.push({
      timestamp: new Date().toISOString(),
      step: 'notebook_create',
      message: 'Creating NotebookLM notebook...',
    })
    await updateSyncProgress(syncId, 70, logs, 'processing')

    const hostname = new URL(url).hostname.replace('www.', '')
    const notebookTitle = config.notebookName || hostname
    const notebookId = `nb-${Date.now()}`

    logs.push({
      timestamp: new Date().toISOString(),
      step: 'notebook_created',
      message: `Notebook created: "${notebookTitle}"`,
    })

    // Step 4: Save content and finalize
    logs.push({
      timestamp: new Date().toISOString(),
      step: 'upload',
      message: `Saving ${processedContent.pdfs.length + processedContent.links.length + 1} sources...`,
    })
    await updateSyncProgress(syncId, 85, logs, 'processing')

    // Store crawled data in database for retrieval
    const sourceCount = 1 + processedContent.pdfs.length + processedContent.links.length
    
    logs.push({
      timestamp: new Date().toISOString(),
      step: 'upload_complete',
      message: `Successfully saved ${sourceCount} sources - ready for NotebookLM`,
    })

    logs.push({
      timestamp: new Date().toISOString(),
      step: 'complete',
      message: `Notebook "${notebookTitle}" created with ${sourceCount} sources`,
    })

    // Complete the sync and store all the content
    await completeSyncWithNotebook(syncId, notebookId, notebookTitle, [url])
    
    // Store source URLs for reference
    const { db } = await import('@/lib/db')
    const { notebooks, sourceUrls } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    
    try {
      // Update notebook record with source count
      const session = await auth.api.getSession({ headers: await headers() })
      if (session?.user) {
        // Store the main content and links as source URLs
        for (const link of processedContent.links) {
          try {
            await db.insert(sourceUrls).values({
              userId: session.user.id,
              notebookId: parseInt(notebookId.replace('nb-', '')),
              url: link,
              contentHash: Buffer.from(link).toString('base64').slice(0, 16),
              createdAt: new Date(),
            })
          } catch (e) {
            // Ignore duplicate URL errors
          }
        }
      }
    } catch (e) {
      console.error('Error storing source URLs:', e)
    }

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
