"use client"

import { useState, useEffect } from "react"

/**
 * Detects if the user is on a touch device
 * Returns true for touch-primary devices, false for mouse-primary
 */
export function useTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    // Check for touch capability
    const checkTouch = () => {
      // Media query for touch-primary devices
      const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches
      // Has touch points
      const hasTouchPoints = navigator.maxTouchPoints > 0
      // Has touch events
      const hasTouchEvents = "ontouchstart" in window

      setIsTouchDevice(hasCoarsePointer || (hasTouchPoints && hasTouchEvents))
    }

    checkTouch()

    // Listen for changes (e.g., connecting/disconnecting touchscreen)
    const mediaQuery = window.matchMedia("(pointer: coarse)")
    const handler = () => checkTouch()

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handler)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handler)
      } else {
        mediaQuery.removeListener(handler)
      }
    }
  }, [])

  return isTouchDevice
}
