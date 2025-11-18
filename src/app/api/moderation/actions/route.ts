import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessModeration } from '@/lib/permissions'
import { z } from 'zod'

// Valid moderation action types
const MODERATION_ACTION_TYPES = [
  'APPROVED',
  'REJECTED',
  'FORCE_APPROVED',
  'FORCE_REJECTED',
] as const

// Query parameter validation schema
const querySchema = z.object({
  userId: z.string().optional(),
  action: z.enum(MODERATION_ACTION_TYPES).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
  offset: z.string().regex(/^\d+$/).transform(Number).default('0'),
})

/**
 * GET /api/moderation/actions
 * Get moderation action history (audit log)
 * Requires REVIEWER+ role
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check REVIEWER+ role
    if (!canAccessModeration(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. REVIEWER role or higher required.' },
        { status: 403 }
      )
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const rawParams = {
      userId: searchParams.get('userId') || undefined,
      action: searchParams.get('action') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      limit: searchParams.get('limit') || '50',
      offset: searchParams.get('offset') || '0',
    }

    const parseResult = querySchema.safeParse(rawParams)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parseResult.error.issues },
        { status: 400 }
      )
    }

    const { userId, action, startDate, endDate, limit, offset } = parseResult.data

    // Build where clause
    const whereClause: {
      userId?: string
      action?: string
      createdAt?: { gte?: Date; lte?: Date }
    } = {}

    if (userId) {
      whereClause.userId = userId
    }

    if (action) {
      whereClause.action = action
    }

    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate)
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.moderationAction.count({
      where: whereClause,
    })

    // Fetch moderation actions
    const actions = await prisma.moderationAction.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
          },
        },
        articleVersion: {
          include: {
            article: {
              select: {
                id: true,
                slug: true,
                title: true,
                category: true,
                author: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(limit, 100), // Cap at 100 items
      skip: offset,
    })

    // Format the response
    const formattedActions = actions.map((action) => ({
      id: action.id,
      action: action.action,
      reason: action.reason,
      createdAt: action.createdAt,
      moderator: action.user,
      version: {
        id: action.articleVersion.id,
        versionNumber: action.articleVersion.versionNumber,
        article: action.articleVersion.article,
      },
    }))

    return NextResponse.json({
      actions: formattedActions,
      pagination: {
        total: totalCount,
        limit: Math.min(limit, 100),
        offset,
        hasMore: offset + formattedActions.length < totalCount,
      },
    })
  } catch (error) {
    console.error('Error fetching moderation actions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch moderation actions' },
      { status: 500 }
    )
  }
}
