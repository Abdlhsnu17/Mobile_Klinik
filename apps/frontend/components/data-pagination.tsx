"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

export const DEFAULT_PAGE_SIZE = 20

export function useDataPagination<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [requestedPage, setRequestedPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Math.min(requestedPage, totalPages)
  const startIndex = (page - 1) * pageSize

  return {
    paginatedItems: items.slice(startIndex, startIndex + pageSize),
    page,
    pageSize,
    totalItems: items.length,
    totalPages,
    setPage: setRequestedPage,
    resetPage: () => setRequestedPage(1),
  }
}

type DataPaginationProps = {
  page: number
  pageSize?: number
  totalItems: number
  totalPages: number
  onPageChange: (page: number) => void
  itemLabel?: string
}

export function DataPagination({
  page,
  pageSize = DEFAULT_PAGE_SIZE,
  totalItems,
  totalPages,
  onPageChange,
  itemLabel = "data",
}: DataPaginationProps) {
  if (totalItems === 0) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  return (
    <div className="flex flex-col gap-3 border-t border-border/40 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Menampilkan {start}–{end} dari {totalItems} {itemLabel}
      </p>
      <div className="max-w-full overflow-x-auto pb-1">
        <div className="flex min-w-max items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, index) => {
            const targetPage = index + 1
            return (
              <Button
                key={targetPage}
                type="button"
                variant={page === targetPage ? "default" : "outline"}
                size="icon"
                onClick={() => onPageChange(targetPage)}
                aria-label={`Buka halaman ${targetPage}`}
                aria-current={page === targetPage ? "page" : undefined}
              >
                {targetPage}
              </Button>
            )
          })}
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Halaman berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
