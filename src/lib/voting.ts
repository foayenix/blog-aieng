import { Role } from '@prisma/client'
import { prisma } from './prisma'
import { ROLE_WEIGHTS, MERGE_THRESHOLDS, REPUTATION_REWARDS } from './governance'
import { applyReputationEvent, evaluateUserPromotions } from './reputation'
import { isRoleAtLeast } from './permissions'

/**
 * Vote breakdown by role
 */
export type RoleBreakdown = Record<Role, { count: number; score: number }>

/**
 * Score calculation result
 */
export interface VersionScoreResult {
  totalScore: number
  breakdownByRole: RoleBreakdown
  approvalCounts: {
    reviewer: number
    judge: number
  }
  voteCount: number
}

/**
 * Approval threshold check result
 */
export interface ApprovalThresholdResult {
  meetsRequirements: boolean
  meetsScoreThreshold: boolean
  meetsReviewerThreshold: boolean
  meetsJudgeThreshold: boolean
  thresholds: {
    requiredScore: number
    currentScore: number
    requiredReviewerApprovals: number
    currentReviewerApprovals: number
    requiredJudgeApprovals: number
    currentJudgeApprovals: number
  }
}

/**
 * Article approval result
 */
export interface ApprovalResult {
  success: boolean
  article: {
    id: string
    slug: string
    title: string
    status: string
  }
  moderationAction: {
    id: string
    action: string
  }
  reputationAwarded: {
    author: {
      userId: string
      eventType: string
      delta: number
    }
    voters: Array<{
      userId: string
      eventType: string
      delta: number
    }>
  }
  badgesAwarded: string[]
}

/**
 * Calculate the weighted score for a version's votes
 * @param versionId - The ID of the article version
 * @returns The calculated score, breakdown by role, and approval counts
 */
export async function calculateVersionScore(versionId: string): Promise<VersionScoreResult> {
  const votes = await prisma.vote.findMany({
    where: { articleVersionId: versionId },
    include: {
      user: {
        select: {
          id: true,
          role: true,
        },
      },
    },
  })

  const breakdownByRole: RoleBreakdown = {
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
    voteCount: votes.length,
  }
}

/**
 * Check if an article version meets the approval thresholds
 * @param versionId - The ID of the article version
 * @returns Object indicating whether thresholds are met
 */
export async function checkApprovalThresholds(versionId: string): Promise<ApprovalThresholdResult> {
  const { totalScore, approvalCounts } = await calculateVersionScore(versionId)

  const meetsScoreThreshold = totalScore >= MERGE_THRESHOLDS.requiredScore
  const meetsReviewerThreshold = approvalCounts.reviewer >= MERGE_THRESHOLDS.requiredReviewerApprovals
  const meetsJudgeThreshold = approvalCounts.judge >= MERGE_THRESHOLDS.requiredJudgeApprovals

  // At least one threshold must be met
  const meetsRequirements = meetsScoreThreshold || meetsReviewerThreshold || meetsJudgeThreshold

  return {
    meetsRequirements,
    meetsScoreThreshold,
    meetsReviewerThreshold,
    meetsJudgeThreshold,
    thresholds: {
      requiredScore: MERGE_THRESHOLDS.requiredScore,
      currentScore: totalScore,
      requiredReviewerApprovals: MERGE_THRESHOLDS.requiredReviewerApprovals,
      currentReviewerApprovals: approvalCounts.reviewer,
      requiredJudgeApprovals: MERGE_THRESHOLDS.requiredJudgeApprovals,
      currentJudgeApprovals: approvalCounts.judge,
    },
  }
}

/**
 * Award badges based on user achievements
 * @param userId - The ID of the user
 * @returns Array of badge slugs that were awarded
 */
async function awardBadgesIfEligible(userId: string): Promise<string[]> {
  const awardedBadges: string[] = []

  // Get user's stats
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      badges: {
        include: {
          badge: true,
        },
      },
      articleVersions: {
        include: {
          currentForArticle: true,
        },
      },
      reputationEvents: true,
    },
  })

  if (!user) return awardedBadges

  // Get existing badge slugs
  const existingBadgeSlugs = user.badges.map((ub) => ub.badge.slug)

  // Count merged articles (versions that are current for an article)
  const mergedArticles = user.articleVersions.filter((v) => v.currentForArticle.length > 0).length

  // Badge definitions and their thresholds
  const badgeThresholds = [
    { slug: 'first-merge', label: 'First Merge', description: 'Merged your first article', threshold: 1 },
    { slug: 'five-merges', label: 'Contributor', description: 'Merged 5 articles', threshold: 5 },
    { slug: 'ten-merges', label: 'Regular Contributor', description: 'Merged 10 articles', threshold: 10 },
    { slug: 'twenty-five-merges', label: 'Senior Contributor', description: 'Merged 25 articles', threshold: 25 },
    { slug: 'fifty-merges', label: 'Expert Contributor', description: 'Merged 50 articles', threshold: 50 },
  ]

  for (const badgeDef of badgeThresholds) {
    if (mergedArticles >= badgeDef.threshold && !existingBadgeSlugs.includes(badgeDef.slug)) {
      // Find or create the badge
      const badge = await prisma.badge.upsert({
        where: { slug: badgeDef.slug },
        create: {
          slug: badgeDef.slug,
          label: badgeDef.label,
          description: badgeDef.description,
        },
        update: {},
      })

      // Award the badge to the user
      await prisma.userBadge.create({
        data: {
          userId,
          badgeId: badge.id,
        },
      })

      // Apply reputation event for badge earned
      await applyReputationEvent(userId, 'BADGE_EARNED', REPUTATION_REWARDS.BADGE_EARNED, {
        badgeId: badge.id,
        badgeSlug: badge.slug,
      })

      awardedBadges.push(badgeDef.slug)
    }
  }

  return awardedBadges
}

/**
 * Approve an article version
 * - Updates article.currentVersionId
 * - Sets article.status to PUBLISHED
 * - Applies reputation events
 * - Awards badges if thresholds met
 * - Creates moderation action record
 *
 * @param versionId - The ID of the article version to approve
 * @param approverId - The ID of the user approving the version
 * @returns The approval result
 */
export async function approveArticleVersion(
  versionId: string,
  approverId: string
): Promise<ApprovalResult> {
  // Get the article version with related data
  const articleVersion = await prisma.articleVersion.findUnique({
    where: { id: versionId },
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
    throw new Error('Article version not found')
  }

  if (articleVersion.article.status !== 'UNDER_REVIEW') {
    throw new Error('Article is not under review')
  }

  // Check approval thresholds
  const thresholdResult = await checkApprovalThresholds(versionId)
  if (!thresholdResult.meetsRequirements) {
    throw new Error('Merge thresholds not met')
  }

  // Perform the approval in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update article status and current version
    const updatedArticle = await tx.article.update({
      where: { id: articleVersion.articleId },
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

    // Create moderation action record
    const moderationAction = await tx.moderationAction.create({
      data: {
        articleVersionId: versionId,
        userId: approverId,
        action: 'APPROVED',
      },
      select: {
        id: true,
        action: true,
      },
    })

    return { updatedArticle, moderationAction }
  })

  // Apply reputation events (outside transaction for simplicity)
  const reputationAwarded: ApprovalResult['reputationAwarded'] = {
    author: {
      userId: '',
      eventType: '',
      delta: 0,
    },
    voters: [],
  }

  // Determine if this is a substantial merge (based on score)
  const isSubstantialMerge = thresholdResult.thresholds.currentScore >= MERGE_THRESHOLDS.requiredScore

  // Reward the version creator
  const authorEventType = isSubstantialMerge ? 'SUBSTANTIAL_MERGE' : 'ARTICLE_MERGED'
  const authorReward = isSubstantialMerge
    ? REPUTATION_REWARDS.SUBSTANTIAL_MERGE
    : REPUTATION_REWARDS.ARTICLE_MERGED

  await applyReputationEvent(
    articleVersion.createdBy.id,
    authorEventType,
    authorReward,
    {
      articleId: articleVersion.articleId,
      articleVersionId: versionId,
    }
  )

  reputationAwarded.author = {
    userId: articleVersion.createdBy.id,
    eventType: authorEventType,
    delta: authorReward,
  }

  // Check for author promotion
  await evaluateUserPromotions(articleVersion.createdBy.id)

  // Reward approving voters (positive votes from REVIEWER+)
  const positiveVoters = articleVersion.votes.filter(
    (v) => v.value > 0 && isRoleAtLeast(v.user.role, 'REVIEWER')
  )

  for (const vote of positiveVoters) {
    await applyReputationEvent(
      vote.user.id,
      'UPVOTE',
      REPUTATION_REWARDS.UPVOTE,
      {
        articleId: articleVersion.articleId,
        articleVersionId: versionId,
        reason: 'Approved vote on merged article',
      }
    )

    reputationAwarded.voters.push({
      userId: vote.user.id,
      eventType: 'UPVOTE',
      delta: REPUTATION_REWARDS.UPVOTE,
    })

    // Check for voter promotion
    await evaluateUserPromotions(vote.user.id)
  }

  // Award badges if eligible
  const badgesAwarded = await awardBadgesIfEligible(articleVersion.createdBy.id)

  return {
    success: true,
    article: result.updatedArticle,
    moderationAction: result.moderationAction,
    reputationAwarded,
    badgesAwarded,
  }
}
