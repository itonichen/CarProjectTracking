'use client'

import { createContext, useContext, useState } from 'react'

type Ctx = { split: boolean; setSplit: (v: boolean) => void }
const SplitContext = createContext<Ctx>({ split: false, setSplit: () => {} })
export const useSplit = () => useContext(SplitContext)

/**
 * Page container for a car. In split view (car and breakdown side by side)
 * the page widens to use the room the collapsed sidebar frees up.
 */
export function CarPageFrame({ children }: { children: React.ReactNode }) {
  const [split, setSplit] = useState(false)
  return (
    <SplitContext.Provider value={{ split, setSplit }}>
      <div
        className={`mx-auto flex w-full flex-col gap-5 px-4 pt-4 pb-6 transition-[max-width] md:px-11 md:pt-9 md:pb-14 ${split ? 'max-w-[1520px]' : 'max-w-[1120px]'}`}
      >
        {children}
      </div>
    </SplitContext.Provider>
  )
}
