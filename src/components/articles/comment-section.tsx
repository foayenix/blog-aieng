"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { formatDistanceToNow } from "date-fns"
import { MessageSquare, Reply } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface Comment {
  id: string
  body: string
  createdAt: Date
  user: {
    id: string
    name: string | null
    image: string | null
  }
  replies?: Comment[]
}

interface CommentSectionProps {
  threadId: string
  comments: Comment[]
  onCommentAdded?: () => void
}

function CommentItem({
  comment,
  threadId,
  onReply,
  depth = 0,
}: {
  comment: Comment
  threadId: string
  onReply: () => void
  depth?: number
}) {
  const { data: session } = useSession()
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const authorInitials = comment.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?"

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !session) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/threads/${threadId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: replyContent,
          parentCommentId: comment.id,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to post reply")
      }

      setReplyContent("")
      setIsReplying(false)
      onReply()
    } catch (error) {
      console.error("Error posting reply:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-muted pl-4" : ""}>
      <div className="flex gap-3 py-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={comment.user.image || undefined} />
          <AvatarFallback className="text-xs">{authorInitials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {comment.user.name || "Anonymous"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {comment.body}
          </p>
          {session && depth < 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setIsReplying(!isReplying)}
            >
              <Reply className="mr-1 h-3 w-3" />
              Reply
            </Button>
          )}
          {isReplying && (
            <div className="mt-2 space-y-2">
              <Textarea
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[80px] text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmitReply}
                  disabled={isSubmitting || !replyContent.trim()}
                >
                  {isSubmitting ? "Posting..." : "Post Reply"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsReplying(false)
                    setReplyContent("")
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              threadId={threadId}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function CommentSection({
  threadId,
  comments,
  onCommentAdded,
}: CommentSectionProps) {
  const { data: session } = useSession()
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!newComment.trim() || !session) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/threads/${threadId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: newComment,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to post comment")
      }

      setNewComment("")
      onCommentAdded?.()
    } catch (error) {
      console.error("Error posting comment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReply = () => {
    onCommentAdded?.()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="font-semibold">Discussion</h3>
          <span className="text-sm text-muted-foreground">
            ({comments.length} {comments.length === 1 ? "comment" : "comments"})
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {session ? (
          <div className="space-y-2">
            <Textarea
              placeholder="Share your thoughts..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[100px]"
            />
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !newComment.trim()}
            >
              {isSubmitting ? "Posting..." : "Post Comment"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sign in to join the discussion.
          </p>
        )}

        {comments.length > 0 ? (
          <div className="divide-y">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                threadId={threadId}
                onReply={handleReply}
              />
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No comments yet. Be the first to share your thoughts!
          </p>
        )}
      </CardContent>
    </Card>
  )
}
