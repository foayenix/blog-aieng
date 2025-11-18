import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateVersionScore, checkApprovalThresholds } from '@/lib/voting'

/**
 * GET /api/votes/[versionId]
 * Get vote score breakdown for a version
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const { versionId } = await params
    const session = await getServerSession()

    // Verify article version exists
    const articleVersion = await prisma.articleVersion.findUnique({
      where: { id: versionId },
    })

    if (!articleVersion) {
      return NextResponse.json(
        { error: 'Article version not found' },
        { status: 404 }
      )
    }

    // Calculate weighted score using helper
    const scoreResult = await calculateVersionScore(versionId)

    // Check approval thresholds
    const thresholdResult = await checkApprovalThresholds(versionId)

    // Get user's vote if authenticated
    let userVote = null
    if (session?.user) {
      const vote = await prisma.vote.findUnique({
        where: {
          articleVersionId_userId: {
            articleVersionId: versionId,
            userId: session.user.id,
          },
        },
      })
      if (vote) {
        userVote = {
          id: vote.id,
          value: vote.value,
        }
      }
    }

    return NextResponse.json({
      totalScore: scoreResult.totalScore,
      breakdownByRole: scoreResult.breakdownByRole,
      approvalCounts: scoreResult.approvalCounts,
      voteCount: scoreResult.voteCount,
      userVote,
      approvalStatus: {
        meetsRequirements: thresholdResult.meetsRequirements,
        meetsScoreThreshold: thresholdResult.meetsScoreThreshold,
        meetsReviewerThreshold: thresholdResult.meetsReviewerThreshold,
        meetsJudgeThreshold: thresholdResult.meetsJudgeThreshold,
        thresholds: thresholdResult.thresholds,
      },
    })
  } catch (error) {
    console.error('Error fetching votes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch votes' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/votes/[versionId]
 * Remove user's vote from a version
 */
export async function DELETE(
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

    // Verify article version exists
    const articleVersion = await prisma.articleVersion.findUnique({
      where: { id: versionId },
    })

    if (!articleVersion) {
      return NextResponse.json(
        { error: 'Article version not found' },
        { status: 404 }
      )
    }

    // Find the user's vote
    const existingVote = await prisma.vote.findUnique({
      where: {
        articleVersionId_userId: {
          articleVersionId: versionId,
          userId: session.user.id,
        },
      },
    })

    if (!existingVote) {
      return NextResponse.json(
        { error: 'Vote not found' },
        { status: 404 }
      )
    }

    // Delete the vote
    await prisma.vote.delete({
      where: {
        id: existingVote.id,
      },
    })

    // Calculate updated score
    const scoreResult = await calculateVersionScore(versionId)

    return NextResponse.json({
      success: true,
      message: 'Vote removed successfully',
      totalScore: scoreResult.totalScore,
      voteCount: scoreResult.voteCount,
    })
  } catch (error) {
    console.error('Error removing vote:', error)
    return NextResponse.json(
      { error: 'Failed to remove vote' },
      { status: 500 }
    )
  }
}
