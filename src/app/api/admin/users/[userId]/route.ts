import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessAdmin } from '@/lib/permissions'
import { applyReputationEvent } from '@/lib/reputation'
import { REPUTATION_REWARDS } from '@/lib/governance'
import { Role } from '@prisma/client'

// Schema for updating user role
const updateRoleSchema = z.object({
  role: z.nativeEnum(Role),
})

/**
 * GET /api/admin/users/[userId]
 * Get user details with full history
 * Requires MAINTAINER role
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession()
    const { userId } = await params

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

    // Fetch user with full details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        articles: {
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            category: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        badges: {
          include: {
            badge: {
              select: {
                id: true,
                slug: true,
                label: true,
                description: true,
                icon: true,
              },
            },
          },
          orderBy: { awardedAt: 'desc' },
        },
        reputationEvents: {
          select: {
            id: true,
            type: true,
            delta: true,
            metadata: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        moderationActions: {
          select: {
            id: true,
            action: true,
            reason: true,
            createdAt: true,
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
          take: 50,
        },
        votes: {
          select: {
            id: true,
            value: true,
            createdAt: true,
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
          take: 50,
        },
        _count: {
          select: {
            articles: true,
            badges: true,
            votes: true,
            comments: true,
            reputationEvents: true,
            moderationActions: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Transform response
    const response = {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      reputation: user.reputation,
      bio: user.bio,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      articles: user.articles,
      badges: user.badges.map((ub: typeof user.badges[number]) => ({
        ...ub.badge,
        awardedAt: ub.awardedAt,
      })),
      reputationEvents: user.reputationEvents,
      moderationActions: user.moderationActions,
      votes: user.votes,
      counts: user._count,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching user details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/users/[userId]
 * Update user role manually
 * Requires MAINTAINER role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession()
    const { userId } = await params

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
    const validationResult = updateRoleSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { role: newRole } = validationResult.data

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, email: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if role is actually changing
    if (user.role === newRole) {
      return NextResponse.json(
        { error: 'User already has this role' },
        { status: 400 }
      )
    }

    // Prevent changing own role
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      )
    }

    // Update role and create PROMOTED reputation event
    const updatedUser = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      // Update user role
      const updated = await tx.user.update({
        where: { id: userId },
        data: { role: newRole },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          reputation: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      // Create PROMOTED reputation event
      await tx.reputationEvent.create({
        data: {
          userId,
          type: 'PROMOTED',
          delta: REPUTATION_REWARDS.PROMOTED,
          metadata: {
            previousRole: user.role,
            newRole: newRole,
            promotedBy: session.user.id,
            manual: true,
          },
        },
      })

      // Update user's reputation
      await tx.user.update({
        where: { id: userId },
        data: {
          reputation: {
            increment: REPUTATION_REWARDS.PROMOTED,
          },
        },
      })

      return updated
    })

    return NextResponse.json({
      user: updatedUser,
      message: `User role updated from ${user.role} to ${newRole}`,
    })
  } catch (error) {
    console.error('Error updating user role:', error)
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    )
  }
}
