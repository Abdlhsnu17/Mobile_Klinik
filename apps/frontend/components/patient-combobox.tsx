"use client"

import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import type { Patient } from "@/lib/auth-types";
import { cn } from "@/lib/utils";

interface PatientComboboxProps {
  patients: Patient[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
}

export function PatientCombobox({
  patients,
  value,
  onValueChange,
  placeholder = "Cari dan pilih pasien...",
  emptyMessage = "Pasien tidak ditemukan.",
  disabled = false,
}: PatientComboboxProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {value
            ? patients.find((patient) => patient.id === value)?.name
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {patients.map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={`${patient.name} ${patient.noRM} ${patient.nik} ${patient.phone}`}
                  onSelect={() => {
                    onValueChange(patient.id === value ? "" : patient.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === patient.id ? "opacity-100" : "opacity-0")}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{patient.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {patient.noRM} • NIK {patient.nik} • {patient.phone}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
