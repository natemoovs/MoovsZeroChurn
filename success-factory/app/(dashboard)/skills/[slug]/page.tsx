"use client"

import { Suspense, useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { CompanySelect } from "@/components/company-select"
import type { Skill } from "@/lib/skills"
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Check,
  Loader2,
  Copy,
  Download,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"

function isCompanyQuestion(id: string, question: string): boolean {
  const idPatterns = ["customer", "company", "account", "client"]
  const questionPatterns = ["company", "customer", "account", "domain", "client name"]
  const idLower = id.toLowerCase()
  const questionLower = question.toLowerCase()
  return (
    idPatterns.some((p) => idLower.includes(p)) ||
    questionPatterns.some((p) => questionLower.includes(p))
  )
}

function SkillPageContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [skill, setSkill] = useState<Skill | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Fetch skill from API
    fetch(`/api/skills/${params.slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.skill) {
          setSkill(data.skill)
          // Pre-fill from URL params
          const customer = searchParams.get("customer")
          if (customer) {
            setAnswers((prev) => ({ ...prev, customer }))
          }
        }
      })
      .catch(console.error)
  }, [params.slug, searchParams])

  if (!skill) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-success-500 border-t-transparent" />
        </div>
      </DashboardLayout>
    )
  }

  const totalSteps = skill.questions.length + 1 // +1 for review step
  const isReviewStep = currentStep === skill.questions.length
  const isLastQuestionStep = currentStep === skill.questions.length - 1
  const currentQuestion = skill.questions[currentStep]
  const progress = result ? 100 : ((currentStep + 1) / totalSteps) * 100
  const currentAnswer = currentQuestion ? (answers[currentQuestion.id] || "") : ""
  const hasLongExamples = currentQuestion?.examples && currentQuestion.examples.some((e) => e.length > 50)
  const allQuestionsAnswered = skill.questions.every(q => answers[q.id]?.trim())

  const handleAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }))
  }

  const handleNext = () => {
    if (isReviewStep) {
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
    setError(null)

    try {
      const response = await fetch(`/skill/${skill.slug}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Something went wrong")
      } else {
        setResult(data.result)
      }
    } catch {
      setError("Failed to connect. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (result) {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    if (result) {
      const blob = new Blob([result], { type: "text/markdown" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${skill.slug}-${new Date().toISOString().split("T")[0]}.md`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleReset = () => {
    setResult(null)
    setCurrentStep(0)
    setAnswers({})
    setFeedback(null)
    setError(null)
  }

  // Result View
  if (result) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/skills"
                className="inline-flex items-center gap-2 text-sm text-content-secondary hover:text-content-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Skills
              </Link>
              <h1 className="mt-2 text-2xl font-bold text-content-primary">
                {skill.name}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Start Over
              </Button>
            </div>
          </div>

          {/* Result Card */}
          <div className="rounded-xl border border-border-default bg-bg-elevated shadow-sm">
            {/* Actions Bar */}
            <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-100 dark:bg-success-950">
                  <Check className="h-4 w-4 text-success-600 dark:text-success-400" />
                </div>
                <span className="text-sm font-medium text-content-primary">
                  Generated successfully
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFeedback("up")}
                  className={cn(feedback === "up" && "bg-success-50 dark:bg-success-950")}
                >
                  <ThumbsUp className={cn("h-4 w-4", feedback === "up" && "text-success-600")} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFeedback("down")}
                  className={cn(feedback === "down" && "bg-error-50 dark:bg-error-950")}
                >
                  <ThumbsDown className={cn("h-4 w-4", feedback === "down" && "text-error-600")} />
                </Button>
                <div className="mx-2 h-6 w-px bg-bg-tertiary" />
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>

            {/* Result Content */}
            <div className="p-6">
              <div className="prose dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap rounded-lg bg-bg-secondary p-4 text-sm">
                  {result}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Wizard View
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/skills"
            className="inline-flex items-center gap-2 text-sm text-content-secondary hover:text-content-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Skills
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-content-primary">
            {skill.name}
          </h1>
          <p className="mt-1 text-content-secondary">
            {skill.description}
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-content-secondary">
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span className="font-medium text-content-primary">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card or Review Card */}
        <div className="rounded-xl border border-border-default bg-bg-elevated p-6 shadow-sm">
          {/* Steps indicator */}
          <div className="mb-6 flex items-center justify-center gap-2">
            {skill.questions.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-2 w-2 rounded-full transition-all",
                  index === currentStep
                    ? "w-6 bg-success-500"
                    : index < currentStep
                    ? "bg-success-500"
                    : "bg-bg-tertiary"
                )}
              />
            ))}
            {/* Review step indicator */}
            <div
              className={cn(
                "h-2 w-2 rounded-full transition-all",
                isReviewStep
                  ? "w-6 bg-success-500"
                  : allQuestionsAnswered
                  ? "bg-success-500"
                  : "bg-bg-tertiary"
              )}
            />
          </div>

          {isReviewStep ? (
            /* Review Step */
            <>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success-100 dark:bg-success-950">
                  <Check className="h-5 w-5 text-success-600 dark:text-success-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-content-primary">
                    Review & Generate
                  </h2>
                  <p className="text-sm text-content-secondary">
                    Confirm your answers before generating
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {skill.questions.map((q, index) => (
                  <div
                    key={q.id}
                    className="flex items-start justify-between rounded-lg border border-border-default bg-bg-secondary p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-content-secondary">
                        {q.question}
                      </p>
                      <p className="mt-1 text-sm text-content-primary truncate">
                        {answers[q.id] || <span className="text-content-tertiary italic">Not answered</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentStep(index)}
                      className="ml-2 text-xs text-success-600 hover:text-success-700 dark:text-success-400"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Question Step */
            <>
              <h2 className="mb-4 text-xl font-semibold text-content-primary">
                {currentQuestion.question}
              </h2>

              {/* Examples */}
              {currentQuestion.examples && currentQuestion.examples.length > 0 && (
                <div className="mb-4 rounded-lg bg-bg-secondary p-4">
                  <p className="mb-2 text-sm font-medium text-content-secondary">
                    Examples:
                  </p>
                  <ul className="space-y-1 text-sm text-content-secondary">
                    {currentQuestion.examples.map((example, i) => (
                      <li key={i}>• {example}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Input */}
              {hasLongExamples ? (
                <Textarea
                  value={currentAnswer}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder="Your answer..."
                  className="min-h-[120px]"
                />
              ) : isCompanyQuestion(currentQuestion.id, currentQuestion.question) ? (
                <CompanySelect
                  value={currentAnswer}
                  onChange={handleAnswer}
                  placeholder="Search or type company name..."
                />
              ) : (
                <Input
                  value={currentAnswer}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder="Your answer..."
                  className="h-12"
                />
              )}
            </>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-lg bg-error-50 p-3 text-sm text-error-700 dark:bg-error-950/50 dark:text-error-400">
              {error}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={(!isReviewStep && !currentAnswer.trim()) || isGenerating}
            className="min-w-[140px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : isReviewStep ? (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate
              </>
            ) : isLastQuestionStep ? (
              <>
                Review
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}

function SkillPageLoading() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-6 w-32 shimmer rounded" />
        <div className="h-8 w-64 shimmer rounded" />
        <div className="h-4 w-96 shimmer rounded" />
        <div className="rounded-xl border border-border-default bg-bg-elevated p-6">
          <div className="space-y-4">
            <div className="h-6 w-full shimmer rounded" />
            <div className="h-12 w-full shimmer rounded" />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function SkillPage() {
  return (
    <Suspense fallback={<SkillPageLoading />}>
      <SkillPageContent />
    </Suspense>
  )
}
