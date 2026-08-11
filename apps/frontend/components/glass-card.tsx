import { cn } from "@/lib/utils"

export default function GlassCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "w-full rounded-4xl border border-white/30 bg-white/80 px-6 py-8 shadow-[0_30px_80px_rgba(2,5,21,0.35)] backdrop-blur-[30px]",
        className,
      )}
      {...props}
    />
  )
}
