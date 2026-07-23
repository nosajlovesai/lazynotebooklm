"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import type { PipelineState } from "@/hooks/use-pipeline"
import { PIPELINE_STEPS, safeHost } from "@/lib/pipeline"
import { cn } from "@/lib/utils"

type PipelineViewProps = {
  state: PipelineState
  url: string
}

export function PipelineView({ state, url }: PipelineViewProps) {
  return (
    <AnimatePresence>
      {(state.running || state.finished) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{state.running ? "Syncing..." : "Done!"}</CardTitle>
                  <CardDescription>{safeHost(url)}</CardDescription>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-medium">{state.progress}%</div>
                  <Progress value={state.progress} className="mt-1 w-24" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {PIPELINE_STEPS.map((step, i) => (
                  <div key={step.id} className="flex items-center gap-2 text-sm">
                    <div className={cn(
                      "size-2 rounded-full",
                      state.stepStatuses[i] === "completed" && "bg-green-600",
                      state.stepStatuses[i] === "active" && "bg-blue-500",
                      state.stepStatuses[i] === "pending" && "bg-gray-400"
                    )} />
                    <span className={cn(
                      state.stepStatuses[i] === "pending" && "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
              {state.logs.length > 0 && (
                <div className="mt-3 rounded bg-black/20 p-2 font-mono text-xs max-h-32 overflow-y-auto">
                  {state.logs.slice(-5).map((log, i) => (
                    <div key={i} className="text-white/70">
                      {log.message}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


