"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Zap,
  Bell,
  Database,
  Users,
  Shield,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

interface Step {
  id: string
  title: string
  description: string
  icon: React.ElementType
  component: React.ReactNode
}

export function OnboardingWizard({ isOpen, onClose, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    // Data source connections
    hubspotConnected: false,
    stripeConnected: false,
    notionConnected: false,
    // Notification preferences
    slackEnabled: false,
    emailEnabled: true,
    slackWebhook: "",
    emailDigestFrequency: "daily",
    // Alert thresholds
    healthAlertEnabled: true,
    renewalAlertDays: 30,
    paymentAlertEnabled: true,
    // Team setup
    teamName: "",
    role: "csm",
  })

  const updateFormData = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const steps: Step[] = [
    {
      id: "welcome",
      title: "Welcome to Success Factory",
      description: "Let's get you set up in just a few steps",
      icon: Sparkles,
      component: (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600">
            <Zap className="h-10 w-10 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Welcome to Success Factory
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Your AI-powered customer success command center. Let&apos;s configure your
              workspace in just a few minutes.
            </p>
          </div>
          <div className="grid gap-3 text-left">
            {[
              "Connect your data sources",
              "Set up notifications",
              "Configure alerts",
              "Customize your dashboard",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-sm font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {i + 1}
                </div>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "data-sources",
      title: "Connect Data Sources",
      description: "Link your tools to get started",
      icon: Database,
      component: (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Connect your existing tools to automatically sync customer data.
          </p>
          <div className="space-y-3">
            <DataSourceCard
              name="HubSpot"
              description="Sync companies, contacts, and deals"
              connected={formData.hubspotConnected}
              onConnect={() => updateFormData("hubspotConnected", true)}
              color="orange"
            />
            <DataSourceCard
              name="Stripe"
              description="Payment and subscription data"
              connected={formData.stripeConnected}
              onConnect={() => updateFormData("stripeConnected", true)}
              color="purple"
            />
            <DataSourceCard
              name="Notion"
              description="Tasks and support tickets"
              connected={formData.notionConnected}
              onConnect={() => updateFormData("notionConnected", true)}
              color="zinc"
            />
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            You can skip this step and connect data sources later from Settings.
          </p>
        </div>
      ),
    },
    {
      id: "notifications",
      title: "Notification Preferences",
      description: "Choose how you want to be notified",
      icon: Bell,
      component: (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Configure how you receive alerts and updates.
          </p>

          <div className="space-y-3">
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">Slack Notifications</p>
                  <p className="text-sm text-zinc-500">Get alerts in your Slack workspace</p>
                </div>
                <ToggleSwitch
                  enabled={formData.slackEnabled}
                  onChange={(v) => updateFormData("slackEnabled", v)}
                />
              </div>
              {formData.slackEnabled && (
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Slack Webhook URL"
                    value={formData.slackWebhook}
                    onChange={(e) => updateFormData("slackWebhook", e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
              )}
            </div>

            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">Email Digests</p>
                  <p className="text-sm text-zinc-500">Receive summary emails</p>
                </div>
                <ToggleSwitch
                  enabled={formData.emailEnabled}
                  onChange={(v) => updateFormData("emailEnabled", v)}
                />
              </div>
              {formData.emailEnabled && (
                <div className="mt-3">
                  <select
                    value={formData.emailDigestFrequency}
                    onChange={(e) => updateFormData("emailDigestFrequency", e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value="daily">Daily Digest</option>
                    <option value="weekly">Weekly Digest</option>
                    <option value="realtime">Real-time (Critical Only)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "alerts",
      title: "Alert Configuration",
      description: "Set your monitoring thresholds",
      icon: Shield,
      component: (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Configure when you want to be alerted about account changes.
          </p>

          <div className="space-y-3">
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">Health Score Alerts</p>
                  <p className="text-sm text-zinc-500">Notify when accounts drop to red</p>
                </div>
                <ToggleSwitch
                  enabled={formData.healthAlertEnabled}
                  onChange={(v) => updateFormData("healthAlertEnabled", v)}
                />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">Renewal Alerts</p>
                  <p className="text-sm text-zinc-500">Days before renewal to alert</p>
                </div>
                <select
                  value={formData.renewalAlertDays}
                  onChange={(e) => updateFormData("renewalAlertDays", parseInt(e.target.value))}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">Payment Alerts</p>
                  <p className="text-sm text-zinc-500">Alert on failed payments</p>
                </div>
                <ToggleSwitch
                  enabled={formData.paymentAlertEnabled}
                  onChange={(v) => updateFormData("paymentAlertEnabled", v)}
                />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "team",
      title: "Team Setup",
      description: "Tell us about your team",
      icon: Users,
      component: (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Help us personalize your experience.
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Team/Company Name
              </label>
              <input
                type="text"
                placeholder="e.g., Acme CS Team"
                value={formData.teamName}
                onChange={(e) => updateFormData("teamName", e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Your Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "csm", label: "Customer Success Manager" },
                  { value: "cs_lead", label: "CS Team Lead" },
                  { value: "vp_cs", label: "VP of Customer Success" },
                  { value: "founder", label: "Founder/Executive" },
                ].map((role) => (
                  <button
                    key={role.value}
                    onClick={() => updateFormData("role", role.value)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                      formData.role === role.value
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
                    )}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ]

  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  const handleNext = () => {
    setCompletedSteps((prev) => new Set([...prev, currentStepData.id]))
    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }

  const handleComplete = async () => {
    try {
      // Save preferences
      await fetch("/api/settings/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
    } catch (error) {
      console.error("Failed to save onboarding preferences:", error)
    }
    onComplete()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Progress bar */}
        <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 px-6 pt-6">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all",
                idx < currentStep
                  ? "bg-emerald-500 text-white"
                  : idx === currentStep
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
              )}
            >
              {idx < currentStep ? <Check className="h-4 w-4" /> : idx + 1}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentStepData.component}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 p-4 dark:border-zinc-800">
          <button
            onClick={handleBack}
            disabled={isFirstStep}
            className={cn(
              "flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              isFirstStep
                ? "text-zinc-300 dark:text-zinc-600"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            {isLastStep ? "Get Started" : "Continue"}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function DataSourceCard({
  name,
  description,
  connected,
  onConnect,
  color,
}: {
  name: string
  description: string
  connected: boolean
  onConnect: () => void
  color: string
}) {
  const colorClasses: Record<string, string> = {
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    zinc: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", colorClasses[color])}>
          <Database className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-zinc-900 dark:text-zinc-100">{name}</p>
          <p className="text-xs text-zinc-500">{description}</p>
        </div>
      </div>
      {connected ? (
        <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
          <Check className="h-3 w-3" />
          Connected
        </div>
      ) : (
        <button
          onClick={onConnect}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Connect
        </button>
      )}
    </div>
  )
}

function ToggleSwitch({
  enabled,
  onChange,
}: {
  enabled: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        enabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          enabled ? "left-[22px]" : "left-0.5"
        )}
      />
    </button>
  )
}
