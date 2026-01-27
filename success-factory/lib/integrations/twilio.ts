/**
 * Twilio SMS Integration Client
 *
 * Fetches SMS message history for contacts.
 * Used by Operator Hub to show communication history.
 *
 * API Docs: https://www.twilio.com/docs/sms/api/message-resource
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN

const BASE_URL = "https://api.twilio.com/2010-04-01"

// ============================================================================
// Types
// ============================================================================

export interface TwilioMessage {
  sid: string
  account_sid: string
  body: string
  from: string
  to: string
  status: TwilioMessageStatus
  direction: TwilioMessageDirection
  date_created: string
  date_sent: string | null
  date_updated: string
  price: string | null
  price_unit: string | null
  error_code: number | null
  error_message: string | null
  num_segments: string
  num_media: string
  uri: string
}

export type TwilioMessageStatus =
  | "accepted"
  | "queued"
  | "sending"
  | "sent"
  | "failed"
  | "delivered"
  | "undelivered"
  | "receiving"
  | "received"
  | "read"

export type TwilioMessageDirection =
  | "inbound"
  | "outbound-api"
  | "outbound-call"
  | "outbound-reply"

export interface TwilioMessageList {
  messages: TwilioMessage[]
  end: number
  first_page_uri: string
  next_page_uri: string | null
  page: number
  page_size: number
  previous_page_uri: string | null
  start: number
  uri: string
}

export interface TwilioCombinedMessages {
  metadata: {
    total_messages: number
    total_incoming: number
    total_outgoing: number
    total_cost_usd: string
    date_range: {
      newest: string | null
      oldest: string | null
    }
  }
  messages: TwilioMessageWithType[]
}

export interface TwilioMessageWithType extends TwilioMessage {
  message_type: "incoming" | "outgoing"
  timestamp: number
}

export interface TwilioError {
  code: number
  message: string
  more_info: string
  status: number
}

// ============================================================================
// Client
// ============================================================================

class TwilioClient {
  private accountSid: string | undefined
  private authToken: string | undefined

  constructor() {
    this.accountSid = TWILIO_ACCOUNT_SID
    this.authToken = TWILIO_AUTH_TOKEN
  }

  /**
   * Check if Twilio is configured
   */
  isConfigured(): boolean {
    return !!(this.accountSid && this.authToken)
  }

  /**
   * Make authenticated request to Twilio API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.accountSid || !this.authToken) {
      throw new Error("Twilio not configured: missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN")
    }

    const url = `${BASE_URL}/Accounts/${this.accountSid}${endpoint}`
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64")

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
        status: response.status,
      }))
      throw new Error(
        `Twilio API error: ${error.message || response.statusText} (${response.status})`
      )
    }

    return response.json()
  }

  /**
   * Get messages sent TO a phone number
   */
  async getMessagesTo(phoneNumber: string, limit = 100): Promise<TwilioMessageList> {
    const params = new URLSearchParams({
      To: this.normalizePhoneNumber(phoneNumber),
      PageSize: limit.toString(),
    })
    return this.request<TwilioMessageList>(`/Messages.json?${params}`)
  }

  /**
   * Get messages sent FROM a phone number
   */
  async getMessagesFrom(phoneNumber: string, limit = 100): Promise<TwilioMessageList> {
    const params = new URLSearchParams({
      From: this.normalizePhoneNumber(phoneNumber),
      PageSize: limit.toString(),
    })
    return this.request<TwilioMessageList>(`/Messages.json?${params}`)
  }

  /**
   * Get all messages for a phone number (both to and from)
   * Combined and sorted by date
   */
  async getMessageHistory(phoneNumber: string, limit = 100): Promise<TwilioCombinedMessages> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber)

    // Fetch messages to and from in parallel
    const [toMessages, fromMessages] = await Promise.all([
      this.getMessagesTo(normalizedPhone, limit),
      this.getMessagesFrom(normalizedPhone, limit),
    ])

    // Mark message types and add timestamps
    const incomingMessages: TwilioMessageWithType[] = fromMessages.messages.map((msg) => ({
      ...msg,
      message_type: "incoming" as const,
      timestamp: new Date(msg.date_created).getTime(),
    }))

    const outgoingMessages: TwilioMessageWithType[] = toMessages.messages.map((msg) => ({
      ...msg,
      message_type: "outgoing" as const,
      timestamp: new Date(msg.date_created).getTime(),
    }))

    // Combine and sort by date (newest first)
    const allMessages = [...incomingMessages, ...outgoingMessages]
    const sortedMessages = allMessages.sort((a, b) => b.timestamp - a.timestamp)

    // Calculate metadata
    const totalCost = sortedMessages.reduce((sum, msg) => {
      const price = parseFloat(msg.price || "0")
      return sum + Math.abs(price)
    }, 0)

    return {
      metadata: {
        total_messages: sortedMessages.length,
        total_incoming: incomingMessages.length,
        total_outgoing: outgoingMessages.length,
        total_cost_usd: totalCost.toFixed(4),
        date_range: {
          newest: sortedMessages[0]?.date_created || null,
          oldest: sortedMessages[sortedMessages.length - 1]?.date_created || null,
        },
      },
      messages: sortedMessages,
    }
  }

  /**
   * Get a single message by SID
   */
  async getMessage(messageSid: string): Promise<TwilioMessage> {
    return this.request<TwilioMessage>(`/Messages/${messageSid}.json`)
  }

  /**
   * Normalize phone number to E.164 format
   * Ensures phone number starts with +
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, "")

    // If doesn't start with +, assume US and add +1
    if (!cleaned.startsWith("+")) {
      // If starts with 1 and is 11 digits, just add +
      if (cleaned.startsWith("1") && cleaned.length === 11) {
        cleaned = "+" + cleaned
      } else if (cleaned.length === 10) {
        // 10 digit US number, add +1
        cleaned = "+1" + cleaned
      } else {
        // Just add + and hope for the best
        cleaned = "+" + cleaned
      }
    }

    return cleaned
  }
}

// Export singleton instance
export const twilio = new TwilioClient()
