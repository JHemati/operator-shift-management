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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { DataTable } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { useSupabaseQuery } from "@/hooks/use-supabase-query"
import { useSupabaseMutation } from "@/hooks/use-supabase-mutation"
import { getBrowserClient } from "@/lib/supabase"

interface Zone {
  id: string
  name: string
  description: string
  provinceCount?: number
  operatorCount?: number
}

export default function ZonesPage() {
  const [newZone, setNewZone] = useState({ name: "", description: "" })
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const supabase = getBrowserClient()

  // Query for zones with counts
  const {
    data: zones,
    loading,
    error,
    refetch,
  } = useSupabaseQuery<Zone[]>(async () => {
    // Fetch zones
    const { data: zonesData, error: zonesError } = await supabase.from("zones").select("*")

    if (zonesError) throw zonesError

    // For each zone, fetch province count and operator count
    const zonesWithCounts = await Promise.all(
      zonesData.map(async (zone) => {
        // Get province count
        const { count: provinceCount, error: provinceError } = await supabase
          .from("provinces")
          .select("*", { count: "exact", head: true })
          .eq("zone_id", zone.id)

        if (provinceError) throw provinceError

        // Get operator count
        const { data: operators, error: operatorError } = await supabase
          .from("provinces")
          .select("operators")
          .eq("zone_id", zone.id)

        if (operatorError) throw operatorError

        const operatorCount = operators.reduce((sum, province) => sum + province.operators, 0)

        return {
          ...zone,
          provinceCount,
          operatorCount,
        }
      }),
    )

    return zonesWithCounts
  }, [])

  // Mutation for adding a zone
  const { mutate: addZone, loading: addingZone } = useSupabaseMutation(
    async (variables: { name: string; description: string }) => {
      if (!variables.name) {
        throw new Error("Zone name is required")
      }

      const { data, error } = await supabase
        .from("zones")
        .insert([{ name: variables.name, description: variables.description }])
        .select()

      if (error) throw error
      return data[0]
    },
    {
      onSuccess: () => {
        setNewZone({ name: "", description: "" })
        setOpen(false)
        refetch()
      },
      successMessage: "Zone added successfully",
    },
  )

  // Mutation for deleting a zone
  const { mutate: deleteZone } = useSupabaseMutation(
    async (id: string) => {
      const { error } = await supabase.from("zones").delete().eq("id", id)
      if (error) throw error
      return id
    },
    {
      onSuccess: () => {
        refetch()
      },
      successMessage: "Zone deleted successfully",
    },
  )

  const handleAddZone = () => {
    addZone(newZone)
  }

  const columns = [
    {
      header: "Zone Name",
      accessorKey: "name",
      className: "font-medium",
    },
    {
      header: "Description",
      accessorKey: "description",
    },
    {
      header: "Provinces",
      accessorKey: "provinceCount",
    },
    {
      header: "Operators",
      accessorKey: "operatorCount",
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (zone: Zone) => (
        <Button variant="ghost" size="icon" onClick={() => deleteZone(zone.id)}>
          <Trash className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Zone Management"
        description="Create and manage zones for operator distribution"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Zone
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Zone</DialogTitle>
                <DialogDescription>Create a new zone to group provinces together</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Zone Name</Label>
                  <Input
                    id="name"
                    value={newZone.name}
                    onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                    placeholder="Enter zone name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newZone.description}
                    onChange={(e) => setNewZone({ ...newZone, description: e.target.value })}
                    placeholder="Enter zone description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddZone} disabled={addingZone}>
                  {addingZone ? "Adding..." : "Add Zone"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Zones</CardTitle>
          <CardDescription>Manage your zones and their associated provinces</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={zones || []}
            loading={loading}
            error={error}
            onRetry={refetch}
            emptyState={{
              title: "No zones found",
              description: "Create your first zone to get started",
              icon: <Plus className="h-10 w-10" />,
              action: (
                <Button onClick={() => setOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Zone
                </Button>
              ),
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
