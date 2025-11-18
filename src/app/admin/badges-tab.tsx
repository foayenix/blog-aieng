'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge as BadgeModel, Role } from '@prisma/client'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface BadgeWithCount extends BadgeModel {
  _count: {
    userBadges: number
  }
}

interface UserBasic {
  id: string
  name: string | null
  email: string | null
  role: Role
}

interface BadgesTabProps {
  badges: BadgeWithCount[]
  users: UserBasic[]
}

export function BadgesTab({ badges, users }: BadgesTabProps) {
  const router = useRouter()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newBadge, setNewBadge] = useState({
    slug: '',
    label: '',
    description: '',
    icon: '',
  })

  const handleCreateBadge = async () => {
    if (!newBadge.slug || !newBadge.label || !newBadge.description) {
      alert('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBadge),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create badge')
      }

      setIsCreateDialogOpen(false)
      setNewBadge({ slug: '', label: '', description: '', icon: '' })
      router.refresh()
    } catch (error) {
      console.error('Error creating badge:', error)
      alert(error instanceof Error ? error.message : 'Failed to create badge')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Badges</CardTitle>
            <CardDescription>
              Manage and create badges
            </CardDescription>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            Create Badge
          </Button>
        </CardHeader>
        <CardContent>
          {badges.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No badges created yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Badge</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Awards</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {badges.map((badge) => (
                  <TableRow key={badge.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {badge.icon && (
                          <span className="text-lg">{badge.icon}</span>
                        )}
                        <span className="font-medium">{badge.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{badge.slug}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {badge.description}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {badge._count.userBadges}
                      </span>
                      <span className="text-muted-foreground"> users</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(badge.createdAt), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Badge Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Badge</DialogTitle>
            <DialogDescription>
              Create a new badge that can be awarded to users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                placeholder="first-contribution"
                value={newBadge.slug}
                onChange={(e) =>
                  setNewBadge({ ...newBadge, slug: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier for the badge (lowercase, dashes only)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">Label *</Label>
              <Input
                id="label"
                placeholder="First Contribution"
                value={newBadge.label}
                onChange={(e) =>
                  setNewBadge({ ...newBadge, label: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Awarded for making your first contribution"
                value={newBadge.description}
                onChange={(e) =>
                  setNewBadge({ ...newBadge, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">Icon (optional)</Label>
              <Input
                id="icon"
                placeholder="Enter an emoji"
                value={newBadge.icon}
                onChange={(e) =>
                  setNewBadge({ ...newBadge, icon: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBadge} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Badge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
