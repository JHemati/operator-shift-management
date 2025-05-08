import { getBrowserClient } from "./supabase"
import { safeDbOperation } from "./error-handling"
import type { User } from "@supabase/supabase-js"

/**
 * Signs in a user with email and password
 * @param email User's email
 * @param password User's password
 * @returns Object containing user data or error
 */
export const signIn = async (email: string, password: string) => {
  return safeDbOperation(async () => {
    const supabase = getBrowserClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return { data, error: null }
  })
}

/**
 * Signs out the current user
 * @returns Object indicating success or error
 */
export const signOut = async () => {
  return safeDbOperation(async () => {
    const supabase = getBrowserClient()
    const { error } = await supabase.auth.signOut()

    if (error) throw error
    return { error: null }
  })
}

/**
 * Gets the current user
 * @returns The current user or null
 */
export const getCurrentUser = async (): Promise<User | null> => {
  return safeDbOperation(async () => {
    const supabase = getBrowserClient()
    const { data } = await supabase.auth.getUser()
    return data.user
  })
}

/**
 * Refreshes the current session
 * @returns Object containing session data or error
 */
export const refreshSession = async () => {
  return safeDbOperation(async () => {
    const supabase = getBrowserClient()
    const { data, error } = await supabase.auth.refreshSession()

    if (error) throw error
    return { data, error: null }
  })
}
