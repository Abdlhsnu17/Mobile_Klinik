"use client"

import React from "react"

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[url('/auth-hero.svg')] bg-[length:130%_auto] bg-[position:70%_40%] opacity-80" />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/90 via-white/80 to-white/90" />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  )
}
