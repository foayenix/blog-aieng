'use client'

import { Role } from '@prisma/client'
import { ROLE_WEIGHTS } from '@/lib/governance'

export type RoleBreakdown = Record<Role, { count: number; score: number }>

interface VoteBreakdownProps {
  breakdown: RoleBreakdown
  totalScore: number
  voteCount: number
}

const roleLabels: Record<Role, string> = {
  READER: 'Reader',
  CONTRIBUTOR: 'Contributor',
  REVIEWER: 'Reviewer',
  JUDGE: 'Judge',
  MAINTAINER: 'Maintainer',
}

const roleColors: Record<Role, string> = {
  READER: 'bg-gray-200',
  CONTRIBUTOR: 'bg-blue-200',
  REVIEWER: 'bg-green-200',
  JUDGE: 'bg-purple-200',
  MAINTAINER: 'bg-yellow-200',
}

export function VoteBreakdown({ breakdown, totalScore, voteCount }: VoteBreakdownProps) {
  const roles: Role[] = ['READER', 'CONTRIBUTOR', 'REVIEWER', 'JUDGE', 'MAINTAINER']

  // Calculate max score for scaling the bars
  const maxScore = Math.max(
    ...roles.map(role => Math.abs(breakdown[role].score)),
    1
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b pb-3">
        <div>
          <h3 className="font-semibold text-lg">Vote Breakdown</h3>
          <p className="text-sm text-muted-foreground">
            {voteCount} total votes
          </p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${totalScore >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalScore > 0 ? '+' : ''}{totalScore}
          </div>
          <div className="text-sm text-muted-foreground">
            Weighted Score
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {roles.map((role) => {
          const data = breakdown[role]
          const weight = ROLE_WEIGHTS[role]
          const barWidth = maxScore > 0 ? (Math.abs(data.score) / maxScore) * 100 : 0
          const isPositive = data.score >= 0

          return (
            <div key={role} className="space-y-1">
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${roleColors[role]}`} />
                  <span className="font-medium">{roleLabels[role]}</span>
                  <span className="text-muted-foreground text-xs">
                    (x{weight})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                    {data.count} votes
                  </span>
                  <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {data.score > 0 ? '+' : ''}{data.score}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isPositive ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
