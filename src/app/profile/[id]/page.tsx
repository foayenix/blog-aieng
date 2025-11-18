import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/auth"
import { UserCard } from "@/components/profile/user-card"
import { BadgeDisplay } from "@/components/profile/badge-display"
import { ActivityFeed } from "@/components/profile/activity-feed"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Pencil } from "lucide-react"

interface ProfilePageProps {
  params: Promise<{
    id: string
  }>
}

async function getUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      badges: {
        include: {
          badge: true,
        },
        orderBy: {
          awardedAt: "desc",
        },
      },
      articles: {
        where: {
          status: "PUBLISHED",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          category: true,
          createdAt: true,
        },
      },
      votes: {
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
        include: {
          articleVersion: {
            include: {
              article: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
      comments: {
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
        include: {
          thread: {
            include: {
              article: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
    },
  })

  return user
}

const categoryLabels: Record<string, string> = {
  FOUNDATIONS: "Foundations",
  SYSTEMS: "Systems",
  APPLIED: "Applied",
  MLOPS: "MLOps",
  SAFETY: "Safety",
  BENCHMARKS: "Benchmarks",
  CASE_STUDIES: "Case Studies",
  CAREER: "Career",
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params
  const user = await getUser(id)

  if (!user) {
    notFound()
  }

  const session = await getServerSession()
  const isOwnProfile = session?.user?.id === user.id

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      {/* Header with Edit Button */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <UserCard user={user} />
        </div>
        {isOwnProfile && (
          <div className="ml-4">
            <Button asChild variant="outline">
              <Link href="/settings/profile">
                <Pencil className="h-4 w-4 mr-2" />
                Edit Profile
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Badges Section */}
      <BadgeDisplay badges={user.badges} />

      {/* Authored Articles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Published Articles ({user.articles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user.articles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No published articles yet.
            </p>
          ) : (
            <div className="space-y-4">
              {user.articles.map((article) => (
                <div key={article.id} className="border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/articles/${article.slug}`}
                        className="font-medium hover:underline text-primary"
                      >
                        {article.title}
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {article.summary}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {categoryLabels[article.category] || article.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(article.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <ActivityFeed
        votes={user.votes}
        comments={user.comments}
        articles={user.articles}
      />
    </div>
  )
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    select: { name: true },
  })

  if (!user) {
    return {
      title: "User Not Found",
    }
  }

  return {
    title: `${user.name || "User"} - Profile`,
    description: `View ${user.name || "User"}'s profile on AI Engineering Commons`,
  }
}
