import { NextRequest, NextResponse } from "next/server"
import {
  getClawdbotClient,
  TOKEN_LIMITS,
  convertToOpenAITools,
  extractText,
  extractToolCalls,
  requiresToolExecution,
  createStreamingChatCompletion,
  DEFAULT_MODEL,
  type ChatMessage,
  type ClawdbotTool,
} from "@/lib/clawdbot"
import { skillTools, executeTool } from "@/lib/skills/tools"
import { requireAuth } from "@/lib/auth/api-middleware"
import { createLogger } from "@/lib/logger"
import type OpenAI from "openai"

export const runtime = "nodejs"
export const maxDuration = 60

const logger = createLogger("chat")

interface InputMessage {
  role: "user" | "assistant"
  content: string
}

const SYSTEM_PROMPT = `You are an AI assistant for Customer Success Managers using the Success Factory platform. You help CSMs understand their accounts, identify risks, and take action.

You have access to tools that let you:
- Get portfolio overview and health scores
- Search for specific companies in HubSpot
- Get detailed company information including contacts, deals, and activity
- Query usage data from Metabase
- Search support tickets in Notion

Be concise and actionable. When asked about accounts:
1. Use tools to get real data - don't make assumptions
2. Highlight risks and opportunities clearly
3. Suggest specific next steps

Format your responses with markdown for readability. Use bullet points for lists, bold for emphasis.

If asked about something you can't help with, politely explain your capabilities.`

// Convert Anthropic-style tools to OpenAI format
const openAITools: ClawdbotTool[] = convertToOpenAITools(skillTools)

/**
 * Chat endpoint with streaming and tool use
 * POST /api/chat
 */
export async function POST(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const { messages, stream = true } = (await request.json()) as {
      messages: InputMessage[]
      stream?: boolean
    }

    if (!messages || messages.length === 0) {
      return Response.json({ error: "Messages are required" }, { status: 400 })
    }

    const client = getClawdbotClient()
    // Use request origin for internal API calls (works in both local and production)
    const origin = request.headers.get("origin") || request.headers.get("host")
    const protocol = request.headers.get("x-forwarded-proto") || "https"
    const baseUrl = origin?.startsWith("http")
      ? origin
      : `${protocol}://${origin || "localhost:3000"}`

    // Convert to OpenAI message format with system prompt
    const openAIMessages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ]

    if (stream) {
      return streamingResponse(client, openAIMessages, baseUrl)
    } else {
      return nonStreamingResponse(client, openAIMessages, baseUrl)
    }
  } catch (error) {
    logger.error(error, { endpoint: "/api/chat" })
    return Response.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    )
  }
}

async function streamingResponse(
  client: OpenAI,
  messages: ChatMessage[],
  baseUrl: string
) {
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const currentMessages = [...messages]
        let iterations = 0
        const MAX_ITERATIONS = 10

        while (iterations < MAX_ITERATIONS) {
          iterations++

          // Create streaming completion
          const stream = await createStreamingChatCompletion(client, {
            model: DEFAULT_MODEL,
            messages: currentMessages,
            tools: openAITools,
            max_tokens: TOKEN_LIMITS.toolUse,
          })

          let fullText = ""
          let toolCalls: Array<{
            id: string
            name: string
            arguments: string
          }> = []
          let currentToolCall: {
            index: number
            id: string
            name: string
            arguments: string
          } | null = null
          let finishReason: string | null = null

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta
            finishReason = chunk.choices[0]?.finish_reason || finishReason

            // Handle text content
            if (delta?.content) {
              fullText += delta.content
              send({ type: "text", content: delta.content })
            }

            // Handle tool calls
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (tc.index !== undefined) {
                  if (tc.id) {
                    // New tool call starting
                    if (currentToolCall) {
                      toolCalls.push({
                        id: currentToolCall.id,
                        name: currentToolCall.name,
                        arguments: currentToolCall.arguments,
                      })
                    }
                    currentToolCall = {
                      index: tc.index,
                      id: tc.id,
                      name: tc.function?.name || "",
                      arguments: tc.function?.arguments || "",
                    }
                    if (tc.function?.name) {
                      send({ type: "tool_start", name: tc.function.name })
                    }
                  } else if (currentToolCall && tc.index === currentToolCall.index) {
                    // Continue building current tool call
                    if (tc.function?.name) {
                      currentToolCall.name += tc.function.name
                    }
                    if (tc.function?.arguments) {
                      currentToolCall.arguments += tc.function.arguments
                    }
                  }
                }
              }
            }
          }

          // Finalize last tool call
          if (currentToolCall) {
            toolCalls.push({
              id: currentToolCall.id,
              name: currentToolCall.name,
              arguments: currentToolCall.arguments,
            })
          }

          // If we have tool calls, execute them and continue
          if (toolCalls.length > 0 && finishReason === "tool_calls") {
            // Add assistant message with tool calls
            currentMessages.push({
              role: "assistant",
              content: fullText || "",
              tool_calls: toolCalls.map((tc) => ({
                id: tc.id,
                type: "function" as const,
                function: {
                  name: tc.name,
                  arguments: tc.arguments,
                },
              })),
            })

            // Execute tools and get results
            for (const toolCall of toolCalls) {
              send({ type: "tool_executing", name: toolCall.name })

              let args: Record<string, unknown> = {}
              try {
                args = JSON.parse(toolCall.arguments || "{}")
              } catch {
                // Ignore parse errors
              }

              const result = await executeTool(toolCall.name, args, baseUrl)
              send({
                type: "tool_result",
                name: toolCall.name,
                success: result.success,
              })

              // Add tool result message
              currentMessages.push({
                role: "tool",
                content: JSON.stringify(result.success ? result.data : { error: result.error }),
                tool_call_id: toolCall.id,
              })
            }

            // Reset for next iteration
            toolCalls = []
            currentToolCall = null
          } else {
            // No more tool calls, we're done
            break
          }
        }

        send({ type: "done" })
        controller.close()
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Stream failed",
        })
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

async function nonStreamingResponse(
  client: OpenAI,
  messages: ChatMessage[],
  baseUrl: string
) {
  const currentMessages = [...messages]
  let iterations = 0
  const MAX_ITERATIONS = 10
  let finalText = ""

  while (iterations < MAX_ITERATIONS) {
    iterations++

    const response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: currentMessages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      tools: openAITools,
      max_tokens: TOKEN_LIMITS.toolUse,
    })

    const message = response.choices[0]?.message
    finalText += message?.content || ""

    if (requiresToolExecution(response)) {
      const toolCalls = extractToolCalls(response)

      // Add assistant message
      currentMessages.push({
        role: "assistant",
        content: message?.content || "",
        tool_calls: message?.tool_calls?.map((tc) => {
          // Handle both standard and custom tool call types
          const funcInfo = "function" in tc ? tc.function : null
          return {
            id: tc.id,
            type: "function" as const,
            function: {
              name: funcInfo?.name || "",
              arguments: funcInfo?.arguments || "{}",
            },
          }
        }),
      })

      // Execute tools
      for (const toolCall of toolCalls) {
        const result = await executeTool(toolCall.name, toolCall.arguments, baseUrl)

        currentMessages.push({
          role: "tool",
          content: JSON.stringify(result.success ? result.data : { error: result.error }),
          tool_call_id: toolCall.id,
        })
      }
    } else {
      // Done
      break
    }
  }

  return Response.json({ content: finalText })
}
