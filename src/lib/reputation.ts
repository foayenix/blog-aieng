import { Role, ReputationEventType, Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { REPUTATION_REWARDS, PROMOTION_THRESHOLDS, ROLE_HIERARCHY } from './governance'

/**
 * Metadata type for reputation events
 */
export type ReputationEventMetadata = {
  articleId?: string
  articleVersionId?: string
  badgeId?: string
  reason?: string
  [key: string]: unknown
}

/**
 * Apply a reputation event to a user
 * Creates the event record and updates the user's total reputation
 */
export async function applyReputationEvent(
  userId: string,
  eventType: ReputationEventType,
  delta: number,
  metadata?: ReputationEventMetadata
): Promise<{ event: { id: string; userId: string; type: ReputationEventType; delta: number; metadata: Prisma.JsonValue; createdAt: Date }; newReputation: number }> {
  // Use a transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Create the reputation event
    const event = await tx.reputationEvent.create({
      data: {
        userId,
        type: eventType,
        delta,
        metadata: metadata as Prisma.JsonObject | undefined,
      },
    })

    // Update the user's total reputation
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        reputation: {
          increment: delta,
        },
      },
      select: {
        reputation: true,
      },
    })

    return {
      event,
      newReputation: updatedUser.reputation,
    }
  })

  return result
}

/**
 * Get the reputation configuration (delta values for each event type)
 */
export function getReputationConfig(): Record<ReputationEventType, number> {
  return { ...REPUTATION_REWARDS }
}

/**
 * Evaluate if a user should be promoted based on their current reputation
 * Returns the new role if promotion is warranted, null otherwise
 */
export async function evaluateUserPromotions(
  userId: string
): Promise<{ promoted: boolean; newRole: Role | null; previousRole: Role | null }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      reputation: true,
    },
  })

  if (!user) {
    throw new Error(`User not found: ${userId}`)
  }

  const { role: currentRole, reputation } = user
  let newRole: Role | null = null

  // Determine the appropriate role based on reputation
  // Check from highest to lowest to get the best eligible role
  if (reputation >= PROMOTION_THRESHOLDS.judgeReputation) {
    if (currentRole !== 'JUDGE' && currentRole !== 'MAINTAINER') {
      newRole = 'JUDGE'
    }
  } else if (reputation >= PROMOTION_THRESHOLDS.reviewerReputation) {
    if (currentRole === 'READER' || currentRole === 'CONTRIBUTOR') {
      newRole = 'REVIEWER'
    }
  } else if (reputation >= PROMOTION_THRESHOLDS.contributorReputation) {
    if (currentRole === 'READER') {
      newRole = 'CONTRIBUTOR'
    }
  }

  // If no promotion is warranted, return early
  if (!newRole) {
    return {
      promoted: false,
      newRole: null,
      previousRole: null,
    }
  }

  // Apply the promotion
  await prisma.$transaction(async (tx) => {
    // Update user's role
    await tx.user.update({
      where: { id: userId },
      data: { role: newRole as Role },
    })

    // Create a reputation event for the promotion
    await tx.reputationEvent.create({
      data: {
        userId,
        type: 'PROMOTED',
        delta: REPUTATION_REWARDS.PROMOTED,
        metadata: {
          previousRole: currentRole,
          newRole: newRole,
        },
      },
    })

    // Also increment the user's reputation for the promotion bonus
    await tx.user.update({
      where: { id: userId },
      data: {
        reputation: {
          increment: REPUTATION_REWARDS.PROMOTED,
        },
      },
    })
  })

  return {
    promoted: true,
    newRole,
    previousRole: currentRole,
  }
}

/**
 * Get a user's reputation history
 */
export async function getReputationHistory(
  userId: string,
  options?: {
    limit?: number
    offset?: number
    eventType?: ReputationEventType
  }
): Promise<{
  events: Array<{
    id: string
    type: ReputationEventType
    delta: number
    metadata: Prisma.JsonValue
    createdAt: Date
  }>
  total: number
}> {
  const { limit = 50, offset = 0, eventType } = options || {}

  const where: Prisma.ReputationEventWhereInput = {
    userId,
    ...(eventType && { type: eventType }),
  }

  const [events, total] = await Promise.all([
    prisma.reputationEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        type: true,
        delta: true,
        metadata: true,
        createdAt: true,
      },
    }),
    prisma.reputationEvent.count({ where }),
  ])

  return { events, total }
}

/**
 * Calculate the total reputation for a user from their events
 * Useful for verification or recalculation
 */
export async function calculateTotalReputation(userId: string): Promise<number> {
  const result = await prisma.reputationEvent.aggregate({
    where: { userId },
    _sum: { delta: true },
  })

  return result._sum.delta || 0
}

/**
 * Get the next promotion threshold for a user
 */
export function getNextPromotionThreshold(
  currentRole: Role,
  currentReputation: number
): { nextRole: Role; requiredReputation: number; remaining: number } | null {
  const roleIndex = ROLE_HIERARCHY.indexOf(currentRole)

  // MAINTAINER cannot be promoted further
  if (currentRole === 'MAINTAINER') {
    return null
  }

  // Determine next threshold based on current role
  if (roleIndex < ROLE_HIERARCHY.indexOf('CONTRIBUTOR')) {
    return {
      nextRole: 'CONTRIBUTOR',
      requiredReputation: PROMOTION_THRESHOLDS.contributorReputation,
      remaining: Math.max(0, PROMOTION_THRESHOLDS.contributorReputation - currentReputation),
    }
  }

  if (roleIndex < ROLE_HIERARCHY.indexOf('REVIEWER')) {
    return {
      nextRole: 'REVIEWER',
      requiredReputation: PROMOTION_THRESHOLDS.reviewerReputation,
      remaining: Math.max(0, PROMOTION_THRESHOLDS.reviewerReputation - currentReputation),
    }
  }

  if (roleIndex < ROLE_HIERARCHY.indexOf('JUDGE')) {
    return {
      nextRole: 'JUDGE',
      requiredReputation: PROMOTION_THRESHOLDS.judgeReputation,
      remaining: Math.max(0, PROMOTION_THRESHOLDS.judgeReputation - currentReputation),
    }
  }

  // JUDGE cannot be auto-promoted to MAINTAINER
  return null
}
