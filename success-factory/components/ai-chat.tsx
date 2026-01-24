"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { MessageCircle, X, Send, Loader2, Sparkles, Wrench } from "lucide-react"
import ReactMarkdown from "react-markdown"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  toolCalls?: string[]
}

interface StreamEvent {
  type: "text" | "tool_start" | "tool_executing" | "tool_result" | "done" | "error"
  content?: string
  name?: string
  success?: boolean
  message?: string
}

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentTools, setCurrentTools] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Keyboard shortcut to toggle chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "a") {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setCurrentTools([])

    // Create assistant message placeholder
    const assistantId = (Date.now() + 1).toString()
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", toolCalls: [] },
    ])

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No reader")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: StreamEvent = JSON.parse(line.slice(6))

              if (event.type === "text") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + (event.content || "") }
                      : m
                  )
                )
              } else if (event.type === "tool_start" || event.type === "tool_executing") {
                const toolName = event.name || "tool"
                setCurrentTools((prev) => [...prev, toolName])
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, toolCalls: [...(m.toolCalls || []), toolName] }
                      : m
                  )
                )
              } else if (event.type === "tool_result") {
                setCurrentTools((prev) => prev.filter((t) => t !== event.name))
              } else if (event.type === "error") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: `Error: ${event.message}` }
                      : m
                  )
                )
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `Error: ${error instanceof Error ? error.message : "Failed to send message"}`,
              }
            : m
        )
      )
    } finally {
      setIsLoading(false)
      setCurrentTools([])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const suggestions = [
    "Show me at-risk accounts",
    "Why is [company] struggling?",
    "What are my overdue tasks?",
    "Which accounts have upcoming renewals?",
  ]

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 z-50 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full gradient-bg text-white shadow-lg glow transition-all hover:scale-105 hover:shadow-xl sm:bottom-6 sm:right-6 ${isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}
        title="Ask AI (⌘⇧A)"
      >
        <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      {/* Chat panel - full screen on mobile, card on desktop */}
      <div
        className={`fixed z-50 flex flex-col overflow-hidden glass-heavy transition-all
          inset-0 sm:inset-auto sm:bottom-6 sm:right-6
          sm:h-[600px] sm:w-[420px] sm:max-h-[calc(100vh-48px)]
          sm:rounded-2xl border-0 sm:border sm:border-border-default
          ${isOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default gradient-bg px-4 py-3 sm:py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-white" />
            <span className="font-semibold text-white">AI Assistant</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 transition-colors-smooth hover:bg-white/20 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center px-4">
              <div className="mb-4 rounded-full bg-primary-100 dark:bg-primary-50 p-4">
                <MessageCircle className="h-8 w-8 text-primary-600 dark:text-primary-500" />
              </div>
              <h3 className="mb-2 font-semibold text-content-primary">
                How can I help?
              </h3>
              <p className="mb-4 text-sm text-content-secondary">
                Ask me about your accounts, risks, or tasks
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(s)}
                    className="rounded-full border border-border-default bg-bg-secondary px-3 py-2 min-h-[44px] text-xs text-content-secondary transition-colors-smooth hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      message.role === "user"
                        ? "gradient-bg text-white"
                        : "bg-bg-tertiary text-content-primary"
                    }`}
                  >
                    {message.role === "assistant" && message.toolCalls && message.toolCalls.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {[...new Set(message.toolCalls)].map((tool, i) => (
                          <span
                            key={i}
                            className="badge-sf badge-primary inline-flex items-center gap-1"
                          >
                            <Wrench className="h-3 w-3" />
                            {tool.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                        <ReactMarkdown>{message.content || "..."}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {currentTools.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-content-secondary">
                  <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                  <span>Using {currentTools[currentTools.length - 1].replace(/_/g, " ")}...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border-default p-4">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about accounts, risks, tasks..."
              className="input-sf flex-1 rounded-xl"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="btn-primary flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-content-tertiary hidden sm:block">
            Press ⌘⇧A to toggle • Esc to close
          </p>
        </div>
      </div>
    </>
  )
}
