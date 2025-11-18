import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessModeration, canForceApprove } from '@/lib/permissions'
import { ROLE_WEIGHTS } from '@/lib/governance'
import { Role } from '@prisma/client'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    versionId: string
  }>
}

// Input validation schema
const rejectSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(1000, 'Reason must be less than 1000 characters'),
})

// Threshold for rejection (negative weighted score)
const REJECTION_THRESHOLD = -10

/**
 * POST /api/moderation/[versionId]/reject
 * Reject a version
 * - REVIEWER+ can reject with enough downvotes
 * - JUDGE+ can force reject
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

    // Check REVIEWER+ role
    if (!canAccessModeration(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. REVIEWER role or higher required.' },
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
    const parseResult = rejectSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.issues },
        { status: 400 }
      )
    }

    const { reason } = parseResult.data

    // Get the article version with votes
    const articleVersion = await prisma.articleVersion.findUnique({
      where: { id: versionId },
      include: {
        article: true,
        votes: {
          include: {
            user: {
              select: {
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

    // Check if user can reject
    const isJudgeOrHigher = canForceApprove(session.user.role)

    // Calculate weighted vote score
    const voteScore = articleVersion.votes.reduce((sum, vote) => {
      const weight = ROLE_WEIGHTS[vote.user.role as Role]
      return sum + vote.value * weight
    }, 0)

    // Determine action type based on user role and vote score
    let actionType: string

    if (isJudgeOrHigher) {
      // JUDGE+ can force reject
      actionType = 'FORCE_REJECTED'
    } else if (voteScore <= REJECTION_THRESHOLD) {
      // REVIEWER can reject if there are enough downvotes
      actionType = 'REJECTED'
    } else {
      return NextResponse.json(
        {
          error: 'Cannot reject article. Insufficient downvotes or requires JUDGE role.',
          currentScore: voteScore,
          requiredScore: REJECTION_THRESHOLD,
        },
        { status: 403 }
      )
    }

    // Perform the rejection in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update article status to REJECTED
      const updatedArticle = await tx.article.update({
        where: { id: articleVersion.articleId },
        data: {
          status: 'REJECTED',
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
        },
      })

      // Log moderation action
      await tx.moderationAction.create({
        data: {
          articleVersionId: versionId,
          userId: session.user.id,
          action: actionType,
          reason: reason.trim(),
        },
      })

      return updatedArticle
    })

    return NextResponse.json({
      success: true,
      article: result,
      action: actionType,
    })
  } catch (error) {
    console.error('Error rejecting article:', error)
    return NextResponse.json(
      { error: 'Failed to reject article' },
      { status: 500 }
    )
  }
}
