"use client"

import * as React from "react"

export type ThemeMode = "system" | "light" | "dark"

type ThemeModeContextValue = {
  theme: ThemeMode
  resolvedTheme: "light" | "dark"
  setTheme: (value: ThemeMode) => void
  isReady: boolean
}

const STORAGE_KEY = "klinik_theme"

const ThemeModeContext = React.createContext<ThemeModeContextValue | undefined>(undefined)

const getResolvedTheme = (mode: ThemeMode) => {
  if (mode === "system") {
    if (typeof window === "undefined") {
      return "light"
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }
  return mode
}

const applyResolvedTheme = (resolvedTheme: "light" | "dark") => {
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(resolvedTheme)
  root.style.colorScheme = resolvedTheme
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<ThemeMode>("system")
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("light")
  const [isReady, setIsReady] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === "undefined") {
      setIsReady(true)
      return
    }

    const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    if (saved === "light" || saved === "dark" || saved === "system") {
      setTheme(saved)
    }
    setIsReady(true)
  }, [])

  React.useEffect(() => {
    if (!isReady) return
    const next = getResolvedTheme(theme)
    applyResolvedTheme(next)
    setResolvedTheme(next)
  }, [theme, isReady])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const listener = () => {
      if (theme !== "system") return
      const next = getResolvedTheme("system")
      applyResolvedTheme(next)
      setResolvedTheme(next)
    }

    if (media.addEventListener) {
      media.addEventListener("change", listener)
    } else {
      media.addListener(listener)
    }

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", listener)
      } else {
        media.removeListener(listener)
      }
    }
  }, [theme])

  const setThemeMode = React.useCallback((nextTheme: ThemeMode) => {
    setTheme(nextTheme)
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme)
    } catch (error) {
      console.error("Failed to persist theme", error)
    }
  }, [])

  const contextValue = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme: setThemeMode, isReady }),
    [isReady, resolvedTheme, setThemeMode, theme],
  )

  return <ThemeModeContext.Provider value={contextValue}>{children}</ThemeModeContext.Provider>
}

export function useThemeMode() {
  const context = React.useContext(ThemeModeContext)
  if (!context) {
    throw new Error("useThemeMode must be used within a ThemeModeProvider")
  }
  return context
}
