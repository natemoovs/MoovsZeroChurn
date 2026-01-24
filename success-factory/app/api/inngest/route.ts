import { serve } from "inngest/next"
import { inngest, functions } from "@/lib/inngest"

// Create the Inngest serve handler
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
})
