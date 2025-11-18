import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessAdmin } from '@/lib/permissions'
import { REPUTATION_REWARDS } from '@/lib/governance'

// Schema for awarding a badge
const awardBadgeSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  badgeSlug: z.string().min(1, 'Badge slug is required'),
})

/**
 * POST /api/admin/badges/award
 * Manually award a badge to a user
 * Requires MAINTAINER role
 */
export async function POST(request: NextRequest) {
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

    // Parse and validate input
    const body = await request.json()
    const validationResult = awardBadgeSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { userId, badgeSlug } = validationResult.data

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
      where: { slug: badgeSlug },
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
          badgeId: badge.id,
        },
      },
    })

    if (existingUserBadge) {
      return NextResponse.json(
        { error: 'User already has this badge' },
        { status: 409 }
      )
    }

    // Award badge and create reputation event
    const result = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      // Create user badge
      const userBadge = await tx.userBadge.create({
        data: {
          userId,
          badgeId: badge.id,
        },
        include: {
          badge: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      // Create BADGE_EARNED reputation event
      await tx.reputationEvent.create({
        data: {
          userId,
          type: 'BADGE_EARNED',
          delta: REPUTATION_REWARDS.BADGE_EARNED,
          metadata: {
            badgeId: badge.id,
            badgeSlug: badge.slug,
            badgeLabel: badge.label,
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
      userBadge: {
        id: result.id,
        awardedAt: result.awardedAt,
        badge: result.badge,
        user: result.user,
      },
      message: `Badge "${badge.label}" awarded to user successfully`,
    }, { status: 201 })
  } catch (error) {
    console.error('Error awarding badge:', error)
    return NextResponse.json(
      { error: 'Failed to award badge' },
      { status: 500 }
    )
  }
}
