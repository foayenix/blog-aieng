"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Award } from "lucide-react"

interface UserBadgeData {
  id: string
  awardedAt: Date
  badge: {
    id: string
    slug: string
    label: string
    description: string
    icon: string | null
  }
}

interface BadgeDisplayProps {
  badges: UserBadgeData[]
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function BadgeDisplay({ badges }: BadgeDisplayProps) {
  if (badges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No badges earned yet. Keep contributing to earn badges!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Badges ({badges.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {badges.map((userBadge) => (
            <div
              key={userBadge.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                {userBadge.badge.icon ? (
                  <span className="text-lg">{userBadge.badge.icon}</span>
                ) : (
                  <Award className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{userBadge.badge.label}</h4>
                  <Badge variant="secondary" className="text-xs">
                    {formatDate(userBadge.awardedAt)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {userBadge.badge.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default BadgeDisplay
