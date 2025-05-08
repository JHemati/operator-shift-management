"use client"

import { useState } from "react"
import { Plus, Trash } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { DataTable } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { useSupabaseQuery } from "@/hooks/use-supabase-query"
import { useSupabaseMutation } from "@/hooks/use-supabase-mutation"
import { getBrowserClient } from "@/lib/supabase"

interface Zone {
  id: string
  name: string
}

interface Province {
  id: string
  name: string
  zone_id: string
  zone_name?: string
  work_start_time: number
  work_end_time: number
  operators: number
}

export default function ProvincesPage() {
  const [newProvince, setNewProvince] = useState<Omit<Province, "id" | "zone_name">>({
    name: "",
    zone_id: "",
    work_start_time: 7,
    work_end_time: 22,
    operators: 0,
  })
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const supabase = getBrowserClient()

  // Query for zones
  const { data: zones, loading: loadingZones } = useSupabaseQuery<Zone[]>(async () => {
    const { data, error } = await supabase.from("zones").select("id, name")
    if (error) throw error
    return data || []
  }, [])

  // Query for provinces
  const {
    data: provinces,
    loading,
    error,
    refetch,
  } = useSupabaseQuery<Province[]>(async () => {
    const { data, error } = await supabase.from("provinces").select(`
      id,
      name,
      zone_id,
      work_start_time,
      work_end_time,
      operators,
      zones (name)
    `)

    if (error) throw error

    // Transform the data to match our interface
    return data.map((province) => ({
      id: province.id,
      name: province.name,
      zone_id: province.zone_id,
      zone_name: province.zones?.name,
      work_start_time: province.work_start_time,
      work_end_time: province.work_end_time,
      operators: province.operators,
    }))
  }, [])

  // Mutation for adding a province
  const { mutate: addProvince, loading: addingProvince } = useSupabaseMutation(
    async (variables: Omit<Province, "id" | "zone_name">) => {
      if (!variables.name || !variables.zone_id || !variables.work_start_time || !variables.work_end_time) {
        throw new Error("All fields are required")
      }

      const { data, error } = await supabase.from("provinces").insert([variables]).select()
      if (error) throw error
      return data[0]
    },
    {
      onSuccess: () => {
        setNewProvince({
          name: "",
          zone_id: "",
          work_start_time: 7,
          work_end_time: 22,
          operators: 0,
        })
        setOpen(false)
        refetch()
      },
      successMessage: "Province added successfully",
    },
  )

  // Mutation for deleting a province
  const { mutate: deleteProvince } = useSupabaseMutation(
    async (id: string) => {
      const { error } = await supabase.from("provinces").delete().eq("id", id)
      if (error) throw error
      return id
    },
    {
      onSuccess: () => {
        refetch()
      },
      successMessage: "Province deleted successfully",
    },
  )

  const handleAddProvince = () => {
    addProvince(newProvince)
  }

  const columns = [
    {
      header: "Province Name",
      accessorKey: "name",
      className: "font-medium",
    },
    {
      header: "Zone",
      accessorKey: "zone_name",
    },
    {
      header: "Working Hours",
      cell: (province: Province) => {
        return province.work_start_time === 0 && province.work_end_time === 24
          ? "24 hours"
          : `${province.work_start_time}-${province.work_end_time}`
      },
    },
    {
      header: "Operators",
      accessorKey: "operators",
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (province: Province) => (
        <Button variant="ghost" size="icon" onClick={() => deleteProvince(province.id)}>
          <Trash className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Province Management"
        description="Create and manage provinces within zones"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Province
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Province</DialogTitle>
                <DialogDescription>Create a new province and assign it to a zone</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Province Name</Label>
                  <Input
                    id="name"
                    value={newProvince.name}
                    onChange={(e) => setNewProvince({ ...newProvince, name: e.target.value })}
                    placeholder="Enter province name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="zone">Zone</Label>
                  <Select
                    value={newProvince.zone_id}
                    onValueChange={(value) => setNewProvince({ ...newProvince, zone_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones?.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="workStartTime">Work Start Time</Label>
                    <Input
                      id="workStartTime"
                      type="number"
                      value={newProvince.work_start_time}
                      onChange={(e) => setNewProvince({ ...newProvince, work_start_time: Number(e.target.value) })}
                      placeholder="e.g. 7"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="workEndTime">Work End Time</Label>
                    <Input
                      id="workEndTime"
                      type="number"
                      value={newProvince.work_end_time}
                      onChange={(e) => setNewProvince({ ...newProvince, work_end_time: Number(e.target.value) })}
                      placeholder="e.g. 22"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="operators">Number of Operators</Label>
                  <Input
                    id="operators"
                    type="number"
                    value={newProvince.operators}
                    onChange={(e) => setNewProvince({ ...newProvince, operators: Number(e.target.value) })}
                    placeholder="Enter number of operators"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddProvince} disabled={addingProvince}>
                  {addingProvince ? "Adding..." : "Add Province"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Provinces</CardTitle>
          <CardDescription>Manage your provinces and their working hours</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={provinces || []}
            loading={loading}
            error={error}
            onRetry={refetch}
            emptyState={{
              title: "No provinces found",
              description: "Create your first province to get started",
              icon: <Plus className="h-10 w-10" />,
              action: (
                <Button onClick={() => setOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Province
                </Button>
              ),
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
