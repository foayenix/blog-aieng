import { Suspense } from "react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/auth"
import { ArticleCategory, ArticleStatus } from "@prisma/client"
import { ArticleCard } from "@/components/articles"
import { Sidebar } from "@/components/layout/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search } from "lucide-react"
import { canCreateArticle } from "@/lib/permissions"

interface ArticlesPageProps {
  searchParams: Promise<{
    category?: string
    tag?: string
    search?: string
    page?: string
  }>
}

const ARTICLES_PER_PAGE = 12

async function getArticles(params: {
  category?: string
  tag?: string
  search?: string
  page: number
}) {
  const { category, tag, search, page } = params

  const where = {
    status: ArticleStatus.PUBLISHED,
    ...(category && { category: category as ArticleCategory }),
    ...(tag && { tags: { has: tag } }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { summary: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  }

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
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
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * ARTICLES_PER_PAGE,
      take: ARTICLES_PER_PAGE,
    }),
    prisma.article.count({ where }),
  ])

  return {
    articles,
    totalPages: Math.ceil(total / ARTICLES_PER_PAGE),
    currentPage: page,
  }
}

async function getPopularTags() {
  const articles = await prisma.article.findMany({
    where: { status: ArticleStatus.PUBLISHED },
    select: { tags: true },
  })

  const tagCounts: Record<string, number> = {}
  articles.forEach((article) => {
    article.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    })
  })

  return Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag)
}

function ArticlesLoading() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-64 rounded-lg border bg-muted animate-pulse"
        />
      ))}
    </div>
  )
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const params = await searchParams
  const session = await getServerSession()
  const page = parseInt(params.page || "1", 10)

  const [{ articles, totalPages, currentPage }, popularTags] = await Promise.all([
    getArticles({
      category: params.category,
      tag: params.tag,
      search: params.search,
      page,
    }),
    getPopularTags(),
  ])

  const canCreate = session?.user?.role
    ? canCreateArticle(session.user.role)
    : false

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <Suspense fallback={<div className="w-64 h-96 bg-muted animate-pulse rounded-lg" />}>
          <Sidebar className="hidden lg:block" />
        </Suspense>

        {/* Main content */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Articles</h1>
              <p className="text-muted-foreground mt-1">
                Explore community-curated AI engineering knowledge
              </p>
            </div>
            {canCreate && (
              <Link href="/articles/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Article
                </Button>
              </Link>
            )}
          </div>

          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <form className="flex-1" action="/articles" method="GET">
              {params.category && (
                <input type="hidden" name="category" value={params.category} />
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="search"
                  placeholder="Search articles..."
                  defaultValue={params.search}
                  className="pl-10"
                />
              </div>
            </form>
          </div>

          {/* Active filters */}
          {(params.category || params.tag || params.search) && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-sm text-muted-foreground">Filters:</span>
              {params.category && (
                <Link href={`/articles${params.search ? `?search=${params.search}` : ""}`}>
                  <Badge variant="secondary" className="gap-1 cursor-pointer">
                    {params.category.replace("_", " ")}
                    <span className="ml-1 text-muted-foreground">&times;</span>
                  </Badge>
                </Link>
              )}
              {params.tag && (
                <Link
                  href={`/articles${params.category ? `?category=${params.category}` : ""}${params.search ? `${params.category ? "&" : "?"}search=${params.search}` : ""}`}
                >
                  <Badge variant="secondary" className="gap-1 cursor-pointer">
                    #{params.tag}
                    <span className="ml-1 text-muted-foreground">&times;</span>
                  </Badge>
                </Link>
              )}
              {params.search && (
                <Link
                  href={`/articles${params.category ? `?category=${params.category}` : ""}${params.tag ? `${params.category ? "&" : "?"}tag=${params.tag}` : ""}`}
                >
                  <Badge variant="secondary" className="gap-1 cursor-pointer">
                    &quot;{params.search}&quot;
                    <span className="ml-1 text-muted-foreground">&times;</span>
                  </Badge>
                </Link>
              )}
              <Link href="/articles">
                <Button variant="ghost" size="sm">
                  Clear all
                </Button>
              </Link>
            </div>
          )}

          {/* Popular tags */}
          {popularTags.length > 0 && !params.tag && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-sm text-muted-foreground">Popular tags:</span>
              {popularTags.map((tag) => (
                <Link
                  key={tag}
                  href={`/articles?tag=${tag}${params.category ? `&category=${params.category}` : ""}${params.search ? `&search=${params.search}` : ""}`}
                >
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                    {tag}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          {/* Articles grid */}
          <Suspense fallback={<ArticlesLoading />}>
            {articles.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No articles found. Try adjusting your filters.
                </p>
              </div>
            )}
          </Suspense>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              {currentPage > 1 && (
                <Link
                  href={`/articles?page=${currentPage - 1}${params.category ? `&category=${params.category}` : ""}${params.tag ? `&tag=${params.tag}` : ""}${params.search ? `&search=${params.search}` : ""}`}
                >
                  <Button variant="outline">Previous</Button>
                </Link>
              )}
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={`/articles?page=${currentPage + 1}${params.category ? `&category=${params.category}` : ""}${params.tag ? `&tag=${params.tag}` : ""}${params.search ? `&search=${params.search}` : ""}`}
                >
                  <Button variant="outline">Next</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
