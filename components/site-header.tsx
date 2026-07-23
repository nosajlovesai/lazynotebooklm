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
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold">NotebookLM Sync</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {connected ? "✓ Connected" : "○ Not connected"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
          >
            Settings
          </Button>
        </div>
      </div>
    </header>
  )
}
