"use client"

import { useEffect, useRef } from "react"

/**
 * Hook for creating a spotlight hover effect that follows the cursor
 * Use with the .spotlight CSS class from globals.css
 *
 * @example
 * const spotlightRef = useSpotlight<HTMLDivElement>()
 * <div ref={spotlightRef} className="spotlight card">...</div>
 */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect()
      element.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`)
      element.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`)
    }

    element.addEventListener("mousemove", handleMouseMove)
    return () => element.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return ref
}
