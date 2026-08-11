"use client"

import { Check, ChevronsUpDown } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { Doctor } from "@/lib/auth-types"
import { cn } from "@/lib/utils"

type DoctorSelectProps = {
  doctors: Doctor[]
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

export function DoctorSelect({
  doctors,
  value,
  onValueChange,
  disabled = false,
  placeholder = "Pilih dokter",
}: DoctorSelectProps) {
  const [open, setOpen] = React.useState(false)
  const selectedDoctor = doctors.find((doctor) => doctor.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {selectedDoctor ? `${selectedDoctor.name} - ${selectedDoctor.specialization}` : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Cari dokter..." />
          <CommandList>
            <CommandEmpty>Dokter tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              {doctors.map((doctor) => (
                <CommandItem
                  key={doctor.id}
                  value={`${doctor.name} ${doctor.specialization}`}
                  onSelect={() => {
                    onValueChange(doctor.id === value ? "" : doctor.id)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === doctor.id ? "opacity-100" : "opacity-0")} />
                  {doctor.name} - {doctor.specialization}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
