import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canVote, canAccessModeration } from '@/lib/permissions'

const voteSchema = z.object({
  value: z.number().refine((val) => val === 1 || val === -1, {
    message: 'Vote value must be 1 or -1',
  }),
})

interface RouteParams {
  params: Promise<{
    versionId: string
  }>
}

/**
 * POST /api/moderation/[versionId]/vote
 * Cast a vote on an article version
 * Requires REVIEWER+ role for moderation votes
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    const { versionId } = await params

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user can access moderation (REVIEWER+)
    if (!canAccessModeration(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. REVIEWER role or higher required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = voteSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { value } = validationResult.data

    // Check if article version exists and is under review
    const articleVersion = await prisma.articleVersion.findUnique({
      where: { id: versionId },
      include: {
        article: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    })

    if (!articleVersion) {
      return NextResponse.json(
        { error: 'Article version not found' },
        { status: 404 }
      )
    }

    if (articleVersion.article.status !== 'UNDER_REVIEW') {
      return NextResponse.json(
        { error: 'Can only vote on articles under review' },
        { status: 400 }
      )
    }

    // Prevent voting on own version
    if (articleVersion.createdById === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot vote on your own version' },
        { status: 400 }
      )
    }

    // Upsert vote (create or update)
    const vote = await prisma.vote.upsert({
      where: {
        articleVersionId_userId: {
          articleVersionId: versionId,
          userId: session.user.id,
        },
      },
      create: {
        articleVersionId: versionId,
        userId: session.user.id,
        value,
      },
      update: {
        value,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json({
      vote,
      message: value > 0 ? 'Vote cast: +1' : 'Vote cast: -1',
    })
  } catch (error) {
    console.error('Error casting vote:', error)
    return NextResponse.json(
      { error: 'Failed to cast vote' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/moderation/[versionId]/vote
 * Remove vote from an article version
 * Requires REVIEWER+ role
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    const { versionId } = await params

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!canAccessModeration(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. REVIEWER role or higher required.' },
        { status: 403 }
      )
    }

    const vote = await prisma.vote.findUnique({
      where: {
        articleVersionId_userId: {
          articleVersionId: versionId,
          userId: session.user.id,
        },
      },
    })

    if (!vote) {
      return NextResponse.json(
        { error: 'Vote not found' },
        { status: 404 }
      )
    }

    await prisma.vote.delete({
      where: {
        articleVersionId_userId: {
          articleVersionId: versionId,
          userId: session.user.id,
        },
      },
    })

    return NextResponse.json({
      message: 'Vote removed',
    })
  } catch (error) {
    console.error('Error removing vote:', error)
    return NextResponse.json(
      { error: 'Failed to remove vote' },
      { status: 500 }
    )
  }
}
