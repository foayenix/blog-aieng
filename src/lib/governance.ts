import { Role, ReputationEventType } from '@prisma/client'

/**
 * Role weightings for governance calculations
 * Higher weights indicate more influence in the governance system
 */
export const ROLE_WEIGHTS: Record<Role, number> = {
  READER: 1,
  CONTRIBUTOR: 2,
  REVIEWER: 4,
  JUDGE: 8,
  MAINTAINER: 16,
} as const

/**
 * Reputation delta values for different event types
 * Positive values reward good behavior, negative values penalize bad behavior
 */
export const REPUTATION_REWARDS: Record<ReputationEventType, number> = {
  ARTICLE_MERGED: 3,
  SUBSTANTIAL_MERGE: 8,
  CITED: 1,
  UPVOTE: 1,
  REVERTED: -5,
  BADGE_EARNED: 5,
  PROMOTED: 10,
} as const

/**
 * Thresholds required for article merging/approval
 */
export const MERGE_THRESHOLDS = {
  /** Total weighted score required for automatic merge */
  requiredScore: 24,
  /** Number of REVIEWER+ approvals required */
  requiredReviewerApprovals: 2,
  /** Number of JUDGE+ approvals required */
  requiredJudgeApprovals: 1,
} as const

/**
 * Reputation thresholds for role promotions
 */
export const PROMOTION_THRESHOLDS = {
  /** Reputation required to be promoted to CONTRIBUTOR */
  contributorReputation: 10,
  /** Reputation required to be promoted to REVIEWER */
  reviewerReputation: 50,
  /** Reputation required to be promoted to JUDGE */
  judgeReputation: 200,
} as const

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  /** Maximum comments allowed per minute */
  commentsPerMinute: 5,
} as const

/**
 * Role hierarchy for comparison operations
 * Higher index = higher privilege
 */
export const ROLE_HIERARCHY: Role[] = [
  'READER',
  'CONTRIBUTOR',
  'REVIEWER',
  'JUDGE',
  'MAINTAINER',
] as const

/**
 * Get the hierarchical index of a role
 */
export function getRoleIndex(role: Role): number {
  return ROLE_HIERARCHY.indexOf(role)
}

/**
 * Type exports for external use
 */
export type RoleWeight = typeof ROLE_WEIGHTS
export type ReputationReward = typeof REPUTATION_REWARDS
export type MergeThreshold = typeof MERGE_THRESHOLDS
export type PromotionThreshold = typeof PROMOTION_THRESHOLDS
export type RateLimit = typeof RATE_LIMITS
