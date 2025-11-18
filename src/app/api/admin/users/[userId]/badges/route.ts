import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessAdmin } from '@/lib/permissions'
import { applyReputationEvent } from '@/lib/reputation'
import { REPUTATION_REWARDS } from '@/lib/governance'

const awardBadgeSchema = z.object({
  badgeId: z.string().min(1, 'Badge ID is required'),
})

interface RouteParams {
  params: Promise<{
    userId: string
  }>
}

/**
 * POST /api/admin/users/[userId]/badges
 * Award a badge to a user
 * Requires MAINTAINER role
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    const { userId } = await params

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!canAccessAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. MAINTAINER role required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = awardBadgeSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { badgeId } = validationResult.data

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if badge exists
    const badge = await prisma.badge.findUnique({
      where: { id: badgeId },
    })

    if (!badge) {
      return NextResponse.json(
        { error: 'Badge not found' },
        { status: 404 }
      )
    }

    // Check if user already has this badge
    const existingUserBadge = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId,
          badgeId,
        },
      },
    })

    if (existingUserBadge) {
      return NextResponse.json(
        { error: 'User already has this badge' },
        { status: 409 }
      )
    }

    // Award badge in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user badge
      const userBadge = await tx.userBadge.create({
        data: {
          userId,
          badgeId,
        },
        include: {
          badge: true,
        },
      })

      // Apply reputation event for badge earned
      await tx.reputationEvent.create({
        data: {
          userId,
          type: 'BADGE_EARNED',
          delta: REPUTATION_REWARDS.BADGE_EARNED,
          metadata: {
            badgeId: badge.id,
            badgeSlug: badge.slug,
            awardedBy: session.user.id,
            manual: true,
          },
        },
      })

      // Update user's reputation
      await tx.user.update({
        where: { id: userId },
        data: {
          reputation: {
            increment: REPUTATION_REWARDS.BADGE_EARNED,
          },
        },
      })

      return userBadge
    })

    return NextResponse.json({
      userBadge: result,
      message: `Badge "${badge.label}" awarded to user`,
    }, { status: 201 })
  } catch (error) {
    console.error('Error awarding badge:', error)
    return NextResponse.json(
      { error: 'Failed to award badge' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/users/[userId]/badges
 * Get all badges for a user
 * Requires MAINTAINER role
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    const { userId } = await params

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!canAccessAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. MAINTAINER role required.' },
        { status: 403 }
      )
    }

    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: true,
      },
      orderBy: {
        awardedAt: 'desc',
      },
    })

    return NextResponse.json({
      badges: userBadges.map((ub) => ({
        ...ub.badge,
        awardedAt: ub.awardedAt,
      })),
    })
  } catch (error) {
    console.error('Error fetching user badges:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user badges' },
      { status: 500 }
    )
  }
}
