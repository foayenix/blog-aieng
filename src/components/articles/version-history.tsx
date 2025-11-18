import type { ArticleVersion, User, Article } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { cn, formatDate, getInitials } from '@/lib/utils'
import { History, Check, Clock } from 'lucide-react'

type VersionWithAuthor = ArticleVersion & {
  createdBy: Pick<User, 'id' | 'name' | 'image'>
}

interface VersionHistoryProps {
  versions: VersionWithAuthor[]
  currentVersionId?: string | null
  article?: Pick<Article, 'status'>
  className?: string
  onVersionClick?: (version: VersionWithAuthor) => void
}

export function VersionHistory({
  versions,
  currentVersionId,
  article,
  className,
  onVersionClick,
}: VersionHistoryProps) {
  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <History className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          No version history available
        </p>
      </div>
    )
  }

  // Sort versions by version number descending (newest first)
  const sortedVersions = [...versions].sort(
    (a, b) => b.versionNumber - a.versionNumber
  )

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Version History</h3>
        <Badge variant="secondary" className="ml-auto">
          {versions.length} version{versions.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="space-y-3">
        {sortedVersions.map((version, index) => {
          const isCurrentVersion = version.id === currentVersionId
          const isPublished = isCurrentVersion && article?.status === 'PUBLISHED'
          const authorInitials = version.createdBy.name
            ? getInitials(version.createdBy.name)
            : '?'

          return (
            <div key={version.id}>
              <div
                className={cn(
                  'rounded-lg border p-4 transition-colors',
                  isCurrentVersion && 'border-primary bg-primary/5',
                  onVersionClick && 'cursor-pointer hover:bg-muted/50',
                  !isCurrentVersion && onVersionClick && 'hover:border-muted-foreground/50'
                )}
                onClick={() => onVersionClick?.(version)}
                role={onVersionClick ? 'button' : undefined}
                tabIndex={onVersionClick ? 0 : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={version.createdBy.image || undefined} />
                      <AvatarFallback className="text-xs">
                        {authorInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          v{version.versionNumber}
                        </span>
                        {isPublished && (
                          <Badge className="gap-1">
                            <Check className="h-3 w-3" />
                            Published
                          </Badge>
                        )}
                        {isCurrentVersion && !isPublished && (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        by {version.createdBy.name || 'Anonymous'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(version.createdAt)}
                  </span>
                </div>

                {version.changelog && (
                  <p className="mt-3 text-sm text-muted-foreground pl-11">
                    {version.changelog}
                  </p>
                )}
              </div>

              {index < sortedVersions.length - 1 && (
                <div className="flex justify-center py-1">
                  <div className="w-px h-3 bg-border" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
