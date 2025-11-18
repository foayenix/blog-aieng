import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canComment } from '@/lib/permissions'
import { checkCommentRateLimit, getRateLimitRemainingTime } from '@/lib/rate-limit'

interface RouteParams {
  params: Promise<{ threadId: string }>
}

// Schema for creating a comment
const createCommentSchema = z.object({
  body: z.string().min(1, 'Comment body is required').max(10000, 'Comment body is too long'),
  parentCommentId: z.string().optional(),
})

// GET /api/threads/[threadId]/comments - List comments with pagination
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { threadId } = await params
    const { searchParams } = new URL(request.url)

    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    // Check if thread exists
    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      select: { id: true },
    })

    if (!thread) {
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404 }
      )
    }

    // Get total count
    const totalCount = await prisma.threadComment.count({
      where: { threadId },
    })

    // Get comments with pagination
    const comments = await prisma.threadComment.findMany({
      where: { threadId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            reputation: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      skip,
      take: limit,
    })

    return NextResponse.json({
      comments,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + comments.length < totalCount,
      },
    })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

// POST /api/threads/[threadId]/comments - Create a new comment
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { threadId } = await params
    const session = await getServerSession()

    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permission
    if (!canComment(session.user.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to comment' },
        { status: 403 }
      )
    }

    // Check rate limit
    if (!checkCommentRateLimit(session.user.id)) {
      const remainingTime = getRateLimitRemainingTime(session.user.id)
      const remainingSeconds = Math.ceil(remainingTime / 1000)
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please wait before posting another comment.',
          retryAfter: remainingSeconds,
        },
        { status: 429 }
      )
    }

    // Check if thread exists
    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      select: { id: true },
    })

    if (!thread) {
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404 }
      )
    }

    // Parse and validate input
    const body = await request.json()
    const validationResult = createCommentSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { body: commentBody, parentCommentId } = validationResult.data

    // If parentCommentId is provided, verify it exists and belongs to the same thread
    if (parentCommentId) {
      const parentComment = await prisma.threadComment.findUnique({
        where: { id: parentCommentId },
        select: { threadId: true },
      })

      if (!parentComment) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        )
      }

      if (parentComment.threadId !== threadId) {
        return NextResponse.json(
          { error: 'Parent comment does not belong to this thread' },
          { status: 400 }
        )
      }
    }

    // Create the comment
    const comment = await prisma.threadComment.create({
      data: {
        threadId,
        userId: session.user.id,
        body: commentBody,
        parentCommentId: parentCommentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            reputation: true,
          },
        },
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
