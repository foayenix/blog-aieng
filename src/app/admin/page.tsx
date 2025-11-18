import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessAdmin } from '@/lib/permissions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UsersTab } from './users-tab'
import { BadgesTab } from './badges-tab'
import { LogsTab } from './logs-tab'

export default async function AdminPage() {
  const session = await getServerSession()

  if (!session?.user) {
    redirect('/auth/signin')
  }

  if (!canAccessAdmin(session.user.role)) {
    redirect('/')
  }

  // Fetch stats
  const [
    totalUsers,
    totalArticles,
    pendingReviews,
    totalBadges,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.article.count(),
    prisma.article.count({ where: { status: 'UNDER_REVIEW' } }),
    prisma.badge.count(),
  ])

  // Fetch users with their data
  const users = await prisma.user.findMany({
    include: {
      badges: {
        include: {
          badge: true,
        },
      },
      _count: {
        select: {
          articles: true,
          articleVersions: true,
          votes: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Fetch all badges
  const badges = await prisma.badge.findMany({
    include: {
      _count: {
        select: {
          userBadges: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Fetch recent reputation events and moderation actions
  const [reputationEvents, moderationActions] = await Promise.all([
    prisma.reputationEvent.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    }),
    prisma.moderationAction.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
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
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    }),
  ])

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage users, badges, and view system logs
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">{totalUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Articles</CardDescription>
            <CardTitle className="text-3xl">{totalArticles}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Reviews</CardDescription>
            <CardTitle className="text-3xl">{pendingReviews}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Badges</CardDescription>
            <CardTitle className="text-3xl">{totalBadges}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTab users={users} badges={badges} />
        </TabsContent>

        <TabsContent value="badges">
          <BadgesTab badges={badges} users={users} />
        </TabsContent>

        <TabsContent value="logs">
          <LogsTab
            reputationEvents={reputationEvents}
            moderationActions={moderationActions}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
