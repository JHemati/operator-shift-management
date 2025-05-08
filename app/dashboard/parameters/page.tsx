"use client"

import { useEffect, useState } from "react"
import { Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loading } from "@/components/ui/loading"
import { ErrorState } from "@/components/ui/error-state"
import { useSupabaseQuery } from "@/hooks/use-supabase-query"
import { useSupabaseMutation } from "@/hooks/use-supabase-mutation"
import { getBrowserClient } from "@/lib/supabase"

interface SystemParameters {
  id: string
  attendance_duration: number
  standard_break_time: number
  average_response_rate: number
}

export default function ParametersPage() {
  const [parameters, setParameters] = useState<SystemParameters>({
    id: "",
    attendance_duration: 420,
    standard_break_time: 10,
    average_response_rate: 80,
  })
  const { toast } = useToast()
  const supabase = getBrowserClient()

  // Query for system parameters
  const { data, loading, error, refetch } = useSupabaseQuery<SystemParameters | null>(async () => {
    const { data, error } = await supabase.from("system_parameters").select("*").limit(1).single()

    if (error && error.code !== "PGRST116") {
      throw error
    }

    return data
  }, [])

  // Update local state when data is fetched
  useEffect(() => {
    if (data) {
      setParameters(data)
    }
  }, [data])

  // Mutation for saving parameters
  const { mutate: saveParameters, loading: saving } = useSupabaseMutation(
    async (params: SystemParameters) => {
      if (params.id) {
        // Update existing parameters
        const { data, error } = await supabase
          .from("system_parameters")
          .update({
            attendance_duration: params.attendance_duration,
            standard_break_time: params.standard_break_time,
            average_response_rate: params.average_response_rate,
          })
          .eq("id", params.id)
          .select()

        if (error) throw error
        return data[0]
      } else {
        // Insert new parameters
        const { data, error } = await supabase
          .from("system_parameters")
          .insert([
            {
              attendance_duration: params.attendance_duration,
              standard_break_time: params.standard_break_time,
              average_response_rate: params.average_response_rate,
            },
          ])
          .select()

        if (error) throw error
        return data[0]
      }
    },
    {
      onSuccess: (data) => {
        if (data) {
          setParameters(data)
        }
        refetch()
      },
      successMessage: "System parameters saved successfully",
    },
  )

  const handleSave = () => {
    saveParameters(parameters)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Parameters</h2>
          <p className="text-muted-foreground">Configure global system parameters for calculations</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Loading text="Loading parameters..." />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Parameters</h2>
          <p className="text-muted-foreground">Configure global system parameters for calculations</p>
        </div>
        <ErrorState error={error} onRetry={refetch} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">System Parameters</h2>
        <p className="text-muted-foreground">Configure global system parameters for calculations</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>System Parameters</CardTitle>
          <CardDescription>
            These parameters are used for calculating operator distribution and break times
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="attendanceDuration">Operator Attendance Duration (minutes)</Label>
            <Input
              id="attendanceDuration"
              type="number"
              value={parameters.attendance_duration}
              onChange={(e) =>
                setParameters({ ...parameters, attendance_duration: Number.parseInt(e.target.value) || 0 })
              }
            />
            <p className="text-sm text-muted-foreground">
              The total duration an operator is present during their shift
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="standardBreakTime">Standard Break Time (minutes per hour)</Label>
            <Input
              id="standardBreakTime"
              type="number"
              value={parameters.standard_break_time}
              onChange={(e) =>
                setParameters({ ...parameters, standard_break_time: Number.parseInt(e.target.value) || 0 })
              }
            />
            <p className="text-sm text-muted-foreground">The standard break time allocated after each hour of work</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="averageResponseRate">Average Response Rate (calls per hour)</Label>
            <Input
              id="averageResponseRate"
              type="number"
              value={parameters.average_response_rate}
              onChange={(e) =>
                setParameters({ ...parameters, average_response_rate: Number.parseInt(e.target.value) || 0 })
              }
            />
            <p className="text-sm text-muted-foreground">The average number of calls an operator can handle per hour</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Parameters"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
