'use client'

import { ReputationEventType, Role } from '@prisma/client'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface ReputationEvent {
  id: string
  type: ReputationEventType
  delta: number
  metadata: unknown
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string | null
  }
}

interface ModerationAction {
  id: string
  action: string
  reason: string | null
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string | null
    role: Role
  }
  articleVersion: {
    id: string
    article: {
      id: string
      title: string
      slug: string
    }
  }
}

interface LogsTabProps {
  reputationEvents: ReputationEvent[]
  moderationActions: ModerationAction[]
}

const eventTypeLabels: Record<ReputationEventType, string> = {
  ARTICLE_MERGED: 'Article Merged',
  SUBSTANTIAL_MERGE: 'Substantial Merge',
  CITED: 'Citation',
  UPVOTE: 'Upvote',
  REVERTED: 'Reverted',
  BADGE_EARNED: 'Badge Earned',
  PROMOTED: 'Promoted',
}

const eventTypeColors: Record<ReputationEventType, string> = {
  ARTICLE_MERGED: 'bg-green-100 text-green-800',
  SUBSTANTIAL_MERGE: 'bg-emerald-100 text-emerald-800',
  CITED: 'bg-blue-100 text-blue-800',
  UPVOTE: 'bg-cyan-100 text-cyan-800',
  REVERTED: 'bg-red-100 text-red-800',
  BADGE_EARNED: 'bg-purple-100 text-purple-800',
  PROMOTED: 'bg-yellow-100 text-yellow-800',
}

export function LogsTab({ reputationEvents, moderationActions }: LogsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Logs</CardTitle>
        <CardDescription>
          Audit trail of reputation events and moderation actions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="reputation" className="space-y-4">
          <TabsList>
            <TabsTrigger value="reputation">
              Reputation Events ({reputationEvents.length})
            </TabsTrigger>
            <TabsTrigger value="moderation">
              Moderation Actions ({moderationActions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reputation">
            {reputationEvents.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No reputation events yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Delta</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reputationEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {event.user.name || 'Unnamed'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {event.user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={eventTypeColors[event.type]}>
                          {eventTypeLabels[event.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-medium ${
                            event.delta >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {event.delta > 0 ? '+' : ''}
                          {event.delta}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(event.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="moderation">
            {moderationActions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No moderation actions yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Moderator</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Article</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {moderationActions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {action.user.name || 'Unnamed'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {action.user.role}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            action.action.includes('APPROVED')
                              ? 'default'
                              : 'destructive'
                          }
                        >
                          {action.action.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate font-medium">
                          {action.articleVersion.article.title}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {action.reason ? (
                          <span className="text-sm truncate block">
                            {action.reason}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No reason provided
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(action.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
