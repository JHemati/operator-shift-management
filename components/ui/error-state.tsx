"use client"

import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  title?: string
  error: string
  onRetry?: () => void
}

export function ErrorState({ title = "Error", error, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4">
      <div className="flex items-start">
        <AlertCircle className="mr-3 h-5 w-5 text-red-600" />
        <div>
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          <div className="mt-1 text-sm text-red-700">{error}</div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
