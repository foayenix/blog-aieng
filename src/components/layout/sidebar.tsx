"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArticleCategory } from "@prisma/client"
import {
  BookOpen,
  Cpu,
  Rocket,
  Server,
  Shield,
  BarChart3,
  FileText,
  Briefcase,
} from "lucide-react"
import { cn } from "@/lib/utils"

const categoryConfig: Record<
  ArticleCategory,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  FOUNDATIONS: { label: "Foundations", icon: BookOpen },
  SYSTEMS: { label: "Systems", icon: Server },
  APPLIED: { label: "Applied AI", icon: Rocket },
  MLOPS: { label: "MLOps", icon: Cpu },
  SAFETY: { label: "Safety", icon: Shield },
  BENCHMARKS: { label: "Benchmarks", icon: BarChart3 },
  CASE_STUDIES: { label: "Case Studies", icon: FileText },
  CAREER: { label: "Career", icon: Briefcase },
}

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const searchParams = useSearchParams()
  const activeCategory = searchParams.get("category")

  return (
    <aside className={cn("w-64 shrink-0", className)}>
      <div className="sticky top-20 space-y-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Categories
          </h2>
          <nav className="space-y-1">
            <Link
              href="/articles"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                !activeCategory
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <FileText className="h-4 w-4" />
              All Articles
            </Link>
            {Object.entries(categoryConfig).map(([key, { label, icon: Icon }]) => {
              const isActive = activeCategory === key
              return (
                <Link
                  key={key}
                  href={`/articles?category=${key}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </aside>
  )
}
