"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Bug,
  Check,
  ChevronDown,
  CloudUpload,
  Lock,
  ScanSearch,
  TerminalSquare,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import type { PipelineState } from "@/hooks/use-pipeline"
import { PIPELINE_STEPS, safeHost, type LogEntry } from "@/lib/pipeline"
import { cn } from "@/lib/utils"

const STEP_ICONS = [Bug, ScanSearch, Lock, CloudUpload]

const STEP_RESULTS: (string | null)[] = [
  "27 links found",
  "12 found",
  "Session valid",
  "13 sources synced",
]

type PipelineViewProps = {
  state: PipelineState
  url: string
}

export function PipelineView({ state, url }: PipelineViewProps) {
  return (
    <AnimatePresence>
      {(state.running || state.finished) && (
        <motion.div
          initial={{ opacity: 0, y: 16, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: 16, height: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <Card
            className={cn(
              "overflow-hidden transition-shadow",
              state.running &&
                "border-primary/30 shadow-[0_0_48px_-16px] shadow-primary/30"
            )}
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {state.running ? (
                      <Spinner className="size-4 text-primary" />
                    ) : (
                      <Check className="size-4 text-primary" aria-hidden="true" />
                    )}
                    {state.running ? "Smart Sync in progress" : "Smart Sync complete"}
                  </CardTitle>
                  <CardDescription className="font-mono text-xs">
                    {safeHost(url)}
                  </CardDescription>
                </div>
                <Badge
                  variant="secondary"
                  className="font-mono text-[10px] tracking-wider"
                >
                  {state.progress}%
                </Badge>
              </div>
              <Progress value={state.progress} className="mt-2" />
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <ol className="flex flex-col gap-0.5">
                {PIPELINE_STEPS.map((step, i) => (
                  <PipelineStepRow
                    key={step.id}
                    index={i}
                    label={step.label}
                    status={state.stepStatuses[i]}
                  />
                ))}
              </ol>
              <TerminalWindow logs={state.logs} running={state.running} />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function PipelineStepRow({
  index,
  label,
  status,
}: {
  index: number
  label: string
  status: "pending" | "active" | "completed"
}) {
  const Icon = STEP_ICONS[index]
  const result = STEP_RESULTS[index]

  return (
    <li className="flex items-center gap-3 py-2">
      <div className="relative flex flex-col items-center self-stretch">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors",
            status === "completed" &&
              "border-primary/40 bg-primary/15 text-primary",
            status === "active" &&
              "border-primary bg-primary/10 text-primary shadow-[0_0_16px_-2px] shadow-primary/50",
            status === "pending" &&
              "border-border bg-secondary text-muted-foreground/60"
          )}
        >
          {status === "completed" ? (
            <Check className="size-4" aria-hidden="true" />
          ) : status === "active" ? (
            <Spinner className="size-4" />
          ) : (
            <Icon className="size-4" aria-hidden="true" />
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <span
          className={cn(
            "truncate text-sm transition-colors",
            status === "pending" && "text-muted-foreground/60",
            status === "active" && "font-medium text-foreground",
            status === "completed" && "text-muted-foreground"
          )}
        >
          {label}
        </span>
        {status === "completed" && result ? (
          <Badge className="shrink-0 bg-primary/15 font-mono text-[10px] text-primary">
            {result}
          </Badge>
        ) : status === "active" ? (
          <Badge
            variant="secondary"
            className="shrink-0 font-mono text-[10px] text-primary"
          >
            ACTIVE
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="shrink-0 font-mono text-[10px] text-muted-foreground/60"
          >
            PENDING
          </Badge>
        )}
      </div>
    </li>
  )
}

function TerminalWindow({
  logs,
  running,
}: {
  logs: LogEntry[]
  running: boolean
}) {
  const [open, setOpen] = React.useState(true)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const viewport = scrollRef.current?.querySelector(
      "[data-slot=scroll-area-viewport]"
    )
    if (viewport) viewport.scrollTop = viewport.scrollHeight
  }, [logs.length])

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="overflow-hidden rounded-lg border border-border bg-black/80">
        <CollapsibleTrigger
          render={
            <button
              type="button"
              className="flex w-full items-center gap-2 border-b border-white/10 px-3 py-2 text-left"
            >
              <TerminalSquare
                className="size-3.5 text-primary"
                aria-hidden="true"
              />
              <span className="font-mono text-[11px] tracking-wider text-white/70">
                extraction.log
              </span>
              {running && (
                <span
                  className="size-1.5 animate-pulse rounded-full bg-primary"
                  aria-hidden="true"
                />
              )}
              <ChevronDown
                className={cn(
                  "ml-auto size-3.5 text-white/50 transition-transform",
                  open && "rotate-180"
                )}
                aria-hidden="true"
              />
            </button>
          }
        />
        <CollapsibleContent>
          <div ref={scrollRef}>
            <ScrollArea className="h-44">
              <div className="flex flex-col gap-1 p-3 font-mono text-xs">
                {logs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2"
                  >
                    <span
                      className={cn(
                        "shrink-0",
                        log.level === "SUCCESS" && "text-primary",
                        log.level === "INFO" && "text-sky-400/80",
                        log.level === "WARN" && "text-amber-400/80",
                        log.level === "SYS" && "text-white/40"
                      )}
                    >
                      [{log.level}]
                    </span>
                    <span className="text-white/75">{log.message}</span>
                  </motion.div>
                ))}
                {running && (
                  <span className="mt-0.5 inline-block h-3.5 w-2 animate-pulse bg-primary/80" />
                )}
              </div>
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
