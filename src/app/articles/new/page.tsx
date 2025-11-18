"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArticleForm } from "@/components/articles"
import { canCreateArticle } from "@/lib/permissions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewArticlePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/auth/signin?callbackUrl=/articles/new")
      return
    }

    const authorized = session.user?.role
      ? canCreateArticle(session.user.role)
      : false

    if (!authorized) {
      setIsAuthorized(false)
    } else {
      setIsAuthorized(true)
    }
  }, [session, status, router])

  if (status === "loading" || isAuthorized === null) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="h-96 rounded-lg border bg-muted animate-pulse" />
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
                You need to be a Contributor or higher to create articles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Build your reputation by engaging with the community through
                comments and votes to unlock article creation privileges.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create New Article</h1>
          <p className="text-muted-foreground mt-2">
            Share your AI engineering knowledge with the community
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <ArticleForm mode="create" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
