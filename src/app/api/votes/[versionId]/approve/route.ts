import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canApproveArticle } from '@/lib/permissions'
import { approveArticleVersion, checkApprovalThresholds } from '@/lib/voting'

/**
 * POST /api/votes/[versionId]/approve
 * Approve an article version (for REVIEWER+)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const { versionId } = await params
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check REVIEWER+ role
    if (!canApproveArticle(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. REVIEWER role or higher required.' },
        { status: 403 }
      )
    }

    // Verify article version exists
    const articleVersion = await prisma.articleVersion.findUnique({
      where: { id: versionId },
      include: {
        article: true,
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

    // Check if version has enough votes to be approved
    const thresholdResult = await checkApprovalThresholds(versionId)

    if (!thresholdResult.meetsRequirements) {
      return NextResponse.json(
        {
          error: 'Merge thresholds not met',
          thresholds: thresholdResult.thresholds,
        },
        { status: 400 }
      )
    }

    // Execute approval logic
    const result = await approveArticleVersion(versionId, session.user.id)

    return NextResponse.json({
      success: result.success,
      article: result.article,
      moderationAction: result.moderationAction,
      reputationAwarded: result.reputationAwarded,
      badgesAwarded: result.badgesAwarded,
      thresholdsMet: {
        score: thresholdResult.meetsScoreThreshold,
        reviewerApprovals: thresholdResult.meetsReviewerThreshold,
        judgeApprovals: thresholdResult.meetsJudgeThreshold,
      },
    })
  } catch (error) {
    console.error('Error approving article:', error)

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === 'Article version not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
      if (error.message === 'Article is not under review') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
      if (error.message === 'Merge thresholds not met') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to approve article' },
      { status: 500 }
    )
  }
}
