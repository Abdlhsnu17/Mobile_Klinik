import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[1.5rem] text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg:not([class*=\'size-\'])]:size-4 shrink-0 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_15px_35px_rgba(13,148,136,0.35)] hover:brightness-105',
        destructive:
          'bg-destructive text-destructive-foreground shadow-[0_15px_35px_rgba(255,123,123,0.45)] hover:brightness-95',
        outline:
          'bg-transparent border border-border/60 text-foreground shadow-[inset_2px_2px_6px_rgba(24,30,91,0.08),inset_-2px_-2px_6px_rgba(255,255,255,0.75)] hover:border-border hover:bg-surface-soft',
        secondary:
          'bg-secondary text-secondary-foreground shadow-[0_15px_30px_rgba(50,161,255,0.35)] hover:brightness-95',
        ghost:
          'bg-transparent text-foreground hover:bg-surface shadow-[0_10px_20px_rgba(24,30,91,0.05)]',
        link: 'bg-transparent text-primary underline-offset-4 hover:underline underline decoration-primary/80',
      },
      size: {
        default: 'h-10 px-5',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-11 px-6 text-base',
        icon: 'h-9 w-9 px-0 text-base',
        'icon-sm': 'h-8 w-8 px-0',
        'icon-lg': 'h-10 w-10 px-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
