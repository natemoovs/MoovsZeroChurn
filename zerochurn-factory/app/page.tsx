import Link from "next/link"
import { getSkills } from "@/lib/skills"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
  const skills = getSkills()

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="container mx-auto px-4 py-16">
        <div className="mb-12 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              ZeroChurn Factory
            </h1>
            <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
              Select a skill to get started
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/history"
              className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              View History &rarr;
            </Link>
            <ThemeToggle />
          </div>
        </div>

        {skills.length === 0 ? (
          <p className="text-zinc-500">No skills found. Add skills to /factory/skills/</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => (
              <Link key={skill.slug} href={`/skill/${skill.slug}`}>
                <Card className="h-full cursor-pointer transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <CardTitle>{skill.name}</CardTitle>
                    <CardDescription>{skill.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
