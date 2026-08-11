"use client"

import Image from "next/image"
import { LOGO_SRC } from "@/lib/brand"

interface BrandLogoProps {
  className?: string
}

export default function BrandLogo({ className = "" }: BrandLogoProps) {
  const baseClass = "flex flex-col items-center"
  return (
    <div className={`${baseClass} ${className}`.trim()}>
      <div className="mb-3 h-[96px] w-[96px]">
        <Image
          src={LOGO_SRC}
          alt="Aplikasi logo"
          width={88}
          height={88}
          priority
          className="h-full w-full object-contain"
        />
      </div>
    </div>
  )
}
