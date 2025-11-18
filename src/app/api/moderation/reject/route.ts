import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canApproveArticle } from '@/lib/permissions'

/**
 * POST /api/moderation/reject
 * Reject an article version
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

    // Check REVIEWER+ role
    if (!canApproveArticle(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. REVIEWER role or higher required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { articleVersionId, reason } = body

    if (!articleVersionId || typeof articleVersionId !== 'string') {
      return NextResponse.json(
        { error: 'articleVersionId is required' },
        { status: 400 }
      )
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'reason is required' },
        { status: 400 }
      )
    }

    // Get the article version
    const articleVersion = await prisma.articleVersion.findUnique({
      where: { id: articleVersionId },
      include: {
        article: true,
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
        { error: 'Article is not under review' },
        { status: 400 }
      )
    }

    // Perform the rejection in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update article status to REJECTED
      const updatedArticle = await tx.article.update({
        where: { id: articleVersion.articleId },
        data: {
          status: 'REJECTED',
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      })

      // Log moderation action
      await tx.moderationAction.create({
        data: {
          articleVersionId,
          userId: session.user.id,
          action: 'REJECTED',
          reason: reason.trim(),
        },
      })

      return updatedArticle
    })

    return NextResponse.json({
      success: true,
      article: result,
    })
  } catch (error) {
    console.error('Error rejecting article:', error)
    return NextResponse.json(
      { error: 'Failed to reject article' },
      { status: 500 }
    )
  }
}
