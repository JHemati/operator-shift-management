import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  try {
    // Create a Supabase client configured to use cookies
    const supabase = createMiddlewareClient({ req, res })

    // Refresh session if expired - required for Server Components
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Define protected routes that require authentication
    const isProtectedRoute = pathname.startsWith("/dashboard")

    // Define auth routes (login, register, etc.)
    const isAuthRoute = pathname === "/login"

    // If user is not signed in and the route is protected, redirect to login
    if (!session && isProtectedRoute) {
      const redirectUrl = new URL("/login", req.url)
      // Add the original URL as a query parameter to redirect back after login
      redirectUrl.searchParams.set("redirectTo", pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // If user is signed in and the route is an auth route, redirect to dashboard
    if (session && isAuthRoute) {
      // Check if there's a redirectTo parameter
      const redirectTo = req.nextUrl.searchParams.get("redirectTo") || "/dashboard"
      const redirectUrl = new URL(redirectTo, req.url)
      return NextResponse.redirect(redirectUrl)
    }
  } catch (error) {
    console.error("Middleware error:", error)

    // If there's an error with authentication on a protected route, redirect to login
    if (pathname.startsWith("/dashboard")) {
      const redirectUrl = new URL("/login", req.url)
      redirectUrl.searchParams.set("error", "auth_error")
      return NextResponse.redirect(redirectUrl)
    }
  }

  return res
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
}
