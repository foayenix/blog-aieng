"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Activity,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  FileText,
  Star
} from "lucide-react"

interface VoteActivity {
  id: string
  value: number
  createdAt: Date
  articleVersion: {
    article: {
      id: string
      title: string
      slug: string
    }
  }
}

interface CommentActivity {
  id: string
  body: string
  createdAt: Date
  thread: {
    article: {
      id: string
      title: string
      slug: string
    }
  }
}

interface ArticleActivity {
  id: string
  title: string
  slug: string
  createdAt: Date
}

interface ActivityFeedProps {
  votes: VoteActivity[]
  comments: CommentActivity[]
  articles: ArticleActivity[]
}

type ActivityItem = {
  id: string
  type: "vote" | "comment" | "article"
  title: string
  slug: string
  value?: number
  preview?: string
  createdAt: Date
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + "..."
}

export function ActivityFeed({ votes, comments, articles }: ActivityFeedProps) {
  // Combine and sort all activities by date
  const activities: ActivityItem[] = [
    ...votes.map((vote) => ({
      id: `vote-${vote.id}`,
      type: "vote" as const,
      title: vote.articleVersion.article.title,
      slug: vote.articleVersion.article.slug,
      value: vote.value,
      createdAt: vote.createdAt,
    })),
    ...comments.map((comment) => ({
      id: `comment-${comment.id}`,
      type: "comment" as const,
      title: comment.thread.article.title,
      slug: comment.thread.article.slug,
      preview: truncateText(comment.body, 100),
      createdAt: comment.createdAt,
    })),
    ...articles.map((article) => ({
      id: `article-${article.id}`,
      type: "article" as const,
      title: article.title,
      slug: article.slug,
      createdAt: article.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const recentActivities = activities.slice(0, 10)

  if (recentActivities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No recent activity to display.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                {activity.type === "vote" && activity.value === 1 && (
                  <ArrowUp className="h-4 w-4 text-green-600" />
                )}
                {activity.type === "vote" && activity.value === -1 && (
                  <ArrowDown className="h-4 w-4 text-red-600" />
                )}
                {activity.type === "comment" && (
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                )}
                {activity.type === "article" && (
                  <FileText className="h-4 w-4 text-purple-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {activity.type === "vote" && (
                    <span className="text-sm">
                      {activity.value === 1 ? "Upvoted" : "Downvoted"}
                    </span>
                  )}
                  {activity.type === "comment" && (
                    <span className="text-sm">Commented on</span>
                  )}
                  {activity.type === "article" && (
                    <span className="text-sm">Published</span>
                  )}
                  <a
                    href={`/articles/${activity.slug}`}
                    className="text-sm font-medium text-primary hover:underline truncate"
                  >
                    {activity.title}
                  </a>
                </div>
                {activity.preview && (
                  <p className="text-xs text-muted-foreground mt-1">
                    "{activity.preview}"
                  </p>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(activity.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default ActivityFeed
