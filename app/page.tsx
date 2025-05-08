import Link from "next/link"
import { ArrowRight, BarChart3, Calendar, Clock, Settings, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-white border-b">
        <div className="container flex h-16 items-center px-4 sm:px-6">
          <h1 className="text-lg font-semibold">118 Operator Shift Management System</h1>
          <nav className="ml-auto flex gap-4">
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Optimize Operator Shift Management
                </h2>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl">
                  Efficiently distribute support operators across different provinces based on call volume and working
                  hours.
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/login">
                  <Button>
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-3 lg:gap-12">
              <Card>
                <CardHeader>
                  <Users className="h-6 w-6 text-gray-500 mb-2" />
                  <CardTitle>Zone Management</CardTitle>
                  <CardDescription>Define and manage zones across different provinces</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Create, update, and manage zones with detailed descriptions to organize provinces efficiently.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <BarChart3 className="h-6 w-6 text-gray-500 mb-2" />
                  <CardTitle>Call Volume Analysis</CardTitle>
                  <CardDescription>Record and analyze call volumes by time period</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Track incoming call volumes for different zones and provinces during regular and holiday days.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Calendar className="h-6 w-6 text-gray-500 mb-2" />
                  <CardTitle>Shift Scheduling</CardTitle>
                  <CardDescription>Automatically generate optimal shift schedules</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Calculate and distribute staff based on call volume, working hours, and break times with Excel
                    exports.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Key Features</h2>
                <ul className="grid gap-3">
                  <li className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <span>Optimize personnel distribution based on call volume</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-gray-500" />
                    <span>Intelligent break time management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <span>Separate schedules for regular and holiday days</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-gray-500" />
                    <span>Excel exports for work shifts and rest times</span>
                  </li>
                </ul>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="rounded-lg border bg-gray-50 p-6">
                  <h3 className="text-xl font-bold">Current System Coverage</h3>
                  <div className="mt-4 grid gap-4">
                    <div>
                      <h4 className="font-medium">Zone 1 - Fars Zone</h4>
                      <p className="text-sm text-gray-500">7 provinces, 407 operators</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Zone 2 - Tehran Zone</h4>
                      <p className="text-sm text-gray-500">5 provinces, 421 operators</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t bg-gray-50">
        <div className="container flex flex-col gap-2 py-6 px-4 md:flex-row md:items-center md:gap-4 md:px-6">
          <p className="text-center text-sm leading-loose text-gray-500 md:text-left">
            &copy; {new Date().getFullYear()} 118 Operator Shift Management System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
