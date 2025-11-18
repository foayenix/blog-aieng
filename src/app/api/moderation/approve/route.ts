import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canApproveArticle } from '@/lib/permissions'
import { ROLE_WEIGHTS, MERGE_THRESHOLDS, REPUTATION_REWARDS } from '@/lib/governance'
import { applyReputationEvent, evaluateUserPromotions } from '@/lib/reputation'
import { Role } from '@prisma/client'

/**
 * Calculate the weighted score for a version's votes
 */
function calculateVersionScore(votes: Array<{ value: number; user: { id: string; role: Role } }>) {
  const breakdownByRole: Record<Role, { count: number; score: number }> = {
    READER: { count: 0, score: 0 },
    CONTRIBUTOR: { count: 0, score: 0 },
    REVIEWER: { count: 0, score: 0 },
    JUDGE: { count: 0, score: 0 },
    MAINTAINER: { count: 0, score: 0 },
  }

  let totalScore = 0
  const approvalCounts = {
    reviewer: 0,
    judge: 0,
  }

  for (const vote of votes) {
    const role = vote.user.role
    const weight = ROLE_WEIGHTS[role]
    const weightedValue = vote.value * weight

    breakdownByRole[role].count++
    breakdownByRole[role].score += weightedValue
    totalScore += weightedValue

    // Count positive votes from reviewers and judges
    if (vote.value > 0) {
      if (role === 'REVIEWER') {
        approvalCounts.reviewer++
      } else if (role === 'JUDGE' || role === 'MAINTAINER') {
        approvalCounts.judge++
      }
    }
  }

  return {
    totalScore,
    breakdownByRole,
    approvalCounts,
  }
}

/**
 * POST /api/moderation/approve
 * Approve an article version
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

    // Check REVIEWER+ role
    if (!canApproveArticle(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. REVIEWER role or higher required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { articleVersionId } = body

    if (!articleVersionId || typeof articleVersionId !== 'string') {
      return NextResponse.json(
        { error: 'articleVersionId is required' },
        { status: 400 }
      )
    }

    // Get the article version with votes
    const articleVersion = await prisma.articleVersion.findUnique({
      where: { id: articleVersionId },
      include: {
        article: {
          include: {
            author: true,
          },
        },
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
        createdBy: true,
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

    // Calculate the score and check thresholds
    const { totalScore, approvalCounts } = calculateVersionScore(articleVersion.votes)

    // Check if merge thresholds are met
    const meetsScoreThreshold = totalScore >= MERGE_THRESHOLDS.requiredScore
    const meetsReviewerThreshold = approvalCounts.reviewer >= MERGE_THRESHOLDS.requiredReviewerApprovals
    const meetsJudgeThreshold = approvalCounts.judge >= MERGE_THRESHOLDS.requiredJudgeApprovals

    if (!meetsScoreThreshold && !meetsReviewerThreshold && !meetsJudgeThreshold) {
      return NextResponse.json(
        {
          error: 'Merge thresholds not met',
          thresholds: {
            requiredScore: MERGE_THRESHOLDS.requiredScore,
            currentScore: totalScore,
            requiredReviewerApprovals: MERGE_THRESHOLDS.requiredReviewerApprovals,
            currentReviewerApprovals: approvalCounts.reviewer,
            requiredJudgeApprovals: MERGE_THRESHOLDS.requiredJudgeApprovals,
            currentJudgeApprovals: approvalCounts.judge,
          },
        },
        { status: 400 }
      )
    }

    // Perform the approval in a transaction
    const result = await prisma.$transaction(async (tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => {
      // Update article status and current version
      const updatedArticle = await tx.article.update({
        where: { id: articleVersion.articleId },
        data: {
          status: 'PUBLISHED',
          currentVersionId: articleVersionId,
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
          articleVersionId,
          userId: session.user.id,
          action: 'APPROVED',
        },
      })

      return updatedArticle
    })

    // Apply reputation events (outside transaction for simplicity)
    // Determine if this is a substantial merge (based on score)
    const isSubstantialMerge = totalScore >= MERGE_THRESHOLDS.requiredScore

    // Reward the author
    const authorReward = isSubstantialMerge
      ? REPUTATION_REWARDS.SUBSTANTIAL_MERGE
      : REPUTATION_REWARDS.ARTICLE_MERGED

    await applyReputationEvent(
      articleVersion.createdBy.id,
      isSubstantialMerge ? 'SUBSTANTIAL_MERGE' : 'ARTICLE_MERGED',
      authorReward,
      {
        articleId: articleVersion.articleId,
        articleVersionId: articleVersionId,
      }
    )

    // Check for author promotion
    await evaluateUserPromotions(articleVersion.createdBy.id)

    // Reward approving voters (positive votes)
    const positiveVoters = articleVersion.votes.filter((v: typeof articleVersion.votes[number]) => v.value > 0)
    for (const vote of positiveVoters) {
      await applyReputationEvent(
        vote.user.id,
        'UPVOTE',
        REPUTATION_REWARDS.UPVOTE,
        {
          articleId: articleVersion.articleId,
          articleVersionId: articleVersionId,
          reason: 'Approved vote on merged article',
        }
      )

      // Check for voter promotion
      await evaluateUserPromotions(vote.user.id)
    }

    return NextResponse.json({
      success: true,
      article: result,
      thresholdMet: {
        score: meetsScoreThreshold,
        reviewerApprovals: meetsReviewerThreshold,
        judgeApprovals: meetsJudgeThreshold,
      },
    })
  } catch (error) {
    console.error('Error approving article:', error)
    return NextResponse.json(
      { error: 'Failed to approve article' },
      { status: 500 }
    )
  }
}
