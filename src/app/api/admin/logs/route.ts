import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessAdmin } from '@/lib/permissions'
import { ReputationEventType } from '@prisma/client'

// Query parameters schema
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  type: z.enum(['reputation', 'moderation', 'all']).default('all'),
  eventType: z.nativeEnum(ReputationEventType).optional(),
  userId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

/**
 * GET /api/admin/logs
 * Get audit logs (reputation events, moderation actions)
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryResult = querySchema.safeParse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
      type: searchParams.get('type') || 'all',
      eventType: searchParams.get('eventType') || undefined,
      userId: searchParams.get('userId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryResult.error.flatten() },
        { status: 400 }
      )
    }

    const { page, limit, type, eventType, userId, startDate, endDate } = queryResult.data
    const skip = (page - 1) * limit

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate)
    }

    const logs: any[] = []
    let totalReputation = 0
    let totalModeration = 0

    // Fetch reputation events
    if (type === 'all' || type === 'reputation') {
      const reputationWhere: any = {}

      if (userId) {
        reputationWhere.userId = userId
      }
      if (eventType) {
        reputationWhere.type = eventType
      }
      if (Object.keys(dateFilter).length > 0) {
        reputationWhere.createdAt = dateFilter
      }

      const [reputationEvents, reputationCount] = await Promise.all([
        prisma.reputationEvent.findMany({
          where: reputationWhere,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: type === 'reputation' ? skip : 0,
          take: type === 'reputation' ? limit : Math.ceil(limit / 2),
        }),
        prisma.reputationEvent.count({ where: reputationWhere }),
      ])

      totalReputation = reputationCount

      logs.push(
        ...reputationEvents.map((event: typeof reputationEvents[number]) => ({
          id: event.id,
          logType: 'reputation' as const,
          type: event.type,
          delta: event.delta,
          metadata: event.metadata,
          createdAt: event.createdAt,
          user: event.user,
        }))
      )
    }

    // Fetch moderation actions
    if (type === 'all' || type === 'moderation') {
      const moderationWhere: any = {}

      if (userId) {
        moderationWhere.userId = userId
      }
      if (Object.keys(dateFilter).length > 0) {
        moderationWhere.createdAt = dateFilter
      }

      const [moderationActions, moderationCount] = await Promise.all([
        prisma.moderationAction.findMany({
          where: moderationWhere,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
            articleVersion: {
              select: {
                id: true,
                versionNumber: true,
                article: {
                  select: {
                    id: true,
                    slug: true,
                    title: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: type === 'moderation' ? skip : 0,
          take: type === 'moderation' ? limit : Math.ceil(limit / 2),
        }),
        prisma.moderationAction.count({ where: moderationWhere }),
      ])

      totalModeration = moderationCount

      logs.push(
        ...moderationActions.map((action: typeof moderationActions[number]) => ({
          id: action.id,
          logType: 'moderation' as const,
          action: action.action,
          reason: action.reason,
          createdAt: action.createdAt,
          user: action.user,
          articleVersion: action.articleVersion,
        }))
      )
    }

    // Sort all logs by date
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Calculate total based on type
    let total: number
    if (type === 'reputation') {
      total = totalReputation
    } else if (type === 'moderation') {
      total = totalModeration
    } else {
      total = totalReputation + totalModeration
    }

    // Apply pagination for combined results
    const paginatedLogs = type === 'all' ? logs.slice(skip, skip + limit) : logs

    return NextResponse.json({
      logs: paginatedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + paginatedLogs.length < total,
      },
      counts: {
        reputation: totalReputation,
        moderation: totalModeration,
      },
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
