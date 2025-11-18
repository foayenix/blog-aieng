import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canForceApprove } from '@/lib/permissions'
import { REPUTATION_REWARDS } from '@/lib/governance'
import { applyReputationEvent, evaluateUserPromotions } from '@/lib/reputation'

/**
 * POST /api/moderation/force
 * Force approve or reject an article version (JUDGE+ only)
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { articleVersionId, action, reason } = body

    if (!articleVersionId || typeof articleVersionId !== 'string') {
      return NextResponse.json(
        { error: 'articleVersionId is required' },
        { status: 400 }
      )
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'reason is required for force actions' },
        { status: 400 }
      )
    }

    // Get the article version
    const articleVersion = await prisma.articleVersion.findUnique({
      where: { id: articleVersionId },
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

    const isApprove = action === 'approve'
    const moderationAction = isApprove ? 'FORCE_APPROVED' : 'FORCE_REJECTED'
    const newStatus = isApprove ? 'PUBLISHED' : 'REJECTED'

    // Perform the force action in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update article status
      const updateData: {
        status: 'PUBLISHED' | 'REJECTED'
        currentVersionId?: string
      } = {
        status: newStatus,
      }

      if (isApprove) {
        updateData.currentVersionId = articleVersionId
      }

      const updatedArticle = await tx.article.update({
        where: { id: articleVersion.articleId },
        data: updateData,
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
          articleVersionId,
          userId: session.user.id,
          action: moderationAction,
          reason: reason.trim(),
        },
      })

      return updatedArticle
    })

    // Apply reputation events for force approve
    if (isApprove) {
      // Reward the author
      await applyReputationEvent(
        articleVersion.createdBy.id,
        'ARTICLE_MERGED',
        REPUTATION_REWARDS.ARTICLE_MERGED,
        {
          articleId: articleVersion.articleId,
          articleVersionId: articleVersionId,
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
            articleVersionId: articleVersionId,
            reason: 'Approved vote on force-merged article',
          }
        )

        // Check for voter promotion
        await evaluateUserPromotions(vote.user.id)
      }
    }

    return NextResponse.json({
      success: true,
      article: result,
      action: moderationAction,
    })
  } catch (error) {
    console.error('Error force moderating article:', error)
    return NextResponse.json(
      { error: 'Failed to force moderate article' },
      { status: 500 }
    )
  }
}
