import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessModeration } from '@/lib/permissions'
import { ROLE_WEIGHTS } from '@/lib/governance'
import { Role } from '@prisma/client'

interface RouteParams {
  params: Promise<{
    versionId: string
  }>
}

/**
 * GET /api/moderation/[versionId]
 * Get detailed moderation view for a version
 * Includes all votes and moderation actions history
 * Requires REVIEWER+ role
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { versionId } = await params

    if (!versionId) {
      return NextResponse.json(
        { error: 'Version ID is required' },
        { status: 400 }
      )
    }

    // Fetch the article version with all related data
    const articleVersion = await prisma.articleVersion.findUnique({
      where: { id: versionId },
      include: {
        article: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                image: true,
                reputation: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
            reputation: true,
          },
        },
        votes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        moderationActions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
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

    // Calculate weighted vote score
    const voteScore = articleVersion.votes.reduce((sum, vote) => {
      const weight = ROLE_WEIGHTS[vote.user.role as Role]
      return sum + vote.value * weight
    }, 0)

    // Calculate vote breakdown by role
    const voteBreakdown = {
      total: articleVersion.votes.length,
      upvotes: articleVersion.votes.filter((v) => v.value > 0).length,
      downvotes: articleVersion.votes.filter((v) => v.value < 0).length,
      byRole: {
        READER: { up: 0, down: 0 },
        CONTRIBUTOR: { up: 0, down: 0 },
        REVIEWER: { up: 0, down: 0 },
        JUDGE: { up: 0, down: 0 },
        MAINTAINER: { up: 0, down: 0 },
      } as Record<Role, { up: number; down: number }>,
    }

    for (const vote of articleVersion.votes) {
      const role = vote.user.role as Role
      if (vote.value > 0) {
        voteBreakdown.byRole[role].up++
      } else {
        voteBreakdown.byRole[role].down++
      }
    }

    // Format votes with additional details
    const formattedVotes = articleVersion.votes.map((vote) => ({
      id: vote.id,
      value: vote.value,
      weight: ROLE_WEIGHTS[vote.user.role as Role],
      weightedValue: vote.value * ROLE_WEIGHTS[vote.user.role as Role],
      createdAt: vote.createdAt,
      user: vote.user,
    }))

    return NextResponse.json({
      version: {
        id: articleVersion.id,
        versionNumber: articleVersion.versionNumber,
        bodyMdx: articleVersion.bodyMdx,
        changelog: articleVersion.changelog,
        createdAt: articleVersion.createdAt,
        createdBy: articleVersion.createdBy,
      },
      article: {
        id: articleVersion.article.id,
        slug: articleVersion.article.slug,
        title: articleVersion.article.title,
        summary: articleVersion.article.summary,
        status: articleVersion.article.status,
        category: articleVersion.article.category,
        tags: articleVersion.article.tags,
        author: articleVersion.article.author,
        createdAt: articleVersion.article.createdAt,
      },
      votes: formattedVotes,
      voteScore,
      voteBreakdown,
      moderationActions: articleVersion.moderationActions.map((action) => ({
        id: action.id,
        action: action.action,
        reason: action.reason,
        createdAt: action.createdAt,
        user: action.user,
      })),
    })
  } catch (error) {
    console.error('Error fetching moderation details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch moderation details' },
      { status: 500 }
    )
  }
}
