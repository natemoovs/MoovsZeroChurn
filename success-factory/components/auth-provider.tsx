"use client"

import { NeonAuthUIProvider } from "@neondatabase/auth/react/ui"
import { authClient } from "@/lib/auth/client"
import { Component, ReactNode, ErrorInfo } from "react"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class AuthErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Auth provider error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // Render children anyway - auth is optional for viewing
      return this.props.children
    }
    return this.props.children
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthErrorBoundary>
      <NeonAuthUIProvider authClient={authClient}>
        {children}
      </NeonAuthUIProvider>
    </AuthErrorBoundary>
  )
}
