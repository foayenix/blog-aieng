import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canCreateArticle, isRoleAtLeast } from '@/lib/permissions'
import { ArticleCategory, ArticleStatus } from '@prisma/client'

// Schema for creating an article
const createArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  slug: z.string().min(1, 'Slug is required').max(100, 'Slug must be 100 characters or less')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  summary: z.string().min(1, 'Summary is required').max(500, 'Summary must be 500 characters or less'),
  category: z.nativeEnum(ArticleCategory),
  tags: z.array(z.string()).min(1, 'At least one tag is required').max(10, 'Maximum 10 tags allowed'),
  bodyMdx: z.string().min(1, 'Body content is required'),
})

// GET /api/articles - List articles with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const category = searchParams.get('category') as ArticleCategory | null
    const status = searchParams.get('status') as ArticleStatus | null
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)
    const search = searchParams.get('search')
    const authorId = searchParams.get('author')

    // Determine which statuses to show based on user role
    const isReviewerOrAbove = session?.user?.role && isRoleAtLeast(session.user.role, 'REVIEWER')

    // Build where clause
    const where: any = {}

    // Status filtering
    if (status) {
      // Only allow specific status filter for REVIEWER+ users
      if (isReviewerOrAbove) {
        where.status = status
      } else if (status === 'PUBLISHED') {
        where.status = 'PUBLISHED'
      } else {
        // Non-reviewers can only see their own non-published articles
        if (session?.user?.id) {
          where.OR = [
            { status: 'PUBLISHED' },
            { status, authorId: session.user.id }
          ]
        } else {
          where.status = 'PUBLISHED'
        }
      }
    } else {
      // Default: show only PUBLISHED for public, all for REVIEWER+
      if (isReviewerOrAbove) {
        // Show all statuses
      } else if (session?.user?.id) {
        // Show published + own articles
        where.OR = [
          { status: 'PUBLISHED' },
          { authorId: session.user.id }
        ]
      } else {
        where.status = 'PUBLISHED'
      }
    }

    // Category filter
    if (category && Object.values(ArticleCategory).includes(category)) {
      where.category = category
    }

    // Tags filter
    if (tags && tags.length > 0) {
      where.tags = {
        hasEvery: tags
      }
    }

    // Search filter
    if (search) {
      const searchCondition = {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { summary: { contains: search, mode: 'insensitive' as const } },
        ]
      }

      if (where.OR) {
        where.AND = [{ OR: where.OR }, searchCondition]
        delete where.OR
      } else {
        where.AND = [searchCondition]
      }
    }

    // Author filter
    if (authorId) {
      where.authorId = authorId
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit

    // Fetch articles with author info
    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              role: true,
            }
          },
          currentVersion: {
            select: {
              id: true,
              versionNumber: true,
              createdAt: true,
            }
          },
          _count: {
            select: {
              versions: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        skip,
        take: limit,
      }),
      prisma.article.count({ where })
    ])

    return NextResponse.json({
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + articles.length < total
      }
    })
  } catch (error) {
    console.error('Error fetching articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}

// POST /api/articles - Create new article
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permission (CONTRIBUTOR+ role required)
    if (!canCreateArticle(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. CONTRIBUTOR role or higher required.' },
        { status: 403 }
      )
    }

    // Parse and validate input
    const body = await request.json()
    const validationResult = createArticleSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { title, slug, summary, category, tags, bodyMdx } = validationResult.data

    // Check if slug already exists
    const existingArticle = await prisma.article.findUnique({
      where: { slug }
    })

    if (existingArticle) {
      return NextResponse.json(
        { error: 'An article with this slug already exists' },
        { status: 409 }
      )
    }

    // Create article with initial version and thread in a transaction
    const article = await prisma.$transaction(async (tx) => {
      // Create the article
      const newArticle = await tx.article.create({
        data: {
          title,
          slug,
          summary,
          category,
          tags,
          status: 'UNDER_REVIEW',
          authorId: session.user.id,
        }
      })

      // Create the initial version
      const version = await tx.articleVersion.create({
        data: {
          articleId: newArticle.id,
          versionNumber: 1,
          bodyMdx,
          changelog: 'Initial version',
          createdById: session.user.id,
        }
      })

      // Update article with current version
      const updatedArticle = await tx.article.update({
        where: { id: newArticle.id },
        data: { currentVersionId: version.id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              role: true,
            }
          },
          currentVersion: {
            select: {
              id: true,
              versionNumber: true,
              bodyMdx: true,
              changelog: true,
              createdAt: true,
            }
          }
        }
      })

      // Create associated thread
      await tx.thread.create({
        data: {
          articleId: newArticle.id,
          createdById: session.user.id,
        }
      })

      return updatedArticle
    })

    return NextResponse.json(article, { status: 201 })
  } catch (error) {
    console.error('Error creating article:', error)
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    )
  }
}
