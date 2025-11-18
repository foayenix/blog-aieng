import Link from 'next/link'
import type { Article, ArticleVersion, User, Vote } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { cn, formatDate, getInitials } from '@/lib/utils'
import {
  Calendar,
  Eye,
  ArrowUp,
  ArrowDown,
  Pencil,
  Tag,
  FolderOpen
} from 'lucide-react'

type ArticleWithRelations = Article & {
  author: User
  currentVersion?: (ArticleVersion & {
    votes: Vote[]
  }) | null
}

interface ArticleMetaProps {
  article: ArticleWithRelations
  canEdit?: boolean
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

export function ArticleMeta({ article, canEdit = false, className }: ArticleMetaProps) {
  // Calculate vote score from current version
  const voteScore = article.currentVersion?.votes?.reduce(
    (acc, vote) => acc + vote.value,
    0
  ) ?? 0

  const authorInitials = article.author.name
    ? getInitials(article.author.name)
    : '?'

  return (
    <div className={cn('space-y-4', className)}>
      {/* Author Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={article.author.image || undefined} />
            <AvatarFallback>{authorInitials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">
              {article.author.name || 'Anonymous'}
            </p>
            <p className="text-sm text-muted-foreground">
              {article.author.reputation} reputation
            </p>
          </div>
        </div>

        {canEdit && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/articles/${article.slug}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      <Separator />

      {/* Stats Row */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {/* Date */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(article.createdAt)}</span>
        </div>

        {/* View Count */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span>{article.viewCount} views</span>
        </div>

        {/* Vote Score */}
        <div className="flex items-center gap-1.5">
          {voteScore >= 0 ? (
            <ArrowUp className={cn(
              'h-4 w-4',
              voteScore > 0 ? 'text-green-600' : 'text-muted-foreground'
            )} />
          ) : (
            <ArrowDown className="h-4 w-4 text-red-600" />
          )}
          <span className={cn(
            'font-medium',
            voteScore > 0 && 'text-green-600',
            voteScore < 0 && 'text-red-600',
            voteScore === 0 && 'text-muted-foreground'
          )}>
            {voteScore > 0 ? '+' : ''}{voteScore}
          </span>
        </div>
      </div>

      <Separator />

      {/* Category */}
      <div className="flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Category:</span>
        <Badge variant="secondary">
          {categoryLabels[article.category] || article.category}
        </Badge>
      </div>

      {/* Tags */}
      {article.tags.length > 0 && (
        <div className="flex items-start gap-2">
          <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="flex flex-wrap gap-1.5">
            {article.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
