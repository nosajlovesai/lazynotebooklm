"use client"

import { NotebookPen, Settings2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type SiteHeaderProps = {
  connected: boolean
  onOpenSettings: () => void
}

export function SiteHeader({ connected, onOpenSettings }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/15 text-primary">
            <NotebookPen className="size-4" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            LazyNotebookLM
          </span>
          <Badge
            variant="secondary"
            className="hidden font-mono text-[10px] tracking-wider sm:inline-flex"
          >
            v0.4_beta
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      connected
                        ? "bg-primary shadow-[0_0_8px] shadow-primary"
                        : "bg-destructive"
                    )}
                    aria-hidden="true"
                  />
                  {connected ? "API Connected" : "API Disconnected"}
                </button>
              }
            />
            <TooltipContent>Backend authentication status</TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            aria-label="Open settings"
          >
            <Settings2 aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  )
}
