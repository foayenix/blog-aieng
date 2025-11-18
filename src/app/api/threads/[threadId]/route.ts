import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ threadId: string }>
}

// Type for comment with user info
interface CommentWithUser {
  id: string
  threadId: string
  userId: string
  body: string
  parentCommentId: string | null
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string | null
    image: string | null
    role: string
    reputation: number
  }
}

// Type for comment tree node
interface CommentTreeNode extends CommentWithUser {
  replies: CommentTreeNode[]
}

/**
 * Build a tree structure from flat comments array
 */
function buildCommentTree(comments: CommentWithUser[]): CommentTreeNode[] {
  const commentMap = new Map<string, CommentTreeNode>()
  const roots: CommentTreeNode[] = []

  // First pass: create tree nodes for all comments
  for (const comment of comments) {
    commentMap.set(comment.id, {
      ...comment,
      replies: [],
    })
  }

  // Second pass: build the tree structure
  for (const comment of comments) {
    const node = commentMap.get(comment.id)!

    if (comment.parentCommentId) {
      const parent = commentMap.get(comment.parentCommentId)
      if (parent) {
        parent.replies.push(node)
      } else {
        // Parent not found, treat as root
        roots.push(node)
      }
    } else {
      roots.push(node)
    }
  }

  // Sort replies by createdAt
  const sortReplies = (nodes: CommentTreeNode[]) => {
    nodes.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    for (const node of nodes) {
      sortReplies(node.replies)
    }
  }

  sortReplies(roots)

  return roots
}

// GET /api/threads/[threadId] - Get thread with all comments in tree structure
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { threadId } = await params

    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        article: {
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
        comments: {
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
        },
      },
    })

    if (!thread) {
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404 }
      )
    }

    // Build comment tree structure
    const commentTree = buildCommentTree(thread.comments)

    return NextResponse.json({
      id: thread.id,
      articleId: thread.articleId,
      createdAt: thread.createdAt,
      article: thread.article,
      createdBy: thread.createdBy,
      comments: commentTree,
      commentCount: thread.comments.length,
    })
  } catch (error) {
    console.error('Error fetching thread:', error)
    return NextResponse.json(
      { error: 'Failed to fetch thread' },
      { status: 500 }
    )
  }
}
