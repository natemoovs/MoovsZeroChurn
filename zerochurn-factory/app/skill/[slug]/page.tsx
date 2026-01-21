import { notFound } from "next/navigation"
import { getSkill } from "@/lib/skills"
import { SkillWizard } from "./wizard"
import { Header } from "@/components/header"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function SkillPage({ params }: PageProps) {
  const { slug } = await params
  const skill = getSkill(slug)

  if (!skill) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header showBack backHref="/" backLabel="Back to skills" />
      <main className="container mx-auto px-4 py-16">
        <SkillWizard skill={skill} />
      </main>
    </div>
  )
}
