"use client"

import * as React from "react"
import { PIPELINE_STEPS, type LogEntry, type StepStatus } from "@/lib/pipeline"

export type PipelineState = {
  running: boolean
  finished: boolean
  currentStep: number
  stepStatuses: StepStatus[]
  logs: LogEntry[]
  progress: number
  syncId?: string
}

const IDLE_STATE: PipelineState = {
  running: false,
  finished: false,
  currentStep: -1,
  stepStatuses: PIPELINE_STEPS.map(() => "pending"),
  logs: [],
  progress: 0,
}

const POLL_INTERVAL_MS = 1000

export function usePipeline(onComplete?: (() => void) | null) {
  const [state, setState] = React.useState<PipelineState>(IDLE_STATE)
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const onCompleteRef = React.useRef(onComplete)
  onCompleteRef.current = onComplete

  const stop = React.useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const reset = React.useCallback(() => {
    stop()
    setState(IDLE_STATE)
  }, [stop])

  const start = React.useCallback(
    async (url: string, depth: number, config?: any) => {
      stop()

      setState({
        running: true,
        finished: false,
        currentStep: 0,
        stepStatuses: PIPELINE_STEPS.map((_, i) => (i === 0 ? "active" : "pending")),
        logs: [],
        progress: 0,
      })

      try {
        // Call the sync API
        const response = await fetch("/api/sync/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, config: { crawlDepth: depth, ...config } }),
        })

        if (!response.ok) {
          throw new Error("Failed to start sync")
        }

        const syncData = await response.json()
        const syncId = syncData.syncId

        setState((prev) => ({ ...prev, syncId }))

        // Poll for sync status
        timerRef.current = setInterval(async () => {
          try {
            const statusResponse = await fetch(`/api/sync/status?syncId=${syncId}`)

            if (!statusResponse.ok) {
              throw new Error("Failed to get sync status")
            }

            const sync = await statusResponse.json()
            const logs = (sync.logs || []) as any[]

            setState((prev) => {
              const statuses = [...prev.stepStatuses]

              // Map progress to steps
              if (sync.progress >= 100) {
                statuses[0] = "completed"
                statuses[1] = "completed"
                statuses[2] = "completed"
                statuses[3] = "completed"
              } else if (sync.progress >= 80) {
                statuses[0] = "completed"
                statuses[1] = "completed"
                statuses[2] = "completed"
                statuses[3] = "active"
              } else if (sync.progress >= 60) {
                statuses[0] = "completed"
                statuses[1] = "completed"
                statuses[2] = "active"
                statuses[3] = "pending"
              } else if (sync.progress >= 40) {
                statuses[0] = "completed"
                statuses[1] = "active"
                statuses[2] = "pending"
                statuses[3] = "pending"
              } else if (sync.progress >= 20) {
                statuses[0] = "active"
                statuses[1] = "pending"
                statuses[2] = "pending"
                statuses[3] = "pending"
              }

              return {
                running: sync.progress < 100,
                finished: sync.progress >= 100,
                currentStep: Math.min(
                  Math.floor((sync.progress / 25) * 4),
                  PIPELINE_STEPS.length - 1
                ),
                stepStatuses: statuses,
                logs,
                progress: sync.progress,
                syncId,
              }
            })

            if (sync.progress >= 100) {
              stop()
              onCompleteRef.current?.()
            }
          } catch (error) {
            console.error("Error polling sync status:", error)
          }
        }, POLL_INTERVAL_MS)
      } catch (error) {
        console.error("Error starting sync:", error)
        setState((prev) => {
          const errorLog: LogEntry = {
            timestamp: new Date().toISOString(),
            step: "error",
            level: "error",
            message: error instanceof Error ? error.message : "Unknown error",
          }
          return {
            ...prev,
            running: false,
            finished: true,
            logs: [...prev.logs, errorLog],
          }
        })
      }
    },
    [stop]
  )

  React.useEffect(() => stop, [stop])

  return { state, start, reset }
}
