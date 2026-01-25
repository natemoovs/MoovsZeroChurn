import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { Toaster } from "sonner"
import "./globals.css"

export const metadata: Metadata = {
  title: "Success Factory",
  description: "AI-powered skills for Customer Success",
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
            <AuthProvider>{children}</AuthProvider>
            <Toaster
              position="bottom-right"
              toastOptions={{
                className:
                  "dark:bg-bg-elevated dark:text-content-primary dark:border-border-default",
              }}
            />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
