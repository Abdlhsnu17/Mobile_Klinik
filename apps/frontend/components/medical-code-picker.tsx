"use client"

import { Plus, X } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import type { MedicalCode, MedicalCodeSystem } from "@/lib/auth-types";

export interface SelectedMedicalCode {
  code: string
  label: string
}

interface MedicalCodePickerProps {
  system: MedicalCodeSystem
  codes: MedicalCode[]
  value: SelectedMedicalCode[]
  onChange: (next: SelectedMedicalCode[]) => void
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
}

/**
 * Multi-select lookup untuk kode klasifikasi klinis terstandar (ICD-10 / ICD-9-CM).
 * Daftar kode di-pass dari parent agar tidak ada fetch ganda antar instance.
 */
export function MedicalCodePicker({
  system,
  codes,
  value,
  onChange,
  placeholder = "Cari kode / nama...",
  emptyMessage = "Kode tidak ditemukan.",
  disabled = false,
}: MedicalCodePickerProps) {
  const [open, setOpen] = React.useState(false)

  const selectedKeys = React.useMemo(() => new Set(value.map((item) => item.code)), [value])

  const options = React.useMemo(
    () =>
      codes
        .filter((item) => item.system === system && item.isActive && !selectedKeys.has(item.code))
        .sort((a, b) => a.code.localeCompare(b.code, "id")),
    [codes, system, selectedKeys],
  )

  const addCode = (item: MedicalCode) => {
    onChange([...value, { code: item.code, label: item.name }])
    setOpen(false)
  }

  const removeCode = (code: string) => {
    onChange(value.filter((item) => item.code !== code))
  }

  return (
    <div className="w-full min-w-0 space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.length === 0 ? (
          <span className="text-sm text-muted-foreground">Belum ada kode dipilih.</span>
        ) : (
          value.map((item) => (
            <Badge key={item.code} variant="secondary" className="gap-1 py-1 pl-2 pr-1 font-normal">
              <span className="font-mono font-medium">{item.code}</span>
              <span className="max-w-[16rem] truncate">{item.label}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeCode(item.code)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                  aria-label={`Hapus ${item.code}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))
        )}
      </div>
      {!disabled && (
        <>
          <Button
            type="button"
            variant="outline"
            className="box-border w-full min-w-0 justify-start"
            role="combobox"
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            <Plus className="mr-2 h-4 w-4" />
            {open ? "Tutup Pilihan Kode" : "Tambah Kode"}
          </Button>
          {open && (
            <div className="box-border w-full min-w-0 overflow-hidden rounded-lg border bg-popover shadow-sm">
            <Command
              className="w-full min-w-0"
              filter={(itemValue, searchTerm) =>
                itemValue.toLocaleLowerCase("id-ID").includes(searchTerm.toLocaleLowerCase("id-ID"))
                  ? 1
                  : 0
              }
            >
              <CommandInput className="w-full min-w-0" placeholder={placeholder} />
              <CommandList className="max-h-64 w-full">
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                  {options.map((item) => (
                    <CommandItem
                      key={item.id}
                      className="w-full"
                      value={`${item.code} ${item.name} ${item.category ?? ""}`}
                      onSelect={() => addCode(item)}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm">
                          <span className="font-mono font-medium">{item.code}</span> — {item.name}
                        </span>
                        {item.category && (
                          <span className="text-xs text-muted-foreground">{item.category}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
            </div>
          )}
        </>
      )}
    </div>
  )
}
