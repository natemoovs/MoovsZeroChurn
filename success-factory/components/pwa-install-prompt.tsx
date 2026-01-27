"use client"

import { useState, useEffect } from "react"
import { X, Download, Share, Plus } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

type DeviceType = "ios" | "android" | "desktop"
type BrowserType = "safari" | "chrome" | "firefox" | "edge" | "other"

function getDeviceType(): DeviceType {
  if (typeof window === "undefined") return "desktop"

  const ua = navigator.userAgent.toLowerCase()

  if (/iphone|ipad|ipod/.test(ua)) return "ios"
  if (/android/.test(ua)) return "android"
  return "desktop"
}

function getBrowserType(): BrowserType {
  if (typeof window === "undefined") return "other"

  const ua = navigator.userAgent.toLowerCase()

  if (/edg/.test(ua)) return "edge"
  if (/chrome/.test(ua) && !/edg/.test(ua)) return "chrome"
  if (/safari/.test(ua) && !/chrome/.test(ua)) return "safari"
  if (/firefox/.test(ua)) return "firefox"
  return "other"
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop")
  const [browserType, setBrowserType] = useState<BrowserType>("other")
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    // Don't show if already installed
    if (isStandalone()) return

    // Check if user dismissed recently (within 3 days for mobile, 7 for desktop)
    const dismissedAt = localStorage.getItem("pwa-prompt-dismissed")
    const device = getDeviceType()
    const browser = getBrowserType()
    const dismissDays = device === "desktop" ? 7 : 3

    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt)
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < dismissDays) return
    }

    setDeviceType(device)
    setBrowserType(browser)

    // For browsers that support beforeinstallprompt (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show prompt immediately when event fires
      setShowPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // For mobile devices, show prompt after delay even without beforeinstallprompt
    // The beforeinstallprompt may not fire until user engagement criteria is met
    if (device === "ios" || device === "android") {
      // Show after 2 seconds on mobile
      const timer = setTimeout(() => setShowPrompt(true), 2000)
      return () => {
        clearTimeout(timer)
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === "accepted") {
        setShowPrompt(false)
      }
      setDeferredPrompt(null)
    } else {
      // Show manual instructions
      setShowInstructions(true)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setShowInstructions(false)
    localStorage.setItem("pwa-prompt-dismissed", new Date().toISOString())
  }

  if (!showPrompt) return null

  return (
    <>
      {/* Main prompt banner */}
      <div className="bg-bg-primary border-border-default animate-in slide-in-from-bottom-4 fixed right-4 bottom-4 left-4 z-50 rounded-lg border shadow-xl md:right-4 md:left-auto md:w-96">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="bg-bg-tertiary h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
              <img src="/logo.jpg" alt="Success Factory" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-content-primary text-sm font-semibold">
                Install Success Factory
              </h3>
              <p className="text-content-secondary mt-0.5 text-xs">
                {deviceType === "ios"
                  ? "Add to your home screen for quick access"
                  : "Install the app for a better experience"}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-content-tertiary hover:text-content-secondary flex-shrink-0 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            {deferredPrompt ? (
              <button
                onClick={handleInstall}
                className="bg-primary-600 hover:bg-primary-700 flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                <Download className="h-4 w-4" />
                Install
              </button>
            ) : (
              <button
                onClick={() => setShowInstructions(true)}
                className="bg-primary-600 hover:bg-primary-700 flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                <Share className="h-4 w-4" />
                How to Install
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="text-content-tertiary hover:text-content-secondary px-4 py-2 text-sm transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>

      {/* Instructions modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-bg-primary border-border-default w-full max-w-md rounded-xl border shadow-2xl">
            <div className="border-border-default flex items-center justify-between border-b p-4">
              <h2 className="text-content-primary font-semibold">Install Success Factory</h2>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-content-tertiary hover:text-content-secondary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">
              {deviceType === "ios" ? (
                <IOSInstructions />
              ) : deviceType === "android" ? (
                <AndroidInstructions browserType={browserType} />
              ) : (
                <DesktopInstructions browserType={browserType} />
              )}
            </div>

            <div className="border-border-default border-t p-4">
              <button
                onClick={() => setShowInstructions(false)}
                className="bg-bg-tertiary text-content-primary hover:bg-surface-hover w-full rounded-md px-4 py-2 text-sm font-medium transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function IOSInstructions() {
  return (
    <div className="space-y-4">
      <p className="text-content-secondary text-sm">
        To install Success Factory on your iPhone or iPad:
      </p>
      <ol className="space-y-3">
        <li className="flex gap-3">
          <span className="bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            1
          </span>
          <div className="text-sm">
            <p className="text-content-primary font-medium">Tap the Share button</p>
            <p className="text-content-tertiary mt-0.5 text-xs">
              Look for the <Share className="inline h-3 w-3" /> icon at the bottom of Safari
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            2
          </span>
          <div className="text-sm">
            <p className="text-content-primary font-medium">
              Scroll and tap &quot;Add to Home Screen&quot;
            </p>
            <p className="text-content-tertiary mt-0.5 text-xs">
              Look for the <Plus className="inline h-3 w-3" /> icon in the menu
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            3
          </span>
          <div className="text-sm">
            <p className="text-content-primary font-medium">Tap &quot;Add&quot; to confirm</p>
            <p className="text-content-tertiary mt-0.5 text-xs">
              The app will appear on your home screen
            </p>
          </div>
        </li>
      </ol>
    </div>
  )
}

function AndroidInstructions({ browserType }: { browserType: BrowserType }) {
  return (
    <div className="space-y-4">
      <p className="text-content-secondary text-sm">
        To install Success Factory on your Android device:
      </p>
      <ol className="space-y-3">
        <li className="flex gap-3">
          <span className="bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            1
          </span>
          <div className="text-sm">
            <p className="text-content-primary font-medium">Tap the menu button</p>
            <p className="text-content-tertiary mt-0.5 text-xs">
              {browserType === "chrome"
                ? "Look for the ⋮ icon in the top right corner"
                : "Look for the menu icon in your browser"}
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            2
          </span>
          <div className="text-sm">
            <p className="text-content-primary font-medium">
              {browserType === "chrome"
                ? 'Tap "Install app" or "Add to Home screen"'
                : 'Look for "Install" or "Add to Home screen"'}
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            3
          </span>
          <div className="text-sm">
            <p className="text-content-primary font-medium">Confirm the installation</p>
            <p className="text-content-tertiary mt-0.5 text-xs">
              The app will be added to your home screen
            </p>
          </div>
        </li>
      </ol>
    </div>
  )
}

function DesktopInstructions({ browserType }: { browserType: BrowserType }) {
  return (
    <div className="space-y-4">
      <p className="text-content-secondary text-sm">To install Success Factory on your computer:</p>
      <ol className="space-y-3">
        {browserType === "chrome" || browserType === "edge" ? (
          <>
            <li className="flex gap-3">
              <span className="bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                1
              </span>
              <div className="text-sm">
                <p className="text-content-primary font-medium">Look for the install icon</p>
                <p className="text-content-tertiary mt-0.5 text-xs">
                  {browserType === "chrome"
                    ? "Click the install icon (⊕) in the address bar"
                    : "Click the install icon in the address bar or ••• menu"}
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                2
              </span>
              <div className="text-sm">
                <p className="text-content-primary font-medium">Click &quot;Install&quot;</p>
                <p className="text-content-tertiary mt-0.5 text-xs">
                  The app will open in its own window
                </p>
              </div>
            </li>
          </>
        ) : (
          <>
            <li className="flex gap-3">
              <span className="bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                1
              </span>
              <div className="text-sm">
                <p className="text-content-primary font-medium">Use Chrome or Edge</p>
                <p className="text-content-tertiary mt-0.5 text-xs">
                  For the best experience, open this site in Chrome or Edge
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                2
              </span>
              <div className="text-sm">
                <p className="text-content-primary font-medium">Look for the install option</p>
                <p className="text-content-tertiary mt-0.5 text-xs">
                  Click the install icon in the address bar to install the app
                </p>
              </div>
            </li>
          </>
        )}
      </ol>
    </div>
  )
}
