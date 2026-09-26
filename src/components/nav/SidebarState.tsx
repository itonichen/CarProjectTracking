'use client'

import { createContext, useContext, useState } from 'react'

type Ctx = { collapsed: boolean; setCollapsed: (v: boolean) => void }
const SidebarContext = createContext<Ctx>({ collapsed: false, setCollapsed: () => {} })

/** Whether the desktop sidebar is collapsed to an icon rail. Lives for the session. */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  return <SidebarContext.Provider value={{ collapsed, setCollapsed }}>{children}</SidebarContext.Provider>
}

export const useSidebar = () => useContext(SidebarContext)
