import { describe, it, expect } from 'vitest'
import {
  ROLE_WEIGHTS,
  REPUTATION_REWARDS,
  MERGE_THRESHOLDS,
  PROMOTION_THRESHOLDS,
  ROLE_HIERARCHY,
  getRoleIndex,
} from '../lib/governance'
import {
  getRoleWeight,
  isRoleAtLeast,
  canCreateArticle,
  canEditArticle,
  canVote,
  canApproveArticle,
  canForceApprove,
  canAccessModeration,
  canAccessAdmin,
  canDeleteArticle,
  canManageUsers,
  canComment,
  canModerateComments,
  getPermissions,
} from '../lib/permissions'
import { Role } from '@prisma/client'

// ============================================
// ROLE WEIGHT TESTS
// ============================================
describe('Role Weights', () => {
  it('should have correct weights for each role', () => {
    expect(ROLE_WEIGHTS.READER).toBe(1)
    expect(ROLE_WEIGHTS.CONTRIBUTOR).toBe(2)
    expect(ROLE_WEIGHTS.REVIEWER).toBe(4)
    expect(ROLE_WEIGHTS.JUDGE).toBe(8)
    expect(ROLE_WEIGHTS.MAINTAINER).toBe(16)
  })

  it('should have weights that double for each role level', () => {
    expect(ROLE_WEIGHTS.CONTRIBUTOR).toBe(ROLE_WEIGHTS.READER * 2)
    expect(ROLE_WEIGHTS.REVIEWER).toBe(ROLE_WEIGHTS.CONTRIBUTOR * 2)
    expect(ROLE_WEIGHTS.JUDGE).toBe(ROLE_WEIGHTS.REVIEWER * 2)
    expect(ROLE_WEIGHTS.MAINTAINER).toBe(ROLE_WEIGHTS.JUDGE * 2)
  })

  it('should return correct weight via getRoleWeight function', () => {
    expect(getRoleWeight('READER')).toBe(1)
    expect(getRoleWeight('CONTRIBUTOR')).toBe(2)
    expect(getRoleWeight('REVIEWER')).toBe(4)
    expect(getRoleWeight('JUDGE')).toBe(8)
    expect(getRoleWeight('MAINTAINER')).toBe(16)
  })
})

// ============================================
// ROLE HIERARCHY TESTS
// ============================================
describe('Role Hierarchy', () => {
  it('should have roles in correct order', () => {
    expect(ROLE_HIERARCHY).toEqual([
      'READER',
      'CONTRIBUTOR',
      'REVIEWER',
      'JUDGE',
      'MAINTAINER',
    ])
  })

  it('should return correct index for each role', () => {
    expect(getRoleIndex('READER')).toBe(0)
    expect(getRoleIndex('CONTRIBUTOR')).toBe(1)
    expect(getRoleIndex('REVIEWER')).toBe(2)
    expect(getRoleIndex('JUDGE')).toBe(3)
    expect(getRoleIndex('MAINTAINER')).toBe(4)
  })

  it('should have MAINTAINER as highest index', () => {
    const maintainerIndex = getRoleIndex('MAINTAINER')
    expect(maintainerIndex).toBeGreaterThan(getRoleIndex('READER'))
    expect(maintainerIndex).toBeGreaterThan(getRoleIndex('CONTRIBUTOR'))
    expect(maintainerIndex).toBeGreaterThan(getRoleIndex('REVIEWER'))
    expect(maintainerIndex).toBeGreaterThan(getRoleIndex('JUDGE'))
  })
})

// ============================================
// isRoleAtLeast TESTS
// ============================================
describe('isRoleAtLeast', () => {
  it('should return true when role equals required role', () => {
    expect(isRoleAtLeast('READER', 'READER')).toBe(true)
    expect(isRoleAtLeast('CONTRIBUTOR', 'CONTRIBUTOR')).toBe(true)
    expect(isRoleAtLeast('REVIEWER', 'REVIEWER')).toBe(true)
    expect(isRoleAtLeast('JUDGE', 'JUDGE')).toBe(true)
    expect(isRoleAtLeast('MAINTAINER', 'MAINTAINER')).toBe(true)
  })

  it('should return true when role is higher than required', () => {
    expect(isRoleAtLeast('MAINTAINER', 'READER')).toBe(true)
    expect(isRoleAtLeast('MAINTAINER', 'CONTRIBUTOR')).toBe(true)
    expect(isRoleAtLeast('MAINTAINER', 'REVIEWER')).toBe(true)
    expect(isRoleAtLeast('MAINTAINER', 'JUDGE')).toBe(true)
    expect(isRoleAtLeast('JUDGE', 'REVIEWER')).toBe(true)
    expect(isRoleAtLeast('REVIEWER', 'CONTRIBUTOR')).toBe(true)
  })

  it('should return false when role is lower than required', () => {
    expect(isRoleAtLeast('READER', 'CONTRIBUTOR')).toBe(false)
    expect(isRoleAtLeast('READER', 'REVIEWER')).toBe(false)
    expect(isRoleAtLeast('READER', 'JUDGE')).toBe(false)
    expect(isRoleAtLeast('READER', 'MAINTAINER')).toBe(false)
    expect(isRoleAtLeast('CONTRIBUTOR', 'REVIEWER')).toBe(false)
    expect(isRoleAtLeast('REVIEWER', 'JUDGE')).toBe(false)
    expect(isRoleAtLeast('JUDGE', 'MAINTAINER')).toBe(false)
  })
})

// ============================================
// PERMISSION FUNCTION TESTS
// ============================================
describe('canCreateArticle', () => {
  it('should return false for READER', () => {
    expect(canCreateArticle('READER')).toBe(false)
  })

  it('should return true for CONTRIBUTOR and above', () => {
    expect(canCreateArticle('CONTRIBUTOR')).toBe(true)
    expect(canCreateArticle('REVIEWER')).toBe(true)
    expect(canCreateArticle('JUDGE')).toBe(true)
    expect(canCreateArticle('MAINTAINER')).toBe(true)
  })
})

describe('canEditArticle', () => {
  it('should allow authors to edit their own articles', () => {
    expect(canEditArticle('READER', true)).toBe(true)
    expect(canEditArticle('CONTRIBUTOR', true)).toBe(true)
  })

  it('should allow REVIEWER+ to edit any article', () => {
    expect(canEditArticle('REVIEWER', false)).toBe(true)
    expect(canEditArticle('JUDGE', false)).toBe(true)
    expect(canEditArticle('MAINTAINER', false)).toBe(true)
  })

  it('should not allow non-authors with lower roles to edit', () => {
    expect(canEditArticle('READER', false)).toBe(false)
    expect(canEditArticle('CONTRIBUTOR', false)).toBe(false)
  })
})

describe('canVote', () => {
  it('should allow all valid roles to vote', () => {
    expect(canVote('READER')).toBe(true)
    expect(canVote('CONTRIBUTOR')).toBe(true)
    expect(canVote('REVIEWER')).toBe(true)
    expect(canVote('JUDGE')).toBe(true)
    expect(canVote('MAINTAINER')).toBe(true)
  })
})

describe('canApproveArticle', () => {
  it('should return false for READER and CONTRIBUTOR', () => {
    expect(canApproveArticle('READER')).toBe(false)
    expect(canApproveArticle('CONTRIBUTOR')).toBe(false)
  })

  it('should return true for REVIEWER and above', () => {
    expect(canApproveArticle('REVIEWER')).toBe(true)
    expect(canApproveArticle('JUDGE')).toBe(true)
    expect(canApproveArticle('MAINTAINER')).toBe(true)
  })
})

describe('canForceApprove', () => {
  it('should return false for READER, CONTRIBUTOR, and REVIEWER', () => {
    expect(canForceApprove('READER')).toBe(false)
    expect(canForceApprove('CONTRIBUTOR')).toBe(false)
    expect(canForceApprove('REVIEWER')).toBe(false)
  })

  it('should return true for JUDGE and MAINTAINER', () => {
    expect(canForceApprove('JUDGE')).toBe(true)
    expect(canForceApprove('MAINTAINER')).toBe(true)
  })
})

describe('canAccessModeration', () => {
  it('should return false for READER and CONTRIBUTOR', () => {
    expect(canAccessModeration('READER')).toBe(false)
    expect(canAccessModeration('CONTRIBUTOR')).toBe(false)
  })

  it('should return true for REVIEWER and above', () => {
    expect(canAccessModeration('REVIEWER')).toBe(true)
    expect(canAccessModeration('JUDGE')).toBe(true)
    expect(canAccessModeration('MAINTAINER')).toBe(true)
  })
})

describe('canAccessAdmin', () => {
  it('should return false for all roles except MAINTAINER', () => {
    expect(canAccessAdmin('READER')).toBe(false)
    expect(canAccessAdmin('CONTRIBUTOR')).toBe(false)
    expect(canAccessAdmin('REVIEWER')).toBe(false)
    expect(canAccessAdmin('JUDGE')).toBe(false)
  })

  it('should return true only for MAINTAINER', () => {
    expect(canAccessAdmin('MAINTAINER')).toBe(true)
  })
})

describe('canDeleteArticle', () => {
  it('should return false for READER, CONTRIBUTOR, and REVIEWER', () => {
    expect(canDeleteArticle('READER')).toBe(false)
    expect(canDeleteArticle('CONTRIBUTOR')).toBe(false)
    expect(canDeleteArticle('REVIEWER')).toBe(false)
  })

  it('should return true for JUDGE and MAINTAINER', () => {
    expect(canDeleteArticle('JUDGE')).toBe(true)
    expect(canDeleteArticle('MAINTAINER')).toBe(true)
  })
})

describe('canManageUsers', () => {
  it('should return false for all roles except MAINTAINER', () => {
    expect(canManageUsers('READER')).toBe(false)
    expect(canManageUsers('CONTRIBUTOR')).toBe(false)
    expect(canManageUsers('REVIEWER')).toBe(false)
    expect(canManageUsers('JUDGE')).toBe(false)
  })

  it('should return true only for MAINTAINER', () => {
    expect(canManageUsers('MAINTAINER')).toBe(true)
  })
})

describe('canComment', () => {
  it('should allow all valid roles to comment', () => {
    expect(canComment('READER')).toBe(true)
    expect(canComment('CONTRIBUTOR')).toBe(true)
    expect(canComment('REVIEWER')).toBe(true)
    expect(canComment('JUDGE')).toBe(true)
    expect(canComment('MAINTAINER')).toBe(true)
  })
})

describe('canModerateComments', () => {
  it('should return false for READER and CONTRIBUTOR', () => {
    expect(canModerateComments('READER')).toBe(false)
    expect(canModerateComments('CONTRIBUTOR')).toBe(false)
  })

  it('should return true for REVIEWER and above', () => {
    expect(canModerateComments('REVIEWER')).toBe(true)
    expect(canModerateComments('JUDGE')).toBe(true)
    expect(canModerateComments('MAINTAINER')).toBe(true)
  })
})

// ============================================
// getPermissions TESTS
// ============================================
describe('getPermissions', () => {
  it('should return correct permissions for READER', () => {
    const perms = getPermissions('READER')
    expect(perms).toEqual({
      canCreateArticle: false,
      canVote: true,
      canApproveArticle: false,
      canForceApprove: false,
      canAccessModeration: false,
      canAccessAdmin: false,
      canDeleteArticle: false,
      canManageUsers: false,
      canComment: true,
      canModerateComments: false,
    })
  })

  it('should return correct permissions for CONTRIBUTOR', () => {
    const perms = getPermissions('CONTRIBUTOR')
    expect(perms).toEqual({
      canCreateArticle: true,
      canVote: true,
      canApproveArticle: false,
      canForceApprove: false,
      canAccessModeration: false,
      canAccessAdmin: false,
      canDeleteArticle: false,
      canManageUsers: false,
      canComment: true,
      canModerateComments: false,
    })
  })

  it('should return correct permissions for REVIEWER', () => {
    const perms = getPermissions('REVIEWER')
    expect(perms).toEqual({
      canCreateArticle: true,
      canVote: true,
      canApproveArticle: true,
      canForceApprove: false,
      canAccessModeration: true,
      canAccessAdmin: false,
      canDeleteArticle: false,
      canManageUsers: false,
      canComment: true,
      canModerateComments: true,
    })
  })

  it('should return correct permissions for JUDGE', () => {
    const perms = getPermissions('JUDGE')
    expect(perms).toEqual({
      canCreateArticle: true,
      canVote: true,
      canApproveArticle: true,
      canForceApprove: true,
      canAccessModeration: true,
      canAccessAdmin: false,
      canDeleteArticle: true,
      canManageUsers: false,
      canComment: true,
      canModerateComments: true,
    })
  })

  it('should return correct permissions for MAINTAINER', () => {
    const perms = getPermissions('MAINTAINER')
    expect(perms).toEqual({
      canCreateArticle: true,
      canVote: true,
      canApproveArticle: true,
      canForceApprove: true,
      canAccessModeration: true,
      canAccessAdmin: true,
      canDeleteArticle: true,
      canManageUsers: true,
      canComment: true,
      canModerateComments: true,
    })
  })
})

// ============================================
// MERGE THRESHOLD TESTS
// ============================================
describe('Merge Thresholds', () => {
  it('should have correct threshold values', () => {
    expect(MERGE_THRESHOLDS.requiredScore).toBe(24)
    expect(MERGE_THRESHOLDS.requiredReviewerApprovals).toBe(2)
    expect(MERGE_THRESHOLDS.requiredJudgeApprovals).toBe(1)
  })

  it('should require reasonable number of votes to reach score threshold', () => {
    // 24 points could be achieved by:
    // - 3 JUDGE votes (3 * 8 = 24)
    // - 6 REVIEWER votes (6 * 4 = 24)
    // - 2 MAINTAINER votes (2 * 16 = 32)
    const judgeVotesNeeded = Math.ceil(MERGE_THRESHOLDS.requiredScore / ROLE_WEIGHTS.JUDGE)
    const reviewerVotesNeeded = Math.ceil(MERGE_THRESHOLDS.requiredScore / ROLE_WEIGHTS.REVIEWER)
    const maintainerVotesNeeded = Math.ceil(MERGE_THRESHOLDS.requiredScore / ROLE_WEIGHTS.MAINTAINER)

    expect(judgeVotesNeeded).toBe(3)
    expect(reviewerVotesNeeded).toBe(6)
    expect(maintainerVotesNeeded).toBe(2)
  })
})

// ============================================
// PROMOTION THRESHOLD TESTS
// ============================================
describe('Promotion Thresholds', () => {
  it('should have correct threshold values', () => {
    expect(PROMOTION_THRESHOLDS.contributorReputation).toBe(10)
    expect(PROMOTION_THRESHOLDS.reviewerReputation).toBe(50)
    expect(PROMOTION_THRESHOLDS.judgeReputation).toBe(200)
  })

  it('should have increasing thresholds for higher roles', () => {
    expect(PROMOTION_THRESHOLDS.reviewerReputation).toBeGreaterThan(
      PROMOTION_THRESHOLDS.contributorReputation
    )
    expect(PROMOTION_THRESHOLDS.judgeReputation).toBeGreaterThan(
      PROMOTION_THRESHOLDS.reviewerReputation
    )
  })
})

// ============================================
// REPUTATION REWARDS TESTS
// ============================================
describe('Reputation Rewards', () => {
  it('should have correct reward values', () => {
    expect(REPUTATION_REWARDS.ARTICLE_MERGED).toBe(3)
    expect(REPUTATION_REWARDS.SUBSTANTIAL_MERGE).toBe(8)
    expect(REPUTATION_REWARDS.CITED).toBe(1)
    expect(REPUTATION_REWARDS.UPVOTE).toBe(1)
    expect(REPUTATION_REWARDS.REVERTED).toBe(-5)
    expect(REPUTATION_REWARDS.BADGE_EARNED).toBe(5)
    expect(REPUTATION_REWARDS.PROMOTED).toBe(10)
  })

  it('should have higher rewards for more significant contributions', () => {
    expect(REPUTATION_REWARDS.SUBSTANTIAL_MERGE).toBeGreaterThan(
      REPUTATION_REWARDS.ARTICLE_MERGED
    )
    expect(REPUTATION_REWARDS.PROMOTED).toBeGreaterThan(
      REPUTATION_REWARDS.BADGE_EARNED
    )
  })

  it('should have negative value for REVERTED', () => {
    expect(REPUTATION_REWARDS.REVERTED).toBeLessThan(0)
  })
})

// ============================================
// SCORE CALCULATION TESTS (Pure Logic)
// ============================================
describe('Score Calculation Logic', () => {
  it('should correctly calculate weighted vote scores', () => {
    // Simulate vote calculation without database
    const votes = [
      { role: 'READER' as Role, value: 1 },
      { role: 'CONTRIBUTOR' as Role, value: 1 },
      { role: 'REVIEWER' as Role, value: 1 },
      { role: 'JUDGE' as Role, value: 1 },
      { role: 'MAINTAINER' as Role, value: 1 },
    ]

    const totalScore = votes.reduce((sum, vote) => {
      return sum + vote.value * ROLE_WEIGHTS[vote.role]
    }, 0)

    // 1 + 2 + 4 + 8 + 16 = 31
    expect(totalScore).toBe(31)
  })

  it('should handle negative votes correctly', () => {
    const votes = [
      { role: 'JUDGE' as Role, value: 1 },     // +8
      { role: 'REVIEWER' as Role, value: -1 }, // -4
      { role: 'READER' as Role, value: 1 },    // +1
    ]

    const totalScore = votes.reduce((sum, vote) => {
      return sum + vote.value * ROLE_WEIGHTS[vote.role]
    }, 0)

    // 8 - 4 + 1 = 5
    expect(totalScore).toBe(5)
  })

  it('should calculate if score meets threshold', () => {
    const testCases = [
      { score: 24, expectMeets: true },
      { score: 25, expectMeets: true },
      { score: 23, expectMeets: false },
      { score: 0, expectMeets: false },
    ]

    for (const { score, expectMeets } of testCases) {
      const meetsThreshold = score >= MERGE_THRESHOLDS.requiredScore
      expect(meetsThreshold).toBe(expectMeets)
    }
  })

  it('should count approvals by role correctly', () => {
    const votes = [
      { role: 'REVIEWER' as Role, value: 1 },
      { role: 'REVIEWER' as Role, value: 1 },
      { role: 'REVIEWER' as Role, value: -1 },
      { role: 'JUDGE' as Role, value: 1 },
      { role: 'MAINTAINER' as Role, value: 1 },
      { role: 'READER' as Role, value: 1 },
    ]

    let reviewerApprovals = 0
    let judgeApprovals = 0

    for (const vote of votes) {
      if (vote.value > 0) {
        if (vote.role === 'REVIEWER') {
          reviewerApprovals++
        } else if (vote.role === 'JUDGE' || vote.role === 'MAINTAINER') {
          judgeApprovals++
        }
      }
    }

    expect(reviewerApprovals).toBe(2)
    expect(judgeApprovals).toBe(2) // JUDGE + MAINTAINER
  })
})

// ============================================
// APPROVAL THRESHOLD LOGIC TESTS
// ============================================
describe('Approval Threshold Logic', () => {
  interface ThresholdInput {
    totalScore: number
    reviewerApprovals: number
    judgeApprovals: number
  }

  function checkThresholds(input: ThresholdInput) {
    const meetsScoreThreshold = input.totalScore >= MERGE_THRESHOLDS.requiredScore
    const meetsReviewerThreshold = input.reviewerApprovals >= MERGE_THRESHOLDS.requiredReviewerApprovals
    const meetsJudgeThreshold = input.judgeApprovals >= MERGE_THRESHOLDS.requiredJudgeApprovals

    return {
      meetsRequirements: meetsScoreThreshold || meetsReviewerThreshold || meetsJudgeThreshold,
      meetsScoreThreshold,
      meetsReviewerThreshold,
      meetsJudgeThreshold,
    }
  }

  it('should meet requirements when score threshold is met', () => {
    const result = checkThresholds({
      totalScore: 24,
      reviewerApprovals: 0,
      judgeApprovals: 0,
    })

    expect(result.meetsRequirements).toBe(true)
    expect(result.meetsScoreThreshold).toBe(true)
    expect(result.meetsReviewerThreshold).toBe(false)
    expect(result.meetsJudgeThreshold).toBe(false)
  })

  it('should meet requirements when reviewer threshold is met', () => {
    const result = checkThresholds({
      totalScore: 10,
      reviewerApprovals: 2,
      judgeApprovals: 0,
    })

    expect(result.meetsRequirements).toBe(true)
    expect(result.meetsScoreThreshold).toBe(false)
    expect(result.meetsReviewerThreshold).toBe(true)
    expect(result.meetsJudgeThreshold).toBe(false)
  })

  it('should meet requirements when judge threshold is met', () => {
    const result = checkThresholds({
      totalScore: 10,
      reviewerApprovals: 0,
      judgeApprovals: 1,
    })

    expect(result.meetsRequirements).toBe(true)
    expect(result.meetsScoreThreshold).toBe(false)
    expect(result.meetsReviewerThreshold).toBe(false)
    expect(result.meetsJudgeThreshold).toBe(true)
  })

  it('should not meet requirements when no thresholds are met', () => {
    const result = checkThresholds({
      totalScore: 10,
      reviewerApprovals: 1,
      judgeApprovals: 0,
    })

    expect(result.meetsRequirements).toBe(false)
    expect(result.meetsScoreThreshold).toBe(false)
    expect(result.meetsReviewerThreshold).toBe(false)
    expect(result.meetsJudgeThreshold).toBe(false)
  })

  it('should meet requirements when multiple thresholds are met', () => {
    const result = checkThresholds({
      totalScore: 30,
      reviewerApprovals: 3,
      judgeApprovals: 2,
    })

    expect(result.meetsRequirements).toBe(true)
    expect(result.meetsScoreThreshold).toBe(true)
    expect(result.meetsReviewerThreshold).toBe(true)
    expect(result.meetsJudgeThreshold).toBe(true)
  })
})

// ============================================
// EDGE CASE TESTS
// ============================================
describe('Edge Cases', () => {
  it('should handle zero votes', () => {
    const votes: { role: Role; value: number }[] = []
    const totalScore = votes.reduce((sum, vote) => {
      return sum + vote.value * ROLE_WEIGHTS[vote.role]
    }, 0)

    expect(totalScore).toBe(0)
  })

  it('should handle all negative votes', () => {
    const votes = [
      { role: 'JUDGE' as Role, value: -1 },
      { role: 'REVIEWER' as Role, value: -1 },
    ]

    const totalScore = votes.reduce((sum, vote) => {
      return sum + vote.value * ROLE_WEIGHTS[vote.role]
    }, 0)

    // -8 + -4 = -12
    expect(totalScore).toBe(-12)
  })

  it('should handle mixed positive and negative votes canceling out', () => {
    const votes = [
      { role: 'JUDGE' as Role, value: 1 },   // +8
      { role: 'JUDGE' as Role, value: -1 },  // -8
    ]

    const totalScore = votes.reduce((sum, vote) => {
      return sum + vote.value * ROLE_WEIGHTS[vote.role]
    }, 0)

    expect(totalScore).toBe(0)
  })

  it('should handle large number of low-weight votes', () => {
    // 24 READER votes should equal 24 points
    const votes = Array(24).fill({ role: 'READER' as Role, value: 1 })

    const totalScore = votes.reduce((sum, vote) => {
      return sum + vote.value * ROLE_WEIGHTS[vote.role]
    }, 0)

    expect(totalScore).toBe(24)
    expect(totalScore >= MERGE_THRESHOLDS.requiredScore).toBe(true)
  })
})
