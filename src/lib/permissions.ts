import { Role } from '@prisma/client'
import { ROLE_WEIGHTS, ROLE_HIERARCHY, getRoleIndex } from './governance'

/**
 * Get the weight value for a given role
 */
export function getRoleWeight(role: Role): number {
  return ROLE_WEIGHTS[role]
}

/**
 * Check if a user's role is at least the required role level
 */
export function isRoleAtLeast(userRole: Role, requiredRole: Role): boolean {
  return getRoleIndex(userRole) >= getRoleIndex(requiredRole)
}

/**
 * Check if user can create new articles
 * Requires CONTRIBUTOR role or higher
 */
export function canCreateArticle(role: Role): boolean {
  return isRoleAtLeast(role, 'CONTRIBUTOR')
}

/**
 * Check if user can edit an article
 * Must be the author OR have REVIEWER role or higher
 */
export function canEditArticle(role: Role, isAuthor: boolean): boolean {
  if (isAuthor) return true
  return isRoleAtLeast(role, 'REVIEWER')
}

/**
 * Check if user can vote on articles
 * All roles can vote
 */
export function canVote(role: Role): boolean {
  return ROLE_HIERARCHY.includes(role)
}

/**
 * Check if user can approve articles for publishing
 * Requires REVIEWER role or higher
 */
export function canApproveArticle(role: Role): boolean {
  return isRoleAtLeast(role, 'REVIEWER')
}

/**
 * Check if user can force approve articles (bypass normal approval flow)
 * Requires JUDGE role or higher
 */
export function canForceApprove(role: Role): boolean {
  return isRoleAtLeast(role, 'JUDGE')
}

/**
 * Check if user can access moderation tools
 * Requires REVIEWER role or higher
 */
export function canAccessModeration(role: Role): boolean {
  return isRoleAtLeast(role, 'REVIEWER')
}

/**
 * Check if user can access admin panel
 * Requires MAINTAINER role only
 */
export function canAccessAdmin(role: Role): boolean {
  return role === 'MAINTAINER'
}

/**
 * Check if user can delete articles
 * Requires JUDGE role or higher
 */
export function canDeleteArticle(role: Role): boolean {
  return isRoleAtLeast(role, 'JUDGE')
}

/**
 * Check if user can manage other users
 * Requires MAINTAINER role only
 */
export function canManageUsers(role: Role): boolean {
  return role === 'MAINTAINER'
}

/**
 * Check if user can create comments
 * All roles can comment
 */
export function canComment(role: Role): boolean {
  return ROLE_HIERARCHY.includes(role)
}

/**
 * Check if user can moderate comments (delete, hide, etc.)
 * Requires REVIEWER role or higher
 */
export function canModerateComments(role: Role): boolean {
  return isRoleAtLeast(role, 'REVIEWER')
}

/**
 * Get all permissions for a given role
 */
export function getPermissions(role: Role): {
  canCreateArticle: boolean
  canVote: boolean
  canApproveArticle: boolean
  canForceApprove: boolean
  canAccessModeration: boolean
  canAccessAdmin: boolean
  canDeleteArticle: boolean
  canManageUsers: boolean
  canComment: boolean
  canModerateComments: boolean
} {
  return {
    canCreateArticle: canCreateArticle(role),
    canVote: canVote(role),
    canApproveArticle: canApproveArticle(role),
    canForceApprove: canForceApprove(role),
    canAccessModeration: canAccessModeration(role),
    canAccessAdmin: canAccessAdmin(role),
    canDeleteArticle: canDeleteArticle(role),
    canManageUsers: canManageUsers(role),
    canComment: canComment(role),
    canModerateComments: canModerateComments(role),
  }
}
