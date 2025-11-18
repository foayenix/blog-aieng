import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessAdmin } from '@/lib/permissions'

// Schema for creating a badge
const createBadgeSchema = z.object({
  slug: z.string()
    .min(1, 'Slug is required')
    .max(50, 'Slug must be 50 characters or less')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  label: z.string()
    .min(1, 'Label is required')
    .max(100, 'Label must be 100 characters or less'),
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description must be 500 characters or less'),
  icon: z.string().optional(),
})

/**
 * GET /api/admin/badges
 * List all badges
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

    // Fetch all badges with user counts
    const badges = await prisma.badge.findMany({
      include: {
        _count: {
          select: {
            userBadges: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform response
    const transformedBadges = badges.map((badge: typeof badges[number]) => ({
      id: badge.id,
      slug: badge.slug,
      label: badge.label,
      description: badge.description,
      icon: badge.icon,
      createdAt: badge.createdAt,
      awardedCount: badge._count.userBadges,
    }))

    return NextResponse.json({
      badges: transformedBadges,
      total: badges.length,
    })
  } catch (error) {
    console.error('Error fetching badges:', error)
    return NextResponse.json(
      { error: 'Failed to fetch badges' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/badges
 * Create a new badge
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
    const validationResult = createBadgeSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { slug, label, description, icon } = validationResult.data

    // Check if slug already exists
    const existingBadge = await prisma.badge.findUnique({
      where: { slug },
    })

    if (existingBadge) {
      return NextResponse.json(
        { error: 'A badge with this slug already exists' },
        { status: 409 }
      )
    }

    // Create badge
    const badge = await prisma.badge.create({
      data: {
        slug,
        label,
        description,
        icon,
      },
    })

    return NextResponse.json(badge, { status: 201 })
  } catch (error) {
    console.error('Error creating badge:', error)
    return NextResponse.json(
      { error: 'Failed to create badge' },
      { status: 500 }
    )
  }
}
