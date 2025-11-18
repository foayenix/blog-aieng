import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessAdmin } from '@/lib/permissions'

/**
 * GET /api/admin/stats
 * Get platform statistics
 * Requires MAINTAINER role
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    // Check authentication
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check MAINTAINER role
    if (!canAccessAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. MAINTAINER role required.' },
        { status: 403 }
      )
    }

    // Get all statistics in parallel
    const [
      // Users by role
      usersByRole,
      totalUsers,

      // Articles by status
      articlesByStatus,
      totalArticles,

      // Recent activity (last 7 days)
      recentUsers,
      recentArticles,
      recentVotes,
      recentComments,

      // Top contributors (by reputation)
      topContributors,

      // Badge statistics
      totalBadges,
      totalBadgesAwarded,

      // Moderation statistics
      pendingModeration,
      recentModerationActions,
    ] = await Promise.all([
      // Users by role
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      prisma.user.count(),

      // Articles by status
      prisma.article.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.article.count(),

      // Recent activity (last 7 days)
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.article.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.vote.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.threadComment.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Top contributors (by reputation)
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          reputation: true,
          _count: {
            select: {
              articles: true,
              badges: true,
            },
          },
        },
        orderBy: { reputation: 'desc' },
        take: 10,
      }),

      // Badge statistics
      prisma.badge.count(),
      prisma.userBadge.count(),

      // Moderation statistics
      prisma.article.count({
        where: { status: 'UNDER_REVIEW' },
      }),
      prisma.moderationAction.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ])

    // Transform users by role
    const usersByRoleMap: Record<string, number> = {
      READER: 0,
      CONTRIBUTOR: 0,
      REVIEWER: 0,
      JUDGE: 0,
      MAINTAINER: 0,
    }
    for (const item of usersByRole) {
      usersByRoleMap[item.role] = item._count.id
    }

    // Transform articles by status
    const articlesByStatusMap: Record<string, number> = {
      DRAFT: 0,
      UNDER_REVIEW: 0,
      PUBLISHED: 0,
      REJECTED: 0,
    }
    for (const item of articlesByStatus) {
      articlesByStatusMap[item.status] = item._count.id
    }

    // Transform top contributors
    const transformedContributors = topContributors.map((user: typeof topContributors[number]) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      reputation: user.reputation,
      articlesCount: user._count.articles,
      badgesCount: user._count.badges,
    }))

    return NextResponse.json({
      users: {
        total: totalUsers,
        byRole: usersByRoleMap,
      },
      articles: {
        total: totalArticles,
        byStatus: articlesByStatusMap,
      },
      recentActivity: {
        period: '7 days',
        newUsers: recentUsers,
        newArticles: recentArticles,
        votes: recentVotes,
        comments: recentComments,
      },
      moderation: {
        pendingReview: pendingModeration,
        recentActions: recentModerationActions,
      },
      badges: {
        total: totalBadges,
        awarded: totalBadgesAwarded,
      },
      topContributors: transformedContributors,
    })
  } catch (error) {
    console.error('Error fetching platform stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch platform statistics' },
      { status: 500 }
    )
  }
}
