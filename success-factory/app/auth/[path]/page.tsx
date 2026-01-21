import { AuthView } from "@neondatabase/auth/react/ui"
import "@neondatabase/auth/ui/css"

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>
}) {
  const { path } = await params

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Success Factory
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Sign in to access your CSM dashboard
          </p>
        </div>
        <AuthView path={path} />
      </div>
    </main>
  )
}
