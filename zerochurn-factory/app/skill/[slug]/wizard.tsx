"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { Skill } from "@/lib/skills"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"

interface SkillWizardProps {
  skill: Skill
}

export function SkillWizard({ skill }: SkillWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isGenerating, setIsGenerating] = useState(false)

  const totalSteps = skill.questions.length
  const isLastStep = currentStep === totalSteps - 1
  const currentQuestion = skill.questions[currentStep]
  const progress = ((currentStep + 1) / totalSteps) * 100

  const handleAnswer = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }))
  }

  const handleNext = () => {
    if (isLastStep) {
      handleGenerate()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }

  const handleGenerate = async () => {
    setIsGenerating(true)

    // Store answers in sessionStorage for the result page
    sessionStorage.setItem(`skill-answers-${skill.slug}`, JSON.stringify(answers))

    // Navigate to result page which will trigger generation
    router.push(`/skill/${skill.slug}/result`)
  }

  const currentAnswer = answers[currentQuestion?.id] || ""
  const hasLongExamples = currentQuestion?.examples && currentQuestion.examples.some(e => e.length > 50)

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
            <CardTitle>{skill.name}</CardTitle>
            <span className="text-sm text-zinc-500">
              {currentStep + 1} of {totalSteps}
            </span>
          </div>
          <Progress value={progress} className="mt-2" />
        </CardHeader>

        <CardContent className="space-y-4">
          <h2 className="text-xl font-medium">{currentQuestion.question}</h2>

          {currentQuestion.examples && currentQuestion.examples.length > 0 && (
            <div className="text-sm text-zinc-500">
              <p className="mb-2">Examples:</p>
              <ul className="list-inside list-disc space-y-1">
                {currentQuestion.examples.map((example, i) => (
                  <li key={i}>{example}</li>
                ))}
              </ul>
            </div>
          )}

          {hasLongExamples ? (
            <Textarea
              value={currentAnswer}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Your answer..."
              className="min-h-[120px]"
            />
          ) : (
            <Input
              value={currentAnswer}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Your answer..."
            />
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={!currentAnswer.trim() || isGenerating}
          >
            {isGenerating ? "Generating..." : isLastStep ? "Generate" : "Next"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
