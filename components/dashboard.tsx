"use client"

import * as React from "react"
import { toast } from "sonner"

import { NotebookGrid } from "@/components/notebook-grid"
import { PipelineView } from "@/components/pipeline-view"
import { SettingsDialog } from "@/components/settings-dialog"
import { SiteHeader } from "@/components/site-header"
import { SyncForm, type SyncConfig } from "@/components/sync-form"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePipeline } from "@/hooks/use-pipeline"
import {
  INITIAL_NOTEBOOKS,
  safeHost,
  type Notebook,
} from "@/lib/pipeline"

export function Dashboard() {
  const [tab, setTab] = React.useState("pipeline")
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [connected, setConnected] = React.useState(false)
  const [notebooks, setNotebooks] =
    React.useState<Notebook[]>(INITIAL_NOTEBOOKS)
  const [activeConfig, setActiveConfig] = React.useState<SyncConfig | null>(
    null
  )

  const handleComplete = React.useCallback(() => {
    setActiveConfig((config) => {
      if (config) {
        setNotebooks((prev) => [
          {
            id: `nb-${Date.now()}`,
            title: config.notebookName,
            domain: safeHost(config.url),
            sources: { webpages: 1, pdfs: 12 },
            lastSynced: "Just now",
          },
          ...prev,
        ])
        toast.success("Notebook synced", {
          description: `"${config.notebookName}" is now live with 13 sources.`,
        })
      }
      return config
    })
  }, [])

  const { state, start, reset } = usePipeline(handleComplete)

  function handleStart(config: SyncConfig) {
    setActiveConfig(config)
    reset()
    start(config.url, config.depth)
    toast.info("Smart Sync started", {
      description: `Crawling ${safeHost(config.url)} at depth ${config.depth}.`,
    })
  }

  function handleResync(notebook: Notebook) {
    setTab("pipeline")
    handleStart({
      url: `https://${notebook.domain}`,
      notebookName: notebook.title,
      extractPdfs: true,
      extractSubLinks: true,
      scrapeMarkdown: true,
      depth: 2,
    })
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader
        connected={connected}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 md:px-6 md:py-14">
        <section className="flex flex-col items-center gap-3 text-center">
          <Badge
            variant="secondary"
            className="gap-1.5 font-mono text-[10px] tracking-widest"
          >
            <span
              className="size-1.5 rounded-full bg-primary"
              aria-hidden="true"
            />
            AGENT PIPELINE ONLINE
          </Badge>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            Sync any website into NotebookLM. Automatically.
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
            Paste a URL and the agent crawls text and PDF assets, filters
            high-value study material, and batch-uploads everything into your
            Google NotebookLM workspace.
          </p>
        </section>

        <Tabs value={tab} onValueChange={(value) => setTab(value as string)}>
          <TabsList className="mx-auto">
            <TabsTrigger value="pipeline">Smart Pipeline</TabsTrigger>
            <TabsTrigger value="workspace">
              Workspace
              <Badge
                variant="secondary"
                className="ml-1.5 px-1.5 font-mono text-[10px]"
              >
                {notebooks.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-6 flex flex-col gap-6">
            <SyncForm running={state.running} onStart={handleStart} />
            <PipelineView state={state} url={activeConfig?.url ?? ""} />
          </TabsContent>

          <TabsContent value="workspace" className="mt-6">
            <NotebookGrid notebooks={notebooks} onResync={handleResync} />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border py-4">
        <p className="text-center font-mono text-[10px] tracking-wider text-muted-foreground/60">
          LAZYNOTEBOOKLM · CRAWL4AI × GOOGLE NOTEBOOKLM · LOCAL FASTAPI BRIDGE
        </p>
      </footer>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        connected={connected}
        onConnectedChange={setConnected}
      />
    </div>
  )
}
