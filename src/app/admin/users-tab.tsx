'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Role, Badge as BadgeModel } from '@prisma/client'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface UserWithData {
  id: string
  name: string | null
  email: string | null
  role: Role
  reputation: number
  createdAt: Date
  badges: {
    badge: BadgeModel
  }[]
  _count: {
    articles: number
    articleVersions: number
    votes: number
  }
}

interface UsersTabProps {
  users: UserWithData[]
  badges: BadgeModel[]
}

const roleColors: Record<Role, string> = {
  READER: 'bg-gray-100 text-gray-800',
  CONTRIBUTOR: 'bg-blue-100 text-blue-800',
  REVIEWER: 'bg-green-100 text-green-800',
  JUDGE: 'bg-purple-100 text-purple-800',
  MAINTAINER: 'bg-yellow-100 text-yellow-800',
}

const roles: Role[] = ['READER', 'CONTRIBUTOR', 'REVIEWER', 'JUDGE', 'MAINTAINER']

export function UsersTab({ users, badges }: UsersTabProps) {
  const router = useRouter()
  const [selectedUser, setSelectedUser] = useState<UserWithData | null>(null)
  const [newRole, setNewRole] = useState<Role>('READER')
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [isBadgeDialogOpen, setIsBadgeDialogOpen] = useState(false)
  const [selectedBadgeId, setSelectedBadgeId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const openRoleDialog = (user: UserWithData) => {
    setSelectedUser(user)
    setNewRole(user.role)
    setIsRoleDialogOpen(true)
  }

  const openBadgeDialog = (user: UserWithData) => {
    setSelectedUser(user)
    setSelectedBadgeId('')
    setIsBadgeDialogOpen(true)
  }

  const handleChangeRole = async () => {
    if (!selectedUser) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to change role')
      }

      setIsRoleDialogOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Error changing role:', error)
      alert(error instanceof Error ? error.message : 'Failed to change role')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAwardBadge = async () => {
    if (!selectedUser || !selectedBadgeId) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/badges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeId: selectedBadgeId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to award badge')
      }

      setIsBadgeDialogOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Error awarding badge:', error)
      alert(error instanceof Error ? error.message : 'Failed to award badge')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get badges user doesn't have
  const getAvailableBadges = (user: UserWithData) => {
    const userBadgeIds = user.badges.map((b) => b.badge.id)
    return badges.filter((b) => !userBadgeIds.includes(b.id))
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Manage user roles and award badges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Reputation</TableHead>
                <TableHead>Badges</TableHead>
                <TableHead>Stats</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {user.name || 'Unnamed'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleColors[user.role]}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{user.reputation}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.badges.length === 0 ? (
                        <span className="text-muted-foreground text-sm">None</span>
                      ) : (
                        user.badges.slice(0, 3).map((ub) => (
                          <Badge key={ub.badge.id} variant="outline" className="text-xs">
                            {ub.badge.label}
                          </Badge>
                        ))
                      )}
                      {user.badges.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{user.badges.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>{user._count.articles} articles</div>
                      <div>{user._count.votes} votes</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRoleDialog(user)}
                      >
                        Change Role
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openBadgeDialog(user)}
                      >
                        Award Badge
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Change Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedUser?.name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">New Role</Label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value as Role)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Award Badge Dialog */}
      <Dialog open={isBadgeDialogOpen} onOpenChange={setIsBadgeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Award Badge</DialogTitle>
            <DialogDescription>
              Award a badge to {selectedUser?.name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="badge">Select Badge</Label>
              {selectedUser && getAvailableBadges(selectedUser).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This user has all available badges.
                </p>
              ) : (
                <Select value={selectedBadgeId} onValueChange={setSelectedBadgeId}>
                  <SelectTrigger id="badge">
                    <SelectValue placeholder="Select a badge" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedUser &&
                      getAvailableBadges(selectedUser).map((badge) => (
                        <SelectItem key={badge.id} value={badge.id}>
                          {badge.label} - {badge.description}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBadgeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAwardBadge}
              disabled={isSubmitting || !selectedBadgeId}
            >
              {isSubmitting ? 'Awarding...' : 'Award Badge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
