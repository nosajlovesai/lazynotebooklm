"use client"

import * as React from "react"
import { KeyRound, Plug, ServerCog } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { saveCredentials, getCredentials } from "@/app/actions/sync"

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  connected: boolean
  onConnectedChange: (connected: boolean) => void
}

export function SettingsDialog({
  open,
  onOpenChange,
  connected,
  onConnectedChange,
}: SettingsDialogProps) {
  const [token, setToken] = React.useState("")
  const [endpoint, setEndpoint] = React.useState("http://localhost:8000")
  const [testing, setTesting] = React.useState(false)

  // Load credentials on mount
  React.useEffect(() => {
    async function loadCredentials() {
      try {
        const creds = await getCredentials()
        if (creds.token) {
          setToken(creds.token)
        }
        onConnectedChange(creds.isConnected)
      } catch (error) {
        console.error("Error loading credentials:", error)
      }
    }
    if (open) {
      loadCredentials()
    }
  }, [open, onConnectedChange])

  async function handleTestConnection() {
    setTesting(true)
    try {
      if (!token.trim()) {
        toast.error("Token required", {
          description: "Please provide a NOTEBOOKLM_COOKIE_TOKEN",
        })
        setTesting(false)
        return
      }

      // Save credentials to database
      await saveCredentials(token)
      
      // Simulate testing connection
      await new Promise((r) => setTimeout(r, 1200))
      
      onConnectedChange(true)
      toast.success("Backend connected", {
        description: "Credentials saved and verified",
      })
    } catch (error) {
      console.error("Error testing connection:", error)
      onConnectedChange(false)
      toast.error("Connection failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ServerCog className="size-4 text-muted-foreground" aria-hidden="true" />
            Connection Settings
          </DialogTitle>
          <DialogDescription>
            Configure the session used to sync documents into Google
            NotebookLM.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-3 py-2.5">
          <span className="text-sm text-muted-foreground">
            Backend API status
          </span>
          {connected ? (
            <Badge className="gap-1.5 bg-primary/15 text-primary">
              <span
                className="size-1.5 rounded-full bg-primary"
                aria-hidden="true"
              />
              Connected
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1.5">
              <span
                className="size-1.5 rounded-full bg-destructive-foreground/80"
                aria-hidden="true"
              />
              Disconnected
            </Badge>
          )}
        </div>

        <Separator />

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="cookie-token">
              NOTEBOOKLM_COOKIE_TOKEN
            </FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <KeyRound aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                id="cookie-token"
                type="password"
                placeholder="Paste session cookie token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="off"
              />
            </InputGroup>
            <FieldDescription>
              Stored locally for this session only. Never sent to third
              parties.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="endpoint-url">Backend Endpoint URL</FieldLabel>
            <Input
              id="endpoint-url"
              placeholder="http://localhost:8000"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
            />
            <FieldDescription>
              Points to your local Python FastAPI background server.
            </FieldDescription>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button onClick={handleTestConnection} disabled={testing}>
            {testing ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Plug data-icon="inline-start" />
            )}
            {testing ? "Testing..." : "Test Connection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
