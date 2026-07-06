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
      <div
        className={cn(
          "rounded-xl p-px transition-shadow",
          "bg-border focus-within:bg-primary/50 focus-within:shadow-[0_0_32px_-8px] focus-within:shadow-primary/40"
        )}
      >
        <InputGroup className="rounded-[calc(0.75rem-1px)] border-0 bg-card">
          <InputGroupAddon>
            <Globe aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Enter target URL, e.g., https://eecs70.org or Wikipedia..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-label="Target URL"
            className="h-12 text-sm"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="submit"
              variant="default"
              size="sm"
              disabled={!url.trim() || running}
            >
              <Sparkles data-icon="inline-start" />
              {running ? "Syncing..." : "Start Smart Sync"}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>

      <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
        <CollapsibleTrigger
          render={
            <button
              type="button"
              className="flex w-full items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform",
                  configOpen && "rotate-180"
                )}
                aria-hidden="true"
              />
              Pipeline configuration
              <span className="ml-auto font-mono text-[10px] tracking-wider text-muted-foreground/70">
                DEPTH {depth} · {[extractPdfs, extractSubLinks, scrapeMarkdown].filter(Boolean).length}/3 FILTERS
              </span>
            </button>
          }
        />
        <CollapsibleContent>
          <div className="mt-3 rounded-xl border border-border bg-card/50 p-4 md:p-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="notebook-name">
                  Target Notebook Name
                </FieldLabel>
                <Input
                  id="notebook-name"
                  placeholder="Auto-guessed from URL domain"
                  value={effectiveName}
                  onChange={(e) => {
                    setNameTouched(true)
                    setNotebookName(e.target.value)
                  }}
                />
                <FieldDescription>
                  Defaults to a name guessed from the URL domain.
                </FieldDescription>
              </Field>

              <FieldSet>
                <FieldLegend variant="label">Extraction filters</FieldLegend>
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                  <Field orientation="horizontal">
                    <Checkbox
                      id="extract-pdfs"
                      checked={extractPdfs}
                      onCheckedChange={(checked) =>
                        setExtractPdfs(checked === true)
                      }
                    />
                    <FieldLabel htmlFor="extract-pdfs" className="font-normal">
                      Extract PDFs
                    </FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <Checkbox
                      id="extract-sublinks"
                      checked={extractSubLinks}
                      onCheckedChange={(checked) =>
                        setExtractSubLinks(checked === true)
                      }
                    />
                    <FieldLabel
                      htmlFor="extract-sublinks"
                      className="font-normal"
                    >
                      Extract Sub-links
                    </FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <Checkbox
                      id="scrape-markdown"
                      checked={scrapeMarkdown}
                      onCheckedChange={(checked) =>
                        setScrapeMarkdown(checked === true)
                      }
                    />
                    <FieldLabel
                      htmlFor="scrape-markdown"
                      className="font-normal"
                    >
                      Scrape Main Markdown
                    </FieldLabel>
                  </Field>
                </div>
              </FieldSet>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="crawl-depth">Crawl Depth</FieldLabel>
                  <span className="font-mono text-xs text-primary">
                    {depth} {depth === 1 ? "page" : "pages"}
                  </span>
                </div>
                <Slider
                  id="crawl-depth"
                  min={1}
                  max={5}
                  step={1}
                  value={depth}
                  onValueChange={(value) =>
                    setDepth(Array.isArray(value) ? value[0] : value)
                  }
                />
                <FieldDescription>
                  How many levels of sub-pages the crawler will follow.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </form>
  )
}
