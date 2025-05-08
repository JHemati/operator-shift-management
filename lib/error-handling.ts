import type { PostgrestError } from "@supabase/supabase-js"

/**
 * Formats a Supabase error for display
 * @param error The error to format
 * @returns A user-friendly error message
 */
export const formatSupabaseError = (error: PostgrestError | Error | unknown): string => {
  if (!error) return "An unknown error occurred"

  // Handle network errors
  if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
    return "Network error: Unable to connect to the database. Please check your internet connection."
  }

  // Handle PostgrestError
  if (typeof error === "object" && error !== null && "code" in error && "message" in error) {
    const pgError = error as PostgrestError

    // Handle common Supabase errors
    switch (pgError.code) {
      case "PGRST116":
        return "No data found"
      case "23505":
        return "A record with this information already exists"
      case "42P01":
        return "Database table not found. Please contact an administrator."
      case "23503":
        return "This operation would violate database constraints"
      default:
        return pgError.message || "Database operation failed"
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message
  }

  // Handle unknown errors
  return String(error)
}

/**
 * Safely executes a database operation with error handling
 * @param operation The async operation to execute
 * @param errorHandler Optional custom error handler
 * @returns The result of the operation or throws an error
 */
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  errorHandler?: (error: unknown) => void,
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    console.error("Database operation error:", error)

    if (errorHandler) {
      errorHandler(error)
    }

    // Handle network errors specifically
    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      throw new Error("Network error: Unable to connect to the database. Please check your internet connection.")
    }

    throw new Error(formatSupabaseError(error))
  }
}
