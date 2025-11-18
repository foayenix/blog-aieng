"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArticleCategory } from "@prisma/client"
import { ArticleForm } from "@/components/articles"
import { canEditArticle } from "@/lib/permissions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ArticleData {
  id: string
  slug: string
  title: string
  summary: string
  category: ArticleCategory
  tags: string[]
  authorId: string
  currentVersion: {
    bodyMdx: string
  } | null
}

export default function EditArticlePage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const { data: session, status } = useSession()

  const [article, setArticle] = useState<ArticleData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push(`/auth/signin?callbackUrl=/articles/${slug}/edit`)
      return
    }

    // Fetch article data
    const fetchArticle = async () => {
      try {
        const response = await fetch(`/api/articles/${slug}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError("Article not found")
          } else {
            setError("Failed to load article")
          }
          setIsLoading(false)
          return
        }

        const data = await response.json()
        setArticle(data)

        // Check authorization
        const isAuthor = session.user?.id === data.authorId
        const authorized = session.user?.role
          ? canEditArticle(session.user.role, isAuthor)
          : false

        setIsAuthorized(authorized)
        setIsLoading(false)
      } catch (err) {
        setError("An error occurred while loading the article")
        setIsLoading(false)
      }
    }

    fetchArticle()
  }, [session, status, router, slug])

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="h-96 rounded-lg border bg-muted animate-pulse" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don&apos;t have permission to edit this article.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Only the author or users with Reviewer role or higher can edit articles.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!article) {
    return null
  }

  const isAuthor = session?.user?.id === article.authorId

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            {isAuthor ? "Edit Article" : "Propose Update"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isAuthor
              ? "Update your article content"
              : "Submit changes for community review"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Editing: <span className="font-medium">{article.title}</span>
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <ArticleForm
              mode="edit"
              articleSlug={slug}
              initialData={{
                title: article.title,
                slug: article.slug,
                summary: article.summary,
                category: article.category,
                tags: article.tags,
                bodyMdx: article.currentVersion?.bodyMdx || "",
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
