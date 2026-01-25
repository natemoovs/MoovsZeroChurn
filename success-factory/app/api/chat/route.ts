import { NextRequest, NextResponse } from "next/server"
import {
  getAnthropicClient,
  AI_MODEL,
  TOKEN_LIMITS,
  extractText,
} from "@/lib/ai"
import { skillTools, executeTool } from "@/lib/skills/tools"
import { requireAuth } from "@/lib/auth/api-middleware"
import { createLogger } from "@/lib/logger"
import type Anthropic from "@anthropic-ai/sdk"

export const runtime = "nodejs"
export const maxDuration = 60

const logger = createLogger("chat")

interface ChatMessage {
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
      messages: ChatMessage[]
      stream?: boolean
    }

    if (!messages || messages.length === 0) {
      return Response.json({ error: "Messages are required" }, { status: 400 })
    }

    const anthropic = getAnthropicClient()
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // Convert to Anthropic message format
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    if (stream) {
      return streamingResponse(anthropic, anthropicMessages, baseUrl)
    } else {
      return nonStreamingResponse(anthropic, anthropicMessages, baseUrl)
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
  anthropic: Anthropic,
  messages: Anthropic.MessageParam[],
  baseUrl: string
) {
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        let currentMessages = [...messages]
        let iterations = 0
        const MAX_ITERATIONS = 10

        while (iterations < MAX_ITERATIONS) {
          iterations++

          // Create streaming message
          const stream = await anthropic.messages.create({
            model: AI_MODEL,
            max_tokens: TOKEN_LIMITS.toolUse,
            system: SYSTEM_PROMPT,
            tools: skillTools,
            messages: currentMessages,
            stream: true,
          })

          let fullText = ""
          let toolUseBlocks: Array<{
            id: string
            name: string
            input: Record<string, unknown>
          }> = []
          let currentToolUse: {
            id: string
            name: string
            inputJson: string
          } | null = null

          for await (const event of stream) {
            if (event.type === "content_block_start") {
              if (event.content_block.type === "tool_use") {
                currentToolUse = {
                  id: event.content_block.id,
                  name: event.content_block.name,
                  inputJson: "",
                }
                send({ type: "tool_start", name: event.content_block.name })
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                fullText += event.delta.text
                send({ type: "text", content: event.delta.text })
              } else if (
                event.delta.type === "input_json_delta" &&
                currentToolUse
              ) {
                currentToolUse.inputJson += event.delta.partial_json
              }
            } else if (event.type === "content_block_stop") {
              if (currentToolUse) {
                try {
                  const input = JSON.parse(currentToolUse.inputJson || "{}")
                  toolUseBlocks.push({
                    id: currentToolUse.id,
                    name: currentToolUse.name,
                    input,
                  })
                } catch {
                  // Ignore parse errors
                }
                currentToolUse = null
              }
            } else if (event.type === "message_stop") {
              // Message complete
            }
          }

          // If we have tool calls, execute them and continue
          if (toolUseBlocks.length > 0) {
            // Add assistant message with tool use
            currentMessages.push({
              role: "assistant",
              content: [
                ...(fullText ? [{ type: "text" as const, text: fullText }] : []),
                ...toolUseBlocks.map((tool) => ({
                  type: "tool_use" as const,
                  id: tool.id,
                  name: tool.name,
                  input: tool.input,
                })),
              ],
            })

            // Execute tools and get results
            const toolResults: Anthropic.ToolResultBlockParam[] = []
            for (const tool of toolUseBlocks) {
              send({ type: "tool_executing", name: tool.name })
              const result = await executeTool(tool.name, tool.input, baseUrl)
              send({
                type: "tool_result",
                name: tool.name,
                success: result.success,
              })

              toolResults.push({
                type: "tool_result",
                tool_use_id: tool.id,
                content: JSON.stringify(
                  result.success ? result.data : { error: result.error }
                ),
              })
            }

            // Add tool results
            currentMessages.push({
              role: "user",
              content: toolResults,
            })

            // Reset for next iteration
            toolUseBlocks = []
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
  anthropic: Anthropic,
  messages: Anthropic.MessageParam[],
  baseUrl: string
) {
  let currentMessages = [...messages]
  let iterations = 0
  const MAX_ITERATIONS = 10
  let finalText = ""

  while (iterations < MAX_ITERATIONS) {
    iterations++

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: TOKEN_LIMITS.toolUse,
      system: SYSTEM_PROMPT,
      tools: skillTools,
      messages: currentMessages,
    })

    // Extract text and tool use blocks
    const textBlocks = response.content.filter((b) => b.type === "text")
    const toolBlocks = response.content.filter((b) => b.type === "tool_use")

    finalText += textBlocks.map((b) => extractText({ content: [b] } as Anthropic.Message)).join("")

    if (toolBlocks.length > 0 && response.stop_reason === "tool_use") {
      // Add assistant message
      currentMessages.push({
        role: "assistant",
        content: response.content,
      })

      // Execute tools
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of toolBlocks) {
        if (block.type === "tool_use") {
          const result = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
            baseUrl
          )
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(
              result.success ? result.data : { error: result.error }
            ),
          })
        }
      }

      currentMessages.push({
        role: "user",
        content: toolResults,
      })
    } else {
      // Done
      break
    }
  }

  return Response.json({ content: finalText })
}
