import Link from 'next/link'
import type { Article, ArticleVersion, User, Vote } from '@prisma/client'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn, formatDate, truncate, getInitials } from '@/lib/utils'
import { ArrowUp, ArrowDown, Eye } from 'lucide-react'

type ArticleWithRelations = Article & {
  author: Pick<User, 'id' | 'name' | 'image'>
  currentVersion?: (ArticleVersion & {
    votes: Vote[]
  }) | null
}

interface ArticleCardProps {
  article: ArticleWithRelations
  className?: string
}

// Map category to display name
const categoryLabels: Record<string, string> = {
  FOUNDATIONS: 'Foundations',
  SYSTEMS: 'Systems',
  APPLIED: 'Applied',
  MLOPS: 'MLOps',
  SAFETY: 'Safety',
  BENCHMARKS: 'Benchmarks',
  CASE_STUDIES: 'Case Studies',
  CAREER: 'Career',
}

// Map status to badge variant
const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  UNDER_REVIEW: 'outline',
  PUBLISHED: 'default',
  REJECTED: 'destructive',
}

export function ArticleCard({ article, className }: ArticleCardProps) {
  // Calculate vote score from current version
  const voteScore = article.currentVersion?.votes?.reduce(
    (acc, vote) => acc + vote.value,
    0
  ) ?? 0

  const authorInitials = article.author.name
    ? getInitials(article.author.name)
    : '?'

  return (
    <Link href={`/articles/${article.slug}`}>
      <Card className={cn(
        'h-full transition-all hover:shadow-md hover:border-primary/50',
        className
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold text-lg leading-tight line-clamp-2">
                {article.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {categoryLabels[article.category] || article.category}
                </Badge>
                {article.status !== 'PUBLISHED' && (
                  <Badge variant={statusVariants[article.status]}>
                    {article.status.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col items-center text-muted-foreground">
              <ArrowUp className={cn(
                'h-4 w-4',
                voteScore > 0 && 'text-green-600'
              )} />
              <span className={cn(
                'text-sm font-medium',
                voteScore > 0 && 'text-green-600',
                voteScore < 0 && 'text-red-600'
              )}>
                {voteScore}
              </span>
              <ArrowDown className={cn(
                'h-4 w-4',
                voteScore < 0 && 'text-red-600'
              )} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {truncate(article.summary, 150)}
          </p>

          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {article.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {article.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{article.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-0">
          <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={article.author.image || undefined} />
                <AvatarFallback className="text-xs">
                  {authorInitials}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[120px]">
                {article.author.name || 'Anonymous'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                <span>{article.viewCount}</span>
              </div>
              <span>{formatDate(article.createdAt)}</span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}
