"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { Skill } from "@/lib/skills"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

interface ResultViewProps {
  skill: Skill
}

export function ResultView({ skill }: ResultViewProps) {
  const [result, setResult] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [tweaks, setTweaks] = useState("")
  const [answers, setAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    const storedAnswers = sessionStorage.getItem(`skill-answers-${skill.slug}`)
    if (storedAnswers) {
      const parsedAnswers = JSON.parse(storedAnswers)
      setAnswers(parsedAnswers)
      generateContent(parsedAnswers)
    } else {
      setError("No answers found. Please start over.")
      setIsLoading(false)
    }
  }, [skill.slug])

  const generateContent = async (currentAnswers: Record<string, string>, additionalTweaks?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const payload: Record<string, unknown> = { answers: currentAnswers }
      if (additionalTweaks) {
        payload.tweaks = additionalTweaks
      }

      const response = await fetch(`/skill/${skill.slug}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("Failed to generate content")
      }

      const data = await response.json()
      setResult(data.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (result) {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRegenerate = () => {
    generateContent(answers, tweaks)
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="flex min-h-[300px] items-center justify-center">
            <div className="text-center">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 mx-auto" />
              <p className="text-zinc-500">Generating your content...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="flex min-h-[200px] items-center justify-center">
            <div className="text-center">
              <p className="mb-4 text-red-500">{error}</p>
              <Link href={`/skill/${skill.slug}`}>
                <Button>Start Over</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          &larr; Back to skills
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{skill.name} - Result</CardTitle>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md bg-zinc-100 p-4 dark:bg-zinc-900">
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </div>

          <div className="mt-6 space-y-2">
            <label className="text-sm font-medium">
              Want to tweak the output? Add notes:
            </label>
            <Textarea
              value={tweaks}
              onChange={(e) => setTweaks(e.target.value)}
              placeholder="e.g., Make it more formal, add more detail about X..."
              className="min-h-[80px]"
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Link href={`/skill/${skill.slug}`}>
            <Button variant="outline">Edit Answers</Button>
          </Link>
          <Button onClick={handleRegenerate} disabled={isLoading}>
            Regenerate
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
