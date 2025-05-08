"use client"
import Link from "next/link"
import { BarChart3, Calendar, Clock, Settings, Users, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Loading } from "@/components/ui/loading"
import { ErrorState } from "@/components/ui/error-state"
import { useSupabaseQuery } from "@/hooks/use-supabase-query"
import { getBrowserClient } from "@/lib/supabase"

interface DashboardStats {
  zoneCount: number
  provinceCount: number
  operatorCount: number
  averageResponseRate: number
  attendanceDuration: number
  standardBreakTime: number
}

interface Zone {
  id: string
  name: string
  provinceCount: number
  operatorCount: number
}

interface Province {
  id: string
  name: string
  zone_name: string
  work_start_time: number
  work_end_time: number
  operators: number
}

export default function DashboardPage() {
  const { toast } = useToast()
  const supabase = getBrowserClient()

  // Use our custom hook for data fetching with better error handling
  const {
    data: dashboardData,
    loading,
    error,
    refetch,
  } = useSupabaseQuery<{
    stats: DashboardStats
    zones: Zone[]
    provinces: Province[]
  }>(async () => {
    // Fetch zones
    const { data: zonesData, error: zonesError } = await supabase.from("zones").select("id, name")
    if (zonesError) throw zonesError

    // Set basic zone data first
    const basicZones = zonesData.map((zone) => ({
      id: zone.id,
      name: zone.name,
      provinceCount: 0,
      operatorCount: 0,
    }))

    // Fetch provinces
    const { data: provincesData, error: provincesError } = await supabase
      .from("provinces")
      .select(`
        id,
        name,
        zone_id,
        work_start_time,
        work_end_time,
        operators,
        zones (name)
      `)
      .limit(5)

    if (provincesError) throw provincesError

    // Transform provinces data
    const transformedProvinces = provincesData.map((province) => ({
      id: province.id,
      name: province.name,
      zone_name: province.zones?.name || "",
      work_start_time: province.work_start_time,
      work_end_time: province.work_end_time,
      operators: province.operators,
    }))

    // Calculate stats
    const zoneCount = zonesData.length

    // Count provinces
    const { count: provinceCount, error: countError } = await supabase
      .from("provinces")
      .select("*", { count: "exact", head: true })

    if (countError) throw countError

    // Calculate total operators
    const operatorCount = provincesData.reduce((sum, province) => sum + province.operators, 0)

    // Fetch system parameters
    const { data: parameters, error: parametersError } = await supabase
      .from("system_parameters")
      .select("*")
      .limit(1)
      .single()

    // Don't throw for no data found
    const systemParams = parametersError && parametersError.code !== "PGRST116" ? null : parameters

    // Update zone counts
    const updatedZones = await Promise.all(
      basicZones.map(async (zone) => {
        // Count provinces in this zone
        const { count: provinceCount, error: countError } = await supabase
          .from("provinces")
          .select("*", { count: "exact", head: true })
          .eq("zone_id", zone.id)

        if (countError) throw countError

        // Sum operators in this zone
        const { data: operators, error: operatorsError } = await supabase
          .from("provinces")
          .select("operators")
          .eq("zone_id", zone.id)

        if (operatorsError) throw operatorsError

        const operatorCount = operators?.reduce((sum, province) => sum + province.operators, 0) || 0

        return {
          ...zone,
          provinceCount: provinceCount || 0,
          operatorCount,
        }
      }),
    )

    return {
      stats: {
        zoneCount,
        provinceCount: provinceCount || 0,
        operatorCount,
        averageResponseRate: systemParams?.average_response_rate || 80,
        attendanceDuration: systemParams?.attendance_duration || 420,
        standardBreakTime: systemParams?.standard_break_time || 10,
      },
      zones: updatedZones,
      provinces: transformedProvinces,
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Welcome to the 118 Operator Shift Management System</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Loading text="Loading dashboard data..." />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">Welcome to the 118 Operator Shift Management System</p>
          </div>
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
        <ErrorState title="Error Loading Dashboard" error={error} onRetry={refetch} />
      </div>
    )
  }

  const { stats, zones, provinces } = dashboardData || {
    stats: {
      zoneCount: 0,
      provinceCount: 0,
      operatorCount: 0,
      averageResponseRate: 80,
      attendanceDuration: 420,
      standardBreakTime: 10,
    },
    zones: [],
    provinces: [],
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Welcome to the 118 Operator Shift Management System</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="zones">Zones</TabsTrigger>
          <TabsTrigger value="provinces">Provinces</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Zones</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.zoneCount}</div>
                <p className="text-xs text-muted-foreground">{zones.map((zone) => zone.name).join(", ")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Provinces</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.provinceCount}</div>
                <p className="text-xs text-muted-foreground">Across all zones</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Operators</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.operatorCount}</div>
                <p className="text-xs text-muted-foreground">
                  {zones.map((zone) => `${zone.operatorCount} in ${zone.name}`).join(", ")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Response Rate</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageResponseRate}</div>
                <p className="text-xs text-muted-foreground">Calls per hour per operator</p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Link href="/dashboard/zones">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Zones
                  </Button>
                </Link>
                <Link href="/dashboard/provinces">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Provinces
                  </Button>
                </Link>
                <Link href="/dashboard/call-volumes">
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Record Call Volumes
                  </Button>
                </Link>
                <Link href="/dashboard/distribution">
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="mr-2 h-4 w-4" />
                    Calculate Distribution
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>System Parameters</CardTitle>
                <CardDescription>Current system configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Attendance Duration</p>
                      <p className="text-sm text-muted-foreground">{stats.attendanceDuration} minutes</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Standard Break Time</p>
                      <p className="text-sm text-muted-foreground">{stats.standardBreakTime} minutes/hour</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Avg. Response Rate</p>
                      <p className="text-sm text-muted-foreground">{stats.averageResponseRate} calls/hour</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Link href="/dashboard/parameters">
                  <Button variant="outline" size="sm">
                    <Settings className="mr-2 h-4 w-4" />
                    Adjust Parameters
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="zones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Zone Overview</CardTitle>
              <CardDescription>Current zones in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md border">
                  <div className="grid grid-cols-3 gap-4 p-4 font-medium">
                    <div>Zone Name</div>
                    <div>Provinces</div>
                    <div>Total Operators</div>
                  </div>
                  {zones.length > 0 ? (
                    zones.map((zone) => (
                      <div key={zone.id} className="grid grid-cols-3 gap-4 border-t p-4">
                        <div>{zone.name}</div>
                        <div>{zone.provinceCount}</div>
                        <div>{zone.operatorCount}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">No zones found</div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/dashboard/zones">
                <Button>
                  <Users className="mr-2 h-4 w-4" />
                  Manage Zones
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="provinces" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Province Overview</CardTitle>
              <CardDescription>Current provinces in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md border">
                  <div className="grid grid-cols-4 gap-4 p-4 font-medium">
                    <div>Province Name</div>
                    <div>Zone</div>
                    <div>Working Hours</div>
                    <div>Operators</div>
                  </div>
                  {provinces.length > 0 ? (
                    provinces.map((province) => (
                      <div key={province.id} className="grid grid-cols-4 gap-4 border-t p-4">
                        <div>{province.name}</div>
                        <div>{province.zone_name}</div>
                        <div>
                          {province.work_start_time === 0 && province.work_end_time === 24
                            ? "24 hours"
                            : `${province.work_start_time}-${province.work_end_time}`}
                        </div>
                        <div>{province.operators}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">No provinces found</div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/dashboard/provinces">
                <Button>
                  <Users className="mr-2 h-4 w-4" />
                  Manage Provinces
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
