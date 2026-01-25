import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Playbook action type
interface PlaybookAction {
  type: "create_task"
  title: string
  description?: string
  priority: "low" | "medium" | "high" | "urgent"
  dueInDays?: number
}

/**
 * Execute playbooks for NPS detractors
 */
async function executeDetractorPlaybooks(survey: {
  companyId: string
  companyName: string
  score: number
  contactEmail: string
}) {
  try {
    const playbooks = await prisma.playbook.findMany({
      where: {
        trigger: "nps_detractor",
        isActive: true,
      },
    })

    for (const playbook of playbooks) {
      const actions = playbook.actions as unknown as PlaybookAction[]

      for (const action of actions) {
        if (action.type === "create_task") {
          const dueDate = action.dueInDays
            ? new Date(Date.now() + action.dueInDays * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // Default: 1 day for detractors

          await prisma.task.create({
            data: {
              companyId: survey.companyId,
              companyName: survey.companyName,
              title: action.title
                .replace("{companyName}", survey.companyName)
                .replace("{score}", String(survey.score))
                .replace("{contactEmail}", survey.contactEmail),
              description: action.description
                ?.replace("{companyName}", survey.companyName)
                .replace("{score}", String(survey.score))
                .replace("{contactEmail}", survey.contactEmail),
              priority: action.priority || "high",
              status: "pending",
              dueDate,
              playbookId: playbook.id,
              metadata: {
                trigger: "nps_detractor",
                npsScore: survey.score,
                contactEmail: survey.contactEmail,
                createdBy: "playbook",
              },
            },
          })
        }
      }
    }
  } catch (error) {
    console.error("NPS playbook execution error:", error)
  }
}

function getCategory(score: number): string {
  if (score >= 9) return "promoter"
  if (score >= 7) return "passive"
  return "detractor"
}

/**
 * Handle NPS response from email click
 * GET /api/nps/respond?token=xxx&score=8
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")
  const scoreStr = searchParams.get("score")

  if (!token || scoreStr === null) {
    return new NextResponse(
      renderPage("Invalid Link", "This survey link is invalid or expired.", "error"),
      { headers: { "Content-Type": "text/html" } }
    )
  }

  const score = parseInt(scoreStr)
  if (isNaN(score) || score < 0 || score > 10) {
    return new NextResponse(
      renderPage("Invalid Score", "Please use a score between 0 and 10.", "error"),
      { headers: { "Content-Type": "text/html" } }
    )
  }

  try {
    const survey = await prisma.nPSSurvey.findUnique({
      where: { token },
    })

    if (!survey) {
      return new NextResponse(
        renderPage("Survey Not Found", "This survey link is invalid or expired.", "error"),
        { headers: { "Content-Type": "text/html" } }
      )
    }

    // Update survey with response
    const category = getCategory(score)
    await prisma.nPSSurvey.update({
      where: { token },
      data: {
        score,
        category,
        respondedAt: new Date(),
      },
    })

    // Trigger detractor playbook if score <= 6
    if (score <= 6) {
      await executeDetractorPlaybooks({
        companyId: survey.companyId,
        companyName: survey.companyName,
        score,
        contactEmail: survey.contactEmail,
      })
    }

    // Show thank you page with optional comment form
    const thankYouPage = renderThankYouPage(token, score, category)
    return new NextResponse(thankYouPage, {
      headers: { "Content-Type": "text/html" },
    })
  } catch (error) {
    console.error("NPS respond error:", error)
    return new NextResponse(
      renderPage("Error", "Something went wrong. Please try again.", "error"),
      { headers: { "Content-Type": "text/html" } }
    )
  }
}

/**
 * Save optional comment
 * POST /api/nps/respond
 * Body: { token, comment }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, comment } = body as { token: string; comment: string }

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    await prisma.nPSSurvey.update({
      where: { token },
      data: { comment },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("NPS comment error:", error)
    return NextResponse.json({ error: "Failed to save comment" }, { status: 500 })
  }
}

function renderPage(title: string, message: string, type: "success" | "error"): string {
  const color = type === "success" ? "#22c55e" : "#ef4444"
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fafafa; }
        .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
        h1 { color: ${color}; margin-bottom: 16px; }
        p { color: #71717a; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>${title}</h1>
        <p>${message}</p>
      </div>
    </body>
    </html>
  `
}

function renderThankYouPage(token: string, score: number, category: string): string {
  const emoji = category === "promoter" ? "🎉" : category === "passive" ? "👍" : "🙏"
  const message =
    category === "promoter"
      ? "We're thrilled you're having a great experience!"
      : category === "passive"
        ? "Thanks for your feedback!"
        : "We're sorry to hear that. We'd love to make things right."

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Thank You!</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fafafa; }
        .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 500px; width: 90%; }
        h1 { color: #18181b; margin-bottom: 8px; }
        .emoji { font-size: 48px; margin-bottom: 16px; }
        .score { background: #f4f4f5; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-bottom: 16px; }
        p { color: #71717a; margin-bottom: 24px; }
        textarea { width: 100%; padding: 12px; border: 1px solid #e4e4e7; border-radius: 8px; resize: vertical; min-height: 100px; font-family: inherit; box-sizing: border-box; }
        button { background: #18181b; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; margin-top: 16px; }
        button:hover { background: #27272a; }
        .success { color: #22c55e; display: none; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="emoji">${emoji}</div>
        <h1>Thank You!</h1>
        <div class="score">You rated us: <strong>${score}/10</strong></div>
        <p>${message}</p>
        <form id="commentForm">
          <textarea id="comment" placeholder="Any additional feedback? (optional)"></textarea>
          <button type="submit">Submit Feedback</button>
        </form>
        <p class="success" id="successMsg">Thanks for your feedback!</p>
      </div>
      <script>
        document.getElementById('commentForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const comment = document.getElementById('comment').value;
          if (!comment.trim()) {
            document.getElementById('successMsg').style.display = 'block';
            document.getElementById('commentForm').style.display = 'none';
            return;
          }
          try {
            await fetch('/api/nps/respond', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: '${token}', comment })
            });
            document.getElementById('successMsg').style.display = 'block';
            document.getElementById('commentForm').style.display = 'none';
          } catch (err) {
            alert('Failed to save comment');
          }
        });
      </script>
    </body>
    </html>
  `
}
