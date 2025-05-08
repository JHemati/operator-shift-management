"use client"

import { useState } from "react"
import { formatSupabaseError } from "@/lib/error-handling"
import { useToast } from "@/hooks/use-toast"

/**
 * A hook for performing mutations with Supabase
 * @param mutationFn Function that performs the mutation
 * @param options Configuration options
 * @returns Object containing mutation function, loading state, and error
 */
export function useSupabaseMutation<T, V>(
  mutationFn: (variables: V) => Promise<T>,
  options: {
    onSuccess?: (data: T) => void
    onError?: (error: string) => void
    successMessage?: string
  } = {},
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const mutate = async (variables: V): Promise<T | null> => {
    setLoading(true)
    setError(null)

    try {
      const result = await mutationFn(variables)

      if (options.successMessage) {
        toast({
          title: "Success",
          description: options.successMessage,
        })
      }

      if (options.onSuccess) {
        options.onSuccess(result)
      }

      return result
    } catch (err) {
      const errorMessage = formatSupabaseError(err)
      setError(errorMessage)

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })

      if (options.onError) {
        options.onError(errorMessage)
      }

      return null
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}
