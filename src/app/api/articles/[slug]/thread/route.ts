import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth'
import { isRoleAtLeast } from '@/lib/permissions'

interface RouteParams {
  params: Promise<{ slug: string }>
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

// GET /api/articles/[slug]/thread - Get the thread for an article by slug
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = await params
    const session = await getServerSession()

    // First, find the article by slug
    const article = await prisma.article.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        authorId: true,
        thread: {
          include: {
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
        },
      },
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

    // If no thread exists for this article, return null
    if (!article.thread) {
      return NextResponse.json({
        thread: null,
        article: {
          id: article.id,
          slug: article.slug,
          title: article.title,
          status: article.status,
        },
      })
    }

    // Build comment tree structure
    const commentTree = buildCommentTree(article.thread.comments)

    return NextResponse.json({
      thread: {
        id: article.thread.id,
        articleId: article.id,
        createdAt: article.thread.createdAt,
        createdBy: article.thread.createdBy,
        comments: commentTree,
        commentCount: article.thread.comments.length,
      },
      article: {
        id: article.id,
        slug: article.slug,
        title: article.title,
        status: article.status,
      },
    })
  } catch (error) {
    console.error('Error fetching article thread:', error)
    return NextResponse.json(
      { error: 'Failed to fetch article thread' },
      { status: 500 }
    )
  }
}
