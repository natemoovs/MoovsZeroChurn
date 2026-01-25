import Link from "next/link"
import { ThemeToggle } from "./theme-toggle"

interface HeaderProps {
  showBack?: boolean
  backHref?: string
  backLabel?: string
}

export function Header({
  showBack = false,
  backHref = "/",
  backLabel = "Back to skills",
}: HeaderProps) {
  return (
    <header className="fixed top-0 right-0 z-50 flex items-center gap-4 p-4">
      {showBack && (
        <Link href={backHref} className="text-content-secondary hover:text-content-primary text-sm">
          &larr; {backLabel}
        </Link>
      )}
      <ThemeToggle />
    </header>
  )
}
