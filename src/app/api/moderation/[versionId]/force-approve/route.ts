import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canForceApprove } from '@/lib/permissions'
import { REPUTATION_REWARDS } from '@/lib/governance'
import { applyReputationEvent, evaluateUserPromotions } from '@/lib/reputation'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    versionId: string
  }>
}

// Input validation schema
const forceApproveSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(1000, 'Reason must be less than 1000 characters'),
})

/**
 * POST /api/moderation/[versionId]/force-approve
 * Force approve a version (JUDGE+ only)
 * Bypasses normal voting thresholds
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check JUDGE+ role
    if (!canForceApprove(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. JUDGE role or higher required.' },
        { status: 403 }
      )
    }

    const { versionId } = await params

    if (!versionId) {
      return NextResponse.json(
        { error: 'Version ID is required' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const parseResult = forceApproveSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 }
      )
    }

    const { reason } = parseResult.data

    // Get the article version
    const articleVersion = await prisma.articleVersion.findUnique({
      where: { id: versionId },
      include: {
        article: {
          include: {
            author: true,
          },
        },
        createdBy: true,
        votes: {
          include: {
            user: {
              select: {
                id: true,
                role: true,
              },
            },
          },
        },
      },
    })

    if (!articleVersion) {
      return NextResponse.json(
        { error: 'Article version not found' },
        { status: 404 }
      )
    }

    if (articleVersion.article.status !== 'UNDER_REVIEW') {
      return NextResponse.json(
        { error: 'Article is not under review' },
        { status: 400 }
      )
    }

    // Perform the force approve in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update article status to PUBLISHED and set current version
      const updatedArticle = await tx.article.update({
        where: { id: articleVersion.articleId },
        data: {
          status: 'PUBLISHED',
          currentVersionId: versionId,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          currentVersion: true,
        },
      })

      // Log moderation action
      await tx.moderationAction.create({
        data: {
          articleVersionId: versionId,
          userId: session.user.id,
          action: 'FORCE_APPROVED',
          reason: reason.trim(),
        },
      })

      return updatedArticle
    })

    // Apply reputation events
    // Reward the author
    await applyReputationEvent(
      articleVersion.createdBy.id,
      'ARTICLE_MERGED',
      REPUTATION_REWARDS.ARTICLE_MERGED,
      {
        articleId: articleVersion.articleId,
        articleVersionId: versionId,
        reason: 'Force approved by ' + session.user.role,
      }
    )

    // Check for author promotion
    await evaluateUserPromotions(articleVersion.createdBy.id)

    // Reward approving voters (positive votes)
    const positiveVoters = articleVersion.votes.filter((v) => v.value > 0)
    for (const vote of positiveVoters) {
      await applyReputationEvent(
        vote.user.id,
        'UPVOTE',
        REPUTATION_REWARDS.UPVOTE,
        {
          articleId: articleVersion.articleId,
          articleVersionId: versionId,
          reason: 'Approved vote on force-approved article',
        }
      )

      // Check for voter promotion
      await evaluateUserPromotions(vote.user.id)
    }

    return NextResponse.json({
      success: true,
      article: result,
      action: 'FORCE_APPROVED',
    })
  } catch (error) {
    console.error('Error force approving article:', error)
    return NextResponse.json(
      { error: 'Failed to force approve article' },
      { status: 500 }
    )
  }
}
