import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isRoleAtLeast } from '@/lib/permissions'
import { ArticleCategory } from '@prisma/client'

// Schema for updating article metadata
const updateArticleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  summary: z.string().min(1).max(500).optional(),
  category: z.nativeEnum(ArticleCategory).optional(),
  tags: z.array(z.string()).min(1).max(10).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
})

interface RouteParams {
  params: Promise<{ slug: string }>
}

// GET /api/articles/[slug] - Get article by slug
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = await params
    const session = await getServerSession()

    const article = await prisma.article.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            reputation: true,
            bio: true,
          }
        },
        currentVersion: {
          select: {
            id: true,
            versionNumber: true,
            bodyMdx: true,
            changelog: true,
            createdAt: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                image: true,
              }
            }
          }
        },
        versions: {
          select: {
            id: true,
            versionNumber: true,
            changelog: true,
            createdAt: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                image: true,
              }
            }
          },
          orderBy: {
            versionNumber: 'desc'
          }
        },
        _count: {
          select: {
            citedBy: true
          }
        }
      }
    })

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Check if user can view non-published articles
    if (article.status !== 'PUBLISHED') {
      const isAuthor = session?.user?.id === article.authorId
      const isReviewerOrAbove = session?.user?.role && isRoleAtLeast(session.user.role, 'REVIEWER')

      if (!isAuthor && !isReviewerOrAbove) {
        return NextResponse.json(
          { error: 'Article not found' },
          { status: 404 }
        )
      }
    }

    // Increment view count (don't await to avoid blocking response)
    prisma.article.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } }
    }).catch(err => console.error('Failed to increment view count:', err))

    return NextResponse.json(article)
  } catch (error) {
    console.error('Error fetching article:', error)
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    )
  }
}

// PATCH /api/articles/[slug] - Update article metadata
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = await params
    const session = await getServerSession()

    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Find the article
    const article = await prisma.article.findUnique({
      where: { slug },
      select: {
        id: true,
        authorId: true,
      }
    })

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Check permission (author or MAINTAINER only)
    const isAuthor = session.user.id === article.authorId
    const isMaintainer = isRoleAtLeast(session.user.role, 'MAINTAINER')

    if (!isAuthor && !isMaintainer) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only the author or MAINTAINER can update article metadata.' },
        { status: 403 }
      )
    }

    // Parse and validate input
    const body = await request.json()
    const validationResult = updateArticleSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    // Update the article
    const updatedArticle = await prisma.article.update({
      where: { id: article.id },
      data: updateData,
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
        }
      }
    })

    return NextResponse.json(updatedArticle)
  } catch (error) {
    console.error('Error updating article:', error)
    return NextResponse.json(
      { error: 'Failed to update article' },
      { status: 500 }
    )
  }
}
