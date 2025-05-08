"use client"

import { useEffect, useState } from "react"
import { formatSupabaseError } from "@/lib/error-handling"
import { useToast } from "@/hooks/use-toast"

/**
 * A hook for fetching data from Supabase
 * @param queryFn Function that returns a Supabase query
 * @param dependencies Dependencies array for the query
 * @returns Object containing data, loading state, error, and refetch function
 */
export function useSupabaseQuery<T>(queryFn: () => Promise<T>, dependencies: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await queryFn()
      setData(result)
    } catch (err) {
      console.error("Query error:", err)

      // Handle network errors specifically
      if (err instanceof TypeError && err.message.includes("Failed to fetch")) {
        setError("Network error: Unable to connect to the database. Please check your internet connection.")
        toast({
          title: "Network Error",
          description: "Unable to connect to the database. Please check your internet connection.",
          variant: "destructive",
        })
      } else {
        const errorMessage = formatSupabaseError(err)
        setError(errorMessage)
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  return { data, loading, error, refetch: fetchData }
}
