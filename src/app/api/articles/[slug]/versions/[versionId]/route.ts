import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isRoleAtLeast } from '@/lib/permissions'
import { ROLE_WEIGHTS } from '@/lib/governance'

interface RouteParams {
  params: Promise<{ slug: string; versionId: string }>
}

// GET /api/articles/[slug]/versions/[versionId] - Get specific version with vote score breakdown
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, versionId } = await params
    const session = await getServerSession()

    // Find the article first
    const article = await prisma.article.findUnique({
      where: { slug },
      select: {
        id: true,
        status: true,
        authorId: true,
      }
    })

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Check if user can view non-published articles
    if (article.status !== 'PUBLISHED') {
      const isAuthor = session?.user?.id === article.authorId
      const isReviewerOrAbove = session?.user?.role && isRoleAtLeast(session.user.role, 'REVIEWER')

      if (!isAuthor && !isReviewerOrAbove) {
        return NextResponse.json(
          { error: 'Article not found' },
          { status: 404 }
        )
      }
    }

    // Fetch the specific version with votes
    const version = await prisma.articleVersion.findFirst({
      where: {
        id: versionId,
        articleId: article.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          }
        },
        votes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
              }
            }
          }
        },
        moderationActions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }

    // Calculate vote score breakdown
    const voteBreakdown = {
      totalVotes: version.votes.length,
      upvotes: 0,
      downvotes: 0,
      rawScore: 0,
      weightedScore: 0,
      byRole: {} as Record<string, { count: number; weightedScore: number }>
    }

    for (const vote of version.votes) {
      if (vote.value > 0) {
        voteBreakdown.upvotes++
      } else {
        voteBreakdown.downvotes++
      }

      voteBreakdown.rawScore += vote.value

      const roleWeight = ROLE_WEIGHTS[vote.user.role]
      const weightedValue = vote.value * roleWeight
      voteBreakdown.weightedScore += weightedValue

      // Breakdown by role
      if (!voteBreakdown.byRole[vote.user.role]) {
        voteBreakdown.byRole[vote.user.role] = { count: 0, weightedScore: 0 }
      }
      voteBreakdown.byRole[vote.user.role].count++
      voteBreakdown.byRole[vote.user.role].weightedScore += weightedValue
    }

    // Remove votes details for non-reviewers (only show summary)
    const isReviewerOrAbove = session?.user?.role && isRoleAtLeast(session.user.role, 'REVIEWER')

    const response = {
      id: version.id,
      versionNumber: version.versionNumber,
      bodyMdx: version.bodyMdx,
      changelog: version.changelog,
      createdAt: version.createdAt,
      createdBy: version.createdBy,
      voteBreakdown,
      // Only include detailed votes and moderation actions for reviewers+
      ...(isReviewerOrAbove ? {
        votes: version.votes.map((v: typeof version.votes[number]) => ({
          id: v.id,
          value: v.value,
          createdAt: v.createdAt,
          user: v.user
        })),
        moderationActions: version.moderationActions
      } : {
        // For non-reviewers, only show if user has voted
        userVote: session?.user?.id
          ? version.votes.find((v: typeof version.votes[number]) => v.userId === session.user.id)?.value || null
          : null
      })
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching version:', error)
    return NextResponse.json(
      { error: 'Failed to fetch version' },
      { status: 500 }
    )
  }
}
