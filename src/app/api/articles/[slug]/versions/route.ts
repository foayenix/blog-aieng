import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isRoleAtLeast } from '@/lib/permissions'

// Schema for creating a new version
const createVersionSchema = z.object({
  bodyMdx: z.string().min(1, 'Body content is required'),
  changelog: z.string().min(1, 'Changelog is required').max(500, 'Changelog must be 500 characters or less'),
})

interface RouteParams {
  params: Promise<{ slug: string }>
}

// GET /api/articles/[slug]/versions - List all versions for article
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = await params
    const session = await getServerSession()

    // Find the article
    const article = await prisma.article.findUnique({
      where: { slug },
      select: {
        id: true,
        status: true,
        authorId: true,
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

    // Fetch all versions
    const versions = await prisma.articleVersion.findMany({
      where: { articleId: article.id },
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
            role: true,
          }
        },
        _count: {
          select: {
            votes: true
          }
        }
      },
      orderBy: {
        versionNumber: 'desc'
      }
    })

    return NextResponse.json({ versions })
  } catch (error) {
    console.error('Error fetching versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    )
  }
}

// POST /api/articles/[slug]/versions - Create new version (propose update)
export async function POST(
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
        status: true,
        authorId: true,
      }
    })

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Parse and validate input
    const body = await request.json()
    const validationResult = createVersionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { bodyMdx, changelog } = validationResult.data

    // Create new version in a transaction
    const version = await prisma.$transaction(async (tx) => {
      // Get the latest version number
      const latestVersion = await tx.articleVersion.findFirst({
        where: { articleId: article.id },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true }
      })

      const newVersionNumber = (latestVersion?.versionNumber || 0) + 1

      // Create the new version
      const newVersion = await tx.articleVersion.create({
        data: {
          articleId: article.id,
          versionNumber: newVersionNumber,
          bodyMdx,
          changelog,
          createdById: session.user.id,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              image: true,
              role: true,
            }
          }
        }
      })

      // Update article status to UNDER_REVIEW and set current version
      await tx.article.update({
        where: { id: article.id },
        data: {
          status: 'UNDER_REVIEW',
          currentVersionId: newVersion.id,
        }
      })

      return newVersion
    })

    return NextResponse.json(version, { status: 201 })
  } catch (error) {
    console.error('Error creating version:', error)
    return NextResponse.json(
      { error: 'Failed to create version' },
      { status: 500 }
    )
  }
}
