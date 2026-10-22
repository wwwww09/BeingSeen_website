import { createContext, useContext } from 'react'
import type { MotionValue } from 'framer-motion'

/**
 * The current page's scroll progress, shared by the shell (which owns the
 * scroll target) and the pages (which use it for small scroll-linked fades).
 */
export const ScrollContext = createContext<MotionValue<number> | null>(null)

export function usePageScroll(): MotionValue<number> | null {
  return useContext(ScrollContext)
}
