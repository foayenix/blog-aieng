import Link from "next/link"
import { Github } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col items-center justify-between gap-4 py-6 md:h-16 md:flex-row md:py-0">
        <p className="text-sm text-muted-foreground">
          &copy; {currentYear} AI Engineering Commons. All rights reserved.
        </p>

        <nav className="flex items-center gap-4">
          <Link
            href="/about"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            About
          </Link>
          <Link
            href="/contributing"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Contributing
          </Link>
          <Link
            href="https://github.com/ai-engineering-commons"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="h-4 w-4" />
            GitHub
          </Link>
        </nav>
      </div>
    </footer>
  )
}
