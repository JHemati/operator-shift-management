import { Loader2 } from "lucide-react"

interface LoadingProps {
  text?: string
  className?: string
}

export function Loading({ text = "Loading...", className = "" }: LoadingProps) {
  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      <span>{text}</span>
    </div>
  )
}
