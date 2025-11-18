import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessModeration } from '@/lib/permissions'
import { calculateVersionScore, checkApprovalThresholds } from '@/lib/voting'
import { MERGE_THRESHOLDS } from '@/lib/governance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { VoteBreakdown } from '@/components/moderation/vote-breakdown'
import { ActionButtons } from '@/components/moderation/action-buttons'

interface PageProps {
  params: Promise<{
    versionId: string
  }>
}

export default async function VersionDetailPage({ params }: PageProps) {
  const session = await getServerSession()

  if (!session?.user) {
    redirect('/auth/signin')
  }

  if (!canAccessModeration(session.user.role)) {
    redirect('/')
  }

  // Await params in Next.js 15+
  const { versionId } = await params

  const version = await prisma.articleVersion.findUnique({
    where: { id: versionId },
    include: {
      article: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      votes: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      moderationActions: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  if (!version) {
    notFound()
  }

  // Calculate vote score breakdown
  const { totalScore, breakdownByRole, voteCount } = await calculateVersionScore(versionId)
  const thresholdResult = await checkApprovalThresholds(versionId)

  // Check if user has voted
  const userVote = version.votes.find((v) => v.user.id === session.user.id)

  const isUnderReview = version.article.status === 'UNDER_REVIEW'

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/moderation">
            Back to Moderation
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Article Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{version.article.title}</CardTitle>
                  <CardDescription className="mt-1">
                    Version {version.versionNumber} by {version.createdBy.name || version.createdBy.email}
                  </CardDescription>
                </div>
                <Badge variant={isUnderReview ? 'default' : 'secondary'}>
                  {version.article.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">Category:</span>{' '}
                  {version.article.category.replace('_', ' ')}
                </div>
                <div>
                  <span className="font-medium">Submitted:</span>{' '}
                  {formatDistanceToNow(version.createdAt, { addSuffix: true })}
                </div>
                <div>
                  <span className="font-medium">Original Author:</span>{' '}
                  {version.article.author.name || version.article.author.email}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Content Preview</CardTitle>
              {version.changelog && (
                <CardDescription>
                  Changelog: {version.changelog}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg text-sm overflow-auto max-h-[500px]">
                  {version.bodyMdx}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Moderation History */}
          <Card>
            <CardHeader>
              <CardTitle>Moderation History</CardTitle>
              <CardDescription>
                Actions taken on this version
              </CardDescription>
            </CardHeader>
            <CardContent>
              {version.moderationActions.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No moderation actions yet
                </p>
              ) : (
                <div className="space-y-4">
                  {version.moderationActions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-start justify-between border-b pb-3 last:border-0"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              action.action.includes('APPROVED')
                                ? 'default'
                                : 'destructive'
                            }
                          >
                            {action.action.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm font-medium">
                            {action.user.name || action.user.email}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {action.user.role}
                          </Badge>
                        </div>
                        {action.reason && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {action.reason}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(action.createdAt, { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Vote Breakdown */}
          <Card>
            <CardContent className="pt-6">
              <VoteBreakdown
                breakdown={breakdownByRole}
                totalScore={totalScore}
                voteCount={voteCount}
              />
            </CardContent>
          </Card>

          {/* Threshold Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Approval Thresholds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Score</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${thresholdResult.meetsScoreThreshold ? 'text-green-600' : ''}`}>
                    {thresholdResult.thresholds.currentScore} / {thresholdResult.thresholds.requiredScore}
                  </span>
                  {thresholdResult.meetsScoreThreshold && (
                    <Badge variant="default" className="text-xs">Met</Badge>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Reviewer Approvals</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${thresholdResult.meetsReviewerThreshold ? 'text-green-600' : ''}`}>
                    {thresholdResult.thresholds.currentReviewerApprovals} / {thresholdResult.thresholds.requiredReviewerApprovals}
                  </span>
                  {thresholdResult.meetsReviewerThreshold && (
                    <Badge variant="default" className="text-xs">Met</Badge>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Judge Approvals</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${thresholdResult.meetsJudgeThreshold ? 'text-green-600' : ''}`}>
                    {thresholdResult.thresholds.currentJudgeApprovals} / {thresholdResult.thresholds.requiredJudgeApprovals}
                  </span>
                  {thresholdResult.meetsJudgeThreshold && (
                    <Badge variant="default" className="text-xs">Met</Badge>
                  )}
                </div>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Overall</span>
                <Badge variant={thresholdResult.meetsRequirements ? 'default' : 'secondary'}>
                  {thresholdResult.meetsRequirements ? 'Ready to Approve' : 'Pending'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {isUnderReview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <ActionButtons
                  versionId={versionId}
                  userRole={session.user.role}
                  hasVoted={!!userVote}
                  userVoteValue={userVote?.value}
                  meetsThresholds={thresholdResult.meetsRequirements}
                />
              </CardContent>
            </Card>
          )}

          {/* Vote List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Votes ({version.votes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {version.votes.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No votes yet
                </p>
              ) : (
                <div className="space-y-2">
                  {version.votes.map((vote) => (
                    <div
                      key={vote.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span>{vote.user.name || vote.user.email}</span>
                        <Badge variant="outline" className="text-xs">
                          {vote.user.role}
                        </Badge>
                      </div>
                      <span
                        className={`font-medium ${
                          vote.value > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {vote.value > 0 ? '+1' : '-1'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
