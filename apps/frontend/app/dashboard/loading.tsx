import { Loader2 } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-foreground">
        Menyiapkan dashboard...
      </p>
    </div>
  )
}
