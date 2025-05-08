"use client"

import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { BarChart3, Calendar, Home, LogOut, Settings, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const { toast } = useToast()

  const handleSignOut = async () => {
    const { error } = await signOut()

    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      })
      router.push("/")
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="container flex h-16 items-center px-4 sm:px-6">
          <h1 className="text-lg font-semibold">118 Operator Shift Management</h1>
          <nav className="ml-auto flex gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                Dashboard
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </nav>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="w-64 border-r bg-gray-50 hidden md:block">
          <nav className="flex flex-col gap-2 p-4">
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full justify-start">
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/dashboard/zones">
              <Button variant="ghost" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Zone Management
              </Button>
            </Link>
            <Link href="/dashboard/provinces">
              <Button variant="ghost" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Province Management
              </Button>
            </Link>
            <Link href="/dashboard/parameters">
              <Button variant="ghost" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                System Parameters
              </Button>
            </Link>
            <Link href="/dashboard/call-volumes">
              <Button variant="ghost" className="w-full justify-start">
                <BarChart3 className="mr-2 h-4 w-4" />
                Call Volume Management
              </Button>
            </Link>
            <Link href="/dashboard/distribution">
              <Button variant="ghost" className="w-full justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                Personnel Distribution
              </Button>
            </Link>
          </nav>
        </aside>
        <main className="flex-1 overflow-auto">
          <div className="container py-6 px-4 sm:px-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
