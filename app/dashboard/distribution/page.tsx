"use client"

import { useEffect, useState } from "react"
import { Download, MinusCircle, PlusCircle, Save } from "lucide-react"
import { format } from "date-fns"
import { utils, write } from "xlsx"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { getBrowserClient } from "@/lib/supabase"

interface Zone {
  id: string
  name: string
  provinces: Province[]
}

interface Province {
  id: string
  name: string
  zone_id: string
  work_start_time: number
  work_end_time: number
  operators: number
}

interface DistributionPeriod {
  hour: number
  label: string
  totalCallVolume: number
  provinces: ProvinceDistribution[]
}

interface ProvinceDistribution {
  provinceId: string
  provinceName: string
  operators: number
  breakTime: number
  operatorShifts: OperatorShift[]
}

interface OperatorShift {
  shiftId: number
  startTime: string
  endTime: string
  duration: number
  breakSchedule: BreakSchedule
}

interface BreakSchedule {
  firstBreak: string
  secondBreak: string
  thirdBreak: string
  fourthBreak: string
}

export default function DistributionPage() {
  const { toast } = useToast()
  const [zones, setZones] = useState<Zone[]>([])
  const [selectedZone, setSelectedZone] = useState("")
  const [dayType, setDayType] = useState("regular")
  const [calculated, setCalculated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [loadingZones, setLoadingZones] = useState(true)
  const [distribution, setDistribution] = useState<DistributionPeriod[]>([])
  const [operatorShifts, setOperatorShifts] = useState<Record<string, OperatorShift[]>>({})

  const supabase = getBrowserClient()

  // Fetch zones and their provinces
  useEffect(() => {
    const fetchZonesAndProvinces = async () => {
      setLoadingZones(true)
      try {
        // Fetch zones
        const { data: zonesData, error: zonesError } = await supabase.from("zones").select("id, name")

        if (zonesError) throw zonesError

        // For each zone, fetch its provinces
        const zonesWithProvinces = await Promise.all(
          zonesData.map(async (zone) => {
            const { data: provincesData, error: provincesError } = await supabase
              .from("provinces")
              .select("id, name, zone_id, work_start_time, work_end_time, operators")
              .eq("zone_id", zone.id)

            if (provincesError) throw provincesError

            return {
              ...zone,
              provinces: provincesData || [],
            }
          }),
        )

        setZones(zonesWithProvinces)
      } catch (error) {
        console.error("Error fetching zones and provinces:", error)
        toast({
          title: "Error",
          description: "Failed to fetch zones and provinces",
          variant: "destructive",
        })
      } finally {
        setLoadingZones(false)
      }
    }

    fetchZonesAndProvinces()
  }, [supabase, toast])

  // Format time (HH:MM)
  const formatTime = (hour: number, minute: number): string => {
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
  }

  // Parse time string to hours and minutes
  const parseTime = (timeStr: string): { hour: number; minute: number } => {
    const [hourStr, minuteStr] = timeStr.split(":")
    return {
      hour: Number.parseInt(hourStr, 10),
      minute: Number.parseInt(minuteStr, 10),
    }
  }

  // Generate operator shifts with staggered start times and breaks
  const generateOperatorShifts = (province: Province, operatorCount: number): OperatorShift[] => {
    const shifts: OperatorShift[] = []

    // If no operators, return empty array
    if (operatorCount <= 0) return shifts

    // Fixed duration of 420 minutes (7 hours) for all operators
    const fixedDuration = 420

    // Generate shifts for each operator with staggered start times
    for (let i = 0; i < operatorCount; i++) {
      // Calculate staggered start time (15-minute intervals)
      const startHour = province.work_start_time
      const startMinute = (i * 15) % 60
      const hourOffset = Math.floor((i * 15) / 60)
      const actualStartHour = startHour + hourOffset

      // Ensure we don't exceed work end time
      if (actualStartHour >= province.work_end_time) continue

      const startTime = formatTime(actualStartHour, startMinute)

      // Calculate end time based on fixed duration
      const endMinutes = (actualStartHour * 60 + startMinute + fixedDuration) % (24 * 60)
      const endHour = Math.floor(endMinutes / 60)
      const endMinute = endMinutes % 60
      const endTime = formatTime(endHour, endMinute)

      // Calculate break times - one break after each hour of work
      // Each break is 10 minutes long
      const breakTimes = []

      // Calculate 4 breaks, each after approximately 1 hour of work
      for (let j = 0; j < 4; j++) {
        // Break starts after (j+1)*60 minutes of work (1 hour)
        const breakStartMinutes = (actualStartHour * 60 + startMinute + (j + 1) * 60) % (24 * 60)
        const breakStartHour = Math.floor(breakStartMinutes / 60)
        const breakStartMinute = breakStartMinutes % 60

        // Break ends 10 minutes later
        const breakEndMinutes = (breakStartMinutes + 10) % (24 * 60)
        const breakEndHour = Math.floor(breakEndMinutes / 60)
        const breakEndMinute = breakEndMinutes % 60

        breakTimes.push({
          start: formatTime(breakStartHour, breakStartMinute),
          end: formatTime(breakEndHour, breakEndMinute),
        })
      }

      shifts.push({
        shiftId: i + 1,
        startTime,
        endTime,
        duration: fixedDuration,
        breakSchedule: {
          firstBreak: `${breakTimes[0].start}-${breakTimes[0].end}`,
          secondBreak: `${breakTimes[1].start}-${breakTimes[1].end}`,
          thirdBreak: `${breakTimes[2].start}-${breakTimes[2].end}`,
          fourthBreak: `${breakTimes[3].start}-${breakTimes[3].end}`,
        },
      })
    }

    return shifts
  }

  // Add minutes to a time string
  const addMinutesToTime = (timeStr: string, minutesToAdd: number): string => {
    const { hour, minute } = parseTime(timeStr)

    let newMinute = minute + minutesToAdd
    const newHour = hour + Math.floor(newMinute / 60)
    newMinute = newMinute % 60

    return formatTime(newHour, newMinute)
  }

  const handleCalculate = async () => {
    if (!selectedZone) {
      toast({
        title: "Error",
        description: "Please select a zone",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const zone = zones.find((z) => z.id === selectedZone)
      if (!zone) throw new Error("Zone not found")

      // Fetch call volumes for the zone
      const { data: callVolumeData, error: callVolumeError } = await supabase
        .from("call_volumes")
        .select("hour, volume")
        .eq("zone_id", selectedZone)
        .eq("day_type", dayType)
        .order("hour", { ascending: true })

      if (callVolumeError) throw callVolumeError

      // Fetch system parameters
      const { data: parameters, error: parametersError } = await supabase
        .from("system_parameters")
        .select("*")
        .limit(1)
        .single()

      if (parametersError && parametersError.code !== "PGRST116") throw parametersError

      const averageResponseRate = parameters?.average_response_rate || 80
      const standardBreakTime = parameters?.standard_break_time || 10

      // Create distribution periods for working hours (7-22)
      const workingHours = Array.from({ length: 15 }, (_, i) => i + 7)

      // Generate operator shifts for each province
      const allOperatorShifts: Record<string, OperatorShift[]> = {}

      zone.provinces.forEach((province) => {
        // Calculate operators based on province's total operators
        const provinceOperators = province.operators

        // Generate shifts with staggered start times
        allOperatorShifts[province.id] = generateOperatorShifts(province, provinceOperators)
      })

      setOperatorShifts(allOperatorShifts)

      // Initialize distribution data
      const newDistribution: DistributionPeriod[] = workingHours.map((hour) => {
        // Find call volume for this hour
        const callVolumeItem = callVolumeData?.find((item) => item.hour === hour)
        const callVolume = callVolumeItem?.volume || 0

        // Calculate operators needed for each province
        const provinceDistributions = zone.provinces.map((province) => {
          // Check if province is working at this hour
          const isWorking = hour >= province.work_start_time && hour < province.work_end_time

          // Calculate operators based on call volume and province's share
          const totalProvinceOperators = zone.provinces.reduce((sum, p) => sum + p.operators, 0)
          const provinceShare = totalProvinceOperators > 0 ? province.operators / totalProvinceOperators : 0

          // Calculate operators needed for this province at this hour
          const totalOperatorsNeeded = Math.ceil(callVolume / averageResponseRate)
          const provinceOperators = isWorking
            ? Math.min(Math.ceil(totalOperatorsNeeded * provinceShare), province.operators)
            : 0

          // Calculate break time
          const operatorsOnBreak = Math.floor(provinceOperators / 6)
          const breakTime = operatorsOnBreak * standardBreakTime

          // Get operator shifts for this province
          const shifts = allOperatorShifts[province.id] || []

          // Filter to only include operators working at this hour
          const activeShifts = shifts
            .filter((shift) => {
              const startTime = parseTime(shift.startTime)
              const endTime = parseTime(shift.endTime)

              // Check if this hour is within the operator's shift
              return (
                (startTime.hour < hour || (startTime.hour === hour && startTime.minute === 0)) && hour < endTime.hour
              )
            })
            .slice(0, provinceOperators) // Limit to the calculated number of operators

          return {
            provinceId: province.id,
            provinceName: province.name,
            operators: activeShifts.length,
            breakTime,
            operatorShifts: activeShifts,
          }
        })

        return {
          hour,
          label: `${hour}:00 - ${hour + 1}:00`,
          totalCallVolume: callVolume,
          provinces: provinceDistributions,
        }
      })

      setDistribution(newDistribution)
      setCalculated(true)

      toast({
        title: "Distribution calculated",
        description: `Personnel distribution for ${zone.name} has been calculated`,
      })
    } catch (error) {
      console.error("Error calculating distribution:", error)
      toast({
        title: "Error",
        description: "Failed to calculate distribution",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle operator adjustment
  const handleOperatorChange = (hourIndex: number, provinceIndex: number, change: number) => {
    const newDistribution = [...distribution]
    const currentOperators = newDistribution[hourIndex].provinces[provinceIndex].operators

    // Ensure we don't go below 0 or above the province's total operators
    const zone = zones.find((z) => z.id === selectedZone)
    const maxOperators = zone?.provinces[provinceIndex].operators || 0

    const newOperators = Math.max(0, Math.min(currentOperators + change, maxOperators))

    // Update operators
    newDistribution[hourIndex].provinces[provinceIndex].operators = newOperators

    // Recalculate break time
    const standardBreakTime = 10 // Default value if not available
    const operatorsOnBreak = Math.floor(newOperators / 6)
    newDistribution[hourIndex].provinces[provinceIndex].breakTime = operatorsOnBreak * standardBreakTime

    // Update operator shifts
    const provinceId = newDistribution[hourIndex].provinces[provinceIndex].provinceId
    const allShifts = operatorShifts[provinceId] || []

    // Filter shifts for this hour
    const hour = newDistribution[hourIndex].hour
    const activeShifts = allShifts
      .filter((shift) => {
        const startTime = parseTime(shift.startTime)
        const endTime = parseTime(shift.endTime)

        // Check if this hour is within the operator's shift
        return (startTime.hour < hour || (startTime.hour === hour && startTime.minute === 0)) && hour < endTime.hour
      })
      .slice(0, newOperators) // Limit to the new number of operators

    newDistribution[hourIndex].provinces[provinceIndex].operatorShifts = activeShifts

    setDistribution(newDistribution)
  }

  // Export to Excel using browser download
  const handleExport = () => {
    if (!calculated || distribution.length === 0) {
      toast({
        title: "Error",
        description: "Please calculate distribution first",
        variant: "destructive",
      })
      return
    }

    setExportLoading(true)
    try {
      const zone = zones.find((z) => z.id === selectedZone)
      if (!zone) throw new Error("Zone not found")

      // Create workbook
      const wb = utils.book_new()

      // Create a consolidated worksheet for all provinces
      const consolidatedData = []

      // Add header row with explanatory notes
      consolidatedData.push({
        "Center Name": `${zone.name} ${dayType === "regular" ? "(Regular Days)" : "(Holiday Days)"} - ${format(new Date(), "yyyyMMdd")}`,
        Status: "",
        "Work Start": "",
        "Work End": "",
        "Duration (min)": "",
        Workers: "",
        "First Break": "",
        "Second Break": "",
        "Third Break": "",
        "Fourth Break": "",
      })

      // Add empty row
      consolidatedData.push({})

      // For each province, add its operators
      zone.provinces.forEach((province) => {
        // Get all operator shifts for this province
        const shifts = operatorShifts[province.id] || []

        if (shifts.length === 0) return

        // Add province header
        consolidatedData.push({
          "Center Name": province.name,
          Status: "Active",
          "Work Start": formatTime(province.work_start_time, 0),
          "Work End": formatTime(province.work_end_time, 0),
          "Duration (min)": 420,
          Workers: shifts.length,
          "First Break": "",
          "Second Break": "",
          "Third Break": "",
          "Fourth Break": "",
        })

        // Add each operator's shift details
        shifts.forEach((shift) => {
          consolidatedData.push({
            "Center Name": "",
            Status: "",
            "Work Start": shift.startTime,
            "Work End": shift.endTime,
            "Duration (min)": shift.duration,
            Workers: "",
            "First Break": shift.breakSchedule.firstBreak,
            "Second Break": shift.breakSchedule.secondBreak,
            "Third Break": shift.breakSchedule.thirdBreak,
            "Fourth Break": shift.breakSchedule.fourthBreak,
          })
        })

        // Add empty row after each province
        consolidatedData.push({})
      })

      // Add notes section
      consolidatedData.push({
        "Center Name": "Notes:",
        Status: "",
        "Work Start": "",
        "Work End": "",
        "Duration (min)": "",
        Workers: "",
        "First Break": "",
        "Second Break": "",
        "Third Break": "",
        "Fourth Break": "",
      })

      consolidatedData.push({
        "Center Name": "1. Adherence to the specified break schedule is mandatory to ensure optimal service quality.",
        Status: "",
        "Work Start": "",
        "Work End": "",
        "Duration (min)": "",
        Workers: "",
        "First Break": "",
        "Second Break": "",
        "Third Break": "",
        "Fourth Break": "",
      })

      consolidatedData.push({
        "Center Name": "2. Each operator is entitled to four 10-minute breaks during their 7-hour shift.",
        Status: "",
        "Work Start": "",
        "Work End": "",
        "Duration (min)": "",
        Workers: "",
        "First Break": "",
        "Second Break": "",
        "Third Break": "",
        "Fourth Break": "",
      })

      // Create worksheet
      const consolidatedWs = utils.json_to_sheet(consolidatedData)

      // Set column widths
      const wscols = [
        { wch: 20 }, // Center Name
        { wch: 10 }, // Status
        { wch: 10 }, // Work Start
        { wch: 10 }, // Work End
        { wch: 15 }, // Duration
        { wch: 10 }, // Workers
        { wch: 15 }, // First Break
        { wch: 15 }, // Second Break
        { wch: 15 }, // Third Break
        { wch: 15 }, // Fourth Break
      ]

      consolidatedWs["!cols"] = wscols

      // Add worksheet to workbook
      utils.book_append_sheet(wb, consolidatedWs, "Operator Schedule")

      // Also keep the original summary worksheet
      const summaryData = distribution.map((period) => {
        const row: Record<string, any> = {
          "Time Period": period.label,
          "Call Volume": period.totalCallVolume,
        }

        // Add columns for each province
        period.provinces.forEach((province) => {
          row[province.provinceName] = province.operators
        })

        return row
      })

      const summaryWs = utils.json_to_sheet(summaryData)
      utils.book_append_sheet(wb, summaryWs, "Distribution Summary")

      // Generate Excel binary data
      const excelBuffer = write(wb, { bookType: "xlsx", type: "array" })

      // Convert to Blob
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })

      // Create download link
      const fileName = `${zone.name}_${dayType}_distribution_${format(new Date(), "yyyyMMdd")}.xlsx`

      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob)

      // Create a temporary link element
      const link = document.createElement("a")
      link.href = url
      link.download = fileName

      // Append to the document, click it, and remove it
      document.body.appendChild(link)
      link.click()

      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        document.body.removeChild(link)
      }, 0)

      toast({
        title: "Export successful",
        description: `Personnel distribution has been exported to Excel`,
      })
    } catch (error) {
      console.error("Error exporting to Excel:", error)
      toast({
        title: "Error",
        description:
          "Failed to export distribution to Excel: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      })
    } finally {
      setExportLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedZone || !calculated) {
      toast({
        title: "Error",
        description: "Please select a zone and calculate distribution first",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // First, check if the personnel_distribution table exists and has the right columns
      try {
        // Try to get the table structure
        const { error } = await supabase.from("personnel_distribution").select("id").limit(1)

        if (error && error.message.includes("relation") && error.message.includes("does not exist")) {
          // Table doesn't exist, create it
          await createPersonnelDistributionTable()
        }
      } catch (error) {
        console.error("Error checking personnel_distribution table:", error)
        // Attempt to create the table
        await createPersonnelDistributionTable()
      }

      // Delete existing records for this zone and day type
      await supabase.from("personnel_distribution").delete().eq("zone_id", selectedZone).eq("day_type", dayType)

      // Prepare records for insertion
      const currentDate = new Date().toISOString().split("T")[0] // Format: YYYY-MM-DD
      const records = distribution
        .flatMap((period) =>
          period.provinces.map((province) => ({
            zone_id: selectedZone,
            province_id: province.provinceId,
            day_type: dayType,
            date: currentDate, // Add the current date
            hour: period.hour,
            operators: province.operators,
            break_time: province.breakTime,
            // Store operator shifts as a JSON string in the breaks_data column
            breaks_data: JSON.stringify({
              shifts: province.operatorShifts.map((shift) => ({
                shiftId: shift.shiftId,
                startTime: shift.startTime,
                endTime: shift.endTime,
                breaks: [
                  shift.breakSchedule.firstBreak,
                  shift.breakSchedule.secondBreak,
                  shift.breakSchedule.thirdBreak,
                  shift.breakSchedule.fourthBreak,
                ],
              })),
            }),
          })),
        )
        .filter((record) => record.operators > 0) // Only save non-zero operators

      if (records.length > 0) {
        const { error } = await supabase.from("personnel_distribution").insert(records)

        if (error) throw error
      }

      toast({
        title: "Distribution saved",
        description: `Personnel distribution has been saved successfully`,
      })
    } catch (error) {
      console.error("Error saving distribution:", error)
      toast({
        title: "Error",
        description: "Failed to save distribution. Please check the database schema.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Create the personnel_distribution table if it doesn't exist
  const createPersonnelDistributionTable = async () => {
    try {
      // Use SQL to create the table with the correct schema
      const { error } = await supabase.rpc("create_personnel_distribution_table")

      if (error) {
        console.error("Error creating personnel_distribution table:", error)
        throw error
      }
    } catch (error) {
      console.error("Failed to create personnel_distribution table:", error)
      throw new Error("Failed to create required database table. Please contact your administrator.")
    }
  }

  // Check if an operator is on break during a specific hour
  const isOperatorOnBreak = (shift: OperatorShift, hour: number): boolean => {
    const checkBreakTime = (breakTime: string): boolean => {
      const [start] = breakTime.split("-")
      const { hour: breakHour } = parseTime(start)
      return breakHour === hour
    }

    return (
      checkBreakTime(shift.breakSchedule.firstBreak) ||
      checkBreakTime(shift.breakSchedule.secondBreak) ||
      checkBreakTime(shift.breakSchedule.thirdBreak) ||
      checkBreakTime(shift.breakSchedule.fourthBreak)
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Personnel Distribution</h2>
        <p className="text-muted-foreground">Calculate and manage personnel distribution and break times</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Calculate Distribution</CardTitle>
          <CardDescription>Generate optimal personnel distribution based on call volumes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="zone">Zone</Label>
              {loadingZones ? (
                <Select disabled>
                  <SelectTrigger id="zone">
                    <SelectValue placeholder="Loading zones..." />
                  </SelectTrigger>
                </Select>
              ) : (
                <Select value={selectedZone} onValueChange={setSelectedZone}>
                  <SelectTrigger id="zone">
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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

          <div className="flex justify-end">
            <Button onClick={handleCalculate} disabled={loading || !selectedZone}>
              {loading ? "Calculating..." : "Calculate Distribution"}
            </Button>
          </div>

          {calculated && (
            <Tabs defaultValue="distribution" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="distribution">Personnel Distribution</TabsTrigger>
                <TabsTrigger value="breaks">Break Times</TabsTrigger>
                <TabsTrigger value="schedule">Work Schedule</TabsTrigger>
              </TabsList>

              {/* Personnel Distribution Tab */}
              <TabsContent value="distribution">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Time Period</TableHead>
                        <TableHead className="w-[100px]">Call Volume</TableHead>
                        {zones
                          .find((z) => z.id === selectedZone)
                          ?.provinces.map((province) => (
                            <TableHead key={province.id}>{province.name}</TableHead>
                          ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distribution.map((period, hourIndex) => (
                        <TableRow key={period.hour}>
                          <TableCell>{period.label}</TableCell>
                          <TableCell>{period.totalCallVolume}</TableCell>
                          {period.provinces.map((province, provinceIndex) => (
                            <TableCell key={province.provinceId} className="text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleOperatorChange(hourIndex, provinceIndex, -1)}
                                  disabled={province.operators <= 0}
                                >
                                  <MinusCircle className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center">{province.operators}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleOperatorChange(hourIndex, provinceIndex, 1)}
                                  disabled={
                                    province.operators >=
                                    (zones.find((z) => z.id === selectedZone)?.provinces[provinceIndex].operators || 0)
                                  }
                                >
                                  <PlusCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Break Times Tab */}
              <TabsContent value="breaks">
                <div className="space-y-6">
                  {zones
                    .find((z) => z.id === selectedZone)
                    ?.provinces.map((province) => {
                      const shifts = operatorShifts[province.id] || []

                      if (shifts.length === 0) return null

                      return (
                        <Card key={province.id}>
                          <CardHeader>
                            <CardTitle>{province.name} Break Schedule</CardTitle>
                            <CardDescription>
                              Each operator gets four 10-minute breaks during their shift
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Operator ID</TableHead>
                                  <TableHead>Work Start</TableHead>
                                  <TableHead>Work End</TableHead>
                                  <TableHead>First Break</TableHead>
                                  <TableHead>Second Break</TableHead>
                                  <TableHead>Third Break</TableHead>
                                  <TableHead>Fourth Break</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {shifts.map((shift) => (
                                  <TableRow key={shift.shiftId}>
                                    <TableCell>Operator {shift.shiftId}</TableCell>
                                    <TableCell>{shift.startTime}</TableCell>
                                    <TableCell>{shift.endTime}</TableCell>
                                    <TableCell>{shift.breakSchedule.firstBreak}</TableCell>
                                    <TableCell>{shift.breakSchedule.secondBreak}</TableCell>
                                    <TableCell>{shift.breakSchedule.thirdBreak}</TableCell>
                                    <TableCell>{shift.breakSchedule.fourthBreak}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      )
                    })}
                </div>
              </TabsContent>

              {/* Work Schedule Tab */}
              <TabsContent value="schedule">
                <div className="space-y-6">
                  {zones
                    .find((z) => z.id === selectedZone)
                    ?.provinces.map((province) => {
                      // Get all active hours for this province
                      const activeHours = distribution
                        .filter((period) => {
                          const provinceData = period.provinces.find((p) => p.provinceId === province.id)
                          return provinceData && provinceData.operators > 0
                        })
                        .map((period) => period.hour)

                      if (activeHours.length === 0) return null

                      // Get min and max hours
                      const minHour = Math.min(...activeHours)
                      const maxHour = Math.max(...activeHours) + 1

                      return (
                        <Card key={province.id}>
                          <CardHeader>
                            <CardTitle>{province.name} Work Schedule</CardTitle>
                            <CardDescription>
                              Active hours: {minHour}:00 - {maxHour}:00
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Time Period</TableHead>
                                  <TableHead>Total Operators</TableHead>
                                  <TableHead>Active Operators</TableHead>
                                  <TableHead>Operators on Break</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {distribution
                                  .filter((period) => period.hour >= minHour && period.hour < maxHour)
                                  .map((period) => {
                                    const provinceData = period.provinces.find((p) => p.provinceId === province.id)
                                    if (!provinceData) return null

                                    // Count operators on break during this hour
                                    const operatorsOnBreak = provinceData.operatorShifts.filter((shift) =>
                                      isOperatorOnBreak(shift, period.hour),
                                    ).length

                                    return (
                                      <TableRow key={period.hour}>
                                        <TableCell>{period.label}</TableCell>
                                        <TableCell>{provinceData.operators}</TableCell>
                                        <TableCell>{provinceData.operators - operatorsOnBreak}</TableCell>
                                        <TableCell>{operatorsOnBreak}</TableCell>
                                      </TableRow>
                                    )
                                  })}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      )
                    })}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
        {calculated && (
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleExport} disabled={exportLoading}>
              <Download className="mr-2 h-4 w-4" />
              {exportLoading ? "Exporting..." : "Export to Excel"}
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Saving..." : "Save Distribution"}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
