"use client"

import * as React from "react"
import { ChevronDown, Globe, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Slider } from "@/components/ui/slider"
import { guessNotebookName } from "@/lib/pipeline"
import { cn } from "@/lib/utils"

export type SyncConfig = {
  url: string
  notebookName: string
  extractPdfs: boolean
  extractSubLinks: boolean
  scrapeMarkdown: boolean
  depth: number
}

type SyncFormProps = {
  running: boolean
  onStart: (config: SyncConfig) => void
}

export function SyncForm({ running, onStart }: SyncFormProps) {
  const [url, setUrl] = React.useState("")
  const [notebookName, setNotebookName] = React.useState("")
  const [nameTouched, setNameTouched] = React.useState(false)
  const [extractPdfs, setExtractPdfs] = React.useState(true)
  const [extractSubLinks, setExtractSubLinks] = React.useState(true)
  const [scrapeMarkdown, setScrapeMarkdown] = React.useState(true)
  const [depth, setDepth] = React.useState(2)
  const [configOpen, setConfigOpen] = React.useState(false)

  const effectiveName =
    nameTouched && notebookName
      ? notebookName
      : url
        ? guessNotebookName(url)
        : ""

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim() || running) return
    onStart({
      url: url.trim(),
      notebookName: effectiveName || "Untitled Notebook",
      extractPdfs,
      extractSubLinks,
      scrapeMarkdown,
      depth,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          placeholder="Paste URL (e.g. cs70.org)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={!url.trim() || running}
          size="sm"
        >
          {running ? "Syncing..." : "Sync"}
        </Button>
      </div>

      <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
        <CollapsibleTrigger className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ChevronDown className={cn("size-4 transition-transform", configOpen && "rotate-180")} />
          Options
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-3 text-sm">
          <Field>
            <FieldLabel htmlFor="notebook-name">Name</FieldLabel>
            <Input
              id="notebook-name"
              placeholder="Leave blank to auto-guess"
              value={notebookName}
              onChange={(e) => {
                setNameTouched(true)
                setNotebookName(e.target.value)
              }}
              size="sm"
            />
          </Field>

          <div className="space-y-2">
            <div className="text-xs font-medium">Crawl depth: {depth}</div>
            <Slider
              min={1}
              max={5}
              step={1}
              value={[depth]}
              onValueChange={(value) => setDepth(value[0])}
            />
          </div>

          <div className="space-y-2">
            <Field orientation="horizontal">
              <Checkbox
                id="extract-pdfs"
                checked={extractPdfs}
                onCheckedChange={(checked) => setExtractPdfs(checked === true)}
              />
              <FieldLabel htmlFor="extract-pdfs" className="font-normal">PDFs</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id="extract-sublinks"
                checked={extractSubLinks}
                onCheckedChange={(checked) => setExtractSubLinks(checked === true)}
              />
              <FieldLabel htmlFor="extract-sublinks" className="font-normal">Sub-pages</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id="scrape-markdown"
                checked={scrapeMarkdown}
                onCheckedChange={(checked) => setScrapeMarkdown(checked === true)}
              />
              <FieldLabel htmlFor="scrape-markdown" className="font-normal">Page text</FieldLabel>
            </Field>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </form>
  )
}
