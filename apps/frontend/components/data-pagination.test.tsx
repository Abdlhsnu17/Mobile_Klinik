import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { DataPagination, useDataPagination } from "./data-pagination"

afterEach(cleanup)

function PaginationHarness() {
  const pagination = useDataPagination(
    Array.from({ length: 45 }, (_, index) => `Data ${index + 1}`)
  )

  return (
    <>
      <ul>
        {pagination.paginatedItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <DataPagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setPage}
      />
    </>
  )
}

describe("DataPagination", () => {
  it("membatasi daftar menjadi 20 data dan berpindah halaman", () => {
    render(<PaginationHarness />)

    expect(screen.getAllByRole("listitem")).toHaveLength(20)
    expect(screen.getByText("Menampilkan 1–20 dari 45 data")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Buka halaman 3" }))

    expect(screen.getAllByRole("listitem")).toHaveLength(5)
    expect(screen.getByText("Data 41")).toBeInTheDocument()
    expect(screen.getByText("Menampilkan 41–45 dari 45 data")).toBeInTheDocument()
  })
})
