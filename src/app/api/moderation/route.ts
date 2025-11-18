import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessModeration } from '@/lib/permissions'
import { ROLE_WEIGHTS } from '@/lib/governance'
import { Role, ArticleCategory } from '@prisma/client'
import { z } from 'zod'

// Query parameter validation schema
const querySchema = z.object({
  category: z.nativeEnum(ArticleCategory).optional(),
  minAge: z.string().regex(/^\d+$/).transform(Number).optional(),
  maxAge: z.string().regex(/^\d+$/).transform(Number).optional(),
  minScore: z.string().regex(/^-?\d+$/).transform(Number).optional(),
  maxScore: z.string().regex(/^-?\d+$/).transform(Number).optional(),
})

/**
 * GET /api/moderation
 * List article versions under review
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
      category: searchParams.get('category') || undefined,
      minAge: searchParams.get('minAge') || undefined,
      maxAge: searchParams.get('maxAge') || undefined,
      minScore: searchParams.get('minScore') || undefined,
      maxScore: searchParams.get('maxScore') || undefined,
    }

    const parseResult = querySchema.safeParse(rawParams)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parseResult.error.issues },
        { status: 400 }
      )
    }

    const { category, minAge, maxAge, minScore, maxScore } = parseResult.data

    // Build date filters
    const now = new Date()
    let createdAtFilter: { gte?: Date; lte?: Date } = {}

    if (minAge !== undefined) {
      createdAtFilter.lte = new Date(now.getTime() - minAge * 60 * 60 * 1000)
    }

    if (maxAge !== undefined) {
      createdAtFilter.gte = new Date(now.getTime() - maxAge * 60 * 60 * 1000)
    }

    // Query articles under review
    const articles = await prisma.article.findMany({
      where: {
        status: 'UNDER_REVIEW',
        ...(category && { category }),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
          },
        },
        versions: {
          where: {
            ...(Object.keys(createdAtFilter).length > 0 && { createdAt: createdAtFilter }),
          },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
            votes: {
              include: {
                user: {
                  select: {
                    role: true,
                  },
                },
              },
            },
          },
          orderBy: {
            versionNumber: 'desc',
          },
        },
      },
    })

    // Transform data and calculate scores
    const versionsUnderReview = articles.flatMap((article: typeof articles[number]) =>
      article.versions.map((version: typeof article.versions[number]) => {
        // Calculate weighted score
        const totalScore = version.votes.reduce((sum: number, vote: typeof version.votes[number]) => {
          const weight = ROLE_WEIGHTS[vote.user.role as Role]
          return sum + vote.value * weight
        }, 0)

        // Calculate approval counts
        const approvalCounts = {
          reviewer: 0,
          judge: 0,
        }

        for (const vote of version.votes) {
          if (vote.value > 0) {
            if (vote.user.role === 'REVIEWER') {
              approvalCounts.reviewer++
            } else if (vote.user.role === 'JUDGE' || vote.user.role === 'MAINTAINER') {
              approvalCounts.judge++
            }
          }
        }

        return {
          versionId: version.id,
          versionNumber: version.versionNumber,
          changelog: version.changelog,
          createdAt: version.createdAt,
          createdBy: version.createdBy,
          article: {
            id: article.id,
            slug: article.slug,
            title: article.title,
            summary: article.summary,
            category: article.category,
            tags: article.tags,
            author: article.author,
          },
          voteScore: totalScore,
          voteCount: version.votes.length,
          approvalCounts,
        }
      })
    )

    // Filter by score if provided
    let filteredVersions = versionsUnderReview
    if (minScore !== undefined) {
      filteredVersions = filteredVersions.filter((v: typeof versionsUnderReview[number]) => v.voteScore >= minScore)
    }
    if (maxScore !== undefined) {
      filteredVersions = filteredVersions.filter((v: typeof versionsUnderReview[number]) => v.voteScore <= maxScore)
    }

    // Sort by oldest first (FIFO for review)
    filteredVersions.sort(
      (a: typeof versionsUnderReview[number], b: typeof versionsUnderReview[number]) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    return NextResponse.json({
      versions: filteredVersions,
      total: filteredVersions.length,
    })
  } catch (error) {
    console.error('Error fetching moderation queue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch moderation queue' },
      { status: 500 }
    )
  }
}
