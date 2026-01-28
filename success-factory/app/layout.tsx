import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { BusinessSegmentProvider } from "@/components/business-segment-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { ServiceWorkerRegister } from "@/components/service-worker-register"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { Toaster } from "sonner"
import "./globals.css"

export const metadata: Metadata = {
  title: "Success Factory",
  description: "AI-powered Customer Success platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Success Factory",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/icon.jpg", type: "image/jpeg" }],
    apple: [{ url: "/apple-icon.jpg", type: "image/jpeg" }],
  },
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <BusinessSegmentProvider>{children}</BusinessSegmentProvider>
            </AuthProvider>
            <Toaster
              position="bottom-right"
              toastOptions={{
                className:
                  "dark:bg-bg-elevated dark:text-content-primary dark:border-border-default",
              }}
            />
            <PWAInstallPrompt />
          </ThemeProvider>
          <ServiceWorkerRegister />
        </ErrorBoundary>
      </body>
    </html>
  )
}
