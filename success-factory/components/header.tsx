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
  backLabel = "Back to skills"
}: HeaderProps) {
  return (
    <header className="fixed right-0 top-0 z-50 flex items-center gap-4 p-4">
      {showBack && (
        <Link
          href={backHref}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          &larr; {backLabel}
        </Link>
      )}
      <ThemeToggle />
    </header>
  )
}
