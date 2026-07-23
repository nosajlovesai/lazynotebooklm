export type StepStatus = "pending" | "active" | "completed"

export type PipelineStep = {
  id: string
  label: string
  detail?: string
}

export const PIPELINE_STEPS: PipelineStep[] = [
  { id: "crawl", label: "Crawling Website & Extracting Links (Crawl4AI)" },
  { id: "filter", label: "Filtering High-Value PDFs & Study Notes" },
  { id: "auth", label: "Authenticating with Google NotebookLM" },
  { id: "upload", label: "Batch Uploading Documents to Cloud" },
]

export type LogEntry = {
  level: "INFO" | "SUCCESS" | "WARN" | "SYS"
  message: string
}

export function buildLogScript(url: string, depth: number): LogEntry[][] {
  const host = safeHost(url)
  return [
    // Step 1: crawl
    [
      { level: "SYS", message: `crawl4ai v0.4.2 — session initialized` },
      { level: "INFO", message: `Target: ${url} (depth=${depth})` },
      { level: "INFO", message: `GET https://${host}/ ... 200 OK (312ms)` },
      { level: "INFO", message: `Parsing DOM — 148 anchor tags discovered` },
      { level: "INFO", message: `Found absolute path: /assets/hw1.pdf` },
      { level: "INFO", message: `Found absolute path: /assets/hw2.pdf` },
      { level: "INFO", message: `Found absolute path: /notes/n1.pdf` },
      { level: "INFO", message: `Following sub-link: /syllabus (depth 2)` },
      { level: "INFO", message: `Following sub-link: /schedule (depth 2)` },
      { level: "SUCCESS", message: `Crawl complete — 27 candidate assets queued` },
    ],
    // Step 2: filter
    [
      { level: "INFO", message: `Scoring assets with heuristic filter (pdf, notes, md)` },
      { level: "WARN", message: `Skipping duplicate: /assets/hw1.pdf (hash match)` },
      { level: "INFO", message: `Accepted: n1.pdf, n2.pdf, hw1.pdf ... (+9 more)` },
      { level: "INFO", message: `Rendering main page → markdown (14.2 KB)` },
      { level: "SUCCESS", message: `12 high-value documents selected` },
    ],
    // Step 3: auth
    [
      { level: "INFO", message: `Loading NOTEBOOKLM_COOKIE_TOKEN from session vault` },
      { level: "INFO", message: `POST notebooklm.google.com/auth ... handshake` },
      { level: "SUCCESS", message: `Session validated — workspace access granted` },
    ],
    // Step 4: upload
    [
      { level: "INFO", message: `Creating notebook "${host}" in workspace` },
      { level: "INFO", message: `Synced 4/12 files...` },
      { level: "INFO", message: `Synced 8/12 files...` },
      { level: "INFO", message: `Synced 12/12 files...` },
      { level: "SUCCESS", message: `Batch upload complete — 13 sources live in NotebookLM` },
    ],
  ]
}

export function safeHost(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname
  } catch {
    return url || "example.com"
  }
}

export function guessNotebookName(url: string): string {
  const host = safeHost(url)
  const base = host.replace(/^www\./, "").split(".")[0]
  if (!base) return "Untitled Notebook"
  return base.charAt(0).toUpperCase() + base.slice(1) + " Notes"
}

export type Notebook = {
  id: string
  title: string
  domain: string
  sources: { webpages: number; pdfs: number }
  lastSynced: string
}

export const INITIAL_NOTEBOOKS: Notebook[] = []
