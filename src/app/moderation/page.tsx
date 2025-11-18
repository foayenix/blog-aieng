import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessModeration } from '@/lib/permissions'
import { calculateVersionScore } from '@/lib/voting'
import { ArticleCategory } from '@prisma/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ModerationTable, ModerationVersion } from '@/components/moderation/moderation-table'
import { ModerationFilters } from './moderation-filters'

interface SearchParams {
  category?: string
  minScore?: string
  maxScore?: string
  maxAge?: string
}

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await getServerSession()

  if (!session?.user) {
    redirect('/auth/signin')
  }

  if (!canAccessModeration(session.user.role)) {
    redirect('/')
  }

  // Await searchParams in Next.js 15+
  const resolvedParams = await searchParams

  // Parse filters
  const categoryFilter = resolvedParams.category as ArticleCategory | undefined
  const minScore = resolvedParams.minScore ? parseInt(resolvedParams.minScore) : undefined
  const maxScore = resolvedParams.maxScore ? parseInt(resolvedParams.maxScore) : undefined
  const maxAgeDays = resolvedParams.maxAge ? parseInt(resolvedParams.maxAge) : undefined

  // Fetch versions under review
  const underReviewVersions = await prisma.articleVersion.findMany({
    where: {
      article: {
        status: 'UNDER_REVIEW',
        ...(categoryFilter && { category: categoryFilter }),
      },
      ...(maxAgeDays && {
        createdAt: {
          gte: new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000),
        },
      }),
    },
    include: {
      article: {
        select: {
          id: true,
          slug: true,
          title: true,
          category: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      votes: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Calculate scores and apply filters
  const underReviewWithScores: ModerationVersion[] = []
  for (const version of underReviewVersions) {
    const { totalScore, voteCount } = await calculateVersionScore(version.id)

    // Apply score filters
    if (minScore !== undefined && totalScore < minScore) continue
    if (maxScore !== undefined && totalScore > maxScore) continue

    underReviewWithScores.push({
      id: version.id,
      versionNumber: version.versionNumber,
      createdAt: version.createdAt,
      article: version.article,
      createdBy: version.createdBy,
      weightedScore: totalScore,
      voteCount,
    })
  }

  // Fetch recently approved versions (last 30 days)
  const recentlyApproved = await prisma.moderationAction.findMany({
    where: {
      action: 'APPROVED',
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    include: {
      articleVersion: {
        include: {
          article: {
            select: {
              id: true,
              slug: true,
              title: true,
              category: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  })

  const approvedVersions: ModerationVersion[] = []
  for (const action of recentlyApproved) {
    const { totalScore, voteCount } = await calculateVersionScore(action.articleVersionId)
    approvedVersions.push({
      id: action.articleVersion.id,
      versionNumber: action.articleVersion.versionNumber,
      createdAt: action.createdAt,
      article: action.articleVersion.article,
      createdBy: action.articleVersion.createdBy,
      weightedScore: totalScore,
      voteCount,
    })
  }

  // Fetch rejected versions (last 30 days)
  const recentlyRejected = await prisma.moderationAction.findMany({
    where: {
      action: {
        in: ['REJECTED', 'FORCE_REJECTED'],
      },
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    include: {
      articleVersion: {
        include: {
          article: {
            select: {
              id: true,
              slug: true,
              title: true,
              category: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  })

  const rejectedVersions: ModerationVersion[] = []
  for (const action of recentlyRejected) {
    const { totalScore, voteCount } = await calculateVersionScore(action.articleVersionId)
    rejectedVersions.push({
      id: action.articleVersion.id,
      versionNumber: action.articleVersion.versionNumber,
      createdAt: action.createdAt,
      article: action.articleVersion.article,
      createdBy: action.articleVersion.createdBy,
      weightedScore: totalScore,
      voteCount,
    })
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Moderation Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve article submissions
        </p>
      </div>

      <div className="mb-6">
        <ModerationFilters
          currentCategory={categoryFilter}
          currentMinScore={minScore}
          currentMaxScore={maxScore}
          currentMaxAge={maxAgeDays}
        />
      </div>

      <Tabs defaultValue="under-review" className="space-y-4">
        <TabsList>
          <TabsTrigger value="under-review">
            Under Review ({underReviewWithScores.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Recently Approved ({approvedVersions.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedVersions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="under-review">
          <Card>
            <CardHeader>
              <CardTitle>Under Review</CardTitle>
              <CardDescription>
                Article versions awaiting approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModerationTable
                versions={underReviewWithScores}
                emptyMessage="No articles currently under review"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>Recently Approved</CardTitle>
              <CardDescription>
                Article versions approved in the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModerationTable
                versions={approvedVersions}
                emptyMessage="No recently approved articles"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <CardTitle>Rejected</CardTitle>
              <CardDescription>
                Article versions rejected in the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModerationTable
                versions={rejectedVersions}
                emptyMessage="No rejected articles"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
