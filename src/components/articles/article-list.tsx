import type { Article, ArticleVersion, User, Vote } from '@prisma/client'
import { ArticleCard } from './article-card'
import { cn } from '@/lib/utils'
import { FileText } from 'lucide-react'

type ArticleWithRelations = Article & {
  author: Pick<User, 'id' | 'name' | 'image'>
  currentVersion?: (ArticleVersion & {
    votes: Vote[]
  }) | null
}

interface ArticleListProps {
  articles: ArticleWithRelations[]
  className?: string
  emptyMessage?: string
}

export function ArticleList({
  articles,
  className,
  emptyMessage = 'No articles found'
}: ArticleListProps) {
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-lg font-medium text-muted-foreground">
          {emptyMessage}
        </p>
        <p className="text-sm text-muted-foreground/75 mt-1">
          Check back later or try a different filter.
        </p>
      </div>
    )
  }

  return (
    <div className={cn(
      'grid gap-6 sm:grid-cols-2 lg:grid-cols-3',
      className
    )}>
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  )
}
