import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

// Define types for our database
export type Database = {
  public: {
    Tables: {
      zones: {
        Row: {
          id: string
          name: string
          description: string
          created_at?: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          created_at?: string
        }
      }
      provinces: {
        Row: {
          id: string
          name: string
          zone_id: string
          work_start_time: number
          work_end_time: number
          operators: number
          created_at?: string
        }
        Insert: {
          id?: string
          name: string
          zone_id: string
          work_start_time: number
          work_end_time: number
          operators: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          zone_id?: string
          work_start_time?: number
          work_end_time?: number
          operators?: number
          created_at?: string
        }
      }
      call_volumes: {
        Row: {
          id: string
          zone_id: string
          day_type: string
          hour: number
          volume: number
          created_at?: string
        }
        Insert: {
          id?: string
          zone_id: string
          day_type: string
          hour: number
          volume: number
          created_at?: string
        }
        Update: {
          id?: string
          zone_id?: string
          day_type?: string
          hour?: number
          volume?: number
          created_at?: string
        }
      }
      system_parameters: {
        Row: {
          id: string
          attendance_duration: number
          standard_break_time: number
          average_response_rate: number
          created_at?: string
        }
        Insert: {
          id?: string
          attendance_duration: number
          standard_break_time: number
          average_response_rate: number
          created_at?: string
        }
        Update: {
          id?: string
          attendance_duration?: number
          standard_break_time?: number
          average_response_rate?: number
          created_at?: string
        }
      }
      personnel_distribution: {
        Row: {
          id: string
          zone_id: string
          province_id: string
          day_type: string
          date: string
          hour: number
          operators: number
          break_time: number
          breaks_data: string
          created_at?: string
        }
        Insert: {
          id?: string
          zone_id: string
          province_id: string
          day_type: string
          date: string
          hour: number
          operators: number
          break_time: number
          breaks_data: string
          created_at?: string
        }
        Update: {
          id?: string
          zone_id?: string
          province_id?: string
          day_type?: string
          date?: string
          hour?: number
          operators?: number
          break_time?: number
          breaks_data?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
  }
}

// Singleton pattern implementation
let browserClient: SupabaseClient<Database> | null = null

/**
 * Gets the browser client, creating it if it doesn't exist
 * @returns Supabase client
 */
export const getBrowserClient = (): SupabaseClient<Database> => {
  if (!browserClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase environment variables")
    }

    browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }
  return browserClient
}

/**
 * Creates a Supabase client for server usage
 * @returns Supabase client
 * @throws Error if environment variables are missing
 */
export const createServerClient = (): SupabaseClient<Database> => {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
