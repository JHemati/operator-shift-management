import type { ReactNode } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loading } from "@/components/ui/loading"
import { ErrorState } from "@/components/ui/error-state"
import { EmptyState } from "@/components/ui/empty-state"

interface Column<T> {
  header: string
  accessorKey?: keyof T
  cell?: (item: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyState?: {
    title: string
    description?: string
    icon?: ReactNode
    action?: ReactNode
  }
}

export function DataTable<T>({ columns, data, loading = false, error = null, onRetry, emptyState }: DataTableProps<T>) {
  if (loading) {
    return <Loading />
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />
  }

  if (data.length === 0 && emptyState) {
    return <EmptyState {...emptyState} />
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead key={index} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((column, colIndex) => (
                <TableCell key={colIndex} className={column.className}>
                  {column.cell
                    ? column.cell(item)
                    : column.accessorKey
                      ? (item[column.accessorKey] as ReactNode)
                      : null}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
