"use client"

import { useEffect, useState } from "react"
import { Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Loading } from "@/components/ui/loading"
import { ErrorState } from "@/components/ui/error-state"
import { useSupabaseQuery } from "@/hooks/use-supabase-query"
import { useSupabaseMutation } from "@/hooks/use-supabase-mutation"
import { getBrowserClient } from "@/lib/supabase"

interface Zone {
  id: string
  name: string
}

interface CallVolume {
  start: number
  end: number
  label: string
  volume: number
}

export default function CallVolumesPage() {
  const [zone, setZone] = useState("")
  const [dayType, setDayType] = useState("regular")
  const [loadingData, setLoadingData] = useState(false)
  const { toast } = useToast()
  const supabase = getBrowserClient()

  // Time periods for a day (hourly)
  const timePeriods = Array.from({ length: 24 }, (_, i) => ({
    start: i,
    end: i + 1,
    label: `${i}:00 - ${i + 1}:00`,
    volume: 0,
  }))

  const [callVolumes, setCallVolumes] = useState<CallVolume[]>(timePeriods)

  // Query for zones
  const {
    data: zones,
    loading: loadingZones,
    error: zonesError,
  } = useSupabaseQuery<Zone[]>(async () => {
    const { data, error } = await supabase.from("zones").select("id, name")
    if (error) throw error
    return data || []
  }, [])

  // Fetch call volumes when zone or day type changes
  useEffect(() => {
    const fetchCallVolumes = async () => {
      if (!zone) return

      setLoadingData(true)
      try {
        const { data, error } = await supabase
          .from("call_volumes")
          .select("hour, volume")
          .eq("zone_id", zone)
          .eq("day_type", dayType)
          .order("hour", { ascending: true })

        if (error) throw error

        // Reset volumes to 0
        const resetVolumes = timePeriods.map((period) => ({
          ...period,
          volume: 0,
        }))

        // Update with fetched data
        if (data && data.length > 0) {
          data.forEach((item) => {
            const index = item.hour
            if (index >= 0 && index < resetVolumes.length) {
              resetVolumes[index].volume = item.volume
            }
          })
        }

        setCallVolumes(resetVolumes)
      } catch (error) {
        console.error("Error fetching call volumes:", error)
        toast({
          title: "Error",
          description: "Failed to fetch call volumes",
          variant: "destructive",
        })
      } finally {
        setLoadingData(false)
      }
    }

    fetchCallVolumes()
  }, [zone, dayType, supabase, toast, timePeriods])

  // Mutation for saving call volumes
  const { mutate: saveCallVolumes, loading: saving } = useSupabaseMutation(
    async (variables: { zone: string; dayType: string; volumes: CallVolume[] }) => {
      if (!variables.zone) {
        throw new Error("Please select a zone")
      }

      // Delete existing records for this zone and day type
      await supabase.from("call_volumes").delete().eq("zone_id", variables.zone).eq("day_type", variables.dayType)

      // Insert new records
      const records = variables.volumes
        .filter((period) => period.volume > 0) // Only save non-zero volumes
        .map((period) => ({
          zone_id: variables.zone,
          day_type: variables.dayType,
          hour: period.start,
          volume: period.volume,
        }))

      if (records.length > 0) {
        const { error } = await supabase.from("call_volumes").insert(records)
        if (error) throw error
      }

      return { success: true }
    },
    {
      successMessage: "Call volumes saved successfully",
    },
  )

  const handleCallVolumeChange = (index: number, value: string) => {
    const newCallVolumes = [...callVolumes]
    newCallVolumes[index].volume = Number.parseInt(value) || 0
    setCallVolumes(newCallVolumes)
  }

  const handleSave = () => {
    saveCallVolumes({
      zone,
      dayType,
      volumes: callVolumes,
    })
  }

  if (loadingZones) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Call Volume Management</h2>
          <p className="text-muted-foreground">Record and manage call volumes for different zones and time periods</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Loading text="Loading zones..." />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (zonesError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Call Volume Management</h2>
          <p className="text-muted-foreground">Record and manage call volumes for different zones and time periods</p>
        </div>
        <ErrorState error={zonesError} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Call Volume Management</h2>
        <p className="text-muted-foreground">Record and manage call volumes for different zones and time periods</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Record Call Volumes</CardTitle>
          <CardDescription>Enter call volume data for specific zones and day types</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="zone">Zone</Label>
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger id="zone">
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones?.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dayType">Day Type</Label>
              <Select value={dayType} onValueChange={setDayType}>
                <SelectTrigger id="dayType">
                  <SelectValue placeholder="Select day type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular Day</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loadingData ? (
            <Loading text="Loading call volumes..." />
          ) : (
            <Tabs defaultValue="working-hours" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="working-hours">Working Hours</TabsTrigger>
                <TabsTrigger value="all-hours">All Hours</TabsTrigger>
              </TabsList>
              <TabsContent value="working-hours">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time Period</TableHead>
                      <TableHead>Call Volume</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callVolumes.slice(7, 22).map((period, index) => (
                      <TableRow key={index + 7}>
                        <TableCell>{period.label}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={period.volume.toString()}
                            onChange={(e) => handleCallVolumeChange(index + 7, e.target.value)}
                            placeholder="Enter call volume"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="all-hours">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time Period</TableHead>
                      <TableHead>Call Volume</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callVolumes.map((period, index) => (
                      <TableRow key={index}>
                        <TableCell>{period.label}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={period.volume.toString()}
                            onChange={(e) => handleCallVolumeChange(index, e.target.value)}
                            placeholder="Enter call volume"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={saving || !zone}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Call Volumes"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
