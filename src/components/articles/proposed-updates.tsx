'use client'

import type { ArticleVersion, User, Vote, Role } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn, formatDate, getInitials } from '@/lib/utils'
import {
  GitPullRequest,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Users
} from 'lucide-react'

type VoteWithUser = Vote & {
  user: Pick<User, 'id' | 'name' | 'role'>
}

type VersionWithDetails = ArticleVersion & {
  createdBy: Pick<User, 'id' | 'name' | 'image'>
  votes: VoteWithUser[]
}

interface ProposedUpdatesProps {
  versions: VersionWithDetails[]
  canModerate?: boolean
  onApprove?: (versionId: string) => void
  onReject?: (versionId: string) => void
  className?: string
}

// Role weights for voting (higher = more influence)
const roleWeights: Record<Role, number> = {
  READER: 1,
  CONTRIBUTOR: 2,
  REVIEWER: 3,
  JUDGE: 5,
  MAINTAINER: 10,
}

export function ProposedUpdates({
  versions,
  canModerate = false,
  onApprove,
  onReject,
  className,
}: ProposedUpdatesProps) {
  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <GitPullRequest className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          No proposed updates pending review
        </p>
      </div>
    )
  }

  // Sort versions by creation date descending (newest first)
  const sortedVersions = [...versions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <GitPullRequest className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Proposed Updates</h3>
        <Badge variant="secondary" className="ml-auto">
          {versions.length} pending
        </Badge>
      </div>

      <div className="space-y-4">
        {sortedVersions.map((version) => {
          const authorInitials = version.createdBy.name
            ? getInitials(version.createdBy.name)
            : '?'

          // Calculate vote score
          const voteScore = version.votes.reduce(
            (acc, vote) => acc + vote.value,
            0
          )

          // Calculate weighted vote score
          const weightedScore = version.votes.reduce(
            (acc, vote) => acc + vote.value * roleWeights[vote.user.role],
            0
          )

          // Group votes by role
          const votesByRole = version.votes.reduce(
            (acc, vote) => {
              const role = vote.user.role
              if (!acc[role]) {
                acc[role] = { up: 0, down: 0 }
              }
              if (vote.value > 0) {
                acc[role].up += 1
              } else {
                acc[role].down += 1
              }
              return acc
            },
            {} as Record<Role, { up: number; down: number }>
          )

          return (
            <Card key={version.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={version.createdBy.image || undefined} />
                      <AvatarFallback className="text-xs">
                        {authorInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        Version {version.versionNumber}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        by {version.createdBy.name || 'Anonymous'} on{' '}
                        {formatDate(version.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Vote Score */}
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center">
                      <ArrowUp className={cn(
                        'h-4 w-4',
                        voteScore > 0 ? 'text-green-600' : 'text-muted-foreground'
                      )} />
                      <span className={cn(
                        'text-lg font-bold',
                        voteScore > 0 && 'text-green-600',
                        voteScore < 0 && 'text-red-600'
                      )}>
                        {voteScore}
                      </span>
                      <ArrowDown className={cn(
                        'h-4 w-4',
                        voteScore < 0 ? 'text-red-600' : 'text-muted-foreground'
                      )} />
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      <div>weighted</div>
                      <div className="font-medium">{weightedScore}</div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Changelog */}
                {version.changelog && (
                  <p className="text-sm text-muted-foreground">
                    {version.changelog}
                  </p>
                )}

                {/* Vote Breakdown by Role */}
                {Object.keys(votesByRole).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>Vote breakdown by role</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(votesByRole).map(([role, votes]) => (
                          <Badge key={role} variant="outline" className="gap-1.5">
                            <span className="capitalize">
                              {role.toLowerCase()}
                            </span>
                            <span className="text-green-600">+{votes.up}</span>
                            <span className="text-red-600">-{votes.down}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Moderation Actions */}
                {canModerate && (
                  <>
                    <Separator />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReject?.(version.id)}
                        className="gap-1.5"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onApprove?.(version.id)}
                        className="gap-1.5"
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
