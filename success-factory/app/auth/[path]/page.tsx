import { AuthView } from "@neondatabase/auth/react/ui"
import "@neondatabase/auth/ui/css"

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>
}) {
  const { path } = await params

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg-secondary p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-content-primary">
            Success Factory
          </h1>
          <p className="text-content-secondary mt-2">
            Sign in to access your CSM dashboard
          </p>
        </div>
        <AuthView path={path} />
      </div>
    </main>
  )
}
