"use client"

import * as React from "react"
import {
  buildLogScript,
  PIPELINE_STEPS,
  type LogEntry,
  type StepStatus,
} from "@/lib/pipeline"

export type PipelineState = {
  running: boolean
  finished: boolean
  currentStep: number
  stepStatuses: StepStatus[]
  logs: LogEntry[]
  progress: number
}

const IDLE_STATE: PipelineState = {
  running: false,
  finished: false,
  currentStep: -1,
  stepStatuses: PIPELINE_STEPS.map(() => "pending"),
  logs: [],
  progress: 0,
}

const LOG_INTERVAL_MS = 550

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
    (url: string, depth: number) => {
      stop()
      const script = buildLogScript(url, depth)
      const totalLogs = script.reduce((n, s) => n + s.length, 0)

      let stepIndex = 0
      let logIndex = 0
      let emitted = 0

      setState({
        running: true,
        finished: false,
        currentStep: 0,
        stepStatuses: PIPELINE_STEPS.map((_, i) =>
          i === 0 ? "active" : "pending"
        ),
        logs: [],
        progress: 0,
      })

      timerRef.current = setInterval(() => {
        const stepLogs = script[stepIndex]
        const entry = stepLogs[logIndex]
        emitted += 1
        const isLastLogOfStep = logIndex === stepLogs.length - 1
        const isLastStep = stepIndex === script.length - 1
        const done = isLastLogOfStep && isLastStep

        setState((prev) => {
          const statuses = [...prev.stepStatuses]
          if (isLastLogOfStep) {
            statuses[stepIndex] = "completed"
            if (!isLastStep) statuses[stepIndex + 1] = "active"
          }
          return {
            running: !done,
            finished: done,
            currentStep: isLastLogOfStep && !isLastStep ? stepIndex + 1 : stepIndex,
            stepStatuses: statuses,
            logs: [...prev.logs, entry],
            progress: Math.round((emitted / totalLogs) * 100),
          }
        })

        if (done) {
          stop()
          onCompleteRef.current?.()
        } else if (isLastLogOfStep) {
          stepIndex += 1
          logIndex = 0
        } else {
          logIndex += 1
        }
      }, LOG_INTERVAL_MS)
    },
    [stop]
  )

  React.useEffect(() => stop, [stop])

  return { state, start, reset }
}
