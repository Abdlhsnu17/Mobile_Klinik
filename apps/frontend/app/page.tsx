"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { getCurrentUser } from "@/lib/auth-utils"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const user = getCurrentUser()
    if (user) {
      router.replace("/dashboard")
    } else {
      router.replace("/login")
    }
  }, [router])

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url(/background.png)" }}
    >
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  )
}
