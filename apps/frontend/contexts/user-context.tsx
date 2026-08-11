"use client"

import type { SafeUser } from "@/lib/auth-types";
import { AUTH_SESSION_CHANGED_EVENT, getCurrentUser } from "@/lib/auth-utils";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type UserContextType = {
  currentUser: (SafeUser & { avatarUrl?: string }) | null
  refetchUser: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<(SafeUser & { avatarUrl?: string }) | null>(null)

  const refetchUser = useCallback(() => {
    const user = getCurrentUser()
    setCurrentUser(user as (SafeUser & { avatarUrl?: string }) | null)
  }, [])

  useEffect(() => {
    refetchUser()
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, refetchUser)
    window.addEventListener("storage", refetchUser)
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, refetchUser)
      window.removeEventListener("storage", refetchUser)
    }
  }, [refetchUser])

  return <UserContext.Provider value={{ currentUser, refetchUser }}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
