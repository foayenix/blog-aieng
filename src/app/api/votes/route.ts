import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ROLE_WEIGHTS, REPUTATION_REWARDS } from '@/lib/governance'
import { Role } from '@prisma/client'
import { applyReputationEvent } from '@/lib/reputation'
import { isRoleAtLeast } from '@/lib/permissions'

/**
 * POST /api/votes
 * Cast a vote on an article version
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { articleVersionId, value } = body

    // Validate input
    if (!articleVersionId || typeof articleVersionId !== 'string') {
      return NextResponse.json(
        { error: 'articleVersionId is required' },
        { status: 400 }
      )
    }

    if (value !== 1 && value !== -1) {
      return NextResponse.json(
        { error: 'value must be 1 or -1' },
        { status: 400 }
      )
    }

    // Verify article version exists
    const articleVersion = await prisma.articleVersion.findUnique({
      where: { id: articleVersionId },
      include: {
        article: true,
        createdBy: {
          select: {
            id: true,
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

    // Check if user already has a vote
    const existingVote = await prisma.vote.findUnique({
      where: {
        articleVersionId_userId: {
          articleVersionId,
          userId: session.user.id,
        },
      },
    })

    // Upsert the vote (one vote per user per version)
    const vote = await prisma.vote.upsert({
      where: {
        articleVersionId_userId: {
          articleVersionId,
          userId: session.user.id,
        },
      },
      update: {
        value,
      },
      create: {
        articleVersionId,
        userId: session.user.id,
        value,
      },
    })

    // Apply reputation event for upvote if voter is REVIEWER+
    // Only apply if this is a new upvote (not updating an existing vote)
    if (value === 1 && !existingVote && isRoleAtLeast(session.user.role, 'REVIEWER')) {
      await applyReputationEvent(
        articleVersion.createdBy.id,
        'UPVOTE',
        REPUTATION_REWARDS.UPVOTE,
        {
          articleId: articleVersion.articleId,
          articleVersionId,
          voterId: session.user.id,
        }
      )
    }

    // Calculate updated vote count and weighted score
    const votes = await prisma.vote.findMany({
      where: { articleVersionId },
      include: {
        user: {
          select: {
            role: true,
          },
        },
      },
    })

    const voteCount = votes.length
    const totalScore = votes.reduce((sum: number, v: typeof votes[number]) => {
      const weight = ROLE_WEIGHTS[v.user.role as Role]
      return sum + v.value * weight
    }, 0)

    return NextResponse.json({
      success: true,
      vote: {
        id: vote.id,
        value: vote.value,
      },
      voteCount,
      totalScore,
    })
  } catch (error) {
    console.error('Error casting vote:', error)
    return NextResponse.json(
      { error: 'Failed to cast vote' },
      { status: 500 }
    )
  }
}
