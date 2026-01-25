import { AuthView } from "@neondatabase/auth/react/ui"
import "@neondatabase/auth/ui/css"

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params

  return (
    <main className="bg-bg-secondary flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-content-primary text-2xl font-bold">Success Factory</h1>
          <p className="text-content-secondary mt-2">Sign in to access your CSM dashboard</p>
        </div>
        <AuthView path={path} />
      </div>
    </main>
  )
}
