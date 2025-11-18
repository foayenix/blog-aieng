import { notFound } from "next/navigation"
import Link from "next/link"
import { serialize } from "next-mdx-remote/serialize"
import { formatDistanceToNow } from "date-fns"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/auth"
import { canEditArticle } from "@/lib/permissions"
import { ArticleStatus } from "@prisma/client"
import { ArticleContent, CommentSection, VoteButtons } from "@/components/articles"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Pencil, Calendar, User, Tag, GitBranch } from "lucide-react"

interface ArticlePageProps {
  params: Promise<{
    slug: string
  }>
}

const categoryLabels: Record<string, string> = {
  FOUNDATIONS: "Foundations",
  SYSTEMS: "Systems",
  APPLIED: "Applied AI",
  MLOPS: "MLOps",
  SAFETY: "Safety",
  BENCHMARKS: "Benchmarks",
  CASE_STUDIES: "Case Studies",
  CAREER: "Career",
}

async function getArticle(slug: string) {
  const article = await prisma.article.findUnique({
    where: { slug },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      currentVersion: {
        include: {
          votes: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
      versions: {
        where: {
          NOT: {
            id: {
              equals: undefined,
            },
          },
        },
        include: {
          votes: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          versionNumber: "desc",
        },
      },
      thread: {
        include: {
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
              replies: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      image: true,
                    },
                  },
                },
                orderBy: {
                  createdAt: "asc",
                },
              },
            },
            where: {
              parentCommentId: null,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
  })

  if (!article) {
    return null
  }

  // Increment view count
  await prisma.article.update({
    where: { id: article.id },
    data: { viewCount: { increment: 1 } },
  })

  return article
}

async function getProposedUpdates(articleId: string, currentVersionId?: string) {
  return prisma.articleVersion.findMany({
    where: {
      articleId,
      id: {
        not: currentVersionId,
      },
    },
    include: {
      votes: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  })
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const [article, session] = await Promise.all([
    getArticle(slug),
    getServerSession(),
  ])

  if (!article) {
    notFound()
  }

  // Get proposed updates (versions that are not the current one)
  const proposedUpdates = await getProposedUpdates(
    article.id,
    article.currentVersionId || undefined
  )

  // Check permissions
  const isAuthor = session?.user?.id === article.authorId
  const canEdit = session?.user?.role
    ? canEditArticle(session.user.role, isAuthor)
    : false

  // Serialize MDX content
  const mdxSource = article.currentVersion
    ? await serialize(article.currentVersion.bodyMdx)
    : null

  // Calculate vote score
  const voteScore =
    article.currentVersion?.votes?.reduce((acc, vote) => acc + vote.value, 0) ?? 0

  // Get user's vote for the current version
  const userVote = session?.user?.id
    ? article.currentVersion?.votes?.find(
        (vote) => vote.userId === session.user.id
      )?.value
    : null

  const authorInitials = article.author.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?"

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Article header */}
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary">
                  {categoryLabels[article.category]}
                </Badge>
                {article.status !== ArticleStatus.PUBLISHED && (
                  <Badge
                    variant={
                      article.status === ArticleStatus.UNDER_REVIEW
                        ? "outline"
                        : article.status === ArticleStatus.REJECTED
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {article.status.replace("_", " ")}
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
              <p className="text-lg text-muted-foreground">{article.summary}</p>
            </div>
            {article.currentVersion && (
              <div className="shrink-0">
                <VoteButtons
                  articleVersionId={article.currentVersion.id}
                  initialScore={voteScore}
                  initialUserVote={userVote}
                />
              </div>
            )}
          </div>

          {/* Article meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={article.author.image || undefined} />
                <AvatarFallback>{authorInitials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium text-foreground">
                  {article.author.name || "Anonymous"}
                </div>
                <div className="text-xs">Author</div>
              </div>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDistanceToNow(new Date(article.createdAt), {
                addSuffix: true,
              })}
            </div>
            {article.currentVersion && (
              <>
                <Separator orientation="vertical" className="h-8" />
                <div className="flex items-center gap-1">
                  <GitBranch className="h-4 w-4" />
                  Version {article.currentVersion.versionNumber}
                </div>
              </>
            )}
          </div>

          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Tag className="h-4 w-4 text-muted-foreground" />
              {article.tags.map((tag) => (
                <Link key={tag} href={`/articles?tag=${tag}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                    {tag}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          {/* Actions */}
          {canEdit && (
            <div className="mt-4">
              <Link href={`/articles/${slug}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="mr-2 h-4 w-4" />
                  {isAuthor ? "Edit Article" : "Propose Update"}
                </Button>
              </Link>
            </div>
          )}
        </header>

        <Separator className="my-8" />

        {/* Article content */}
        {mdxSource ? (
          <ArticleContent source={mdxSource} className="mb-12" />
        ) : (
          <p className="text-muted-foreground">No content available.</p>
        )}

        <Separator className="my-8" />

        {/* Proposed updates */}
        {proposedUpdates.length > 0 && (
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Proposed Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {proposedUpdates.map((version) => {
                    const versionScore = version.votes.reduce(
                      (acc, vote) => acc + vote.value,
                      0
                    )
                    const versionUserVote = session?.user?.id
                      ? version.votes.find(
                          (vote) => vote.userId === session.user.id
                        )?.value
                      : null
                    const versionAuthorInitials = version.createdBy.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "?"

                    return (
                      <div
                        key={version.id}
                        className="flex items-start gap-4 p-4 rounded-lg border"
                      >
                        <VoteButtons
                          articleVersionId={version.id}
                          initialScore={versionScore}
                          initialUserVote={versionUserVote}
                          size="sm"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage
                                src={version.createdBy.image || undefined}
                              />
                              <AvatarFallback className="text-xs">
                                {versionAuthorInitials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">
                              {version.createdBy.name || "Anonymous"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              proposed{" "}
                              {formatDistanceToNow(new Date(version.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          {version.changelog && (
                            <p className="text-sm text-muted-foreground">
                              {version.changelog}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Comments */}
        {article.thread && (
          <CommentSection
            threadId={article.thread.id}
            comments={article.thread.comments}
          />
        )}
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: ArticlePageProps) {
  const { slug } = await params
  const article = await prisma.article.findUnique({
    where: { slug },
    select: {
      title: true,
      summary: true,
    },
  })

  if (!article) {
    return {
      title: "Article Not Found",
    }
  }

  return {
    title: article.title,
    description: article.summary,
  }
}
