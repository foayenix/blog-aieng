import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canModerateComments } from '@/lib/permissions'

interface RouteParams {
  params: Promise<{ threadId: string; commentId: string }>
}

// Schema for updating a comment
const updateCommentSchema = z.object({
  body: z.string().min(1, 'Comment body is required').max(10000, 'Comment body is too long'),
})

// Time limit for editing comments (15 minutes in milliseconds)
const EDIT_TIME_LIMIT_MS = 15 * 60 * 1000

// PATCH /api/threads/[threadId]/comments/[commentId] - Edit a comment
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { threadId, commentId } = await params
    const session = await getServerSession()

    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Find the comment
    const comment = await prisma.threadComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        threadId: true,
        userId: true,
        createdAt: true,
      },
    })

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // Verify comment belongs to the specified thread
    if (comment.threadId !== threadId) {
      return NextResponse.json(
        { error: 'Comment does not belong to this thread' },
        { status: 400 }
      )
    }

    // Check if user is the author
    if (comment.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the comment author can edit this comment' },
        { status: 403 }
      )
    }

    // Check if within edit time limit
    const timeSinceCreation = Date.now() - comment.createdAt.getTime()
    if (timeSinceCreation > EDIT_TIME_LIMIT_MS) {
      const minutesLimit = Math.floor(EDIT_TIME_LIMIT_MS / 60000)
      return NextResponse.json(
        {
          error: `Comments can only be edited within ${minutesLimit} minutes of creation`,
          timeLimit: EDIT_TIME_LIMIT_MS,
          timeSinceCreation,
        },
        { status: 403 }
      )
    }

    // Parse and validate input
    const body = await request.json()
    const validationResult = updateCommentSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { body: newBody } = validationResult.data

    // Update the comment
    const updatedComment = await prisma.threadComment.update({
      where: { id: commentId },
      data: { body: newBody },
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

    return NextResponse.json(updatedComment)
  } catch (error) {
    console.error('Error updating comment:', error)
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    )
  }
}

// DELETE /api/threads/[threadId]/comments/[commentId] - Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { threadId, commentId } = await params
    const session = await getServerSession()

    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Find the comment
    const comment = await prisma.threadComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        threadId: true,
        userId: true,
      },
    })

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // Verify comment belongs to the specified thread
    if (comment.threadId !== threadId) {
      return NextResponse.json(
        { error: 'Comment does not belong to this thread' },
        { status: 400 }
      )
    }

    // Check permissions: author can delete their own comment, or REVIEWER+ can moderate
    const isAuthor = comment.userId === session.user.id
    const canModerate = canModerateComments(session.user.role)

    if (!isAuthor && !canModerate) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this comment' },
        { status: 403 }
      )
    }

    // Delete the comment
    // Note: This will cascade delete all replies due to Prisma's default behavior
    // If you want to preserve replies, you could soft-delete instead
    await prisma.threadComment.delete({
      where: { id: commentId },
    })

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
      deletedBy: isAuthor ? 'author' : 'moderator',
    })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    )
  }
}
