'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Role } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { canForceApprove, canApproveArticle } from '@/lib/permissions'

interface ActionButtonsProps {
  versionId: string
  userRole: Role
  hasVoted: boolean
  userVoteValue?: number
  meetsThresholds: boolean
}

export function ActionButtons({
  versionId,
  userRole,
  hasVoted,
  userVoteValue,
  meetsThresholds,
}: ActionButtonsProps) {
  const router = useRouter()
  const [isVoting, setIsVoting] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'force_approve' | 'force_reject'>('approve')

  const canReview = canApproveArticle(userRole)
  const canForce = canForceApprove(userRole)

  const handleVote = async (value: number) => {
    setIsVoting(true)
    try {
      const response = await fetch(`/api/moderation/${versionId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to vote')
      }

      router.refresh()
    } catch (error) {
      console.error('Vote error:', error)
      alert(error instanceof Error ? error.message : 'Failed to vote')
    } finally {
      setIsVoting(false)
    }
  }

  const handleAction = async () => {
    const isApproveAction = actionType === 'approve' || actionType === 'force_approve'
    isApproveAction ? setIsApproving(true) : setIsRejecting(true)

    try {
      const response = await fetch(`/api/moderation/${versionId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, reason }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to perform action')
      }

      setDialogOpen(false)
      router.refresh()
      router.push('/moderation')
    } catch (error) {
      console.error('Action error:', error)
      alert(error instanceof Error ? error.message : 'Failed to perform action')
    } finally {
      setIsApproving(false)
      setIsRejecting(false)
    }
  }

  const openActionDialog = (type: typeof actionType) => {
    setActionType(type)
    setReason('')
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Voting Section */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm">Your Vote</h4>
        <div className="flex gap-2">
          <Button
            variant={userVoteValue === 1 ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleVote(1)}
            disabled={isVoting}
          >
            +1 Approve
          </Button>
          <Button
            variant={userVoteValue === -1 ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => handleVote(-1)}
            disabled={isVoting}
          >
            -1 Reject
          </Button>
        </div>
        {hasVoted && (
          <p className="text-xs text-muted-foreground">
            You voted: {userVoteValue === 1 ? '+1' : '-1'}
          </p>
        )}
      </div>

      {/* Moderation Actions */}
      {canReview && (
        <div className="space-y-2 pt-4 border-t">
          <h4 className="font-medium text-sm">Moderation Actions</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => openActionDialog('approve')}
              disabled={!meetsThresholds || isApproving || isRejecting}
            >
              Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => openActionDialog('reject')}
              disabled={isApproving || isRejecting}
            >
              Reject
            </Button>
          </div>
          {!meetsThresholds && (
            <p className="text-xs text-muted-foreground">
              Approval thresholds not met
            </p>
          )}
        </div>
      )}

      {/* Force Actions for Judge+ */}
      {canForce && (
        <div className="space-y-2 pt-4 border-t">
          <h4 className="font-medium text-sm">Force Actions (Judge+)</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openActionDialog('force_approve')}
              disabled={isApproving || isRejecting}
            >
              Force Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openActionDialog('force_reject')}
              disabled={isApproving || isRejecting}
              className="text-destructive hover:text-destructive"
            >
              Force Reject
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Bypasses normal approval thresholds
          </p>
        </div>
      )}

      {/* Action Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Version'}
              {actionType === 'reject' && 'Reject Version'}
              {actionType === 'force_approve' && 'Force Approve Version'}
              {actionType === 'force_reject' && 'Force Reject Version'}
            </DialogTitle>
            <DialogDescription>
              {actionType.includes('force')
                ? 'This action will bypass normal approval thresholds.'
                : 'This action will update the article status.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Enter a reason for this action..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType.includes('reject') ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={isApproving || isRejecting}
            >
              {isApproving || isRejecting ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
