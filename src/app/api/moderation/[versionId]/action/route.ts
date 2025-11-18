import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canApproveArticle, canForceApprove } from '@/lib/permissions'
import { approveArticleVersion, checkApprovalThresholds } from '@/lib/voting'
import { applyReputationEvent } from '@/lib/reputation'
import { REPUTATION_REWARDS } from '@/lib/governance'

const actionSchema = z.object({
  action: z.enum(['approve', 'reject', 'force_approve', 'force_reject']),
  reason: z.string().optional(),
})

interface RouteParams {
  params: Promise<{
    versionId: string
  }>
}

/**
 * POST /api/moderation/[versionId]/action
 * Perform a moderation action on an article version
 * Actions: approve, reject, force_approve, force_reject
 * Requires REVIEWER+ role (JUDGE+ for force actions)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    const { versionId } = await params

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!canApproveArticle(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. REVIEWER role or higher required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = actionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { action, reason } = validationResult.data

    // Check force action permissions
    if ((action === 'force_approve' || action === 'force_reject') && !canForceApprove(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. JUDGE role or higher required for force actions.' },
        { status: 403 }
      )
    }

    // Get the article version
    const articleVersion = await prisma.articleVersion.findUnique({
      where: { id: versionId },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
          },
        },
        createdBy: {
          select: {
            id: true,
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

    // Handle different actions
    if (action === 'approve') {
      // Check thresholds for normal approval
      const thresholdResult = await checkApprovalThresholds(versionId)

      if (!thresholdResult.meetsRequirements) {
        return NextResponse.json(
          { error: 'Approval thresholds not met', thresholds: thresholdResult },
          { status: 400 }
        )
      }

      // Use the existing approval function
      const result = await approveArticleVersion(versionId, session.user.id)

      return NextResponse.json({
        message: 'Article approved successfully',
        result,
      })
    }

    if (action === 'force_approve') {
      // Force approval - bypass thresholds
      const result = await prisma.$transaction(async (tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => {
        // Update article status
        const updatedArticle = await tx.article.update({
          where: { id: articleVersion.article.id },
          data: {
            status: 'PUBLISHED',
            currentVersionId: versionId,
          },
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
          },
        })

        // Create moderation action
        const moderationAction = await tx.moderationAction.create({
          data: {
            articleVersionId: versionId,
            userId: session.user.id,
            action: 'FORCE_APPROVED',
            reason,
          },
        })

        // Award reputation to author
        await tx.reputationEvent.create({
          data: {
            userId: articleVersion.createdBy.id,
            type: 'ARTICLE_MERGED',
            delta: REPUTATION_REWARDS.ARTICLE_MERGED,
            metadata: {
              articleId: articleVersion.article.id,
              articleVersionId: versionId,
              forceApproved: true,
            },
          },
        })

        await tx.user.update({
          where: { id: articleVersion.createdBy.id },
          data: {
            reputation: {
              increment: REPUTATION_REWARDS.ARTICLE_MERGED,
            },
          },
        })

        return { updatedArticle, moderationAction }
      })

      return NextResponse.json({
        message: 'Article force approved successfully',
        result,
      })
    }

    if (action === 'reject' || action === 'force_reject') {
      // Reject the article
      const result = await prisma.$transaction(async (tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => {
        // Update article status
        const updatedArticle = await tx.article.update({
          where: { id: articleVersion.article.id },
          data: {
            status: 'REJECTED',
          },
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
          },
        })

        // Create moderation action
        const moderationAction = await tx.moderationAction.create({
          data: {
            articleVersionId: versionId,
            userId: session.user.id,
            action: action === 'force_reject' ? 'FORCE_REJECTED' : 'REJECTED',
            reason,
          },
        })

        return { updatedArticle, moderationAction }
      })

      return NextResponse.json({
        message: `Article ${action === 'force_reject' ? 'force ' : ''}rejected`,
        result,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error performing moderation action:', error)
    return NextResponse.json(
      { error: 'Failed to perform moderation action' },
      { status: 500 }
    )
  }
}
