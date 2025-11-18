import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessAdmin } from '@/lib/permissions'
import { REPUTATION_REWARDS } from '@/lib/governance'
import { Role } from '@prisma/client'

const updateRoleSchema = z.object({
  role: z.nativeEnum(Role),
})

interface RouteParams {
  params: Promise<{
    userId: string
  }>
}

/**
 * PUT /api/admin/users/[userId]/role
 * Update user role
 * Requires MAINTAINER role
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const validationResult = updateRoleSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { role: newRole } = validationResult.data

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

    if (user.role === newRole) {
      return NextResponse.json(
        { error: 'User already has this role' },
        { status: 400 }
      )
    }

    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
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
        },
      })

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
