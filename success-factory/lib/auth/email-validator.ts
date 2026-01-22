// Allowed email domains for registration and login
export const ALLOWED_EMAIL_DOMAINS = ["moovsapp.com", "swoop.com"]

/**
 * Check if an email address is from an allowed domain
 */
export function isAllowedEmailDomain(email: string): boolean {
  if (!email) return false
  const domain = email.toLowerCase().split("@")[1]
  return ALLOWED_EMAIL_DOMAINS.includes(domain)
}

/**
 * Get the domain from an email address
 */
export function getEmailDomain(email: string): string | null {
  if (!email || !email.includes("@")) return null
  return email.toLowerCase().split("@")[1]
}
