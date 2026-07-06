"use client"

import { motion } from "framer-motion"
import {
  Clock,
  ExternalLink,
  FileText,
  FolderOpen,
  RefreshCw,
  ScrollText,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import type { Notebook } from "@/lib/pipeline"

type NotebookGridProps = {
  notebooks: Notebook[]
  onResync: (notebook: Notebook) => void
}

export function NotebookGrid({ notebooks, onResync }: NotebookGridProps) {
  if (notebooks.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderOpen aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No notebooks yet</EmptyTitle>
          <EmptyDescription>
            Run a Smart Sync from the Pipeline tab to create your first
            notebook.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {notebooks.map((notebook, i) => (
        <motion.div
          key={notebook.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
        >
          <NotebookCard notebook={notebook} onResync={onResync} />
        </motion.div>
      ))}
    </div>
  )
}

function NotebookCard({
  notebook,
  onResync,
}: {
  notebook: Notebook
  onResync: (notebook: Notebook) => void
}) {
  const total = notebook.sources.webpages + notebook.sources.pdfs

  return (
    <Card className="h-full transition-colors hover:border-primary/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm leading-snug text-balance">
            {notebook.title}
          </CardTitle>
          <Badge
            variant="secondary"
            className="shrink-0 font-mono text-[10px]"
          >
            {notebook.domain}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1.5 text-xs">
          <Clock className="size-3" aria-hidden="true" />
          Last synced {notebook.lastSynced}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2">
          <FileText className="size-3.5 text-primary" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">
            {total} Sources: {notebook.sources.webpages}{" "}
            {notebook.sources.webpages === 1 ? "Webpage" : "Webpages"},{" "}
            {notebook.sources.pdfs} PDFs
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onResync(notebook)}>
          <RefreshCw data-icon="inline-start" />
          Sync New Links
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            toast.info("Extraction logs", {
              description: `Showing logs for ${notebook.title} (${total} sources processed).`,
            })
          }
        >
          <ScrollText data-icon="inline-start" />
          Logs
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-primary hover:text-primary"
          onClick={() =>
            toast.success("Opening NotebookLM", {
              description: `Launching ${notebook.title} in Google NotebookLM.`,
            })
          }
        >
          Open
          <ExternalLink data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  )
}
