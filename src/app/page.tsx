import Link from "next/link"
import { MainLayout } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { prisma } from "@/lib/prisma"
import { formatDistanceToNow } from "date-fns"

async function getFeaturedArticles() {
  const articles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
    },
    include: {
      author: {
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
    take: 6,
  })
  return articles
}

async function getRecentlyApprovedUpdates() {
  const versions = await prisma.articleVersion.findMany({
    where: {
      article: {
        status: "PUBLISHED",
      },
      versionNumber: {
        gt: 1,
      },
    },
    include: {
      article: {
        select: {
          id: true,
          slug: true,
          title: true,
        },
      },
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
  return versions
}

async function getTopContributors() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const contributors = await prisma.user.findMany({
    where: {
      OR: [
        {
          articles: {
            some: {
              status: "PUBLISHED",
              createdAt: {
                gte: thirtyDaysAgo,
              },
            },
          },
        },
        {
          articleVersions: {
            some: {
              createdAt: {
                gte: thirtyDaysAgo,
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      image: true,
      reputation: true,
      _count: {
        select: {
          articles: {
            where: {
              status: "PUBLISHED",
              createdAt: {
                gte: thirtyDaysAgo,
              },
            },
          },
          articleVersions: {
            where: {
              createdAt: {
                gte: thirtyDaysAgo,
              },
            },
          },
        },
      },
    },
    orderBy: {
      reputation: "desc",
    },
    take: 5,
  })
  return contributors
}

export default async function HomePage() {
  const [featuredArticles, recentUpdates, topContributors] = await Promise.all([
    getFeaturedArticles(),
    getRecentlyApprovedUpdates(),
    getTopContributors(),
  ])

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="py-20 text-center">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            AI Engineering Commons
          </h1>
          <p className="mt-6 text-xl text-muted-foreground">
            A community-driven knowledge hub for AI/ML engineering
          </p>
          <p className="mt-4 text-lg text-muted-foreground">
            Share knowledge, contribute articles, and learn from practitioners building real AI systems.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/articles">Browse Articles</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/contribute">Contribute</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Articles Section */}
      <section className="py-16">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Featured Articles</h2>
            <p className="mt-2 text-muted-foreground">
              Latest published articles from the community
            </p>
          </div>
          <Button asChild variant="ghost">
            <Link href="/articles">View all</Link>
          </Button>
        </div>

        {featuredArticles.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredArticles.map((article) => (
              <Card key={article.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{article.category.replace("_", " ")}</Badge>
                  </div>
                  <CardTitle className="line-clamp-2">
                    <Link href={`/articles/${article.slug}`} className="hover:underline">
                      {article.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="line-clamp-3">
                    {article.summary}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={article.author.image || undefined} alt={article.author.name || "Author"} />
                      <AvatarFallback>
                        {article.author.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      <p className="font-medium">{article.author.name}</p>
                      <p className="text-muted-foreground">
                        {formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No articles published yet.</p>
              <Button asChild className="mt-4">
                <Link href="/contribute">Be the first to contribute</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Recently Approved Updates Section */}
      <section className="py-16">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Recently Approved Updates</h2>
          <p className="mt-2 text-muted-foreground">
            Latest contributions and improvements from community members
          </p>
        </div>

        {recentUpdates.length > 0 ? (
          <div className="space-y-4">
            {recentUpdates.map((version) => (
              <Card key={version.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={version.createdBy.image || undefined} alt={version.createdBy.name || "Contributor"} />
                      <AvatarFallback>
                        {version.createdBy.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        <span className="text-muted-foreground">{version.createdBy.name}</span>
                        {" updated "}
                        <Link href={`/articles/${version.article.slug}`} className="text-primary hover:underline">
                          {version.article.title}
                        </Link>
                      </p>
                      {version.changelog && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {version.changelog}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground">No updates yet.</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Top Contributors Section */}
      <section className="py-16">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Top Contributors This Month</h2>
          <p className="mt-2 text-muted-foreground">
            Community members making the biggest impact
          </p>
        </div>

        {topContributors.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {topContributors.map((contributor, index) => (
              <Card key={contributor.id} className="text-center">
                <CardContent className="pt-6">
                  <div className="relative inline-block">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={contributor.image || undefined} alt={contributor.name || "Contributor"} />
                      <AvatarFallback className="text-lg">
                        {contributor.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {index < 3 && (
                      <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <p className="mt-4 font-medium">{contributor.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {contributor.reputation} reputation
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {contributor._count.articles} articles, {contributor._count.articleVersions} updates
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground">No contributors this month yet.</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* How to Contribute Section */}
      <section className="py-16">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold">How to Contribute</h2>
          <p className="mt-2 text-muted-foreground">
            Join our community and share your knowledge in four simple steps
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                1
              </div>
              <CardTitle className="text-lg">Sign Up</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create an account using GitHub or Google to get started with the community.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                2
              </div>
              <CardTitle className="text-lg">Write or Update</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create new articles or propose updates to existing content using our MDX editor.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                3
              </div>
              <CardTitle className="text-lg">Community Review</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your contribution goes through community voting and review before publication.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                4
              </div>
              <CardTitle className="text-lg">Earn Reputation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Gain reputation points when your contributions are approved and upvoted.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 text-center">
          <Button asChild size="lg">
            <Link href="/contribute">Start Contributing</Link>
          </Button>
        </div>
      </section>

      {/* GitHub Section */}
      <section className="py-16 text-center">
        <Card className="mx-auto max-w-2xl">
          <CardContent className="py-10">
            <h3 className="text-2xl font-bold">Open Source</h3>
            <p className="mt-4 text-muted-foreground">
              AI Engineering Commons is open source. Check out our repository on GitHub,
              report issues, or contribute to the platform itself.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <a
                href="https://github.com/ai-engineering-commons/blog"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className="mr-2 h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                View on GitHub
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>
    </MainLayout>
  )
}
